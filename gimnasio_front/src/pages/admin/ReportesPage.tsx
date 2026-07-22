import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  TrendingDown,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { reportesApi } from '@/api/services'
import {
  AccesosOverviewChart,
  AccesosPorHoraChart,
  IngresosAreaChart,
  MembresiasPlanDonut,
  MotivosDenegacionDonut,
  PagosMetodoDonut,
  ResultadoAccesosDonut,
  TasaDenegacionChart,
  TopCarrerasChart,
} from '@/components/reportes/ReportesCharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { downloadBlob } from '@/lib/download'
import { exportReportesExcel, exportReportesPdf } from '@/lib/exportReportes'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function formatTableDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-BO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="border-b bg-muted/20 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
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

  const { data: graficos, isLoading: loadingGraficos } = useQuery({
    queryKey: ['reporte-graficos', fechaInicio, fechaFin],
    queryFn: () => reportesApi.graficos(fechaInicio, fechaFin).then((r) => r.data),
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

  const handleExportPanel = async (formato: 'pdf' | 'excel') => {
    if (!graficos) {
      toast.error('Espera a que carguen los gráficos')
      return
    }
    setExportError('')
    setExporting(formato)
    try {
      const ctx = {
        fechaInicio,
        fechaFin,
        dashboard,
        accesos,
        graficos,
      }
      if (formato === 'pdf') {
        await exportReportesPdf(ctx)
        toast.success('Informe PDF generado')
      } else {
        await exportReportesExcel(ctx)
        toast.success('Informe Excel generado')
      }
    } catch (err) {
      const msg = getErrorMessage(err)
      setExportError(msg)
      toast.error(msg)
    } finally {
      setExporting(null)
    }
  }

  const loadingCharts = loadingGraficos || loadingAccesos
  const canExportPanel = !!graficos && !loadingCharts

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="inicio" className="text-xs">
              Desde
            </Label>
            <Input
              id="inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fin" className="text-xs">
              Hasta
            </Label>
            <Input
              id="fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <Button
            variant="default"
            disabled={!canExportPanel || exporting !== null}
            onClick={() => void handleExportPanel('pdf')}
          >
            {exporting === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            disabled={!canExportPanel || exporting !== null}
            onClick={() => void handleExportPanel('excel')}
          >
            {exporting === 'excel' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
        </div>
      </div>

      {exportError && (
        <Alert variant="destructive">
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total estudiantes', value: dashboard?.total_estudiantes, icon: Users },
          { label: 'Membresías activas', value: dashboard?.estudiantes_activos, icon: Users },
          { label: 'Accesos hoy', value: dashboard?.accesos_hoy, icon: BarChart3 },
          { label: 'Escaneos período', value: accesos?.total_escaneos, icon: BarChart3 },
          {
            label: 'Ingresos período',
            value: graficos?.total_ingresos?.toFixed(2),
            icon: DollarSign,
          },
          {
            label: 'Tasa denegación',
            value: accesos ? `${accesos.tasa_denegacion_pct}%` : undefined,
            icon: TrendingDown,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{label}</CardDescription>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingDash || loadingAccesos ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fila 1: overview + donuts + ingresos */}
      <div className="grid gap-4 lg:grid-cols-12">
        <ChartCard
          title="Resumen de accesos"
          description="Escaneos diarios, concedidos y denegados"
          className="lg:col-span-5"
        >
          {loadingCharts ? (
            <Skeleton className="h-[280px] w-full" />
          ) : graficos ? (
            <AccesosOverviewChart data={graficos.accesos_por_dia} />
          ) : null}
        </ChartCard>

        <ChartCard title="Resultado de accesos" description="Concedidos vs denegados" className="lg:col-span-3">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <ResultadoAccesosDonut data={graficos.resultado_accesos} />
          ) : null}
        </ChartCard>

        <ChartCard title="Ingresos del período" description="Pagos registrados por día" className="lg:col-span-4">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <IngresosAreaChart data={graficos.ingresos_por_dia} />
          ) : null}
        </ChartCard>
      </div>

      {/* Fila 2: motivos, hora, tasa */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Motivos de denegación" description="Principales causas de rechazo">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <MotivosDenegacionDonut data={graficos.motivos_denegacion} />
          ) : null}
        </ChartCard>

        <ChartCard title="Accesos por hora" description="Horarios de mayor afluencia (6:00 – 22:00)">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <AccesosPorHoraChart data={graficos.accesos_por_hora} />
          ) : null}
        </ChartCard>

        <ChartCard title="Tasa de denegación" description="Porcentaje diario de accesos rechazados">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <TasaDenegacionChart data={graficos.tasa_denegacion_por_dia} />
          ) : null}
        </ChartCard>
      </div>

      {/* Fila 3: membresías, pagos, carreras */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Membresías activas por plan" description="Distribución actual">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <MembresiasPlanDonut data={graficos.membresias_por_plan} />
          ) : null}
        </ChartCard>

        <ChartCard title="Ingresos por método de pago" description="Desglose del período">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <PagosMetodoDonut data={graficos.pagos_por_metodo} />
          ) : null}
        </ChartCard>

        <ChartCard title="Top carreras" description="Accesos por carrera universitaria">
          {loadingCharts ? (
            <Skeleton className="h-[240px] w-full" />
          ) : graficos ? (
            <TopCarrerasChart data={graficos.top_carreras} />
          ) : null}
        </ChartCard>
      </div>

      {/* Tabla resumen diario */}
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Desempeño diario
          </CardTitle>
          <CardDescription>Detalle por día del rango seleccionado</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingCharts ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : graficos && graficos.resumen_diario.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10">
                  <TableHead className="font-semibold text-foreground">Fecha</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Escaneos</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Concedidos</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Denegados</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Tasa deneg.</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Ingresos (Bs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...graficos.resumen_diario].reverse().map((row) => (
                  <TableRow key={row.fecha}>
                    <TableCell className="font-medium">{formatTableDate(row.fecha)}</TableCell>
                    <TableCell className="text-right">{row.escaneos}</TableCell>
                    <TableCell className="text-right text-emerald-700 dark:text-emerald-500">
                      {row.concedidos}
                    </TableCell>
                    <TableCell className="text-right text-destructive">{row.denegados}</TableCell>
                    <TableCell className="text-right">{row.tasa_denegacion_pct}%</TableCell>
                    <TableCell className="text-right">{row.ingresos.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin datos en el período</p>
          )}
        </CardContent>
      </Card>

      {/* Export panel + CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Exportar reportes
          </CardTitle>
          
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!canExportPanel || exporting !== null}
              onClick={() => void handleExportPanel('pdf')}
            >
              {exporting === 'pdf' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Informe PDF
            </Button>
            <Button
              variant="outline"
              disabled={!canExportPanel || exporting !== null}
              onClick={() => void handleExportPanel('excel')}
            >
              {exporting === 'excel' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Informe Excel
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
                CSV — {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
