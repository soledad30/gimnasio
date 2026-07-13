import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notificacionesApi } from '@/api/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StudentNotificacionesPage() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['mis-notificaciones'],
    queryFn: () => notificacionesApi.mis().then((r) => r.data),
  })
  const leerMut = useMutation({
    mutationFn: (id: number) => notificacionesApi.marcarLeida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-notificaciones'] }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Bell className="h-8 w-8 opacity-50" />
            <p>No hay notificaciones.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <Card key={n.id} className={n.leida ? 'opacity-75' : undefined}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{n.titulo}</CardTitle>
                  <CardDescription className="mt-1">
                    {new Date(n.created_at).toLocaleString('es-BO')}
                    {n.tipo ? ` · ${n.tipo}` : ''}
                  </CardDescription>
                </div>
                <Badge variant={n.leida ? 'outline' : 'success'}>
                  {n.leida ? 'Leída' : 'Nueva'}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <p className="text-sm text-foreground">{n.mensaje}</p>
                {!n.leida && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => leerMut.mutate(n.id)}
                    disabled={leerMut.isPending}
                  >
                    Marcar leída
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
