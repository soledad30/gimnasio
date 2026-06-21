from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_current_estudiante,
    get_current_instructor_profile,
    get_current_usuario,
    get_db,
)
from app.models.instructor import Instructor
from app.models.rutina import Rutina
from app.schemas.schemas import RutinaAsignarCreate, RutinaCreate, RutinaResponse, RutinaUpdate
from app.services.rutina_service import (
    asignar_rutina_a_estudiante,
    build_rutina_response,
    get_rutina_loaded,
    list_asignaciones_by_instructor,
    list_plantillas,
    list_rutinas_by_estudiante,
    list_rutinas_by_instructor,
    sync_rutina_ejercicios,
)

router = APIRouter()


async def _instructor_for_user(db: AsyncSession, user) -> Optional[Instructor]:
    if user.es_admin:
        return None
    result = await db.execute(select(Instructor).where(Instructor.usuario_id == user.id))
    return result.scalar_one_or_none()


def _assert_can_edit_plantilla(instructor: Instructor, rutina: Rutina, is_admin: bool) -> None:
    if rutina.estudiante_id is not None or rutina.plantilla_id is not None:
        raise HTTPException(status_code=400, detail="Solo se pueden editar rutinas plantilla")
    if is_admin:
        return
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
        raise HTTPException(status_code=403, detail="Solo administradores o instructores pueden crear rutinas")

    if not data.objetivo or not data.objetivo.strip():
        raise HTTPException(status_code=400, detail="Selecciona un objetivo para la rutina")

    obj = Rutina(
        nombre=data.nombre,
        objetivo=data.objetivo.strip(),
        instructor_id=instructor.id if instructor else None,
        estudiante_id=None,
        plantilla_id=None,
    )
    db.add(obj)
    await db.flush()
    if data.ejercicios:
        await sync_rutina_ejercicios(db, obj, data.ejercicios)
    await db.commit()
    loaded = await get_rutina_loaded(db, obj.id)
    return build_rutina_response(loaded)


@router.get("/", response_model=List[RutinaResponse])
async def listar_plantillas(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    rutinas = await list_plantillas(db, skip=skip, limit=limit)
    return [build_rutina_response(r) for r in rutinas]


@router.get("/mis-asignadas", response_model=List[RutinaResponse])
async def rutinas_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    rutinas = await list_rutinas_by_instructor(db, instructor.id)
    return [build_rutina_response(r) for r in rutinas]


@router.get("/asignaciones", response_model=List[RutinaResponse])
async def rutinas_asignadas_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    rutinas = await list_asignaciones_by_instructor(db, instructor.id)
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


@router.post("/{rutina_id}/asignar", response_model=RutinaResponse, status_code=201)
async def asignar_rutina(
    rutina_id: int,
    data: RutinaAsignarCreate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    instructor = await _instructor_for_user(db, current)
    if not current.es_admin and not instructor:
        raise HTTPException(status_code=403, detail="Solo administradores o instructores pueden asignar rutinas")

    nueva = await asignar_rutina_a_estudiante(
        db,
        plantilla_id=rutina_id,
        estudiante_id=data.estudiante_id,
        instructor_id=instructor.id if instructor else None,
        notas_asignacion=data.notas_asignacion,
    )
    await db.commit()
    loaded = await get_rutina_loaded(db, nueva.id)
    return build_rutina_response(loaded)


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

    if not current.es_admin:
        if not instructor:
            raise HTTPException(status_code=403, detail="No autorizado")
        _assert_can_edit_plantilla(instructor, rutina, current.es_admin)

    payload = data.model_dump(exclude_none=True, exclude={"ejercicios"})
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
    current=Depends(get_current_usuario),
):
    instructor = await _instructor_for_user(db, current)
    result = await db.execute(select(Rutina).where(Rutina.id == rutina_id))
    rutina = result.scalar_one_or_none()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")

    if current.es_admin:
        pass
    elif instructor and rutina.instructor_id == instructor.id and rutina.estudiante_id is None:
        pass
    else:
        raise HTTPException(status_code=403, detail="No puedes eliminar esta rutina")

    await db.delete(rutina)
    await db.commit()
