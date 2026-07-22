import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Camera,
  CameraOff,
  Loader2,
  QrCode,
  ScanFace,
  UserPlus,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { accesoApi, estudiantesApi } from '@/api/services'
import type { NfcScanResult } from '@/types'
import { extractFaceEmbedding, loadFaceModels } from '@/lib/faceRecognition'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EstudianteSearchSelect } from '@/components/forms/EstudianteSearchSelect'

type Mode = 'acceso' | 'enroll'

type Props = {
  onQrScan: (codigo: string) => void
  onFaceResult: (data: NfcScanResult) => void
  pauseQr?: boolean
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike
  }
}

const QR_THROTTLE_MS = 280
const QR_DEBOUNCE_MS = 2500

async function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  html5Fallback: Html5Qrcode | null,
): Promise<string | null> {
  if (video.videoWidth < 40 || video.videoHeight < 40) return null

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  if (window.BarcodeDetector) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      const codes = await detector.detect(canvas)
      const value = codes[0]?.rawValue?.trim()
      if (value) return value
    } catch {
      /* fallback below */
    }
  }

  if (!html5Fallback) return null

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return null

  try {
    const file = new File([blob], 'frame.png', { type: 'image/png' })
    return (await html5Fallback.scanFile(file, false)).trim() || null
  } catch {
    return null
  }
}

