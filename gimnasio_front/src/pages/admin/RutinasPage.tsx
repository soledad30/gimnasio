import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, ejerciciosApi, instructoresApi, rutinasApi } from '@/api/services'
import type { Rutina } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
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

type ModalMode = 'create' | 'edit' | 'view' | null

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const OBJETIVOS = [
  { value: 'abdomen', label: 'Abdomen / core' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'perdida_peso', label: 'Pérdida de peso' },
  { value: 'flexibilidad', label: 'Flexibilidad' },
  { value: 'general', label: 'General' },
]

export function RutinasPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Rutina | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [objetivoFiltro, setObjetivoFiltro] = useState('')
  const [ejercicioConfig, setEjercicioConfig] = useState<
    Record<number, { series: number; repeticiones: string }>
  >({})

  const { data = [], isLoading } = useQuery({
    queryKey: ['rutinas'],
    queryFn: () => rutinasApi.list().then((r) => r.data),
  })

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const { data: instructores = [] } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => instructoresApi.list().then((r) => r.data),
  })

  const estudianteNombre = useMemo(
    () => new Map(estudiantes.map((e) => [e.id, e.nombre])),
    [estudiantes]
  )

  const instructorNombre = useMemo(
    () => new Map(instructores.map((i) => [i.id, i.nombre])),
    [instructores]
  )

  const { data: ejercicios = [] } = useQuery({
    queryKey: ['ejercicios', objetivoFiltro],
    queryFn: () => ejerciciosApi.list(objetivoFiltro || undefined).then((r) => r.data),
    enabled: mode === 'create' || mode === 'edit',
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

  const objetivoLabel = (value?: string | null) =>
    OBJETIVOS.find((o) => o.value === value)?.label ?? value ?? '—'

  const openCreate = () => {
    setSelected(null)
    setMode('create')
  }

  const openEdit = (r: Rutina) => {
    setSelected(r)
    setMode('edit')
  }

  const toggleEjercicio = (id: number) => {
    setEjercicioConfig((prev) => {
      if (prev[id]) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: { series: 3, repeticiones: '12' } }
    })
  }

  const updateEjercicioConfig = (
    id: number,
    field: 'series' | 'repeticiones',
    value: string | number
  ) => {
    setEjercicioConfig((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const nombreEstudiante = (id?: number | null) =>
    id ? estudianteNombre.get(id) ?? `Estudiante #${id}` : '—'

  const nombreInstructor = (id?: number | null) =>
    id ? instructorNombre.get(id) ?? `Instructor #${id}` : '—'

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => rutinasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setMode(null)
      toast.success('Rutina creada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      rutinasApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setMode(null)
      setSelected(null)
      toast.success('Rutina actualizada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => rutinasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setDeleteId(null)
      toast.success('Rutina eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      nombre: fd.get('nombre') as string,
      objetivo: objetivoFiltro || null,
      ejercicios: Object.entries(ejercicioConfig).map(([id, cfg]) => ({
        ejercicio_id: Number(id),
        series: cfg.series,
        repeticiones: cfg.repeticiones,
      })),
    }
    const est = fd.get('estudiante_id') as string
    if (est) body.estudiante_id = Number(est)
    const inst = fd.get('instructor_id') as string
    if (inst) body.instructor_id = Number(inst)

    if (mode === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, body })
    } else {
      createMut.mutate(body)
    }
  }

  return (
    <>
      <PageHeader
        title="Rutinas"
        description="Planes de entrenamiento"
        onCreate={openCreate}
        createLabel="Nueva rutina"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} rutina(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Ejercicios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell>{objetivoLabel(r.objetivo)}</TableCell>
                    <TableCell>{nombreEstudiante(r.estudiante_id)}</TableCell>
                    <TableCell>{nombreInstructor(r.instructor_id)}</TableCell>
                    <TableCell>{r.ejercicios?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => {
                          setSelected(r)
                          setMode('view')
                        }}
                        onEdit={() => openEdit(r)}
                        onDelete={() => setDeleteId(r.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={mode === 'create' || mode === 'edit'} onOpenChange={() => setMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar rutina' : 'Nueva rutina'}</DialogTitle>
          </DialogHeader>
          <form id="rut-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <select
                id="objetivo"
                name="objetivo"
                aria-label="Objetivo de la rutina"
                value={objetivoFiltro}
                onChange={(e) => setObjetivoFiltro(e.target.value)}
                className={selectClassName}
              >
                <option value="">Seleccionar objetivo…</option>
                {OBJETIVOS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ejercicios de la rutina</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona según el objetivo. Incluye ejercicios con y sin máquina.
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {ejercicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {objetivoFiltro
                      ? 'No hay ejercicios para este objetivo. Créalos en Ejercicios.'
                      : 'Elige un objetivo para ver ejercicios sugeridos.'}
                  </p>
                ) : (
                  ejercicios.map((ej) => {
                    const selected = !!ejercicioConfig[ej.id]
                    return (
                      <div
                        key={ej.id}
                        className={`rounded-md border p-2 ${selected ? 'border-primary/40 bg-primary/5' : 'border-transparent'}`}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleEjercicio(ej.id)}
                            className="mt-1 h-4 w-4 rounded border-input"
                            aria-label={`Seleccionar ${ej.nombre}`}
                          />
                          <span className="flex-1">
                            <span className="font-medium">{ej.nombre}</span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">
                                {ej.con_maquina ? ej.maquina_nombre || 'Con máquina' : 'Sin máquina'}
                              </Badge>
                              {ej.grupo_muscular && (
                                <Badge variant="secondary" className="text-xs">
                                  {ej.grupo_muscular}
                                </Badge>
                              )}
                            </span>
                          </span>
                        </label>
                        {selected && (
                          <div className="mt-2 ml-7 flex gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Series</Label>
                              <Input
                                type="number"
                                min={1}
                                value={ejercicioConfig[ej.id].series}
                                onChange={(e) =>
                                  updateEjercicioConfig(ej.id, 'series', Number(e.target.value))
                                }
                                className="h-8 w-20"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Repeticiones</Label>
                              <Input
                                value={ejercicioConfig[ej.id].repeticiones}
                                onChange={(e) =>
                                  updateEjercicioConfig(ej.id, 'repeticiones', e.target.value)
                                }
                                placeholder="12 o 30 seg"
                                className="h-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              {Object.keys(ejercicioConfig).length > 0 && (
                <p className="text-xs text-primary">
                  {Object.keys(ejercicioConfig).length} ejercicio(s) seleccionado(s)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="estudiante_id">Estudiante (opcional)</Label>
              <select
                id="estudiante_id"
                name="estudiante_id"
                aria-label="Estudiante"
                defaultValue={selected?.estudiante_id ?? ''}
                className={selectClassName}
              >
                <option value="">Sin asignar</option>
                {estudiantes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor_id">Instructor (opcional)</Label>
              <select
                id="instructor_id"
                name="instructor_id"
                aria-label="Instructor"
                defaultValue={selected?.instructor_id ?? ''}
                className={selectClassName}
              >
                <option value="">Sin asignar</option>
                {instructores.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="rut-form" disabled={createMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de rutina</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <DetailGrid
                items={[
                  { label: 'ID', value: selected.id },
                  { label: 'Nombre', value: selected.nombre },
                  { label: 'Objetivo', value: objetivoLabel(selected.objetivo) },
                  { label: 'Estudiante', value: nombreEstudiante(selected.estudiante_id) },
                  { label: 'Instructor', value: nombreInstructor(selected.instructor_id) },
                  { label: 'Creada', value: new Date(selected.created_at).toLocaleString() },
                ]}
              />
              {selected.ejercicios && selected.ejercicios.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Ejercicios incluidos</p>
                  <ul className="space-y-2 text-sm">
                    {selected.ejercicios.map((ej) => (
                      <li key={ej.ejercicio_id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                        <div>
                          <span className="font-medium">{ej.nombre}</span>
                          {(ej.series || ej.repeticiones) && (
                            <p className="text-xs text-muted-foreground">
                              {ej.series ?? '—'} series × {ej.repeticiones ?? '—'}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {ej.con_maquina ? ej.maquina_nombre || 'Con máquina' : 'Sin máquina'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cerrar
            </Button>
            {selected && <Button onClick={() => openEdit(selected)}>Editar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </>
  )
}
