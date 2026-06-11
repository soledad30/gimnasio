import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { reservasApi } from '@/api/services'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function InstructorReservasPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['instructor-reservas'],
    queryFn: () => reservasApi.misClases().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservas de mis clases</h1>
        <p className="text-muted-foreground">Estudiantes inscritos en tus actividades</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CalendarDays className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No hay reservas activas en tus clases</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.estudiante_nombre ?? 'Estudiante'}</p>
                <p className="text-sm text-muted-foreground">
                  {r.actividad_nombre}
                  {r.horario ? ` · ${r.horario}` : ''}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{r.fecha}</span>
              <Badge variant={r.estado === 1 ? 'success' : 'outline'}>
                {r.estado === 1 ? 'Activa' : 'Cancelada'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
