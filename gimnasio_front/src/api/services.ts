import { api } from './client'
import type {
  Acceso,
  Actividad,
  DashboardKpis,
  Estudiante,
  Instructor,
  Maquina,
  Membresia,
  NfcScanResult,
  Notificacion,
  Reserva,
  Rutina,
  TokenResponse,
  Usuario,
} from '../types'

export const authApi = {
  login: (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password })
    return api.post<TokenResponse>('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  me: () => api.get<Usuario>('/auth/me'),
}

export const reportesApi = {
  dashboard: () => api.get<DashboardKpis>('/reportes/dashboard'),
  accesos: (fecha_inicio: string, fecha_fin: string) =>
    api.get('/reportes/accesos', { params: { fecha_inicio, fecha_fin } }),
}

export const estudiantesApi = {
  list: () => api.get<Estudiante[]>('/estudiantes/'),
  get: (id: number) => api.get<Estudiante>(`/estudiantes/${id}`),
  create: (data: Record<string, unknown>) => api.post<Estudiante>('/estudiantes/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Estudiante>(`/estudiantes/${id}`, data),
  delete: (id: number) => api.delete(`/estudiantes/${id}`),
  assignNfc: (id: number, nfc_uid: string) =>
    api.post<Estudiante>(`/estudiantes/${id}/nfc`, { nfc_uid }),
}

export const instructoresApi = {
  list: () => api.get<Instructor[]>('/instructores/'),
  get: (id: number) => api.get<Instructor>(`/instructores/${id}`),
  create: (data: Record<string, unknown>) => api.post<Instructor>('/instructores/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Instructor>(`/instructores/${id}`, data),
  delete: (id: number) => api.delete(`/instructores/${id}`),
}

export const actividadesApi = {
  list: () => api.get<Actividad[]>('/actividades/'),
  get: (id: number) => api.get<Actividad>(`/actividades/${id}`),
  create: (data: Record<string, unknown>) => api.post<Actividad>('/actividades/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Actividad>(`/actividades/${id}`, data),
  delete: (id: number) => api.delete(`/actividades/${id}`),
}

export const maquinasApi = {
  list: () => api.get<Maquina[]>('/maquinas/'),
  get: (id: number) => api.get<Maquina>(`/maquinas/${id}`),
  create: (data: Record<string, unknown>) => api.post<Maquina>('/maquinas/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Maquina>(`/maquinas/${id}`, data),
  delete: (id: number) => api.delete(`/maquinas/${id}`),
}

export const accesoApi = {
  historial: () => api.get<Acceso[]>('/acceso/historial'),
  nfcScan: (nfc_uid: string) => api.post<NfcScanResult>('/acceso/nfc-scan', { nfc_uid }),
}

export const notificacionesApi = {
  list: () => api.get<Notificacion[]>('/notificaciones/'),
  create: (data: Record<string, unknown>) => api.post<Notificacion>('/notificaciones/', data),
  mis: () => api.get<Notificacion[]>('/notificaciones/mis-notificaciones'),
  marcarLeida: (id: number) => api.patch<Notificacion>(`/notificaciones/${id}/leer`),
  delete: (id: number) => api.delete(`/notificaciones/${id}`),
}

export const reservasApi = {
  list: () => api.get<Reserva[]>('/reservas/'),
  mis: () => api.get<Reserva[]>('/reservas/mis-reservas'),
  create: (data: { actividad_id: number; fecha: string }) =>
    api.post<Reserva>('/reservas/', data),
  cancelar: (id: number) => api.patch<Reserva>(`/reservas/${id}/cancelar`),
}

export const rutinasApi = {
  list: () => api.get<Rutina[]>('/rutinas/'),
  get: (id: number) => api.get<Rutina>(`/rutinas/${id}`),
  create: (data: Record<string, unknown>) => api.post<Rutina>('/rutinas/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Rutina>(`/rutinas/${id}`, data),
  delete: (id: number) => api.delete(`/rutinas/${id}`),
}

export const membresiasApi = {
  create: (data: Record<string, unknown>) => api.post<Membresia>('/membresias/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Membresia>(`/membresias/${id}`, data),
  delete: (id: number) => api.delete(`/membresias/${id}`),
  byEstudiante: (estudianteId: number) =>
    api.get<Membresia>(`/membresias/estudiante/${estudianteId}`),
}
