import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { ImageIcon, Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage, getMediaUrl } from '@/api/client'
import { ejerciciosApi, maquinasApi } from '@/api/services'
import type { Ejercicio } from '@/types'
import { EjercicioMedia } from '@/components/ejercicios/EjercicioMedia'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { PageHeader } from '@/components/crud/PageHeader'
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

type ModalMode = 'create' | 'edit' | 'view' | null

const OBJETIVOS = [
  { value: 'abdomen', label: 'Abdomen / core' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'perdida_peso', label: 'Pérdida de peso' },
  { value: 'flexibilidad', label: 'Flexibilidad' },
  { value: 'general', label: 'General' },
]

const GRUPOS_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'pecho', label: 'Pecho' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'piernas', label: 'Piernas' },
  { value: 'hombros', label: 'Hombros' },
  { value: 'brazos', label: 'Brazos' },
  { value: 'abdomen', label: 'Core' },
  { value: 'bíceps', label: 'Bíceps' },
  { value: 'cardio', label: 'Cardio' },
]

const GRUPO_STYLES: Record<string, string> = {
  pecho: 'bg-red-500/15 text-red-400 border-red-500/30',
  espalda: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  piernas: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  hombros: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  brazos: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  abdomen: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  bíceps: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  cardio: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function grupoStyle(grupo?: string | null) {
  if (!grupo) return 'bg-muted text-muted-foreground border-border'
  const key = grupo.toLowerCase()
  return GRUPO_STYLES[key] ?? 'bg-primary/15 text-primary border-primary/30'
}

function equipoLabel(ej: Ejercicio) {
  if (ej.con_maquina && ej.maquina_nombre) return ej.maquina_nombre
  if (ej.con_maquina) return 'Con máquina'
  return 'Peso corporal / libre'
}

export function EjerciciosPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Ejercicio | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [conMaquina, setConMaquina] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['ejercicios'],
    queryFn: () => ejerciciosApi.list().then((r) => r.data),
  })

  const { data: maquinas = [] } = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinasApi.list().then((r) => r.data),
  })

  const filtrados = useMemo(() => {
    return data.filter((ej) => {
      const q = busqueda.trim().toLowerCase()
      const matchBusqueda =
        !q ||
        ej.nombre.toLowerCase().includes(q) ||
        (ej.grupo_muscular?.toLowerCase().includes(q) ?? false) ||
        (ej.descripcion?.toLowerCase().includes(q) ?? false)
      const matchGrupo =
        !grupoFiltro || (ej.grupo_muscular?.toLowerCase() === grupoFiltro.toLowerCase())
      return matchBusqueda && matchGrupo
    })
  }, [data, busqueda, grupoFiltro])

  const resetPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => ejerciciosApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ejercicios'] })
      setMode(null)
      resetPhoto()
      toast.success('Ejercicio creado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      ejerciciosApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ejercicios'] })
      setMode(null)
      setSelected(null)
      resetPhoto()
      toast.success('Ejercicio actualizado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => ejerciciosApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ejercicios'] })
      setDeleteId(null)
      toast.success('Ejercicio eliminado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const objetivoLabel = (value?: string | null) =>
    OBJETIVOS.find((o) => o.value === value)?.label ?? value ?? 'General'

  const openCreate = () => {
    setSelected(null)
    setConMaquina(false)
    resetPhoto()
    setMode('create')
  }

  const openEdit = (row: Ejercicio) => {
    setSelected(row)
    setConMaquina(row.con_maquina)
    resetPhoto()
    setMode('edit')
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
      const body: Record<string, unknown> = {
        nombre: fd.get('nombre'),
        descripcion: fd.get('descripcion') || null,
        grupo_muscular: fd.get('grupo_muscular') || null,
        objetivo: fd.get('objetivo') || null,
        con_maquina: fd.get('con_maquina') === 'on',
        videourl: (fd.get('videourl') as string) || null,
      }
      const maquinaId = fd.get('maquina_id') as string
      if (body.con_maquina && maquinaId) body.maquina_id = Number(maquinaId)

      if (photoFile) {
        const { data: uploaded } = await ejerciciosApi.uploadFoto(photoFile)
        body.fotourl = uploaded.fotourl
      } else if (mode === 'edit' && selected?.fotourl) {
        body.fotourl = selected.fotourl
      }

      if (mode === 'edit' && selected) {
        await updateMut.mutateAsync({ id: selected.id, body })
      } else {
        await createMut.mutateAsync(body)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const previewFoto = photoPreview ?? getMediaUrl(selected?.fotourl)

  return (
    <>
      <PageHeader
        title="Ejercicios"
        description="Catálogo con foto o video demostrativo"
        onCreate={openCreate}
        createLabel="Nuevo ejercicio"
      />

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar ejercicio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {GRUPOS_FILTRO.map((g) => (
              <Button
                key={g.value || 'todos'}
                type="button"
                size="sm"
                variant={grupoFiltro === g.value ? 'default' : 'outline'}
                onClick={() => setGrupoFiltro(g.value)}
              >
                {g.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <p className="font-medium">No hay ejercicios que coincidan</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo ejercicio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((ej) => (
              <Card
                key={ej.id}
                className="overflow-hidden border-border/60 transition-colors hover:border-primary/30"
              >
                <CardContent className="flex gap-4 p-4">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {ej.grupo_muscular && (
                        <Badge variant="outline" className={cn('border text-xs', grupoStyle(ej.grupo_muscular))}>
                          {ej.grupo_muscular.charAt(0).toUpperCase() + ej.grupo_muscular.slice(1)}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {objetivoLabel(ej.objetivo)}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold leading-tight">{ej.nombre}</h3>
                    <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div>
                        <dt className="inline font-medium text-foreground">Equipo: </dt>
                        <dd className="inline">{equipoLabel(ej)}</dd>
                      </div>
                      {ej.descripcion && (
                        <div className="line-clamp-2">
                          <dt className="inline font-medium text-foreground">Notas: </dt>
                          <dd className="inline">{ej.descripcion}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(ej)
                          setMode('view')
                        }}
                      >
                        Ver
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(ej)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(ej.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  <div className="w-36 shrink-0 sm:w-40">
                    <EjercicioMedia
                      nombre={ej.nombre}
                      fotourl={ej.fotourl}
                      videourl={ej.videourl}
                      compact
                      className="h-full min-h-[140px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={mode === 'create' || mode === 'edit'}
        onOpenChange={() => {
          setMode(null)
          resetPhoto()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar ejercicio' : 'Nuevo ejercicio'}</DialogTitle>
          </DialogHeader>
          <form id="ej-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" name="descripcion" defaultValue={selected?.descripcion ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grupo_muscular">Grupo muscular</Label>
              <select
                id="grupo_muscular"
                name="grupo_muscular"
                aria-label="Grupo muscular"
                defaultValue={selected?.grupo_muscular ?? ''}
                className={selectClassName}
              >
                <option value="">Sin especificar</option>
                {GRUPOS_FILTRO.filter((g) => g.value).map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
                <option value="bíceps">Bíceps</option>
                <option value="cardio">Cardio</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <select
                id="objetivo"
                name="objetivo"
                aria-label="Objetivo del ejercicio"
                defaultValue={selected?.objetivo ?? ''}
                className={selectClassName}
              >
                <option value="">Sin especificar</option>
                {OBJETIVOS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="con_maquina"
                name="con_maquina"
                type="checkbox"
                aria-label="Requiere máquina"
                defaultChecked={selected?.con_maquina}
                onChange={(e) => setConMaquina(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="con_maquina">Requiere máquina</Label>
            </div>
            {conMaquina && (
              <div className="space-y-2">
                <Label htmlFor="maquina_id">Máquina</Label>
                <select
                  id="maquina_id"
                  name="maquina_id"
                  aria-label="Máquina asociada"
                  defaultValue={selected?.maquina_id ?? ''}
                  className={selectClassName}
                >
                  <option value="">Seleccionar máquina…</option>
                  {maquinas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="rounded-lg border border-border p-4 space-y-4">
              <p className="text-sm font-medium">Demostración visual</p>
              <div className="flex flex-wrap items-start gap-4">
                {previewFoto ? (
                  <img
                    src={previewFoto}
                    alt="Vista previa"
                    className="h-24 w-24 rounded-lg object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="foto">Foto demostrativa</Label>
                  <Input
                    id="foto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o GIF. Máx. 5 MB.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="videourl">URL de video (opcional)</Label>
                <Input
                  id="videourl"
                  name="videourl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  defaultValue={selected?.videourl ?? ''}
                />
                <p className="text-xs text-muted-foreground">
                  YouTube o enlace directo .mp4. Si hay video, tiene prioridad sobre la foto en la tarjeta.
                </p>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="ej-form" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.nombre}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <EjercicioMedia
                nombre={selected.nombre}
                fotourl={selected.fotourl}
                videourl={selected.videourl}
              />
              <div className="flex flex-wrap gap-2">
                {selected.grupo_muscular && (
                  <Badge variant="outline" className={cn('border', grupoStyle(selected.grupo_muscular))}>
                    {selected.grupo_muscular}
                  </Badge>
                )}
                <Badge variant="secondary">{objetivoLabel(selected.objetivo)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Equipo: </span>
                {equipoLabel(selected)}
              </p>
              {selected.descripcion && (
                <p className="text-sm">{selected.descripcion}</p>
              )}
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
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </>
  )
}
