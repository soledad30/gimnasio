export const VIGENCIA_TIPOS = ['mes', 'trimestre', 'semestre', 'anual'] as const
export type VigenciaTipo = (typeof VIGENCIA_TIPOS)[number]

export const VIGENCIA_LABELS: Record<VigenciaTipo, string> = {
  mes: 'Mensual',
  trimestre: 'Trimestral',
  semestre: 'Semestral',
  anual: 'Anual',
}

export function inicioMesDefault(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function formatVigencia(
  tipo?: string | null,
  inicio?: string | null,
  fin?: string | null,
  label?: string | null
): string {
  if (label) return label
  if (!inicio || !fin) return '—'
  const t = (tipo as VigenciaTipo) ?? 'mes'
  const nombre = VIGENCIA_LABELS[t] ?? tipo ?? 'Periodo'
  return `${nombre}: ${inicio} → ${fin}`
}
