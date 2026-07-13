import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { actividadesApi, horariosApi, instructoresApi, salasApi } from '@/api/services'
import type { Actividad } from '@/types'
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
import { cn } from '@/lib/utils'
import { DIAS_ACTIVIDAD, formatDias, horaFinDesdeInicio, joinDias, parseDias } from '@/lib/diasSemana'
import {
  VIGENCIA_LABELS,
  VIGENCIA_TIPOS,
  formatVigencia,
  inicioMesDefault,
} from '@/constants/vigencia'

type ModalMode = 'create' | 'edit' | 'view' | null

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

const horarioLabel = (a: Actividad) => {
  const parts = []
  const dias = a.dias_semana?.length ? a.dias_semana : parseDias(a.dia_semana)
  if (dias.length) parts.push(formatDias(dias.join(',')))
  if (a.hora_inicio && a.hora_fin) parts.push(`${a.hora_inicio} - ${a.hora_fin}`)
  return parts.join(' · ') || '—'
}

export function ActividadesPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Actividad | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selectedDias, setSelectedDias] = useState<string[]>([])

  useEffect(() => {
    if (mode === 'create') {
      setSelectedDias([])
    } else if (mode === 'edit' && selected) {
      const dias = selected.dias_semana?.length ? selected.dias_semana : parseDias(selected.dia_semana)
      setSelectedDias(dias.filter((d) => (DIAS_ACTIVIDAD as readonly string[]).includes(d)))
    }
  }, [mode, selected])

  const { data = [], isLoading } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => actividadesApi.list().then((r) => r.data),
  })

  const { data: salas = [] } = useQuery({
    queryKey: ['salas'],
    queryFn: () => salasApi.list().then((r) => r.data),
  })

  const { data: instructores = [] } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => instructoresApi.list().then((r) => r.data),
  })

  const { data: config } = useQuery({
    queryKey: ['horarios-config'],
    queryFn: () => horariosApi.config().then((r) => r.data),
  })

  const salasActividad = salas.filter((s) => s.tipo === 'actividad')
  const bloques = config?.bloques ?? []

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => actividadesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-semanal'] })
      setMode(null)
      toast.success('Actividad creada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      actividadesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-semanal'] })
      setMode(null)
      setSelected(null)
      toast.success('Actividad actualizada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => actividadesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad-semanal'] })
      setDeleteId(null)
      toast.success('Actividad eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedDias.length === 0) {
      toast.error('Selecciona al menos un día de la semana')
      return
    }
    const fd = new FormData(e.currentTarget)
    const horaInicio = (fd.get('hora_inicio') as string) || null
    const body: Record<string, unknown> = {
      nombre: fd.get('nombre') as string,
      descripcion: fd.get('descripcion') || null,
      dias_semana: selectedDias,
      dia_semana: joinDias(selectedDias),
      hora_inicio: horaInicio,
      hora_fin: horaInicio ? horaFinDesdeInicio(horaInicio) : null,
      sala_id: fd.get('sala_id') ? Number(fd.get('sala_id')) : null,
      instructor_id: fd.get('instructor_id') ? Number(fd.get('instructor_id')) : null,
      capacidad: Number(fd.get('capacidad')),
      vigencia_tipo: (fd.get('vigencia_tipo') as string) || 'mes',
      vigencia_inicio: (fd.get('vigencia_inicio') as string) || inicioMesDefault(),
    }
    if (mode === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, body })
    } else {
      createMut.mutate(body)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividades"
        //description="Clases en salas (7:00–19:00, bloques de 1 h, máx. 20 personas)"
        onCreate={() => {
          setSelected(null)
          setMode('create')
        }}
        createLabel="Nueva actividad"
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} actividad(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Entrenador</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.sala_nombre ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.instructor_nombre ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{horarioLabel(a)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatVigencia(a.vigencia_tipo, a.vigencia_inicio, a.vigencia_fin, a.vigencia_label)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a.capacidad} cupos</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => {
                          setSelected(a)
                          setMode('view')
                        }}
                        onEdit={() => {
                          setSelected(a)
                          setMode('edit')
                        }}
                        onDelete={() => setDeleteId(a.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
          </DialogHeader>
          <form id="act-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" name="descripcion" defaultValue={selected?.descripcion ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Días de la semana</Label>
              
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DIAS_ACTIVIDAD.map((d) => {
                  const checked = selectedDias.includes(d)
                  return (
                    <label
                      key={d}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                        checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedDias((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                          )
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sala_id">Sala de actividades</Label>
                <select
                  id="sala_id"
                  name="sala_id"
                  required
                  defaultValue={selected?.sala_id ?? ''}
                  className={selectClassName}
                  aria-label="Sala"
                >
                  <option value="">Seleccionar sala...</option>
                  {salasActividad.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} (máx. {s.capacidad})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor_id">Entrenador</Label>
                <select
                  id="instructor_id"
                  name="instructor_id"
                  required
                  defaultValue={selected?.instructor_id ?? ''}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Bloque horario (1 hora)</Label>
              <select
                id="hora_inicio"
                name="hora_inicio"
                required
                defaultValue={selected?.hora_inicio ?? ''}
                className={selectClassName}
                aria-label="Bloque horario"
              >
                <option value="">Seleccionar...</option>
                {bloques.map((b) => (
                  <option key={b} value={b}>
                    {b} – {String(Number(b.slice(0, 2)) + 1).padStart(2, '0')}:{b.slice(3)}
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
                  defaultValue={selected?.vigencia_tipo ?? 'mes'}
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
                  defaultValue={selected?.vigencia_inicio ?? inicioMesDefault()}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacidad">Capacidad (cupos)</Label>
              <Input
                id="capacidad"
                name="capacidad"
                type="number"
                min={1}
                max={config?.capacidad_actividad ?? 20}
                defaultValue={selected?.capacidad ?? 20}
                required
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="act-form" disabled={createMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de actividad</DialogTitle>
          </DialogHeader>
          {selected && (
            <DetailGrid
              items={[
                { label: 'ID', value: selected.id },
                { label: 'Nombre', value: selected.nombre },
                { label: 'Descripción', value: selected.descripcion },
                { label: 'Horario', value: horarioLabel(selected) },
                { label: 'Sala', value: selected.sala_nombre ?? '—' },
                { label: 'Entrenador', value: selected.instructor_nombre ?? '—' },
                {
                  label: 'Vigencia',
                  value: formatVigencia(
                    selected.vigencia_tipo,
                    selected.vigencia_inicio,
                    selected.vigencia_fin,
                    selected.vigencia_label
                  ),
                },
                { label: 'Capacidad', value: selected.capacidad },
                { label: 'Creada', value: new Date(selected.created_at).toLocaleString() },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cerrar
            </Button>
            {selected && (
              <Button
                onClick={() => {
                  setMode('edit')
                }}
              >
                Editar
              </Button>
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
    </div>
  )
}
