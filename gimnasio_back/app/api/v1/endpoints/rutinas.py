from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_current_admin,
    get_current_estudiante,
    get_current_instructor_profile,
    get_current_usuario,
    get_db,
)
from app.models.instructor import Instructor
from app.models.rutina import Rutina
from app.schemas.schemas import RutinaCreate, RutinaResponse, RutinaUpdate
from app.services.rutina_service import (
    build_rutina_response,
    get_rutina_loaded,
    list_rutinas_by_estudiante,
    list_rutinas_by_instructor,
    list_rutinas_loaded,
    sync_rutina_ejercicios,
)

router = APIRouter()


async def _instructor_for_user(db: AsyncSession, user) -> Optional[Instructor]:
    if user.es_admin:
        return None
    result = await db.execute(select(Instructor).where(Instructor.usuario_id == user.id))
    return result.scalar_one_or_none()


def _assert_instructor_owns(instructor: Instructor, rutina: Rutina) -> None:
    if rutina.instructor_id != instructor.id:
        raise HTTPException(status_code=403, detail="No puedes modificar esta rutina")


@router.post("/", response_model=RutinaResponse, status_code=201)
async def crear_rutina(
    data: RutinaCreate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    instructor = await _instructor_for_user(db, current)
    if not current.es_admin and not instructor:
        raise HTTPException(status_code=403, detail="No autorizado para crear rutinas")

    payload = data.model_dump(exclude={"ejercicios"})
    if instructor and not current.es_admin:
        payload["instructor_id"] = instructor.id

    obj = Rutina(**payload)
    db.add(obj)
    await db.flush()
    if data.ejercicios:
        await sync_rutina_ejercicios(db, obj, data.ejercicios)
    await db.commit()
    loaded = await get_rutina_loaded(db, obj.id)
    return build_rutina_response(loaded)


@router.get("/", response_model=List[RutinaResponse])
async def listar_rutinas(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    rutinas = await list_rutinas_loaded(db, skip=skip, limit=limit)
    return [build_rutina_response(r) for r in rutinas]


@router.get("/mis-asignadas", response_model=List[RutinaResponse])
async def rutinas_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    rutinas = await list_rutinas_by_instructor(db, instructor.id)
    return [build_rutina_response(r) for r in rutinas]


@router.get("/mis-rutinas", response_model=List[RutinaResponse])
async def mis_rutinas(
    estudiante=Depends(get_current_estudiante),
    db: AsyncSession = Depends(get_db),
):
    rutinas = await list_rutinas_by_estudiante(db, estudiante.id)
    return [build_rutina_response(r) for r in rutinas]


@router.get("/estudiante/{estudiante_id}", response_model=List[RutinaResponse])
async def rutinas_estudiante(
    estudiante_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    rutinas = await list_rutinas_by_estudiante(db, estudiante_id)
    return [build_rutina_response(r) for r in rutinas]


@router.get("/{rutina_id}", response_model=RutinaResponse)
async def obtener_rutina(
    rutina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    rutina = await get_rutina_loaded(db, rutina_id)
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    return build_rutina_response(rutina)


@router.patch("/{rutina_id}", response_model=RutinaResponse)
async def actualizar_rutina(
    rutina_id: int,
    data: RutinaUpdate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    instructor = await _instructor_for_user(db, current)
    rutina = await get_rutina_loaded(db, rutina_id)
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")

    if instructor and not current.es_admin:
        _assert_instructor_owns(instructor, rutina)

    payload = data.model_dump(exclude_none=True, exclude={"ejercicios"})
    if instructor and not current.es_admin:
        payload.pop("instructor_id", None)

    for field, value in payload.items():
        setattr(rutina, field, value)
    if data.ejercicios is not None:
        await sync_rutina_ejercicios(db, rutina, data.ejercicios)
    await db.commit()
    loaded = await get_rutina_loaded(db, rutina_id)
    return build_rutina_response(loaded)


@router.delete("/{rutina_id}", status_code=204)
async def eliminar_rutina(
    rutina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(select(Rutina).where(Rutina.id == rutina_id))
    rutina = result.scalar_one_or_none()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    await db.delete(rutina)
    await db.commit()
