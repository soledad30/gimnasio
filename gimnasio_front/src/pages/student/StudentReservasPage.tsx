import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { getErrorMessage } from '@/api/client'
import { actividadesApi, configuracionApi, inscripcionesApi, membresiasApi, reservasApi } from '@/api/services'
import type { Actividad, Inscripcion, Membresia } from '@/types'
import { QrPagoPanel } from '@/components/pagos/QrPagoPanel'
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

type ModoReportar = 'auto' | 'notificar'

function estadoInscripcionBadge(estado: number, pagoReportado?: boolean) {
  if (estado === 1) return { variant: 'success' as const, label: 'Confirmada' }
  if (estado === 3 && pagoReportado)
    return { variant: 'secondary' as const, label: 'Pago reportado' }
  if (estado === 3) return { variant: 'warning' as const, label: 'Pendiente de pago' }
  return { variant: 'outline' as const, label: 'Cancelada' }
}

function conceptoInscripcion(i: Inscripcion) {
  if (i.tipo === 'sala_maquinas') return 'Sala de máquinas (mensual)'
  return i.actividad_nombre ?? 'Actividad'
}

function ultimoDiaMesISO(mesInicio: string) {
  const [y, m] = mesInicio.slice(0, 7).split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function hoyLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function estadoMembresiaBadge(m: Membresia) {
  const hoy = hoyLocalISO()
  if (!m.fecha_inicio || !m.fecha_fin) return { variant: 'outline' as const, label: 'Sin fechas' }
  if (m.fecha_inicio <= hoy && m.fecha_fin >= hoy) return { variant: 'success' as const, label: 'Activa' }
  if (m.fecha_fin < hoy) return { variant: 'destructive' as const, label: 'Vencida' }
  return { variant: 'outline' as const, label: 'Pendiente' }
}

type FilaInscripcion = {
  key: string
  origen: 'membresia' | 'inscripcion'
  concepto: string
  desde: string
  hasta: string
  monto: string
  estadoLabel: string
  estadoVariant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive'
  inscripcion?: Inscripcion
}

function parseDias(value?: string | null, diasLista?: string[]): string[] {
  if (diasLista?.length) return diasLista.map((d) => d.toLowerCase())
  if (!value?.trim()) return []
  return value
    .replace(/;/g, ',')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

function horaAMinutos(hora?: string | null): number | null {
  if (!hora) return null
  const [h, m] = hora.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function actividadesChocan(a: Actividad, b: Actividad): boolean {
  const diasA = new Set(parseDias(a.dia_semana, a.dias_semana))
  const diasB = new Set(parseDias(b.dia_semana, b.dias_semana))
  const diasComunes = [...diasA].some((d) => diasB.has(d))
  if (!diasComunes) return false

  const a0 = horaAMinutos(a.hora_inicio)
  const b0 = horaAMinutos(b.hora_inicio)
  if (a0 == null || b0 == null) return false
  const a1 = horaAMinutos(a.hora_fin) ?? a0 + 60
  const b1 = horaAMinutos(b.hora_fin) ?? b0 + 60
  return a0 < b1 && b0 < a1
}

function etiquetaActividad(a: Actividad) {
  const partes = [a.nombre]
  if (a.hora_inicio) partes.push(a.hora_inicio)
  if (a.dia_semana) partes.push(a.dia_semana)
  return partes.join(' · ')
}

export function StudentReservasPage() {
  const qc = useQueryClient()
  const [openInscripcion, setOpenInscripcion] = useState(false)
  const [tipoInscripcion, setTipoInscripcion] = useState<'actividad' | 'sala_maquinas'>('actividad')
  const [pagoIns, setPagoIns] = useState<Inscripcion | null>(null)
  const [reportarOpen, setReportarOpen] = useState(false)
  const [modoReportar, setModoReportar] = useState<ModoReportar>('notificar')
  const [metodoReportar, setMetodoReportar] = useState('qr')
  const [comprobante, setComprobante] = useState('')
  const [notasReportar, setNotasReportar] = useState('')

  const { data: org } = useQuery({
    queryKey: ['config-organizacion'],
    queryFn: () => configuracionApi.getOrganizacion().then((r) => r.data),
  })

  const { data: ventana } = useQuery({
    queryKey: ['inscripcion-ventana'],
    queryFn: () => inscripcionesApi.ventana().then((r) => r.data),
  })

  const { data: inscripciones = [], isLoading: loadingIns } = useQuery({
    queryKey: ['mis-inscripciones'],
    queryFn: () => inscripcionesApi.mis().then((r) => r.data),
  })

  const { data: membresia, isLoading: loadingMem } = useQuery({
    queryKey: ['mi-membresia'],
    queryFn: async () => {
      try {
        return (await membresiasApi.miMembresia()).data
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) return null
        throw e
      }
    },
    retry: false,
  })

  const { data: reservas = [], isLoading: loadingRes } = useQuery({
    queryKey: ['mis-reservas'],
    queryFn: () => reservasApi.mis().then((r) => r.data),
  })

  const filasInscripcion = useMemo((): FilaInscripcion[] => {
    const filas: FilaInscripcion[] = []

    if (membresia) {
      const est = estadoMembresiaBadge(membresia)
      filas.push({
        key: `mem-${membresia.id}`,
        origen: 'membresia',
        concepto: `Membresía sala de máquinas (${membresia.tipo})`,
        desde: membresia.fecha_inicio ?? '—',
        hasta: membresia.fecha_fin ?? '—',
        monto: `Bs. ${membresia.precio}`,
        estadoLabel: est.label,
        estadoVariant: est.variant,
      })
    }

    for (const i of inscripciones) {
      const est = estadoInscripcionBadge(i.estado, i.pago_reportado)
      filas.push({
        key: `ins-${i.id}`,
        origen: 'inscripcion',
        concepto: conceptoInscripcion(i),
        desde: i.mes_inicio,
        hasta: ultimoDiaMesISO(i.mes_inicio),
        monto: `Bs. ${i.monto}`,
        estadoLabel: est.label,
        estadoVariant: est.variant,
        inscripcion: i,
      })
    }

    return filas.sort((a, b) => {
      const da = a.desde === '—' ? '' : a.desde
      const db = b.desde === '—' ? '' : b.desde
      return db.localeCompare(da)
    })
  }, [membresia, inscripciones])

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades-inscripcion', ventana?.mes_objetivo],
    queryFn: () =>
      actividadesApi.list(ventana?.mes_objetivo).then((r) => r.data),
    enabled: openInscripcion && tipoInscripcion === 'actividad' && !!ventana?.mes_objetivo,
  })

  const actividadesDisponibles = useMemo(() => {
    const mes = ventana?.mes_objetivo
    if (!mes) return []

    const miasDelMes = inscripciones.filter(
      (i) =>
        i.tipo === 'actividad' &&
        i.mes_inicio.slice(0, 7) === mes.slice(0, 7) &&
        (i.estado === 1 || i.estado === 3)
    )
    const idsInscritos = new Set(
      miasDelMes.map((i) => i.actividad_id).filter((id): id is number => id != null)
    )
    const ocupadas = actividades.filter((a) => idsInscritos.has(a.id))

    return actividades.filter((a) => {
      if (idsInscritos.has(a.id)) return false
      return !ocupadas.some((otra) => actividadesChocan(a, otra))
    })
  }, [actividades, inscripciones, ventana?.mes_objetivo])

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

  const reportarPagoMut = useMutation({
    mutationFn: (payload: {
      id: number
      modo: ModoReportar
      metodo: string
      referencia_comprobante?: string
      notas?: string
    }) =>
      inscripcionesApi.reportarPago(payload.id, {
        modo: payload.modo,
        metodo: payload.metodo,
        referencia_comprobante: payload.referencia_comprobante,
        notas: payload.notas,
      }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] })
      qc.invalidateQueries({ queryKey: ['mis-notificaciones'] })
      setReportarOpen(false)
      setComprobante('')
      setNotasReportar('')
      if (vars.modo === 'auto') {
        setPagoIns(null)
        toast.success('Pago confirmado. Tu inscripción ya está activa.')
      } else {
        setPagoIns(res.data)
        toast.success('Avisaste tu pago. Recepción lo revisará en breve.')
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const abrirReportar = (modo: ModoReportar) => {
    setModoReportar(modo)
    setMetodoReportar('qr')
    setComprobante('')
    setNotasReportar('')
    setReportarOpen(true)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inscripciones y reservas</h1>
          <p className="text-muted-foreground">
            Membresías, actividades y sala de máquinas — con vigencia desde / hasta
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
          <CardTitle>Mis inscripciones</CardTitle>
          <CardDescription>
            Membresía de sala de máquinas (mensual, trimestral, anual…) e inscripciones de
            actividades / pago mensual, con fecha desde y hasta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIns || loadingMem ? (
            <Skeleton className="h-24 w-full" />
          ) : filasInscripcion.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Sin inscripciones aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasInscripcion.map((fila) => {
                  const i = fila.inscripcion
                  return (
                    <TableRow key={fila.key}>
                      <TableCell className="font-medium">{fila.concepto}</TableCell>
                      <TableCell>{fila.desde}</TableCell>
                      <TableCell>{fila.hasta}</TableCell>
                      <TableCell>{fila.monto}</TableCell>
                      <TableCell>
                        <Badge variant={fila.estadoVariant}>{fila.estadoLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {i && i.estado === 3 && (
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
                        {fila.origen === 'membresia' && (
                          <span className="text-xs text-muted-foreground">Asignada por admin</span>
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
                  {actividadesDisponibles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {etiquetaActividad(a)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Puedes estar en una o más actividades del mes. No se puede volver a habilitar la
                  misma actividad si ya la tienes activa o pendiente, ni una que choque de horario.
                </p>
                {actividadesDisponibles.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No hay más actividades disponibles (ya inscritas, no habilitadas o con choque de
                    horario).
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Se generará tu referencia de pago y el QR Simple del gimnasio (válido 24 h). También
              lo recibirás por notificación y correo. Paga con Yape, banca móvil o transferencia
              antes de que empiece el mes.
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar con QR Simple</DialogTitle>
          </DialogHeader>
          {pagoIns && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {conceptoInscripcion(pagoIns)} — {pagoIns.mes_label}
              </p>
              <QrPagoPanel ins={pagoIns} org={org} variant="student" />
              {pagoIns.pago_reportado && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Ya avisaste este pago. Recepción lo confirmará cuando verifique el comprobante.
                </p>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {pagoIns && pagoIns.qr_vigente && !pagoIns.pago_reportado && (
              <div className="grid w-full gap-2 sm:grid-cols-2">
                <Button variant="default" onClick={() => abrirReportar('auto')}>
                  Ya pagué — activar ya
                </Button>
                <Button variant="secondary" onClick={() => abrirReportar('notificar')}>
                  Avisar a recepción
                </Button>
              </div>
            )}
            {pagoIns && !pagoIns.qr_vigente && (
              <Button
                variant="secondary"
                disabled={renovarPagoMut.isPending}
                onClick={() => renovarPagoMut.mutate(pagoIns.id)}
              >
                Solicitar pago de nuevo
              </Button>
            )}
            <Button variant="outline" onClick={() => setPagoIns(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportarOpen} onOpenChange={setReportarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modoReportar === 'auto' ? 'Confirmar pago automáticamente' : 'Avisar pago a recepción'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {modoReportar === 'auto'
                ? 'Tu inscripción se activará de inmediato. Usa esta opción solo si ya transferiste o pagaste con QR.'
                : 'Recepción verá tu aviso en Pagos y confirmará al verificar el comprobante. Tu inscripción sigue pendiente hasta entonces.'}
            </p>
            <div className="space-y-2">
              <Label htmlFor="metodo-reportar">Método usado</Label>
              <select
                id="metodo-reportar"
                className={selectClassName}
                value={metodoReportar}
                onChange={(e) => setMetodoReportar(e.target.value)}
              >
                <option value="qr">QR Simple</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta POS</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante-reportar">
                Nº de operación / comprobante {modoReportar === 'auto' ? '(recomendado)' : '(opcional)'}
              </Label>
              <Input
                id="comprobante-reportar"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="Ej. ID de Yape o Nº transferencia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas-reportar">Notas (opcional)</Label>
              <Input
                id="notas-reportar"
                value={notasReportar}
                onChange={(e) => setNotasReportar(e.target.value)}
                placeholder="Detalle breve"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={reportarPagoMut.isPending || !pagoIns}
              onClick={() => {
                if (!pagoIns) return
                reportarPagoMut.mutate({
                  id: pagoIns.id,
                  modo: modoReportar,
                  metodo: metodoReportar,
                  referencia_comprobante: comprobante.trim() || undefined,
                  notas: notasReportar.trim() || undefined,
                })
              }}
            >
              {reportarPagoMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {modoReportar === 'auto' ? 'Confirmar e activar' : 'Enviar aviso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
