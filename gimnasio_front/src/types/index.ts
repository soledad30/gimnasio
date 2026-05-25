export interface Usuario {
  id: number
  nombre: string
  email: string
  telefono?: string | null
  activo: boolean
  es_admin: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface DashboardKpis {
  total_estudiantes: number
  estudiantes_activos: number
  accesos_hoy: number
  membresias_por_vencer: number
  fecha: string
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
  created_at: string
}

export interface Instructor {
  id: number
  usuario_id: number
  nombre: string
  especialidad?: string | null
  created_at: string
}

export interface Actividad {
  id: number
  instructor_id?: number | null
  nombre: string
  capacidad: number
  created_at: string
}

export interface Maquina {
  id: number
  instructor_id?: number | null
  codigo?: string | null
  nombre: string
  descripcion?: string | null
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
}

export interface NfcScanResult {
  acceso_concedido: boolean
  estudiante_id?: number | null
  nombre?: string | null
  estado_membresia?: string | null
  acceso_id?: number | null
  motivo_denegacion?: string | null
  mensaje: string
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
  actividad_id: number
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
  created_at: string
}

export interface Membresia {
  id: number
  estudiante_id: number
  tipo: string
  precio: string
  duracion: number
  created_at: string
}
