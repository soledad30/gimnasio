from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.estudiante import Estudiante
from app.models.notificacion import Notificacion
from app.models.usuario import Usuario
from app.schemas.schemas import (
    NotificacionCreate,
    NotificacionMasivaCreate,
    NotificacionMasivaResult,
    NotificacionResponse,
)
from app.services.notificacion_service import NotificacionService

router = APIRouter()


def _destinatario_label(n: Notificacion) -> str:
    if n.estudiante is not None:
        return n.estudiante.nombre
    if n.usuario is not None:
        rol = (n.usuario.rol or "").capitalize()
        return f"{n.usuario.nombre} ({rol})"
    if n.estudiante_id:
        return f"Estudiante #{n.estudiante_id}"
    if n.usuario_id:
        return f"Usuario #{n.usuario_id}"
    return "—"


def _to_response(n: Notificacion) -> NotificacionResponse:
    return NotificacionResponse(
        id=n.id,
        estudiante_id=n.estudiante_id,
        usuario_id=n.usuario_id,
        destinatario=_destinatario_label(n),
        fecha=n.fecha,
        titulo=n.titulo,
        mensaje=n.mensaje,
        leida=n.leida,
        tipo=n.tipo,
        created_at=n.created_at,
    )


@router.post("/procesar-alertas")
async def procesar_alertas_vencimiento(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Genera notificaciones automáticas de membresías por vencer o vencidas."""
    return await NotificacionService(db).procesar_alertas_vencimiento()


@router.get("/", response_model=List[NotificacionResponse])
async def listar_notificaciones(
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(Notificacion)
        .options(selectinload(Notificacion.estudiante), selectinload(Notificacion.usuario))
        .order_by(Notificacion.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return [_to_response(n) for n in result.scalars().all()]


@router.post("/", response_model=NotificacionResponse, status_code=201)
async def crear_notificacion(
    data: NotificacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    obj = Notificacion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    result = await db.execute(
        select(Notificacion)
        .options(selectinload(Notificacion.estudiante), selectinload(Notificacion.usuario))
        .where(Notificacion.id == obj.id)
    )
    return _to_response(result.scalar_one())


@router.post("/masivo", response_model=NotificacionMasivaResult, status_code=201)
async def crear_notificacion_masiva(
    data: NotificacionMasivaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    try:
        return await NotificacionService(db).enviar_masivo(
            alcance=data.alcance,
            titulo=data.titulo,
            mensaje=data.mensaje,
            tipo=data.tipo,
            estudiante_id=data.estudiante_id,
            fecha=data.fecha,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/mis-notificaciones", response_model=List[NotificacionResponse])
async def mis_notificaciones(
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()

    conditions = [Notificacion.usuario_id == current.id]
    if estudiante:
        conditions.append(Notificacion.estudiante_id == estudiante.id)

    result = await db.execute(
        select(Notificacion)
        .options(selectinload(Notificacion.estudiante), selectinload(Notificacion.usuario))
        .where(or_(*conditions))
        .order_by(Notificacion.created_at.desc())
    )
    return [_to_response(n) for n in result.scalars().all()]


@router.patch("/{notificacion_id}/leer", response_model=NotificacionResponse)
async def marcar_leida(
    notificacion_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    result = await db.execute(
        select(Notificacion)
        .options(selectinload(Notificacion.estudiante), selectinload(Notificacion.usuario))
        .where(Notificacion.id == notificacion_id)
    )
    noti = result.scalar_one_or_none()
    if not noti:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    # Solo el destinatario puede marcarla
    est_result = await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    estudiante = est_result.scalar_one_or_none()
    es_mia = noti.usuario_id == current.id or (
        estudiante is not None and noti.estudiante_id == estudiante.id
    )
    if not es_mia:
        raise HTTPException(status_code=403, detail="No puedes marcar esta notificación")

    noti.leida = True
    await db.commit()
    await db.refresh(noti)
    return _to_response(noti)


@router.delete("/{notificacion_id}", status_code=204)
async def eliminar_notificacion(
    notificacion_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(select(Notificacion).where(Notificacion.id == notificacion_id))
    noti = result.scalar_one_or_none()
    if not noti:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    await db.delete(noti)
    await db.commit()
