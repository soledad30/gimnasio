import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { actividadesApi, estudiantesApi, inscripcionesApi, reservasApi } from '@/api/services'
import type { Inscripcion, Reserva } from '@/types'
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

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function inicioMesSiguiente(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 1)
  return d.toISOString().slice(0, 10)
}

function conceptoIns(i: Inscripcion) {
  return i.tipo === 'sala_maquinas' ? 'Sala de máquinas' : i.actividad_nombre ?? 'Actividad'
}

export function ReservasAdminPage() {
  const qc = useQueryClient()
  const [viewRow, setViewRow] = useState<Reserva | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [openInscripcion, setOpenInscripcion] = useState(false)
  const [tipoIns, setTipoIns] = useState<'actividad' | 'sala_maquinas'>('actividad')
  const [confirmPagoId, setConfirmPagoId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['reservas-admin'],
    queryFn: () => reservasApi.list().then((r) => r.data),
  })

  const { data: inscripciones = [], isLoading: loadingIns } = useQuery({
    queryKey: ['inscripciones-admin'],
    queryFn: () => inscripcionesApi.list().then((r) => r.data),
  })

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
    enabled: openInscripcion,
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades-admin-ins'],
    queryFn: () => actividadesApi.list().then((r) => r.data),
    enabled: openInscripcion && tipoIns === 'actividad',
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => reservasApi.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-admin'] })
      setCancelId(null)
      toast.success('Reserva cancelada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const createInsMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => inscripcionesApi.createAdmin(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones-admin'] })
      setOpenInscripcion(false)
      toast.success('Inscripción creada — se envió notificación de pago al estudiante')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const confirmPagoMut = useMutation({
    mutationFn: ({ id, metodo }: { id: number; metodo: string }) =>
      inscripcionesApi.confirmarPago(id, { metodo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscripciones-admin'] })
      qc.invalidateQueries({ queryKey: ['pagos'] })
      setConfirmPagoId(null)
      toast.success('Pago confirmado — inscripción activa')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas e inscripciones"
        description="Inscripciones mensuales con pago, reservas de clases y confirmación en recepción."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Inscripciones mensuales</CardTitle>
            <CardDescription>
              El estudiante recibe notificación con referencia y QR. Confirma el pago en recepción
              antes de que empiece el mes.
            </CardDescription>
          </div>
          <Button onClick={() => setOpenInscripcion(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Inscribir estudiante
          </Button>
        </CardHeader>
        <CardContent>
          {loadingIns ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscripciones.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {i.estudiante_nombre ?? `#${i.estudiante_id}`}
                    </TableCell>
                    <TableCell>{conceptoIns(i)}</TableCell>
                    <TableCell>{i.mes_label ?? i.mes_inicio}</TableCell>
                    <TableCell>Bs. {i.monto}</TableCell>
                    <TableCell className="font-mono text-xs">{i.referencia_pago}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          i.estado === 1 ? 'success' : i.estado === 3 ? 'warning' : 'outline'
                        }
                      >
                        {i.estado_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {i.estado === 3 && (
                        <Button size="sm" onClick={() => setConfirmPagoId(i.id)}>
                          Confirmar pago
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

      <Card>
        <CardHeader>
          <CardTitle>Reservas de clases</CardTitle>
          <CardDescription>{data.length} reserva(s) por día</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.estudiante_nombre ?? `#${r.estudiante_id}`}
                    </TableCell>
                    <TableCell>{r.actividad_nombre ?? `#${r.actividad_id}`}</TableCell>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>
                      <Badge variant={r.estado === 1 ? 'success' : 'destructive'}>
                        {r.estado === 1 ? 'Activa' : 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewRow(r)}
                        extra={
                          r.estado === 1 ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setCancelId(r.id)}
                            >
                              Cancelar
                            </Button>
                          ) : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openInscripcion} onOpenChange={setOpenInscripcion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribir estudiante (admin)</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const tipo = fd.get('tipo') as string
              createInsMut.mutate({
                estudiante_id: Number(fd.get('estudiante_id')),
                tipo,
                mes_inicio: fd.get('mes_inicio') as string,
                actividad_id:
                  tipo === 'actividad' ? Number(fd.get('actividad_id')) : undefined,
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="estudiante_id">Estudiante</Label>
              <select
                id="estudiante_id"
                name="estudiante_id"
                required
                className={selectClassName}
                aria-label="Estudiante"
              >
                <option value="">Seleccionar…</option>
                {estudiantes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mes_inicio">Mes de inscripción</Label>
              <Input
                id="mes_inicio"
                name="mes_inicio"
                type="date"
                defaultValue={inicioMesSiguiente()}
                required
              />
              <p className="text-xs text-muted-foreground">
                El estudiante debe pagar antes de que empiece este mes. Se envía notificación
                automática.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                required
                value={tipoIns}
                onChange={(e) => setTipoIns(e.target.value as 'actividad' | 'sala_maquinas')}
                className={selectClassName}
                aria-label="Tipo"
              >
                <option value="actividad">Actividad</option>
                <option value="sala_maquinas">Sala de máquinas</option>
              </select>
            </div>
            {tipoIns === 'actividad' && (
              <div className="space-y-2">
                <Label htmlFor="actividad_id">Actividad</Label>
                <select
                  id="actividad_id"
                  name="actividad_id"
                  required
                  className={selectClassName}
                  aria-label="Actividad"
                >
                  <option value="">Seleccionar…</option>
                  {actividades.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenInscripcion(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createInsMut.isPending}>
                {createInsMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear inscripción
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmPagoId !== null} onOpenChange={() => setConfirmPagoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago en recepción</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              if (confirmPagoId) {
                confirmPagoMut.mutate({
                  id: confirmPagoId,
                  metodo: fd.get('metodo') as string,
                })
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="metodo">Método de pago</Label>
              <select id="metodo" name="metodo" required className={selectClassName} aria-label="Método">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="qr">QR / billetera</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmPagoId(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={confirmPagoMut.isPending}>
                {confirmPagoMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewRow !== null} onOpenChange={() => setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de reserva</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <DetailGrid
              items={[
                { label: 'Estudiante', value: viewRow.estudiante_nombre ?? `#${viewRow.estudiante_id}` },
                { label: 'Actividad', value: viewRow.actividad_nombre ?? `#${viewRow.actividad_id}` },
                { label: 'Fecha', value: viewRow.fecha },
                { label: 'Estado', value: viewRow.estado === 1 ? 'Activa' : 'Cancelada' },
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
        open={cancelId !== null}
        onOpenChange={() => setCancelId(null)}
        title="Cancelar reserva"
        description="La reserva quedará marcada como cancelada."
        confirmLabel="Cancelar reserva"
        confirmLoadingLabel="Cancelando…"
        onConfirm={() => cancelId && cancelMut.mutate(cancelId)}
        loading={cancelMut.isPending}
      />
    </div>
  )
}
