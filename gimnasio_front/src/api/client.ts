import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function getMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl?.startsWith('http')) {
    const origin = apiUrl.replace(/\/api\/v1\/?$/, '')
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return 'El servidor no respondió a tiempo. Verifica que el backend esté corriendo en el puerto 8000.'
    }
    if (err.code === 'ERR_NETWORK' || !err.response) {
      return 'No se pudo conectar con el backend. Inicia el servidor con: python -m uvicorn app.main:app --reload --port 8000'
    }
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(', ')
    if (err.response?.status && err.response.status >= 500) {
      return 'Error del servidor al procesar la solicitud. Intenta de nuevo.'
    }
  }
  if (err instanceof Error && err.message === 'SESSION_TIMEOUT') {
    return 'La sesión tardó demasiado. Intenta iniciar sesión de nuevo.'
  }
  return 'Ocurrió un error inesperado'
}
