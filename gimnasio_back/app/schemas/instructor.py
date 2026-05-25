from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class InstructorCreate(BaseModel):
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    password: str
    especialidad: Optional[str] = None


class InstructorUpdate(BaseModel):
    nombre: Optional[str] = None
    especialidad: Optional[str] = None
    telefono: Optional[str] = None


class InstructorResponse(BaseModel):
    id: int
    usuario_id: int
    nombre: str
    especialidad: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
