# membresias.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.models.membresia import Membresia
from app.schemas.schemas import MembresiaCreate, MembresiaUpdate, MembresiaResponse

router = APIRouter()


@router.post("/", response_model=MembresiaResponse, status_code=201)
async def crear_membresia(data: MembresiaCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    obj = Membresia(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/estudiante/{estudiante_id}", response_model=MembresiaResponse)
async def membresia_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    result = await db.execute(select(Membresia).where(Membresia.estudiante_id == estudiante_id))
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    return mem


@router.patch("/{membresia_id}", response_model=MembresiaResponse)
async def actualizar_membresia(membresia_id: int, data: MembresiaUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Membresia).where(Membresia.id == membresia_id))
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(mem, field, value)
    await db.commit()
    await db.refresh(mem)
    return mem


@router.delete("/{membresia_id}", status_code=204)
async def eliminar_membresia(membresia_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Membresia).where(Membresia.id == membresia_id))
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    await db.delete(mem)
    await db.commit()
