import { useMutation, useQuery } from '@tanstack/react-query'
import { DoorOpen, Loader2, Nfc, QrCode, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '@/api/client'
import { accesoApi, fichasInscripcionApi } from '@/api/services'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StudentAccesoPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mi-qr-acceso'],
    queryFn: () => accesoApi.miQr().then((r) => r.data),
  })

  const { data: fichaEstado } = useQuery({
    queryKey: ['mi-ficha-estado'],
    queryFn: () => fichasInscripcionApi.miEstado().then((r) => r.data),
    retry: false,
  })

  const fichaOk = fichaEstado?.tiene_ficha && fichaEstado.vigente

  const checkInMut = useMutation({
    mutationFn: () => accesoApi.checkIn().then((r) => r.data),
    onSuccess: (result) => {
      if (result.acceso_concedido) {
        toast.success(result.mensaje)
      } else {
        toast.error(result.mensaje)
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi acceso al gym</h1>
        
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar tu código de acceso</AlertDescription>
        </Alert>
      )}

      {!fichaOk && (
        <Alert variant="destructive">
          <AlertDescription>
            {!fichaEstado?.tiene_ficha
              ? 'Completa tu ficha de inscripción antes de usar el gimnasio. '
              : 'Tu ficha de inscripción no está vigente. '}
            <Link to="/app/ficha-inscripcion" className="font-medium underline">
              Ir a mi ficha
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Código QR personal
            </CardTitle>
            <CardDescription>
              Muestra este QR en recepción para que registren tu entrada o salida
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-52 w-52" />
            ) : data ? (
              <>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <QRCodeSVG value={data.qr_payload} size={200} level="M" includeMargin />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Código de acceso</p>
                  <p className="font-mono text-lg font-bold tracking-wider text-primary">
                    {data.codigo}
                  </p>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  También sirve tu registro universitario si lo tienes en el perfil
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Check-in desde la app
            </CardTitle>
           
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Nfc className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Ideal si tu teléfono no tiene NFC (ej. Huawei CTRL-LX3): usa el QR en
                recepción o este botón al llegar al gym.
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => checkInMut.mutate()}
              disabled={checkInMut.isPending || isLoading || !fichaOk}
            >
              {checkInMut.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <DoorOpen className="mr-2 h-5 w-5" />
              )}
              Registrar ingreso / salida
            </Button>
            {checkInMut.data && (
              <Alert variant={checkInMut.data.acceso_concedido ? 'default' : 'destructive'}>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>{checkInMut.data.mensaje}</span>
                  {checkInMut.data.tipo_movimiento && (
                    <Badge variant={checkInMut.data.acceso_concedido ? 'success' : 'outline'}>
                      {checkInMut.data.tipo_movimiento}
                    </Badge>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Cómo entrar sin NFC en el teléfono?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Opción 1:</strong> Abre esta pantalla y muestra el
            QR al personal de recepción (Control NFC → escanear QR).
          </p>
          <p>
            <strong className="text-foreground">Opción 2:</strong> Pulsa &quot;Registrar
            ingreso/salida&quot; cuando estés en el gym.
          </p>
          <p>
            <strong className="text-foreground">Opción 3:</strong> Dicta tu registro universitario en
            recepción para acceso manual.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
