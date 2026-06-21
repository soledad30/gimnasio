from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_usuario, get_db
from app.core.roles import is_admin
from app.models.actividad import Actividad
from app.models.instructor import Instructor
from app.models.reserva import Reserva
from app.services.periodo_service import formatear_vigencia
from app.services.scheduling_service import parse_dias_semana, serializar_dias, validar_actividad_horario
from app.schemas.schemas import ActividadCreate, ActividadResponse, ActividadUpdate

router = APIRouter()


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
        instructor_nombre=act.instructor.nombre if act.instructor else None,
        sala_id=act.sala_id,
        sala_nombre=act.sala.nombre if act.sala else None,
        nombre=act.nombre,
        descripcion=act.descripcion,
        dia_semana=act.dia_semana,
        dias_semana=parse_dias_semana(act.dia_semana),
        hora_inicio=act.hora_inicio,
        hora_fin=act.hora_fin,
        capacidad=act.capacidad,
        vigencia_tipo=act.vigencia_tipo or "mes",
        vigencia_inicio=act.vigencia_inicio,
        vigencia_fin=act.vigencia_fin,
        vigencia_label=formatear_vigencia(act.vigencia_tipo, act.vigencia_inicio, act.vigencia_fin),
        cupos_ocupados=ocupados if fecha else None,
        cupos_disponibles=disponibles if fecha else None,
        created_at=act.created_at,
    )


async def _load_actividad(db: AsyncSession, actividad_id: int) -> Actividad:
    result = await db.execute(
        select(Actividad)
        .options(selectinload(Actividad.instructor), selectinload(Actividad.sala))
        .where(Actividad.id == actividad_id)
    )
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return act


async def _instructor_actual(db: AsyncSession, current) -> Optional[Instructor]:
    result = await db.execute(select(Instructor).where(Instructor.usuario_id == current.id))
    return result.scalar_one_or_none()


def _normalizar_dias(payload: dict) -> str:
    dias_list = payload.pop("dias_semana", None)
    if dias_list:
        return serializar_dias(dias_list)
    raw = payload.get("dia_semana")
    if raw:
        return serializar_dias(parse_dias_semana(str(raw)))
    return ""


@router.post("/", response_model=ActividadResponse, status_code=201)
async def crear_actividad(
    data: ActividadCreate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    payload = data.model_dump()
    instructor = await _instructor_actual(db, current)

    if is_admin(current):
        if not payload.get("instructor_id"):
            raise HTTPException(status_code=400, detail="Debe asignar un entrenador")
    else:
        if not instructor:
            raise HTTPException(status_code=403, detail="Solo entrenadores pueden reservar actividades en sala")
        payload["instructor_id"] = instructor.id

    dias_raw = _normalizar_dias(payload)
    hi, hf, dias, v_tipo, v_ini, v_fin = await validar_actividad_horario(
        db,
        sala_id=payload.get("sala_id"),
        instructor_id=payload.get("instructor_id"),
        dia_semana=dias_raw,
        hora_inicio=payload.get("hora_inicio"),
        hora_fin=payload.get("hora_fin"),
        capacidad=payload.get("capacidad", 20),
        vigencia_tipo=payload.get("vigencia_tipo"),
        vigencia_inicio=payload.get("vigencia_inicio"),
    )
    payload["hora_inicio"] = hi
    payload["hora_fin"] = hf
    payload["dia_semana"] = dias
    payload["vigencia_tipo"] = v_tipo
    payload["vigencia_inicio"] = v_ini
    payload["vigencia_fin"] = v_fin
    payload.pop("dias_semana", None)

    obj = Actividad(**payload)
    db.add(obj)
    await db.commit()
    return await to_actividad_response(db, await _load_actividad(db, obj.id))


@router.get("/", response_model=List[ActividadResponse])
async def listar_actividades(
    fecha: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(
        select(Actividad)
        .options(selectinload(Actividad.instructor), selectinload(Actividad.sala))
        .offset(skip)
        .limit(limit)
    )
    acts = list(result.scalars().all())
    if fecha:
        from app.services.periodo_service import resolver_actividades_para_fecha

        acts = resolver_actividades_para_fecha(acts, fecha)
    return [await to_actividad_response(db, a, fecha) for a in acts]


@router.get("/mis-actividades", response_model=List[ActividadResponse])
async def mis_actividades_instructor(
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    instructor = await _instructor_actual(db, current)
    if not instructor:
        raise HTTPException(status_code=403, detail="Solo para entrenadores")
    result = await db.execute(
        select(Actividad)
        .options(selectinload(Actividad.instructor), selectinload(Actividad.sala))
        .where(Actividad.instructor_id == instructor.id)
    )
    acts = list(result.scalars().all())
    return [await to_actividad_response(db, a) for a in acts]


@router.get("/{actividad_id}", response_model=ActividadResponse)
async def obtener_actividad(
    actividad_id: int,
    fecha: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    act = await _load_actividad(db, actividad_id)
    return await to_actividad_response(db, act, fecha)


@router.patch("/{actividad_id}", response_model=ActividadResponse)
async def actualizar_actividad(
    actividad_id: int,
    data: ActividadUpdate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    act = await _load_actividad(db, actividad_id)
    instructor = await _instructor_actual(db, current)
    if not is_admin(current):
        if not instructor or act.instructor_id != instructor.id:
            raise HTTPException(status_code=403, detail="Solo puedes editar tus actividades")

    updates = data.model_dump(exclude_none=True)
    merged = {
        "sala_id": updates.get("sala_id", act.sala_id),
        "instructor_id": updates.get("instructor_id", act.instructor_id),
        "dia_semana": updates.get("dia_semana", act.dia_semana),
        "dias_semana": updates.get("dias_semana"),
        "hora_inicio": updates.get("hora_inicio", act.hora_inicio),
        "hora_fin": updates.get("hora_fin", act.hora_fin),
        "capacidad": updates.get("capacidad", act.capacidad),
        "vigencia_tipo": updates.get("vigencia_tipo", act.vigencia_tipo),
        "vigencia_inicio": updates.get("vigencia_inicio", act.vigencia_inicio),
    }
    if merged.get("dias_semana") is not None:
        merged["dia_semana"] = serializar_dias(merged["dias_semana"])
    merged.pop("dias_semana", None)
    hi, hf, dias, v_tipo, v_ini, v_fin = await validar_actividad_horario(
        db,
        sala_id=merged["sala_id"],
        instructor_id=merged["instructor_id"],
        dia_semana=merged["dia_semana"],
        hora_inicio=merged["hora_inicio"],
        hora_fin=merged["hora_fin"],
        capacidad=merged["capacidad"],
        vigencia_tipo=merged["vigencia_tipo"],
        vigencia_inicio=merged["vigencia_inicio"],
        exclude_actividad_id=act.id,
    )
    updates["hora_inicio"] = hi
    updates["hora_fin"] = hf
    updates["dia_semana"] = dias
    updates["vigencia_tipo"] = v_tipo
    updates["vigencia_inicio"] = v_ini
    updates["vigencia_fin"] = v_fin

    for field, value in updates.items():
        setattr(act, field, value)
    await db.commit()
    return await to_actividad_response(db, await _load_actividad(db, act.id))


@router.delete("/{actividad_id}", status_code=204)
async def eliminar_actividad(
    actividad_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    act = await _load_actividad(db, actividad_id)
    instructor = await _instructor_actual(db, current)
    if not is_admin(current):
        if not instructor or act.instructor_id != instructor.id:
            raise HTTPException(status_code=403, detail="Solo puedes eliminar tus actividades")
    await db.delete(act)
    await db.commit()
