from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

RolLiteral = Literal["admin", "recepcion", "instructor", "estudiante"]


class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    telefono: Optional[str] = None
    password: str = Field(..., min_length=8)
    es_admin: bool = False
    rol: RolLiteral = "recepcion"


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None
    rol: Optional[RolLiteral] = None


class UsuarioMeUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    telefono: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: Optional[str]
    activo: bool
    es_admin: bool
    rol: str
    created_at: datetime

    class Config:
        from_attributes = True


class UsuarioAdminResponse(UsuarioResponse):
    estudiante_id: Optional[int] = None
    instructor_id: Optional[int] = None
    rol_efectivo: str


class CambiarPassword(BaseModel):
    password_actual: str
    password_nueva: str = Field(..., min_length=8)


class AdminResetPassword(BaseModel):
    password_nueva: Optional[str] = Field(None, min_length=8)
    generar_temporal: bool = True


class ResetPasswordResponse(BaseModel):
    mensaje: str
    password_temporal: Optional[str] = None
    enviado_email: bool = False
    enviado_sms: bool = False