export function UnifiedAccessCamera({ onQrScan, onFaceResult, pauseQr = false }: Props) {
  const qc = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const html5Ref = useRef<Html5Qrcode | null>(null)
  const qrLoopRef = useRef<number | null>(null)
  const lastQrRef = useRef({ value: '', at: 0 })
  const pauseQrRef = useRef(pauseQr)
  const onQrScanRef = useRef(onQrScan)
  const scanningFaceRef = useRef(false)

  const [mode, setMode] = useState<Mode>('acceso')
  const [cameraOn, setCameraOn] = useState(false)
  const [starting, setStarting] = useState(false)
  const [modelsOk, setModelsOk] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [status, setStatus] = useState('Cámara apagada')
  const [estudianteId, setEstudianteId] = useState<number | null>(null)
  const [busyFace, setBusyFace] = useState(false)
  const [lastQrHint, setLastQrHint] = useState<string | null>(null)

  useEffect(() => {
    onQrScanRef.current = onQrScan
  }, [onQrScan])

  useEffect(() => {
    pauseQrRef.current = pauseQr
  }, [pauseQr])

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes-face'],
    queryFn: () => estudiantesApi.list({ limit: 200 }).then((r) => r.data),
    enabled: mode === 'enroll',
  })

  const stopQrLoop = useCallback(() => {
    if (qrLoopRef.current != null) {
      cancelAnimationFrame(qrLoopRef.current)
      qrLoopRef.current = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    stopQrLoop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setStatus('Cámara apagada')
    setLastQrHint(null)
  }, [stopQrLoop])

  useEffect(() => () => stopCamera(), [stopCamera])

  const ensureModels = async () => {
    if (modelsOk) return
    setLoadingModels(true)
    setStatus('Cargando modelos faciales…')
    try {
      await loadFaceModels()
      setModelsOk(true)
    } catch (e) {
      toast.error('No se pudieron cargar los modelos faciales')
      setStatus(getErrorMessage(e))
      throw e
    } finally {
      setLoadingModels(false)
    }
  }

  const startQrLoop = useCallback(() => {
    stopQrLoop()
    let lastTick = 0

    const loop = (now: number) => {
      qrLoopRef.current = requestAnimationFrame(loop)
      if (now - lastTick < QR_THROTTLE_MS) return
      lastTick = now

      if (pauseQrRef.current || mode !== 'acceso') return

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      void decodeQrFromVideo(video, canvas, html5Ref.current).then((codigo) => {
        if (!codigo || pauseQrRef.current) return
        const ts = Date.now()
        if (
          lastQrRef.current.value === codigo &&
          ts - lastQrRef.current.at < QR_DEBOUNCE_MS
        ) {
          return
        }
        lastQrRef.current = { value: codigo, at: ts }
        setLastQrHint(`QR detectado: ${codigo.slice(0, 36)}${codigo.length > 36 ? '…' : ''}`)
        onQrScanRef.current(codigo)
      })
    }

    qrLoopRef.current = requestAnimationFrame(loop)
  }, [mode, stopQrLoop])

  const startCamera = async () => {
    setStarting(true)
    setStatus('Abriendo cámara…')
    try {
      await ensureModels()

      if (!html5Ref.current) {
        const holder = document.createElement('div')
        holder.id = 'qr-decode-hidden'
        holder.style.display = 'none'
        document.body.appendChild(holder)
        html5Ref.current = new Html5Qrcode('qr-decode-hidden', { verbose: false })
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraOn(true)
      setStatus(
        mode === 'acceso'
          ? 'Cámara lista — mostrá el QR o usá reconocimiento facial'
          : 'Cámara lista — posicioná el rostro para enrolar',
      )
      startQrLoop()
    } catch (e) {
      toast.error(getErrorMessage(e) || 'No se pudo abrir la cámara')
      setStatus('Error de cámara')
      stopCamera()
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    if (cameraOn) startQrLoop()
    else stopQrLoop()
  }, [cameraOn, mode, startQrLoop, stopQrLoop])

  const scanMut = useMutation({
    mutationFn: (embedding: number[]) => accesoApi.faceScan(embedding).then((r) => r.data),
    onSuccess: (data) => {
      onFaceResult(data)
      qc.invalidateQueries({ queryKey: ['acceso-historial'] })
      qc.invalidateQueries({ queryKey: ['acceso-monitor'] })
      if (data.acceso_concedido) toast.success(data.mensaje)
      else toast.error(data.mensaje)
      setStatus(data.acceso_concedido ? 'Acceso facial procesado' : 'Acceso facial denegado')
    },
    onError: (e) => {
      toast.error(getErrorMessage(e))
      setStatus('Error al escanear rostro')
    },
  })

  const enrollMut = useMutation({
    mutationFn: ({ id, embedding }: { id: number; embedding: number[] }) =>
      accesoApi.faceEnroll(id, embedding).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.mensaje)
      setStatus(data.mensaje)
      qc.invalidateQueries({ queryKey: ['estudiantes-face'] })
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const captureFace = async () => {
    if (!videoRef.current || busyFace || scanningFaceRef.current) return
    scanningFaceRef.current = true
    setBusyFace(true)
    setStatus('Detectando rostro…')
    try {
      const embedding = await extractFaceEmbedding(videoRef.current)
      if (!embedding) {
        setStatus('No se detectó un rostro. Acercate y mejorá la luz.')
        toast.error('No se detectó un rostro')
        return
      }
      if (mode === 'enroll') {
        if (!estudianteId) {
          toast.error('Elegí un estudiante para enrolar')
          setStatus('Seleccioná un estudiante')
          return
        }
        setStatus('Guardando rostro…')
        await enrollMut.mutateAsync({ id: Number(estudianteId), embedding })
      } else {
        setStatus('Comparando rostro…')
        await scanMut.mutateAsync(embedding)
      }
    } finally {
      scanningFaceRef.current = false
      setBusyFace(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Cámara de acceso
          <Badge variant="secondary" className="font-normal">
            QR + facial
          </Badge>
        </CardTitle>
        
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === 'acceso' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('acceso')}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Ingreso / salida
          </Button>
          <Button
            variant={mode === 'enroll' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('enroll')}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Enrolar rostro
          </Button>
        </div>

        {mode === 'enroll' && (
          <EstudianteSearchSelect
            id="face-estudiante"
            estudiantes={estudiantes}
            value={estudianteId}
            onChange={setEstudianteId}
            placeholder="Buscar estudiante para enrolar…"
          />
        )}

        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-black">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden />

          {!cameraOn && !starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Activá la cámara para leer QR y reconocer rostros con el mismo dispositivo.
              </p>
            </div>
          )}

          {starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Abriendo cámara…</p>
            </div>
          )}

          {cameraOn && mode === 'acceso' && (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-lg border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              <p className="pointer-events-none absolute bottom-2 left-0 right-0 px-3 text-center text-xs text-white drop-shadow">
                Centrá el QR en el recuadro · o usá reconocimiento facial
              </p>
            </>
          )}

          {cameraOn && mode === 'enroll' && (
            <p className="pointer-events-none absolute bottom-2 left-0 right-0 px-3 text-center text-xs text-white drop-shadow">
              Rostro centrado, buena iluminación
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{status}</p>
        {lastQrHint && mode === 'acceso' && (
          <p className="text-xs text-muted-foreground">{lastQrHint}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {!cameraOn ? (
            <Button onClick={() => void startCamera()} disabled={starting || loadingModels} className="flex-1 sm:flex-none">
              {starting || loadingModels ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {loadingModels ? 'Cargando modelos…' : starting ? 'Abriendo…' : 'Activar cámara'}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => void captureFace()}
                disabled={busyFace || scanMut.isPending || enrollMut.isPending}
                className="flex-1 sm:flex-none"
              >
                <ScanFace className="mr-2 h-4 w-4" />
                {mode === 'enroll' ? 'Capturar y enrolar' : 'Escanear rostro'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                <CameraOff className="mr-2 h-4 w-4" />
                Apagar
              </Button>
            </>
          )}
        </div>

        {mode === 'acceso' && (
          <Alert>
            <AlertDescription className="text-xs sm:text-sm">
              El QR se detecta automáticamente. Para el rostro, presioná{' '}
              <strong>Escanear rostro</strong> cuando la persona esté frente a la cámara.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
