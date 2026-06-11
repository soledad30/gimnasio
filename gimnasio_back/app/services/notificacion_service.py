from datetime import date, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.estudiante import Estudiante
from app.models.notificacion import Notificacion


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
