from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time, datetime
from decimal import Decimal


# ── Acceso ────────────────────────────────────────────────────────────────────
class NFCScanRequest(BaseModel):
    nfc_uid: str


class AccesoResponse(BaseModel):
    id: int
    estudiante_id: Optional[int]
    fecha: str
    hora_entrada: Optional[int]
    hora_salida: Optional[int]
    tiempo_permanencia: Optional[str]
    acceso_concedido: bool
    motivo_denegacion: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class NFCScanResponse(BaseModel):
    acceso_concedido: bool
    estudiante_id: Optional[int] = None
    nombre: Optional[str] = None
    estado_membresia: Optional[str] = None
    acceso_id: Optional[int] = None
    motivo_denegacion: Optional[str] = None
    mensaje: str


# ── Asistencia ────────────────────────────────────────────────────────────────
class AsistenciaCreate(BaseModel):
    estudiante_id: int
    fecha: date
    horaentrada: Optional[time] = None


class AsistenciaResponse(BaseModel):
    id: int
    estudiante_id: int
    fecha: date
    horaentrada: Optional[time]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Membresia ─────────────────────────────────────────────────────────────────
class MembresiaCreate(BaseModel):
    estudiante_id: int
    tipo: str
    precio: Decimal = Field(..., gt=0)
    duracion: int = Field(..., gt=0, description="Duración en días")


class MembresiaUpdate(BaseModel):
    tipo: Optional[str] = None
    precio: Optional[Decimal] = None
    duracion: Optional[int] = None


class MembresiaResponse(BaseModel):
    id: int
    estudiante_id: int
    tipo: str
    precio: Decimal
    duracion: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Notificacion ──────────────────────────────────────────────────────────────
class NotificacionCreate(BaseModel):
    estudiante_id: int
    titulo: str
    mensaje: str
    tipo: Optional[str] = None
    fecha: Optional[date] = None


class NotificacionResponse(BaseModel):
    id: int
    estudiante_id: int
    fecha: Optional[date]
    titulo: str
    mensaje: str
    leida: bool
    tipo: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Reporte ───────────────────────────────────────────────────────────────────
class ReporteCreate(BaseModel):
    administrador_id: int
    tipo: str
    nombre: str
    fecha: date


class ReporteResponse(BaseModel):
    id: int
    administrador_id: int
    tipo: str
    nombre: str
    fecha: date
    created_at: datetime

    class Config:
        from_attributes = True


# ── Rutina ────────────────────────────────────────────────────────────────────
class RutinaCreate(BaseModel):
    instructor_id: Optional[int] = None
    estudiante_id: Optional[int] = None
    nombre: str
    objetivo: Optional[str] = None


class RutinaUpdate(BaseModel):
    nombre: Optional[str] = None
    objetivo: Optional[str] = None


class RutinaResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    estudiante_id: Optional[int]
    nombre: str
    objetivo: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Actividad ─────────────────────────────────────────────────────────────────
class ActividadCreate(BaseModel):
    instructor_id: Optional[int] = None
    nombre: str
    capacidad: int = 20


class ActividadUpdate(BaseModel):
    nombre: Optional[str] = None
    capacidad: Optional[int] = None
    instructor_id: Optional[int] = None


class ActividadResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    nombre: str
    capacidad: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Maquina ───────────────────────────────────────────────────────────────────
class MaquinaCreate(BaseModel):
    instructor_id: Optional[int] = None
    codigo: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    estado_maquina: str = "disponible"


class MaquinaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    estado_maquina: Optional[str] = None
    instructor_id: Optional[int] = None


class MaquinaResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    codigo: Optional[str]
    nombre: str
    descripcion: Optional[str]
    estado_maquina: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Reserva ───────────────────────────────────────────────────────────────────
class ReservaCreate(BaseModel):
    actividad_id: int
    fecha: date


class ReservaResponse(BaseModel):
    id: int
    estudiante_id: int
    actividad_id: int
    fecha: date
    estado: int
    created_at: datetime

    class Config:
        from_attributes = True
