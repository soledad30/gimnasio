from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin
from app.models.reporte import Reporte
from app.schemas.schemas import ReporteCreate, ReporteResponse
from app.services.reporte_service import ReporteService

router = APIRouter()


@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """KPIs en tiempo real: estudiantes activos, accesos hoy, membresías por vencer."""
    return await ReporteService(db).dashboard()


@router.get("/accesos")
async def reporte_accesos(
    fecha_inicio: date,
    fecha_fin: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await ReporteService(db).reporte_accesos(fecha_inicio, fecha_fin)


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
