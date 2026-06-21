import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/services'
import type { PerfilResponse, UserRol, Usuario } from '../types'

export function homePathForRol(rol: UserRol): string {
  if (rol === 'admin' || rol === 'recepcion') return '/admin'
  if (rol === 'instructor') return '/instructor'
  return '/app'
}

interface AuthContextValue {
  user: Usuario | null
  perfil: PerfilResponse | null
  rol: UserRol | null
  loading: boolean
  login: (email: string, password: string) => Promise<PerfilResponse>
  register: (data: {
    nombre: string
    email: string
    password: string
    telefono?: string
    registro_univercotario?: string
    carrera?: string
  }) => Promise<PerfilResponse>
  logout: () => void
  isAdmin: boolean
  isInstructor: boolean
  homePath: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_TIMEOUT_MS = 8000

async function fetchSession() {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('SESSION_TIMEOUT')), SESSION_TIMEOUT_MS)
  })
  const [me, perfil] = await Promise.race([
    Promise.all([authApi.me(), authApi.perfil()]),
    timeout,
  ])
  return { user: me.data, perfil: perfil.data }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [perfil, setPerfil] = useState<PerfilResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setPerfil(null)
      setLoading(false)
      return
    }
    try {
      const session = await fetchSession()
      setUser(session.user)
      setPerfil(session.perfil)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      setPerfil(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    const session = await fetchSession()
    setUser(session.user)
    setPerfil(session.perfil)
    return session.perfil
  }

  const register = async (data: {
    nombre: string
    email: string
    password: string
    telefono?: string
    registro_univercotario?: string
    carrera?: string
  }) => {
    const { data: tokens } = await authApi.register(data)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const session = await fetchSession()
    setUser(session.user)
    setPerfil(session.perfil)
    return session.perfil
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    setPerfil(null)
  }

  const rol = perfil?.rol ?? null

  const value = useMemo(
    () => ({
      user,
      perfil,
      rol,
      loading,
      login,
      register,
      logout,
      isAdmin: rol === 'admin',
      isRecepcion: rol === 'recepcion',
      isStaff: rol === 'admin' || rol === 'recepcion',
      isInstructor: rol === 'instructor',
      homePath: rol ? homePathForRol(rol) : '/app',
    }),
    [user, perfil, rol, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
