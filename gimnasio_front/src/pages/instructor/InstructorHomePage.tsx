import { useQuery } from '@tanstack/react-query'
import { Activity, CalendarDays, Dumbbell, UserCog } from 'lucide-react'
import { instructoresApi } from '@/api/services'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const stats = [
  { key: 'rutinas_asignadas' as const, label: 'Rutinas asignadas', icon: Dumbbell },
  { key: 'actividades_a_cargo' as const, label: 'Actividades a cargo', icon: Activity },
  { key: 'reservas_activas' as const, label: 'Reservas activas', icon: CalendarDays },
]

export function InstructorHomePage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-panel'],
    queryFn: () => instructoresApi.miPanel().then((r) => r.data),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel del instructor</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.nombre}
          {data?.especialidades?.length
            ? ` — ${data.especialidades.join(', ')}`
            : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <p className="text-3xl font-bold">{data?.[key] ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Tu trabajo en UAGRM-GYM
          </CardTitle>
          <CardDescription>
            Gestiona las rutinas que has creado, las actividades que impartes y las reservas de tus
            clases desde el menú lateral.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Revisa los planes de entrenamiento asignados a estudiantes</li>
            <li>Consulta el horario y cupos de tus actividades</li>
            <li>Ve quién tiene reserva en cada clase</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
