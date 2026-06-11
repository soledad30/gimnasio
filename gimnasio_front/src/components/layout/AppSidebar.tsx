import { NavLink } from 'react-router-dom'

import {

  Activity,

  BarChart3,

  Bell,

  CalendarDays,

  CreditCard,

  DollarSign,

  Dumbbell,

  ListChecks,

  LayoutDashboard,

  LogOut,

  Nfc,

  Shield,

  Users,

  UserCog,

  Wrench,

} from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

import { Separator } from '@/components/ui/separator'

import { useAuth } from '@/context/AuthContext'

import type { UserRol } from '@/types'



type NavItem = {

  to: string

  label: string

  icon: React.ComponentType<{ className?: string }>

  roles?: UserRol[]

}



const adminNav: NavItem[] = [

  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },

  { to: '/admin/usuarios', label: 'Usuarios', icon: Shield, roles: ['admin'] },

  { to: '/admin/estudiantes', label: 'Estudiantes', icon: Users },

  { to: '/admin/instructores', label: 'Entrenadores', icon: UserCog, roles: ['admin'] },

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

  { to: '/instructor/reservas', label: 'Reservas', icon: CalendarDays },

]



function filterNav(items: NavItem[], rol: UserRol | null) {

  if (!rol) return items

  return items.filter((item) => !item.roles || item.roles.includes(rol))

}



export function AppSidebar({ variant }: { variant: 'admin' | 'student' | 'instructor' }) {

  const { user, logout, rol } = useAuth()

  const nav =

    variant === 'admin'

      ? filterNav(adminNav, rol)

      : variant === 'instructor'

        ? instructorNav

        : studentNav

  const home = variant === 'admin' ? '/admin' : variant === 'instructor' ? '/instructor' : '/app'



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

            end={to === home}

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

        {rol === 'recepcion' && (

          <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400">Recepción</p>

        )}

        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>

          <LogOut className="mr-2 h-4 w-4" />

          Cerrar sesión

        </Button>

      </div>

    </aside>

  )

}


