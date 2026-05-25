import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { LoginPage } from '../pages/LoginPage'
import { AccesoPage } from '../pages/admin/AccesoPage'
import { ActividadesPage } from '../pages/admin/ActividadesPage'
import { DashboardPage } from '../pages/admin/DashboardPage'
import { EstudiantesPage } from '../pages/admin/EstudiantesPage'
import { InstructoresPage } from '../pages/admin/InstructoresPage'
import { MaquinasPage } from '../pages/admin/MaquinasPage'
import { ReservasAdminPage } from '../pages/admin/ReservasAdminPage'
import { RutinasPage } from '../pages/admin/RutinasPage'
import { NotificacionesPage } from '../pages/admin/NotificacionesPage'
import { StudentActividadesPage } from '../pages/student/StudentActividadesPage'
import { StudentHomePage } from '../pages/student/StudentHomePage'
import { StudentNotificacionesPage } from '../pages/student/StudentNotificacionesPage'
import { StudentReservasPage } from '../pages/student/StudentReservasPage'

function Protected({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gym-gradient">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/app" replace />
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <Protected adminOnly>
            <Layout variant="admin" />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="estudiantes" element={<EstudiantesPage />} />
        <Route path="instructores" element={<InstructoresPage />} />
        <Route path="actividades" element={<ActividadesPage />} />
        <Route path="maquinas" element={<MaquinasPage />} />
        <Route path="acceso" element={<AccesoPage />} />
        <Route path="rutinas" element={<RutinasPage />} />
        <Route path="reservas" element={<ReservasAdminPage />} />
        <Route path="notificaciones" element={<NotificacionesPage />} />
      </Route>
      <Route
        path="/app"
        element={
          <Protected>
            <Layout variant="student" />
          </Protected>
        }
      >
        <Route index element={<StudentHomePage />} />
        <Route path="reservas" element={<StudentReservasPage />} />
        <Route path="notificaciones" element={<StudentNotificacionesPage />} />
        <Route path="actividades" element={<StudentActividadesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
