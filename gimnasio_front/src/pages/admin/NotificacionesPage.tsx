import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, notificacionesApi } from '@/api/services'
import type { Notificacion } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
import { EstudianteSearchSelect } from '@/components/forms/EstudianteSearchSelect'
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

type Alcance =
  | 'estudiante'
  | 'todos_estudiantes'
  | 'recepcion'
  | 'instructor'
  | 'admin'
  | 'todos'

const ALCANCES: { value: Alcance; label: string; hint: string }[] = [
  {
    value: 'estudiante',
    label: 'Un estudiante',
    hint: 'Busca por nombre, registro o CI',
  },
  {
    value: 'todos_estudiantes',
    label: 'Todos los estudiantes',
    hint: 'Aviso general a alumnos (cierre, mantenimiento, etc.)',
  },
  {
    value: 'recepcion',
    label: 'Recepcionistas',
    hint: 'Solo cuentas con rol recepción',
  },
  {
    value: 'instructor',
    label: 'Instructores',
    hint: 'Solo entrenadores / instructores',
  },
  {
    value: 'admin',
    label: 'Administradores',
    hint: 'Solo cuentas admin',
  },
  {
    value: 'todos',
    label: 'Todos (estudiantes + staff)',
    hint: 'Alumnos, recepción, instructores y admins',
  },
]

export function NotificacionesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [viewRow, setViewRow] = useState<Notificacion | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [alcance, setAlcance] = useState<Alcance>('estudiante')
  const [estudianteId, setEstudianteId] = useState<number | null>(null)
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipo, setTipo] = useState('aviso')

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const { data = [], isLoading } = useQuery({
    queryKey: ['notificaciones-admin'],
    queryFn: () => notificacionesApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: {
      alcance: Alcance
      titulo: string
      mensaje: string
      tipo?: string
      estudiante_id?: number | null
    }) => notificacionesApi.createMasivo(body).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notificaciones-admin'] })
      setOpen(false)
      resetForm()
      toast.success(
        res.creadas === 1
          ? 'Notificación enviada'
          : `${res.creadas} notificaciones enviadas`
      )
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

  const resetForm = () => {
    setAlcance('estudiante')
    setEstudianteId(null)
    setTitulo('')
    setMensaje('')
    setTipo('aviso')
  }

  const alcanceHint = useMemo(
    () => ALCANCES.find((a) => a.value === alcance)?.hint ?? '',
    [alcance]
  )

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!titulo.trim() || !mensaje.trim()) {
      toast.error('Completa título y mensaje')
      return
    }
    if (alcance === 'estudiante' && !estudianteId) {
      toast.error('Selecciona un estudiante')
      return
    }
    createMut.mutate({
      alcance,
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      tipo: tipo.trim() || 'aviso',
      estudiante_id: alcance === 'estudiante' ? estudianteId : null,
    })
  }

  const destinatarioLabel = (n: Notificacion) => {
    if (n.destinatario) return n.destinatario
    if (n.estudiante_id) {
      return estudiantes.find((e) => e.id === n.estudiante_id)?.nombre ?? `Estudiante #${n.estudiante_id}`
    }
    if (n.usuario_id) return `Usuario #${n.usuario_id}`
    return '—'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        //description="Enviar alertas a un estudiante, a todos o por rol (recepción, instructores…)"
        onCreate={() => {
          resetForm()
          setOpen(true)
        }}
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
        <p className="self-center text-sm text-muted-foreground">
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
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{destinatarioLabel(n)}</TableCell>
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) resetForm()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva notificación</DialogTitle>
          </DialogHeader>
          <form id="noti-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alcance">Destinatarios</Label>
              <select
                id="alcance"
                value={alcance}
                onChange={(e) => {
                  setAlcance(e.target.value as Alcance)
                  if (e.target.value !== 'estudiante') setEstudianteId(null)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {ALCANCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{alcanceHint}</p>
            </div>

            {alcance === 'estudiante' && (
              <EstudianteSearchSelect
                label="Estudiante"
                estudiantes={estudiantes}
                value={estudianteId}
                onChange={setEstudianteId}
                required
                placeholder="Buscar por nombre, registro o CI…"
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Cierre por mantenimiento"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje</Label>
              <textarea
                id="mensaje"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                required
                rows={4}
                placeholder="Ej. El gimnasio estará cerrado el sábado por mantenimiento de equipos."
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="aviso, mantenimiento, alerta…"
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="noti-form" disabled={createMut.isPending}>
              {createMut.isPending ? 'Enviando…' : 'Enviar'}
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
                { label: 'Destinatario', value: destinatarioLabel(viewRow) },
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
        description="Se quitará del portal del destinatario."
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
