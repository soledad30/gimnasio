from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_current_staff, get_db
from app.models.reporte import Reporte
from app.schemas.schemas import ReporteCreate, ReporteResponse
from app.services.reporte_service import ReporteService
from sqlalchemy import select

router = APIRouter()


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    return await ReporteService(db).dashboard()


@router.get("/accesos")
async def reporte_accesos(
    fecha_inicio: date,
    fecha_fin: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await ReporteService(db).reporte_accesos(fecha_inicio, fecha_fin)


@router.get("/graficos")
async def reporte_graficos(
    fecha_inicio: date,
    fecha_fin: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await ReporteService(db).reporte_graficos(fecha_inicio, fecha_fin)


@router.get("/export/accesos")
async def export_accesos(
    fecha_inicio: date,
    fecha_fin: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await ReporteService(db).export_accesos_csv(fecha_inicio, fecha_fin)


@router.get("/export/pagos")
async def export_pagos(
    fecha_inicio: date,
    fecha_fin: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await ReporteService(db).export_pagos_csv(fecha_inicio, fecha_fin)


@router.get("/export/membresias")
async def export_membresias(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await ReporteService(db).export_membresias_csv()


@router.get("/export/estudiantes")
async def export_estudiantes(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await ReporteService(db).export_estudiantes_csv()


@router.post("/", response_model=ReporteResponse, status_code=201)
async def guardar_reporte(data: ReporteCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    obj = Reporte(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/", response_model=List[ReporteResponse])
async def listar_reportes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Reporte).offset(skip).limit(limit))
    return list(result.scalars().all())
