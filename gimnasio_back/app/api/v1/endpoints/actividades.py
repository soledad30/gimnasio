from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.actividad import Actividad
from app.schemas.schemas import ActividadCreate, ActividadUpdate, ActividadResponse

router = APIRouter()


@router.post("/", response_model=ActividadResponse, status_code=201)
async def crear_actividad(data: ActividadCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    obj = Actividad(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/", response_model=List[ActividadResponse])
async def listar_actividades(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Actividad).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/{actividad_id}", response_model=ActividadResponse)
async def obtener_actividad(actividad_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return act


@router.patch("/{actividad_id}", response_model=ActividadResponse)
async def actualizar_actividad(actividad_id: int, data: ActividadUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(act, field, value)
    await db.commit()
    await db.refresh(act)
    return act


@router.delete("/{actividad_id}", status_code=204)
async def eliminar_actividad(actividad_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    await db.delete(act)
    await db.commit()
