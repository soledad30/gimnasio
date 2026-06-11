from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.usuario import UsuarioResponse


class RegisterRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    telefono: Optional[str] = Field(None, max_length=20)
    registro_univercotario: Optional[str] = Field(None, max_length=100)
    carrera: Optional[str] = Field(None, max_length=150)


class PerfilResponse(BaseModel):
    usuario: UsuarioResponse
    rol: str
    estudiante_id: Optional[int] = None
    instructor_id: Optional[int] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str
