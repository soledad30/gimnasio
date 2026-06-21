import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'
import { Dumbbell, Pencil, Target, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, ejerciciosApi, rutinasApi } from '@/api/services'
import type { Rutina } from '@/types'
import { PageHeader } from '@/components/crud/PageHeader'
import { OBJETIVOS_RUTINA, objetivoLabel } from '@/constants/objetivos'
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

type ModalMode = 'create' | 'edit' | null

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function InstructorRutinasPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Rutina | null>(null)
  const [assignRow, setAssignRow] = useState<Rutina | null>(null)
  const [objetivoFiltro, setObjetivoFiltro] = useState('')
  const [ejercicioConfig, setEjercicioConfig] = useState<
    Record<number, { series: number; repeticiones: string }>
  >({})

  const { data: plantillas = [], isLoading } = useQuery({
    queryKey: ['instructor-rutinas'],
    queryFn: () => rutinasApi.misAsignadas().then((r) => r.data),
  })

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['instructor-rutinas-asignadas'],
    queryFn: () => rutinasApi.asignaciones().then((r) => r.data),
  })

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
    enabled: assignRow !== null,
  })

  const { data: ejercicios = [] } = useQuery({
    queryKey: ['ejercicios', objetivoFiltro],
    queryFn: () => ejerciciosApi.list(objetivoFiltro || undefined).then((r) => r.data),
    enabled: mode !== null,
  })

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setObjetivoFiltro(selected.objetivo ?? '')
      const cfg: Record<number, { series: number; repeticiones: string }> = {}
      selected.ejercicios?.forEach((e) => {
        cfg[e.ejercicio_id] = {
          series: e.series ?? 3,
          repeticiones: e.repeticiones ?? '12',
        }
      })
      setEjercicioConfig(cfg)
    } else if (mode === 'create') {
      setObjetivoFiltro('')
      setEjercicioConfig({})
    }
  }, [mode, selected])

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => rutinasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-rutinas'] })
      qc.invalidateQueries({ queryKey: ['instructor-panel'] })
      setMode(null)
      toast.success('Plantilla de rutina creada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      rutinasApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-rutinas'] })
      setMode(null)
      setSelected(null)
      toast.success('Rutina actualizada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const assignMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { estudiante_id: number; notas_asignacion?: string } }) =>
      rutinasApi.asignar(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-rutinas-asignadas'] })
      setAssignRow(null)
      toast.success('Rutina asignada al estudiante')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!objetivoFiltro) {
      toast.error('Selecciona un objetivo')
      return
    }
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      nombre: fd.get('nombre') as string,
      objetivo: objetivoFiltro,
      ejercicios: Object.entries(ejercicioConfig).map(([id, cfg]) => ({
        ejercicio_id: Number(id),
        series: cfg.series,
        repeticiones: cfg.repeticiones,
      })),
    }
    if (mode === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, body })
    } else {
      createMut.mutate(body)
    }
  }

  const onAssign = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!assignRow) return
    const fd = new FormData(e.currentTarget)
    const estudianteId = Number(fd.get('estudiante_id'))
    if (!estudianteId) {
      toast.error('Selecciona un estudiante')
      return
    }
    assignMut.mutate({
      id: assignRow.id,
      body: {
        estudiante_id: estudianteId,
        notas_asignacion: (fd.get('notas_asignacion') as string) || undefined,
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Rutinas"
        description="Crea plantillas por objetivo y asígnalas a estudiantes según su evaluación"
        onCreate={() => {
          setSelected(null)
          setMode('create')
        }}
        createLabel="Nueva plantilla"
      />

      {isLoading ? (
        <Skeleton className="mt-6 h-32 w-full" />
      ) : plantillas.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Dumbbell className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No tienes plantillas aún</p>
            <p className="text-sm text-muted-foreground">
              Crea rutinas por objetivo (definición, ganancia muscular, etc.)
            </p>
            <Button className="mt-4" onClick={() => setMode('create')}>
              Nueva plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plantillas.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{r.nombre}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" />
                  {objetivoLabel(r.objetivo)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {r.ejercicios?.length ?? 0} ejercicio(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAssignRow(r)}>
                    <UserPlus className="mr-1 h-4 w-4" />
                    Asignar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelected(r)
                      setMode('edit')
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {asignaciones.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Asignadas a estudiantes</CardTitle>
            <CardDescription>{asignaciones.length} asignación(es)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {asignaciones.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{r.estudiante_nombre ?? 'Estudiante'}</span>
                  <span className="text-muted-foreground"> · {r.nombre} · {objetivoLabel(r.objetivo)}</span>
                </div>
                {r.notas_asignacion && (
                  <Badge variant="outline" className="text-xs">
                    {r.notas_asignacion}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={mode === 'create' || mode === 'edit'} onOpenChange={() => setMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          </DialogHeader>
          <form id="inst-rut-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <select
                id="objetivo"
                name="objetivo"
                value={objetivoFiltro}
                onChange={(e) => setObjetivoFiltro(e.target.value)}
                className={selectClassName}
                required
                aria-label="Objetivo"
              >
                <option value="">Seleccionar objetivo…</option>
                {OBJETIVOS_RUTINA.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ejercicios</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {ejercicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {objetivoFiltro
                      ? 'No hay ejercicios para este objetivo.'
                      : 'Elige un objetivo para ver ejercicios sugeridos.'}
                  </p>
                ) : (
                  ejercicios.map((ej) => {
                    const checked = !!ejercicioConfig[ej.id]
                    return (
                      <div
                        key={ej.id}
                        className={`rounded-md border p-2 ${checked ? 'border-primary/40 bg-primary/5' : 'border-transparent'}`}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEjercicioConfig((prev) =>
                                prev[ej.id]
                                  ? Object.fromEntries(
                                      Object.entries(prev).filter(([k]) => Number(k) !== ej.id)
                                    )
                                  : { ...prev, [ej.id]: { series: 3, repeticiones: '12' } }
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-input"
                          />
                          <span className="font-medium">{ej.nombre}</span>
                        </label>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="inst-rut-form" disabled={createMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignRow !== null} onOpenChange={() => setAssignRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rutina</DialogTitle>
          </DialogHeader>
          {assignRow && (
            <form id="inst-assign-form" onSubmit={onAssign} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {assignRow.nombre} · {objetivoLabel(assignRow.objetivo)}
              </p>
              <div className="space-y-2">
                <Label htmlFor="estudiante_id">Estudiante</Label>
                <select
                  id="estudiante_id"
                  name="estudiante_id"
                  required
                  className={selectClassName}
                  aria-label="Estudiante"
                >
                  <option value="">Seleccionar…</option>
                  {estudiantes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas_asignacion">Notas de evaluación</Label>
                <textarea
                  id="notas_asignacion"
                  name="notas_asignacion"
                  rows={3}
                  placeholder="Resultado de evaluación, meta del estudiante…"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRow(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="inst-assign-form" disabled={assignMut.isPending}>
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
