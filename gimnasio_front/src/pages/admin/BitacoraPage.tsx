import { useQuery } from '@tanstack/react-query'
import { ClipboardList, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { bitacoraApi } from '@/api/services'
import type { BitacoraEntry } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

function formatFecha(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function accionVariant(accion: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (accion.includes('FALLIDO') || accion === 'ELIMINAR') return 'destructive'
  if (accion === 'LOGIN' || accion === 'REGISTRO') return 'default'
  if (accion === 'CREAR') return 'secondary'
  return 'outline'
}

function AccionBadge({ accion }: { accion: string }) {
  return <Badge variant={accionVariant(accion)}>{accion}</Badge>
}

function BitacoraRow({ row }: { row: BitacoraEntry }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
        {formatFecha(row.created_at)}
      </td>
      <td className="px-3 py-2.5">
        <div className="text-sm font-medium text-foreground">
          {row.usuario_nombre || 'Sistema / anónimo'}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.usuario_email || '—'}
          {row.usuario_rol ? ` · ${row.usuario_rol}` : ''}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <AccionBadge accion={row.accion} />
      </td>
      <td className="px-3 py-2.5 text-sm">{row.modulo}</td>
      <td className="max-w-[220px] truncate px-3 py-2.5 font-mono text-xs text-muted-foreground" title={row.ruta}>
        {row.metodo} {row.ruta}
      </td>
      <td className="px-3 py-2.5 text-xs">
        {row.status_code != null ? (
          <span
            className={cn(
              'font-medium',
              row.status_code >= 400 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {row.status_code}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="max-w-[180px] truncate px-3 py-2.5 text-xs text-muted-foreground" title={row.detalle || row.ip || ''}>
        {row.detalle || row.ip || '—'}
      </td>
    </tr>
  )
}

export function BitacoraPage() {
  const [q, setQ] = useState('')
  const [qApplied, setQApplied] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bitacora', qApplied, page],
    queryFn: async () => {
      const { data } = await bitacoraApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        q: qApplied || undefined,
      })
      return data
    },
  })

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE)),
    [data?.total],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bitácora</h1>
          <p className="text-sm text-muted-foreground">
            Registro de auditoría: inicios de sesión y acciones de creación, edición y eliminación.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Historial de acciones
          </CardTitle>
          <CardDescription>
            {data ? `${data.total} registro${data.total === 1 ? '' : 's'}` : 'Cargando…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(0)
              setQApplied(q.trim())
            }}
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por usuario, módulo, ruta…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                  <th className="px-3 py-2 font-medium">Módulo</th>
                  <th className="px-3 py-2 font-medium">Ruta</th>
                  <th className="px-3 py-2 font-medium">HTTP</th>
                  <th className="px-3 py-2 font-medium">Detalle / IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={7} className="px-3 py-3">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))}
                {!isLoading && (data?.items.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      Aún no hay registros. Las acciones administrativas y los inicios de sesión
                      aparecerán aquí automáticamente.
                    </td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <BitacoraRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
