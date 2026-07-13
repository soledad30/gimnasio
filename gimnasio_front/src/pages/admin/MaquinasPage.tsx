import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ImageIcon, Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage, getMediaUrl } from '@/api/client'
import { maquinasApi } from '@/api/services'
import type { Maquina } from '@/types'
import { MaquinaFoto } from '@/components/maquinas/MaquinaFoto'
import { MantenimientoMaquinaDialog } from '@/components/maquinas/MantenimientoMaquinaDialog'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
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

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'funcional', label: 'Funcional' },
  { value: 'libre', label: 'Libre' },
]

const CATEGORIA_STYLES: Record<string, string> = {
  cardio: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  fuerza: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  funcional: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  libre: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
}

const ESTADOS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_uso', label: 'En uso' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'fuera_servicio', label: 'Fuera de servicio' },
]

function categoriaStyle(cat?: string | null) {
  if (!cat) return 'bg-muted text-muted-foreground border-border'
  return CATEGORIA_STYLES[cat.toLowerCase()] ?? 'bg-primary/15 text-primary border-primary/30'
}

function categoriaLabel(cat?: string | null) {
  if (!cat) return null
  return CATEGORIAS.find((c) => c.value === cat.toLowerCase())?.label ?? cat
}

function estadoBadge(estado: string) {
  if (estado === 'disponible') return { variant: 'success' as const, label: 'Disponible' }
  if (estado === 'en_uso') return { variant: 'warning' as const, label: 'En uso' }
  if (estado === 'mantenimiento') return { variant: 'destructive' as const, label: 'Mantenimiento' }
  return { variant: 'outline' as const, label: estado.replace(/_/g, ' ') }
}

