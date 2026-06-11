from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_staff, get_db
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
