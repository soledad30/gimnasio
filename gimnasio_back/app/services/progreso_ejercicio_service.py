from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.progreso_ejercicio import ProgresoEjercicio
from app.models.rutina import Rutina
from app.schemas.schemas import ProgresoEjercicioCreate, ProgresoEjercicioResponse


class ProgresoEjercicioService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _assert_rutina_del_estudiante(self, estudiante_id: int, rutina_id: int) -> Rutina:
        result = await self.db.execute(
            select(Rutina)
            .options(selectinload(Rutina.ejercicios_assoc))
            .where(Rutina.id == rutina_id, Rutina.estudiante_id == estudiante_id)
        )
        rutina = result.scalar_one_or_none()
        if not rutina:
            raise HTTPException(status_code=404, detail="Rutina no encontrada para este estudiante")
        return rutina

    async def registrar(
        self, estudiante_id: int, data: ProgresoEjercicioCreate
    ) -> ProgresoEjercicioResponse:
        rutina = await self._assert_rutina_del_estudiante(estudiante_id, data.rutina_id)
        ejercicio_ids = {a.ejercicio_id for a in rutina.ejercicios_assoc}
        if data.ejercicio_id not in ejercicio_ids:
            raise HTTPException(status_code=400, detail="El ejercicio no pertenece a esta rutina")

        reg = ProgresoEjercicio(
            estudiante_id=estudiante_id,
            rutina_id=data.rutina_id,
            ejercicio_id=data.ejercicio_id,
            fecha=data.fecha or date.today(),
            series_completadas=data.series_completadas,
            repeticiones_logradas=data.repeticiones_logradas,
            peso_kg=data.peso_kg,
            dificultad_percibida=data.dificultad_percibida,
            notas=data.notas,
        )
        self.db.add(reg)
        await self.db.commit()
        await self.db.refresh(reg)
        return ProgresoEjercicioResponse(
            id=reg.id,
            estudiante_id=reg.estudiante_id,
            rutina_id=reg.rutina_id,
            ejercicio_id=reg.ejercicio_id,
            ejercicio_nombre=None,
            fecha=reg.fecha,
            series_completadas=reg.series_completadas,
            repeticiones_logradas=reg.repeticiones_logradas,
            peso_kg=reg.peso_kg,
            dificultad_percibida=reg.dificultad_percibida,
            notas=reg.notas,
            created_at=reg.created_at,
        )

    async def list_historial(
        self, estudiante_id: int, *, ejercicio_id: int | None = None, limit: int = 50
    ) -> list[ProgresoEjercicioResponse]:
        q = (
            select(ProgresoEjercicio)
            .options(selectinload(ProgresoEjercicio.ejercicio))
            .where(ProgresoEjercicio.estudiante_id == estudiante_id)
            .order_by(ProgresoEjercicio.fecha.desc(), ProgresoEjercicio.id.desc())
            .limit(limit)
        )
        if ejercicio_id is not None:
            q = q.where(ProgresoEjercicio.ejercicio_id == ejercicio_id)
        result = await self.db.execute(q)
        rows = list(result.scalars().all())
        return [
            ProgresoEjercicioResponse(
                id=r.id,
                estudiante_id=r.estudiante_id,
                rutina_id=r.rutina_id,
                ejercicio_id=r.ejercicio_id,
                ejercicio_nombre=r.ejercicio.nombre if r.ejercicio else None,
                fecha=r.fecha,
                series_completadas=r.series_completadas,
                repeticiones_logradas=r.repeticiones_logradas,
                peso_kg=r.peso_kg,
                dificultad_percibida=r.dificultad_percibida,
                notas=r.notas,
                created_at=r.created_at,
            )
            for r in rows
        ]
