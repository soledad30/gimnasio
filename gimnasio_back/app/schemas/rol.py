from typing import List

from pydantic import BaseModel, Field


class PermisoInfo(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    categoria: str


class RolResumen(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    editable: bool
    permisos_activos: int
    permisos_total: int


class RolPermisosDetalle(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    editable: bool
    permisos: List[str]
    catalogo: List[PermisoInfo]


class RolPermisosUpdate(BaseModel):
    permisos: List[str] = Field(..., min_length=0)
