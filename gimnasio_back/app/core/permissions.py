"""Catálogo de permisos y asignaciones por defecto por rol."""

from dataclasses import dataclass

from app.core.roles import ROLES_VALIDOS


@dataclass(frozen=True)
class PermisoDef:
    codigo: str
    nombre: str
    descripcion: str
    categoria: str


PERMISOS: tuple[PermisoDef, ...] = (
    # General
    PermisoDef("dashboard.ver", "Ver dashboard", "Acceso al panel principal con KPIs", "General"),
    # Usuarios
    PermisoDef("usuarios.listar", "Listar usuarios", "Ver cuentas del sistema", "Usuarios"),
    PermisoDef("usuarios.crear", "Crear usuarios", "Registrar nuevas cuentas", "Usuarios"),
    PermisoDef("usuarios.editar", "Editar usuarios", "Modificar datos y roles de cuentas", "Usuarios"),
    PermisoDef("usuarios.eliminar", "Eliminar usuarios", "Desactivar o eliminar cuentas", "Usuarios"),
    PermisoDef("usuarios.reset_password", "Restablecer contraseñas", "Generar contraseñas temporales", "Usuarios"),
    PermisoDef("roles.gestionar", "Gestionar roles", "Configurar permisos por rol", "Usuarios"),
    # Estudiantes
    PermisoDef("estudiantes.listar", "Listar estudiantes", "Ver miembros del gimnasio", "Estudiantes"),
    PermisoDef("estudiantes.crear", "Crear estudiantes", "Registrar nuevos miembros", "Estudiantes"),
    PermisoDef("estudiantes.editar", "Editar estudiantes", "Actualizar datos de miembros", "Estudiantes"),
    PermisoDef("estudiantes.eliminar", "Eliminar estudiantes", "Dar de baja miembros", "Estudiantes"),
    PermisoDef(
        "estudiantes.nfc",
        "Asignar huella / NFC",
        "Vincular huella, tarjeta NFC o código de acceso",
        "Estudiantes",
    ),
    # Fichas
    PermisoDef(
        "fichas.listar",
        "Listar fichas",
        "Ver fichas de inscripción de estudiantes",
        "Fichas de inscripción",
    ),
    PermisoDef(
        "fichas.gestionar",
        "Gestionar fichas",
        "Revisar, certificar y exportar fichas médicas",
        "Fichas de inscripción",
    ),
    # Acceso
    PermisoDef(
        "acceso.ver",
        "Control de acceso",
        "Monitorear entradas y registrar ingreso/salida",
        "Acceso",
    ),
    PermisoDef("acceso.historial", "Historial de accesos", "Consultar registros de entrada y salida", "Acceso"),
    PermisoDef(
        "acceso.facial",
        "Reconocimiento facial",
        "Escanear rostro y enrolar en control de acceso",
        "Acceso",
    ),
    # Inscripciones
    PermisoDef(
        "inscripciones.listar",
        "Listar inscripciones",
        "Ver inscripciones a actividades y sala de máquinas",
        "Inscripciones",
    ),
    PermisoDef(
        "inscripciones.gestionar",
        "Gestionar inscripciones",
        "Inscribir, confirmar pagos y dar de baja",
        "Inscripciones",
    ),
    # Reservas
    PermisoDef("reservas.listar", "Listar reservas", "Ver reservas de actividades", "Reservas"),
    PermisoDef("reservas.gestionar", "Gestionar reservas", "Confirmar, cancelar o modificar reservas", "Reservas"),
    # Membresías
    PermisoDef("membresias.listar", "Listar membresías", "Ver planes y suscripciones", "Membresías"),
    PermisoDef("membresias.gestionar", "Gestionar membresías", "Crear y modificar planes", "Membresías"),
    # Pagos
    PermisoDef("pagos.listar", "Listar pagos", "Ver historial de cobros", "Pagos"),
    PermisoDef("pagos.registrar", "Registrar pagos", "Registrar nuevos cobros y confirmar QR", "Pagos"),
    # Actividades
    PermisoDef("actividades.listar", "Listar actividades", "Ver clases grupales", "Actividades"),
    PermisoDef("actividades.gestionar", "Gestionar actividades", "Crear y editar clases", "Actividades"),
    # Horarios
    PermisoDef("horarios.gestionar", "Gestionar horarios", "Configurar horarios, salas y turnos", "Horarios"),
    # Entrenadores
    PermisoDef("instructores.listar", "Listar entrenadores", "Ver instructores", "Entrenadores"),
    PermisoDef(
        "instructores.gestionar",
        "Gestionar entrenadores",
        "Crear, editar y eliminar instructores",
        "Entrenadores",
    ),
    # Máquinas
    PermisoDef("maquinas.listar", "Listar máquinas", "Ver equipamiento del gimnasio", "Máquinas"),
    PermisoDef(
        "maquinas.gestionar",
        "Gestionar máquinas",
        "Administrar equipos, fotos y mantenimiento",
        "Máquinas",
    ),
    # Ejercicios
    PermisoDef("ejercicios.listar", "Listar ejercicios", "Ver catálogo de ejercicios", "Ejercicios"),
    PermisoDef("ejercicios.gestionar", "Gestionar ejercicios", "Crear y editar ejercicios", "Ejercicios"),
    # Rutinas
    PermisoDef("rutinas.listar", "Listar rutinas", "Ver planes de entrenamiento", "Rutinas"),
    PermisoDef("rutinas.gestionar", "Gestionar rutinas", "Crear y asignar rutinas", "Rutinas"),
    # Reportes
    PermisoDef("reportes.ver", "Ver reportes", "Consultar reportes y gráficos", "Reportes"),
    PermisoDef("reportes.exportar", "Exportar reportes", "Descargar datos en CSV, Excel o PDF", "Reportes"),
    # Notificaciones
    PermisoDef("notificaciones.listar", "Listar notificaciones", "Ver alertas enviadas", "Notificaciones"),
    PermisoDef("notificaciones.enviar", "Enviar notificaciones", "Crear alertas para miembros y staff", "Notificaciones"),
    # Configuración
    PermisoDef(
        "configuracion.gestionar",
        "Configuración del gimnasio",
        "Editar horarios, precios, métodos de pago y datos institucionales",
        "Configuración",
    ),
    # Respaldos
    PermisoDef("backups.ver", "Ver respaldos", "Consultar historial de copias de seguridad", "Respaldos"),
    PermisoDef(
        "backups.gestionar",
        "Gestionar respaldos",
        "Crear, descargar y eliminar respaldos del sistema",
        "Respaldos",
    ),
    # Bitácora
    PermisoDef(
        "bitacora.ver",
        "Ver bitácora",
        "Consultar el registro de auditoría de acciones del sistema",
        "Bitácora",
    ),
    # Portal instructor
    PermisoDef("instructor.rutinas", "Mis rutinas", "Gestionar rutinas asignadas", "Portal instructor"),
    PermisoDef("instructor.actividades", "Mis actividades", "Ver actividades a cargo", "Portal instructor"),
    PermisoDef("instructor.horarios", "Mis horarios", "Gestionar turnos de máquinas", "Portal instructor"),
    PermisoDef("instructor.reservas", "Reservas instructor", "Ver reservas de sus clases", "Portal instructor"),
    PermisoDef("instructor.notificaciones", "Avisos instructor", "Ver notificaciones en portal instructor", "Portal instructor"),
    # Portal estudiante
    PermisoDef("estudiante.portal", "Portal estudiante", "Acceso al área personal del miembro", "Portal estudiante"),
)

