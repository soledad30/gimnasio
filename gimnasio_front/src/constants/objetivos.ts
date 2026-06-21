export const OBJETIVOS_RUTINA = [
  { value: 'definicion', label: 'Definición' },
  { value: 'hipertrofia', label: 'Ganancia muscular / hipertrofia' },
  { value: 'abdomen', label: 'Abdomen / core' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'perdida_peso', label: 'Pérdida de peso' },
  { value: 'flexibilidad', label: 'Flexibilidad' },
  { value: 'general', label: 'General' },
] as const

export const OBJETIVOS_LABEL: Record<string, string> = Object.fromEntries(
  OBJETIVOS_RUTINA.map((o) => [o.value, o.label])
)

export function objetivoLabel(value?: string | null): string {
  if (!value) return '—'
  return OBJETIVOS_LABEL[value] ?? value
}
