import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import { maquinasApi } from '@/api/services'
import { MaquinaFoto } from '@/components/maquinas/MaquinaFoto'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const CATEGORIA_STYLES: Record<string, string> = {
  cardio: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  fuerza: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  funcional: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  libre: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
}

function estadoBadge(estado: string) {
  if (estado === 'disponible') return { variant: 'success' as const, label: 'Disponible' }
  if (estado === 'en_uso') return { variant: 'warning' as const, label: 'En uso' }
  return { variant: 'outline' as const, label: estado.replace(/_/g, ' ') }
}

export function StudentMaquinasPage() {
  const [busqueda, setBusqueda] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinasApi.list().then((r) => r.data),
  })

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return data
    return data.filter((m) => m.nombre.toLowerCase().includes(q))
  }, [data, busqueda])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Máquinas del gimnasio</h1>
      </div>

      {!isLoading && data.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
            aria-label="Buscar máquina por nombre"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Aún no hay máquinas registradas.</p>
          </CardContent>
        </Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No se encontraron máquinas con el nombre &quot;{busqueda.trim()}&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtradas.map((m) => {
            const estado = estadoBadge(m.estado_maquina)
            return (
              <Card key={m.id} className="overflow-hidden border-border/60">
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {m.categoria && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'border text-xs',
                          CATEGORIA_STYLES[m.categoria.toLowerCase()] ?? ''
                        )}
                      >
                        {m.categoria}
                      </Badge>
                    )}
                    <Badge variant={estado.variant} className="text-xs">
                      {estado.label}
                    </Badge>
                  </div>
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{m.nombre}</h3>
                      {m.ubicacion && (
                        <p className="mt-1 text-xs text-muted-foreground">{m.ubicacion}</p>
                      )}
                      {m.descripcion && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {m.descripcion}
                        </p>
                      )}
                    </div>
                    <MaquinaFoto
                      nombre={m.nombre}
                      fotourl={m.fotourl}
                      className="h-28 w-24 shrink-0 self-start sm:w-28"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
