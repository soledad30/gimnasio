/** Días con atención en el gimnasio (lunes a viernes). */
export const DIAS_ACTIVIDAD = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
] as const

/** Todos los días (p. ej. reservas por fecha). */
export const DIAS_SEMANA = [...DIAS_ACTIVIDAD, 'sabado', 'domingo'] as const

export function parseDias(value?: string | null): string[] {
  if (!value?.trim()) return []
  const orden = Object.fromEntries(DIAS_SEMANA.map((d, i) => [d, i]))
  const dias = value
    .split(/[,;]/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
  const unicos = [...new Set(dias)]
  return unicos.sort((a, b) => (orden[a] ?? 99) - (orden[b] ?? 99))
}

export function joinDias(dias: string[]): string {
  return parseDias(dias.join(','))
    .filter((d) => (DIAS_ACTIVIDAD as readonly string[]).includes(d))
    .join(',')
}

export function formatDias(value?: string | null): string {
  const dias = parseDias(value)
  if (!dias.length) return ''
  return dias.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
}

export function formatDiasCorto(value?: string | null): string {
  const dias = parseDias(value)
  if (!dias.length) return ''
  return dias.map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)).join(' · ')
}

/** Calcula hora fin (+1 h) a partir de HH:MM. */
export function horaFinDesdeInicio(horaInicio: string): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + 60
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
