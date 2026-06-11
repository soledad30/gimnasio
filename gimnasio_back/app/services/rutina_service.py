from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ejercicio import Ejercicio
from app.models.rutina import Rutina
from app.models.rutina_ejercicio import RutinaEjercicio
from app.schemas.schemas import RutinaEjercicioDetalle, RutinaEjercicioItem, RutinaResponse


def build_rutina_response(rutina: Rutina) -> RutinaResponse:
    ejercicios = []
    for assoc in rutina.ejercicios_assoc:
        ej = assoc.ejercicio
        ejercicios.append(
            RutinaEjercicioDetalle(
                ejercicio_id=ej.id,
                nombre=ej.nombre,
                con_maquina=ej.con_maquina,
                maquina_nombre=ej.maquina.nombre if ej.maquina else None,
                grupo_muscular=ej.grupo_muscular,
                series=assoc.series,
                repeticiones=assoc.repeticiones,
            )
        )
    return RutinaResponse(
        id=rutina.id,
        instructor_id=rutina.instructor_id,
        estudiante_id=rutina.estudiante_id,
        nombre=rutina.nombre,
        objetivo=rutina.objetivo,
        ejercicios=ejercicios,
        created_at=rutina.created_at,
    )


async def get_rutina_loaded(db: AsyncSession, rutina_id: int) -> Rutina | None:
    result = await db.execute(
        select(Rutina).options(_RUTINA_LOAD_OPTS).where(Rutina.id == rutina_id)
    )
    return result.scalar_one_or_none()


_RUTINA_LOAD_OPTS = (
    selectinload(Rutina.ejercicios_assoc)
    .selectinload(RutinaEjercicio.ejercicio)
    .selectinload(Ejercicio.maquina)
)


async def list_rutinas_by_instructor(db: AsyncSession, instructor_id: int) -> list[Rutina]:
    result = await db.execute(
        select(Rutina).options(_RUTINA_LOAD_OPTS).where(Rutina.instructor_id == instructor_id)
    )
    return list(result.scalars().unique().all())


async def list_rutinas_by_estudiante(db: AsyncSession, estudiante_id: int) -> list[Rutina]:
    result = await db.execute(
        select(Rutina).options(_RUTINA_LOAD_OPTS).where(Rutina.estudiante_id == estudiante_id)
    )
    return list(result.scalars().unique().all())


async def list_rutinas_loaded(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Rutina]:
    result = await db.execute(
        select(Rutina).options(_RUTINA_LOAD_OPTS).offset(skip).limit(limit)
    )
    return list(result.scalars().unique().all())


async def sync_rutina_ejercicios(
    db: AsyncSession,
    rutina: Rutina,
    items: list[RutinaEjercicioItem],
) -> None:
    rutina.ejercicios_assoc.clear()
    await db.flush()
    for orden, item in enumerate(items):
        db.add(
            RutinaEjercicio(
                rutina_id=rutina.id,
                ejercicio_id=item.ejercicio_id,
                series=item.series,
                repeticiones=item.repeticiones,
                orden=orden,
            )
        )
