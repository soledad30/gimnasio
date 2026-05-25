from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.schemas.instructor import InstructorCreate, InstructorUpdate, InstructorResponse
from app.services.instructor_service import InstructorService

router = APIRouter()


@router.post("/", response_model=InstructorResponse, status_code=201)
async def crear_instructor(data: InstructorCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await InstructorService(db).create_instructor(data)


@router.get("/", response_model=List[InstructorResponse])
async def listar_instructores(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    return await InstructorService(db).get_all(skip=skip, limit=limit)


@router.get("/{instructor_id}", response_model=InstructorResponse)
async def obtener_instructor(instructor_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    inst = await InstructorService(db).get_by_id(instructor_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
    return inst


@router.patch("/{instructor_id}", response_model=InstructorResponse)
async def actualizar_instructor(instructor_id: int, data: InstructorUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await InstructorService(db).update_instructor(instructor_id, data)


@router.delete("/{instructor_id}", status_code=204)
async def eliminar_instructor(instructor_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if not await InstructorService(db).delete(instructor_id):
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
