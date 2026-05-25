/** Carreras de pregrado UAGRM (Santa Cruz), agrupadas por facultad. */
export type CarreraGrupoUagrm = {
  facultad: string
  carreras: string[]
}

export const CARRERAS_UAGRM_GRUPOS: CarreraGrupoUagrm[] = [
  {
    facultad: 'Auditoría Financiera y Contaduría Pública',
    carreras: ['Contaduría Pública', 'Banca, Seguros y Valores'],
  },
  {
    facultad: 'Ciencias Económicas, Administrativas y Financieras',
    carreras: [
      'Administración de Empresas',
      'Economía',
      'Ingeniería Comercial',
      'Ingeniería Financiera',
      'Información y Control de Gestión',
    ],
  },
  {
    facultad: 'Ciencias Jurídicas, Políticas y Sociales',
    carreras: [
      'Derecho',
      'Relaciones Internacionales',
      'Ciencia Política y Administración Pública',
      'Trabajo Social',
    ],
  },
  {
    facultad: 'Ciencias Agrícolas',
    carreras: [
      'Ingeniería Agronómica',
      'Ingeniería Agrícola',
      'Ingeniería Forestal',
      'Ingeniería en Recursos Naturales',
      'Ingeniería en Ciencias Ambientales',
    ],
  },
  {
    facultad: 'Ciencias Exactas y Tecnología',
    carreras: [
      'Ingeniería Civil',
      'Ingeniería Química',
      'Ingeniería Industrial',
      'Ingeniería del Petróleo, Gas y Energía Renovable',
      'Ingeniería de Control de Procesos',
      'Ingeniería Ambiental',
    ],
  },
  {
    facultad: 'Politécnica',
    carreras: [
      'Ingeniería en Agrimensura',
      'Ingeniería en Construcciones Civiles',
      'Ingeniería en Electricidad Industrial',
      'Ingeniería en Electrónica',
      'Ingeniería en Mecánica Industrial',
      'Ingeniería en Metalurgia',
    ],
  },
  {
    facultad: 'Ingeniería en Ciencias de la Computación y Telecomunicaciones',
    carreras: [
      'Ingeniería en Sistemas',
      'Ingeniería en Informática',
      'Ingeniería en Redes y Telecomunicaciones',
    ],
  },
  {
    facultad: 'Humanidades',
    carreras: [
      'Ciencias de la Educación',
      'Ciencias de la Comunicación',
      'Psicología',
      'Turismo y Hotelería',
      'Historia',
      'Geografía',
      'Sociología',
      'Antropología',
      'Filosofía',
      'Lenguas Modernas — Licenciatura en Idioma Inglés',
      'Lenguas Modernas — Licenciatura en Idioma Francés',
      'Lenguas Modernas — Licenciatura en Filología Hispánica',
    ],
  },
  {
    facultad: 'Ciencias de la Salud Humana',
    carreras: [
      'Medicina',
      'Enfermería',
      'Odontología',
      'Kinesiología y Fisioterapia',
      'Nutrición y Dietética',
      'Obstetricia',
      'Tecnología Médica',
    ],
  },
  {
    facultad: 'Ciencias Farmacéuticas y Bioquímicas',
    carreras: ['Farmacia', 'Bioquímica', 'Química Farmacéutica'],
  },
  {
    facultad: 'Ciencias Veterinarias',
    carreras: ['Medicina Veterinaria y Zootecnia'],
  },
  {
    facultad: 'Ciencias del Hábitat, Diseño y Arte',
    carreras: ['Arquitectura', 'Diseño Gráfico', 'Arte', 'Urbanismo'],
  },
  {
    facultad: 'Técnicas superiores (UAGRM)',
    carreras: [
      'Técnico Superior en Agrimensura',
      'Técnico Superior en Constructor Civil',
      'Técnico Superior en Electrónica',
      'Técnico Superior en Electricidad Industrial',
      'Técnico Superior en Metalurgia',
    ],
  },
]

export const CARRERAS_UAGRM = CARRERAS_UAGRM_GRUPOS.flatMap((g) => g.carreras)
