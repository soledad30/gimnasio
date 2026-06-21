import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { horariosApi, instructoresApi, salasApi } from '@/api/services'
import type { AsignacionInstructor, TurnoCoach } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DIAS_ACTIVIDAD } from '@/lib/diasSemana'
import {
  VIGENCIA_LABELS,
  VIGENCIA_TIPOS,
  inicioMesDefault,
} from '@/constants/vigencia'

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

function aniosDisponibles() {
  const y = new Date().getFullYear()
  return [y - 1, y, y + 1]
}

function fechaDesdeMesAnio(mes: number, anio: number) {
  return `${anio}-${String(mes).padStart(2, '0')}-01`
}

function etiquetaMesAnio(mes: number, anio: number) {
  const nombre = MESES.find((m) => m.value === mes)?.label ?? String(mes)
  return `${nombre} ${anio}`
}


function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function diaSemanaLabel(dia: string): string {
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}

function esTurnoManana(horaInicio: string) {
  const h = Number(horaInicio.slice(0, 2))
  return h < 13
}

function esTurnoCompleto(a: AsignacionInstructor) {
  const [hi, mi] = a.hora_inicio.split(':').map(Number)
  const [hf, mf] = a.hora_fin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi) >= 360
}

function ListaCoachesTurno({
  titulo,
  asignaciones,
  max,
  onDelete,
  deleting,
}: {
  titulo: string
  asignaciones: AsignacionInstructor[]
  max: number
  onDelete: (id: number) => void
  deleting: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{titulo}</p>
        <Badge variant={asignaciones.length >= max ? 'success' : 'secondary'}>
          {asignaciones.length}/{max}
        </Badge>
      </div>
      {asignaciones.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin coaches asignados.</p>
      ) : (
        <ul className="space-y-2">
          {asignaciones.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{a.instructor_nombre}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · entrada {a.hora_inicio} · salida {a.hora_fin}
                </span>
                {a.vigencia_label && (
                  <p className="text-xs text-muted-foreground">{a.vigencia_label}</p>
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(a.id)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function HorariosPage() {
  const qc = useQueryClient()
  const hoy = new Date()
  const [fecha, setFecha] = useState(hoyISO())
  const [mesCoaches, setMesCoaches] = useState(hoy.getMonth() + 1)
  const [anioCoaches, setAnioCoaches] = useState(hoy.getFullYear())
  const [salaVistaId, setSalaVistaId] = useState<number | null>(null)

  const fechaCoaches = useMemo(
    () => fechaDesdeMesAnio(mesCoaches, anioCoaches),
    [mesCoaches, anioCoaches]
  )
  const [vigenciaInicio, setVigenciaInicio] = useState(fechaCoaches)

  useEffect(() => {
    setVigenciaInicio(fechaCoaches)
  }, [fechaCoaches])

  const { data: config } = useQuery({
    queryKey: ['horarios-config'],
    queryFn: () => horariosApi.config().then((r) => r.data),
  })

  const { data: salas = [] } = useQuery({
    queryKey: ['salas'],
    queryFn: () => salasApi.list().then((r) => r.data),
  })

  const { data: instructores = [] } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => instructoresApi.list().then((r) => r.data),
  })

  const { data: staffing, isLoading: loadingStaffing } = useQuery({
    queryKey: ['staffing', fecha],
    queryFn: () => horariosApi.staffing(fecha).then((r) => r.data),
  })

  const { data: asignaciones = [], isLoading: loadingAsig } = useQuery({
    queryKey: ['asignaciones', fechaCoaches, 'coach_maquinas'],
    queryFn: () => horariosApi.asignaciones(fechaCoaches, 'coach_maquinas').then((r) => r.data),
  })

  const { data: semanal, isLoading: loadingSemanal } = useQuery({
    queryKey: ['disponibilidad-semanal', fecha],
    queryFn: () => horariosApi.disponibilidadSemanal(fecha).then((r) => r.data),
  })

  const semanalMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof semanal>['celdas'][0]>()
    for (const c of semanal?.celdas ?? []) {
      map.set(`${c.dia_semana}-${c.sala_id}-${c.hora_inicio}`, c)
    }
    return map
  }, [semanal])

  const salasSemanal = semanal?.salas ?? []
  const bloquesSemanal = semanal?.bloques ?? config?.bloques ?? []
  const diasSemanal = semanal?.dias ?? [...DIAS_ACTIVIDAD]
  const salaVista = salasSemanal.find((s) => s.id === salaVistaId) ?? salasSemanal[0] ?? null

  useEffect(() => {
    if (salasSemanal.length && (salaVistaId === null || !salasSemanal.some((s) => s.id === salaVistaId))) {
      setSalaVistaId(salasSemanal[0].id)
    }
  }, [salasSemanal, salaVistaId])

  const salaMaquinas = salas.find((s) => s.tipo === 'maquinas')
  const bloques = config?.bloques ?? []
  const turnosCoach: TurnoCoach[] = config?.turnos_coach ?? []

  const coachesTurno = useMemo(() => {
    const validas = asignaciones.filter(esTurnoCompleto)
    return {
      manana: validas.filter((a) => esTurnoManana(a.hora_inicio)),
      tarde: validas.filter((a) => !esTurnoManana(a.hora_inicio)),
    }
  }, [asignaciones])

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => horariosApi.crearAsignacion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones', fechaCoaches] })
      qc.invalidateQueries({ queryKey: ['staffing', fecha] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-semanal'] })
      toast.success('Coach asignado en sala de máquinas')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => horariosApi.eliminarAsignacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones', fechaCoaches] })
      qc.invalidateQueries({ queryKey: ['staffing', fecha] })
      toast.success('Asignación eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onFechaChange = (iso: string) => {
    setFecha(iso)
  }

  const onSubmitCoach = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (!salaMaquinas) {
      toast.error('No hay sala de máquinas configurada')
      return
    }
    createMut.mutate({
      instructor_id: Number(fd.get('instructor_id')),
      sala_id: salaMaquinas.id,
      turno: fd.get('turno'),
      tipo: 'coach_maquinas',
      vigencia_tipo: (fd.get('vigencia_tipo') as string) || 'mes',
      vigencia_inicio: (fd.get('vigencia_inicio') as string) || inicioMesDefault(),
    })
    e.currentTarget.reset()
  }

  const maxManana = config?.min_coaches_manana ?? 2
  const maxTarde = config?.min_coaches_tarde ?? 2

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Horarios UAGRM-GYM</h1>
        <p className="text-muted-foreground">
          Operación {config?.hora_apertura ?? '07:00'} – {config?.hora_cierre ?? '19:00'} · Actividades
          por bloques de 1 h · Sala máquinas: 2 turnos (mañana y tarde)
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Consultar fecha</Label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => onFechaChange(e.target.value)}
            className="w-44"
          />
          <p className="text-xs text-muted-foreground">
            Staff, coaches y grilla según vigencia activa o heredada en esta fecha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Actividades: máx. {config?.capacidad_actividad ?? 20}/h</Badge>
          <Badge variant="outline">Máquinas: máx. {config?.capacidad_maquinas ?? 30}/h</Badge>
        </div>
      </div>

      {loadingStaffing ? (
        <Skeleton className="h-28 w-full" />
      ) : staffing && (
        <Card className={cn(!staffing.staffing_ok && 'border-amber-500/50')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" />
              Staff mínimo del día
            </CardTitle>
            <CardDescription>
              {staffing.coaches_manana}/{staffing.coaches_manana_requeridos} coaches mañana ·{' '}
              {staffing.coaches_tarde}/{staffing.coaches_tarde_requeridos} coaches tarde ·{' '}
              {staffing.entrenadores_actividad}/{staffing.entrenadores_actividad_requeridos}{' '}
              entrenadores en actividades
            </CardDescription>
          </CardHeader>
          {staffing.alertas.length > 0 && (
            <CardContent className="space-y-2">
              {staffing.alertas.map((a) => (
                <p key={a} className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {a}
                </p>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asignar coach — sala de máquinas</CardTitle>
            <CardDescription>
              Solo 2 turnos: mañana (entrada {turnosCoach[0]?.hora_inicio ?? '07:00'}) y tarde
              (entrada {turnosCoach[1]?.hora_inicio ?? '13:00'}). Máximo 2 coaches por turno y
              periodo (mes, trimestre, semestre o anual).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmitCoach} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instructor_id">Entrenador</Label>
                <select
                  id="instructor_id"
                  name="instructor_id"
                  required
                  className={selectClassName}
                  aria-label="Entrenador"
                >
                  <option value="">Seleccionar...</option>
                  {instructores.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <select
                  id="turno"
                  name="turno"
                  required
                  className={selectClassName}
                  aria-label="Turno"
                >
                  <option value="">Seleccionar turno...</option>
                  {turnosCoach.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.hora_inicio} – {t.hora_fin})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vigencia_tipo">Vigencia</Label>
                  <select
                    id="vigencia_tipo"
                    name="vigencia_tipo"
                    defaultValue="mes"
                    className={selectClassName}
                    aria-label="Tipo de vigencia"
                  >
                    {VIGENCIA_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {VIGENCIA_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vigencia_inicio">Inicio del periodo</Label>
                  <Input
                    id="vigencia_inicio"
                    name="vigencia_inicio"
                    type="date"
                    value={vigenciaInicio}
                    onChange={(e) => setVigenciaInicio(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Asignar coach
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="space-y-3">
              <CardTitle>Coaches vigentes — {etiquetaMesAnio(mesCoaches, anioCoaches)}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="mes-coaches"
                    className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Mes
                  </Label>
                  <select
                    id="mes-coaches"
                    value={mesCoaches}
                    onChange={(e) => setMesCoaches(Number(e.target.value))}
                    className={cn(selectClassName, 'h-9 min-w-[120px]')}
                    aria-label="Filtrar por mes"
                  >
                    {MESES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="anio-coaches"
                    className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Año
                  </Label>
                  <select
                    id="anio-coaches"
                    value={anioCoaches}
                    onChange={(e) => setAnioCoaches(Number(e.target.value))}
                    className={cn(selectClassName, 'h-9 min-w-[90px]')}
                    aria-label="Filtrar por año"
                  >
                    {aniosDisponibles().map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <CardDescription>
                Sala de máquinas · 2 coaches por turno · periodo activo o heredado en el mes
                seleccionado
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingAsig ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <ListaCoachesTurno
                  titulo="Turno mañana"
                  asignaciones={coachesTurno.manana}
                  max={maxManana}
                  onDelete={(id) => deleteMut.mutate(id)}
                  deleting={deleteMut.isPending}
                />
                <ListaCoachesTurno
                  titulo="Turno tarde"
                  asignaciones={coachesTurno.tarde}
                  max={maxTarde}
                  onDelete={(id) => deleteMut.mutate(id)}
                  deleting={deleteMut.isPending}
                />
                {asignaciones.some((a) => !esTurnoCompleto(a)) && (
                  <p className="text-xs text-amber-500">
                    Hay asignaciones antiguas por hora suelta. Elimínalas y vuelve a asignar por
                    turno completo.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Disponibilidad salas de actividades</CardTitle>
            <CardDescription>
              Horario semanal (Lunes–Viernes) vigente al {fecha}. Elige una sala para ver su
              ocupación. Sincronizado con Actividades.
            </CardDescription>
          </div>
          {salasSemanal.length > 0 && (
            <div className="flex shrink-0 gap-2">
              {salasSemanal.map((sala) => (
                <Button
                  key={sala.id}
                  type="button"
                  size="sm"
                  variant={salaVistaId === sala.id ? 'default' : 'outline'}
                  onClick={() => setSalaVistaId(sala.id)}
                >
                  {sala.etiqueta}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadingSemanal ? (
            <Skeleton className="h-64 w-full" />
          ) : !salaVista ? (
            <p className="text-sm text-muted-foreground">No hay salas de actividades configuradas.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Viendo: <strong>{salaVista.etiqueta}</strong> — {salaVista.nombre}
              </p>
              <table className="w-full min-w-[480px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-medium">
                      Hora
                    </th>
                    {diasSemanal.map((dia) => (
                      <th
                        key={dia}
                        className="border-l border-border/60 px-2 py-2 text-center font-medium"
                      >
                        {diaSemanaLabel(dia)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloquesSemanal.map((bloque) => (
                    <tr key={bloque} className="border-b border-border/40">
                      <td className="sticky left-0 z-10 bg-card px-2 py-1.5 font-mono text-sm">
                        {bloque}
                      </td>
                      {diasSemanal.map((dia) => {
                        const celda = semanalMap.get(`${dia}-${salaVista.id}-${bloque}`)
                        const ocupada = celda && !celda.disponible
                        return (
                          <td
                            key={`${dia}-${bloque}`}
                            className="border-l border-border/30 px-2 py-1.5 text-center"
                          >
                            {ocupada ? (
                              <Badge
                                variant="destructive"
                                className="max-w-[120px] truncate px-2 py-0.5 text-[11px] font-normal"
                                title={celda?.motivo_ocupacion ?? undefined}
                              >
                                {celda?.actividad_nombre ?? 'Ocupada'}
                              </Badge>
                            ) : (
                              <Badge variant="success" className="px-2 py-0.5 text-[11px] font-normal">
                                Libre
                              </Badge>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
