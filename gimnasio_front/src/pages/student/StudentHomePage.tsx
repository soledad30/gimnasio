import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, CalendarDays, CreditCard, Dumbbell, Nfc, Wrench } from 'lucide-react'
import { estudiantesApi, membresiasApi, rutinasApi } from '@/api/services'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StudentHomePage() {
  const { user } = useAuth()

  const { data: perfil } = useQuery({
    queryKey: ['mi-perfil'],
    queryFn: () => estudiantesApi.miPerfil().then((r) => r.data),
  })

  const { data: membresia, isLoading: loadingMem } = useQuery({
    queryKey: ['mi-membresia'],
    queryFn: () => membresiasApi.miMembresia().then((r) => r.data),
    retry: false,
  })

  const { data: rutinas = [] } = useQuery({
    queryKey: ['mis-rutinas'],
    queryFn: () => rutinasApi.mis().then((r) => r.data),
  })

  const membresiaActiva =
    membresia?.fecha_fin && membresia.fecha_fin >= new Date().toISOString().slice(0, 10)

  const quickLinks = [
    { to: '/app/acceso', label: 'Mi acceso', icon: Nfc, desc: 'QR y check-in' },
    { to: '/app/rutinas', label: 'Mi rutina', icon: Dumbbell, desc: `${rutinas.length} plan(es)` },
    { to: '/app/reservas', label: 'Mis reservas', icon: CalendarDays, desc: 'Clases reservadas' },
    { to: '/app/actividades', label: 'Actividades', icon: Activity, desc: 'Clases disponibles' },
    { to: '/app/maquinas', label: 'Máquinas', icon: Wrench, desc: 'Ver equipamiento' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {user?.nombre}</h1>
        <p className="text-muted-foreground">
          {perfil?.carrera ? `Est. ${perfil.carrera}` : 'Portal del gimnasio'}
        </p>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Mi membresía
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMem ? (
            <Skeleton className="h-8 w-48" />
          ) : membresia ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={membresiaActiva ? 'success' : 'destructive'}>
                {membresiaActiva ? 'Activa' : 'Vencida'}
              </Badge>
              <span className="capitalize text-sm">{membresia.tipo}</span>
              {membresia.fecha_inicio && membresia.fecha_fin && (
                <span className="text-sm text-muted-foreground">
                  Vigente: {membresia.fecha_inicio} → {membresia.fecha_fin}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tienes membresía activa. Acércate a recepción para activar tu acceso.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map(({ to, label, icon: Icon, desc }) => (
          <Link key={to} to={to}>
            <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {label}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
