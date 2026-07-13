from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.core.dependencies import get_db, get_current_admin, get_current_estudiante, get_current_staff, get_current_usuario
from app.core.roles import is_staff
from app.models.instructor import Instructor
from app.schemas.estudiante import EstudianteCreate, EstudianteUpdate, EstudianteResponse, AsignarNFC
from app.services.estudiante_service import EstudianteService

router = APIRouter()


@router.get("/mi-perfil", response_model=EstudianteResponse)
async def mi_perfil(estudiante=Depends(get_current_estudiante)):
    return estudiante


@router.post("/", response_model=EstudianteResponse, status_code=201)
async def crear_estudiante(data: EstudianteCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    return await EstudianteService(db).create_estudiante(data)


@router.get("/", response_model=List[EstudianteResponse])
async def listar_estudiantes(
    skip: int = 0,
    limit: int = 500,
    q: Optional[str] = Query(
        None, description="Buscar por registro, nombre, cédula/CS, email o teléfono"
    ),
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    if not is_staff(current):
        inst = await db.execute(select(Instructor).where(Instructor.usuario_id == current.id))
        if not inst.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="No autorizado")
    return await EstudianteService(db).list_estudiantes(skip=skip, limit=limit, q=q)


@router.get("/{estudiante_id}", response_model=EstudianteResponse)
async def obtener_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_usuario)):
    est = await EstudianteService(db).get_by_id(estudiante_id)
    if not est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return est


@router.patch("/{estudiante_id}", response_model=EstudianteResponse)
async def actualizar_estudiante(estudiante_id: int, data: EstudianteUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    return await EstudianteService(db).update_estudiante(estudiante_id, data)


@router.delete("/{estudiante_id}", status_code=204)
async def eliminar_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if not await EstudianteService(db).delete(estudiante_id):
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")


@router.post("/{estudiante_id}/nfc", response_model=EstudianteResponse)
async def asignar_nfc(estudiante_id: int, data: AsignarNFC, db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    """Asigna o actualiza el UID NFC de un estudiante."""
    return await EstudianteService(db).asignar_nfc(estudiante_id, data)