PERMISO_CODIGOS: frozenset[str] = frozenset(p.codigo for p in PERMISOS)

CATEGORIA_ORDEN: tuple[str, ...] = (
    "General",
    "Usuarios",
    "Estudiantes",
    "Fichas de inscripción",
    "Acceso",
    "Inscripciones",
    "Reservas",
    "Membresías",
    "Pagos",
    "Actividades",
    "Horarios",
    "Entrenadores",
    "Máquinas",
    "Ejercicios",
    "Rutinas",
    "Reportes",
    "Notificaciones",
    "Configuración",
    "Respaldos",
    "Bitácora",
    "Portal instructor",
    "Portal estudiante",
)

PERMISOS_POR_CATEGORIA: dict[str, list[PermisoDef]] = {}
for _perm in PERMISOS:
    PERMISOS_POR_CATEGORIA.setdefault(_perm.categoria, []).append(_perm)

_ALL = frozenset(PERMISO_CODIGOS)

_DEFAULT_RECEPCION = frozenset(
    {
        "dashboard.ver",
        "estudiantes.listar",
        "estudiantes.crear",
        "estudiantes.editar",
        "estudiantes.nfc",
        "fichas.listar",
        "fichas.gestionar",
        "acceso.ver",
        "acceso.historial",
        "acceso.facial",
        "inscripciones.listar",
        "inscripciones.gestionar",
        "reservas.listar",
        "reservas.gestionar",
        "membresias.listar",
        "pagos.listar",
        "pagos.registrar",
        "actividades.listar",
        "notificaciones.listar",
    }
)

_DEFAULT_INSTRUCTOR = frozenset(
    {
        "instructor.rutinas",
        "instructor.actividades",
        "instructor.horarios",
        "instructor.reservas",
        "instructor.notificaciones",
        "actividades.listar",
        "maquinas.listar",
        "ejercicios.listar",
    }
)

_DEFAULT_ESTUDIANTE = frozenset({"estudiante.portal"})

DEFAULT_ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "admin": _ALL,
    "recepcion": _DEFAULT_RECEPCION,
    "instructor": _DEFAULT_INSTRUCTOR,
    "estudiante": _DEFAULT_ESTUDIANTE,
}

ROLES_EDITABLES: tuple[str, ...] = tuple(r for r in ROLES_VALIDOS if r != "admin")


def permiso_info(codigo: str) -> PermisoDef | None:
    for p in PERMISOS:
        if p.codigo == codigo:
            return p
    return None
