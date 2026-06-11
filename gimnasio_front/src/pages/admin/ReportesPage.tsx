import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { reportesApi } from '@/api/services'
import { downloadBlob } from '@/lib/download'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export function ReportesPage() {
  const [fechaInicio, setFechaInicio] = useState(monthStartIso())
  const [fechaFin, setFechaFin] = useState(todayIso())
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportError, setExportError] = useState('')

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['reportes-dashboard'],
    queryFn: () => reportesApi.dashboard().then((r) => r.data),
  })

  const { data: accesos, isLoading: loadingAccesos } = useQuery({
    queryKey: ['reporte-accesos', fechaInicio, fechaFin],
    queryFn: () => reportesApi.accesos(fechaInicio, fechaFin).then((r) => r.data),
    enabled: !!fechaInicio && !!fechaFin,
  })

  const handleExport = async (
    tipo: 'accesos' | 'pagos' | 'membresias' | 'estudiantes',
    filename: string
  ) => {
    setExportError('')
    setExporting(tipo)
    try {
      const needsDates = tipo === 'accesos' || tipo === 'pagos'
      const { data } = await reportesApi.exportCsv(
        tipo,
        needsDates ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : undefined
      )
      downloadBlob(data, filename)
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Resumen del gimnasio y exportación a CSV</p>
      </div>

      {exportError && (
        <Alert variant="destructive">
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total estudiantes', value: dashboard?.total_estudiantes },
          { label: 'Membresías activas', value: dashboard?.estudiantes_activos },
          { label: 'Accesos hoy', value: dashboard?.accesos_hoy },
          { label: 'Ingresos del mes', value: dashboard?.ingresos_mes?.toFixed(2) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDash ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Reporte de accesos
          </CardTitle>
          <CardDescription>Filtra por rango de fechas y descarga el detalle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="inicio">Desde</Label>
              <Input
                id="inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin">Hasta</Label>
              <Input
                id="fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          {loadingAccesos ? (
            <Skeleton className="h-20 w-full" />
          ) : accesos ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-2xl font-bold">{accesos.total_escaneos}</p>
                <p className="text-sm text-muted-foreground">Total escaneos</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-2xl font-bold text-emerald-500">{accesos.accesos_concedidos}</p>
                <p className="text-sm text-muted-foreground">Concedidos</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-2xl font-bold text-destructive">{accesos.accesos_denegados}</p>
                <p className="text-sm text-muted-foreground">Denegados</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-2xl font-bold">{accesos.tasa_denegacion_pct}%</p>
                <p className="text-sm text-muted-foreground">Tasa denegación</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Exportar CSV
          </CardTitle>
          <CardDescription>
            Accesos y pagos usan el rango de fechas seleccionado arriba
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['accesos', 'accesos.csv', 'Accesos'],
              ['pagos', 'pagos.csv', 'Pagos'],
              ['membresias', 'membresias.csv', 'Membresías'],
              ['estudiantes', 'estudiantes.csv', 'Estudiantes'],
            ] as const
          ).map(([tipo, file, label]) => (
            <Button
              key={tipo}
              variant="outline"
              className="justify-start"
              disabled={exporting !== null}
              onClick={() => handleExport(tipo, file)}
            >
              {exporting === tipo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar {label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
