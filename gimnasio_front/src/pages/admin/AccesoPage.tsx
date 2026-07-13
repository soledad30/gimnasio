import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Nfc, QrCode, Radio, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { accesoApi } from '@/api/services'
import type { Acceso, NfcScanResult } from '@/types'
import { QrCameraScanner } from '@/components/acceso/QrCameraScanner'
import { UserAvatar } from '@/components/acceso/UserAvatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

function MovimientoBadge({ tipo }: { tipo?: string | null }) {
  if (tipo === 'entrada') return <Badge variant="success">Ingresó</Badge>
  if (tipo === 'salida') return <Badge variant="destructive">Salió</Badge>
  return <Badge variant="outline">Denegado</Badge>
}

function HistorialItem({ acceso }: { acceso: Acceso }) {
  const nombre = acceso.estudiante_nombre ?? 'Usuario desconocido'
  const subtitulo = acceso.estudiante_carrera
    ? `Est. ${acceso.estudiante_carrera}`
    : acceso.motivo_denegacion ?? 'Sin datos'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
      <UserAvatar nombre={nombre} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{nombre}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono">{acceso.hora_display ?? '—'}</p>
        <MovimientoBadge tipo={acceso.tipo_movimiento} />
      </div>
    </div>
  )
}

export function AccesoPage() {
  const qc = useQueryClient()
  const nfcInputRef = useRef<HTMLInputElement>(null)
  const [uid, setUid] = useState('')
  const [codigoManual, setCodigoManual] = useState('')
  const qrInputRef = useRef<HTMLInputElement>(null)
  const [last, setLast] = useState<NfcScanResult | null>(null)
  const [lectorActivo, setLectorActivo] = useState(true)

  useEffect(() => {
    qrInputRef.current?.focus()
  }, [])

  const sinMembresia =
    last?.motivo_denegacion?.toLowerCase().includes('membresía') ||
    last?.motivo_denegacion?.toLowerCase().includes('membresia') ||
    last?.motivo_denegacion?.toLowerCase().includes('máquinas') ||
    last?.motivo_denegacion?.toLowerCase().includes('maquinas')
  const sinInscripcion =
    last?.motivo_denegacion?.toLowerCase().includes('inscripción') ||
    last?.motivo_denegacion?.toLowerCase().includes('inscripcion') ||
    last?.motivo_denegacion?.toLowerCase().includes('actividad')
  const yaVisitoHoy =
    last?.motivo_denegacion?.toLowerCase().includes('un ingreso por día') ||
    last?.motivo_denegacion?.toLowerCase().includes('entrada y salida hoy')

  const { data: monitor, isLoading: loadingMonitor } = useQuery({
    queryKey: ['acceso-monitor'],
    queryFn: () => accesoApi.monitor().then((r) => r.data),
    refetchInterval: 5000,
  })

  const { data: historial = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['acceso-historial'],
    queryFn: () => accesoApi.historial().then((r) => r.data),
    refetchInterval: 5000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['acceso-historial'] })
    qc.invalidateQueries({ queryKey: ['acceso-monitor'] })
    qc.invalidateQueries({ queryKey: ['acceso-tiempo-real'] })
    qc.invalidateQueries({ queryKey: ['acceso-alertas'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const scanMut = useMutation({
    mutationFn: (nfc_uid: string) => accesoApi.nfcScan(nfc_uid, 'auto').then((r) => r.data),
    onSuccess: (data) => {
      setLast(data)
      invalidate()
      if (data.acceso_concedido) toast.success(data.mensaje)
      else toast.error(data.mensaje)
      setUid('')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const registrarCodigo = (codigo: string) =>
    accesoApi.qrScan(codigo.trim(), 'auto').then((r) => r.data)

  const manualMut = useMutation({
    mutationFn: registrarCodigo,
    onSuccess: (data) => {
      setLast(data)
      invalidate()
      if (data.acceso_concedido) toast.success(data.mensaje)
      else toast.error(data.mensaje)
      setCodigoManual('')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const manualMutateRef = useRef(manualMut.mutate)
  const manualPendingRef = useRef(false)
  manualMutateRef.current = manualMut.mutate
  manualPendingRef.current = manualMut.isPending

  const onQrCameraScan = useCallback((codigo: string) => {
    setCodigoManual(codigo)
    if (!manualPendingRef.current) {
      manualMutateRef.current(codigo)
    }
  }, [])

  const handleNfcScan = () => {
    if (!uid.trim()) return
    scanMut.mutate(uid.trim())
  }

  const simularRegistro = () => {
    const demo = ['A1:B2:C3:D4', 'E5:F6:G7:H8', '221001234']
    const pick = demo[Math.floor(Math.random() * demo.length)]
    setUid(pick)
    scanMut.mutate(pick)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Control NFC — ingreso / salida</h1>
        <p className="text-muted-foreground">
          1.er escaneo del día = entrada · 2.º escaneo = salida · después no puede volver a entrar
          hoy
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Nfc className="h-6 w-6 text-primary" />
              Lector NFC
            </CardTitle>
            <CardDescription>Acerque su carnet al lector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
                lectorActivo ? 'border-primary/50 bg-primary/5' : 'border-muted bg-muted/20'
              }`}
            >
              <div className="relative mb-4">
                <Nfc
                  className={`h-20 w-20 ${lectorActivo ? 'animate-pulse text-primary' : 'text-muted-foreground'}`}
                />
                {lectorActivo && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
                  </span>
                )}
              </div>
              <p className="text-lg font-medium">Acerque su carnet</p>
              <p className="text-sm text-muted-foreground">
                {lectorActivo ? 'Lector NFC activo (entrada / salida)' : 'Lector pausado'}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                ref={nfcInputRef}
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="UID NFC o escaneo automático…"
                className="font-mono"
                disabled={!lectorActivo}
                onKeyDown={(e) => e.key === 'Enter' && handleNfcScan()}
              />
              <Button onClick={handleNfcScan} disabled={!uid || scanMut.isPending || !lectorActivo}>
                Registrar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={simularRegistro}
                disabled={scanMut.isPending}
              >
                <Radio className="mr-2 h-4 w-4" />
                Simular registro
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLectorActivo((v) => !v)}>
                {lectorActivo ? 'Pausar lector' : 'Activar lector'}
              </Button>
            </div>

            {last && (
              <Alert variant={last.acceso_concedido ? 'success' : 'destructive'}>
                <AlertTitle>{last.mensaje}</AlertTitle>
                <AlertDescription>
                  {last.nombre && (
                    <p>
                      {last.nombre}
                      {last.carrera ? ` — ${last.carrera}` : ''}
                    </p>
                  )}
                  {last.tipo_movimiento && (
                    <p className="mt-1 capitalize">Movimiento: {last.tipo_movimiento}</p>
                  )}
                  {last.motivo_denegacion && <p>Motivo: {last.motivo_denegacion}</p>}
                  {sinMembresia && last.nombre && !yaVisitoHoy && (
                    <p className="mt-2">
                      Sin acceso a sala de máquinas.{' '}
                      <Link to="/admin/membresias" className="font-medium underline">
                        Asignar o renovar membresía
                      </Link>
                      .
                    </p>
                  )}
                  {sinInscripcion && !sinMembresia && last.nombre && !yaVisitoHoy && (
                    <p className="mt-2">
                      Para sala de actividades necesita inscripción pagada en{' '}
                      <Link to="/admin/reservas" className="font-medium underline">
                        Reservas / inscripciones
                      </Link>
                      .
                    </p>
                  )}
                  {yaVisitoHoy && (
                    <p className="mt-2">
                      Este estudiante ya completó su visita de hoy (entrada + salida). Solo se
                      permite un ingreso por día.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5" />
              QR y acceso manual
            </CardTitle>
            <CardDescription>
              Escanea el QR o ingresa el código — el sistema decide entrada o salida
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QrCameraScanner onScan={onQrCameraScan} pauseDecoding={manualMut.isPending} />
            <div className="space-y-2">
              <Label htmlFor="codigo">Código escaneado o manual</Label>
              <Input
                ref={qrInputRef}
                id="codigo"
                value={codigoManual}
                onChange={(e) => setCodigoManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && codigoManual.trim()) manualMut.mutate(codigoManual)
                }}
                placeholder="Escanea el QR de la app del estudiante"
                autoComplete="off"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => codigoManual && manualMut.mutate(codigoManual)}
              disabled={!codigoManual || manualMut.isPending}
            >
              Registrar ingreso / salida
            </Button>
            <p className="text-xs text-muted-foreground">
              1) El estudiante muestra su QR (app → Mi acceso).
              2) Primer escaneo = entrada · segundo = salida.
              3) Si ya salió hoy, no podrá volver a entrar hasta mañana.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingMonitor ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">{monitor?.en_gimnasio_ahora ?? 0}</p>
                <p className="text-sm text-muted-foreground">En gimnasio ahora</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{monitor?.ingresos_hoy ?? 0}</p>
                <p className="text-sm text-muted-foreground">Ingresos hoy</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{monitor?.estudiantes_hoy ?? 0}</p>
                <p className="text-sm text-muted-foreground">Estudiantes hoy</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{monitor?.denegados_hoy ?? 0}</p>
                <p className="text-sm text-muted-foreground">Accesos denegados</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            Historial reciente
          </CardTitle>
          <CardDescription>Últimos movimientos de entrada y salida</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistorial ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : historial.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Sin registros aún</p>
          ) : (
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {historial.slice(0, 20).map((a) => (
                <HistorialItem key={a.id} acceso={a} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
