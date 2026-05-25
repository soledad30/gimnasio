from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_usuario(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.services.usuario_service import UsuarioService
    payload = decode_token(token)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = await UsuarioService(db).get_by_id(int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return user


async def get_current_admin(current_user=Depends(get_current_usuario)):
    if not current_user.es_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requieren permisos de administrador")
    return current_user


async def get_current_instructor(current_user=Depends(get_current_usuario)):
    # Instructors and admins pass
    from app.models.usuario import Usuario
    return current_user
