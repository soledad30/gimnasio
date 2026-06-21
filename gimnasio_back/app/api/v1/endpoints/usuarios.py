from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_current_usuario, get_db
from app.schemas.usuario import (
    AdminResetPassword,
    CambiarPassword,
    ResetPasswordResponse,
    UsuarioAdminResponse,
    UsuarioCreate,
    UsuarioUpdate,
)
from app.services.usuario_service import UsuarioService

router = APIRouter()


@router.post("/", response_model=UsuarioAdminResponse, status_code=201)
async def crear_usuario(
    data: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await UsuarioService(db).create_usuario(data)


@router.get("/", response_model=List[UsuarioAdminResponse])
async def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    rol: Optional[str] = Query(None, description="admin | recepcion | instructor | estudiante"),
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await UsuarioService(db).list_admin(skip=skip, limit=limit, rol=rol, activo=activo)


@router.get("/{usuario_id}", response_model=UsuarioAdminResponse)
async def obtener_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    from app.core.roles import is_admin

    if current.id != usuario_id and not is_admin(current):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    service = UsuarioService(db)
    user = await service.get_by_id(usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    est, inst = await service._perfiles_por_usuario([usuario_id])
    return service._to_admin_response(user, est.get(usuario_id), inst.get(usuario_id))


@router.patch("/{usuario_id}", response_model=UsuarioAdminResponse)
async def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await UsuarioService(db).update_usuario(usuario_id, data)


@router.delete("/{usuario_id}", status_code=204)
async def eliminar_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_admin),
):
    if current.id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    if not await UsuarioService(db).delete(usuario_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")


@router.post("/{usuario_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    usuario_id: int,
    data: AdminResetPassword,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    es_temporal = data.generar_temporal and not data.password_nueva
    result = await UsuarioService(db).reset_password_admin(
        usuario_id,
        password_nueva=data.password_nueva,
        generar_temporal=es_temporal,
    )
    mostrar_password = es_temporal and not result.notification.enviado_email
    mensaje = "Contraseña restablecida correctamente"
    if es_temporal and result.notification.enviado_email:
        mensaje = "Contraseña temporal generada y enviada al correo del usuario"
    return ResetPasswordResponse(
        mensaje=mensaje,
        password_temporal=result.password if mostrar_password else None,
        enviado_email=result.notification.enviado_email,
        enviado_sms=result.notification.enviado_sms,
    )


@router.post("/me/cambiar-password", status_code=204)
async def cambiar_password(
    data: CambiarPassword,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    await UsuarioService(db).cambiar_password(current, data.password_actual, data.password_nueva)
