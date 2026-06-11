import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi, membresiasApi } from '@/api/services'
import type { Membresia } from '@/types'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PLANES = [
  { tipo: 'mensual', duracion: 30, precio: 150 },
  { tipo: 'trimestral', duracion: 90, precio: 400 },
  { tipo: 'semestral', duracion: 180, precio: 750 },
  { tipo: 'anual', duracion: 365, precio: 1400 },
]

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function MembresiasPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['membresias'],
    queryFn: () => membresiasApi.list().then((r) => r.data),
  })

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => membresiasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membresias'] })
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setOpen(false)
      toast.success('Membresía asignada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const plan = PLANES.find((p) => p.tipo === fd.get('plan'))
    createMut.mutate({
      estudiante_id: Number(fd.get('estudiante_id')),
      tipo: plan?.tipo ?? fd.get('plan'),
      precio: Number(fd.get('precio') || plan?.precio),
      duracion: Number(fd.get('duracion') || plan?.duracion),
    })
  }

  const estadoMembresia = (m: Membresia) => {
    if (!m.fecha_fin) return 'sin fecha'
    const hoy = new Date().toISOString().slice(0, 10)
    if (m.fecha_fin >= hoy) return 'activa'
    return 'vencida'
  }

  return (
    <>
      <PageHeader
        title="Membresías"
        description="Planes y vigencia de acceso al gimnasio"
        onCreate={() => setOpen(true)}
        createLabel="Asignar membresía"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Membresías activas</CardTitle>
          <CardDescription>{data.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay membresías. Asigna la primera.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.estudiante_nombre ?? `#${m.estudiante_id}`}</TableCell>
                      <TableCell className="capitalize">{m.tipo}</TableCell>
                      <TableCell>Bs. {m.precio}</TableCell>
                      <TableCell className="text-sm">
                        {m.fecha_inicio && m.fecha_fin
                          ? `${m.fecha_inicio} → ${m.fecha_fin}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoMembresia(m) === 'activa' ? 'success' : 'destructive'}>
                          {estadoMembresia(m)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar membresía</DialogTitle>
          </DialogHeader>
          <form id="mem-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estudiante_id">Estudiante</Label>
              <select
                id="estudiante_id"
                name="estudiante_id"
                required
                aria-label="Estudiante"
                className={selectClassName}
              >
                <option value="">Seleccionar…</option>
                {estudiantes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <select id="plan" name="plan" required aria-label="Plan" className={selectClassName} defaultValue="mensual">
                {PLANES.map((p) => (
                  <option key={p.tipo} value={p.tipo}>
                    {p.tipo} — {p.duracion} días — Bs. {p.precio}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (Bs.)</Label>
                <Input id="precio" name="precio" type="number" step="0.01" placeholder="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracion">Duración (días)</Label>
                <Input id="duracion" name="duracion" type="number" placeholder="30" />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="mem-form" disabled={createMut.isPending}>
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
