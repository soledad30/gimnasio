from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import get_password_hash, verify_password
from app.services.base_service import BaseService


class UsuarioService(BaseService[Usuario]):
    def __init__(self, db: AsyncSession):
        super().__init__(Usuario, db)

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        result = await self.db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalar_one_or_none()

    async def create_usuario(self, data: UsuarioCreate) -> Usuario:
        if await self.get_by_email(data.email):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")
        user = Usuario(
            nombre=data.nombre,
            email=data.email,
            telefono=data.telefono,
            hashed_password=get_password_hash(data.password),
            es_admin=data.es_admin,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_usuario(self, user_id: int, data: UsuarioUpdate) -> Usuario:
        user = await self.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> Optional[Usuario]:
        user = await self.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    async def cambiar_password(self, user: Usuario, actual: str, nueva: str) -> bool:
        if not verify_password(actual, user.hashed_password):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        user.hashed_password = get_password_hash(nueva)
        await self.db.commit()
        return True
