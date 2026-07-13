import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { downloadBlob } from '@/lib/download'
import type { DashboardKpis, ReporteAccesos, ReporteGraficos } from '@/types'

export type ReportesExportContext = {
  fechaInicio: string
  fechaFin: string
  dashboard?: DashboardKpis | null
  accesos?: ReporteAccesos | null
  graficos: ReporteGraficos
  /** @deprecated Ya no se usa (evita captura dark del dashboard) */
  panelEl?: HTMLElement | null
}

const BRAND = {
  green: '#166534',
  greenLight: '#22c55e',
  red: '#dc2626',
  cyan: '#0891b2',
  amber: '#d97706',
  violet: '#7c3aed',
  blue: '#2563eb',
  slate: '#475569',
  border: '#cbd5e1',
  muted: '#64748b',
  headerBg: '#14532d',
}

const PIE_COLORS = [
  BRAND.greenLight,
  BRAND.cyan,
  BRAND.amber,
  BRAND.violet,
  BRAND.blue,
  BRAND.red,
  BRAND.slate,
]

function formatBoDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatShort(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function createChartCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  return { canvas, ctx }
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, width: number) {
  ctx.fillStyle = BRAND.headerBg
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif'
  ctx.fillText(title, 24, 34)
  ctx.strokeStyle = BRAND.border
  ctx.beginPath()
  ctx.moveTo(24, 48)
  ctx.lineTo(width - 24, 48)
  ctx.stroke()
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  items: { label: string; color: string }[],
  x: number,
  y: number
) {
  ctx.font = '13px Helvetica, Arial, sans-serif'
  let cx = x
  for (const item of items) {
    ctx.fillStyle = item.color
    roundRect(ctx, cx, y - 10, 14, 14, 3)
    ctx.fill()
    ctx.fillStyle = BRAND.slate
    ctx.fillText(item.label, cx + 20, y + 2)
    cx += ctx.measureText(item.label).width + 42
  }
}

