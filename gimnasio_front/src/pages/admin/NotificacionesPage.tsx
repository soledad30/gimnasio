import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, notificacionesApi } from '@/api/services'
import type { Notificacion } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
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

export function NotificacionesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [viewRow, setViewRow] = useState<Notificacion | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const { data = [], isLoading } = useQuery({
    queryKey: ['notificaciones-admin'],
    queryFn: () => notificacionesApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, string | number>) => notificacionesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones-admin'] })
      setOpen(false)
      toast.success('Notificación enviada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const alertasMut = useMutation({
    mutationFn: () => notificacionesApi.procesarAlertas().then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notificaciones-admin'] })
      toast.success(`${res.notificaciones_creadas} alerta(s) generada(s)`)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => notificacionesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones-admin'] })
      setDeleteId(null)
      toast.success('Notificación eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    createMut.mutate({
      estudiante_id: Number(fd.get('estudiante_id')),
      titulo: fd.get('titulo') as string,
      mensaje: fd.get('mensaje') as string,
      tipo: (fd.get('tipo') as string) || 'info',
    })
  }

  const estudianteNombre = (id: number) =>
    estudiantes.find((e) => e.id === id)?.nombre ?? `Estudiante #${id}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Enviar y gestionar alertas a estudiantes"
        onCreate={() => setOpen(true)}
        createLabel="Nueva notificación"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => alertasMut.mutate()}
          disabled={alertasMut.isPending}
        >
          {alertasMut.isPending ? 'Procesando…' : 'Generar alertas de vencimiento'}
        </Button>
        <p className="text-sm text-muted-foreground self-center">
          Avisa automáticamente a estudiantes con membresía por vencer (7 días) o vencida
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} notificación(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay notificaciones. Usa <strong>Nueva notificación</strong> para enviar la primera.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{estudianteNombre(n.estudiante_id)}</TableCell>
                    <TableCell className="font-medium">{n.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{n.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={n.leida ? 'outline' : 'success'}>
                        {n.leida ? 'Leída' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewRow(n)}
                        onDelete={() => setDeleteId(n.id)}
                      />
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
            <DialogTitle>Nueva notificación</DialogTitle>
          </DialogHeader>
          <form id="noti-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estudiante_id">Estudiante</Label>
              <select
                id="estudiante_id"
                name="estudiante_id"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seleccionar…</option>
                {estudiantes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} ({e.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje</Label>
              <Input id="mensaje" name="mensaje" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input id="tipo" name="tipo" placeholder="info, alerta, promoción" />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="noti-form" disabled={createMut.isPending}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewRow !== null} onOpenChange={() => setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de notificación</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <DetailGrid
              items={[
                { label: 'Estudiante', value: estudianteNombre(viewRow.estudiante_id) },
                { label: 'Título', value: viewRow.titulo },
                { label: 'Mensaje', value: viewRow.mensaje },
                { label: 'Tipo', value: viewRow.tipo },
                { label: 'Leída', value: viewRow.leida ? 'Sí' : 'No' },
                { label: 'Enviada', value: new Date(viewRow.created_at).toLocaleString() },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar notificación"
        description="Se quitará del portal del estudiante."
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
