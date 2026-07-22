from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.acceso import Acceso
from app.models.estudiante import Estudiante
from app.models.usuario import Usuario
from app.schemas.schemas import (
    AccesoMonitorStats,
    AccesoResponse,
    AlertaSeguridad,
    NFCScanResponse,
)
from app.services.base_service import BaseService
from app.services.estudiante_service import EstudianteService, normalizar_codigo_acceso
from app.services.ficha_inscripcion_service import FichaInscripcionService

# Zona horaria de Bolivia (UTC-4, sin horario de verano)
TZ_LOCAL = timezone(timedelta(hours=-4))


def _now_local() -> datetime:
    return datetime.now(TZ_LOCAL)


def _hora_int(now: datetime) -> int:
    return int(now.strftime("%H%M"))


def _hora_display(hora: Optional[int]) -> Optional[str]:
    if hora is None:
        return None
    s = str(hora).zfill(4)
    return f"{s[:2]}:{s[2:]}"


def _calc_permanencia(entrada: int, salida: int) -> str:
    eh, em = divmod(entrada, 100)
    sh, sm = divmod(salida, 100)
    mins = (sh * 60 + sm) - (eh * 60 + em)
    if mins < 0:
        mins += 24 * 60
    h, m = divmod(mins, 60)
    return f"{h:02d}:{m:02d}"


def _tipo_movimiento(acceso: Acceso) -> str:
    if not acceso.acceso_concedido:
        return "denegado"
    return "salida" if acceso.hora_salida else "entrada"


def _to_acceso_response(acceso: Acceso) -> AccesoResponse:
    est = acceso.estudiante
    hora = acceso.hora_salida or acceso.hora_entrada
    return AccesoResponse(
        id=acceso.id,
        estudiante_id=acceso.estudiante_id,
        fecha=acceso.fecha,
        hora_entrada=acceso.hora_entrada,
        hora_salida=acceso.hora_salida,
        tiempo_permanencia=acceso.tiempo_permanencia,
        acceso_concedido=acceso.acceso_concedido,
        motivo_denegacion=acceso.motivo_denegacion,
        created_at=acceso.created_at,
        estudiante_nombre=est.nombre if est else None,
        estudiante_carrera=est.carrera if est else None,
        registro_universitario=est.registro_univercotario if est else None,
        tipo_movimiento=_tipo_movimiento(acceso),
        hora_display=_hora_display(hora),
    )


