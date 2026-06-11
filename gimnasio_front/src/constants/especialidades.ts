export const ESPECIALIDADES_COACH = [
  'Fuerza y potencia',
  'Cardio y HIIT',
  'Flexibilidad y yoga',
  'Gimnasia',
  'Hipertrofia',
  'Crossfit',
  'Pilates',
  'Natación',
  'Spinning',
  'Entrenamiento funcional',
  'Rehabilitación',
  'Nutrición deportiva',
] as const

export type EspecialidadCoach = (typeof ESPECIALIDADES_COACH)[number]
