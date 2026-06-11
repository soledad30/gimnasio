import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { actividadesApi, reservasApi } from '@/api/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function StudentReservasPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [fechaReserva, setFechaReserva] = useState(new Date().toISOString().slice(0, 10))

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['mis-reservas'],
    queryFn: () => reservasApi.mis().then((r) => r.data),
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades', fechaReserva],
    queryFn: () => actividadesApi.list(fechaReserva).then((r) => r.data),
    enabled: open,
  })

  const createMut = useMutation({
    mutationFn: reservasApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-reservas'] })
      setOpen(false)
      toast.success('Reserva confirmada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => reservasApi.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-reservas'] })
      toast.success('Reserva cancelada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis reservas</h1>
          <p className="text-muted-foreground">Clases que has reservado</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Reservar clase</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{reservas.length} reserva(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : reservas.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No tienes reservas aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.actividad_nombre ?? `Actividad #${r.actividad_id}`}</TableCell>
                    <TableCell>{r.horario || '—'}</TableCell>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>
                      <Badge variant={r.estado === 1 ? 'success' : 'outline'}>
                        {r.estado === 1 ? 'Activa' : 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.estado === 1 && (
                        <Button variant="outline" size="sm" onClick={() => cancelMut.mutate(r.id)}>
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva reserva</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              createMut.mutate({
                actividad_id: Number(fd.get('actividad_id')),
                fecha: fd.get('fecha') as string,
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de la clase</Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                value={fechaReserva}
                onChange={(e) => setFechaReserva(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actividad_id">Actividad</Label>
              <select id="actividad_id" name="actividad_id" required aria-label="Actividad" className={selectClassName}>
                <option value="">Seleccionar…</option>
                {actividades.map((a) => (
                  <option key={a.id} value={a.id} disabled={(a.cupos_disponibles ?? 0) <= 0}>
                    {a.nombre}
                    {a.hora_inicio ? ` (${a.hora_inicio})` : ''}
                    {' — '}
                    {a.cupos_disponibles ?? a.capacidad} cupos
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending}>Reservar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