class AccesoService(BaseService[Acceso]):
    def __init__(self, db: AsyncSession):
        super().__init__(Acceso, db)

    async def _get_acceso_abierto_hoy(self, estudiante_id: int, fecha_str: str) -> Optional[Acceso]:
        result = await self.db.execute(
            select(Acceso).where(
                and_(
                    Acceso.estudiante_id == estudiante_id,
                    Acceso.fecha == fecha_str,
                    Acceso.acceso_concedido.is_(True),
                    Acceso.hora_salida.is_(None),
                )
            ).order_by(Acceso.created_at.desc())
        )
        return result.scalars().first()

    async def _tuvo_visita_cerrada_hoy(self, estudiante_id: int, fecha_str: str) -> bool:
        """Ya ingresó y salió hoy → no puede volver a entrar el mismo día."""
        result = await self.db.execute(
            select(Acceso.id).where(
                and_(
                    Acceso.estudiante_id == estudiante_id,
                    Acceso.fecha == fecha_str,
                    Acceso.acceso_concedido.is_(True),
                    Acceso.hora_entrada.isnot(None),
                    Acceso.hora_salida.isnot(None),
                )
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def _rol_personal(self, estudiante: Estudiante) -> Optional[str]:
        """Si el perfil pertenece a personal (admin/recepción/instructor), devuelve el rol."""
        if not estudiante.usuario_id:
            return None
        usuario = await self.db.get(Usuario, estudiante.usuario_id)
        if not usuario:
            return None
        rol = (usuario.rol or "").lower()
        if usuario.es_admin or rol in ("admin", "recepcion", "instructor"):
            return rol or "admin"
        return None

    async def _membresia_activa(self, estudiante: Estudiante) -> tuple[bool, str]:
        """Membresía = acceso a sala de máquinas (plan admin o pago mensual de máquinas)."""
        hoy = _now_local().date()
        if (
            estudiante.fechainicio_membresia is not None
            and estudiante.fechafin_membresia is not None
            and estudiante.fechainicio_membresia <= hoy <= estudiante.fechafin_membresia
        ):
            return True, "membresía sala de máquinas"
        estado = "sin membresía de máquinas" if not estudiante.membresia else "membresía de máquinas vencida"
        return False, estado

    async def _acceso_por_inscripcion(self, estudiante: Estudiante) -> tuple[bool, str, bool, bool]:
        from app.services.inscripcion_service import entitlements_acceso_hoy

        info = await entitlements_acceso_hoy(self.db, estudiante.id)
        return (
            bool(info["ok"]),
            str(info["estado"]),
            bool(info["maquinas"]),
            bool(info["actividad"]),
        )

    async def _registrar_denegado(
        self,
        *,
        fecha_str: str,
        hora_int: int,
        motivo: str,
        estudiante: Optional[Estudiante] = None,
        nfc_uid: Optional[str] = None,
    ) -> NFCScanResponse:
        acceso = Acceso(
            estudiante_id=estudiante.id if estudiante else None,
            fecha=fecha_str,
            hora_entrada=hora_int,
            nfc_uid_escaneado=nfc_uid,
            acceso_concedido=False,
            motivo_denegacion=motivo,
        )
        self.db.add(acceso)
        await self.db.commit()
        motivo_l = motivo.lower()
        if estudiante and (
            "máquinas" in motivo_l
            or "maquinas" in motivo_l
            or "membresía" in motivo_l
            or "membresia" in motivo_l
        ):
            mensaje = (
                f"Acceso denegado: {motivo}. "
                "Para sala de máquinas: asigna/renueva membresía o confirma el pago de inscripción de máquinas."
            )
        elif estudiante and "actividad" in motivo_l:
            mensaje = (
                f"Acceso denegado: {motivo}. "
                "Para sala de actividades: inscríbete y paga la cuota mensual de la clase."
            )
        elif estudiante and "inscripción" in motivo_l:
            mensaje = (
                f"Acceso denegado: {motivo}. "
                "Paga membresía (máquinas) o inscripción de actividad para ingresar."
            )
        elif estudiante and "ficha" in motivo_l:
            mensaje = (
                f"Acceso denegado: {motivo}. "
                "Completa o actualiza tu ficha en el portal del estudiante."
            )
        elif estudiante:
            mensaje = f"Acceso denegado: {motivo}"
        else:
            mensaje = f"Acceso denegado: {motivo}"

        return NFCScanResponse(
            acceso_concedido=False,
            estudiante_id=estudiante.id if estudiante else None,
            nombre=estudiante.nombre if estudiante else None,
            carrera=estudiante.carrera if estudiante else None,
            registro_universitario=estudiante.registro_univercotario if estudiante else None,
            estado_membresia=motivo if estudiante else None,
            motivo_denegacion=motivo,
            tipo_movimiento="denegado",
            mensaje=mensaje,
        )

    async def _procesar_estudiante(
        self,
        estudiante: Estudiante,
        *,
        nfc_uid: Optional[str] = None,
        modo: str = "auto",
    ) -> NFCScanResponse:
        """
        Un solo control ingreso/salida:
        1) Primer escaneo del día → entrada (si tiene membresía/inscripción).
        2) Segundo escaneo (con visita abierta) → salida.
        3) Tras salir → denegado (solo 1 ingreso por día).
        """
        now = _now_local()
        hora_int = _hora_int(now)
        fecha_str = now.strftime("%Y-%m-%d")
        _ = (modo or "auto").strip().lower()  # compat API; siempre flujo unificado

        abierto = await self._get_acceso_abierto_hoy(estudiante.id, fecha_str)

        # 2) Ya está dentro → registrar salida
        if abierto:
            abierto.hora_salida = hora_int
            if abierto.hora_entrada:
                abierto.tiempo_permanencia = _calc_permanencia(abierto.hora_entrada, hora_int)
            await self.db.commit()
            await self.db.refresh(abierto)
            return NFCScanResponse(
                acceso_concedido=True,
                estudiante_id=estudiante.id,
                nombre=estudiante.nombre,
                carrera=estudiante.carrera,
                registro_universitario=estudiante.registro_univercotario,
                estado_membresia="salida registrada",
                acceso_id=abierto.id,
                tipo_movimiento="salida",
                mensaje=f"Hasta luego, {estudiante.nombre}. Salida registrada.",
            )

        # 3) Ya ingresó y salió hoy → no puede volver a entrar
        if await self._tuvo_visita_cerrada_hoy(estudiante.id, fecha_str):
            return await self._registrar_denegado(
                fecha_str=fecha_str,
                hora_int=hora_int,
                motivo="ya registró entrada y salida hoy; solo se permite un ingreso por día",
                estudiante=estudiante,
                nfc_uid=nfc_uid,
            )

        # Personal (admin/recepción/instructor): entra sin ficha ni membresía
        rol_personal = await self._rol_personal(estudiante)
        if rol_personal:
            acceso = Acceso(
                estudiante_id=estudiante.id,
                fecha=fecha_str,
                hora_entrada=hora_int,
                nfc_uid_escaneado=nfc_uid,
                acceso_concedido=True,
            )
            self.db.add(acceso)
            await self.db.commit()
            await self.db.refresh(acceso)
            return NFCScanResponse(
                acceso_concedido=True,
                estudiante_id=estudiante.id,
                nombre=estudiante.nombre,
                carrera=estudiante.carrera,
                registro_universitario=estudiante.registro_univercotario,
                estado_membresia=f"personal ({rol_personal})",
                acceso_id=acceso.id,
                tipo_movimiento="entrada",
                mensaje=f"¡Bienvenido/a, {estudiante.nombre}! Acceso de personal ({rol_personal}).",
            )

        # 1) Primera vez del día → validar ficha de inscripción
        ficha_ok, ficha_estado = await FichaInscripcionService(self.db).validar_acceso(estudiante.id)
        if not ficha_ok:
            return await self._registrar_denegado(
                fecha_str=fecha_str,
                hora_int=hora_int,
                motivo=ficha_estado,
                estudiante=estudiante,
                nfc_uid=nfc_uid,
            )

        # 2) Primera vez del día → validar membresía/inscripción
        mem_ok, mem_estado = await self._membresia_activa(estudiante)
        _insc_ok, insc_estado, insc_maq, insc_act = await self._acceso_por_inscripcion(estudiante)
        acceso_maquinas = mem_ok or insc_maq
        acceso_actividades = insc_act

        if not acceso_maquinas and not acceso_actividades:
            if mem_estado.endswith("vencida") and "futuro" not in insc_estado:
                motivo = mem_estado
            elif insc_estado and insc_estado != "sin inscripción pagada este mes":
                motivo = insc_estado
            elif not mem_ok and not insc_maq and not insc_act:
                motivo = (
                    "sin acceso: necesita membresía/pago de sala de máquinas "
                    "o inscripción pagada de actividad"
                )
            else:
                motivo = insc_estado
            return await self._registrar_denegado(
                fecha_str=fecha_str,
                hora_int=hora_int,
                motivo=motivo,
                estudiante=estudiante,
                nfc_uid=nfc_uid,
            )

        partes = []
        if acceso_maquinas:
            partes.append("máquinas")
        if acceso_actividades:
            partes.append("actividades")
        estado_acceso = " + ".join(partes)

        acceso = Acceso(
            estudiante_id=estudiante.id,
            fecha=fecha_str,
            hora_entrada=hora_int,
            nfc_uid_escaneado=nfc_uid,
            acceso_concedido=True,
        )
        self.db.add(acceso)
        await self.db.commit()
        await self.db.refresh(acceso)
        return NFCScanResponse(
            acceso_concedido=True,
            estudiante_id=estudiante.id,
            nombre=estudiante.nombre,
            carrera=estudiante.carrera,
            registro_universitario=estudiante.registro_univercotario,
            estado_membresia=estado_acceso,
            acceso_id=acceso.id,
            tipo_movimiento="entrada",
            mensaje=f"¡Bienvenido/a, {estudiante.nombre}! Acceso: {estado_acceso}",
        )

    async def procesar_nfc(self, nfc_uid: str, modo: str = "auto") -> NFCScanResponse:
        estudiante = await EstudianteService(self.db).get_by_nfc(nfc_uid)
        if not estudiante:
            now = _now_local()
            return await self._registrar_denegado(
                fecha_str=now.strftime("%Y-%m-%d"),
                hora_int=_hora_int(now),
                motivo="Huella/NFC no registrado en el sistema",
                nfc_uid=nfc_uid,
            )
        return await self._procesar_estudiante(estudiante, nfc_uid=nfc_uid, modo=modo)

    async def procesar_manual(self, codigo: str, modo: str = "auto") -> NFCScanResponse:
        codigo = normalizar_codigo_acceso(codigo)
        result = await self.db.execute(
            select(Estudiante)
            .options(selectinload(Estudiante.membresia))
            .where(
                or_(
                    Estudiante.registro_univercotario == codigo,
                    Estudiante.nfc_uid == codigo,
                    Estudiante.cs == codigo,
                    Estudiante.codigo_acceso == codigo,
                )
            )
        )
        estudiante = result.scalar_one_or_none()
        if not estudiante:
            now = _now_local()
            return await self._registrar_denegado(
                fecha_str=now.strftime("%Y-%m-%d"),
                hora_int=_hora_int(now),
                motivo="Código no registrado en el sistema",
            )
        return await self._procesar_estudiante(estudiante, modo=modo)

    async def procesar_face(self, embedding: list[float], modo: str = "auto") -> NFCScanResponse:
        from app.services.face_service import FaceService

        estudiante, dist = await FaceService(self.db).match(embedding)
        if not estudiante:
            now = _now_local()
            detalle = f" (mejor dist={dist:.3f})" if dist is not None else ""
            return await self._registrar_denegado(
                fecha_str=now.strftime("%Y-%m-%d"),
                hora_int=_hora_int(now),
                motivo=f"Rostro no reconocido{detalle}",
            )
        return await self._procesar_estudiante(estudiante, modo=modo)

    async def get_historial(self, skip: int = 0, limit: int = 50) -> list[AccesoResponse]:
        result = await self.db.execute(
            select(Acceso)
            .options(selectinload(Acceso.estudiante))
            .order_by(Acceso.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return [_to_acceso_response(a) for a in result.scalars().all()]

    async def get_monitor_stats(self) -> AccesoMonitorStats:
        hoy = _now_local().date()
        fecha_str = hoy.isoformat()
        inicio_dia = datetime.combine(hoy, datetime.min.time()).replace(tzinfo=TZ_LOCAL)

        total_registrados = await self.db.scalar(select(func.count(Estudiante.id))) or 0

        en_gimnasio = await self.db.scalar(
            select(func.count(Acceso.id)).where(
                and_(
                    Acceso.fecha == fecha_str,
                    Acceso.acceso_concedido.is_(True),
                    Acceso.hora_salida.is_(None),
                )
            )
        ) or 0

        ingresos_hoy = await self.db.scalar(
            select(func.count(Acceso.id)).where(
                and_(
                    Acceso.created_at >= inicio_dia,
                    Acceso.acceso_concedido.is_(True),
                    Acceso.hora_entrada.isnot(None),
                )
            )
        ) or 0

        salidas_hoy = await self.db.scalar(
            select(func.count(Acceso.id)).where(
                and_(
                    Acceso.created_at >= inicio_dia,
                    Acceso.acceso_concedido.is_(True),
                    Acceso.hora_salida.isnot(None),
                )
            )
        ) or 0

        denegados_hoy = await self.db.scalar(
            select(func.count(Acceso.id)).where(
                and_(
                    Acceso.created_at >= inicio_dia,
                    Acceso.acceso_concedido.is_(False),
                )
            )
        ) or 0

        estudiantes_hoy = await self.db.scalar(
            select(func.count(func.distinct(Acceso.estudiante_id))).where(
                and_(
                    Acceso.created_at >= inicio_dia,
                    Acceso.acceso_concedido.is_(True),
                    Acceso.estudiante_id.isnot(None),
                )
            )
        ) or 0

        ultimo = await self.db.execute(
            select(Acceso).order_by(Acceso.created_at.desc()).limit(1)
        )
        ultimo_acceso = ultimo.scalar_one_or_none()
        ultimo_escaneo = None
        if ultimo_acceso:
            hora = ultimo_acceso.hora_salida or ultimo_acceso.hora_entrada
            ultimo_escaneo = _hora_display(hora)

        return AccesoMonitorStats(
            en_gimnasio_ahora=en_gimnasio,
            ingresos_hoy=ingresos_hoy,
            salidas_hoy=salidas_hoy,
            denegados_hoy=denegados_hoy,
            alertas_activas=denegados_hoy,
            total_registrados=total_registrados,
            estudiantes_hoy=estudiantes_hoy,
            ultimo_escaneo=ultimo_escaneo,
            tarjetas_leidas_hoy=ingresos_hoy + salidas_hoy + denegados_hoy,
            errores_hoy=denegados_hoy,
            lector_activo=True,
        )

    async def get_alertas_seguridad(self, limit: int = 10) -> list[AlertaSeguridad]:
        hoy = _now_local().date()
        inicio_dia = datetime.combine(hoy, datetime.min.time()).replace(tzinfo=TZ_LOCAL)
        result = await self.db.execute(
            select(Acceso)
            .where(
                and_(
                    Acceso.created_at >= inicio_dia,
                    Acceso.acceso_concedido.is_(False),
                )
            )
            .order_by(Acceso.created_at.desc())
            .limit(limit)
        )
        alertas = []
        for acc in result.scalars().all():
            motivo = acc.motivo_denegacion or "Acceso denegado"
            tipo = "tarjeta_no_registrada" if "no registrado" in motivo.lower() else "acceso_denegado"
            if "membresía" in motivo.lower() or "membresia" in motivo.lower():
                tipo = "membresia_vencida"
            alertas.append(
                AlertaSeguridad(
                    id=acc.id,
                    mensaje=motivo,
                    tipo=tipo,
                    hora=_hora_display(acc.hora_entrada)
                    or acc.created_at.astimezone(TZ_LOCAL).strftime("%H:%M"),
                    detalle=acc.nfc_uid_escaneado,
                )
            )
        return alertas

    async def get_tiempo_real(self, limit: int = 15) -> list[AccesoResponse]:
        return await self.get_historial(skip=0, limit=limit)
