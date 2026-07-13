import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { QrPagoPanel } from '@/components/pagos/QrPagoPanel'
import { resolveQrCobroPayload } from '@/lib/qrPago'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import {
  configuracionApi,
  estudiantesApi,
  inscripcionesApi,
  membresiasApi,
  pagosApi,
} from '@/api/services'
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

const METODOS = [
  { value: 'qr', label: 'QR Simple' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta POS' },
] as const

type MetodoPago = (typeof METODOS)[number]['value']

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
  const [confirmMetodo, setConfirmMetodo] = useState<MetodoPago>('qr')
  const [registroMetodo, setRegistroMetodo] = useState<MetodoPago>('qr')

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

  const { data: org } = useQuery({
    queryKey: ['config-organizacion'],
    queryFn: () => configuracionApi.getOrganizacion().then((r) => r.data),
  })

  useEffect(() => {
    if (confirmIns) setConfirmMetodo('qr')
  }, [confirmIns])

  useEffect(() => {
    if (open) setRegistroMetodo('qr')
  }, [open])

  const copyText = async (text: string, okMsg: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(okMsg)
  }

  const qrPayload = (ins?: Inscripcion | null) => {
    if (!ins) return org?.qr_pago_contenido?.trim() || ''
    return resolveQrCobroPayload(org, ins)
  }

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

  const sanitizeLast4 = (raw: FormDataEntryValue | null) =>
    String(raw ?? '')
      .replace(/\D/g, '')
      .slice(-4)

  const buildTarjetaNotas = (fd: FormData, adicionales?: string | null) => {
    const titular = String(fd.get('tarjeta_titular') ?? '').trim()
    const last4 = sanitizeLast4(fd.get('tarjeta_last4'))
    const marca = String(fd.get('tarjeta_marca') ?? '').trim()
    const venc = String(fd.get('tarjeta_vencimiento') ?? '').trim()
    const ciudad = String(fd.get('tarjeta_ciudad') ?? '').trim()
    const parts = [
      titular ? `Titular: ${titular}` : null,
      last4.length === 4 ? `Tarjeta: ****${last4}` : null,
      marca ? `Marca: ${marca}` : null,
      venc ? `Vence: ${venc}` : null,
      ciudad ? `Ciudad: ${ciudad}` : null,
      adicionales ? adicionales.trim() : null,
    ].filter(Boolean)
    return parts.length ? parts.join(' | ') : null
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const metodo = String(fd.get('metodo') || registroMetodo)
    const notasExtra = String(fd.get('notas') || '')
    const notas =
      metodo === 'tarjeta' ? buildTarjetaNotas(fd, notasExtra) : notasExtra || null

    if (metodo === 'tarjeta') {
      const last4 = sanitizeLast4(fd.get('tarjeta_last4'))
      if (!String(fd.get('tarjeta_titular') ?? '').trim()) {
        toast.error('Ingresá el nombre del titular de la tarjeta')
        return
      }
      if (last4.length !== 4) {
        toast.error('Ingresá los últimos 4 dígitos de la tarjeta')
        return
      }
      if (!String(fd.get('referencia') ?? '').trim()) {
        toast.error('Ingresá el Nº de autorización / voucher')
        return
      }
    }

    const membresiaId = fd.get('membresia_id') as string
    createMut.mutate({
      estudiante_id: Number(fd.get('estudiante_id')),
      membresia_id: membresiaId ? Number(membresiaId) : null,
      monto: Number(fd.get('monto')),
      metodo,
      referencia: fd.get('referencia') || null,
      fecha: fd.get('fecha') || new Date().toISOString().slice(0, 10),
      notas,
    })
  }

  const onConfirmPago = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirmIns) return
    const fd = new FormData(e.currentTarget)
    const metodo = String(fd.get('metodo') || confirmMetodo)
    const notasExtra = String(fd.get('notas') || '')
    const notas =
      metodo === 'tarjeta' ? buildTarjetaNotas(fd, notasExtra) : notasExtra || null

    if (metodo === 'tarjeta') {
      const last4 = sanitizeLast4(fd.get('tarjeta_last4'))
      if (!String(fd.get('tarjeta_titular') ?? '').trim()) {
        toast.error('Ingresá el nombre del titular de la tarjeta')
        return
      }
      if (last4.length !== 4) {
        toast.error('Ingresá los últimos 4 dígitos de la tarjeta')
        return
      }
      if (!String(fd.get('referencia') ?? '').trim()) {
        toast.error('Ingresá el Nº de autorización / voucher')
        return
      }
    }

    confirmMut.mutate({
      id: confirmIns.id,
      body: {
        metodo,
        referencia: fd.get('referencia') || confirmIns.referencia_pago,
        notas,
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Pagos"
        //description="Inscripciones pendientes, estudiantes habilitados e historial de cobros"
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
            <p className="text-3xl font-bold text-green-700 dark:text-green-600">{habilitados.length}</p>
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
            Estudiantes inscritos o con reserva solicitada que aún no cancelaron. Los que
            avisaron pago aparecen primero. QR válido 24 h.
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
                  <TableHead>Aviso</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.map((i) => (
                  <TableRow
                    key={i.id}
                    className={i.pago_reportado ? 'bg-amber-50/60 dark:bg-amber-950/20' : undefined}
                  >
                    <TableCell className="font-medium">{i.estudiante_nombre ?? `#${i.estudiante_id}`}</TableCell>
                    <TableCell>{conceptoInscripcion(i)}</TableCell>
                    <TableCell>{i.mes_label ?? i.mes_inicio}</TableCell>
                    <TableCell>Bs. {i.monto}</TableCell>
                    <TableCell className="font-mono text-xs">{i.referencia_pago}</TableCell>
                    <TableCell>
                      {i.pago_reportado ? (
                        <div className="space-y-1">
                          <Badge variant="warning">Reportó pago</Badge>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {i.pago_reportado_metodo || '—'}
                            {i.pago_reportado_comprobante
                              ? ` · ${i.pago_reportado_comprobante}`
                              : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.qr_vigente ? (
                        <Badge variant="outline">Vigente hasta {formatExpira(i.pago_expira_en)}</Badge>
                      ) : (
                        <Badge variant="outline">QR expirado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setConfirmIns(i)
                          if (i.pago_reportado_metodo) {
                            const m = i.pago_reportado_metodo as MetodoPago
                            if (METODOS.some((x) => x.value === m)) setConfirmMetodo(m)
                          }
                        }}
                      >
                        {i.pago_reportado ? 'Verificar y confirmar' : 'Confirmar pago'}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar pago de inscripción</DialogTitle>
          </DialogHeader>
          {confirmIns && (
            <form id="confirm-pago-form" onSubmit={onConfirmPago} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {confirmIns.estudiante_nombre} — {conceptoInscripcion(confirmIns)} ·{' '}
                {confirmIns.mes_label} · Bs. {confirmIns.monto}
              </p>
              {confirmIns.pago_reportado && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="font-medium">El estudiante reportó este pago</p>
                  <p className="mt-1 capitalize">
                    Método: {confirmIns.pago_reportado_metodo || '—'}
                    {confirmIns.pago_reportado_comprobante
                      ? ` · Comp: ${confirmIns.pago_reportado_comprobante}`
                      : ''}
                  </p>
                  {confirmIns.pago_reportado_notas && (
                    <p className="mt-1">Notas: {confirmIns.pago_reportado_notas}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="confirm-metodo">Método</Label>
                <select
                  id="confirm-metodo"
                  name="metodo"
                  required
                  value={confirmMetodo}
                  onChange={(e) => setConfirmMetodo(e.target.value as MetodoPago)}
                  className={selectClassName}
                  aria-label="Método de pago"
                >
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {confirmMetodo === 'efectivo' && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Cobro en caja. Opcional: anotá número de recibo en referencia.
                </div>
              )}

              {confirmMetodo === 'transferencia' && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Datos de la cuenta del gimnasio</p>
                  {org?.banco_nombre || org?.banco_cuenta || org?.banco_titular ? (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {org.banco_nombre && <p>Banco: <span className="text-foreground">{org.banco_nombre}</span></p>}
                      {org.banco_titular && <p>Titular: <span className="text-foreground">{org.banco_titular}</span></p>}
                      {org.banco_cuenta && (
                        <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <span className="font-mono text-foreground">{org.banco_cuenta}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => copyText(org.banco_cuenta!, 'Cuenta copiada')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Configurá banco/cuenta en Configuración → Métodos de cobro.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-referencia">Nº de transferencia / comprobante</Label>
                    <Input
                      id="confirm-referencia"
                      name="referencia"
                      required
                      placeholder="Ej. TRX-123456 o Nº operación"
                      defaultValue=""
                    />
                  </div>
                </div>
              )}

              {confirmMetodo === 'qr' && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <QrPagoPanel
                    ins={confirmIns}
                    org={org}
                    qrSize={160}
                    showInstructions={false}
                    variant="staff"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="confirm-referencia-qr">Nº operación / comprobante QR</Label>
                    <Input
                      id="confirm-referencia-qr"
                      name="referencia"
                      key={`ref-qr-${confirmIns.id}-${confirmIns.pago_reportado_comprobante || ''}`}
                      defaultValue={
                        confirmIns.pago_reportado_comprobante || confirmIns.referencia_pago
                      }
                      placeholder="ID de transacción o referencia de inscripción"
                    />
                  </div>
                </div>
              )}

              {confirmMetodo === 'tarjeta' && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm text-muted-foreground">
                    Datos del voucher POS. Por seguridad no pedimos número completo ni CVC (eso
                    requiere pasarela PCI como Stripe).
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-tarjeta-titular">
                      Nombre del titular <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirm-tarjeta-titular"
                      name="tarjeta_titular"
                      required
                      placeholder="Nombre completo"
                      autoComplete="cc-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="confirm-tarjeta-last4">
                        Últimos 4 dígitos <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="confirm-tarjeta-last4"
                        name="tarjeta_last4"
                        required
                        inputMode="numeric"
                        maxLength={4}
                        pattern="\d{4}"
                        placeholder="0514"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-tarjeta-marca">Marca</Label>
                      <select
                        id="confirm-tarjeta-marca"
                        name="tarjeta_marca"
                        className={selectClassName}
                        defaultValue="Visa"
                        aria-label="Marca de tarjeta"
                      >
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="American Express">American Express</option>
                        <option value="Otra">Otra</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="confirm-tarjeta-venc">Vencimiento (MM/AA)</Label>
                      <Input
                        id="confirm-tarjeta-venc"
                        name="tarjeta_vencimiento"
                        placeholder="MM/AA"
                        maxLength={5}
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-tarjeta-ciudad">Ciudad / facturación</Label>
                      <Input
                        id="confirm-tarjeta-ciudad"
                        name="tarjeta_ciudad"
                        placeholder="Santa Cruz de la Sierra"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-referencia-tarjeta">
                      Nº de autorización / voucher <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirm-referencia-tarjeta"
                      name="referencia"
                      required
                      placeholder="Ej. AUTH-998877"
                    />
                  </div>
                </div>
              )}

              {(confirmMetodo === 'efectivo') && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-referencia-ef">Referencia / recibo (opcional)</Label>
                  <Input
                    id="confirm-referencia-ef"
                    name="referencia"
                    defaultValue={confirmIns.referencia_pago}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirm-notas">Notas</Label>
                <Input id="confirm-notas" name="notas" placeholder="Opcional" />
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
              <select
                id="metodo"
                name="metodo"
                required
                aria-label="Método"
                className={selectClassName}
                value={registroMetodo}
                onChange={(e) => setRegistroMetodo(e.target.value as MetodoPago)}
              >
                {METODOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {registroMetodo === 'transferencia' && (
              <div className="space-y-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                {org?.banco_nombre && <p>Banco: <span className="text-foreground">{org.banco_nombre}</span></p>}
                {org?.banco_titular && <p>Titular: <span className="text-foreground">{org.banco_titular}</span></p>}
                {org?.banco_cuenta && <p>Cuenta: <span className="font-mono text-foreground">{org.banco_cuenta}</span></p>}
                {!org?.banco_cuenta && (
                  <p className="text-xs text-amber-600">Configurá la cuenta en Métodos de cobro.</p>
                )}
              </div>
            )}

            {registroMetodo === 'qr' && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">QR Simple del gimnasio</p>
                {qrPayload() ? (
                  <div className="rounded-lg bg-white p-3">
                    <QRCodeSVG value={qrPayload()} size={140} level="M" includeMargin />
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">Falta contenido del QR en Configuración.</p>
                )}
              </div>
            )}

            {registroMetodo === 'tarjeta' && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Registro del voucher POS. No pedimos ni guardamos el número completo ni el CVC.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reg-tarjeta-titular">
                    Nombre del titular <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reg-tarjeta-titular"
                    name="tarjeta_titular"
                    required
                    placeholder="Nombre completo"
                    autoComplete="cc-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-tarjeta-last4">
                      Últimos 4 dígitos <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="reg-tarjeta-last4"
                      name="tarjeta_last4"
                      required
                      inputMode="numeric"
                      maxLength={4}
                      pattern="\d{4}"
                      placeholder="0514"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-tarjeta-marca">Marca</Label>
                    <select
                      id="reg-tarjeta-marca"
                      name="tarjeta_marca"
                      className={selectClassName}
                      defaultValue="Visa"
                      aria-label="Marca de tarjeta"
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="American Express">American Express</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-tarjeta-venc">Vencimiento (MM/AA)</Label>
                    <Input
                      id="reg-tarjeta-venc"
                      name="tarjeta_vencimiento"
                      placeholder="MM/AA"
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-tarjeta-ciudad">Ciudad / facturación</Label>
                    <Input
                      id="reg-tarjeta-ciudad"
                      name="tarjeta_ciudad"
                      placeholder="Santa Cruz de la Sierra"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="referencia">
                {registroMetodo === 'transferencia'
                  ? 'Nº transferencia / comprobante'
                  : registroMetodo === 'tarjeta'
                    ? 'Nº autorización / voucher'
                    : registroMetodo === 'qr'
                      ? 'Referencia del pago QR'
                      : 'Referencia / recibo'}
              </Label>
              <Input
                id="referencia"
                name="referencia"
                placeholder="Nº transferencia, recibo…"
                required={registroMetodo === 'transferencia' || registroMetodo === 'tarjeta'}
              />
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
