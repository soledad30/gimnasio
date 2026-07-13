import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CreditCard,
  DollarSign,
  Dumbbell,
  KeyRound,
  ListChecks,
  LayoutDashboard,
  LogOut,
  Nfc,
  Settings,
  Shield,
  Users,
  UserCog,
  User,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import type { UserRol } from '@/types'
import { MiPerfilDialog } from '@/components/layout/MiPerfilDialog'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

type NavItem = {
  to?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRol[]
  children?: NavItem[]
}

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Usuarios',
    icon: Shield,
    roles: ['admin'],
    children: [
      { to: '/admin/usuarios', label: 'Cuentas', icon: Users },
      { to: '/admin/usuarios/roles', label: 'Roles y permisos', icon: KeyRound },
    ],
  },
  { to: '/admin/estudiantes', label: 'Estudiantes', icon: Users },
  { to: '/admin/instructores', label: 'Entrenadores', icon: UserCog, roles: ['admin'] },
  { to: '/admin/horarios', label: 'Horarios y salas', icon: CalendarDays, roles: ['admin'] },
  { to: '/admin/actividades', label: 'Actividades', icon: Activity, roles: ['admin'] },
  { to: '/admin/maquinas', label: 'Máquinas y equipos', icon: Wrench, roles: ['admin'] },
  { to: '/admin/acceso', label: 'Control NFC', icon: Nfc },
  { to: '/admin/ejercicios', label: 'Ejercicios', icon: ListChecks, roles: ['admin'] },
  { to: '/admin/rutinas', label: 'Rutinas', icon: Dumbbell, roles: ['admin'] },
  { to: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/admin/membresias', label: 'Membresías', icon: CreditCard },
  { to: '/admin/pagos', label: 'Pagos', icon: DollarSign },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin'] },
  { to: '/admin/notificaciones', label: 'Notificaciones', icon: Bell, roles: ['admin'] },
  { to: '/admin/mis-avisos', label: 'Mis avisos', icon: Bell, roles: ['recepcion', 'admin'] },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings, roles: ['admin'] },
]

const studentNav: NavItem[] = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard },
  { to: '/app/acceso', label: 'Mi acceso', icon: Nfc },
  { to: '/app/rutinas', label: 'Mi rutina', icon: Dumbbell },
  { to: '/app/reservas', label: 'Mis reservas', icon: CalendarDays },
  { to: '/app/notificaciones', label: 'Notificaciones', icon: CreditCard },
  { to: '/app/actividades', label: 'Actividades', icon: Activity },
  { to: '/app/maquinas', label: 'Máquinas', icon: Wrench },
]

const instructorNav: NavItem[] = [
  { to: '/instructor', label: 'Inicio', icon: LayoutDashboard },
  { to: '/instructor/rutinas', label: 'Mis rutinas', icon: Dumbbell },
  { to: '/instructor/actividades', label: 'Mis actividades', icon: Activity },
  { to: '/instructor/horarios', label: 'Turnos máquinas', icon: CalendarDays },
  { to: '/instructor/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/instructor/notificaciones', label: 'Avisos', icon: Bell },
]

function filterNav(items: NavItem[], rol: UserRol | null): NavItem[] {
  if (!rol) return items
  return items
    .filter((item) => !item.roles || item.roles.includes(rol))
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter((c) => !c.roles || c.roles.includes(rol)) }
        : item
    )
}

function NavLinkItem({ to, label, icon: Icon, end }: NavItem & { end?: boolean }) {
  if (!to) return null
  return (
    <NavLink
      to={to}
      end={end}
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
  )
}

function NavGroup({ item, home }: { item: NavItem; home: string }) {
  const location = useLocation()
  const childPaths = item.children?.map((c) => c.to).filter(Boolean) as string[]
  const isSectionActive = childPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  )
  const [open, setOpen] = useState(isSectionActive)

  if (!item.children?.length) {
    return <NavLinkItem {...item} end={item.to === home} />
  }

  const Icon = item.icon

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isSectionActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to!}
              end={child.to === '/admin/usuarios'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/15 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <child.icon className="h-4 w-4 shrink-0" />
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ variant }: { variant: 'admin' | 'student' | 'instructor' }) {
  const { user, logout, rol } = useAuth()
  const [openProfile, setOpenProfile] = useState(false)
  const nav =
    variant === 'admin'
      ? filterNav(adminNav, rol)
      : variant === 'instructor'
        ? instructorNav
        : studentNav
  const home = variant === 'admin' ? '/admin' : variant === 'instructor' ? '/instructor' : '/app'

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Dumbbell className="h-7 w-7 shrink-0 text-primary" />
          <span className="truncate text-xl font-bold tracking-tight">
            UAGRM<span className="text-primary">-GYM</span>
          </span>
        </div>
        <ThemeToggle variant="icon" className="shrink-0" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {nav.map((item) =>
          item.children ? (
            <NavGroup key={item.label} item={item} home={home} />
          ) : (
            <NavLinkItem key={item.to} {...item} end={item.to === home} />
          )
        )}
      </nav>
      <Separator />
      <div className="space-y-2 p-4">
        <p className="truncate text-sm font-medium text-foreground">{user?.nombre}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        {rol === 'recepcion' && (
          <p className="mt-1 text-xs text-cyan-700 dark:text-cyan-400">Recepción</p>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setOpenProfile(true)}>
          <User className="mr-2 h-4 w-4" />
          Mi perfil
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>

      <MiPerfilDialog open={openProfile} onOpenChange={setOpenProfile} />
    </aside>
  )
}
