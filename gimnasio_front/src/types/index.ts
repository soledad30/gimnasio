export interface Usuario {
  id: number
  nombre: string
  email: string
  telefono?: string | null
  activo: boolean
  es_admin: boolean
  rol: string
  created_at: string
}

export interface UsuarioAdmin extends Usuario {
  estudiante_id?: number | null
  instructor_id?: number | null
  rol_efectivo: string
}

export interface ResetPasswordResult {
  mensaje: string
  password_temporal?: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export type UserRol = 'admin' | 'recepcion' | 'instructor' | 'estudiante'

export interface PerfilResponse {
  usuario: Usuario
  rol: UserRol
  estudiante_id?: number | null
  instructor_id?: number | null
}

export interface InstructorPanel {
  instructor_id: number
  nombre: string
  especialidades?: string[]
  rutinas_asignadas: number
  actividades_a_cargo: number
  reservas_activas: number
}

export interface DashboardKpis {
  total_estudiantes: number
  estudiantes_activos: number
  accesos_hoy: number
  membresias_por_vencer: number
  fecha: string
  en_gimnasio_ahora?: number
  alertas_activas?: number
  total_registrados?: number
  ingresos_hoy?: number
  salidas_hoy?: number
  ingresos_mes?: number
}

export interface ReporteAccesos {
  fecha_inicio: string
  fecha_fin: string
  total_escaneos: number
  accesos_concedidos: number
  accesos_denegados: number
  tasa_denegacion_pct: number
}

export interface Estudiante {
  id: number
  usuario_id: number
  nombre: string
  email: string
  telefono?: string | null
  cs?: string | null
  registro_univercotario?: string | null
  carrera?: string | null
  fotourl?: string | null
  fechainicio_membresia?: string | null
  fechafin_membresia?: string | null
  nfc_uid?: string | null
  codigo_acceso?: string | null
  created_at: string
}

export interface Instructor {
  id: number
  usuario_id: number
  nombre: string
  email?: string | null
  telefono?: string | null
  especialidades?: string[]
  fotourl?: string | null
  created_at: string
}

export interface Ejercicio {
  id: number
  nombre: string
  descripcion?: string | null
  grupo_muscular?: string | null
  objetivo?: string | null
  con_maquina: boolean
  maquina_id?: number | null
  maquina_nombre?: string | null
  fotourl?: string | null
  videourl?: string | null
  created_at: string
}

export interface RutinaEjercicioDetalle {
  ejercicio_id: number
  nombre: string
  con_maquina: boolean
  maquina_nombre?: string | null
  grupo_muscular?: string | null
  series?: number | null
  repeticiones?: string | null
}

export interface Actividad {
  id: number
  instructor_id?: number | null
  nombre: string
  descripcion?: string | null
  dia_semana?: string | null
  hora_inicio?: string | null
  hora_fin?: string | null
  capacidad: number
  cupos_ocupados?: number | null
  cupos_disponibles?: number | null
  created_at: string
}

export interface Pago {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  membresia_id?: number | null
  monto: string
  metodo: string
  referencia?: string | null
  fecha: string
  notas?: string | null
  created_at: string
}

export interface Maquina {
  id: number
  instructor_id?: number | null
  codigo?: string | null
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  marca?: string | null
  ubicacion?: string | null
  fotourl?: string | null
  estado_maquina: string
  created_at: string
}

export interface Acceso {
  id: number
  estudiante_id?: number | null
  fecha: string
  hora_entrada?: number | null
  hora_salida?: number | null
  tiempo_permanencia?: string | null
  acceso_concedido: boolean
  motivo_denegacion?: string | null
  created_at: string
  estudiante_nombre?: string | null
  estudiante_carrera?: string | null
  registro_universitario?: string | null
  tipo_movimiento?: 'entrada' | 'salida' | 'denegado' | null
  hora_display?: string | null
}

export interface CodigoAcceso {
  codigo: string
  qr_payload: string
  nombre: string
}

export interface NfcScanResult {
  acceso_concedido: boolean
  estudiante_id?: number | null
  nombre?: string | null
  carrera?: string | null
  registro_universitario?: string | null
  estado_membresia?: string | null
  acceso_id?: number | null
  motivo_denegacion?: string | null
  tipo_movimiento?: 'entrada' | 'salida' | 'denegado' | null
  mensaje: string
}

export interface AccesoMonitorStats {
  en_gimnasio_ahora: number
  ingresos_hoy: number
  salidas_hoy: number
  denegados_hoy: number
  alertas_activas: number
  total_registrados: number
  estudiantes_hoy: number
  ultimo_escaneo?: string | null
  tarjetas_leidas_hoy: number
  errores_hoy: number
  lector_activo: boolean
}

export interface AlertaSeguridad {
  id: number
  mensaje: string
  tipo: string
  hora: string
  detalle?: string | null
}

export interface Notificacion {
  id: number
  estudiante_id: number
  fecha?: string | null
  titulo: string
  mensaje: string
  leida: boolean
  tipo?: string | null
  created_at: string
}

export interface Reserva {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  actividad_id: number
  actividad_nombre?: string | null
  horario?: string | null
  fecha: string
  estado: number
  created_at: string
}

export interface Rutina {
  id: number
  instructor_id?: number | null
  estudiante_id?: number | null
  nombre: string
  objetivo?: string | null
  ejercicios?: RutinaEjercicioDetalle[]
  created_at: string
}

export interface Membresia {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  tipo: string
  precio: string
  duracion: number
  fecha_inicio?: string | null
  fecha_fin?: string | null
  created_at: string
}
