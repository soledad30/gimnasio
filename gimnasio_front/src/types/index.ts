export interface Usuario {
  id: number
  nombre: string
  email: string
  telefono?: string | null
  activo: boolean
  es_admin: boolean
  rol: string
  created_at: string
}

export interface UsuarioAdmin extends Usuario {
  estudiante_id?: number | null
  instructor_id?: number | null
  rol_efectivo: string
}

export interface ResetPasswordResult {
  mensaje: string
  password_temporal?: string | null
  enviado_email?: boolean
  enviado_sms?: boolean
}

export interface PermisoInfo {
  codigo: string
  nombre: string
  descripcion: string
  categoria: string
}

export interface RolResumen {
  codigo: string
  nombre: string
  descripcion: string
  editable: boolean
  permisos_activos: number
  permisos_total: number
}

export interface RolPermisosDetalle {
  codigo: string
  nombre: string
  descripcion: string
  editable: boolean
  permisos: string[]
  catalogo: PermisoInfo[]
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export type UserRol = 'admin' | 'recepcion' | 'instructor' | 'estudiante'

export interface PerfilResponse {
  usuario: Usuario
  rol: UserRol
  estudiante_id?: number | null
  instructor_id?: number | null
}

export interface InstructorPanel {
  instructor_id: number
  nombre: string
  especialidades?: string[]
  rutinas_asignadas: number
  actividades_a_cargo: number
  reservas_activas: number
}

export interface DashboardKpis {
  total_estudiantes: number
  estudiantes_activos: number
  accesos_hoy: number
  membresias_por_vencer: number
  fecha: string
  en_gimnasio_ahora?: number
  alertas_activas?: number
  total_registrados?: number
  ingresos_hoy?: number
  salidas_hoy?: number
  ingresos_mes?: number
}

export interface ReporteAccesos {
  fecha_inicio: string
  fecha_fin: string
  total_escaneos: number
  accesos_concedidos: number
  accesos_denegados: number
  tasa_denegacion_pct: number
}

export interface ReporteGraficos {
  fecha_inicio: string
  fecha_fin: string
  accesos_por_dia: { fecha: string; concedidos: number; denegados: number; total: number }[]
  resultado_accesos: { nombre: string; valor: number }[]
  motivos_denegacion: { motivo: string; count: number }[]
  accesos_por_hora: { hora: number; count: number }[]
  ingresos_por_dia: { fecha: string; monto: number }[]
  pagos_por_metodo: { metodo: string; monto: number; count: number }[]
  membresias_por_plan: { plan: string; count: number }[]
  top_carreras: { carrera: string; accesos: number }[]
  tasa_denegacion_por_dia: { fecha: string; tasa: number }[]
  resumen_diario: {
    fecha: string
    escaneos: number
    concedidos: number
    denegados: number
    ingresos: number
    tasa_denegacion_pct: number
  }[]
  total_ingresos: number
}

export interface Estudiante {
  id: number
  usuario_id: number
  nombre: string
  email: string
  telefono?: string | null
  cs?: string | null
  registro_univercotario?: string | null
  carrera?: string | null
  fotourl?: string | null
  fechainicio_membresia?: string | null
  fechafin_membresia?: string | null
  nfc_uid?: string | null
  codigo_acceso?: string | null
  tiene_rostro?: boolean
  created_at: string
}

export interface Instructor {
  id: number
  usuario_id: number
  nombre: string
  email?: string | null
  telefono?: string | null
  especialidades?: string[]
  fotourl?: string | null
  created_at: string
}

export interface Ejercicio {
  id: number
  nombre: string
  descripcion?: string | null
  grupo_muscular?: string | null
  objetivo?: string | null
  con_maquina: boolean
  maquina_id?: number | null
  maquina_nombre?: string | null
  fotourl?: string | null
  videourl?: string | null
  created_at: string
}

export interface RutinaEjercicioDetalle {
  ejercicio_id: number
  nombre: string
  descripcion?: string | null
  con_maquina: boolean
  maquina_id?: number | null
  maquina_nombre?: string | null
  maquina_codigo?: string | null
  maquina_ubicacion?: string | null
  maquina_descripcion?: string | null
  maquina_fotourl?: string | null
  fotourl?: string | null
  videourl?: string | null
  grupo_muscular?: string | null
  series?: number | null
  repeticiones?: string | null
}

export interface Actividad {
  id: number
  instructor_id?: number | null
  instructor_nombre?: string | null
  sala_id?: number | null
  sala_nombre?: string | null
  nombre: string
  descripcion?: string | null
  dia_semana?: string | null
  dias_semana?: string[]
  hora_inicio?: string | null
  hora_fin?: string | null
  capacidad: number
  vigencia_tipo?: string
  vigencia_inicio?: string | null
  vigencia_fin?: string | null
  vigencia_label?: string | null
  cupos_ocupados?: number | null
  cupos_disponibles?: number | null
  created_at: string
}

export interface Sala {
  id: number
  nombre: string
  tipo: 'actividad' | 'maquinas'
  capacidad: number
  activa: boolean
  created_at: string
}

export interface TurnoCoach {
  id: string
  nombre: string
  hora_inicio: string
  hora_fin: string
}

export interface ConfigGym {
  hora_apertura: string
  hora_cierre: string
  bloques: string[]
  turnos_coach: TurnoCoach[]
  capacidad_actividad: number
  capacidad_maquinas: number
  min_coaches_manana: number
  min_coaches_tarde: number
  min_entrenadores_actividad: number
}

export interface ConfiguracionOrganizacion {
  nombre_organizacion?: string | null
  ubicacion?: string | null
  telefono_contacto?: string | null
  email_contacto?: string | null
  sitio_web?: string | null
  facebook?: string | null
  instagram?: string | null
  whatsapp?: string | null
  tiktok?: string | null
  youtube?: string | null
  banco_nombre?: string | null
  banco_cuenta?: string | null
  banco_titular?: string | null
  qr_pago_contenido?: string | null
  gym_open_time?: string | null
  gym_close_time?: string | null
  gym_open_hour?: number | null
  gym_close_hour?: number | null
  dias_ventana_inscripcion?: number | null
  precio_inscripcion_actividad?: number | null
  precio_inscripcion_sala_maquinas?: number | null
  capacidad_sala_actividad?: number | null
  capacidad_sala_maquinas?: number | null
  horas_validez_qr_pago?: number | null
  backup_root?: string | null
  backup_drive_path?: string | null
  updated_at?: string | null
}

export interface AsignacionInstructor {
  id: number
  instructor_id: number
  instructor_nombre?: string | null
  sala_id: number
  sala_nombre?: string | null
  fecha?: string | null
  turno?: string | null
  hora_inicio: string
  hora_fin: string
  tipo: string
  vigencia_tipo?: string
  vigencia_inicio?: string | null
  vigencia_fin?: string | null
  vigencia_label?: string | null
  actividad_id?: number | null
  created_at: string
}

export interface StaffingResumen {
  fecha: string
  coaches_manana: number
  coaches_tarde: number
  coaches_manana_requeridos: number
  coaches_tarde_requeridos: number
  entrenadores_actividad: number
  entrenadores_actividad_requeridos: number
  actividades_programadas: number
  alertas: string[]
  staffing_ok: boolean
}

export interface DisponibilidadBloque {
  fecha: string
  dia_semana?: string | null
  hora_inicio: string
  hora_fin: string
  sala_id: number
  sala_nombre: string
  sala_tipo: string
  capacidad: number
  disponible: boolean
  motivo_ocupacion?: string | null
}

export interface DisponibilidadSemanalCelda {
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  sala_id: number
  sala_nombre: string
  disponible: boolean
  motivo_ocupacion?: string | null
  actividad_nombre?: string | null
}

export interface DisponibilidadSemanal {
  referencia?: string
  dias: string[]
  bloques: string[]
  salas: { id: number; nombre: string; etiqueta: string }[]
  celdas: DisponibilidadSemanalCelda[]
}

export interface Pago {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  membresia_id?: number | null
  inscripcion_id?: number | null
  monto: string
  metodo: string
  referencia?: string | null
  fecha: string
  notas?: string | null
  created_at: string
}

export interface Maquina {
  id: number
  instructor_id?: number | null
  codigo?: string | null
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  marca?: string | null
  ubicacion?: string | null
  fotourl?: string | null
  estado_maquina: string
  anios_vida_util?: number | null
  fecha_adquisicion?: string | null
  created_at: string
}

export interface MaquinaEvaluacion {
  maquina_id: number
  codigo?: string | null
  nombre: string
  categoria?: string | null
  estado_maquina: string
  proximo_preventivo?: string | null
  dias_hasta_preventivo?: number | null
  estado_preventivo: 'al_dia' | 'proximo' | 'vencido' | 'sin_datos' | string
  ultimo_preventivo?: string | null
  anios_vida_util: number
  edad_anios?: number | null
  porcentaje_vida_util?: number | null
  fecha_fin_vida_util?: string | null
  estado_vida_util: 'normal' | 'evaluacion' | 'mantenimiento_mayor' | 'reemplazo' | 'sin_datos' | string
  sugerencia: string
  prioridad: number
}

export interface AlertasMantenimientoResumen {
  total_maquinas: number
  preventivo_vencido: number
  preventivo_proximo: number
  vida_util_evaluacion: number
  vida_util_reemplazo: number
  maquinas: MaquinaEvaluacion[]
}

export interface MantenimientoChecklistItem {
  id: string
  texto: string
  completado: boolean
}

export interface MantenimientoChecklistSeccion {
  titulo: string
  items: MantenimientoChecklistItem[]
}

export interface MantenimientoPlantilla {
  tipos: { value: string; label: string }[]
  secciones: MantenimientoChecklistSeccion[]
}

export interface MantenimientoMaquina {
  id: number
  maquina_id: number
  maquina_codigo?: string | null
  maquina_nombre?: string | null
  tipo: string
  responsable?: string | null
  observaciones?: string | null
  checklist: MantenimientoChecklistSeccion[]
  fecha_realizado: string
  proximo_mantenimiento?: string | null
  resultado: string
  created_at: string
}

export interface Acceso {
  id: number
  estudiante_id?: number | null
  fecha: string
  hora_entrada?: number | null
  hora_salida?: number | null
  tiempo_permanencia?: string | null
  acceso_concedido: boolean
  motivo_denegacion?: string | null
  created_at: string
  estudiante_nombre?: string | null
  estudiante_carrera?: string | null
  registro_universitario?: string | null
  tipo_movimiento?: 'entrada' | 'salida' | 'denegado' | null
  hora_display?: string | null
}

export interface CodigoAcceso {
  codigo: string
  qr_payload: string
  nombre: string
}

export interface NfcScanResult {
  acceso_concedido: boolean
  estudiante_id?: number | null
  nombre?: string | null
  carrera?: string | null
  registro_universitario?: string | null
  estado_membresia?: string | null
  acceso_id?: number | null
  motivo_denegacion?: string | null
  tipo_movimiento?: 'entrada' | 'salida' | 'denegado' | null
  mensaje: string
}

export interface AccesoMonitorStats {
  en_gimnasio_ahora: number
  ingresos_hoy: number
  salidas_hoy: number
  denegados_hoy: number
  alertas_activas: number
  total_registrados: number
  estudiantes_hoy: number
  ultimo_escaneo?: string | null
  tarjetas_leidas_hoy: number
  errores_hoy: number
  lector_activo: boolean
}

export interface AlertaSeguridad {
  id: number
  mensaje: string
  tipo: string
  hora: string
  detalle?: string | null
}

export interface Notificacion {
  id: number
  estudiante_id?: number | null
  usuario_id?: number | null
  destinatario?: string | null
  fecha?: string | null
  titulo: string
  mensaje: string
  leida: boolean
  tipo?: string | null
  created_at: string
}

export interface Reserva {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  actividad_id: number
  actividad_nombre?: string | null
  horario?: string | null
  fecha: string
  estado: number
  created_at: string
}

export interface Inscripcion {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  tipo: 'actividad' | 'sala_maquinas' | string
  actividad_id?: number | null
  actividad_nombre?: string | null
  mes_inicio: string
  mes_label?: string | null
  monto: string
  referencia_pago: string
  qr_pago: string
  qr_cobro?: string | null
  usa_qr_simple?: boolean
  estado: number
  estado_label?: string | null
  pago_id?: number | null
  pago_expira_en?: string | null
  qr_vigente?: boolean
  pago_reportado?: boolean
  pago_reportado_en?: string | null
  pago_reportado_metodo?: string | null
  pago_reportado_comprobante?: string | null
  pago_reportado_notas?: string | null
  creado_por_admin: boolean
  created_at: string
}

export interface VentanaInscripcion {
  hoy: string
  mes_objetivo: string
  ventana_inicio: string
  ventana_fin: string
  ventana_abierta: boolean
  dias_ventana: number
  precio_actividad: string
  precio_sala_maquinas: string
}

export interface Rutina {
  id: number
  instructor_id?: number | null
  instructor_nombre?: string | null
  estudiante_id?: number | null
  estudiante_nombre?: string | null
  plantilla_id?: number | null
  es_plantilla?: boolean
  nombre: string
  objetivo?: string | null
  notas_asignacion?: string | null
  ejercicios?: RutinaEjercicioDetalle[]
  created_at: string
}

export interface ProgresoEjercicio {
  id: number
  estudiante_id: number
  rutina_id: number
  ejercicio_id: number
  ejercicio_nombre?: string | null
  fecha: string
  series_completadas?: number | null
  repeticiones_logradas?: string | null
  peso_kg?: number | null
  dificultad_percibida?: number | null
  notas?: string | null
  created_at: string
}

export interface RendimientoResumen {
  dias_analizados: number
  accesos_ultimo_periodo: number
  asistencias_ultimo_periodo: number
  registros_progreso: number
  nivel_actividad: string
  cumplimiento_promedio?: number | null
}

export interface AjusteEjercicioRecomendado {
  ejercicio_id: number
  nombre: string
  series_actual?: number | null
  repeticiones_actual?: string | null
  series_sugerida?: number | null
  repeticiones_sugerida?: string | null
  peso_sugerido_kg?: number | null
  accion: 'mantener' | 'intensificar' | 'reducir' | string
  motivo: string
}

export interface RutinaRecomendacion {
  estudiante_id: number
  rutina_id?: number | null
  rutina_nombre?: string | null
  resumen: RendimientoResumen
  ajustes: AjusteEjercicioRecomendado[]
  plantillas_sugeridas: Rutina[]
  mensaje_general: string
}

export interface Membresia {
  id: number
  estudiante_id: number
  estudiante_nombre?: string | null
  registro_universitario?: string | null
  tipo: string
  precio: string
  duracion: number
  fecha_inicio?: string | null
  fecha_fin?: string | null
  created_at: string
}

export interface CondicionesMedicas {
  hipertension: boolean
  pulmonar: boolean
  diabetes: boolean
  osteoarticular: boolean
  neurologica: boolean
  convulsiones: boolean
}

export interface FichaInscripcion {
  id: number
  estudiante_id: number
  version: number
  vigente: boolean
  nombre: string
  cs?: string | null
  carrera?: string | null
  domicilio?: string | null
  email: string
  telefono?: string | null
  fecha_nacimiento?: string | null
  sexo?: string | null
  grupo_sanguineo?: string | null
  altura_cm?: number | null
  peso_kg?: string | null
  mes_horario?: string | null
  antecedentes_cardiovasculares: boolean
  antecedentes_cardiovasculares_detalle?: string | null
  procedimientos_cardiovasculares: boolean
  procedimientos_cardiovasculares_detalle?: string | null
  condiciones: CondicionesMedicas
  condiciones_detalle?: string | null
  intervencion_quirurgica: boolean
  intervencion_quirurgica_detalle?: string | null
  fracturas: boolean
  fracturas_detalle?: string | null
  sintomas_deportivos: boolean
  sintomas_deportivos_detalle?: string | null
  acepta_reglamento: boolean
  declaracion_jurada: boolean
  firma_nombre: string
  firma_fecha: string
  firma_ci?: string | null
  requiere_certificado_medico: boolean
  certificado_medico_recibido: boolean
  certificado_medico_url?: string | null
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
  estado: string
  created_at: string
}

export interface FichaInscripcionResumen {
  id: number
  estudiante_id: number
  estudiante_nombre: string
  estudiante_registro?: string | null
  version: number
  vigente: boolean
  estado: string
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
  requiere_certificado_medico: boolean
  certificado_medico_recibido: boolean
  certificado_medico_url?: string | null
  created_at: string
}

export interface FichaEstado {
  tiene_ficha: boolean
  vigente: boolean
  estado?: string | null
  fecha_vigencia_hasta?: string | null
  dias_para_vencer?: number | null
  requiere_actualizacion: boolean
  requiere_certificado_medico: boolean
  certificado_medico_recibido: boolean
  ficha?: FichaInscripcion | null
}

export interface FichaInscripcionCreate {
  domicilio: string
  fecha_nacimiento: string
  sexo: 'F' | 'M'
  grupo_sanguineo?: string
  altura_cm: number
  peso_kg: number
  mes_horario?: string
  cs?: string
  antecedentes_cardiovasculares: boolean
  antecedentes_cardiovasculares_detalle?: string
  procedimientos_cardiovasculares: boolean
  procedimientos_cardiovasculares_detalle?: string
  condiciones: CondicionesMedicas
  condiciones_detalle?: string
  intervencion_quirurgica: boolean
  intervencion_quirurgica_detalle?: string
  fracturas: boolean
  fracturas_detalle?: string
  sintomas_deportivos: boolean
  sintomas_deportivos_detalle?: string
  acepta_reglamento: boolean
  declaracion_jurada: boolean
  firma_nombre: string
  firma_ci?: string
}

export interface BackupInfo {
  filename: string
  created_at: string
  size_bytes: number
  size_mb: number
  postgres_db?: string | null
  created_by?: string | null
  drive_copied: boolean
  include_database: boolean
  include_uploads: boolean
}

export interface BackupCreateRequest {
  include_database: boolean
  include_uploads: boolean
}

export interface BackupCreateResponse extends BackupInfo {
  message: string
}

export interface BitacoraEntry {
  id: number
  usuario_id?: number | null
  usuario_nombre?: string | null
  usuario_email?: string | null
  usuario_rol?: string | null
  accion: string
  modulo: string
  metodo: string
  ruta: string
  status_code?: number | null
  ip?: string | null
  detalle?: string | null
  created_at: string
}

export interface BitacoraListResponse {
  total: number
  items: BitacoraEntry[]
}
