import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, CalendarDays, CreditCard, Dumbbell, FileText, Nfc, Wrench } from 'lucide-react'
import { estudiantesApi, fichasInscripcionApi, membresiasApi, rutinasApi } from '@/api/services'
import { useAuth } from '@/context/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

  const { data: fichaEstado } = useQuery({
    queryKey: ['mi-ficha-estado'],
    queryFn: () => fichasInscripcionApi.miEstado().then((r) => r.data),
    retry: false,
  })

  const membresiaActiva =
    membresia?.fecha_fin && membresia.fecha_fin >= new Date().toISOString().slice(0, 10)

  const quickLinks = [
    { to: '/app/ficha-inscripcion', label: 'Mi ficha', icon: FileText, desc: 'Inscripción DUBSS-FR-03' },
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

      {(!fichaEstado?.tiene_ficha || fichaEstado.requiere_actualizacion) && (
        <Alert variant={fichaEstado?.tiene_ficha ? 'destructive' : 'default'}>
          <AlertDescription>
            {!fichaEstado?.tiene_ficha
              ? 'Debes completar tu ficha de inscripción para usar el gimnasio. '
              : 'Tu ficha de inscripción requiere actualización. '}
            <Link to="/app/ficha-inscripcion" className="font-medium underline">
              Ir a mi ficha
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Membresía — sala de máquinas
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
              <p className="w-full text-xs text-muted-foreground">
                Habilita QR, NFC e ingreso a sala de máquinas. Las clases requieren inscripción de
                actividad.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin membresía de máquinas. Paga la mensualidad de sala de máquinas o acércate a
              recepción. Para clases, inscríbete en actividades.
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
