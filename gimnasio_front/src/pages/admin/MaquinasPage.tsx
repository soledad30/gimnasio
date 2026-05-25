import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { maquinasApi } from '@/api/services'
import type { Maquina } from '@/types'
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

const ESTADOS = ['disponible', 'mantenimiento', 'fuera_servicio']

export function MaquinasPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Maquina | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinasApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, string>) => maquinasApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinas'] })
      setMode(null)
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

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd) as Record<string, string>
    if (mode === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, body })
    } else {
      createMut.mutate(body)
    }
  }

  return (
    <>
      <PageHeader
        title="Máquinas"
        description="Equipamiento del gimnasio"
        onCreate={() => {
          setSelected(null)
          setMode('create')
        }}
        createLabel="Nueva máquina"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} máquina(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.codigo || '—'}</TableCell>
                    <TableCell className="font-medium">{m.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={m.estado_maquina === 'disponible' ? 'success' : 'warning'}>
                        {m.estado_maquina}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => {
                          setSelected(m)
                          setMode('view')
                        }}
                        onEdit={() => {
                          setSelected(m)
                          setMode('edit')
                        }}
                        onDelete={() => setDeleteId(m.id)}
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
            <DialogTitle>{mode === 'edit' ? 'Editar máquina' : 'Nueva máquina'}</DialogTitle>
          </DialogHeader>
          <form id="maq-form" onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={selected?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" name="codigo" defaultValue={selected?.codigo ?? ''} />
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
                defaultValue={selected?.estado_maquina ?? 'disponible'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="maq-form" disabled={createMut.isPending || updateMut.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'view'} onOpenChange={() => setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de máquina</DialogTitle>
          </DialogHeader>
          {selected && (
            <DetailGrid
              items={[
                { label: 'ID', value: selected.id },
                { label: 'Código', value: selected.codigo },
                { label: 'Nombre', value: selected.nombre },
                { label: 'Descripción', value: selected.descripcion },
                { label: 'Estado', value: selected.estado_maquina },
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
