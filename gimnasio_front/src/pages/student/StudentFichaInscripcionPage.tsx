import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, fichasInscripcionApi } from '@/api/services'
import { DECLARACION_JURADA, REGLAS_GIMNASIO } from '@/data/reglamentoGym'
import type { CondicionesMedicas, FichaInscripcionCreate } from '@/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const PASOS = ['Datos personales', 'Reglamento', 'Cuestionario médico', 'Declaración jurada'] as const

const CONDICIONES_LABELS: { key: keyof CondicionesMedicas; label: string }[] = [
  { key: 'hipertension', label: 'Hipertensión arterial' },
  { key: 'pulmonar', label: 'Enfermedades pulmonares' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'osteoarticular', label: 'Enfermedades osteoarticulares' },
  { key: 'neurologica', label: 'Enfermedades neurológicas' },
  { key: 'convulsiones', label: 'Convulsiones' },
]

const emptyCondiciones = (): CondicionesMedicas => ({
  hipertension: false,
  pulmonar: false,
  diabetes: false,
  osteoarticular: false,
  neurologica: false,
  convulsiones: false,
})

function SiNoField({
  label,
  value,
  onChange,
  detalle,
  onDetalleChange,
  detalleLabel,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  detalle?: string
  onDetalleChange?: (v: string) => void
  detalleLabel?: string
}) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={value} onChange={() => onChange(true)} />
          Sí
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={!value} onChange={() => onChange(false)} />
          No
        </label>
      </div>
      {value && onDetalleChange && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{detalleLabel ?? 'Especifique'}</Label>
          <textarea
            className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={detalle ?? ''}
            onChange={(e) => onDetalleChange(e.target.value)}
            required
          />
        </div>
      )}
    </div>
  )
}

function estadoBadge(estado?: string | null) {
  switch (estado) {
    case 'vigente':
      return <Badge variant="success">Vigente</Badge>
    case 'vencida':
      return <Badge variant="destructive">Vencida</Badge>
    case 'pendiente_certificado':
      return <Badge variant="outline">Pendiente certificado médico</Badge>
    default:
      return <Badge variant="outline">Sin ficha</Badge>
  }
}

