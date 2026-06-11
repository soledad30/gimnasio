from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_admin, get_current_usuario, get_db
from app.models.ejercicio import Ejercicio
from app.schemas.schemas import EjercicioCreate, EjercicioResponse, EjercicioUpdate

router = APIRouter()


def to_ejercicio_response(ej: Ejercicio) -> EjercicioResponse:
    return EjercicioResponse(
        id=ej.id,
        nombre=ej.nombre,
        descripcion=ej.descripcion,
        grupo_muscular=ej.grupo_muscular,
        objetivo=ej.objetivo,
        con_maquina=ej.con_maquina,
        maquina_id=ej.maquina_id,
        maquina_nombre=ej.maquina.nombre if ej.maquina else None,
        fotourl=ej.fotourl,
        videourl=ej.videourl,
        created_at=ej.created_at,
    )


@router.post("/upload-foto")
async def subir_foto_ejercicio(
    file: UploadFile = File(...),
    _=Depends(get_current_admin),
):
    fotourl = await save_image_upload(file, "ejercicios")
    return {"fotourl": fotourl}


@router.post("/", response_model=EjercicioResponse, status_code=201)
async def crear_ejercicio(
    data: EjercicioCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    obj = Ejercicio(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    result = await db.execute(
        select(Ejercicio).options(selectinload(Ejercicio.maquina)).where(Ejercicio.id == obj.id)
    )
    return to_ejercicio_response(result.scalar_one())


@router.get("/", response_model=List[EjercicioResponse])
async def listar_ejercicios(
    objetivo: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    query = select(Ejercicio).options(selectinload(Ejercicio.maquina))
    if objetivo:
        query = query.where(
            (Ejercicio.objetivo == objetivo) | (Ejercicio.objetivo.is_(None)) | (Ejercicio.objetivo == "general")
        )
    result = await db.execute(query.offset(skip).limit(limit))
    return [to_ejercicio_response(e) for e in result.scalars().all()]


@router.get("/{ejercicio_id}", response_model=EjercicioResponse)
async def obtener_ejercicio(
    ejercicio_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(
        select(Ejercicio).options(selectinload(Ejercicio.maquina)).where(Ejercicio.id == ejercicio_id)
    )
    ej = result.scalar_one_or_none()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    return to_ejercicio_response(ej)


@router.patch("/{ejercicio_id}", response_model=EjercicioResponse)
async def actualizar_ejercicio(
    ejercicio_id: int,
    data: EjercicioUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(Ejercicio).options(selectinload(Ejercicio.maquina)).where(Ejercicio.id == ejercicio_id)
    )
    ej = result.scalar_one_or_none()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ej, field, value)
    await db.commit()
    await db.refresh(ej)
    return to_ejercicio_response(ej)


@router.delete("/{ejercicio_id}", status_code=204)
async def eliminar_ejercicio(
    ejercicio_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(select(Ejercicio).where(Ejercicio.id == ejercicio_id))
    ej = result.scalar_one_or_none()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    await db.delete(ej)
    await db.commit()
