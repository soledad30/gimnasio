import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FormEvent, useEffect, useMemo, useState } from 'react'

import { Dumbbell, Pencil, Target } from 'lucide-react'

import { toast } from 'sonner'

import { getErrorMessage } from '@/api/client'

import { estudiantesApi, ejerciciosApi, rutinasApi } from '@/api/services'

import type { Rutina } from '@/types'

import { PageHeader } from '@/components/crud/PageHeader'

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



const OBJETIVOS = [

  { value: 'abdomen', label: 'Abdomen / core' },

  { value: 'hipertrofia', label: 'Hipertrofia' },

  { value: 'fuerza', label: 'Fuerza' },

  { value: 'resistencia', label: 'Resistencia' },

  { value: 'perdida_peso', label: 'Pérdida de peso' },

  { value: 'flexibilidad', label: 'Flexibilidad' },

  { value: 'general', label: 'General' },

]



const OBJETIVOS_LABEL: Record<string, string> = Object.fromEntries(

  OBJETIVOS.map((o) => [o.value, o.label])

)



export function InstructorRutinasPage() {

  const qc = useQueryClient()

  const [mode, setMode] = useState<ModalMode>(null)

  const [selected, setSelected] = useState<Rutina | null>(null)

  const [objetivoFiltro, setObjetivoFiltro] = useState('')

  const [ejercicioConfig, setEjercicioConfig] = useState<

    Record<number, { series: number; repeticiones: string }>

  >({})



  const { data = [], isLoading } = useQuery({

    queryKey: ['instructor-rutinas'],

    queryFn: () => rutinasApi.misAsignadas().then((r) => r.data),

  })



  const { data: estudiantes = [] } = useQuery({

    queryKey: ['estudiantes'],

    queryFn: () => estudiantesApi.list().then((r) => r.data),

    enabled: mode !== null,

  })



  const estudianteNombre = useMemo(

    () => new Map(estudiantes.map((e) => [e.id, e.nombre])),

    [estudiantes]

  )



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

      qc.invalidateQueries({ queryKey: ['instructor-rutinas'] })

      qc.invalidateQueries({ queryKey: ['instructor-panel'] })

      setMode(null)

      toast.success('Rutina creada')

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



    if (mode === 'edit' && selected) {

      updateMut.mutate({ id: selected.id, body })

    } else {

      createMut.mutate(body)

    }

  }



  const nombreEstudiante = (id?: number | null) =>

    id ? estudianteNombre.get(id) ?? `Estudiante #${id}` : 'Sin asignar'



  return (

    <>

      <PageHeader

        title="Mis rutinas"

        description="Crea y edita planes de entrenamiento para tus estudiantes"

        onCreate={openCreate}

        createLabel="Nueva rutina"

      />



      {isLoading ? (

        <div className="mt-6 space-y-4">

          <Skeleton className="h-48 w-full" />

          <Skeleton className="h-48 w-full" />

        </div>

      ) : data.length === 0 ? (

        <Card className="mt-6">

          <CardContent className="flex flex-col items-center py-12 text-center">

            <Dumbbell className="mb-3 h-12 w-12 text-muted-foreground" />

            <p className="font-medium">No tienes rutinas aún</p>

            <p className="mt-1 text-sm text-muted-foreground">

              Crea tu primera rutina y asígnala a un estudiante.

            </p>

            <Button className="mt-4" onClick={openCreate}>

              Nueva rutina

            </Button>

          </CardContent>

        </Card>

      ) : (

        <div className="mt-6 space-y-6">

          {data.map((r) => (

            <Card key={r.id}>

              <CardHeader>

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <CardTitle>{r.nombre}</CardTitle>

                    {r.objetivo && (

                      <CardDescription className="mt-1 flex items-center gap-1">

                        <Target className="h-4 w-4" />

                        {OBJETIVOS_LABEL[r.objetivo] ?? r.objetivo}

                      </CardDescription>

                    )}

                    <p className="mt-1 text-sm text-muted-foreground">

                      Estudiante: {nombreEstudiante(r.estudiante_id)}

                    </p>

                  </div>

                  <div className="flex items-center gap-2">

                    <Badge variant="secondary">{r.ejercicios?.length ?? 0} ejercicios</Badge>

                    <Button variant="outline" size="sm" onClick={() => openEdit(r)}>

                      <Pencil className="mr-1 h-4 w-4" />

                      Editar

                    </Button>

                  </div>

                </div>

              </CardHeader>

              <CardContent>

                {r.ejercicios && r.ejercicios.length > 0 ? (

                  <ol className="space-y-2">

                    {r.ejercicios.map((ej, idx) => (

                      <li

                        key={ej.ejercicio_id}

                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"

                      >

                        <span className="font-bold text-primary">{idx + 1}.</span>

                        <span className="flex-1">{ej.nombre}</span>

                        {ej.series && ej.repeticiones && (

                          <span className="text-muted-foreground">

                            {ej.series}×{ej.repeticiones}

                          </span>

                        )}

                      </li>

                    ))}

                  </ol>

                ) : (

                  <p className="text-sm text-muted-foreground">Sin ejercicios definidos</p>

                )}

              </CardContent>

            </Card>

          ))}

        </div>

      )}



      <Dialog open={mode !== null} onOpenChange={() => setMode(null)}>

        <DialogContent className="max-h-[90vh] overflow-y-auto">

          <DialogHeader>

            <DialogTitle>{mode === 'edit' ? 'Editar rutina' : 'Nueva rutina'}</DialogTitle>

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

            <div className="space-y-2">

              <Label htmlFor="estudiante_id">Estudiante</Label>

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

          </form>

          <DialogFooter>

            <Button variant="outline" onClick={() => setMode(null)}>

              Cancelar

            </Button>

            <Button

              type="submit"

              form="inst-rut-form"

              disabled={createMut.isPending || updateMut.isPending}

            >

              Guardar

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </>

  )

}


