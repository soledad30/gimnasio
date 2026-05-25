import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { actividadesApi } from '@/api/services'
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

type ModalMode = 'create' | 'edit' | 'view' | null

export function ActividadesPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Actividad | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => actividadesApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, string | number>) => actividadesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actividades'] })
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
      setDeleteId(null)
      toast.success('Actividad eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = {
      nombre: fd.get('nombre') as string,
      capacidad: Number(fd.get('capacidad')),
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
        description="Clases grupales y cupos"
        onCreate={() => setMode('create')}
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
                  <TableHead>Capacidad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nombre}</TableCell>
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
              <Label htmlFor="capacidad">Capacidad</Label>
              <Input
                id="capacidad"
                name="capacidad"
                type="number"
                min={1}
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
                { label: 'Capacidad', value: selected.capacidad },
                { label: 'Instructor ID', value: selected.instructor_id ?? '—' },
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
