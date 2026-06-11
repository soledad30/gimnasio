import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { actividadesApi } from '@/api/services'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function horario(act: {
  dia_semana?: string | null
  hora_inicio?: string | null
  hora_fin?: string | null
}) {
  const parts = []
  if (act.dia_semana) parts.push(act.dia_semana.charAt(0).toUpperCase() + act.dia_semana.slice(1))
  if (act.hora_inicio && act.hora_fin) parts.push(`${act.hora_inicio} - ${act.hora_fin}`)
  else if (act.hora_inicio) parts.push(act.hora_inicio)
  return parts.join(' · ') || 'Sin horario'
}

export function InstructorActividadesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['instructor-actividades'],
    queryFn: () => actividadesApi.mis().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis actividades</h1>
        <p className="text-muted-foreground">Clases y talleres bajo tu responsabilidad</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Activity className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No tienes actividades asignadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{a.nombre}</CardTitle>
                  <Badge variant="outline">Cap. {a.capacidad}</Badge>
                </div>
                <CardDescription>{horario(a)}</CardDescription>
              </CardHeader>
              <CardContent>
                {a.descripcion ? (
                  <p className="text-sm text-muted-foreground">{a.descripcion}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin descripción</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
