import json
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.especialidades import ESPECIALIDADES_COACH
from app.core.security import get_password_hash
from app.models.instructor import Instructor
from app.models.usuario import Usuario
from app.schemas.instructor import InstructorCreate, InstructorResponse, InstructorUpdate
from app.services.base_service import BaseService

_ALIASES = {"ginmasia": "Gimnasia", "gimnacia": "Gimnasia"}


def _normalize_catalog(name: str) -> str:
    key = name.strip().lower()
    if key in _ALIASES:
        return _ALIASES[key]
    for item in ESPECIALIDADES_COACH:
        if item.lower() == key:
            return item
    return name.strip()


def parse_especialidades(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    text = raw.strip()
    if text.startswith("["):
        try:
            data = json.loads(text)
            if isinstance(data, list):
                return [_normalize_catalog(str(x)) for x in data if str(x).strip()]
        except json.JSONDecodeError:
            pass
    return [_normalize_catalog(text)]


def encode_especialidades(items: Optional[list[str]]) -> Optional[str]:
    if not items:
        return None
    cleaned = list(dict.fromkeys(x.strip() for x in items if x and x.strip()))
    return json.dumps(cleaned, ensure_ascii=False) if cleaned else None


def to_instructor_response(instructor: Instructor) -> InstructorResponse:
    usuario = instructor.usuario
    return InstructorResponse(
        id=instructor.id,
        usuario_id=instructor.usuario_id,
        nombre=instructor.nombre,
        email=usuario.email if usuario else None,
        telefono=usuario.telefono if usuario else None,
        especialidades=parse_especialidades(instructor.especialidad),
        fotourl=instructor.fotourl,
        created_at=instructor.created_at,
    )


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
            rol="instructor",
        )
        self.db.add(usuario)
        await self.db.flush()

        instructor = Instructor(
            usuario_id=usuario.id,
            nombre=data.nombre,
            especialidad=encode_especialidades(data.especialidades),
            fotourl=data.fotourl,
        )
        self.db.add(instructor)
        await self.db.commit()
        await self.db.refresh(instructor)
        return instructor

    async def get_loaded(self, instructor_id: int) -> Optional[Instructor]:
        result = await self.db.execute(
            select(Instructor)
            .options(selectinload(Instructor.usuario))
            .where(Instructor.id == instructor_id)
        )
        return result.scalar_one_or_none()

    async def get_all_loaded(self, skip: int = 0, limit: int = 100) -> list[Instructor]:
        result = await self.db.execute(
            select(Instructor)
            .options(selectinload(Instructor.usuario))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_instructor(self, instructor_id: int, data: InstructorUpdate) -> Instructor:
        instructor = await self.get_loaded(instructor_id)
        if not instructor:
            raise HTTPException(status_code=404, detail="Instructor no encontrado")
        updates = data.model_dump(exclude_none=True)
        if "nombre" in updates:
            instructor.nombre = updates.pop("nombre")
            instructor.usuario.nombre = instructor.nombre
        if "telefono" in updates:
            instructor.usuario.telefono = updates.pop("telefono")
        if "especialidades" in updates:
            instructor.especialidad = encode_especialidades(updates.pop("especialidades"))
        for field, value in updates.items():
            setattr(instructor, field, value)
        await self.db.commit()
        return await self.get_loaded(instructor_id)
