from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.notificacion import Notificacion
from app.schemas.schemas import NotificacionCreate, NotificacionResponse

router = APIRouter()


@router.get("/", response_model=List[NotificacionResponse])
async def listar_notificaciones(
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(Notificacion).order_by(Notificacion.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


@router.post("/", response_model=NotificacionResponse, status_code=201)
async def crear_notificacion(data: NotificacionCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    obj = Notificacion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/mis-notificaciones", response_model=List[NotificacionResponse])
async def mis_notificaciones(db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    from app.models.estudiante import Estudiante
    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()
    if not estudiante:
        return []
    result = await db.execute(
        select(Notificacion).where(Notificacion.estudiante_id == estudiante.id).order_by(Notificacion.created_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/{notificacion_id}/leer", response_model=NotificacionResponse)
async def marcar_leida(notificacion_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Notificacion).where(Notificacion.id == notificacion_id))
    noti = result.scalar_one_or_none()
    if not noti:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    noti.leida = True
    await db.commit()
    await db.refresh(noti)
    return noti


@router.delete("/{notificacion_id}", status_code=204)
async def eliminar_notificacion(notificacion_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Notificacion).where(Notificacion.id == notificacion_id))
    noti = result.scalar_one_or_none()
    if not noti:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    await db.delete(noti)
    await db.commit()
