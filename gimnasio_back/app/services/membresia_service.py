from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.estudiante import Estudiante
from app.models.membresia import Membresia
from app.schemas.schemas import MembresiaCreate, MembresiaResponse, MembresiaUpdate


def to_membresia_response(mem: Membresia) -> MembresiaResponse:
    est = mem.estudiante
    return MembresiaResponse(
        id=mem.id,
        estudiante_id=mem.estudiante_id,
        estudiante_nombre=est.nombre if est else None,
        tipo=mem.tipo,
        precio=mem.precio,
        duracion=mem.duracion,
        fecha_inicio=est.fechainicio_membresia if est else None,
        fecha_fin=est.fechafin_membresia if est else None,
        created_at=mem.created_at,
    )


class MembresiaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def crear(self, data: MembresiaCreate) -> Membresia:
        existing = await self.db.execute(
            select(Membresia).where(Membresia.estudiante_id == data.estudiante_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="El estudiante ya tiene una membresía")

        est_result = await self.db.execute(
            select(Estudiante).where(Estudiante.id == data.estudiante_id)
        )
        estudiante = est_result.scalar_one_or_none()
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        hoy = date.today()
        fin = hoy + timedelta(days=data.duracion)
        estudiante.fechainicio_membresia = hoy
        estudiante.fechafin_membresia = fin

        mem = Membresia(**data.model_dump())
        self.db.add(mem)
        await self.db.commit()
        await self.db.refresh(mem)
        loaded = await self.get_loaded(mem.id)
        return loaded

    async def get_loaded(self, membresia_id: int) -> Membresia | None:
        result = await self.db.execute(
            select(Membresia)
            .options(selectinload(Membresia.estudiante))
            .where(Membresia.id == membresia_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[Membresia]:
        result = await self.db.execute(
            select(Membresia)
            .options(selectinload(Membresia.estudiante))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def renovar(self, membresia_id: int, data: MembresiaUpdate) -> Membresia:
        mem = await self.get_loaded(membresia_id)
        if not mem:
            raise HTTPException(status_code=404, detail="Membresía no encontrada")

        updates = data.model_dump(exclude_none=True)
        duracion = updates.pop("duracion", None)
        for field, value in updates.items():
            setattr(mem, field, value)

        if duracion:
            mem.duracion = duracion
            hoy = date.today()
            mem.estudiante.fechainicio_membresia = hoy
            mem.estudiante.fechafin_membresia = hoy + timedelta(days=duracion)

        await self.db.commit()
        return await self.get_loaded(membresia_id)
