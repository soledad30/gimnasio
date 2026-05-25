from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.instructor import Instructor
from app.models.usuario import Usuario
from app.schemas.instructor import InstructorCreate, InstructorUpdate
from app.core.security import get_password_hash
from app.services.base_service import BaseService


class InstructorService(BaseService[Instructor]):
    def __init__(self, db: AsyncSession):
        super().__init__(Instructor, db)

    async def create_instructor(self, data: InstructorCreate) -> Instructor:
        existing = await self.db.execute(select(Usuario).where(Usuario.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

        usuario = Usuario(
            nombre=data.nombre,
            email=data.email,
            telefono=data.telefono,
            hashed_password=get_password_hash(data.password),
        )
        self.db.add(usuario)
        await self.db.flush()

        instructor = Instructor(
            usuario_id=usuario.id,
            nombre=data.nombre,
            especialidad=data.especialidad,
        )
        self.db.add(instructor)
        await self.db.commit()
        await self.db.refresh(instructor)
        return instructor

    async def update_instructor(self, instructor_id: int, data: InstructorUpdate) -> Instructor:
        instructor = await self.get_by_id(instructor_id)
        if not instructor:
            raise HTTPException(status_code=404, detail="Instructor no encontrado")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(instructor, field, value)
        await self.db.commit()
        await self.db.refresh(instructor)
        return instructor
