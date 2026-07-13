from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date, time, datetime
from decimal import Decimal


# ── Acceso ────────────────────────────────────────────────────────────────────
class NFCScanRequest(BaseModel):
    nfc_uid: str
    modo: str = Field(
        "auto",
        description="auto = alterna entrada/salida | entrada | salida",
    )

    @field_validator("modo")
    @classmethod
    def validar_modo_acceso(cls, v: str) -> str:
        m = (v or "auto").strip().lower()
        if m not in ("auto", "entrada", "salida"):
            raise ValueError("modo debe ser auto, entrada o salida")
        return m


class AccesoManualRequest(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=100)
    modo: str = Field(
        "auto",
        description="auto = alterna entrada/salida | entrada | salida",
    )

    @field_validator("modo")
    @classmethod
    def validar_modo_acceso(cls, v: str) -> str:
        m = (v or "auto").strip().lower()
        if m not in ("auto", "entrada", "salida"):
            raise ValueError("modo debe ser auto, entrada o salida")
        return m


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
    fecha_inicio: Optional[date] = Field(
        None,
        description="Desde qué fecha registra el admin el pago/vigencia (solo admin). Por defecto: hoy.",
    )


class MembresiaUpdate(BaseModel):
    tipo: Optional[str] = None
    precio: Optional[Decimal] = None
    duracion: Optional[int] = None
    fecha_inicio: Optional[date] = Field(
        None,
        description="Desde qué fecha aplica la renovación (solo admin).",
    )


class MembresiaResponse(BaseModel):
    id: int
    estudiante_id: int
    estudiante_nombre: Optional[str] = None
    registro_universitario: Optional[str] = None
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


class NotificacionMasivaCreate(BaseModel):
    """
    alcance:
      - estudiante: un alumno (requiere estudiante_id)
      - todos_estudiantes: todos los estudiantes
      - recepcion | instructor | admin: usuarios con ese rol
      - todos: estudiantes + recepción + instructores + admins
    """
    alcance: str
    titulo: str
    mensaje: str
    tipo: Optional[str] = "aviso"
    estudiante_id: Optional[int] = None
    fecha: Optional[date] = None


class NotificacionMasivaResult(BaseModel):
    creadas: int
    alcance: str
    destinatarios: int


class NotificacionResponse(BaseModel):
    id: int
    estudiante_id: Optional[int] = None
    usuario_id: Optional[int] = None
    destinatario: Optional[str] = None
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
    descripcion: Optional[str] = None
    con_maquina: bool
    maquina_id: Optional[int] = None
    maquina_nombre: Optional[str] = None
    maquina_codigo: Optional[str] = None
    maquina_ubicacion: Optional[str] = None
    maquina_descripcion: Optional[str] = None
    maquina_fotourl: Optional[str] = None
    fotourl: Optional[str] = None
    videourl: Optional[str] = None
    grupo_muscular: Optional[str] = None
    series: Optional[int] = None
    repeticiones: Optional[str] = None


class RutinaCreate(BaseModel):
    nombre: str
    objetivo: str
    ejercicios: List["RutinaEjercicioItem"] = []


class RutinaUpdate(BaseModel):
    nombre: Optional[str] = None
    objetivo: Optional[str] = None
    ejercicios: Optional[List[RutinaEjercicioItem]] = None


class RutinaAsignarCreate(BaseModel):
    estudiante_id: int
    notas_asignacion: Optional[str] = None


class RutinaResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    instructor_nombre: Optional[str] = None
    estudiante_id: Optional[int]
    estudiante_nombre: Optional[str] = None
    plantilla_id: Optional[int] = None
    es_plantilla: bool = False
    nombre: str
    objetivo: Optional[str]
    notas_asignacion: Optional[str] = None
    ejercicios: List[RutinaEjercicioDetalle] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ── Pago ──────────────────────────────────────────────────────────────────────
class PagoCreate(BaseModel):
    estudiante_id: int
    membresia_id: Optional[int] = None
    inscripcion_id: Optional[int] = None
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
    inscripcion_id: Optional[int] = None
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
    sala_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    dia_semana: Optional[str] = None
    dias_semana: Optional[List[str]] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    capacidad: int = 20
    vigencia_tipo: str = "mes"
    vigencia_inicio: Optional[date] = None


class ActividadUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    dia_semana: Optional[str] = None
    dias_semana: Optional[List[str]] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    capacidad: Optional[int] = None
    instructor_id: Optional[int] = None
    sala_id: Optional[int] = None
    vigencia_tipo: Optional[str] = None
    vigencia_inicio: Optional[date] = None


class ActividadResponse(BaseModel):
    id: int
    instructor_id: Optional[int]
    instructor_nombre: Optional[str] = None
    sala_id: Optional[int] = None
    sala_nombre: Optional[str] = None
    nombre: str
    descripcion: Optional[str]
    dia_semana: Optional[str]
    dias_semana: List[str] = []
    hora_inicio: Optional[str]
    hora_fin: Optional[str]
    capacidad: int
    vigencia_tipo: str = "mes"
    vigencia_inicio: Optional[date] = None
    vigencia_fin: Optional[date] = None
    vigencia_label: Optional[str] = None
    cupos_ocupados: Optional[int] = None
    cupos_disponibles: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Maquina ───────────────────────────────────────────────────────────────────
class MaquinaCreate(BaseModel):
    instructor_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    ubicacion: Optional[str] = None
    fotourl: Optional[str] = None
    estado_maquina: str = "disponible"
    anios_vida_util: int = Field(..., ge=1, le=50, description="Años de vida útil estimados")
    fecha_adquisicion: Optional[date] = None


class MaquinaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    ubicacion: Optional[str] = None
    fotourl: Optional[str] = None
    estado_maquina: Optional[str] = None
    instructor_id: Optional[int] = None
    anios_vida_util: Optional[int] = Field(None, ge=1, le=50)


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
    anios_vida_util: Optional[int] = None
    fecha_adquisicion: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MantenimientoChecklistItem(BaseModel):
    id: str
    texto: str
    completado: bool = False


class MantenimientoChecklistSeccion(BaseModel):
    titulo: str
    items: List[MantenimientoChecklistItem]


class MantenimientoPlantillaResponse(BaseModel):
    tipos: List[dict]
    secciones: List[MantenimientoChecklistSeccion]


class MantenimientoMaquinaCreate(BaseModel):
    tipo: str = "preventivo"
    responsable: Optional[str] = None
    observaciones: Optional[str] = None
    checklist: List[MantenimientoChecklistSeccion]
    fecha_realizado: date
    proximo_mantenimiento: Optional[date] = None
    resultado: str = "ok"
    marcar_disponible: bool = True


class MantenimientoMaquinaResponse(BaseModel):
    id: int
    maquina_id: int
    maquina_codigo: Optional[str] = None
    maquina_nombre: Optional[str] = None
    tipo: str
    responsable: Optional[str] = None
    observaciones: Optional[str] = None
    checklist: List[dict]
    fecha_realizado: date
    proximo_mantenimiento: Optional[date] = None
    resultado: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Inscripción mensual ───────────────────────────────────────────────────────
class InscripcionCreate(BaseModel):
    tipo: str  # actividad | sala_maquinas
    actividad_id: Optional[int] = None
    mes_inicio: Optional[date] = None


class InscripcionAdminCreate(BaseModel):
    estudiante_id: int
    tipo: str
    actividad_id: Optional[int] = None
    mes_inicio: date


class InscripcionConfirmarPago(BaseModel):
    metodo: str = "efectivo"
    referencia: Optional[str] = None
    notas: Optional[str] = None


class InscripcionReportarPago(BaseModel):
    """Estudiante: auto confirma la inscripción, o solo avisa a recepción."""

    modo: str = Field(
        ...,
        description="auto = confirmar pago automáticamente | notificar = avisar a recepción",
    )
    metodo: str = "qr"
    referencia_comprobante: Optional[str] = Field(None, max_length=120)
    notas: Optional[str] = Field(None, max_length=500)

    @field_validator("modo")
    @classmethod
    def validar_modo(cls, v: str) -> str:
        m = (v or "").strip().lower()
        if m not in ("auto", "notificar"):
            raise ValueError("modo debe ser 'auto' o 'notificar'")
        return m

    @field_validator("metodo")
    @classmethod
    def validar_metodo(cls, v: str) -> str:
        m = (v or "qr").strip().lower()
        if m not in ("qr", "transferencia", "efectivo", "tarjeta"):
            raise ValueError("método de pago inválido")
        return m


