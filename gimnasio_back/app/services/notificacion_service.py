from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.estudiante import Estudiante
from app.models.notificacion import Notificacion
from app.services.email_service import email_service


class NotificacionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ya_notificado(self, estudiante_id: int, titulo: str) -> bool:
        hoy = date.today()
        result = await self.db.execute(
            select(Notificacion).where(
                and_(
                    Notificacion.estudiante_id == estudiante_id,
                    Notificacion.titulo == titulo,
                    Notificacion.fecha == hoy,
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def procesar_alertas_vencimiento(self, dias_aviso: int = 7) -> dict:
        hoy = date.today()
        limite = hoy + timedelta(days=dias_aviso)
        creadas = 0

        result = await self.db.execute(
            select(Estudiante).where(
                Estudiante.fechafin_membresia.isnot(None),
                Estudiante.fechafin_membresia >= hoy,
                Estudiante.fechafin_membresia <= limite,
            )
        )
        for est in result.scalars().all():
            dias_restantes = (est.fechafin_membresia - hoy).days
            titulo = "Membresía por vencer"
            if await self._ya_notificado(est.id, titulo):
                continue
            self.db.add(
                Notificacion(
                    estudiante_id=est.id,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=f"Hola {est.nombre}, tu membresía vence el {est.fechafin_membresia} ({dias_restantes} día(s) restantes). Renueva para seguir accediendo al gimnasio.",
                    tipo="membresia",
                    leida=False,
                )
            )
            creadas += 1

        vencidos = await self.db.execute(
            select(Estudiante).where(
                Estudiante.fechafin_membresia.isnot(None),
                Estudiante.fechafin_membresia < hoy,
            )
        )
        for est in vencidos.scalars().all():
            titulo = "Membresía vencida"
            if await self._ya_notificado(est.id, titulo):
                continue
            self.db.add(
                Notificacion(
                    estudiante_id=est.id,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=f"Hola {est.nombre}, tu membresía venció el {est.fechafin_membresia}. Acércate a recepción para renovar tu plan.",
                    tipo="membresia",
                    leida=False,
                )
            )
            creadas += 1

        await self.db.commit()
        return {"notificaciones_creadas": creadas, "fecha": hoy.isoformat()}

    async def procesar_alertas_ficha_inscripcion(self, dias_aviso: int = 15) -> dict:
        from app.models.ficha_inscripcion import FichaInscripcion

        hoy = date.today()
        limite = hoy + timedelta(days=dias_aviso)
        creadas = 0

        por_vencer = await self.db.execute(
            select(FichaInscripcion).where(
                FichaInscripcion.vigente.is_(True),
                FichaInscripcion.fecha_vigencia_hasta >= hoy,
                FichaInscripcion.fecha_vigencia_hasta <= limite,
            )
        )
        for ficha in por_vencer.scalars().all():
            titulo = "Ficha de inscripción por vencer"
            if await self._ya_notificado(ficha.estudiante_id, titulo):
                continue
            dias_restantes = (ficha.fecha_vigencia_hasta - hoy).days
            self.db.add(
                Notificacion(
                    estudiante_id=ficha.estudiante_id,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=(
                        f"Hola {ficha.nombre}, tu ficha de inscripción vence el "
                        f"{ficha.fecha_vigencia_hasta} ({dias_restantes} día(s) restantes). "
                        f"Actualízala en el portal para seguir accediendo al gimnasio."
                    ),
                    tipo="ficha_inscripcion",
                    leida=False,
                )
            )
            creadas += 1

        vencidas = await self.db.execute(
            select(FichaInscripcion).where(
                FichaInscripcion.vigente.is_(True),
                FichaInscripcion.fecha_vigencia_hasta < hoy,
            )
        )
        for ficha in vencidas.scalars().all():
            titulo = "Ficha de inscripción vencida"
            if await self._ya_notificado(ficha.estudiante_id, titulo):
                continue
            self.db.add(
                Notificacion(
                    estudiante_id=ficha.estudiante_id,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=(
                        f"Hola {ficha.nombre}, tu ficha de inscripción venció el "
                        f"{ficha.fecha_vigencia_hasta}. Completa una nueva ficha en el portal."
                    ),
                    tipo="ficha_inscripcion",
                    leida=False,
                )
            )
            creadas += 1

        pendientes = await self.db.execute(
            select(FichaInscripcion).where(
                FichaInscripcion.vigente.is_(True),
                FichaInscripcion.requiere_certificado_medico.is_(True),
                FichaInscripcion.certificado_medico_recibido.is_(False),
            )
        )
        for ficha in pendientes.scalars().all():
            titulo = "Certificado médico pendiente"
            if await self._ya_notificado(ficha.estudiante_id, titulo):
                continue
            extra = (
                " Ya subiste un archivo; recepción lo validará pronto."
                if ficha.certificado_medico_url
                else " Preséntalo o súbelo en el portal dentro de 15 días."
            )
            self.db.add(
                Notificacion(
                    estudiante_id=ficha.estudiante_id,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=(
                        f"Hola {ficha.nombre}, tu ficha requiere certificado de aptitud física.{extra}"
                    ),
                    tipo="ficha_inscripcion",
                    leida=False,
                )
            )
            creadas += 1

        await self.db.commit()
        return {"notificaciones_creadas": creadas, "fecha": hoy.isoformat()}

    async def notificar_reserva(self, estudiante_id: int, actividad_nombre: str, fecha: date) -> None:
        self.db.add(
            Notificacion(
                estudiante_id=estudiante_id,
                fecha=date.today(),
                titulo="Reserva confirmada",
                mensaje=f"Tu reserva para {actividad_nombre} el {fecha} fue confirmada.",
                tipo="reserva",
                leida=False,
            )
        )

    async def notificar_pago_pendiente_inscripcion(
        self,
        estudiante_id: int,
        concepto: str,
        mes_label: str,
        monto: str,
        referencia: str,
        qr_pago: str,
        expira_en: datetime,
        creado_por_admin: bool = False,
        renovacion: bool = False,
        *,
        usa_qr_simple: bool = False,
        banco_nombre: str | None = None,
        banco_cuenta: str | None = None,
        banco_titular: str | None = None,
    ) -> None:
        origen = "El administrador registró tu inscripción" if creado_por_admin else "Tu inscripción"
        if renovacion:
            origen = "Se renovó tu método de pago para"
        expira_txt = expira_en.strftime("%d/%m/%Y %H:%M")
        if usa_qr_simple:
            pago_txt = (
                f"Paga Bs. {monto} escaneando el QR Simple del gimnasio en Yape, banca móvil o app de tu banco. "
                f"Referencia: {referencia} (inclúyela en el detalle o muéstrala en recepción)."
            )
            if banco_nombre and banco_cuenta:
                titular = f" — {banco_titular}" if banco_titular else ""
                pago_txt += f" Alternativa: transferencia a {banco_nombre} cuenta {banco_cuenta}{titular}."
        else:
            pago_txt = f"Monto: Bs. {monto}. Referencia: {referencia}. Código: {qr_pago}."
        self.db.add(
            Notificacion(
                estudiante_id=estudiante_id,
                fecha=date.today(),
                titulo="Pago pendiente — inscripción",
                mensaje=(
                    f"{origen} {concepto} en {mes_label}. "
                    f"{pago_txt} "
                    f"Válido {settings.HORAS_VALIDEZ_QR_PAGO} h (hasta {expira_txt}). "
                    f"Cancela antes de que empiece el mes para ingresar al gym."
                ),
                tipo="pago",
                leida=False,
            )
        )

    async def enviar_pago_pendiente_email(
        self,
        estudiante: Estudiante,
        *,
        concepto: str,
        mes_label: str,
        monto: str,
        referencia: str,
        qr_pago: str,
        expira_en: datetime,
        usa_qr_simple: bool = False,
        banco_nombre: str | None = None,
        banco_cuenta: str | None = None,
        banco_titular: str | None = None,
    ) -> bool:
        email = estudiante.email
        if not email:
            return False
        return await email_service.send_pago_pendiente(
            email,
            estudiante.nombre,
            concepto=concepto,
            mes_label=mes_label,
            monto=monto,
            referencia=referencia,
            qr_pago=qr_pago,
            expira_en=expira_en,
            usa_qr_simple=usa_qr_simple,
            banco_nombre=banco_nombre,
            banco_cuenta=banco_cuenta,
            banco_titular=banco_titular,
        )

    async def notificar_pago_reportado_estudiante(
        self,
        estudiante_id: int,
        *,
        concepto: str,
        mes_label: str,
        monto: str,
        referencia: str,
        metodo: str,
        comprobante: str | None = None,
    ) -> None:
        comp = f" Comprobante: {comprobante}." if comprobante else ""
        self.db.add(
            Notificacion(
                estudiante_id=estudiante_id,
                fecha=date.today(),
                titulo="Pago reportado — en revisión",
                mensaje=(
                    f"Avisaste tu pago de {concepto} ({mes_label}) por Bs. {monto} "
                    f"vía {metodo}. Referencia: {referencia}.{comp} "
                    f"Recepción lo confirmará en breve."
                ),
                tipo="pago",
                leida=False,
            )
        )

    async def avisar_staff_pago_estudiante(
        self,
        *,
        estudiante_nombre: str,
        concepto: str,
        mes_label: str,
        monto: str,
        referencia: str,
        metodo: str,
        comprobante: str | None = None,
        modo: str = "notificar",
    ) -> None:
        """Avisa a recepción/admin por correo de contacto de la organización."""
        from app.services.configuracion_service import ConfiguracionService

        cfg = await ConfiguracionService(self.db).get()
        to_email = (cfg.email_contacto or "").strip() or None
        if not to_email:
            return
        await email_service.send_aviso_pago_staff(
            to_email,
            estudiante_nombre=estudiante_nombre,
            concepto=concepto,
            mes_label=mes_label,
            monto=monto,
            referencia=referencia,
            metodo=metodo,
            comprobante=comprobante,
            modo=modo,
        )

    async def notificar_inscripcion_confirmada(
        self,
        estudiante_id: int,
        concepto: str,
        mes_label: str,
    ) -> None:
        self.db.add(
            Notificacion(
                estudiante_id=estudiante_id,
                fecha=date.today(),
                titulo="Inscripción confirmada",
                mensaje=f"Tu pago fue registrado. Inscripción activa: {concepto} — {mes_label}.",
                tipo="inscripcion",
                leida=False,
            )
        )

    async def enviar_masivo(
        self,
        *,
        alcance: str,
        titulo: str,
        mensaje: str,
        tipo: str | None = "aviso",
        estudiante_id: int | None = None,
        fecha: date | None = None,
    ) -> dict:
        """Crea notificaciones para un estudiante, todos los alumnos o roles de staff."""
        from app.models.usuario import Usuario

        hoy = fecha or date.today()
        alcance_norm = (alcance or "").strip().lower()
        creadas = 0
        destinatarios = 0

        async def add_estudiante(est_id: int) -> None:
            nonlocal creadas, destinatarios
            self.db.add(
                Notificacion(
                    estudiante_id=est_id,
                    usuario_id=None,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo=tipo or "aviso",
                    leida=False,
                )
            )
            creadas += 1
            destinatarios += 1

        async def add_usuario(uid: int) -> None:
            nonlocal creadas, destinatarios
            self.db.add(
                Notificacion(
                    estudiante_id=None,
                    usuario_id=uid,
                    fecha=hoy,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo=tipo or "aviso",
                    leida=False,
                )
            )
            creadas += 1
            destinatarios += 1

        if alcance_norm == "estudiante":
            if not estudiante_id:
                raise ValueError("Selecciona un estudiante")
            est = await self.db.get(Estudiante, estudiante_id)
            if not est:
                raise ValueError("Estudiante no encontrado")
            await add_estudiante(est.id)

        elif alcance_norm == "todos_estudiantes":
            result = await self.db.execute(select(Estudiante.id))
            for (eid,) in result.all():
                await add_estudiante(eid)

        elif alcance_norm in ("recepcion", "instructor", "admin"):
            result = await self.db.execute(
                select(Usuario.id).where(
                    Usuario.activo.is_(True),
                    Usuario.rol == alcance_norm,
                )
            )
            for (uid,) in result.all():
                await add_usuario(uid)

        elif alcance_norm == "todos":
            result = await self.db.execute(select(Estudiante.id))
            for (eid,) in result.all():
                await add_estudiante(eid)
            result_u = await self.db.execute(
                select(Usuario.id).where(
                    Usuario.activo.is_(True),
                    Usuario.rol.in_(["recepcion", "instructor", "admin"]),
                )
            )
            for (uid,) in result_u.all():
                await add_usuario(uid)

        else:
            raise ValueError(
                "Alcance inválido. Usa: estudiante, todos_estudiantes, recepcion, instructor, admin o todos"
            )

        if creadas == 0:
            raise ValueError("No hay destinatarios para ese alcance")

        await self.db.commit()
        return {
            "creadas": creadas,
            "alcance": alcance_norm,
            "destinatarios": destinatarios,
        }
