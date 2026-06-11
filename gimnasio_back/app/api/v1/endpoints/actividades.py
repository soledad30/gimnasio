from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_current_instructor_profile, get_current_usuario, get_db
from app.models.actividad import Actividad
from app.models.reserva import Reserva
from app.schemas.schemas import ActividadCreate, ActividadResponse, ActividadUpdate

router = APIRouter()

DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


def _horario_label(act: Actividad) -> str:
    parts = []
    if act.dia_semana:
        parts.append(act.dia_semana.capitalize())
    if act.hora_inicio and act.hora_fin:
        parts.append(f"{act.hora_inicio} - {act.hora_fin}")
    elif act.hora_inicio:
        parts.append(act.hora_inicio)
    return " · ".join(parts) if parts else ""


async def _cupos_actividad(db: AsyncSession, actividad_id: int, fecha: Optional[date]) -> tuple[int, int]:
    act = await db.get(Actividad, actividad_id)
    if not act:
        return 0, 0
    if not fecha:
        return 0, act.capacidad
    ocupados = await db.scalar(
        select(func.count(Reserva.id)).where(
            and_(Reserva.actividad_id == actividad_id, Reserva.fecha == fecha, Reserva.estado == 1)
        )
    ) or 0
    return ocupados, max(0, act.capacidad - ocupados)


async def to_actividad_response(
    db: AsyncSession, act: Actividad, fecha: Optional[date] = None
) -> ActividadResponse:
    ocupados, disponibles = await _cupos_actividad(db, act.id, fecha)
    return ActividadResponse(
        id=act.id,
        instructor_id=act.instructor_id,
        nombre=act.nombre,
        descripcion=act.descripcion,
        dia_semana=act.dia_semana,
        hora_inicio=act.hora_inicio,
        hora_fin=act.hora_fin,
        capacidad=act.capacidad,
        cupos_ocupados=ocupados if fecha else None,
        cupos_disponibles=disponibles if fecha else None,
        created_at=act.created_at,
    )


@router.post("/", response_model=ActividadResponse, status_code=201)
async def crear_actividad(
    data: ActividadCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    obj = Actividad(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return await to_actividad_response(db, obj)


@router.get("/", response_model=List[ActividadResponse])
async def listar_actividades(
    fecha: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(select(Actividad).offset(skip).limit(limit))
    acts = list(result.scalars().all())
    return [await to_actividad_response(db, a, fecha) for a in acts]


@router.get("/mis-actividades", response_model=List[ActividadResponse])
async def mis_actividades_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Actividad).where(Actividad.instructor_id == instructor.id))
    acts = list(result.scalars().all())
    return [await to_actividad_response(db, a) for a in acts]


@router.get("/{actividad_id}", response_model=ActividadResponse)
async def obtener_actividad(
    actividad_id: int,
    fecha: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return await to_actividad_response(db, act, fecha)


@router.patch("/{actividad_id}", response_model=ActividadResponse)
async def actualizar_actividad(
    actividad_id: int,
    data: ActividadUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(act, field, value)
    await db.commit()
    await db.refresh(act)
    return await to_actividad_response(db, act)


@router.delete("/{actividad_id}", status_code=204)
async def eliminar_actividad(
    actividad_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    await db.delete(act)
    await db.commit()