/** Gráfico de barras agrupadas + líneas: accesos por día */
function chartAccesosPorDia(
  data: ReporteGraficos['accesos_por_dia']
): HTMLCanvasElement {
  const W = 920
  const H = 340
  const { canvas, ctx } = createChartCanvas(W, H)
  drawTitle(ctx, 'Resumen de accesos por día', W)
  drawLegend(
    ctx,
    [
      { label: 'Escaneos', color: BRAND.cyan },
      { label: 'Concedidos', color: BRAND.greenLight },
      { label: 'Denegados', color: BRAND.red },
    ],
    24,
    70
  )

  const pad = { t: 90, r: 36, b: 56, l: 56 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const maxY = Math.max(1, ...data.map((d) => d.total))
  const n = Math.max(data.length, 1)
  const groupW = plotW / n

  // ejes
  ctx.strokeStyle = BRAND.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.l, pad.t)
  ctx.lineTo(pad.l, pad.t + plotH)
  ctx.lineTo(pad.l + plotW, pad.t + plotH)
  ctx.stroke()

  // guías
  ctx.fillStyle = BRAND.muted
  ctx.font = '11px Helvetica, Arial, sans-serif'
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + plotH - (plotH * i) / 4
    const val = Math.round((maxY * i) / 4)
    ctx.strokeStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(pad.l + plotW, y)
    ctx.stroke()
    ctx.fillStyle = BRAND.muted
    ctx.textAlign = 'right'
    ctx.fillText(String(val), pad.l - 8, y + 4)
  }
  ctx.textAlign = 'left'

  data.forEach((d, i) => {
    const x0 = pad.l + i * groupW + groupW * 0.18
    const barW = groupW * 0.64
    const h = (d.total / maxY) * plotH
    ctx.fillStyle = BRAND.cyan
    ctx.globalAlpha = 0.35
    ctx.fillRect(x0, pad.t + plotH - h, barW, h)
    ctx.globalAlpha = 1

    ctx.fillStyle = BRAND.slate
    ctx.font = '10px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(formatShort(d.fecha), pad.l + i * groupW + groupW / 2, H - 22)
  })
  ctx.textAlign = 'left'

  const lineSeries = [
    { key: 'concedidos' as const, color: BRAND.greenLight },
    { key: 'denegados' as const, color: BRAND.red },
  ]
  for (const s of lineSeries) {
    ctx.strokeStyle = s.color
    ctx.lineWidth = 2.5
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = pad.l + i * groupW + groupW / 2
      const y = pad.t + plotH - (d[s.key] / maxY) * plotH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    data.forEach((d, i) => {
      const x = pad.l + i * groupW + groupW / 2
      const y = pad.t + plotH - (d[s.key] / maxY) * plotH
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return canvas
}

function chartIngresos(data: ReporteGraficos['ingresos_por_dia']): HTMLCanvasElement {
  const W = 920
  const H = 320
  const { canvas, ctx } = createChartCanvas(W, H)
  drawTitle(ctx, 'Ingresos del período (Bs)', W)

  const pad = { t: 70, r: 36, b: 56, l: 64 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const maxY = Math.max(1, ...data.map((d) => d.monto))
  const n = Math.max(data.length, 1)
  const step = plotW / Math.max(n - 1, 1)

  for (let i = 0; i <= 4; i++) {
    const y = pad.t + plotH - (plotH * i) / 4
    ctx.strokeStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(pad.l + plotW, y)
    ctx.stroke()
    ctx.fillStyle = BRAND.muted
    ctx.font = '11px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(Math.round((maxY * i) / 4)), pad.l - 8, y + 4)
  }
  ctx.textAlign = 'left'

  const points = data.map((d, i) => ({
    x: pad.l + (n === 1 ? plotW / 2 : i * step),
    y: pad.t + plotH - (d.monto / maxY) * plotH,
    label: formatShort(d.fecha),
    monto: d.monto,
  }))

  // área
  if (points.length) {
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH)
    grad.addColorStop(0, 'rgba(34,197,94,0.35)')
    grad.addColorStop(1, 'rgba(34,197,94,0.02)')
    ctx.beginPath()
    ctx.moveTo(points[0].x, pad.t + plotH)
    points.forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, pad.t + plotH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.strokeStyle = BRAND.greenLight
    ctx.lineWidth = 2.5
    ctx.beginPath()
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()

    points.forEach((p) => {
      ctx.fillStyle = BRAND.green
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = BRAND.slate
      ctx.font = '10px Helvetica, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.label, p.x, H - 22)
    })
  }
  ctx.textAlign = 'left'
  return canvas
}

function chartBarrasHoriz(
  title: string,
  items: { label: string; value: number }[],
  color: string
): HTMLCanvasElement {
  const W = 920
  const rowH = 36
  const H = Math.max(220, 80 + items.length * rowH)
  const { canvas, ctx } = createChartCanvas(W, H)
  drawTitle(ctx, title, W)

  const pad = { t: 70, r: 80, b: 24, l: 220 }
  const plotW = W - pad.l - pad.r
  const maxV = Math.max(1, ...items.map((i) => i.value))

  items.forEach((item, idx) => {
    const y = pad.t + idx * rowH
    ctx.fillStyle = BRAND.slate
    ctx.font = '13px Helvetica, Arial, sans-serif'
    ctx.textAlign = 'right'
    const label =
      item.label.length > 28 ? `${item.label.slice(0, 26)}…` : item.label
    ctx.fillText(label, pad.l - 12, y + 16)

    const w = (item.value / maxV) * plotW
    ctx.fillStyle = '#f1f5f9'
    roundRect(ctx, pad.l, y, plotW, 22, 4)
    ctx.fill()
    ctx.fillStyle = color
    roundRect(ctx, pad.l, y, Math.max(w, 2), 22, 4)
    ctx.fill()

    ctx.fillStyle = BRAND.headerBg
    ctx.textAlign = 'left'
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif'
    ctx.fillText(String(item.value), pad.l + w + 8, y + 16)
  })
  ctx.textAlign = 'left'
  return canvas
}

function chartDonut(
  title: string,
  items: { label: string; value: number }[],
  colors: string[] = PIE_COLORS
): HTMLCanvasElement {
  const W = 520
  const H = 340
  const { canvas, ctx } = createChartCanvas(W, H)
  drawTitle(ctx, title, W)

  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const cx = 170
  const cy = 190
  const R = 95
  const r = 58
  let angle = -Math.PI / 2

  items.forEach((item, i) => {
    const slice = (item.value / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.fillStyle = colors[i % colors.length]
    ctx.arc(cx, cy, R, angle, angle + slice)
    ctx.closePath()
    ctx.fill()
    angle += slice
  })

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = BRAND.headerBg
  ctx.font = 'bold 26px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(String(total), cx, cy + 2)
  ctx.font = '12px Helvetica, Arial, sans-serif'
  ctx.fillStyle = BRAND.muted
  ctx.fillText('total', cx, cy + 20)
  ctx.textAlign = 'left'

  // leyenda
  let ly = 90
  items.forEach((item, i) => {
    const x = 320
    ctx.fillStyle = colors[i % colors.length]
    roundRect(ctx, x, ly, 14, 14, 3)
    ctx.fill()
    ctx.fillStyle = BRAND.slate
    ctx.font = '13px Helvetica, Arial, sans-serif'
    const pct = ((item.value / total) * 100).toFixed(1)
    ctx.fillText(`${item.label}: ${item.value} (${pct}%)`, x + 22, ly + 12)
    ly += 28
  })

  return canvas
}

function chartAccesosHora(data: ReporteGraficos['accesos_por_hora']): HTMLCanvasElement {
  return chartBarrasHoriz(
    'Accesos por hora',
    data.map((d) => ({ label: `${String(d.hora).padStart(2, '0')}:00`, value: d.count })),
    BRAND.cyan
  )
}

function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').split(',')[1]
}

function buildChartSet(g: ReporteGraficos) {
  return {
    accesosDia: chartAccesosPorDia(g.accesos_por_dia),
    ingresos: chartIngresos(g.ingresos_por_dia),
    resultado: chartDonut(
      'Resultado de accesos',
      g.resultado_accesos.map((r) => ({ label: r.nombre, value: r.valor })),
      [BRAND.greenLight, BRAND.red]
    ),
    motivos: chartDonut(
      'Motivos de denegación',
      g.motivos_denegacion.map((r) => ({ label: r.motivo, value: r.count }))
    ),
    hora: chartAccesosHora(g.accesos_por_hora),
    planes: chartDonut(
      'Membresías por plan',
      g.membresias_por_plan.map((r) => ({ label: r.plan, value: r.count }))
    ),
    metodos: chartDonut(
      'Ingresos por método de pago',
      g.pagos_por_metodo.map((r) => ({ label: r.metodo, value: r.monto }))
    ),
    carreras: chartBarrasHoriz(
      'Top carreras (accesos)',
      g.top_carreras.map((r) => ({ label: r.carrera, value: r.accesos })),
      BRAND.violet
    ),
    tasa: chartBarrasHoriz(
      'Tasa de denegación por día (%)',
      g.tasa_denegacion_por_dia.map((r) => ({
        label: formatShort(r.fecha),
        value: Number(r.tasa.toFixed(1)),
      })),
      BRAND.amber
    ),
  }
}

function addPdfImage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  maxW: number
): number {
  const ratio = canvas.height / canvas.width
  const w = maxW
  const h = w * ratio
  const pageH = pdf.internal.pageSize.getHeight()
  let yy = y
  if (yy + h > pageH - 14) {
    pdf.addPage()
    yy = 18
  }
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, yy, w, h)
  return yy + h + 6
}

function kpiBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  const [r, g, b] = hexToRgb(BRAND.green)
  pdf.setDrawColor(203, 213, 225)
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(x, y, w, h, 2, 2, 'FD')
  pdf.setFillColor(r, g, b)
  pdf.rect(x, y, 2.2, h, 'F')
  pdf.setTextColor(100, 116, 139)
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'normal')
  pdf.text(label, x + 5, y + 6)
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text(value, x + 5, y + 14)
}

export async function exportReportesPdf(ctx: ReportesExportContext) {
  const g = ctx.graficos
  const charts = buildChartSet(g)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 14

  // Portada / encabezado
  pdf.setFillColor(...hexToRgb(BRAND.headerBg))
  pdf.rect(0, 0, pageW, 28, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('UAGRM-GYM', margin, 12)
  pdf.setFontSize(11)
  pdf.text('Informe estadístico de operación', margin, 20)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(
    `Período: ${formatBoDate(ctx.fechaInicio)}  –  ${formatBoDate(ctx.fechaFin)}`,
    pageW - margin,
    12,
    { align: 'right' }
  )
  pdf.text(`Generado: ${new Date().toLocaleString('es-BO')}`, pageW - margin, 20, {
    align: 'right',
  })

  let y = 36
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('1. Indicadores del período', margin, y)
  y += 4

  const kpis: [string, string][] = [
    ['Total estudiantes', String(ctx.dashboard?.total_estudiantes ?? '—')],
    ['Membresías activas', String(ctx.dashboard?.estudiantes_activos ?? '—')],
    ['Escaneos', String(ctx.accesos?.total_escaneos ?? '—')],
    ['Concedidos', String(ctx.accesos?.accesos_concedidos ?? '—')],
    ['Denegados', String(ctx.accesos?.accesos_denegados ?? '—')],
    ['Tasa denegación', `${ctx.accesos?.tasa_denegacion_pct ?? '—'}%`],
    ['Ingresos (Bs)', Number(g.total_ingresos).toLocaleString('es-BO', { minimumFractionDigits: 2 })],
    ['Accesos hoy', String(ctx.dashboard?.accesos_hoy ?? '—')],
  ]
  const boxW = (pageW - margin * 2 - 6) / 4
  const boxH = 18
  kpis.forEach((kpi, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    kpiBlock(pdf, margin + col * (boxW + 2), y + row * (boxH + 3), boxW, boxH, kpi[0], kpi[1])
  })
  y += 2 * (boxH + 3) + 10

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(15, 23, 42)
  pdf.text('2. Desempeño diario', margin, y)
  y += 2

  autoTable(pdf, {
    startY: y,
    head: [['Fecha', 'Escaneos', 'Concedidos', 'Denegados', 'Tasa %', 'Ingresos (Bs)']],
    body: g.resumen_diario.map((r) => [
      formatBoDate(r.fecha),
      r.escaneos,
      r.concedidos,
      r.denegados,
      r.tasa_denegacion_pct,
      r.ingresos.toFixed(2),
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: hexToRgb(BRAND.headerBg),
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.2 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: {halign: 'right' },
      5: {halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  y = ((pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  if (y > 250) {
    pdf.addPage()
    y = 18
  }
  pdf.text('3. Gráficos', margin, y)
  y += 4

  const fullW = pageW - margin * 2
  y = addPdfImage(pdf, charts.accesosDia, margin, y, fullW)
  y = addPdfImage(pdf, charts.ingresos, margin, y, fullW)

  const half = (fullW - 4) / 2
  const pageH = pdf.internal.pageSize.getHeight()
  const pairH =
    Math.max(
      (charts.resultado.height / charts.resultado.width) * half,
      (charts.motivos.height / charts.motivos.width) * half
    ) + 4
  if (y + pairH > pageH - 14) {
    pdf.addPage()
    y = 18
  }
  pdf.addImage(charts.resultado.toDataURL('image/png'), 'PNG', margin, y, half, (charts.resultado.height / charts.resultado.width) * half)
  pdf.addImage(
    charts.motivos.toDataURL('image/png'),
    'PNG',
    margin + half + 4,
    y,
    half,
    (charts.motivos.height / charts.motivos.width) * half
  )
  y += pairH + 4

  y = addPdfImage(pdf, charts.hora, margin, y, fullW)
  y = addPdfImage(pdf, charts.tasa, margin, y, fullW)

  if (y + pairH > pageH - 14) {
    pdf.addPage()
    y = 18
  }
  pdf.addImage(charts.planes.toDataURL('image/png'), 'PNG', margin, y, half, (charts.planes.height / charts.planes.width) * half)
  pdf.addImage(
    charts.metodos.toDataURL('image/png'),
    'PNG',
    margin + half + 4,
    y,
    half,
    (charts.metodos.height / charts.metodos.width) * half
  )
  y += pairH + 4
  addPdfImage(pdf, charts.carreras, margin, y, fullW)

  // Pie de página
  const total = pdf.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(226, 232, 240)
    pdf.line(margin, pageH - 10, pageW - margin, pageH - 10)
    pdf.setFontSize(8)
    pdf.setTextColor(100, 116, 139)
    pdf.setFont('helvetica', 'normal')
    pdf.text('UAGRM-GYM · Informe confidencial de uso interno', margin, pageH - 5)
    pdf.text(`Página ${i} de ${total}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  pdf.save(`Informe_UAGRM-GYM_${ctx.fechaInicio}_${ctx.fechaFin}.pdf`)
}

type SheetRow = (string | number | null | undefined)[]

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, colCount: number) {
  const row = sheet.getRow(rowNumber)
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14532D' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  }
  row.height = 22
}

function styleDataRows(sheet: ExcelJS.Worksheet, from: number, to: number, colCount: number) {
  for (let r = from; r <= to; r++) {
    const row = sheet.getRow(r)
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c)
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      if (r % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }
    }
  }
}

function addDataSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: SheetRow[],
  opts?: { moneyCols?: number[]; numberCols?: number[] }
) {
  const sheet = wb.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  sheet.addRow(headers)
  styleHeaderRow(sheet, 1, headers.length)
  rows.forEach((r) => sheet.addRow(r))
  if (rows.length) styleDataRows(sheet, 2, rows.length + 1, headers.length)

  headers.forEach((_, i) => {
    let max = headers[i].length + 2
    rows.forEach((r) => {
      max = Math.max(max, String(r[i] ?? '').length + 2)
    })
    sheet.getColumn(i + 1).width = Math.min(Math.max(max, 12), 36)
  })

  opts?.moneyCols?.forEach((c) => {
    sheet.getColumn(c).numFmt = '#,##0.00'
  })
  opts?.numberCols?.forEach((c) => {
    sheet.getColumn(c).numFmt = '#,##0'
  })

  return sheet
}

function addChartImage(
  wb: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  canvas: HTMLCanvasElement,
  col: number,
  row: number,
  widthPx: number
) {
  const id = wb.addImage({
    base64: canvasToPngBase64(canvas),
    extension: 'png',
  })
  const heightPx = Math.round((canvas.height / canvas.width) * widthPx)
  sheet.addImage(id, {
    tl: { col, row },
    ext: { width: widthPx, height: heightPx },
  })
  return Math.ceil(heightPx / 18) + 1
}

export async function exportReportesExcel(ctx: ReportesExportContext) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'UAGRM-GYM'
  wb.created = new Date()
  wb.title = `Informe UAGRM-GYM ${ctx.fechaInicio} — ${ctx.fechaFin}`

  const g = ctx.graficos
  const charts = buildChartSet(g)

  // —— Portada / Resumen profesional ——
  const resumen = wb.addWorksheet('Informe', {
    properties: { tabColor: { argb: 'FF14532D' } },
  })
  resumen.mergeCells('A1:F1')
  resumen.getCell('A1').value = 'UAGRM-GYM — Informe estadístico de operación'
  resumen.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  resumen.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF14532D' },
  }
  resumen.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }
  resumen.getRow(1).height = 32

  resumen.mergeCells('A2:F2')
  resumen.getCell('A2').value =
    `Período: ${formatBoDate(ctx.fechaInicio)} → ${formatBoDate(ctx.fechaFin)}   ·   Generado: ${new Date().toLocaleString('es-BO')}`
  resumen.getCell('A2').font = { size: 10, color: { argb: 'FF475569' } }
  resumen.getRow(2).height = 20

  resumen.getCell('A4').value = 'Indicadores clave'
  resumen.getCell('A4').font = { bold: true, size: 12, color: { argb: 'FF14532D' } }

  const kpiStart = 5
  resumen.getCell('A5').value = 'Indicador'
  resumen.getCell('B5').value = 'Valor'
  resumen.getCell('C5').value = 'Nota'
  styleHeaderRow(resumen, 5, 3)

  const kpiRows: [string, string | number, string][] = [
    ['Total estudiantes', ctx.dashboard?.total_estudiantes ?? '—', 'Activos en sistema'],
    ['Membresías activas', ctx.dashboard?.estudiantes_activos ?? '—', 'Con plan vigente'],
    ['Accesos hoy', ctx.dashboard?.accesos_hoy ?? '—', 'Día calendario actual'],
    ['Escaneos del período', ctx.accesos?.total_escaneos ?? '—', 'Entradas + denegados'],
    ['Accesos concedidos', ctx.accesos?.accesos_concedidos ?? '—', 'Ingresos válidos'],
    ['Accesos denegados', ctx.accesos?.accesos_denegados ?? '—', 'Rechazos'],
    ['Tasa de denegación', ctx.accesos?.tasa_denegacion_pct ?? '—', '%'],
    ['Ingresos del período', g.total_ingresos, 'Bs'],
  ]
  kpiRows.forEach((r, i) => {
    const row = kpiStart + 1 + i
    resumen.getCell(`A${row}`).value = r[0]
    resumen.getCell(`B${row}`).value = r[1]
    resumen.getCell(`C${row}`).value = r[2]
    if (r[0] === 'Ingresos del período') {
      resumen.getCell(`B${row}`).numFmt = '"Bs "#,##0.00'
    }
  })
  styleDataRows(resumen, kpiStart + 1, kpiStart + kpiRows.length, 3)
  resumen.getColumn(1).width = 28
  resumen.getColumn(2).width = 16
  resumen.getColumn(3).width = 28
  resumen.getColumn(4).width = 14
  resumen.getColumn(5).width = 14
  resumen.getColumn(6).width = 14

  // Gráficos bien separados (no mezclar KPIs en un solo chart)
  let chartRow = kpiStart + kpiRows.length + 3
  resumen.getCell(`A${chartRow}`).value = 'Gráficos del período'
  resumen.getCell(`A${chartRow}`).font = { bold: true, size: 12, color: { argb: 'FF14532D' } }
  chartRow += 1

  chartRow += addChartImage(wb, resumen, charts.accesosDia, 0, chartRow, 720)
  chartRow += 1
  chartRow += addChartImage(wb, resumen, charts.ingresos, 0, chartRow, 720)
  chartRow += 1
  addChartImage(wb, resumen, charts.resultado, 0, chartRow, 360)
  addChartImage(wb, resumen, charts.motivos, 5, chartRow, 360)
  chartRow += 14
  chartRow += addChartImage(wb, resumen, charts.hora, 0, chartRow, 720)
  chartRow += 1
  addChartImage(wb, resumen, charts.planes, 0, chartRow, 360)
  addChartImage(wb, resumen, charts.metodos, 5, chartRow, 360)
  chartRow += 14
  chartRow += addChartImage(wb, resumen, charts.carreras, 0, chartRow, 720)
  chartRow += 1
  addChartImage(wb, resumen, charts.tasa, 0, chartRow, 720)

  // —— Hojas de datos ——
  addDataSheet(
    wb,
    'Desempeño diario',
    ['Fecha', 'Escaneos', 'Concedidos', 'Denegados', 'Tasa deneg. %', 'Ingresos (Bs)'],
    g.resumen_diario.map((r) => [
      r.fecha,
      r.escaneos,
      r.concedidos,
      r.denegados,
      r.tasa_denegacion_pct,
      r.ingresos,
    ]),
    { moneyCols: [6], numberCols: [2, 3, 4] }
  )

  addDataSheet(
    wb,
    'Accesos por día',
    ['Fecha', 'Total', 'Concedidos', 'Denegados'],
    g.accesos_por_dia.map((r) => [r.fecha, r.total, r.concedidos, r.denegados]),
    { numberCols: [2, 3, 4] }
  )

  addDataSheet(
    wb,
    'Resultado accesos',
    ['Resultado', 'Cantidad'],
    g.resultado_accesos.map((r) => [r.nombre, r.valor]),
    { numberCols: [2] }
  )

  addDataSheet(
    wb,
    'Motivos denegación',
    ['Motivo', 'Cantidad'],
    g.motivos_denegacion.map((r) => [r.motivo, r.count]),
    { numberCols: [2] }
  )

  addDataSheet(
    wb,
    'Accesos por hora',
    ['Hora', 'Cantidad'],
    g.accesos_por_hora.map((r) => [`${String(r.hora).padStart(2, '0')}:00`, r.count]),
    { numberCols: [2] }
  )

  addDataSheet(
    wb,
    'Ingresos por día',
    ['Fecha', 'Monto (Bs)'],
    g.ingresos_por_dia.map((r) => [r.fecha, r.monto]),
    { moneyCols: [2] }
  )

  addDataSheet(
    wb,
    'Pagos por método',
    ['Método', 'Monto (Bs)', 'Cantidad'],
    g.pagos_por_metodo.map((r) => [r.metodo, r.monto, r.count]),
    { moneyCols: [2], numberCols: [3] }
  )

  addDataSheet(
    wb,
    'Membresías por plan',
    ['Plan', 'Cantidad'],
    g.membresias_por_plan.map((r) => [r.plan, r.count]),
    { numberCols: [2] }
  )

  addDataSheet(
    wb,
    'Top carreras',
    ['Carrera', 'Accesos'],
    g.top_carreras.map((r) => [r.carrera, r.accesos]),
    { numberCols: [2] }
  )

  addDataSheet(
    wb,
    'Tasa denegación',
    ['Fecha', 'Tasa %'],
    g.tasa_denegacion_por_dia.map((r) => [r.fecha, r.tasa])
  )

  const buffer = await wb.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Informe_UAGRM-GYM_${ctx.fechaInicio}_${ctx.fechaFin}.xlsx`
  )
}