export function StudentFichaInscripcionPage() {
  const qc = useQueryClient()
  const [paso, setPaso] = useState(0)
  const [modo, setModo] = useState<'ver' | 'form'>('ver')

  const [domicilio, setDomicilio] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState<'F' | 'M'>('M')
  const [grupoSanguineo, setGrupoSanguineo] = useState('')
  const [alturaCm, setAlturaCm] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [mesHorario, setMesHorario] = useState('')
  const [cs, setCs] = useState('')

  const [aceptaReglamento, setAceptaReglamento] = useState(false)
  const [reglamentoLeido, setReglamentoLeido] = useState(false)

  const [antecedentesCardio, setAntecedentesCardio] = useState(false)
  const [antecedentesCardioDet, setAntecedentesCardioDet] = useState('')
  const [procCardio, setProcCardio] = useState(false)
  const [procCardioDet, setProcCardioDet] = useState('')
  const [condiciones, setCondiciones] = useState<CondicionesMedicas>(emptyCondiciones())
  const [condicionesDetalle, setCondicionesDetalle] = useState('')
  const [intervencion, setIntervencion] = useState(false)
  const [intervencionDet, setIntervencionDet] = useState('')
  const [fracturas, setFracturas] = useState(false)
  const [fracturasDet, setFracturasDet] = useState('')
  const [sintomas, setSintomas] = useState(false)
  const [sintomasDet, setSintomasDet] = useState('')

  const [declaracion, setDeclaracion] = useState(false)
  const [firmaNombre, setFirmaNombre] = useState('')
  const [firmaCi, setFirmaCi] = useState('')

  const { data: perfil } = useQuery({
    queryKey: ['mi-perfil'],
    queryFn: () => estudiantesApi.miPerfil().then((r) => r.data),
  })

  const { data: estado, isLoading } = useQuery({
    queryKey: ['mi-ficha-estado'],
    queryFn: () => fichasInscripcionApi.miEstado().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: FichaInscripcionCreate) => fichasInscripcionApi.crear(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-ficha-estado'] })
      setModo('ver')
      setPaso(0)
      toast.success('Ficha de inscripción guardada correctamente')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const certMut = useMutation({
    mutationFn: (file: File) => fichasInscripcionApi.subirCertificado(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-ficha-estado'] })
      toast.success('Certificado subido. Recepción lo validará pronto.')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const abrirExport = async () => {
    try {
      const res = await fichasInscripcionApi.exportarMiFicha()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html;charset=utf-8' }))
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const iniciarFormulario = () => {
    const f = estado?.ficha
    setDomicilio(f?.domicilio ?? '')
    setFechaNacimiento(f?.fecha_nacimiento ?? '')
    setSexo((f?.sexo as 'F' | 'M') ?? 'M')
    setGrupoSanguineo(f?.grupo_sanguineo ?? '')
    setAlturaCm(f?.altura_cm?.toString() ?? '')
    setPesoKg(f?.peso_kg ?? '')
    setMesHorario(f?.mes_horario ?? '')
    setCs(f?.cs ?? perfil?.cs ?? '')
    setAntecedentesCardio(f?.antecedentes_cardiovasculares ?? false)
    setAntecedentesCardioDet(f?.antecedentes_cardiovasculares_detalle ?? '')
    setProcCardio(f?.procedimientos_cardiovasculares ?? false)
    setProcCardioDet(f?.procedimientos_cardiovasculares_detalle ?? '')
    setCondiciones(f?.condiciones ?? emptyCondiciones())
    setCondicionesDetalle(f?.condiciones_detalle ?? '')
    setIntervencion(f?.intervencion_quirurgica ?? false)
    setIntervencionDet(f?.intervencion_quirurgica_detalle ?? '')
    setFracturas(f?.fracturas ?? false)
    setFracturasDet(f?.fracturas_detalle ?? '')
    setSintomas(f?.sintomas_deportivos ?? false)
    setSintomasDet(f?.sintomas_deportivos_detalle ?? '')
    setAceptaReglamento(false)
    setReglamentoLeido(false)
    setDeclaracion(false)
    setFirmaNombre(f?.firma_nombre ?? perfil?.nombre ?? '')
    setFirmaCi(f?.firma_ci ?? f?.cs ?? perfil?.cs ?? '')
    setPaso(0)
    setModo('form')
  }

  const validarPaso = (): boolean => {
    if (paso === 0) {
      if (!domicilio.trim() || !fechaNacimiento || !alturaCm || !pesoKg) {
        toast.error('Completa domicilio, fecha de nacimiento, altura y peso')
        return false
      }
    }
    if (paso === 1) {
      if (!reglamentoLeido || !aceptaReglamento) {
        toast.error('Debes leer y aceptar el reglamento')
        return false
      }
    }
    if (paso === 3) {
      if (!declaracion || !firmaNombre.trim()) {
        toast.error('Debes aceptar la declaración jurada y firmar con tu nombre completo')
        return false
      }
    }
    return true
  }

  const enviar = () => {
    if (!validarPaso()) return
    const body: FichaInscripcionCreate = {
      domicilio: domicilio.trim(),
      fecha_nacimiento: fechaNacimiento,
      sexo,
      grupo_sanguineo: grupoSanguineo || undefined,
      altura_cm: Number(alturaCm),
      peso_kg: Number(pesoKg),
      mes_horario: mesHorario || undefined,
      cs: cs || undefined,
      antecedentes_cardiovasculares: antecedentesCardio,
      antecedentes_cardiovasculares_detalle: antecedentesCardio ? antecedentesCardioDet : undefined,
      procedimientos_cardiovasculares: procCardio,
      procedimientos_cardiovasculares_detalle: procCardio ? procCardioDet : undefined,
      condiciones,
      condiciones_detalle: Object.values(condiciones).some(Boolean) ? condicionesDetalle : undefined,
      intervencion_quirurgica: intervencion,
      intervencion_quirurgica_detalle: intervencion ? intervencionDet : undefined,
      fracturas,
      fracturas_detalle: fracturas ? fracturasDet : undefined,
      sintomas_deportivos: sintomas,
      sintomas_deportivos_detalle: sintomas ? sintomasDet : undefined,
      acepta_reglamento: aceptaReglamento,
      declaracion_jurada: declaracion,
      firma_nombre: firmaNombre.trim(),
      firma_ci: firmaCi || undefined,
    }
    createMut.mutate(body)
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (modo === 'ver') {
    const f = estado?.ficha
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ficha de inscripción</h1>
          <p className="text-muted-foreground">Formulario DUBSS-FR-03 — Gimnasio Universitario</p>
        </div>

        {!estado?.tiene_ficha && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Aún no has completado tu ficha de inscripción. Es obligatoria para usar el gimnasio.
            </AlertDescription>
          </Alert>
        )}

        {estado?.requiere_actualizacion && estado.tiene_ficha && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Tu ficha requiere actualización
              {estado.dias_para_vencer != null && estado.dias_para_vencer <= 15
                ? ` (vence en ${estado.dias_para_vencer} día(s))`
                : ''}
              .
            </AlertDescription>
          </Alert>
        )}

        {estado?.requiere_certificado_medico && !estado.certificado_medico_recibido && (
          <Alert>
            <AlertDescription>
              Debes presentar un certificado de aptitud física en recepción dentro de 15 días.
              {f?.certificado_medico_url
                ? ' Ya subiste un archivo; recepción lo validará pronto.'
                : ' Puedes subirlo aquí (PDF o imagen).'}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Estado de tu ficha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {estadoBadge(estado?.estado)}
              {f && (
                <>
                  <span className="text-sm text-muted-foreground">Versión {f.version}</span>
                  <span className="text-sm">
                    Vigente hasta: <strong>{f.fecha_vigencia_hasta}</strong>
                  </span>
                </>
              )}
            </div>

            {f ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Nombre:</span> {f.nombre}
                </p>
                <p>
                  <span className="text-muted-foreground">CI:</span> {f.cs || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Carrera:</span> {f.carrera || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Altura / Peso:</span> {f.altura_cm} cm /{' '}
                  {f.peso_kg} kg
                </p>
                <p>
                  <span className="text-muted-foreground">Firmado:</span> {f.firma_nombre} —{' '}
                  {f.firma_fecha}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Completa el formulario con tus datos personales, acepta el reglamento y responde el
                cuestionario médico.
              </p>
            )}

            {f?.requiere_certificado_medico && !f.certificado_medico_recibido && (
              <div className="space-y-2 rounded-lg border border-dashed p-4">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Certificado médico (PDF o imagen)
                </Label>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  disabled={certMut.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) certMut.mutate(file)
                    e.target.value = ''
                  }}
                />
                {certMut.isPending && (
                  <p className="text-xs text-muted-foreground">Subiendo archivo…</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={iniciarFormulario}>
                {estado?.tiene_ficha ? 'Actualizar ficha' : 'Completar ficha'}
              </Button>
              {estado?.tiene_ficha && (
                <>
                  <Button variant="outline" onClick={abrirExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Imprimir / PDF
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/app/acceso">Ir a mi acceso</Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {estado?.tiene_ficha ? 'Actualizar ficha' : 'Nueva ficha de inscripción'}
        </h1>
        <p className="text-muted-foreground">
          Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}
        </p>
      </div>

      <div className="flex gap-1">
        {PASOS.map((p, i) => (
          <div
            key={p}
            className={`h-1 flex-1 rounded-full ${i <= paso ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{PASOS[paso]}</CardTitle>
          {paso === 0 && (
            <CardDescription>
              Datos de {perfil?.nombre} — {perfil?.carrera || 'sin carrera'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {paso === 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cs">C.I. / Código registro</Label>
                  <Input id="cs" value={cs} onChange={(e) => setCs(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Input
                    id="domicilio"
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_nac">Fecha de nacimiento</Label>
                  <Input
                    id="fecha_nac"
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={sexo === 'F'}
                        onChange={() => setSexo('F')}
                      />
                      Femenino
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={sexo === 'M'}
                        onChange={() => setSexo('M')}
                      />
                      Masculino
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo sanguíneo</Label>
                  <Input
                    id="grupo"
                    placeholder="Ej. O+"
                    value={grupoSanguineo}
                    onChange={(e) => setGrupoSanguineo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altura">Altura (cm)</Label>
                  <Input
                    id="altura"
                    type="number"
                    min={100}
                    max={250}
                    value={alturaCm}
                    onChange={(e) => setAlturaCm(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso">Peso (kg)</Label>
                  <Input
                    id="peso"
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="horario">Mes / Horario de inscripción</Label>
                  <Input
                    id="horario"
                    placeholder="Ej. Marzo — Turno tarde"
                    value={mesHorario}
                    onChange={(e) => setMesHorario(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {paso === 1 && (
            <>
              <div
                className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm"
                onScroll={(e) => {
                  const el = e.currentTarget
                  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReglamentoLeido(true)
                }}
              >
                <p className="mb-3 font-semibold">Reglas del Gimnasio Universitario</p>
                <ul className="list-disc space-y-2 pl-5">
                  {REGLAS_GIMNASIO.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={reglamentoLeido}
                  onChange={(e) => setReglamentoLeido(e.target.checked)}
                />
                He leído el reglamento completo
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={aceptaReglamento}
                  onChange={(e) => setAceptaReglamento(e.target.checked)}
                />
                Acepto cumplir el reglamento interno del gimnasio
              </label>
            </>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <SiNoField
                label="¿Tiene antecedentes de enfermedades cardiovasculares?"
                value={antecedentesCardio}
                onChange={setAntecedentesCardio}
                detalle={antecedentesCardioDet}
                onDetalleChange={setAntecedentesCardioDet}
              />
              <SiNoField
                label="¿Se le ha realizado algún procedimiento cardiovascular?"
                value={procCardio}
                onChange={setProcCardio}
                detalle={procCardioDet}
                onDetalleChange={setProcCardioDet}
              />
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">¿Padece alguna de las siguientes condiciones?</p>
                {CONDICIONES_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={condiciones[key]}
                      onChange={(e) =>
                        setCondiciones((c) => ({ ...c, [key]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
                {Object.values(condiciones).some(Boolean) && (
                  <textarea
                    className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Detalle de condiciones marcadas"
                    value={condicionesDetalle}
                    onChange={(e) => setCondicionesDetalle(e.target.value)}
                  />
                )}
              </div>
              <SiNoField
                label="¿Le realizaron alguna intervención quirúrgica?"
                value={intervencion}
                onChange={setIntervencion}
                detalle={intervencionDet}
                onDetalleChange={setIntervencionDet}
              />
              <SiNoField
                label="¿Ha sufrido fracturas óseas?"
                value={fracturas}
                onChange={setFracturas}
                detalle={fracturasDet}
                onDetalleChange={setFracturasDet}
              />
              <SiNoField
                label="¿Ha sufrido síntomas durante la práctica deportiva (deshidratación, mareos, pérdida de conocimiento)?"
                value={sintomas}
                onChange={setSintomas}
                detalle={sintomasDet}
                onDetalleChange={setSintomasDet}
              />
            </div>
          )}

          {paso === 3 && (
            <>
              <p className="whitespace-pre-line rounded-md border bg-muted/30 p-4 text-sm">
                {DECLARACION_JURADA}
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={declaracion}
                  onChange={(e) => setDeclaracion(e.target.checked)}
                />
                Acepto la declaración jurada
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firma">Aclaración de firma (nombre completo)</Label>
                  <Input
                    id="firma"
                    value={firmaNombre}
                    onChange={(e) => setFirmaNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firma-ci">C.I.</Label>
                  <Input
                    id="firma-ci"
                    value={firmaCi}
                    onChange={(e) => setFirmaCi(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Al enviar, confirmas que los datos son verídicos. La ficha tendrá vigencia de 6 meses.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (paso === 0) setModo('ver')
            else setPaso((p) => p - 1)
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {paso === 0 ? 'Cancelar' : 'Anterior'}
        </Button>
        {paso < PASOS.length - 1 ? (
          <Button
            onClick={() => {
              if (validarPaso()) setPaso((p) => p + 1)
            }}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={enviar} disabled={createMut.isPending}>
            {createMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Enviar ficha
          </Button>
        )}
      </div>
    </div>
  )
}
