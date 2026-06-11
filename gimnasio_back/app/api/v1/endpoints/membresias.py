from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_admin, get_current_estudiante, get_current_staff, get_current_usuario, get_db
from app.models.membresia import Membresia
from app.schemas.schemas import MembresiaCreate, MembresiaResponse, MembresiaUpdate
from app.services.membresia_service import MembresiaService, to_membresia_response

router = APIRouter()


@router.post("/", response_model=MembresiaResponse, status_code=201)
async def crear_membresia(
    data: MembresiaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    mem = await MembresiaService(db).crear(data)
    return to_membresia_response(mem)


@router.get("/", response_model=List[MembresiaResponse])
async def listar_membresias(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    items = await MembresiaService(db).list_all(skip=skip, limit=limit)
    return [to_membresia_response(m) for m in items]


@router.get("/mi-membresia", response_model=MembresiaResponse)
async def mi_membresia(
    estudiante=Depends(get_current_estudiante),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Membresia)
        .options(selectinload(Membresia.estudiante))
        .where(Membresia.estudiante_id == estudiante.id)
    )
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="No tienes membresía activa")
    return to_membresia_response(mem)


@router.get("/estudiante/{estudiante_id}", response_model=MembresiaResponse)
async def membresia_estudiante(
    estudiante_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(
        select(Membresia)
        .options(selectinload(Membresia.estudiante))
        .where(Membresia.estudiante_id == estudiante_id)
    )
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    return to_membresia_response(mem)


@router.patch("/{membresia_id}", response_model=MembresiaResponse)
async def actualizar_membresia(
    membresia_id: int,
    data: MembresiaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    mem = await MembresiaService(db).renovar(membresia_id, data)
    return to_membresia_response(mem)


@router.delete("/{membresia_id}", status_code=204)
async def eliminar_membresia(
    membresia_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(select(Membresia).where(Membresia.id == membresia_id))
    mem = result.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    await db.delete(mem)
    await db.commit()
