import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReporteGraficos } from '@/types'

const COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  violet: '#a855f7',
  blue: '#3b82f6',
  muted: '#64748b',
}

const PIE_PALETTE = [
  COLORS.green,
  COLORS.cyan,
  COLORS.orange,
  COLORS.violet,
  COLORS.amber,
  COLORS.blue,
  COLORS.red,
  COLORS.muted,
]

function formatChartDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
}

function ChartTooltip({
  active,
  payload,
  label,
  valuePrefix = '',
  valueSuffix = '',
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string | number
  valuePrefix?: string
  valueSuffix?: string
}) {
  if (!active || !payload?.length) return null
  const labelText = label != null ? String(label) : undefined
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      {labelText && <p className="mb-1 font-medium text-foreground">{labelText}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {valuePrefix}
          {typeof entry.value === 'number' ? entry.value.toLocaleString('es-BO') : entry.value}
          {valueSuffix}
        </p>
      ))}
    </div>
  )
}

function DonutCenter({ total, label }: { total: number; label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold">{total.toLocaleString('es-BO')}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function AccesosOverviewChart({ data }: { data: ReporteGraficos['accesos_por_dia'] }) {
  if (!data.some((d) => d.total > 0)) {
    return <EmptyChart message="Sin accesos en el período seleccionado" />
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatChartDate(d.fecha),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip active={active} payload={payload as never} label={label} />
          )}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="total" name="Escaneos" fill={COLORS.cyan} radius={[4, 4, 0, 0]} opacity={0.85} />
        <Line
          type="monotone"
          dataKey="concedidos"
          name="Concedidos"
          stroke={COLORS.green}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS.green }}
        />
        <Line
          type="monotone"
          dataKey="denegados"
          name="Denegados"
          stroke={COLORS.red}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS.red }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function ResultadoAccesosDonut({ data }: { data: ReporteGraficos['resultado_accesos'] }) {
  const total = data.reduce((s, d) => s + d.valor, 0)
  if (total === 0) return <EmptyChart message="Sin datos de accesos" />

  const pieData = data.filter((d) => d.valor > 0).map((d) => ({ name: d.nombre, value: d.valor }))
  const colorMap: Record<string, string> = { Concedidos: COLORS.green, Denegados: COLORS.red }

  return (
    <div className="relative h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={colorMap[entry.name] ?? COLORS.muted} />
            ))}
          </Pie>
          <Tooltip
          content={({ active, payload }) => (
            <ChartTooltip
              active={active}
              payload={payload as never}
              label={payload?.[0]?.name != null ? String(payload[0].name) : undefined}
            />
          )}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <DonutCenter total={total} label="Total" />
    </div>
  )
}

export function MotivosDenegacionDonut({ data }: { data: ReporteGraficos['motivos_denegacion'] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyChart message="Sin denegaciones en el período" />

  const pieData = data.slice(0, 6).map((d) => ({
    name: d.motivo.length > 22 ? `${d.motivo.slice(0, 20)}…` : d.motivo,
    value: d.count,
    fullName: d.motivo,
  }))

  return (
    <div className="relative h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              const item = payload?.[0]?.payload as { fullName?: string; name: string; value: number }
              if (!active || !item) return null
              return (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                  <p className="font-medium">{item.fullName ?? item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.value} casos</p>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <DonutCenter total={total} label="Denegados" />
    </div>
  )
}

export function IngresosAreaChart({ data }: { data: ReporteGraficos['ingresos_por_dia'] }) {
  if (!data.some((d) => d.monto > 0)) {
    return <EmptyChart message="Sin ingresos en el período" />
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatChartDate(d.fecha),
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="ingresosGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.orange} stopOpacity={0.45} />
            <stop offset="95%" stopColor={COLORS.orange} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `Bs ${v}`}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip active={active} payload={payload as never} label={label} valuePrefix="Bs " />
          )}
        />
        <Area
          type="monotone"
          dataKey="monto"
          name="Ingresos"
          stroke={COLORS.orange}
          fill="url(#ingresosGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AccesosPorHoraChart({ data }: { data: ReporteGraficos['accesos_por_hora'] }) {
  if (!data.some((d) => d.count > 0)) {
    return <EmptyChart message="Sin datos por hora" />
  }

  const chartData = data.map((d) => ({
    ...d,
    label: `${String(d.hora).padStart(2, '0')}:00`,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip active={active} payload={payload as never} label={label} />
          )}
        />
        <Bar dataKey="count" name="Accesos" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TasaDenegacionChart({ data }: { data: ReporteGraficos['tasa_denegacion_por_dia'] }) {
  if (!data.some((d) => d.tasa > 0)) {
    return <EmptyChart message="Sin denegaciones registradas" />
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatChartDate(d.fecha),
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <ChartTooltip active={active} payload={payload as never} label={label} valueSuffix="%" />
          )}
        />
        <Line
          type="monotone"
          dataKey="tasa"
          name="Tasa denegación"
          stroke={COLORS.amber}
          strokeWidth={2}
          dot={{ r: 4, fill: COLORS.amber, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function MembresiasPlanDonut({ data }: { data: ReporteGraficos['membresias_por_plan'] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyChart message="Sin membresías activas" />

  const pieData = data.map((d) => ({ name: d.plan, value: d.count }))

  return (
    <div className="relative h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
          content={({ active, payload }) => (
            <ChartTooltip
              active={active}
              payload={payload as never}
              label={payload?.[0]?.name != null ? String(payload[0].name) : undefined}
            />
          )}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <DonutCenter total={total} label="Activas" />
    </div>
  )
}

export function PagosMetodoDonut({ data }: { data: ReporteGraficos['pagos_por_metodo'] }) {
  const total = data.reduce((s, d) => s + d.monto, 0)
  if (total === 0) return <EmptyChart message="Sin pagos en el período" />

  const pieData = data.map((d) => ({
    name: d.metodo.charAt(0).toUpperCase() + d.metodo.slice(1),
    value: d.monto,
  }))

  return (
    <div className="relative h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => (
              <ChartTooltip active={active} payload={payload as never} label={payload?.[0]?.name} valuePrefix="Bs " />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <DonutCenter total={Math.round(total)} label="Bs total" />
    </div>
  )
}

export function TopCarrerasChart({ data }: { data: ReporteGraficos['top_carreras'] }) {
  if (data.length === 0) return <EmptyChart message="Sin accesos por carrera" />

  const chartData = data.map((d) => ({
    ...d,
    label: d.carrera.length > 18 ? `${d.carrera.slice(0, 16)}…` : d.carrera,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            const item = payload?.[0]?.payload as { carrera: string; accesos: number }
            if (!active || !item) return null
            return (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                <p className="font-medium">{item.carrera}</p>
                <p className="text-xs text-muted-foreground">{item.accesos} accesos</p>
              </div>
            )
          }}
        />
        <Bar dataKey="accesos" name="Accesos" fill={COLORS.violet} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
