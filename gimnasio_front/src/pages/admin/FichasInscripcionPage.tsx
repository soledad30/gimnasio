import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Download, ExternalLink, FileCheck, FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage, getMediaUrl } from '@/api/client'
import { fichasInscripcionApi } from '@/api/services'
import type { FichaInscripcionResumen } from '@/types'
import { PageHeader } from '@/components/crud/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type FiltroEstado = '' | 'vigente' | 'vencida' | 'pendiente_certificado'

function estadoBadge(estado: string) {
  switch (estado) {
    case 'vigente':
      return <Badge variant="success">Vigente</Badge>
    case 'vencida':
      return <Badge variant="destructive">Vencida</Badge>
    case 'pendiente_certificado':
      return <Badge variant="outline">Pend. certificado</Badge>
    default:
      return <Badge variant="outline">{estado}</Badge>
  }
}

export function FichasInscripcionPage() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<FiltroEstado>('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['fichas-inscripcion', filtro],
    queryFn: () =>
      fichasInscripcionApi.list(filtro ? { estado: filtro } : undefined).then((r) => r.data),
  })

  const certMut = useMutation({
    mutationFn: ({ id, recibido }: { id: number; recibido: boolean }) =>
      fichasInscripcionApi.marcarCertificado(id, recibido),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fichas-inscripcion'] })
      toast.success('Certificado actualizado')
    },
  })

  const abrirExport = async (fichaId: number) => {
    try {
      const res = await fichasInscripcionApi.exportar(fichaId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html;charset=utf-8' }))
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const vigentes = data.filter((f) => f.estado === 'vigente').length
  const vencidas = data.filter((f) => f.estado === 'vencida').length
  const pendientes = data.filter((f) => f.estado === 'pendiente_certificado').length

  return (
    <>
      <PageHeader
        title="Fichas de inscripción"
        description="Formulario DUBSS-FR-03 — seguimiento de vigencia y certificados médicos"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-4 w-4 text-green-600" />
              Vigentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vigentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="h-4 w-4 text-destructive" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vencidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pend. certificado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendientes}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Fichas vigentes por estudiante</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {(['', 'vigente', 'vencida', 'pendiente_certificado'] as FiltroEstado[]).map((f) => (
              <Button
                key={f || 'todas'}
                size="sm"
                variant={filtro === f ? 'default' : 'outline'}
                onClick={() => setFiltro(f)}
              >
                {f === '' ? 'Todas' : f === 'pendiente_certificado' ? 'Pend. cert.' : f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Certificado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay fichas con este filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((f: FichaInscripcionResumen) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.estudiante_nombre}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {f.estudiante_registro || '—'}
                      </TableCell>
                      <TableCell>{estadoBadge(f.estado)}</TableCell>
                      <TableCell className="text-sm">
                        {f.fecha_vigencia_desde} → {f.fecha_vigencia_hasta}
                      </TableCell>
                      <TableCell>
                        {f.requiere_certificado_medico ? (
                          <div className="flex flex-col gap-1">
                            {f.certificado_medico_recibido ? (
                              <Badge variant="success">Recibido</Badge>
                            ) : f.certificado_medico_url ? (
                              <Badge variant="outline">Subido — validar</Badge>
                            ) : (
                              <Badge variant="outline">Pendiente</Badge>
                            )}
                            {f.certificado_medico_url && (
                              <a
                                href={getMediaUrl(f.certificado_medico_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver archivo
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirExport(f.id)}
                            title="Imprimir ficha"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {f.requiere_certificado_medico && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={certMut.isPending}
                              onClick={() =>
                                certMut.mutate({ id: f.id, recibido: !f.certificado_medico_recibido })
                              }
                            >
                              {f.certificado_medico_recibido ? 'Marcar pendiente' : 'Marcar recibido'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
