import { api } from './client'
import type {
  Acceso,
  AccesoMonitorStats,
  AlertaSeguridad,
  CodigoAcceso,
  Actividad,
  AsignacionInstructor,
  ConfigGym,
  DashboardKpis,
  DisponibilidadBloque,
  DisponibilidadSemanal,
  Ejercicio,
  Estudiante,
  Inscripcion,
  Instructor,
  InstructorPanel,
  Maquina,
  MantenimientoMaquina,
  MantenimientoPlantilla,
  Membresia,
  Pago,
  NfcScanResult,
  Notificacion,
  PerfilResponse,
  ReporteAccesos,
  Reserva,
  Rutina,
  Sala,
  StaffingResumen,
  TokenResponse,
  ResetPasswordResult,
  Usuario,
  UsuarioAdmin,
  VentanaInscripcion,
} from '../types'

export interface RegisterData {
  nombre: string
  email: string
  password: string
  telefono?: string
  registro_univercotario?: string
  carrera?: string
}

export const authApi = {
  login: (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password })
    return api.post<TokenResponse>('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  register: (data: RegisterData) => api.post<TokenResponse>('/auth/register', data),
  me: () => api.get<Usuario>('/auth/me'),
  perfil: () => api.get<PerfilResponse>('/auth/perfil'),
  forgotPassword: (data: { email?: string; telefono?: string }) =>
    api.post<{ mensaje: string }>('/auth/forgot-password', data),
}

export const reportesApi = {
  dashboard: () => api.get<DashboardKpis>('/reportes/dashboard'),
  accesos: (fecha_inicio: string, fecha_fin: string) =>
    api.get<ReporteAccesos>('/reportes/accesos', { params: { fecha_inicio, fecha_fin } }),
  exportCsv: (
    tipo: 'accesos' | 'pagos' | 'membresias' | 'estudiantes',
    params?: { fecha_inicio?: string; fecha_fin?: string }
  ) =>
    api.get(`/reportes/export/${tipo}`, {
      params,
      responseType: 'blob',
    }),
}

