from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_admin, get_current_instructor_profile, get_current_staff, get_current_usuario, get_db
from app.models.actividad import Actividad
from app.models.estudiante import Estudiante
from app.models.reserva import Reserva
from app.schemas.schemas import ReservaCreate, ReservaResponse
from app.services.scheduling_service import formatear_dias
from app.services.scheduling_service import validar_reserva_estudiante
from app.services.notificacion_service import NotificacionService

router = APIRouter()


def _horario(act: Actividad) -> str:
    parts = []
    if act.dia_semana:
        parts.append(formatear_dias(act.dia_semana))
    if act.hora_inicio and act.hora_fin:
        parts.append(f"{act.hora_inicio}-{act.hora_fin}")
    return " ".join(parts)


def to_reserva_response(reserva: Reserva) -> ReservaResponse:
    act = reserva.actividad
    est = reserva.estudiante
    return ReservaResponse(
        id=reserva.id,
        estudiante_id=reserva.estudiante_id,
        estudiante_nombre=est.nombre if est else None,
        actividad_id=reserva.actividad_id,
        actividad_nombre=act.nombre if act else None,
        horario=_horario(act) if act else None,
        fecha=reserva.fecha,
        estado=reserva.estado,
        created_at=reserva.created_at,
    )


@router.post("/", response_model=ReservaResponse, status_code=201)
async def crear_reserva(
    data: ReservaCreate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    act_result = await db.execute(select(Actividad).where(Actividad.id == data.actividad_id))
    actividad = act_result.scalar_one_or_none()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=400, detail="El usuario no tiene perfil de estudiante")

    await validar_reserva_estudiante(db, actividad, data.fecha)

    mes_reserva = data.fecha.replace(day=1)
    from app.services.inscripcion_service import (
        tiene_inscripcion_confirmada,
        tiene_inscripcion_pendiente,
    )

    if not await tiene_inscripcion_confirmada(
        db, estudiante.id, "actividad", mes_reserva, actividad_id=actividad.id
    ):
        if await tiene_inscripcion_pendiente(
            db, estudiante.id, "actividad", mes_reserva, actividad_id=actividad.id
        ):
            raise HTTPException(
                status_code=402,
                detail="Tienes inscripción pendiente de pago. Cancela en recepción o paga para reservar.",
            )
        raise HTTPException(
            status_code=403,
            detail="Necesitas inscripción mensual confirmada y pagada para reservar clases",
        )

    count = await db.scalar(
        select(func.count(Reserva.id)).where(
            and_(Reserva.actividad_id == data.actividad_id, Reserva.fecha == data.fecha, Reserva.estado == 1)
        )
    )
    if count >= actividad.capacidad:
        raise HTTPException(status_code=409, detail="La actividad ya alcanzó su capacidad máxima")

    obj = Reserva(estudiante_id=estudiante.id, actividad_id=data.actividad_id, fecha=data.fecha, estado=1)
    db.add(obj)
    await NotificacionService(db).notificar_reserva(estudiante.id, actividad.nombre, data.fecha)
    await db.commit()
    await db.refresh(obj)
    loaded = await db.execute(
        select(Reserva)
        .options(selectinload(Reserva.actividad), selectinload(Reserva.estudiante))
        .where(Reserva.id == obj.id)
    )
    return to_reserva_response(loaded.scalar_one())


@router.get("/mis-clases", response_model=List[ReservaResponse])
async def reservas_instructor(
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    act_ids_q = select(Actividad.id).where(Actividad.instructor_id == instructor.id)
    result = await db.execute(
        select(Reserva)
        .options(selectinload(Reserva.actividad), selectinload(Reserva.estudiante))
        .where(Reserva.actividad_id.in_(act_ids_q), Reserva.estado == 1)
        .order_by(Reserva.fecha.desc())
    )
    return [to_reserva_response(r) for r in result.scalars().all()]


@router.get("/mis-reservas", response_model=List[ReservaResponse])
async def mis_reservas(db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()
    if not estudiante:
        return []
    result = await db.execute(
        select(Reserva)
        .options(selectinload(Reserva.actividad), selectinload(Reserva.estudiante))
        .where(Reserva.estudiante_id == estudiante.id)
        .order_by(Reserva.fecha.desc())
    )
    return [to_reserva_response(r) for r in result.scalars().all()]


@router.patch("/{reserva_id}/cancelar", response_model=ReservaResponse)
async def cancelar_reserva(
    reserva_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    result = await db.execute(
        select(Reserva)
        .options(selectinload(Reserva.actividad), selectinload(Reserva.estudiante))
        .where(Reserva.id == reserva_id)
    )
    reserva = result.scalar_one_or_none()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if not current.es_admin:
        est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
        estudiante = est_result.scalar_one_or_none()
        if not estudiante or reserva.estudiante_id != estudiante.id:
            raise HTTPException(status_code=403, detail="No puedes cancelar esta reserva")
    reserva.estado = 0
    await db.commit()
    await db.refresh(reserva)
    return to_reserva_response(reserva)


@router.get("/", response_model=List[ReservaResponse])
async def listar_reservas(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    result = await db.execute(
        select(Reserva)
        .options(selectinload(Reserva.actividad), selectinload(Reserva.estudiante))
        .offset(skip)
        .limit(limit)
    )
    return [to_reserva_response(r) for r in result.scalars().all()]
