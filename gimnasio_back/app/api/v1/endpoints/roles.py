from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.schemas.rol import RolPermisosDetalle, RolPermisosUpdate, RolResumen
from app.services.rol_service import RolService

router = APIRouter()


@router.get("/", response_model=List[RolResumen])
async def listar_roles(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await RolService(db).list_roles()


@router.get("/{rol}", response_model=RolPermisosDetalle)
async def obtener_permisos_rol(
    rol: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await RolService(db).get_rol_permisos(rol)


@router.put("/{rol}/permisos", response_model=RolPermisosDetalle)
async def actualizar_permisos_rol(
    rol: str,
    data: RolPermisosUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await RolService(db).update_rol_permisos(rol, data)
