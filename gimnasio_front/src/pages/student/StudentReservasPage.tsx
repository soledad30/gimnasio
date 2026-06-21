import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { actividadesApi, inscripcionesApi, reservasApi } from '@/api/services'
import type { Inscripcion } from '@/types'
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

function estadoInscripcionBadge(estado: number) {
  if (estado === 1) return { variant: 'success' as const, label: 'Confirmada' }
  if (estado === 3) return { variant: 'warning' as const, label: 'Pendiente de pago' }
  return { variant: 'outline' as const, label: 'Cancelada' }
}

function conceptoInscripcion(i: Inscripcion) {
  if (i.tipo === 'sala_maquinas') return 'Sala de máquinas'
  return i.actividad_nombre ?? 'Actividad'
}

function formatExpira(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StudentReservasPage() {
  const qc = useQueryClient()
  const [openInscripcion, setOpenInscripcion] = useState(false)
  const [tipoInscripcion, setTipoInscripcion] = useState<'actividad' | 'sala_maquinas'>('actividad')
  const [pagoIns, setPagoIns] = useState<Inscripcion | null>(null)

  const { data: ventana } = useQuery({
    queryKey: ['inscripcion-ventana'],
    queryFn: () => inscripcionesApi.ventana().then((r) => r.data),
  })

  const { data: inscripciones = [], isLoading: loadingIns } = useQuery({
    queryKey: ['mis-inscripciones'],
    queryFn: () => inscripcionesApi.mis().then((r) => r.data),
  })

  const { data: reservas = [], isLoading: loadingRes } = useQuery({
    queryKey: ['mis-reservas'],
    queryFn: () => reservasApi.mis().then((r) => r.data),
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades-inscripcion', ventana?.mes_objetivo],
    queryFn: () =>
      actividadesApi.list(ventana?.mes_objetivo).then((r) => r.data),
    enabled: openInscripcion && tipoInscripcion === 'actividad' && !!ventana?.mes_objetivo,
  })

  const createInsMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => inscripcionesApi.create(body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['mis-notificaciones'] })
      setOpenInscripcion(false)
      setPagoIns(res.data)
      toast.success('Inscripción creada — realiza el pago antes de que empiece el mes')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancelInsMut = useMutation({
    mutationFn: (id: number) => inscripcionesApi.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      toast.success('Inscripción cancelada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancelResMut = useMutation({
    mutationFn: (id: number) => reservasApi.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-reservas'] })
      toast.success('Reserva cancelada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const renovarPagoMut = useMutation({
    mutationFn: (id: number) => inscripcionesApi.renovarPago(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['mis-notificaciones'] })
      setPagoIns(res.data)
      toast.success('Método de pago reenviado — revisa notificaciones y correo')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inscripciones y reservas</h1>
          <p className="text-muted-foreground">
            Inscríbete a actividades o sala de máquinas con pago mensual
          </p>
        </div>
        <Button
          onClick={() => setOpenInscripcion(true)}
          disabled={!ventana?.ventana_abierta}
        >
          + Nueva inscripción
        </Button>
      </div>

      {ventana && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-sm">
            {ventana.ventana_abierta ? (
              <p>
                <strong>Ventana abierta</strong> para inscribirte en{' '}
                <strong>{ventana.mes_objetivo.slice(0, 7)}</strong> (del{' '}
                {ventana.ventana_inicio} al {ventana.ventana_fin}). Actividad: Bs.{' '}
                {ventana.precio_actividad} · Sala máquinas: Bs. {ventana.precio_sala_maquinas}.
                Debes pagar antes de que empiece el mes.
              </p>
            ) : (
              <p>
                Inscripciones solo los <strong>{ventana.dias_ventana} días antes</strong> del mes
                ({ventana.ventana_inicio} – {ventana.ventana_fin} para{' '}
                {ventana.mes_objetivo.slice(0, 7)}). La ventana no está abierta hoy.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mis inscripciones mensuales</CardTitle>
          <CardDescription>Actividades y sala de máquinas — pago por mes</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIns ? (
            <Skeleton className="h-24 w-full" />
          ) : inscripciones.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Sin inscripciones aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscripciones.map((i) => {
                  const est = estadoInscripcionBadge(i.estado)
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{conceptoInscripcion(i)}</TableCell>
                      <TableCell>{i.mes_label ?? i.mes_inicio}</TableCell>
                      <TableCell>Bs. {i.monto}</TableCell>
                      <TableCell>
                        <Badge variant={est.variant}>{est.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {i.estado === 3 && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setPagoIns(i)}>
                              Ver pago / QR
                            </Button>
                            {!i.qr_vigente && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={renovarPagoMut.isPending}
                                onClick={() => renovarPagoMut.mutate(i.id)}
                              >
                                Solicitar pago
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelInsMut.mutate(i.id)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reservas de clases (día específico)</CardTitle>
          <CardDescription>Requiere inscripción mensual confirmada</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRes ? (
            <Skeleton className="h-24 w-full" />
          ) : reservas.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No tienes reservas de día</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.actividad_nombre ?? `#${r.actividad_id}`}</TableCell>
                    <TableCell>{r.horario || '—'}</TableCell>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell className="text-right">
                      {r.estado === 1 && (
                        <Button size="sm" variant="outline" onClick={() => cancelResMut.mutate(r.id)}>
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

      <Dialog open={openInscripcion} onOpenChange={setOpenInscripcion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva inscripción mensual</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const tipo = fd.get('tipo') as string
              createInsMut.mutate({
                tipo,
                actividad_id:
                  tipo === 'actividad' ? Number(fd.get('actividad_id')) : undefined,
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="tipo">¿Qué deseas inscribir?</Label>
              <select
                id="tipo"
                name="tipo"
                required
                value={tipoInscripcion}
                onChange={(e) =>
                  setTipoInscripcion(e.target.value as 'actividad' | 'sala_maquinas')
                }
                className={selectClassName}
                aria-label="Tipo de inscripción"
              >
                <option value="actividad">
                  Actividad (Bs. {ventana?.precio_actividad ?? '—'})
                </option>
                <option value="sala_maquinas">
                  Sala de máquinas (Bs. {ventana?.precio_sala_maquinas ?? '—'})
                </option>
              </select>
            </div>
            {tipoInscripcion === 'actividad' && (
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
                      {a.hora_inicio ? ` (${a.hora_inicio})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Se generará una referencia de pago y un código QR (válido 24 h). También lo recibirás
              por notificación y correo. Debes pagar antes de que empiece el mes para ingresar al
              gym.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenInscripcion(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createInsMut.isPending}>
                {createInsMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Inscribirme
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pagoIns !== null} onOpenChange={() => setPagoIns(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Método de pago</DialogTitle>
          </DialogHeader>
          {pagoIns && (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                {conceptoInscripcion(pagoIns)} — {pagoIns.mes_label}
              </p>
              <p className="text-2xl font-bold">Bs. {pagoIns.monto}</p>
              <div className="rounded-lg bg-white p-3">
                {pagoIns.qr_vigente ? (
                  <QRCodeSVG value={pagoIns.qr_pago} size={180} />
                ) : (
                  <p className="px-4 py-8 text-sm text-muted-foreground">
                    El QR expiró. Usa &quot;Solicitar pago&quot; para recibir uno nuevo.
                  </p>
                )}
              </div>
              <div className="w-full space-y-2 text-left text-sm">
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span className="font-mono">{pagoIns.referencia_pago}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => copyRef(pagoIns.referencia_pago)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {pagoIns.pago_expira_en && (
                  <p className="text-xs text-muted-foreground">
                    {pagoIns.qr_vigente
                      ? `Vigente hasta ${formatExpira(pagoIns.pago_expira_en)}`
                      : `Expiró el ${formatExpira(pagoIns.pago_expira_en)}`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Muestra este QR o referencia en recepción. También llegó a tus notificaciones y
                  correo. Sin pago confirmado no podrás ingresar al gimnasio.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            {pagoIns && !pagoIns.qr_vigente && (
              <Button
                variant="secondary"
                disabled={renovarPagoMut.isPending}
                onClick={() => renovarPagoMut.mutate(pagoIns.id)}
              >
                Solicitar pago de nuevo
              </Button>
            )}
            <Button onClick={() => setPagoIns(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
