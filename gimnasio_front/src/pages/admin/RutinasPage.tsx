import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { rutinasApi } from '@/api/services'
import type { Rutina } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
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

export function RutinasPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Rutina | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['rutinas'],
    queryFn: () => rutinasApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, string | number>) => rutinasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setMode(null)
      toast.success('Rutina creada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      rutinasApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setMode(null)
      setSelected(null)
      toast.success('Rutina actualizada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => rutinasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutinas'] })
      setDeleteId(null)
      toast.success('Rutina eliminada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: Record<string, string | number> = {
      nombre: fd.get('nombre') as string,
      objetivo: (fd.get('objetivo') as string) || '',
    }
    const est = fd.get('estudiante_id') as string
    if (est) body.estudiante_id = Number(est)
    const inst = fd.get('instructor_id') as string
    if (inst) body.instructor_id = Number(inst)

    if (mode === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, body })
    } else {
      createMut.mutate(body)
    }
  }

  return (
    <>
      <PageHeader
        title="Rutinas"
        description="Planes de entrenamiento"
        onCreate={() => {
          setSelected(null)
          setMode('create')
        }}
        createLabel="Nueva rutina"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} rutina(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell>{r.objetivo || '—'}</TableCell>
                    <TableCell>{r.estudiante_id ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => {
                          setSelected(r)
                          setMode('view')
                        }}
                        onEdit={() => {
                          setSelected(r)
                          setMode('edit')
                        }}
                        onDelete={() => setDeleteId(r.id)}
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
            <DialogTitle>{mode === 'edit' ? 'Editar rutina' : 'Nueva rutina'}</DialogTitle>
          </DialogHeader>
          <form id="rut-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Input id="objetivo" name="objetivo" defaultValue={selected?.objetivo ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estudiante_id">ID estudiante (opcional)</Label>
              <Input
                id="estudiante_id"
                name="estudiante_id"
                type="number"
                defaultValue={selected?.estudiante_id ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor_id">ID instructor (opcional)</Label>
              <Input
                id="instructor_id"
                name="instructor_id"
                type="number"
                defaultValue={selected?.instructor_id ?? ''}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="rut-form" disabled={createMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de rutina</DialogTitle>
          </DialogHeader>
          {selected && (
            <DetailGrid
              items={[
                { label: 'ID', value: selected.id },
                { label: 'Nombre', value: selected.nombre },
                { label: 'Objetivo', value: selected.objetivo },
                { label: 'Estudiante ID', value: selected.estudiante_id },
                { label: 'Instructor ID', value: selected.instructor_id },
                { label: 'Creada', value: new Date(selected.created_at).toLocaleString() },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cerrar
            </Button>
            {selected && <Button onClick={() => setMode('edit')}>Editar</Button>}
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
