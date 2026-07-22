import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { extractFaceEmbedding, loadFaceModels } from '@/lib/faceRecognition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  onEmbeddingChange: (embedding: number[] | undefined) => void
  disabled?: boolean
}

export function FaceCaptureField({ onEmbeddingChange, disabled = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [message, setMessage] = useState(
    //'Opcional. Podés subir una foto clara o tomarla con la cámara.',
  )

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl, stopCamera])

  const saveEmbedding = (embedding: number[] | null) => {
    if (!embedding) {
      setReady(false)
      onEmbeddingChange(undefined)
      setMessage('No se detectó un rostro. Usá buena iluminación y mirá de frente.')
      return
    }
    setReady(true)
    onEmbeddingChange(embedding)
    setMessage('Rostro detectado. Se guardará para futuros accesos.')
  }

  const processFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMessage('Analizando la foto…')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      saveEmbedding(await extractFaceEmbedding(image))
    } catch {
      setReady(false)
      onEmbeddingChange(undefined)
      setMessage('No se pudo procesar la imagen. Probá con otra foto.')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const startCamera = async () => {
    setBusy(true)
    setMessage('Preparando cámara y reconocimiento…')
    try {
      await loadFaceModels()
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
      setMessage('Mirá de frente y presioná “Tomar foto”.')
    } catch {
      setMessage('No se pudo abrir la cámara. Podés subir una foto.')
    } finally {
      setBusy(false)
    }
  }

  const capture = async () => {
    if (!videoRef.current) return
    setBusy(true)
    setMessage('Detectando rostro…')
    try {
      saveEmbedding(await extractFaceEmbedding(videoRef.current))
      if (videoRef.current.videoWidth > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        canvas.toBlob((blob) => blob && setPreviewUrl(URL.createObjectURL(blob)), 'image/jpeg', 0.85)
      }
      stopCamera()
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    stopCamera()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(undefined)
    setReady(false)
    onEmbeddingChange(undefined)
    setMessage('Opcional. Podés subir una foto clara o tomarla con la cámara.')
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div>
        <Label>Reconocimiento facial (opcional)</Label>
        
      </div>

      <div className={cameraOn || previewUrl ? 'overflow-hidden rounded-lg border bg-black' : 'hidden'}>
        <video
          ref={videoRef}
          className={cameraOn ? 'aspect-video w-full object-cover' : 'hidden'}
          muted
          playsInline
          autoPlay
        />
        {!cameraOn && previewUrl && (
          <img src={previewUrl} alt="Rostro seleccionado" className="aspect-video w-full object-cover" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!cameraOn && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()} disabled={busy || disabled}>
              <Camera className="mr-2 h-4 w-4" />
              Usar cámara
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <label className={disabled || busy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Subir foto
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  className="hidden"
                  onChange={(event) => void processFile(event)}
                  disabled={disabled || busy}
                />
              </label>
            </Button>
          </>
        )}
        {cameraOn && (
          <>
            <Button type="button" size="sm" onClick={() => void capture()} disabled={busy || disabled}>
              <Camera className="mr-2 h-4 w-4" />
              Tomar foto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </>
        )}
        {ready && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Cambiar
          </Button>
        )}
      </div>

      <p className={`flex items-center gap-2 text-xs ${ready ? 'text-emerald-600' : 'text-muted-foreground'}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ready ? <CheckCircle2 className="h-4 w-4" /> : null}
        {message}
      </p>
    </div>
  )
}
