import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, inscripcionesApi, membresiasApi, pagosApi } from '@/api/services'
import type { Inscripcion } from '@/types'
import { PageHeader } from '@/components/crud/PageHeader'
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

const METODOS = ['efectivo', 'transferencia', 'qr', 'tarjeta']
const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function conceptoInscripcion(i: Inscripcion) {
  if (i.tipo === 'sala_maquinas') return 'Sala de máquinas'
  return i.actividad_nombre ?? 'Actividad'
}

function formatExpira(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PagosPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmIns, setConfirmIns] = useState<Inscripcion | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => pagosApi.list().then((r) => r.data),
  })

  const { data: pendientes = [], isLoading: loadingPendientes } = useQuery({
    queryKey: ['inscripciones-pendientes'],
    queryFn: () => inscripcionesApi.pendientes().then((r) => r.data),
  })

  const { data: habilitados = [], isLoading: loadingHabilitados } = useQuery({
    queryKey: ['inscripciones-habilitados'],
    queryFn: () => inscripcionesApi.habilitados().then((r) => r.data),
  })

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const { data: membresias = [] } = useQuery({
    queryKey: ['membresias'],
    queryFn: () => membresiasApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => pagosApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] })
      setOpen(false)
      toast.success('Pago registrado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const confirmMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      inscripcionesApi.confirmarPago(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones-pendientes'] })
      qc.invalidateQueries({ queryKey: ['inscripciones-habilitados'] })
      qc.invalidateQueries({ queryKey: ['pagos'] })
      setConfirmIns(null)
      toast.success('Pago confirmado — estudiante habilitado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const totalHoy = data
    .filter((p) => p.fecha === new Date().toISOString().slice(0, 10))
    .reduce((s, p) => s + Number(p.monto), 0)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const membresiaId = fd.get('membresia_id') as string
    createMut.mutate({
      estudiante_id: Number(fd.get('estudiante_id')),
      membresia_id: membresiaId ? Number(membresiaId) : null,
      monto: Number(fd.get('monto')),
      metodo: fd.get('metodo'),
      referencia: fd.get('referencia') || null,
      fecha: fd.get('fecha') || new Date().toISOString().slice(0, 10),
      notas: fd.get('notas') || null,
    })
  }

  const onConfirmPago = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirmIns) return
    const fd = new FormData(e.currentTarget)
    confirmMut.mutate({
      id: confirmIns.id,
      body: {
        metodo: fd.get('metodo'),
        referencia: fd.get('referencia') || confirmIns.referencia_pago,
        notas: fd.get('notas') || null,
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Pagos"
        description="Inscripciones pendientes, estudiantes habilitados e historial de cobros"
        onCreate={() => setOpen(true)}
        createLabel="Registrar pago"
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-amber-600">{pendientes.length}</p>
            <p className="text-sm text-muted-foreground">Pendientes de pago</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-600">{habilitados.length}</p>
            <p className="text-sm text-muted-foreground">Habilitados este mes</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-primary">Bs. {totalHoy.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Cobrado hoy</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pendientes de pago</CardTitle>
          <CardDescription>
            Estudiantes inscritos o con reserva solicitada que aún no cancelaron. QR válido 24 h;
            pueden renovarlo desde la app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPendientes ? (
            <Skeleton className="h-24 w-full" />
          ) : pendientes.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Nadie debe pago en este momento</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.estudiante_nombre ?? `#${i.estudiante_id}`}</TableCell>
                    <TableCell>{conceptoInscripcion(i)}</TableCell>
                    <TableCell>{i.mes_label ?? i.mes_inicio}</TableCell>
                    <TableCell>Bs. {i.monto}</TableCell>
                    <TableCell className="font-mono text-xs">{i.referencia_pago}</TableCell>
                    <TableCell>
                      {i.qr_vigente ? (
                        <Badge variant="warning">Vigente hasta {formatExpira(i.pago_expira_en)}</Badge>
                      ) : (
                        <Badge variant="outline">QR expirado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setConfirmIns(i)}>
                        Confirmar pago
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Estudiantes habilitados</CardTitle>
          <CardDescription>
            Inscripciones confirmadas del mes en curso — pueden ingresar al gym y usar su sala
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHabilitados ? (
            <Skeleton className="h-24 w-full" />
          ) : habilitados.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Aún no hay estudiantes habilitados este mes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Monto pagado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {habilitados.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.estudiante_nombre ?? `#${i.estudiante_id}`}</TableCell>
                    <TableCell>{conceptoInscripcion(i)}</TableCell>
                    <TableCell>{i.mes_label ?? i.mes_inicio}</TableCell>
                    <TableCell>Bs. {i.monto}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
          <CardDescription>{data.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay pagos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.fecha}</TableCell>
                      <TableCell className="font-medium">{p.estudiante_nombre ?? `#${p.estudiante_id}`}</TableCell>
                      <TableCell>Bs. {p.monto}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{p.metodo}</Badge>
                      </TableCell>
                      <TableCell>{p.referencia || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmIns !== null} onOpenChange={() => setConfirmIns(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago de inscripción</DialogTitle>
          </DialogHeader>
          {confirmIns && (
            <form id="confirm-pago-form" onSubmit={onConfirmPago} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {confirmIns.estudiante_nombre} — {conceptoInscripcion(confirmIns)} ·{' '}
                {confirmIns.mes_label} · Bs. {confirmIns.monto}
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-metodo">Método</Label>
                <select
                  id="confirm-metodo"
                  name="metodo"
                  required
                  defaultValue="efectivo"
                  className={selectClassName}
                  aria-label="Método de pago"
                >
                  {METODOS.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-referencia">Referencia</Label>
                <Input
                  id="confirm-referencia"
                  name="referencia"
                  defaultValue={confirmIns.referencia_pago}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-notas">Notas</Label>
                <Input id="confirm-notas" name="notas" />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmIns(null)}>Cancelar</Button>
            <Button type="submit" form="confirm-pago-form" disabled={confirmMut.isPending}>
              {confirmMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar y habilitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <form id="pago-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estudiante_id">Estudiante</Label>
              <select id="estudiante_id" name="estudiante_id" required aria-label="Estudiante" className={selectClassName}>
                <option value="">Seleccionar…</option>
                {estudiantes.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="membresia_id">Membresía (opcional)</Label>
              <select id="membresia_id" name="membresia_id" aria-label="Membresía" className={selectClassName}>
                <option value="">Sin vincular</option>
                {membresias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.estudiante_nombre} — {m.tipo}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="monto">Monto (Bs.)</Label>
                <Input id="monto" name="monto" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  name="fecha"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodo">Método de pago</Label>
              <select id="metodo" name="metodo" required aria-label="Método" className={selectClassName} defaultValue="efectivo">
                {METODOS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia / comprobante</Label>
              <Input id="referencia" name="referencia" placeholder="Nº transferencia, recibo…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Input id="notas" name="notas" />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="pago-form" disabled={createMut.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
