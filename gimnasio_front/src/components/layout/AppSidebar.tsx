import { NavLink } from 'react-router-dom'
import {
  Activity,
  Bell,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Nfc,
  Users,
  UserCog,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> }

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/estudiantes', label: 'Estudiantes', icon: Users },
  { to: '/admin/instructores', label: 'Instructores', icon: UserCog },
  { to: '/admin/actividades', label: 'Actividades', icon: Activity },
  { to: '/admin/maquinas', label: 'Máquinas', icon: Wrench },
  { to: '/admin/acceso', label: 'Control NFC', icon: Nfc },
  { to: '/admin/rutinas', label: 'Rutinas', icon: Dumbbell },
  { to: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/admin/notificaciones', label: 'Notificaciones', icon: Bell },
]

const studentNav: NavItem[] = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard },
  { to: '/app/reservas', label: 'Mis reservas', icon: CalendarDays },
  { to: '/app/notificaciones', label: 'Notificaciones', icon: CreditCard },
  { to: '/app/actividades', label: 'Actividades', icon: Activity },
]

export function AppSidebar({ variant }: { variant: 'admin' | 'student' }) {
  const { user, logout } = useAuth()
  const nav = variant === 'admin' ? adminNav : studentNav

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Dumbbell className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold tracking-tight">
          Gym<span className="text-primary">Pro</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/app'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-4">
        <p className="truncate text-sm font-medium">{user?.nombre}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
