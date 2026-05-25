import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Nfc } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { accesoApi } from '@/api/services'
import type { Acceso, NfcScanResult } from '@/types'
import { DetailGrid } from '@/components/crud/DetailGrid'
import { PageHeader } from '@/components/crud/PageHeader'
import { RowActions } from '@/components/crud/RowActions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

export function AccesoPage() {
  const [uid, setUid] = useState('')
  const [last, setLast] = useState<NfcScanResult | null>(null)
  const [error, setError] = useState('')
  const [viewRow, setViewRow] = useState<Acceso | null>(null)

  const { data: historial = [], isLoading } = useQuery({
    queryKey: ['acceso-historial'],
    queryFn: () => accesoApi.historial().then((r) => r.data),
  })

  const scanMut = useMutation({
    mutationFn: (nfc_uid: string) => accesoApi.nfcScan(nfc_uid).then((r) => r.data),
    onSuccess: (data) => {
      setLast(data)
      setError('')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Control de acceso NFC" description="Simular escaneo y revisar historial" />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Nfc className="h-5 w-5 text-primary" />
            Simular escaneo
          </CardTitle>
          <CardDescription>Registra un acceso como si pasara la tarjeta en la puerta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="nfc-uid">UID de tarjeta NFC</Label>
              <Input
                id="nfc-uid"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Ej: A1:B2:C3:D4"
              />
            </div>
            <div className="flex items-end">
              <Button disabled={!uid || scanMut.isPending} onClick={() => scanMut.mutate(uid)}>
                Registrar acceso
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {last && (
            <Alert variant={last.acceso_concedido ? 'success' : 'destructive'}>
              <AlertTitle>{last.mensaje}</AlertTitle>
              <AlertDescription>
                {last.nombre && <p>Estudiante: {last.nombre}</p>}
                {last.motivo_denegacion && <p>Motivo: {last.motivo_denegacion}</p>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de accesos</CardTitle>
          <CardDescription>Últimos registros en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell>{a.estudiante_id ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={a.acceso_concedido ? 'success' : 'destructive'}>
                        {a.acceso_concedido ? 'Concedido' : 'Denegado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions onView={() => setViewRow(a)} />
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
            <DialogTitle>Detalle de acceso</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <DetailGrid
              items={[
                { label: 'ID', value: viewRow.id },
                { label: 'Estudiante ID', value: viewRow.estudiante_id },
                { label: 'Fecha', value: viewRow.fecha },
                { label: 'Hora entrada', value: viewRow.hora_entrada },
                { label: 'Hora salida', value: viewRow.hora_salida },
                { label: 'Permanencia', value: viewRow.tiempo_permanencia },
                {
                  label: 'Resultado',
                  value: viewRow.acceso_concedido ? 'Concedido' : 'Denegado',
                },
                { label: 'Motivo denegación', value: viewRow.motivo_denegacion },
                { label: 'Registrado', value: new Date(viewRow.created_at).toLocaleString() },
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
    </>
  )
}
