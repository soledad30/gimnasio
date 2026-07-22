from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BitacoraEntry(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    usuario_email: Optional[str] = None
    usuario_rol: Optional[str] = None
    accion: str
    modulo: str
    metodo: str
    ruta: str
    status_code: Optional[int] = None
    ip: Optional[str] = None
    detalle: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BitacoraListResponse(BaseModel):
    total: int
    items: list[BitacoraEntry]
