from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    telefono: Optional[str] = None
    password: str = Field(..., min_length=8)
    es_admin: bool = False


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: Optional[str]
    activo: bool
    es_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CambiarPassword(BaseModel):
    password_actual: str
    password_nueva: str = Field(..., min_length=8)
