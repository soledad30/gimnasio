import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, DoorOpen, Users } from 'lucide-react'
import { reportesApi } from '@/api/services'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const kpiConfig = [
  { key: 'total_estudiantes' as const, label: 'Total estudiantes', icon: Users },
  { key: 'estudiantes_activos' as const, label: 'Membresías activas', icon: Activity },
  { key: 'accesos_hoy' as const, label: 'Accesos hoy', icon: DoorOpen },
  { key: 'membresias_por_vencer' as const, label: 'Por vencer (7 días)', icon: AlertTriangle },
]

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportesApi.dashboard().then((r) => r.data),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del día{data?.fecha ? ` — ${data.fecha}` : ''}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el dashboard</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiConfig.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className="text-3xl font-bold text-primary">{data?.[key] ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bienvenido a GymPro</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Usa el menú lateral para gestionar estudiantes, controlar accesos NFC, actividades y reportes.
          Los indicadores se actualizan en tiempo real desde tu base de datos PostgreSQL.
        </CardContent>
      </Card>
    </div>
  )
}
