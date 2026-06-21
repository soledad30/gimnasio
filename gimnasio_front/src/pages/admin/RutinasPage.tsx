import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, ejerciciosApi, rutinasApi } from '@/api/services'
import type { Rutina } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
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

export function RutinasPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Rutina | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [assignRow, setAssignRow] = useState<Rutina | null>(null)
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
    enabled: assignRow !== null,
  })

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

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => rutinasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setMode(null)
      toast.success('Plantilla de rutina creada')
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

  const assignMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { estudiante_id: number; notas_asignacion?: string } }) =>
      rutinasApi.asignar(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setAssignRow(null)
      toast.success('Rutina asignada al estudiante')
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
    if (!objetivoFiltro) {
      toast.error('Selecciona un objetivo para la rutina')
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
        description="Plantillas por objetivo (definición, ganancia muscular, etc.). Solo admin o instructor las crea; luego se asignan al estudiante según su evaluación."
        onCreate={openCreate}
        createLabel="Nueva plantilla"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Plantillas disponibles</CardTitle>
          <CardDescription>{data.length} plantilla(s)</CardDescription>
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
                  <TableHead>Creada por</TableHead>
                  <TableHead>Ejercicios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell>{objetivoLabel(r.objetivo)}</TableCell>
                    <TableCell>{r.instructor_nombre ?? 'Administración'}</TableCell>
                    <TableCell>{r.ejercicios?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAssignRow(r)}
                        >
                          <UserPlus className="mr-1 h-4 w-4" />
                          Asignar
                        </Button>
                        <RowActions
                          onView={() => {
                            setSelected(r)
                            setMode('view')
                          }}
                          onEdit={() => openEdit(r)}
                          onDelete={() => setDeleteId(r.id)}
                        />
                      </div>
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
            <DialogTitle>{mode === 'edit' ? 'Editar plantilla' : 'Nueva plantilla de rutina'}</DialogTitle>
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
                required
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
                        {checked && (
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

      <Dialog open={assignRow !== null} onOpenChange={() => setAssignRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rutina a estudiante</DialogTitle>
          </DialogHeader>
          {assignRow && (
            <form id="assign-form" onSubmit={onAssign} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Plantilla: <strong>{assignRow.nombre}</strong> · {objetivoLabel(assignRow.objetivo)}
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
                  <option value="">Seleccionar estudiante…</option>
                  {estudiantes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas_asignacion">Notas de evaluación (opcional)</Label>
                <textarea
                  id="notas_asignacion"
                  name="notas_asignacion"
                  placeholder="Ej.: evaluación inicial, objetivo definición, restricciones…"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRow(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="assign-form" disabled={assignMut.isPending}>
              Asignar rutina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de plantilla</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <DetailGrid
                items={[
                  { label: 'ID', value: selected.id },
                  { label: 'Nombre', value: selected.nombre },
                  { label: 'Objetivo', value: objetivoLabel(selected.objetivo) },
                  { label: 'Creada por', value: selected.instructor_nombre ?? 'Administración' },
                  { label: 'Creada', value: new Date(selected.created_at).toLocaleString() },
                ]}
              />
              {selected.ejercicios && selected.ejercicios.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Ejercicios incluidos</p>
                  <ul className="space-y-2 text-sm">
                    {selected.ejercicios.map((ej) => (
                      <li
                        key={ej.ejercicio_id}
                        className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                      >
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
            {selected && (
              <>
                <Button variant="outline" onClick={() => setAssignRow(selected)}>
                  Asignar
                </Button>
                <Button onClick={() => openEdit(selected)}>Editar</Button>
              </>
            )}
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
