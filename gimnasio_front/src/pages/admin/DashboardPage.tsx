import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, DoorOpen, Nfc, ShieldAlert, Users } from 'lucide-react'
import { accesoApi, reportesApi } from '@/api/services'
import { UserAvatar } from '@/components/acceso/UserAvatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const kpiCards = [
  { key: 'en_gimnasio_ahora' as const, label: 'En Gimnasio Ahora', icon: Users, color: 'border-l-red-500', valueColor: 'text-red-400' },
  { key: 'ingresos_hoy' as const, label: 'Ingresos Hoy', icon: DoorOpen, color: 'border-l-cyan-500', valueColor: 'text-cyan-400' },
  { key: 'alertas_activas' as const, label: 'Alertas Activas', icon: AlertTriangle, color: 'border-l-amber-500', valueColor: 'text-amber-400' },
  { key: 'total_registrados' as const, label: 'Total Registrados', icon: Activity, color: 'border-l-violet-500', valueColor: 'text-violet-400' },
]

function MovimientoBadge({ tipo }: { tipo?: string | null }) {
  if (tipo === 'entrada') return <Badge variant="success">Entrada</Badge>
  if (tipo === 'salida') return <Badge variant="destructive">Salida</Badge>
  return <Badge variant="outline">Denegado</Badge>
}

function alertaColor(tipo: string) {
  if (tipo === 'tarjeta_no_registrada') return 'border-l-red-500'
  if (tipo === 'membresia_vencida') return 'border-l-amber-500'
  return 'border-l-orange-500'
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportesApi.dashboard().then((r) => r.data),
    refetchInterval: 8000,
  })

  const { data: tiempoReal = [], isLoading: loadingTiempo } = useQuery({
    queryKey: ['acceso-tiempo-real'],
    queryFn: () => accesoApi.tiempoReal(12).then((r) => r.data),
    refetchInterval: 5000,
  })

  const { data: monitor } = useQuery({
    queryKey: ['acceso-monitor'],
    queryFn: () => accesoApi.monitor().then((r) => r.data),
    refetchInterval: 5000,
  })

  const { data: alertas = [] } = useQuery({
    queryKey: ['acceso-alertas'],
    queryFn: () => accesoApi.alertas(8).then((r) => r.data),
    refetchInterval: 8000,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitoreo en Tiempo Real</h1>
        
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el dashboard</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ key, label, icon: Icon, color, valueColor }) => (
          <Card key={key} className={`overflow-hidden border-l-4 ${color}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${valueColor}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className={`text-3xl font-bold ${valueColor}`}>
                  {data?.[key] ?? monitor?.[key as keyof typeof monitor] ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Accesos en tiempo real */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Accesos en Tiempo Real</CardTitle>
            <CardDescription>Últimos movimientos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTiempo ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : tiempoReal.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Sin accesos registrados hoy</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {tiempoReal.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                  >
                    <UserAvatar nombre={a.estudiante_nombre} className="h-9 w-9 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.estudiante_nombre ?? 'Desconocido'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.estudiante_carrera ? `Est. ${a.estudiante_carrera}` : a.motivo_denegacion ?? '—'}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">{a.hora_display}</span>
                    <MovimientoBadge tipo={a.tipo_movimiento} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Estado lector NFC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Nfc className="h-5 w-5 text-primary" />
                  Lector Principal
                </span>
                <Badge variant={monitor?.lector_activo ? 'success' : 'destructive'}>
                  {monitor?.lector_activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </CardTitle>
              <CardDescription>Entrada principal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último escaneo</span>
                <span className="font-mono">{monitor?.ultimo_escaneo ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarjetas leídas hoy</span>
                <span>{monitor?.tarjetas_leidas_hoy ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errores hoy</span>
                <span className={monitor?.errores_hoy ? 'text-destructive' : ''}>
                  {monitor?.errores_hoy ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de seguridad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Alertas de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin alertas hoy</p>
              ) : (
                <div className="space-y-2">
                  {alertas.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-md border-l-4 bg-muted/20 px-3 py-2 ${alertaColor(a.tipo)}`}
                    >
                      <p className="text-sm font-medium">{a.mensaje}</p>
                      <p className="text-xs text-muted-foreground">{a.hora}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPIs secundarios */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{data?.estudiantes_activos ?? 0}</p>
            <p className="text-sm text-muted-foreground">Membresías activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{data?.salidas_hoy ?? monitor?.salidas_hoy ?? 0}</p>
            <p className="text-sm text-muted-foreground">Salidas hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{data?.membresias_por_vencer ?? 0}</p>
            <p className="text-sm text-muted-foreground">Por vencer (7 días)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{data?.accesos_hoy ?? 0}</p>
            <p className="text-sm text-muted-foreground">Total accesos hoy</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
