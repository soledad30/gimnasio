from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.maquina import Maquina
from app.schemas.schemas import MaquinaCreate, MaquinaUpdate, MaquinaResponse

router = APIRouter()


@router.post("/", response_model=MaquinaResponse, status_code=201)
async def crear_maquina(data: MaquinaCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    obj = Maquina(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/", response_model=List[MaquinaResponse])
async def listar_maquinas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Maquina).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/{maquina_id}", response_model=MaquinaResponse)
async def obtener_maquina(maquina_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Maquina).where(Maquina.id == maquina_id))
    maq = result.scalar_one_or_none()
    if not maq:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    return maq


@router.patch("/{maquina_id}", response_model=MaquinaResponse)
async def actualizar_maquina(maquina_id: int, data: MaquinaUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Maquina).where(Maquina.id == maquina_id))
    maq = result.scalar_one_or_none()
    if not maq:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(maq, field, value)
    await db.commit()
    await db.refresh(maq)
    return maq


@router.delete("/{maquina_id}", status_code=204)
async def eliminar_maquina(maquina_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Maquina).where(Maquina.id == maquina_id))
    maq = result.scalar_one_or_none()
    if not maq:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    await db.delete(maq)
    await db.commit()
