from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin, get_current_usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse, CambiarPassword
from app.services.usuario_service import UsuarioService

router = APIRouter()


@router.post("/", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await UsuarioService(db).create_usuario(data)


@router.get("/", response_model=List[UsuarioResponse])
async def listar_usuarios(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await UsuarioService(db).get_all(skip=skip, limit=limit)


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(usuario_id: int, db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    if current.id != usuario_id and not current.es_admin:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    user = await UsuarioService(db).get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(usuario_id: int, data: UsuarioUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    return await UsuarioService(db).update_usuario(usuario_id, data)


@router.delete("/{usuario_id}", status_code=204)
async def eliminar_usuario(usuario_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if not await UsuarioService(db).delete(usuario_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")


@router.post("/me/cambiar-password", status_code=204)
async def cambiar_password(data: CambiarPassword, db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    await UsuarioService(db).cambiar_password(current, data.password_actual, data.password_nueva)
