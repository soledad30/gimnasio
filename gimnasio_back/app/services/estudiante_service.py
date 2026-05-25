from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.estudiante import Estudiante
from app.models.usuario import Usuario
from app.schemas.estudiante import EstudianteCreate, EstudianteUpdate, AsignarNFC
from app.core.security import get_password_hash
from app.services.base_service import BaseService


class EstudianteService(BaseService[Estudiante]):
    def __init__(self, db: AsyncSession):
        super().__init__(Estudiante, db)

    async def get_by_nfc(self, nfc_uid: str) -> Optional[Estudiante]:
        result = await self.db.execute(select(Estudiante).where(Estudiante.nfc_uid == nfc_uid))
        return result.scalar_one_or_none()

    async def get_by_usuario_id(self, usuario_id: int) -> Optional[Estudiante]:
        result = await self.db.execute(select(Estudiante).where(Estudiante.usuario_id == usuario_id))
        return result.scalar_one_or_none()

    async def create_estudiante(self, data: EstudianteCreate) -> Estudiante:
        # Crear usuario base
        from sqlalchemy import select
        existing = await self.db.execute(select(Usuario).where(Usuario.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

        usuario = Usuario(
            nombre=data.nombre,
            email=data.email,
            telefono=data.telefono,
            hashed_password=get_password_hash(data.password),
            es_admin=False,
        )
        self.db.add(usuario)
        await self.db.flush()

        estudiante = Estudiante(
            usuario_id=usuario.id,
            nombre=data.nombre,
            email=data.email,
            telefono=data.telefono,
            cs=data.cs,
            registro_univercotario=data.registro_univercotario,
            carrera=data.carrera,
            fotourl=data.fotourl,
            fechainicio_membresia=data.fechainicio_membresia,
            fechafin_membresia=data.fechafin_membresia,
        )
        self.db.add(estudiante)
        await self.db.commit()
        await self.db.refresh(estudiante)
        return estudiante

    async def update_estudiante(self, estudiante_id: int, data: EstudianteUpdate) -> Estudiante:
        estudiante = await self.get_by_id(estudiante_id)
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(estudiante, field, value)
        await self.db.commit()
        await self.db.refresh(estudiante)
        return estudiante

    async def asignar_nfc(self, estudiante_id: int, data: AsignarNFC) -> Estudiante:
        existing = await self.get_by_nfc(data.nfc_uid)
        if existing and existing.id != estudiante_id:
            raise HTTPException(status_code=409, detail="Este NFC ya está asignado a otro estudiante")
        estudiante = await self.get_by_id(estudiante_id)
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        estudiante.nfc_uid = data.nfc_uid
        await self.db.commit()
        await self.db.refresh(estudiante)
        return estudiante
