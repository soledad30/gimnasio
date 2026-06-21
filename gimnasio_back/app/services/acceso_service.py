from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.acceso import Acceso
from app.models.estudiante import Estudiante
from app.schemas.schemas import (
    AccesoMonitorStats,
    AccesoResponse,
    AlertaSeguridad,
    NFCScanResponse,
)
from app.services.base_service import BaseService
from app.services.estudiante_service import EstudianteService, normalizar_codigo_acceso


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

    async def _membresia_activa(self, estudiante: Estudiante) -> tuple[bool, str]:
        hoy = date.today()
        if (
            estudiante.fechainicio_membresia is not None
            and estudiante.fechafin_membresia is not None
            and estudiante.fechainicio_membresia <= hoy <= estudiante.fechafin_membresia
        ):
            return True, "activa"
        estado = "sin membresía" if not estudiante.membresia else "membresía vencida"
        return False, estado

    async def _acceso_por_inscripcion(self, estudiante: Estudiante) -> tuple[bool, str]:
        from app.services.inscripcion_service import estudiante_habilitado_hoy

        return await estudiante_habilitado_hoy(self.db, estudiante.id)

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
        if estudiante and "membresía" in motivo.lower():
            mensaje = (
                f"Acceso denegado: {motivo}. "
                "Asigna un plan en Admin → Membresías para habilitar el ingreso."
            )
        elif estudiante and "inscripción" in motivo.lower():
            mensaje = (
                f"Acceso denegado: {motivo}. "
                "Inscríbete y paga tu cuota mensual (actividad o sala de máquinas) para ingresar."
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
    ) -> NFCScanResponse:
        now = datetime.now(timezone.utc)
        hora_int = _hora_int(now)
        fecha_str = now.strftime("%Y-%m-%d")

        activa, estado = await self._acceso_por_inscripcion(estudiante)
        if not activa:
            return await self._registrar_denegado(
                fecha_str=fecha_str,
                hora_int=hora_int,
                motivo=estado,
                estudiante=estudiante,
                nfc_uid=nfc_uid,
            )

        abierto = await self._get_acceso_abierto_hoy(estudiante.id, fecha_str)
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
                estado_membresia="activa",
                acceso_id=abierto.id,
                tipo_movimiento="salida",
                mensaje=f"Hasta luego, {estudiante.nombre}",
            )

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
            estado_membresia="activa",
            acceso_id=acceso.id,
            tipo_movimiento="entrada",
            mensaje=f"¡Bienvenido/a, {estudiante.nombre}!",
        )

    async def procesar_nfc(self, nfc_uid: str) -> NFCScanResponse:
        estudiante = await EstudianteService(self.db).get_by_nfc(nfc_uid)
        if not estudiante:
            now = datetime.now(timezone.utc)
            return await self._registrar_denegado(
                fecha_str=now.strftime("%Y-%m-%d"),
                hora_int=_hora_int(now),
                motivo="NFC no registrado en el sistema",
                nfc_uid=nfc_uid,
            )
        return await self._procesar_estudiante(estudiante, nfc_uid=nfc_uid)

    async def procesar_manual(self, codigo: str) -> NFCScanResponse:
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
            now = datetime.now(timezone.utc)
            return await self._registrar_denegado(
                fecha_str=now.strftime("%Y-%m-%d"),
                hora_int=_hora_int(now),
                motivo="Código no registrado en el sistema",
            )
        return await self._procesar_estudiante(estudiante)

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
        hoy = date.today()
        fecha_str = hoy.isoformat()
        inicio_dia = datetime.combine(hoy, datetime.min.time()).replace(tzinfo=timezone.utc)

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
        hoy = date.today()
        inicio_dia = datetime.combine(hoy, datetime.min.time()).replace(tzinfo=timezone.utc)
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
                    hora=_hora_display(acc.hora_entrada) or acc.created_at.strftime("%H:%M"),
                    detalle=acc.nfc_uid_escaneado,
                )
            )
        return alertas

    async def get_tiempo_real(self, limit: int = 15) -> list[AccesoResponse]:
        return await self.get_historial(skip=0, limit=limit)
