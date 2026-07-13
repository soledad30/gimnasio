import { useEffect, useId, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type QrCameraScannerProps = {
  onScan: (codigo: string) => void
  /** Solo bloquea nuevos escaneos; no apaga la cámara */
  pauseDecoding?: boolean
  className?: string
}

export function QrCameraScanner({
  onScan,
  pauseDecoding = false,
  className,
}: QrCameraScannerProps) {
  const reactId = useId().replace(/:/g, '')
  const elementId = `qr-reader-${reactId}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 })
  const onScanRef = useRef(onScan)
  const pauseRef = useRef(pauseDecoding)
  const [activo, setActivo] = useState(false)
  const [pendienteInicio, setPendienteInicio] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    pauseRef.current = pauseDecoding
  }, [pauseDecoding])

  const detenerScanner = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop()
      }
      scanner.clear()
    } catch {
      /* ignore */
    }
    scannerRef.current = null
  }

  useEffect(() => {
    return () => {
      void detenerScanner()
    }
  }, [])

  useEffect(() => {
    if (!pendienteInicio || activo) return

    let cancelado = false

    const pickCameraId = async (): Promise<string | { facingMode: string }> => {
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (!cameras.length) {
          return { facingMode: 'user' }
        }
        const back = cameras.find((c) =>
          /back|rear|environment|trasera|posterior/i.test(c.label)
        )
        const front = cameras.find((c) =>
          /front|user|facing|frontal|webcam/i.test(c.label)
        )
        if (back) return back.id
        if (front) return front.id
        return cameras[0].id
      } catch {
        return { facingMode: 'user' }
      }
    }

    const onDecoded = (decoded: string) => {
      if (pauseRef.current) return
      const codigo = decoded.trim()
      if (!codigo) return
      const now = Date.now()
      if (
        lastScanRef.current.value === codigo &&
        now - lastScanRef.current.at < 2500
      ) {
        return
      }
      lastScanRef.current = { value: codigo, at: now }
      setHint(`Detectado: ${codigo.slice(0, 40)}${codigo.length > 40 ? '…' : ''}`)
      onScanRef.current(codigo)
    }

    const run = async () => {
      setError(null)
      setHint(null)
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      )
      if (cancelado) return

      const el = document.getElementById(elementId)
      if (!el || el.clientWidth < 40) {
        setError('No se pudo preparar el visor de cámara.')
        setPendienteInicio(false)
        return
      }

      try {
        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        })
        scannerRef.current = scanner

        const cameraConfig = await pickCameraId()

        // Sin qrbox: lee el frame completo (mejor con QR en otra pantalla).
        // Sin videoConstraints: evita conflictos con deviceId.
        await scanner.start(
          cameraConfig,
          {
            fps: 20,
            aspectRatio: 1.333334,
            disableFlip: false,
          },
          onDecoded,
          () => undefined
        )

        if (cancelado) {
          await detenerScanner()
          return
        }
        setActivo(true)
        setHint('Cámara lista — acerca el QR y sube el brillo del celular')
      } catch (e) {
        await detenerScanner()
        const msg = e instanceof Error ? e.message : String(e)
        const lower = msg.toLowerCase()
        setError(
          msg.includes('NotAllowedError') || lower.includes('permission')
            ? 'Permiso de cámara denegado. Actívalo en el navegador e inténtalo de nuevo.'
            : `No se pudo abrir la cámara: ${msg.slice(0, 120)}`
        )
        setActivo(false)
      } finally {
        if (!cancelado) setPendienteInicio(false)
      }
    }

    void run()
    return () => {
      cancelado = true
    }
  }, [pendienteInicio, activo, elementId])

  const apagar = async () => {
    await detenerScanner()
    setActivo(false)
    setPendienteInicio(false)
    setHint(null)
  }

  const mostrarPreview = activo || pendienteInicio

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border border-border bg-black',
          !mostrarPreview && 'hidden'
        )}
        style={{ minHeight: 300 }}
      >
        <div
          id={elementId}
          className="qr-camera-preview h-full min-h-[300px] w-full [&_video]:!relative [&_video]:!h-auto [&_video]:!min-h-[280px] [&_video]:!w-full [&_video]:!object-contain [&_img]:!w-full [&_img]:!object-contain"
        />
        {pendienteInicio && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Abriendo cámara…</p>
          </div>
        )}
        {activo && (
          <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 px-2 text-center text-xs text-white drop-shadow">
            Acerca el QR · maximiza brillo · mantén estable 1–2 s
          </p>
        )}
      </div>

      {!mostrarPreview && (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <Camera className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Activa la cámara para escanear el QR del estudiante
          </p>
        </div>
      )}

      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!activo && !pendienteInicio ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setError(null)
              setHint(null)
              setPendienteInicio(true)
            }}
          >
            <Camera className="mr-2 h-4 w-4" />
            Activar cámara QR
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void apagar()}
            disabled={pendienteInicio}
          >
            {pendienteInicio ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CameraOff className="mr-2 h-4 w-4" />
            )}
            {pendienteInicio ? 'Abriendo…' : 'Apagar cámara'}
          </Button>
        )}
      </div>
    </div>
  )
}
