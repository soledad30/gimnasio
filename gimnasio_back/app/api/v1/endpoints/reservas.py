from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.reserva import Reserva
from app.models.actividad import Actividad
from app.schemas.schemas import ReservaCreate, ReservaResponse

router = APIRouter()


@router.post("/", response_model=ReservaResponse, status_code=201)
async def crear_reserva(
    data: ReservaCreate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    # Verificar actividad existe
    act_result = await db.execute(select(Actividad).where(Actividad.id == data.actividad_id))
    actividad = act_result.scalar_one_or_none()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    # Obtener estudiante del usuario actual
    from app.models.estudiante import Estudiante
    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=400, detail="El usuario no tiene perfil de estudiante")

    # Verificar capacidad
    from sqlalchemy import func
    count = await db.scalar(
        select(func.count(Reserva.id)).where(
            and_(Reserva.actividad_id == data.actividad_id, Reserva.fecha == data.fecha, Reserva.estado == 1)
        )
    )
    if count >= actividad.capacidad:
        raise HTTPException(status_code=409, detail="La actividad ya alcanzó su capacidad máxima")

    obj = Reserva(estudiante_id=estudiante.id, actividad_id=data.actividad_id, fecha=data.fecha, estado=1)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/mis-reservas", response_model=List[ReservaResponse])
async def mis_reservas(db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    from app.models.estudiante import Estudiante
    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()
    if not estudiante:
        return []
    result = await db.execute(select(Reserva).where(Reserva.estudiante_id == estudiante.id))
    return list(result.scalars().all())


@router.patch("/{reserva_id}/cancelar", response_model=ReservaResponse)
async def cancelar_reserva(reserva_id: int, db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    result = await db.execute(select(Reserva).where(Reserva.id == reserva_id))
    reserva = result.scalar_one_or_none()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if not current.es_admin:
        from app.models.estudiante import Estudiante
        est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
        estudiante = est_result.scalar_one_or_none()
        if not estudiante or reserva.estudiante_id != estudiante.id:
            raise HTTPException(status_code=403, detail="No puedes cancelar esta reserva")
    reserva.estado = 0
    await db.commit()
    await db.refresh(reserva)
    return reserva


@router.get("/", response_model=List[ReservaResponse])
async def listar_reservas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Reserva).offset(skip).limit(limit))
    return list(result.scalars().all())
