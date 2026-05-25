import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { reservasApi } from '@/api/services'
import type { Reserva } from '@/types'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ReservasAdminPage() {
  const qc = useQueryClient()
  const [viewRow, setViewRow] = useState<Reserva | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['reservas-admin'],
    queryFn: () => reservasApi.list().then((r) => r.data),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => reservasApi.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-admin'] })
      setCancelId(null)
      toast.success('Reserva cancelada')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        description="Reservas de clases. Puedes ver el detalle o cancelar reservas activas."
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>{data.length} reserva(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>{r.estudiante_id}</TableCell>
                    <TableCell>{r.actividad_id}</TableCell>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>
                      <Badge variant={r.estado === 1 ? 'success' : 'destructive'}>
                        {r.estado === 1 ? 'Activa' : 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewRow(r)}
                        extra={
                          r.estado === 1 ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setCancelId(r.id)}
                            >
                              Cancelar
                            </Button>
                          ) : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewRow !== null} onOpenChange={() => setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de reserva</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <DetailGrid
              items={[
                { label: 'ID reserva', value: viewRow.id },
                { label: 'Estudiante ID', value: viewRow.estudiante_id },
                { label: 'Actividad ID', value: viewRow.actividad_id },
                { label: 'Fecha', value: viewRow.fecha },
                { label: 'Estado', value: viewRow.estado === 1 ? 'Activa' : 'Cancelada' },
                { label: 'Creada', value: new Date(viewRow.created_at).toLocaleString() },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={cancelId !== null}
        onOpenChange={() => setCancelId(null)}
        title="Cancelar reserva"
        description="La reserva quedará marcada como cancelada."
        confirmLabel="Cancelar reserva"
        confirmLoadingLabel="Cancelando…"
        onConfirm={() => cancelId && cancelMut.mutate(cancelId)}
        loading={cancelMut.isPending}
      />
    </div>
  )
}
