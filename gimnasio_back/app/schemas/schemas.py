from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, time, datetime
from decimal import Decimal


# ── Acceso ────────────────────────────────────────────────────────────────────
class NFCScanRequest(BaseModel):
    nfc_uid: str


class AccesoManualRequest(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=100)


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
    estudiante_nombre: Optional[str] = None
    estudiante_carrera: Optional[str] = None
    registro_universitario: Optional[str] = None
    tipo_movimiento: Optional[str] = None
    hora_display: Optional[str] = None

    class Config:
        from_attributes = True


class CodigoAccesoResponse(BaseModel):
    codigo: str
    qr_payload: str
    nombre: str


class NFCScanResponse(BaseModel):
    acceso_concedido: bool
    estudiante_id: Optional[int] = None
    nombre: Optional[str] = None
    carrera: Optional[str] = None
    registro_universitario: Optional[str] = None
    estado_membresia: Optional[str] = None
    acceso_id: Optional[int] = None
    motivo_denegacion: Optional[str] = None
    tipo_movimiento: Optional[str] = None
    mensaje: str


class AccesoMonitorStats(BaseModel):
    en_gimnasio_ahora: int
    ingresos_hoy: int
    salidas_hoy: int
    denegados_hoy: int
    alertas_activas: int
    total_registrados: int
    estudiantes_hoy: int
    ultimo_escaneo: Optional[str] = None
    tarjetas_leidas_hoy: int
    errores_hoy: int
    lector_activo: bool = True


class AlertaSeguridad(BaseModel):
    id: int
    mensaje: str
    tipo: str
    hora: str
    detalle: Optional[str] = None


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
    estudiante_nombre: Optional[str] = None
    tipo: str
    precio: Decimal
    duracion: int
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
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


# ── Ejercicio ─────────────────────────────────────────────────────────────────
class EjercicioCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    grupo_muscular: Optional[str] = None
    objetivo: Optional[str] = None
    con_maquina: bool = False
    maquina_id: Optional[int] = None
    fotourl: Optional[str] = None
    videourl: Optional[str] = None


class EjercicioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    grupo_muscular: Optional[str] = None
    objetivo: Optional[str] = None
    con_maquina: Optional[bool] = None
    maquina_id: Optional[int] = None
    fotourl: Optional[str] = None
    videourl: Optional[str] = None


class EjercicioResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    grupo_muscular: Optional[str]
    objetivo: Optional[str]
    con_maquina: bool
    maquina_id: Optional[int]
    maquina_nombre: Optional[str] = None
    fotourl: Optional[str] = None
    videourl: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Rutina ────────────────────────────────────────────────────────────────────
class RutinaEjercicioItem(BaseModel):
    ejercicio_id: int
    series: Optional[int] = None
    repeticiones: Optional[str] = None


class RutinaEjercicioDetalle(BaseModel):
    ejercicio_id: int
    nombre: str
    con_maquina: bool
    maquina_nombre: Optional[str] = None
    grupo_muscular: Optional[str] = None
    series: Optional[int] = None
    repeticiones: Optional[str] = None


class RutinaCreate(BaseModel):
    instructor_id: Optional[int] = None
    estudiante_id: Optional[int] = None
    nombre: str
    objetivo: Optional[str] = None
    ejercicios: List["RutinaEjercicioItem"] = []


class RutinaUpdate(BaseModel):
    nombre: Optional[str] = None
    objetivo: Optional[str] = None
    estudiante_id: Optional[int] = None
    instructor_id: Optional[int] = None
    ejercicios: Optional[List[RutinaEjercicioItem]] = None


class RutinaResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    estudiante_id: Optional[int]
    nombre: str
    objetivo: Optional[str]
    ejercicios: List[RutinaEjercicioDetalle] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ── Pago ──────────────────────────────────────────────────────────────────────
class PagoCreate(BaseModel):
    estudiante_id: int
    membresia_id: Optional[int] = None
    monto: Decimal = Field(..., gt=0)
    metodo: str = "efectivo"
    referencia: Optional[str] = None
    fecha: Optional[date] = None
    notas: Optional[str] = None


class PagoResponse(BaseModel):
    id: int
    estudiante_id: int
    estudiante_nombre: Optional[str] = None
    membresia_id: Optional[int]
    monto: Decimal
    metodo: str
    referencia: Optional[str]
    fecha: date
    notas: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Actividad ─────────────────────────────────────────────────────────────────
class ActividadCreate(BaseModel):
    instructor_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    dia_semana: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    capacidad: int = 20


class ActividadUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    dia_semana: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    capacidad: Optional[int] = None
    instructor_id: Optional[int] = None


class ActividadResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    nombre: str
    descripcion: Optional[str]
    dia_semana: Optional[str]
    hora_inicio: Optional[str]
    hora_fin: Optional[str]
    capacidad: int
    cupos_ocupados: Optional[int] = None
    cupos_disponibles: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Maquina ───────────────────────────────────────────────────────────────────
class MaquinaCreate(BaseModel):
    instructor_id: Optional[int] = None
    codigo: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    ubicacion: Optional[str] = None
    fotourl: Optional[str] = None
    estado_maquina: str = "disponible"


class MaquinaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    ubicacion: Optional[str] = None
    fotourl: Optional[str] = None
    estado_maquina: Optional[str] = None
    instructor_id: Optional[int] = None
    codigo: Optional[str] = None


class MaquinaResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    codigo: Optional[str]
    nombre: str
    descripcion: Optional[str]
    categoria: Optional[str] = None
    marca: Optional[str] = None
    ubicacion: Optional[str] = None
    fotourl: Optional[str]
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
    estudiante_nombre: Optional[str] = None
    actividad_id: int
    actividad_nombre: Optional[str] = None
    horario: Optional[str] = None
    fecha: date
    estado: int
    created_at: datetime

    class Config:
        from_attributes = True
