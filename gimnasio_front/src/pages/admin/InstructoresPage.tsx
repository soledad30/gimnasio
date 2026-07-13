import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ImageIcon, Loader2, Mail, Phone, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage, getMediaUrl } from '@/api/client'
import { actividadesApi, instructoresApi, rutinasApi } from '@/api/services'
import type { Instructor } from '@/types'
import { UserAvatar } from '@/components/acceso/UserAvatar'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { ESPECIALIDADES_COACH } from '@/constants/especialidades'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { formatDias } from '@/lib/diasSemana'

type ModalMode = 'create' | 'edit' | 'view' | null

const ESPECIALIDAD_STYLES = [
  'bg-red-500/15 text-red-700 border-red-500/40 dark:text-red-400 dark:border-red-500/30',
  'bg-cyan-500/15 text-cyan-800 border-cyan-500/40 dark:text-cyan-400 dark:border-cyan-500/30',
  'bg-amber-500/15 text-amber-900 border-amber-500/40 dark:text-amber-400 dark:border-amber-500/30',
  'bg-violet-500/15 text-violet-800 border-violet-500/40 dark:text-violet-400 dark:border-violet-500/30',
  'bg-emerald-500/15 text-emerald-800 border-emerald-500/40 dark:text-emerald-400 dark:border-emerald-500/30',
  'bg-orange-500/15 text-orange-800 border-orange-500/40 dark:text-orange-400 dark:border-orange-500/30',
]

function especialidadStyle(especialidad: string) {
  const idx =
    especialidad.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    ESPECIALIDAD_STYLES.length
  return ESPECIALIDAD_STYLES[idx]
}

function horarioLabel(act: {
  dia_semana?: string | null
  dias_semana?: string[] | null
  hora_inicio?: string | null
  hora_fin?: string | null
}) {
  const parts = []
  const dias = act.dias_semana?.length ? act.dias_semana.join(',') : act.dia_semana
  const diasFmt = formatDias(dias)
  if (diasFmt) parts.push(diasFmt)
  if (act.hora_inicio && act.hora_fin) parts.push(`${act.hora_inicio}-${act.hora_fin}`)
  return parts.join(' ')
}

function EspecialidadesBadges({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="mt-1 text-xs text-muted-foreground">Sin especialidad</p>
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {items.map((esp) => (
        <Badge key={esp} variant="outline" className={cn('border text-xs', especialidadStyle(esp))}>
          {esp}
        </Badge>
      ))}
    </div>
  )
}

