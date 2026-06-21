from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.estudiante import Estudiante
from app.models.membresia import Membresia
from app.models.pago import Pago
from app.schemas.schemas import PagoCreate, PagoResponse


def to_pago_response(pago: Pago) -> PagoResponse:
    return PagoResponse(
        id=pago.id,
        estudiante_id=pago.estudiante_id,
        estudiante_nombre=pago.estudiante.nombre if pago.estudiante else None,
        membresia_id=pago.membresia_id,
        inscripcion_id=pago.inscripcion_id,
        monto=pago.monto,
        metodo=pago.metodo,
        referencia=pago.referencia,
        fecha=pago.fecha,
        notas=pago.notas,
        created_at=pago.created_at,
    )


class PagoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def crear(self, data: PagoCreate) -> Pago:
        est = await self.db.execute(select(Estudiante).where(Estudiante.id == data.estudiante_id))
        if not est.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        if data.membresia_id:
            mem = await self.db.execute(select(Membresia).where(Membresia.id == data.membresia_id))
            if not mem.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Membresía no encontrada")

        pago = Pago(**data.model_dump())
        if not pago.fecha:
            pago.fecha = date.today()
        self.db.add(pago)
        await self.db.commit()
        return await self.get_loaded(pago.id)

    async def get_loaded(self, pago_id: int) -> Pago | None:
        result = await self.db.execute(
            select(Pago).options(selectinload(Pago.estudiante)).where(Pago.id == pago_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[Pago]:
        result = await self.db.execute(
            select(Pago)
            .options(selectinload(Pago.estudiante))
            .order_by(Pago.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
