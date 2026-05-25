from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.rutina import Rutina
from app.schemas.schemas import RutinaCreate, RutinaUpdate, RutinaResponse

router = APIRouter()


@router.post("/", response_model=RutinaResponse, status_code=201)
async def crear_rutina(data: RutinaCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    obj = Rutina(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/", response_model=List[RutinaResponse])
async def listar_rutinas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Rutina).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/estudiante/{estudiante_id}", response_model=List[RutinaResponse])
async def rutinas_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Rutina).where(Rutina.estudiante_id == estudiante_id))
    return list(result.scalars().all())


@router.get("/{rutina_id}", response_model=RutinaResponse)
async def obtener_rutina(rutina_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Rutina).where(Rutina.id == rutina_id))
    rutina = result.scalar_one_or_none()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    return rutina


@router.patch("/{rutina_id}", response_model=RutinaResponse)
async def actualizar_rutina(rutina_id: int, data: RutinaUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Rutina).where(Rutina.id == rutina_id))
    rutina = result.scalar_one_or_none()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(rutina, field, value)
    await db.commit()
    await db.refresh(rutina)
    return rutina


@router.delete("/{rutina_id}", status_code=204)
async def eliminar_rutina(rutina_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Rutina).where(Rutina.id == rutina_id))
    rutina = result.scalar_one_or_none()
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    await db.delete(rutina)
    await db.commit()
