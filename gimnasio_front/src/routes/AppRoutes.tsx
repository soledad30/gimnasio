import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from '../components/Layout'

import { useAuth } from '../context/AuthContext'

import type { UserRol } from '../types'

import { LoginPage } from '../pages/LoginPage'

import { RegisterPage } from '../pages/RegisterPage'

import { AccesoPage } from '../pages/admin/AccesoPage'

import { ActividadesPage } from '../pages/admin/ActividadesPage'

import { DashboardPage } from '../pages/admin/DashboardPage'

import { EstudiantesPage } from '../pages/admin/EstudiantesPage'

import { InstructoresPage } from '../pages/admin/InstructoresPage'

import { MaquinasPage } from '../pages/admin/MaquinasPage'

import { ReservasAdminPage } from '../pages/admin/ReservasAdminPage'

import { EjerciciosPage } from '../pages/admin/EjerciciosPage'

import { RutinasPage } from '../pages/admin/RutinasPage'

import { MembresiasPage } from '../pages/admin/MembresiasPage'

import { PagosPage } from '../pages/admin/PagosPage'

import { NotificacionesPage } from '../pages/admin/NotificacionesPage'

import { ReportesPage } from '../pages/admin/ReportesPage'

import { UsuariosPage } from '../pages/admin/UsuariosPage'

import { InstructorActividadesPage } from '../pages/instructor/InstructorActividadesPage'

import { InstructorHomePage } from '../pages/instructor/InstructorHomePage'

import { InstructorReservasPage } from '../pages/instructor/InstructorReservasPage'

import { InstructorRutinasPage } from '../pages/instructor/InstructorRutinasPage'

import { StudentActividadesPage } from '../pages/student/StudentActividadesPage'

import { StudentMaquinasPage } from '../pages/student/StudentMaquinasPage'

import { StudentHomePage } from '../pages/student/StudentHomePage'

import { StudentNotificacionesPage } from '../pages/student/StudentNotificacionesPage'

import { StudentReservasPage } from '../pages/student/StudentReservasPage'

import { StudentRutinasPage } from '../pages/student/StudentRutinasPage'
import { StudentAccesoPage } from '../pages/student/StudentAccesoPage'

const STAFF_ROLES: UserRol[] = ['admin', 'recepcion']

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center gym-gradient">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function Protected({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole: UserRol
}) {
  const { user, loading, rol, homePath } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (rol !== requiredRole) return <Navigate to={homePath} replace />

  return <>{children}</>
}

function StaffProtected({ children }: { children: React.ReactNode }) {
  const { user, loading, rol, homePath } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!rol || !STAFF_ROLES.includes(rol)) return <Navigate to={homePath} replace />

  return <>{children}</>
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading, rol } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (rol !== 'admin') return <Navigate to="/admin" replace />

  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/admin"
        element={
          <StaffProtected>
            <Layout variant="admin" />
          </StaffProtected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="estudiantes" element={<EstudiantesPage />} />
        <Route path="acceso" element={<AccesoPage />} />
        <Route path="reservas" element={<ReservasAdminPage />} />
        <Route path="membresias" element={<MembresiasPage />} />
        <Route path="pagos" element={<PagosPage />} />

        <Route
          path="usuarios"
          element={
            <AdminOnly>
              <UsuariosPage />
            </AdminOnly>
          }
        />
        <Route
          path="instructores"
          element={
            <AdminOnly>
              <InstructoresPage />
            </AdminOnly>
          }
        />
        <Route
          path="actividades"
          element={
            <AdminOnly>
              <ActividadesPage />
            </AdminOnly>
          }
        />
        <Route
          path="maquinas"
          element={
            <AdminOnly>
              <MaquinasPage />
            </AdminOnly>
          }
        />
        <Route
          path="ejercicios"
          element={
            <AdminOnly>
              <EjerciciosPage />
            </AdminOnly>
          }
        />
        <Route
          path="rutinas"
          element={
            <AdminOnly>
              <RutinasPage />
            </AdminOnly>
          }
        />
        <Route
          path="reportes"
          element={
            <AdminOnly>
              <ReportesPage />
            </AdminOnly>
          }
        />
        <Route
          path="notificaciones"
          element={
            <AdminOnly>
              <NotificacionesPage />
            </AdminOnly>
          }
        />
      </Route>

      <Route
        path="/instructor"
        element={
          <Protected requiredRole="instructor">
            <Layout variant="instructor" />
          </Protected>
        }
      >
        <Route index element={<InstructorHomePage />} />
        <Route path="rutinas" element={<InstructorRutinasPage />} />
        <Route path="actividades" element={<InstructorActividadesPage />} />
        <Route path="reservas" element={<InstructorReservasPage />} />
      </Route>

      <Route
        path="/app"
        element={
          <Protected requiredRole="estudiante">
            <Layout variant="student" />
          </Protected>
        }
      >
        <Route index element={<StudentHomePage />} />
        <Route path="acceso" element={<StudentAccesoPage />} />
        <Route path="reservas" element={<StudentReservasPage />} />
        <Route path="notificaciones" element={<StudentNotificacionesPage />} />
        <Route path="actividades" element={<StudentActividadesPage />} />
        <Route path="maquinas" element={<StudentMaquinasPage />} />
        <Route path="rutinas" element={<StudentRutinasPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