export const estudiantesApi = {
  list: () => api.get<Estudiante[]>('/estudiantes/'),
  miPerfil: () => api.get<Estudiante>('/estudiantes/mi-perfil'),
  get: (id: number) => api.get<Estudiante>(`/estudiantes/${id}`),
  create: (data: Record<string, unknown>) => api.post<Estudiante>('/estudiantes/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Estudiante>(`/estudiantes/${id}`, data),
  delete: (id: number) => api.delete(`/estudiantes/${id}`),
  assignNfc: (id: number, nfc_uid: string) =>
    api.post<Estudiante>(`/estudiantes/${id}/nfc`, { nfc_uid }),
}

export const instructoresApi = {
  catalogoEspecialidades: () => api.get<string[]>('/instructores/especialidades/catalogo'),
  list: () => api.get<Instructor[]>('/instructores/'),
  get: (id: number) => api.get<Instructor>(`/instructores/${id}`),
  miPerfil: () => api.get<Instructor>('/instructores/mi-perfil'),
  miPanel: () => api.get<InstructorPanel>('/instructores/mi-panel'),
  create: (data: Record<string, unknown>) => api.post<Instructor>('/instructores/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Instructor>(`/instructores/${id}`, data),
  delete: (id: number) => api.delete(`/instructores/${id}`),
  uploadFoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ fotourl: string }>('/instructores/upload-foto', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const pagosApi = {
  list: () => api.get<Pago[]>('/pagos/'),
  create: (data: Record<string, unknown>) => api.post<Pago>('/pagos/', data),
}

export const actividadesApi = {
  list: (fecha?: string) =>
    api.get<Actividad[]>('/actividades/', { params: fecha ? { fecha } : {} }),
  mis: () => api.get<Actividad[]>('/actividades/mis-actividades'),
  get: (id: number) => api.get<Actividad>(`/actividades/${id}`),
  create: (data: Record<string, unknown>) => api.post<Actividad>('/actividades/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Actividad>(`/actividades/${id}`, data),
  delete: (id: number) => api.delete(`/actividades/${id}`),
}

export const salasApi = {
  list: () => api.get<Sala[]>('/salas/'),
}

export const horariosApi = {
  config: () => api.get<ConfigGym>('/horarios/config'),
  disponibilidadSemanal: (referencia?: string) =>
    api.get<DisponibilidadSemanal>('/horarios/disponibilidad-semanal', {
      params: referencia ? { referencia } : {},
    }),
  disponibilidad: (fecha: string, diaSemana?: string) =>
    api.get<DisponibilidadBloque[]>('/horarios/disponibilidad', {
      params: { fecha, ...(diaSemana ? { dia_semana: diaSemana } : {}) },
    }),
  staffing: (fecha: string) => api.get<StaffingResumen>('/horarios/staffing', { params: { fecha } }),
  asignaciones: (fecha?: string, tipo?: string) =>
    api.get<AsignacionInstructor[]>('/horarios/asignaciones', {
      params: { ...(fecha ? { fecha } : {}), ...(tipo ? { tipo } : {}) },
    }),
  misAsignaciones: (fecha?: string) =>
    api.get<AsignacionInstructor[]>('/horarios/mis-asignaciones', {
      params: fecha ? { fecha } : {},
    }),
  crearAsignacion: (data: Record<string, unknown>) =>
    api.post<AsignacionInstructor>('/horarios/asignaciones', data),
  eliminarAsignacion: (id: number) => api.delete(`/horarios/asignaciones/${id}`),
  miTurnoCoach: (data: Record<string, unknown>) =>
    api.post<AsignacionInstructor>('/horarios/asignaciones/mi-turno', data),
}

export const maquinasApi = {
  list: () => api.get<Maquina[]>('/maquinas/'),
  get: (id: number) => api.get<Maquina>(`/maquinas/${id}`),
  create: (data: Record<string, unknown>) => api.post<Maquina>('/maquinas/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Maquina>(`/maquinas/${id}`, data),
  delete: (id: number) => api.delete(`/maquinas/${id}`),
  plantillaMantenimiento: (id: number) =>
    api.get<MantenimientoPlantilla>(`/maquinas/${id}/mantenimiento/plantilla`),
  listarMantenimientos: (id: number) =>
    api.get<MantenimientoMaquina[]>(`/maquinas/${id}/mantenimientos`),
  registrarMantenimiento: (id: number, data: Record<string, unknown>) =>
    api.post<MantenimientoMaquina>(`/maquinas/${id}/mantenimientos`, data),
  uploadFoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ fotourl: string }>('/maquinas/upload-foto', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const accesoApi = {
  historial: () => api.get<Acceso[]>('/acceso/historial'),
  nfcScan: (nfc_uid: string) => api.post<NfcScanResult>('/acceso/nfc-scan', { nfc_uid }),
  manual: (codigo: string) => api.post<NfcScanResult>('/acceso/manual', { codigo }),
  qrScan: (codigo: string) => api.post<NfcScanResult>('/acceso/qr-scan', { codigo }),
  miQr: () => api.get<CodigoAcceso>('/acceso/mi-qr'),
  checkIn: () => api.post<NfcScanResult>('/acceso/check-in'),
  monitor: () => api.get<AccesoMonitorStats>('/acceso/monitor'),
  tiempoReal: (limit = 15) => api.get<Acceso[]>('/acceso/tiempo-real', { params: { limit } }),
  alertas: (limit = 10) => api.get<AlertaSeguridad[]>('/acceso/alertas', { params: { limit } }),
}

export const notificacionesApi = {
  list: () => api.get<Notificacion[]>('/notificaciones/'),
  procesarAlertas: () => api.post<{ notificaciones_creadas: number; fecha: string }>('/notificaciones/procesar-alertas'),
  create: (data: Record<string, unknown>) => api.post<Notificacion>('/notificaciones/', data),
  mis: () => api.get<Notificacion[]>('/notificaciones/mis-notificaciones'),
  marcarLeida: (id: number) => api.patch<Notificacion>(`/notificaciones/${id}/leer`),
  delete: (id: number) => api.delete(`/notificaciones/${id}`),
}

export const reservasApi = {
  list: () => api.get<Reserva[]>('/reservas/'),
  mis: () => api.get<Reserva[]>('/reservas/mis-reservas'),
  misClases: () => api.get<Reserva[]>('/reservas/mis-clases'),
  create: (data: { actividad_id: number; fecha: string }) =>
    api.post<Reserva>('/reservas/', data),
  cancelar: (id: number) => api.patch<Reserva>(`/reservas/${id}/cancelar`),
}

export const inscripcionesApi = {
  ventana: () => api.get<VentanaInscripcion>('/inscripciones/ventana'),
  list: () => api.get<Inscripcion[]>('/inscripciones/'),
  pendientes: () => api.get<Inscripcion[]>('/inscripciones/pendientes'),
  habilitados: (mes?: string) =>
    api.get<Inscripcion[]>('/inscripciones/habilitados', { params: mes ? { mes } : {} }),
  mis: () => api.get<Inscripcion[]>('/inscripciones/mis-inscripciones'),
  create: (data: Record<string, unknown>) => api.post<Inscripcion>('/inscripciones/', data),
  createAdmin: (data: Record<string, unknown>) =>
    api.post<Inscripcion>('/inscripciones/admin', data),
  confirmarPago: (id: number, data: Record<string, unknown>) =>
    api.post<Inscripcion>(`/inscripciones/${id}/confirmar-pago`, data),
  renovarPago: (id: number) => api.post<Inscripcion>(`/inscripciones/${id}/renovar-pago`),
  buscarReferencia: (referencia: string) =>
    api.get<Inscripcion>(`/inscripciones/por-referencia/${encodeURIComponent(referencia)}`),
  cancelar: (id: number) => api.patch<Inscripcion>(`/inscripciones/${id}/cancelar`),
}

export const rutinasApi = {
  list: () => api.get<Rutina[]>('/rutinas/'),
  mis: () => api.get<Rutina[]>('/rutinas/mis-rutinas'),
  misAsignadas: () => api.get<Rutina[]>('/rutinas/mis-asignadas'),
  asignaciones: () => api.get<Rutina[]>('/rutinas/asignaciones'),
  get: (id: number) => api.get<Rutina>(`/rutinas/${id}`),
  create: (data: Record<string, unknown>) => api.post<Rutina>('/rutinas/', data),
  asignar: (id: number, data: { estudiante_id: number; notas_asignacion?: string }) =>
    api.post<Rutina>(`/rutinas/${id}/asignar`, data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Rutina>(`/rutinas/${id}`, data),
  delete: (id: number) => api.delete(`/rutinas/${id}`),
}

export const ejerciciosApi = {
  list: (objetivo?: string) =>
    api.get<Ejercicio[]>('/ejercicios/', { params: objetivo ? { objetivo } : {} }),
  get: (id: number) => api.get<Ejercicio>(`/ejercicios/${id}`),
  create: (data: Record<string, unknown>) => api.post<Ejercicio>('/ejercicios/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Ejercicio>(`/ejercicios/${id}`, data),
  delete: (id: number) => api.delete(`/ejercicios/${id}`),
  uploadFoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ fotourl: string }>('/ejercicios/upload-foto', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const usuariosApi = {
  list: (params?: { rol?: string; activo?: boolean }) =>
    api.get<UsuarioAdmin[]>('/usuarios/', { params }),
  get: (id: number) => api.get<UsuarioAdmin>(`/usuarios/${id}`),
  create: (data: Record<string, unknown>) => api.post<UsuarioAdmin>('/usuarios/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<UsuarioAdmin>(`/usuarios/${id}`, data),
  delete: (id: number) => api.delete(`/usuarios/${id}`),
  resetPassword: (id: number, data?: { password_nueva?: string; generar_temporal?: boolean }) =>
    api.post<ResetPasswordResult>(`/usuarios/${id}/reset-password`, data ?? { generar_temporal: true }),
}

export const membresiasApi = {
  list: () => api.get<Membresia[]>('/membresias/'),
  miMembresia: () => api.get<Membresia>('/membresias/mi-membresia'),
  create: (data: Record<string, unknown>) => api.post<Membresia>('/membresias/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Membresia>(`/membresias/${id}`, data),
  delete: (id: number) => api.delete(`/membresias/${id}`),
  byEstudiante: (estudianteId: number) =>
    api.get<Membresia>(`/membresias/estudiante/${estudianteId}`),
}
