import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { Nfc } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { estudiantesApi } from '@/api/services'
import type { Estudiante } from '@/types'
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { CarreraSelect } from '@/components/forms/CarreraSelect'
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

type FormMode = 'create' | 'edit' | null

export function EstudiantesPage() {
  const qc = useQueryClient()
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [viewRow, setViewRow] = useState<Estudiante | null>(null)
  const [editRow, setEditRow] = useState<Estudiante | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [nfcModal, setNfcModal] = useState<number | null>(null)
  const [nfcUid, setNfcUid] = useState('')
  const [error, setError] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => estudiantesApi.list().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Record<string, string>) => estudiantesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setFormMode(null)
      toast.success('Estudiante creado')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      estudiantesApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setFormMode(null)
      setEditRow(null)
      toast.success('Estudiante actualizado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => estudiantesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setDeleteId(null)
      toast.success('Estudiante eliminado')
    },
  })

  const nfcMut = useMutation({
    mutationFn: ({ id, uid }: { id: number; uid: string }) => estudiantesApi.assignNfc(id, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estudiantes'] })
      setNfcModal(null)
      setNfcUid('')
      toast.success('NFC asignado')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const onCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    createMut.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>)
  }

  const onEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editRow) return
    const fd = new FormData(e.currentTarget)
    updateMut.mutate({
      id: editRow.id,
      body: {
        nombre: fd.get('nombre'),
        telefono: fd.get('telefono') || null,
        carrera: fd.get('carrera') || null,
        cs: fd.get('cs') || null,
        registro_univercotario: fd.get('registro_univercotario') || null,
      },
    })
  }

  return (
    <>
      <PageHeader
        title="Estudiantes"
        description="Miembros del gimnasio y tarjetas NFC"
        onCreate={() => {
          setEditRow(null)
          setFormMode('create')
        }}
        createLabel="Nuevo estudiante"
      />

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} estudiante(s) registrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>NFC</TableHead>
                  <TableHead>Membresía</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay estudiantes. Crea el primero.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nombre}</TableCell>
                      <TableCell>{e.email}</TableCell>
                      <TableCell>{e.telefono || '—'}</TableCell>
                      <TableCell>
                        {e.nfc_uid ? (
                          <Badge variant="success">{e.nfc_uid}</Badge>
                        ) : (
                          <Badge variant="outline">Sin NFC</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.fechainicio_membresia && e.fechafin_membresia
                          ? `${e.fechainicio_membresia} → ${e.fechafin_membresia}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          onView={() => setViewRow(e)}
                          onEdit={() => {
                            setEditRow(e)
                            setFormMode('edit')
                          }}
                          onDelete={() => setDeleteId(e.id)}
                          extra={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNfcModal(e.id)}
                              title="Asignar NFC"
                            >
                              <Nfc className="h-4 w-4 shrink-0" />
                              NFC
                            </Button>
                          }
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

      <Dialog open={formMode === 'create'} onOpenChange={() => setFormMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo estudiante</DialogTitle>
          </DialogHeader>
          <form id="create-est" onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" type="tel" placeholder="70000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro_univercotario">Registro universitario</Label>
              <Input id="registro_univercotario" name="registro_univercotario" placeholder="Ej. 221001234" />
            </div>
            <CarreraSelect id="carrera" required />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="create-est" disabled={createMut.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formMode === 'edit'} onOpenChange={() => setFormMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estudiante</DialogTitle>
          </DialogHeader>
          <form id="edit-est" onSubmit={onEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input id="edit-nombre" name="nombre" defaultValue={editRow?.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telefono">Teléfono</Label>
              <Input id="edit-telefono" name="telefono" defaultValue={editRow?.telefono ?? ''} />
            </div>
            <CarreraSelect id="edit-carrera" defaultValue={editRow?.carrera} />
            <div className="space-y-2">
              <Label htmlFor="edit-cs">Cédula / CS</Label>
              <Input id="edit-cs" name="cs" defaultValue={editRow?.cs ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reg">Registro universitario</Label>
              <Input
                id="edit-reg"
                name="registro_univercotario"
                defaultValue={editRow?.registro_univercotario ?? ''}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormMode(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="edit-est" disabled={updateMut.isPending}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewRow !== null} onOpenChange={() => setViewRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del estudiante</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <DetailGrid
              items={[
                { label: 'ID', value: viewRow.id },
                { label: 'Nombre', value: viewRow.nombre },
                { label: 'Email', value: viewRow.email },
                { label: 'Teléfono', value: viewRow.telefono },
                { label: 'Carrera', value: viewRow.carrera },
                { label: 'Código acceso / QR', value: viewRow.codigo_acceso },
                { label: 'NFC UID', value: viewRow.nfc_uid },
                {
                  label: 'Membresía',
                  value:
                    viewRow.fechainicio_membresia && viewRow.fechafin_membresia
                      ? `${viewRow.fechainicio_membresia} → ${viewRow.fechafin_membresia}`
                      : 'Sin fechas',
                },
                { label: 'Registro', value: new Date(viewRow.created_at).toLocaleString() },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Cerrar
            </Button>
            {viewRow && (
              <Button
                onClick={() => {
                  setEditRow(viewRow)
                  setViewRow(null)
                  setFormMode('edit')
                }}
              >
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nfcModal !== null} onOpenChange={() => setNfcModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar tarjeta NFC</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nfc">UID NFC</Label>
            <Input
              id="nfc"
              value={nfcUid}
              onChange={(ev) => setNfcUid(ev.target.value)}
              placeholder="A1:B2:C3:D4"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNfcModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => nfcModal && nfcMut.mutate({ id: nfcModal, uid: nfcUid })}
              disabled={!nfcUid || nfcMut.isPending}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar estudiante"
        description="Se eliminará el estudiante y su acceso al sistema."
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </>
  )
}
