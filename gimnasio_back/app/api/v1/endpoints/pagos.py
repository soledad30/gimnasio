from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_current_estudiante,
    get_current_staff,
    get_current_usuario,
    get_db,
)
from app.core.roles import is_staff
from app.schemas.schemas import PagoCreate, PagoResponse
from app.services.pago_service import PagoService, to_pago_response

router = APIRouter()


@router.post("/", response_model=PagoResponse, status_code=201)
async def registrar_pago(
    data: PagoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    pago = await PagoService(db).crear(data)
    return to_pago_response(pago)


@router.get("/", response_model=List[PagoResponse])
async def listar_pagos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    items = await PagoService(db).list_all(skip=skip, limit=limit)
    return [to_pago_response(p) for p in items]


@router.get("/mis", response_model=List[PagoResponse])
async def mis_pagos(
    db: AsyncSession = Depends(get_db),
    estudiante=Depends(get_current_estudiante),
):
    items = await PagoService(db).list_by_estudiante(estudiante.id)
    return [to_pago_response(p) for p in items]


@router.get("/mis/{pago_id}/comprobante", response_class=HTMLResponse)
async def mi_comprobante(
    pago_id: int,
    db: AsyncSession = Depends(get_db),
    estudiante=Depends(get_current_estudiante),
):
    pago = await PagoService(db).get_loaded(pago_id)
    if not pago or pago.estudiante_id != estudiante.id:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    html = await PagoService(db).render_comprobante_html(pago_id)
    return HTMLResponse(content=html)


@router.get("/{pago_id}/comprobante", response_class=HTMLResponse)
async def comprobante_pago(
    pago_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    pago = await PagoService(db).get_loaded(pago_id)
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if not is_staff(current):
        from app.models.estudiante import Estudiante
        from sqlalchemy import select

        est = (
            await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
        ).scalar_one_or_none()
        if not est or pago.estudiante_id != est.id:
            raise HTTPException(status_code=403, detail="No autorizado a ver este comprobante")

    html = await PagoService(db).render_comprobante_html(pago_id)
    return HTMLResponse(content=html)
