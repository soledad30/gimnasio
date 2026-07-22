import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Lock,
  Nfc,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { rolesApi } from '@/api/services'
import type { PermisoInfo, RolResumen } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const CATEGORIA_ORDEN = [
  'General',
  'Usuarios',
  'Estudiantes',
  'Fichas de inscripción',
  'Acceso',
  'Inscripciones',
  'Reservas',
  'Membresías',
  'Pagos',
  'Actividades',
  'Horarios',
  'Entrenadores',
  'Máquinas',
  'Ejercicios',
  'Rutinas',
  'Reportes',
  'Notificaciones',
  'Configuración',
  'Respaldos',
  'Bitácora',
  'Portal instructor',
  'Portal estudiante',
] as const

const CATEGORIA_ICON: Record<string, ComponentType<{ className?: string }>> = {
  General: LayoutDashboard,
  Usuarios: Users,
  Estudiantes: GraduationCap,
  'Fichas de inscripción': FileText,
  Acceso: Nfc,
  Inscripciones: CalendarDays,
  Reservas: CalendarDays,
  Membresías: CreditCard,
  Pagos: CreditCard,
  Actividades: Dumbbell,
  Horarios: CalendarDays,
  Entrenadores: UserCog,
  Máquinas: Wrench,
  Ejercicios: Dumbbell,
  Rutinas: Dumbbell,
  Reportes: LayoutDashboard,
  Notificaciones: Bell,
  Configuración: Settings,
  Respaldos: Archive,
  Bitácora: ClipboardList,
  'Portal instructor': UserCog,
  'Portal estudiante': GraduationCap,
}

function groupByCategory(catalogo: PermisoInfo[]) {
  const map = new Map<string, PermisoInfo[]>()
  for (const p of catalogo) {
    const list = map.get(p.categoria) ?? []
    list.push(p)
    map.set(p.categoria, list)
  }
  return CATEGORIA_ORDEN.filter((c) => map.has(c)).map((categoria) => [
    categoria,
    map.get(categoria)!,
  ] as const)
}

function rolBadgeVariant(codigo: string) {
  if (codigo === 'admin') return 'default' as const
  if (codigo === 'recepcion') return 'secondary' as const
  if (codigo === 'instructor') return 'outline' as const
  return 'outline' as const
}

function rolAccentClass(codigo: string) {
  if (codigo === 'admin') return 'border-l-primary'
  if (codigo === 'recepcion') return 'border-l-cyan-500'
  if (codigo === 'instructor') return 'border-l-violet-500'
  return 'border-l-amber-500'
}

export function RolesPage() {
  const qc = useQueryClient()
  const [selectedRol, setSelectedRol] = useState<string>('recepcion')
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)
  const [busqueda, setBusqueda] = useState('')

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

  const grouped = useMemo(() => {
    if (!detalle) return []
    const q = busqueda.trim().toLowerCase()
    const base = groupByCategory(detalle.catalogo)
    if (!q) return base
    return base
      .map(([cat, permisos]) => {
        const filtered = permisos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            p.descripcion.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q) ||
            cat.toLowerCase().includes(q),
        )
        return [cat, filtered] as const
      })
      .filter(([, permisos]) => permisos.length > 0)
  }, [detalle, busqueda])

  const totalCatalogo = detalle?.catalogo.length ?? 0
  const activosRol = draft.size
  const porcentaje = totalCatalogo ? Math.round((activosRol / totalCatalogo) * 100) : 0

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles y permisos</h1>
        
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-primary">{roles.length}</p>
            <p className="text-sm text-muted-foreground">Roles del sistema</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{totalCatalogo || '—'}</p>
            <p className="text-sm text-muted-foreground">Permisos disponibles</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{activosRol}</p>
            <p className="text-sm text-muted-foreground">Activos en {selectedMeta?.nombre ?? 'rol'}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{porcentaje}%</p>
            <p className="text-sm text-muted-foreground">Cobertura del catálogo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Roles
            </CardTitle>
            <CardDescription>Seleccioná un rol para editar sus permisos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingRoles ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              roles.map((rol: RolResumen) => {
                const pct =
                  rol.permisos_total > 0
                    ? Math.round((rol.permisos_activos / rol.permisos_total) * 100)
                    : 0
                return (
                  <button
                    key={rol.codigo}
                    type="button"
                    onClick={() => setSelectedRol(rol.codigo)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                      selectedRol === rol.codigo
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{rol.nombre}</span>
                      {!rol.editable && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{rol.descripcion}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-primary">
                        {rol.permisos_activos} / {rol.permisos_total}
                      </span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          selectedRol === rol.codigo ? 'bg-primary' : 'bg-primary/50',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className={cn('overflow-hidden border-l-4', rolAccentClass(selectedRol))}>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {selectedMeta?.nombre ?? selectedRol}
                  <Badge variant={rolBadgeVariant(selectedRol)}>{selectedRol}</Badge>
                  {!detalle?.editable && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Solo lectura
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  {selectedMeta?.descripcion}
                </CardDescription>
              </div>
              {detalle?.editable && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={!dirty} onClick={resetDraft}>
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar permiso por nombre, módulo o código…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <span className="shrink-0 text-muted-foreground">
                {activosRol} de {totalCatalogo} activos
              </span>
            </div>
          </CardHeader>

          <CardContent>
            {loadingDetalle ? (
              <Skeleton className="h-72 w-full" />
            ) : grouped.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No hay permisos que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="space-y-4">
                {grouped.map(([categoria, permisos]) => {
                  const Icon = CATEGORIA_ICON[categoria] ?? KeyRound
                  const activos = permisos.filter((p) => draft.has(p.codigo)).length
                  const todos = activos === permisos.length
                  const ninguno = activos === 0
                  return (
                    <div key={categoria} className="rounded-xl border border-border/80 bg-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{categoria}</h3>
                            <p className="text-xs text-muted-foreground">
                              {activos} de {permisos.length} activos
                            </p>
                          </div>
                        </div>
                        {detalle?.editable && (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={todos}
                              onClick={() => toggleCategoria(permisos, true)}
                            >
                              Todos
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={ninguno}
                              onClick={() => toggleCategoria(permisos, false)}
                            >
                              Ninguno
                            </Button>
                          </div>
                        )}
                      </div>
                      <ul className="grid gap-2 p-4 sm:grid-cols-2">
                        {permisos.map((permiso) => {
                          const checked = draft.has(permiso.codigo)
                          const disabled = !detalle?.editable
                          return (
                            <li key={permiso.codigo}>
                              <label
                                className={cn(
                                  'flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                                  checked
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'border-transparent bg-muted/20 hover:bg-muted/40',
                                  disabled && 'cursor-default opacity-90',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => togglePermiso(permiso.codigo)}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium">{permiso.nombre}</span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {permiso.descripcion}
                                  </span>
                                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground/80">
                                    {permiso.codigo}
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

      {dirty && detalle?.editable && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur sm:left-auto sm:right-6 sm:translate-x-0">
          <span className="text-sm text-muted-foreground">Cambios sin guardar</span>
          <Button size="sm" variant="outline" onClick={resetDraft}>
            Descartar
          </Button>
          <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
