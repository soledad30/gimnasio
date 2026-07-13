from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ejercicio import Ejercicio
from app.models.estudiante import Estudiante
from app.models.rutina import Rutina
from app.models.rutina_ejercicio import RutinaEjercicio
from app.schemas.schemas import RutinaEjercicioDetalle, RutinaEjercicioItem, RutinaResponse

_RUTINA_LOAD_OPTS = (
    selectinload(Rutina.ejercicios_assoc)
    .selectinload(RutinaEjercicio.ejercicio)
    .selectinload(Ejercicio.maquina),
    selectinload(Rutina.instructor),
    selectinload(Rutina.estudiante),
)


def build_rutina_response(rutina: Rutina) -> RutinaResponse:
    ejercicios = []
    for assoc in rutina.ejercicios_assoc:
        ej = assoc.ejercicio
        maq = ej.maquina
        ejercicios.append(
            RutinaEjercicioDetalle(
                ejercicio_id=ej.id,
                nombre=ej.nombre,
                descripcion=ej.descripcion,
                con_maquina=ej.con_maquina,
                maquina_id=ej.maquina_id,
                maquina_nombre=maq.nombre if maq else None,
                maquina_codigo=maq.codigo if maq else None,
                maquina_ubicacion=maq.ubicacion if maq else None,
                maquina_descripcion=maq.descripcion if maq else None,
                maquina_fotourl=maq.fotourl if maq else None,
                fotourl=ej.fotourl,
                videourl=ej.videourl,
                grupo_muscular=ej.grupo_muscular,
                series=assoc.series,
                repeticiones=assoc.repeticiones,
            )
        )
    return RutinaResponse(
        id=rutina.id,
        instructor_id=rutina.instructor_id,
        instructor_nombre=rutina.instructor.nombre if rutina.instructor else None,
        estudiante_id=rutina.estudiante_id,
        estudiante_nombre=rutina.estudiante.nombre if rutina.estudiante else None,
        plantilla_id=rutina.plantilla_id,
        es_plantilla=rutina.estudiante_id is None and rutina.plantilla_id is None,
        nombre=rutina.nombre,
        objetivo=rutina.objetivo,
        notas_asignacion=rutina.notas_asignacion,
        ejercicios=ejercicios,
        created_at=rutina.created_at,
    )


async def get_rutina_loaded(db: AsyncSession, rutina_id: int) -> Rutina | None:
    result = await db.execute(
        select(Rutina).options(*_RUTINA_LOAD_OPTS).where(Rutina.id == rutina_id)
    )
    return result.scalar_one_or_none()


async def list_plantillas(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Rutina]:
    result = await db.execute(
        select(Rutina)
        .options(*_RUTINA_LOAD_OPTS)
        .where(Rutina.estudiante_id.is_(None), Rutina.plantilla_id.is_(None))
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().unique().all())


async def list_plantillas_by_instructor(db: AsyncSession, instructor_id: int) -> list[Rutina]:
    result = await db.execute(
        select(Rutina)
        .options(*_RUTINA_LOAD_OPTS)
        .where(
            Rutina.instructor_id == instructor_id,
            Rutina.estudiante_id.is_(None),
            Rutina.plantilla_id.is_(None),
        )
    )
    return list(result.scalars().unique().all())


async def list_rutinas_by_instructor(db: AsyncSession, instructor_id: int) -> list[Rutina]:
    """Plantillas creadas por el instructor."""
    return await list_plantillas_by_instructor(db, instructor_id)


async def list_asignaciones_by_instructor(db: AsyncSession, instructor_id: int) -> list[Rutina]:
    result = await db.execute(
        select(Rutina)
        .options(*_RUTINA_LOAD_OPTS)
        .where(Rutina.instructor_id == instructor_id, Rutina.estudiante_id.isnot(None))
        .order_by(Rutina.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def list_rutinas_by_estudiante(db: AsyncSession, estudiante_id: int) -> list[Rutina]:
    result = await db.execute(
        select(Rutina)
        .options(*_RUTINA_LOAD_OPTS)
        .where(Rutina.estudiante_id == estudiante_id)
        .order_by(Rutina.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def sync_rutina_ejercicios(
    db: AsyncSession,
    rutina: Rutina,
    items: list[RutinaEjercicioItem],
) -> None:
    await db.execute(delete(RutinaEjercicio).where(RutinaEjercicio.rutina_id == rutina.id))
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


async def asignar_rutina_a_estudiante(
    db: AsyncSession,
    *,
    plantilla_id: int,
    estudiante_id: int,
    instructor_id: int | None,
    notas_asignacion: str | None = None,
) -> Rutina:
    plantilla = await get_rutina_loaded(db, plantilla_id)
    if not plantilla:
        raise HTTPException(status_code=404, detail="Rutina plantilla no encontrada")
    if plantilla.estudiante_id is not None or plantilla.plantilla_id is not None:
        raise HTTPException(status_code=400, detail="Solo se pueden asignar rutinas plantilla")

    estudiante = await db.get(Estudiante, estudiante_id)
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    dup = await db.execute(
        select(Rutina).where(
            Rutina.plantilla_id == plantilla_id,
            Rutina.estudiante_id == estudiante_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El estudiante ya tiene asignada esta rutina")

    nueva = Rutina(
        nombre=plantilla.nombre,
        objetivo=plantilla.objetivo,
        instructor_id=instructor_id,
        estudiante_id=estudiante_id,
        plantilla_id=plantilla.id,
        notas_asignacion=notas_asignacion,
    )
    db.add(nueva)
    await db.flush()
    for assoc in plantilla.ejercicios_assoc:
        db.add(
            RutinaEjercicio(
                rutina_id=nueva.id,
                ejercicio_id=assoc.ejercicio_id,
                series=assoc.series,
                repeticiones=assoc.repeticiones,
                orden=assoc.orden,
            )
        )
    return nueva
