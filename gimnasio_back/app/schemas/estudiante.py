from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import date, datetime


class EstudianteCreate(BaseModel):
    # Datos del Usuario base
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    password: str

    # Datos específicos del Estudiante
    cs: Optional[str] = None
    registro_univercotario: Optional[str] = None
    carrera: Optional[str] = None
    fotourl: Optional[str] = None
    fechainicio_membresia: Optional[date] = None
    fechafin_membresia: Optional[date] = None


class EstudianteUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    cs: Optional[str] = None
    registro_univercotario: Optional[str] = None
    carrera: Optional[str] = None
    fotourl: Optional[str] = None
    fechainicio_membresia: Optional[date] = None
    fechafin_membresia: Optional[date] = None
    nfc_uid: Optional[str] = None


class EstudianteResponse(BaseModel):
    id: int
    usuario_id: int
    nombre: str
    email: str
    telefono: Optional[str]
    cs: Optional[str]
    registro_univercotario: Optional[str]
    carrera: Optional[str]
    fotourl: Optional[str]
    fechainicio_membresia: Optional[date]
    fechafin_membresia: Optional[date]
    nfc_uid: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AsignarNFC(BaseModel):
    nfc_uid: str = Field(..., min_length=4, max_length=64)

from pydantic import Field