export function MaquinasPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Maquina | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [mantMaquina, setMantMaquina] = useState<Maquina | null>(null)
  const [mantDialogOpen, setMantDialogOpen] = useState(false)

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const resetPhotoState = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const { data = [], isLoading } = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinasApi.list().then((r) => r.data),
  })

  const filtradas = useMemo(() => {
    return data.filter((m) => {
      const q = busqueda.trim().toLowerCase()
      const matchBusqueda =
        !q ||
        m.nombre.toLowerCase().includes(q) ||
        (m.codigo?.toLowerCase().includes(q) ?? false) ||
        (m.marca?.toLowerCase().includes(q) ?? false) ||
        (m.ubicacion?.toLowerCase().includes(q) ?? false)
      const matchCat =
        !categoriaFiltro || (m.categoria?.toLowerCase() === categoriaFiltro.toLowerCase())
      return matchBusqueda && matchCat
    })
  }, [data, busqueda, categoriaFiltro])

  const resumen = useMemo(() => {
    const total = data.length
    const disponibles = data.filter((m) => m.estado_maquina === 'disponible').length
    const enUso = data.filter((m) => m.estado_maquina === 'en_uso').length
    const mantenimiento = data.filter(
      (m) => m.estado_maquina === 'mantenimiento' || m.estado_maquina === 'fuera_servicio'
    ).length
    return { total, disponibles, enUso, mantenimiento }
  }, [data])

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => maquinasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinas'] })
      setMode(null)
      resetPhotoState()
      toast.success('Máquina registrada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      maquinasApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinas'] })
      setMode(null)
      setSelected(null)
      resetPhotoState()
      toast.success('Máquina actualizada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => maquinasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinas'] })
      setDeleteId(null)
      toast.success('Máquina eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const openCreate = () => {
    setSelected(null)
    resetPhotoState()
    setMode('create')
  }

  const openEdit = (m: Maquina) => {
    setSelected(m)
    resetPhotoState()
    setMode('edit')
  }

  const abrirMantenimiento = async (m: Maquina) => {
    if (m.estado_maquina !== 'mantenimiento') {
      try {
        await updateMut.mutateAsync({
          id: m.id,
          body: { estado_maquina: 'mantenimiento' },
        })
        const actualizada = { ...m, estado_maquina: 'mantenimiento' }
        setMantMaquina(actualizada)
      } catch {
        return
      }
    } else {
      setMantMaquina(m)
    }
    setMantDialogOpen(true)
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const estado = fd.get('estado_maquina') as string
      const body: Record<string, unknown> = {
        nombre: fd.get('nombre'),
        descripcion: fd.get('descripcion') || null,
        categoria: fd.get('categoria') || null,
        marca: fd.get('marca') || null,
        ubicacion: fd.get('ubicacion') || null,
        estado_maquina: estado,
      }

      if (mode === 'create') {
        body.anios_vida_util = Number(fd.get('anios_vida_util'))
        const fechaAdq = fd.get('fecha_adquisicion') as string
        if (fechaAdq) body.fecha_adquisicion = fechaAdq
      }

      if (photoFile) {
        const { data: uploaded } = await maquinasApi.uploadFoto(photoFile)
        body.fotourl = uploaded.fotourl
      } else if (mode === 'edit' && selected?.fotourl) {
        body.fotourl = selected.fotourl
      }

      if (mode === 'edit' && selected) {
        await updateMut.mutateAsync({ id: selected.id, body })
        if (estado === 'mantenimiento') {
          setMantMaquina({ ...selected, ...body, estado_maquina: estado } as Maquina)
          setMantDialogOpen(true)
        }
      } else {
        await createMut.mutateAsync(body)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const currentPreview = photoPreview ?? getMediaUrl(selected?.fotourl)
  const selectClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Máquinas y equipos</h1>
          
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva máquina
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar máquina..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <Button
                key={c.value || 'todas'}
                type="button"
                size="sm"
                variant={categoriaFiltro === c.value ? 'default' : 'outline'}
                onClick={() => setCategoriaFiltro(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <p className="font-medium">No hay máquinas que coincidan</p>
              <Button className="mt-4" onClick={openCreate}>
                Nueva máquina
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtradas.map((m) => {
              const estado = estadoBadge(m.estado_maquina)
              return (
                <Card
                  key={m.id}
                  className="overflow-hidden border-border/60 transition-colors hover:border-primary/30"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      {m.categoria ? (
                        <Badge
                          variant="outline"
                          className={cn('border text-xs', categoriaStyle(m.categoria))}
                        >
                          {categoriaLabel(m.categoria)}
                        </Badge>
                      ) : (
                        <span />
                      )}
                      <Badge variant={estado.variant} className="shrink-0 text-xs">
                        {estado.label}
                      </Badge>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="text-base font-semibold leading-tight">{m.nombre}</h3>
                        <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {m.marca && (
                            <div>
                              <dt className="inline font-medium text-foreground">Marca: </dt>
                              <dd className="inline">{m.marca}</dd>
                            </div>
                          )}
                          {m.ubicacion && (
                            <div>
                              <dt className="inline font-medium text-foreground">Ubicación: </dt>
                              <dd className="inline">{m.ubicacion}</dd>
                            </div>
                          )}
                          {m.codigo && (
                            <div>
                              <dt className="inline font-medium text-foreground">Código: </dt>
                              <dd className="inline font-mono">{m.codigo}</dd>
                            </div>
                          )}
                          {m.anios_vida_util != null && (
                            <div>
                              <dt className="inline font-medium text-foreground">Vida útil: </dt>
                              <dd className="inline">{m.anios_vida_util} años</dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-auto flex flex-wrap gap-2 pt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelected(m)
                              setMode('view')
                            }}
                          >
                            Detalle
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => abrirMantenimiento(m)}
                            disabled={updateMut.isPending}
                          >
                            Mant.
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => openEdit(m)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                      <MaquinaFoto
                        nombre={m.nombre}
                        fotourl={m.fotourl}
                        className="h-28 w-28 shrink-0 self-start sm:h-32 sm:w-32"
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {data.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {resumen.total} máquina(s) totales · {resumen.disponibles} disponible(s) ·{' '}
            {resumen.enUso} en uso · {resumen.mantenimiento} en mantenimiento
          </div>
        )}
      </div>

      <Dialog
        open={mode === 'create' || mode === 'edit'}
        onOpenChange={() => {
          setMode(null)
          resetPhotoState()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar máquina' : 'Nueva máquina'}</DialogTitle>
          </DialogHeader>
          <form id="maq-form" onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              {currentPreview ? (
                <img
                  src={currentPreview}
                  alt="Vista previa"
                  className="h-28 w-28 rounded-lg object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="foto">Foto de la máquina</Label>
                <Input
                  id="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            {mode === 'edit' && selected?.codigo && (
              <div className="space-y-2">
                <Label htmlFor="codigo">Código (único)</Label>
                <Input id="codigo" name="codigo" value={selected.codigo} readOnly disabled />
              </div>
            )}
            {mode === 'create' && (
              <p className="text-xs text-muted-foreground">
                El código se generará automáticamente al guardar (ej. GLU001, CAR002).
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <select
                  id="categoria"
                  name="categoria"
                  aria-label="Categoría"
                  defaultValue={selected?.categoria ?? ''}
                  className={selectClassName}
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {mode === 'create' ? (
                <div className="space-y-2">
                  <Label htmlFor="anios_vida_util">Años de vida útil</Label>
                  <Input
                    id="anios_vida_util"
                    name="anios_vida_util"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={10}
                    required
                  />
                  
                </div>
              ) : (
                selected?.anios_vida_util != null && (
                  <div className="space-y-2">
                    <Label>Años de vida útil</Label>
                    <Input value={selected.anios_vida_util} readOnly disabled />
                  </div>
                )
              )}
            </div>
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="fecha_adquisicion">Fecha de adquisición (opcional)</Label>
                <Input id="fecha_adquisicion" name="fecha_adquisicion" type="date" />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" name="marca" defaultValue={selected?.marca ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input
                  id="ubicacion"
                  name="ubicacion"
                  placeholder="Ej. Zona cardio"
                  defaultValue={selected?.ubicacion ?? ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" name="descripcion" defaultValue={selected?.descripcion ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado_maquina">Estado</Label>
              <select
                id="estado_maquina"
                name="estado_maquina"
                aria-label="Estado de la máquina"
                defaultValue={selected?.estado_maquina ?? 'disponible'}
                className={selectClassName}
              >
                {ESTADOS.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
              
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="maq-form" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.nombre}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <MaquinaFoto
                nombre={selected.nombre}
                fotourl={selected.fotourl}
                className="aspect-video w-full"
              />
              <div className="flex flex-wrap gap-2">
                {selected.categoria && (
                  <Badge variant="outline" className={cn('border', categoriaStyle(selected.categoria))}>
                    {categoriaLabel(selected.categoria)}
                  </Badge>
                )}
                <Badge variant={estadoBadge(selected.estado_maquina).variant}>
                  {estadoBadge(selected.estado_maquina).label}
                </Badge>
              </div>
              <dl className="space-y-2 text-sm">
                {selected.marca && (
                  <div>
                    <dt className="font-medium">Marca</dt>
                    <dd className="text-muted-foreground">{selected.marca}</dd>
                  </div>
                )}
                {selected.ubicacion && (
                  <div>
                    <dt className="font-medium">Ubicación</dt>
                    <dd className="text-muted-foreground">{selected.ubicacion}</dd>
                  </div>
                )}
                {selected.codigo && (
                  <div>
                    <dt className="font-medium">Código</dt>
                    <dd className="font-mono text-muted-foreground">{selected.codigo}</dd>
                  </div>
                )}
                {selected.anios_vida_util != null && (
                  <div>
                    <dt className="font-medium">Vida útil</dt>
                    <dd className="text-muted-foreground">{selected.anios_vida_util} años</dd>
                  </div>
                )}
                {selected.fecha_adquisicion && (
                  <div>
                    <dt className="font-medium">Adquisición</dt>
                    <dd className="text-muted-foreground">{selected.fecha_adquisicion}</dd>
                  </div>
                )}
                {selected.descripcion && (
                  <div>
                    <dt className="font-medium">Descripción</dt>
                    <dd className="text-muted-foreground">{selected.descripcion}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cerrar
            </Button>
            {selected && (
              <Button
                variant="secondary"
                onClick={() => {
                  setMode(null)
                  abrirMantenimiento(selected)
                }}
              >
                Registrar mantenimiento
              </Button>
            )}
            {selected && <Button onClick={() => openEdit(selected)}>Editar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MantenimientoMaquinaDialog
        maquina={mantMaquina}
        open={mantDialogOpen}
        onOpenChange={setMantDialogOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['maquinas'] })}
      />

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </>
  )
}