export function InstructoresPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Instructor | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<string[]>([])

  const { data = [], isLoading } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => instructoresApi.list().then((r) => r.data),
  })

  const { data: rutinas = [] } = useQuery({
    queryKey: ['rutinas'],
    queryFn: () => rutinasApi.list().then((r) => r.data),
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => actividadesApi.list().then((r) => r.data),
  })

  const statsByInstructor = useMemo(() => {
    const map = new Map<
      number,
      { estudiantes: number; rutinas: number; actividades: number; horarios: string[] }
    >()
    for (const i of data) {
      map.set(i.id, { estudiantes: 0, rutinas: 0, actividades: 0, horarios: [] })
    }
    for (const r of rutinas) {
      if (!r.instructor_id) continue
      const s = map.get(r.instructor_id)
      if (s) s.rutinas += 1
    }
    const estudiantesPorInstructor = new Map<number, Set<number>>()
    for (const r of rutinas) {
      if (!r.instructor_id || !r.estudiante_id) continue
      if (!estudiantesPorInstructor.has(r.instructor_id)) {
        estudiantesPorInstructor.set(r.instructor_id, new Set())
      }
      estudiantesPorInstructor.get(r.instructor_id)!.add(r.estudiante_id)
    }
    for (const [instId, set] of estudiantesPorInstructor) {
      const s = map.get(instId)
      if (s) s.estudiantes = set.size
    }
    for (const a of actividades) {
      if (!a.instructor_id) continue
      const s = map.get(a.instructor_id)
      if (s) {
        s.actividades += 1
        const h = horarioLabel(a)
        if (h) s.horarios.push(h)
      }
    }
    return map
  }, [data, rutinas, actividades])

  const totalEspecialidadesUnicas = useMemo(
    () => new Set(data.flatMap((i) => i.especialidades ?? [])).size,
    [data]
  )

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setSelectedEspecialidades(
        (selected.especialidades ?? []).filter((e) => ESPECIALIDADES_COACH.includes(e as never))
      )
    } else if (mode === 'create') {
      setSelectedEspecialidades([])
    }
  }, [mode, selected])

  const resetPhotoState = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => instructoresApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] })
      setMode(null)
      resetPhotoState()
      toast.success('Entrenador registrado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      instructoresApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] })
      setMode(null)
      setSelected(null)
      resetPhotoState()
      toast.success('Entrenador actualizado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => instructoresApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] })
      setDeleteId(null)
      toast.success('Entrenador eliminado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const openCreate = () => {
    setSelected(null)
    resetPhotoState()
    setSelectedEspecialidades([])
    setMode('create')
  }

  const openView = (row: Instructor) => {
    setSelected(row)
    setMode('view')
  }

  const openEdit = (row: Instructor) => {
    setSelected(row)
    resetPhotoState()
    setMode('edit')
  }

  const toggleEspecialidad = (esp: string) => {
    setSelectedEspecialidades((prev) =>
      prev.includes(esp) ? prev.filter((e) => e !== esp) : [...prev, esp]
    )
  }

  const onPhotoChange = (file: File | null) => {
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      let fotourl: string | undefined

      if (photoFile) {
        const { data: uploaded } = await instructoresApi.uploadFoto(photoFile)
        fotourl = uploaded.fotourl
      } else if (mode === 'edit' && selected?.fotourl) {
        fotourl = selected.fotourl
      }

      const payload: Record<string, unknown> = {
        nombre: fd.get('nombre'),
        telefono: fd.get('telefono') || undefined,
        especialidades: selectedEspecialidades,
        ...(fotourl ? { fotourl } : {}),
      }

      if (mode === 'edit' && selected) {
        await updateMut.mutateAsync({ id: selected.id, body: payload })
      } else {
        await createMut.mutateAsync({
          ...payload,
          email: fd.get('email'),
          password: fd.get('password'),
        })
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const currentPreview = photoPreview ?? getMediaUrl(selected?.fotourl)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entrenadores</h1>
          <p className="text-muted-foreground">
            Gestión de entrenadores, horarios y asignaciones de estudiantes
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo coach
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="font-medium">No hay entrenadores registrados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Agrega el primer coach con su foto de perfil.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              Nuevo coach
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((coach) => {
            const stats = statsByInstructor.get(coach.id)
            const horario =
              stats?.horarios.slice(0, 2).join(' · ') || 'Sin horario asignado'
            const especialidades = coach.especialidades ?? []
            return (
              <Card
                key={coach.id}
                className="overflow-hidden border-border/60 transition-colors hover:border-primary/40"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      nombre={coach.nombre}
                      src={getMediaUrl(coach.fotourl)}
                      className="h-14 w-14 text-base"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold">{coach.nombre}</h3>
                      <EspecialidadesBadges items={especialidades} />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        {stats?.estudiantes ?? 0}
                      </span>{' '}
                      estudiante(s) asignado(s)
                    </p>
                    <p>
                      Horario: <span className="text-foreground">{horario}</span>
                    </p>
                    <p>
                      {stats?.rutinas ?? 0} rutina(s) · {stats?.actividades ?? 0} actividad(es)
                    </p>
                  </div>

                  <div className="mt-3">
                    <Badge variant="success" className="text-xs">
                      Disponible
                    </Badge>
                  </div>

                  {coach.email && (
                    <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {coach.email}
                    </p>
                  )}
                  {coach.telefono && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {coach.telefono}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-4 text-sm">
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => openView(coach)}
                    >
                      Perfil
                    </button>
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => openEdit(coach)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-medium text-destructive hover:underline"
                      onClick={() => setDeleteId(coach.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {data.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {data.length} entrenador(es) · {totalEspecialidadesUnicas} especialidad(es) ·{' '}
          {Array.from(statsByInstructor.values()).reduce((a, s) => a + s.estudiantes, 0)}{' '}
          estudiante(s) asignado(s) · {data.length} disponible(s) hoy
        </div>
      )}

      <Dialog
        open={mode === 'create' || mode === 'edit'}
        onOpenChange={() => {
          setMode(null)
          resetPhotoState()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar entrenador' : 'Nuevo coach'}</DialogTitle>
          </DialogHeader>
          <form id="instructor-form" onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              {currentPreview ? (
                <img
                  src={currentPreview}
                  alt="Vista previa"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="foto">Foto de perfil</Label>
                <Input
                  id="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o GIF. Máx. 10 MB.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            {mode === 'create' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" minLength={8} required />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona una o más especialidades del catálogo.
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {ESPECIALIDADES_COACH.map((esp) => {
                  const checked = selectedEspecialidades.includes(esp)
                  return (
                    <label
                      key={esp}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                        checked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-transparent hover:bg-muted/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEspecialidad(esp)}
                        className="h-4 w-4 rounded border-input"
                        aria-label={`Especialidad ${esp}`}
                      />
                      <span>{esp}</span>
                    </label>
                  )
                })}
              </div>
              {selectedEspecialidades.length > 0 && (
                <p className="text-xs text-primary">
                  {selectedEspecialidades.length} especialidad(es) seleccionada(s)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                type="tel"
                defaultValue={selected?.telefono ?? ''}
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="instructor-form" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perfil del entrenador</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  nombre={selected.nombre}
                  src={getMediaUrl(selected.fotourl)}
                  className="h-16 w-16 text-lg"
                />
                <div>
                  <p className="text-lg font-semibold">{selected.nombre}</p>
                  <EspecialidadesBadges items={selected.especialidades ?? []} />
                </div>
              </div>
              <DetailGrid
                items={[
                  { label: 'Email', value: selected.email },
                  { label: 'Teléfono', value: selected.telefono },
                  {
                    label: 'Especialidades',
                    value:
                      selected.especialidades?.length
                        ? selected.especialidades.join(', ')
                        : '—',
                  },
                  {
                    label: 'Registrado',
                    value: new Date(selected.created_at).toLocaleString(),
                  },
                ]}
              />
            </div>
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
        title="Eliminar entrenador"
        description="Se eliminará el entrenador del sistema."
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
