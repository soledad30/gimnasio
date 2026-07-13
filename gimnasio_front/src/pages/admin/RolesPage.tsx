import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Check, Lock, RotateCcw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { rolesApi } from '@/api/services'
import type { PermisoInfo, RolResumen } from '@/types'
import { PageHeader } from '@/components/crud/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function groupByCategory(catalogo: PermisoInfo[]) {
  const map = new Map<string, PermisoInfo[]>()
  for (const p of catalogo) {
    const list = map.get(p.categoria) ?? []
    list.push(p)
    map.set(p.categoria, list)
  }
  return Array.from(map.entries())
}

function rolBadgeVariant(codigo: string) {
  if (codigo === 'admin') return 'default' as const
  if (codigo === 'recepcion') return 'secondary' as const
  return 'outline' as const
}

export function RolesPage() {
  const qc = useQueryClient()
  const [selectedRol, setSelectedRol] = useState<string>('recepcion')
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data),
  })

  const { data: detalle, isLoading: loadingDetalle } = useQuery({
    queryKey: ['roles', selectedRol],
    queryFn: () => rolesApi.get(selectedRol).then((r) => r.data),
    enabled: Boolean(selectedRol),
  })

  useEffect(() => {
    if (detalle) {
      setDraft(new Set(detalle.permisos))
      setDirty(false)
    }
  }, [detalle])

  const grouped = useMemo(
    () => (detalle ? groupByCategory(detalle.catalogo) : []),
    [detalle]
  )

  const saveMut = useMutation({
    mutationFn: () => rolesApi.updatePermisos(selectedRol, Array.from(draft)),
    onSuccess: (res) => {
      qc.setQueryData(['roles', selectedRol], res.data)
      qc.invalidateQueries({ queryKey: ['roles'] })
      setDraft(new Set(res.data.permisos))
      setDirty(false)
      toast.success('Permisos actualizados')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const togglePermiso = (codigo: string) => {
    if (!detalle?.editable) return
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
    setDirty(true)
  }

  const toggleCategoria = (permisos: PermisoInfo[], activar: boolean) => {
    if (!detalle?.editable) return
    setDraft((prev) => {
      const next = new Set(prev)
      for (const p of permisos) {
        if (activar) next.add(p.codigo)
        else next.delete(p.codigo)
      }
      return next
    })
    setDirty(true)
  }

  const resetDraft = () => {
    if (detalle) {
      setDraft(new Set(detalle.permisos))
      setDirty(false)
    }
  }

  const selectedMeta = roles.find((r) => r.codigo === selectedRol)

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        //description="Define qué acciones puede realizar cada rol en el sistema"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5" />
              Roles
            </CardTitle>
            <CardDescription>Selecciona un rol para editar sus permisos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingRoles ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              roles.map((rol: RolResumen) => (
                <button
                  key={rol.codigo}
                  type="button"
                  onClick={() => setSelectedRol(rol.codigo)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                    selectedRol === rol.codigo
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{rol.nombre}</span>
                    {!rol.editable && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{rol.descripcion}</p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {rol.permisos_activos} / {rol.permisos_total} permisos
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedMeta?.nombre ?? selectedRol}
                  <Badge variant={rolBadgeVariant(selectedRol)}>{selectedRol}</Badge>
                  {!detalle?.editable && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Solo lectura
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">{selectedMeta?.descripcion}</CardDescription>
              </div>
              {detalle?.editable && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!dirty}
                    onClick={resetDraft}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!dirty || saveMut.isPending}
                    onClick={() => saveMut.mutate()}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetalle ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-6">
                {grouped.map(([categoria, permisos]) => {
                  const activos = permisos.filter((p) => draft.has(p.codigo)).length
                  const todos = activos === permisos.length
                  const ninguno = activos === 0
                  return (
                    <div key={categoria} className="rounded-lg border border-border p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{categoria}</h3>
                          <p className="text-xs text-muted-foreground">
                            {activos} de {permisos.length} activos
                          </p>
                        </div>
                        {detalle?.editable && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={todos}
                              onClick={() => toggleCategoria(permisos, true)}
                            >
                              Activar todos
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={ninguno}
                              onClick={() => toggleCategoria(permisos, false)}
                            >
                              Quitar todos
                            </Button>
                          </div>
                        )}
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {permisos.map((permiso) => {
                          const checked = draft.has(permiso.codigo)
                          const disabled = !detalle?.editable
                          return (
                            <li key={permiso.codigo}>
                              <label
                                className={cn(
                                  'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                                  checked ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/50',
                                  disabled && 'cursor-default opacity-80'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => togglePermiso(permiso.codigo)}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium">{permiso.nombre}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {permiso.descripcion}
                                  </span>
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