class InscripcionResponse(BaseModel):
    id: int
    estudiante_id: int
    estudiante_nombre: Optional[str] = None
    tipo: str
    actividad_id: Optional[int] = None
    actividad_nombre: Optional[str] = None
    mes_inicio: date
    mes_label: Optional[str] = None
    monto: Decimal
    referencia_pago: str
    qr_pago: str
    qr_cobro: Optional[str] = None
    usa_qr_simple: bool = False
    estado: int
    estado_label: Optional[str] = None
    pago_id: Optional[int] = None
    pago_expira_en: Optional[datetime] = None
    qr_vigente: bool = True
    pago_reportado: bool = False
    pago_reportado_en: Optional[datetime] = None
    pago_reportado_metodo: Optional[str] = None
    pago_reportado_comprobante: Optional[str] = None
    pago_reportado_notas: Optional[str] = None
    creado_por_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class VentanaInscripcionResponse(BaseModel):
    hoy: str
    mes_objetivo: str
    ventana_inicio: str
    ventana_fin: str
    ventana_abierta: bool
    dias_ventana: int
    precio_actividad: str
    precio_sala_maquinas: str


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


# ── Sala ──────────────────────────────────────────────────────────────────────
class SalaResponse(BaseModel):
    id: int
    nombre: str
    tipo: str
    capacidad: int
    activa: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Horarios / asignaciones ───────────────────────────────────────────────────
class ConfigGymResponse(BaseModel):
    hora_apertura: str
    hora_cierre: str
    bloques: List[str]
    turnos_coach: List[dict]
    capacidad_actividad: int
    capacidad_maquinas: int
    min_coaches_manana: int
    min_coaches_tarde: int
    min_entrenadores_actividad: int


class AsignacionInstructorCreate(BaseModel):
    instructor_id: int
    sala_id: int
    turno: str  # manana | tarde
    tipo: str = "coach_maquinas"
    vigencia_tipo: str = "mes"
    vigencia_inicio: Optional[date] = None
    fecha: Optional[date] = None  # compatibilidad: se usa como vigencia_inicio si no hay otra


class AsignacionInstructorResponse(BaseModel):
    id: int
    instructor_id: int
    instructor_nombre: Optional[str] = None
    sala_id: int
    sala_nombre: Optional[str] = None
    fecha: Optional[date] = None
    turno: Optional[str] = None
    hora_inicio: str
    hora_fin: str
    tipo: str
    vigencia_tipo: str = "mes"
    vigencia_inicio: Optional[date] = None
    vigencia_fin: Optional[date] = None
    vigencia_label: Optional[str] = None
    actividad_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DisponibilidadBloque(BaseModel):
    fecha: str
    dia_semana: Optional[str] = None
    hora_inicio: str
    hora_fin: str
    sala_id: int
    sala_nombre: str
    sala_tipo: str
    capacidad: int
    disponible: bool
    motivo_ocupacion: Optional[str] = None


class DisponibilidadSemanalCelda(BaseModel):
    dia_semana: str
    hora_inicio: str
    hora_fin: str
    sala_id: int
    sala_nombre: str
    disponible: bool
    motivo_ocupacion: Optional[str] = None
    actividad_nombre: Optional[str] = None


class DisponibilidadSemanalSala(BaseModel):
    id: int
    nombre: str
    etiqueta: str


class DisponibilidadSemanalResponse(BaseModel):
    referencia: Optional[str] = None
    dias: List[str]
    bloques: List[str]
    salas: List[DisponibilidadSemanalSala]
    celdas: List[DisponibilidadSemanalCelda]


class StaffingResumen(BaseModel):
    fecha: str
    coaches_manana: int
    coaches_tarde: int
    coaches_manana_requeridos: int
    coaches_tarde_requeridos: int
    entrenadores_actividad: int
    entrenadores_actividad_requeridos: int
    actividades_programadas: int
    alertas: List[str]
    staffing_ok: bool


class InstructorOcupacion(BaseModel):
    instructor_id: int
    instructor_nombre: str
    fecha: str
    bloques_ocupados: List[dict]
    bloques_libres: List[str]
