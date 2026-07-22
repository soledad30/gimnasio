import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, ScanFace, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { accesoApi, estudiantesApi } from '@/api/services'
import type { NfcScanResult } from '@/types'
import { extractFaceEmbedding, loadFaceModels } from '@/lib/faceRecognition'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EstudianteSearchSelect } from '@/components/forms/EstudianteSearchSelect'

type Props = {
  onResult: (data: NfcScanResult) => void
}

export function FaceAccessPanel({ onResult }: Props) {
  const qc = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  const [cameraOn, setCameraOn] = useState(false)
  const [modelsOk, setModelsOk] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [status, setStatus] = useState('Cámara apagada')
  const [mode, setMode] = useState<'scan' | 'enroll'>('scan')
  const [estudianteId, setEstudianteId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes-face'],
    queryFn: () => estudiantesApi.list({ limit: 200 }).then((r) => r.data),
    enabled: mode === 'enroll',
  })

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setStatus('Cámara apagada')
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const ensureModels = async () => {
    if (modelsOk) return
    setLoadingModels(true)
    setStatus('Cargando modelos faciales…')
    try {
      await loadFaceModels()
      setModelsOk(true)
      setStatus('Modelos listos')
    } catch (e) {
      toast.error('No se pudieron cargar los modelos faciales')
      setStatus(getErrorMessage(e))
      throw e
    } finally {
      setLoadingModels(false)
    }
  }

  const startCamera = async () => {
    try {
      await ensureModels()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      setStatus(mode === 'scan' ? 'Mirando a la cámara…' : 'Listo para enrolar')
    } catch (e) {
      toast.error(getErrorMessage(e) || 'No se pudo abrir la cámara')
      setStatus('Error de cámara')
    }
  }

  const scanMut = useMutation({
    mutationFn: (embedding: number[]) => accesoApi.faceScan(embedding).then((r) => r.data),
    onSuccess: (data) => {
      onResult(data)
      qc.invalidateQueries({ queryKey: ['acceso-historial'] })
      qc.invalidateQueries({ queryKey: ['acceso-monitor'] })
      if (data.acceso_concedido) toast.success(data.mensaje)
      else toast.error(data.mensaje)
      setStatus(data.acceso_concedido ? 'Acceso procesado' : 'Acceso denegado')
    },
    onError: (e) => {
      toast.error(getErrorMessage(e))
      setStatus('Error al escanear')
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

  const captureOnce = async () => {
    if (!videoRef.current || busy || scanningRef.current) return
    scanningRef.current = true
    setBusy(true)
    setStatus('Detectando rostro…')
    try {
      const embedding = await extractFaceEmbedding(videoRef.current)
      if (!embedding) {
        setStatus('No se detectó un rostro. Acercate / mejorá la luz.')
        toast.error('No se detectó un rostro')
        return
      }
      if (mode === 'enroll') {
        if (!estudianteId) {
          toast.error('Elegí un estudiante para enrolar')
          setStatus('Seleccioná un estudiante')
          return
        }
        setStatus('Guardando embedding…')
        await enrollMut.mutateAsync({ id: Number(estudianteId), embedding })
      } else {
        setStatus('Comparando con la base…')
        await scanMut.mutateAsync(embedding)
      }
    } finally {
      scanningRef.current = false
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanFace className="h-5 w-5" />
          Reconocimiento facial
        </CardTitle>
        
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === 'scan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('scan')}
          >
            <Camera className="mr-2 h-4 w-4" />
            Escanear acceso
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
            placeholder="Buscar por nombre, registro, correo o cédula…"
          />
        )}

        <div className="overflow-hidden rounded-xl border border-border/60 bg-black/90">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
            autoPlay
          />
        </div>

        <p className="text-sm text-muted-foreground">{status}</p>

        <div className="flex flex-wrap gap-2">
          {!cameraOn ? (
            <Button onClick={() => void startCamera()} disabled={loadingModels}>
              <Camera className="mr-2 h-4 w-4" />
              {loadingModels ? 'Cargando modelos…' : 'Activar cámara'}
            </Button>
          ) : (
            <>
              <Button onClick={() => void captureOnce()} disabled={busy}>
                <ScanFace className="mr-2 h-4 w-4" />
                {mode === 'enroll' ? 'Capturar y enrolar' : 'Escanear ahora'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                <X className="mr-2 h-4 w-4" />
                Apagar cámara
              </Button>
            </>
          )}
        </div>

        
      </CardContent>
    </Card>
  )
}
