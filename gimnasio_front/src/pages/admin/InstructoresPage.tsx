import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { instructoresApi } from '@/api/services'
import type { Instructor } from '@/types'
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

export function InstructoresPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Instructor | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => instructoresApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, string>) => instructoresApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] })
      setMode(null)
      toast.success('Instructor registrado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, string> }) =>
      instructoresApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] })
      setMode(null)
      setSelected(null)
      toast.success('Instructor actualizado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => instructoresApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] })
      setDeleteId(null)
      toast.success('Instructor eliminado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const openCreate = () => {
    setSelected(null)
    setMode('create')
  }
  const openView = (row: Instructor) => {
    setSelected(row)
    setMode('view')
  }
  const openEdit = (row: Instructor) => {
    setSelected(row)
    setMode('edit')
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd) as Record<string, string>
    if (mode === 'edit' && selected) {
      updateMut.mutate({
        id: selected.id,
        body: { nombre: body.nombre, especialidad: body.especialidad, telefono: body.telefono },
      })
    } else {
      createMut.mutate(body)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instructores"
        description="Personal que imparte clases y rutinas"
        onCreate={openCreate}
        createLabel="Nuevo instructor"
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} instructor(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No hay instructores. Registra el primero.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.nombre}</TableCell>
                      <TableCell>
                        {i.especialidad ? (
                          <Badge variant="secondary">{i.especialidad}</Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          onView={() => openView(i)}
                          onEdit={() => openEdit(i)}
                          onDelete={() => setDeleteId(i.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={mode === 'create' || mode === 'edit'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar instructor' : 'Nuevo instructor'}</DialogTitle>
          </DialogHeader>
          <form id="instructor-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            {mode === 'create' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" minLength={8} required />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="especialidad">Especialidad</Label>
              <Input id="especialidad" name="especialidad" defaultValue={selected?.especialidad ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="instructor-form"
              disabled={createMut.isPending || updateMut.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del instructor</DialogTitle>
          </DialogHeader>
          {selected && (
            <DetailGrid
              items={[
                { label: 'ID', value: selected.id },
                { label: 'Nombre', value: selected.nombre },
                { label: 'Especialidad', value: selected.especialidad },
                { label: 'Usuario ID', value: selected.usuario_id },
                {
                  label: 'Registrado',
                  value: new Date(selected.created_at).toLocaleString(),
                },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cerrar
            </Button>
            {selected && (
              <Button onClick={() => openEdit(selected)}>Editar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar instructor"
        description="Se eliminará el instructor del sistema."
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
