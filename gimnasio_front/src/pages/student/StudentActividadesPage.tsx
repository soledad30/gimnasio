import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Calendar, Clock, Users } from 'lucide-react'
import { actividadesApi } from '@/api/services'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

function horario(a: { dia_semana?: string | null; hora_inicio?: string | null; hora_fin?: string | null }) {
  const parts = []
  if (a.dia_semana) parts.push(a.dia_semana.charAt(0).toUpperCase() + a.dia_semana.slice(1))
  if (a.hora_inicio && a.hora_fin) parts.push(`${a.hora_inicio} - ${a.hora_fin}`)
  return parts.join(' · ')
}

export function StudentActividadesPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const { data = [], isLoading } = useQuery({
    queryKey: ['actividades', fecha],
    queryFn: () => actividadesApi.list(fecha).then((r) => r.data),
  })

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actividades disponibles</h1>
          <p className="text-muted-foreground">Clases grupales con horario y cupos</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha-consulta">Ver cupos para</Label>
          <Input
            id="fecha-consulta"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay actividades registradas
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-lg">{a.nombre}</CardTitle>
                {a.descripcion && <CardDescription>{a.descripcion}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                {horario(a) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    {horario(a)}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    {a.cupos_disponibles ?? a.capacidad} / {a.capacidad} cupos disponibles
                  </span>
                </div>
                <Badge variant={(a.cupos_disponibles ?? a.capacidad) > 0 ? 'success' : 'destructive'}>
                  {(a.cupos_disponibles ?? a.capacidad) > 0 ? 'Con cupo' : 'Lleno'}
                </Badge>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Reserva desde Mis reservas
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
