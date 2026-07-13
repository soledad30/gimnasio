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
    PermisoDef("dashboard.ver", "Ver dashboard", "Acceso al panel principal con KPIs", "General"),
    PermisoDef("usuarios.listar", "Listar usuarios", "Ver cuentas del sistema", "Usuarios"),
    PermisoDef("usuarios.crear", "Crear usuarios", "Registrar nuevas cuentas", "Usuarios"),
    PermisoDef("usuarios.editar", "Editar usuarios", "Modificar datos y roles de cuentas", "Usuarios"),
    PermisoDef("usuarios.eliminar", "Eliminar usuarios", "Desactivar o eliminar cuentas", "Usuarios"),
    PermisoDef("usuarios.reset_password", "Restablecer contraseñas", "Generar contraseñas temporales", "Usuarios"),
    PermisoDef("roles.gestionar", "Gestionar roles", "Configurar permisos por rol", "Usuarios"),
    PermisoDef("estudiantes.listar", "Listar estudiantes", "Ver miembros del gimnasio", "Estudiantes"),
    PermisoDef("estudiantes.crear", "Crear estudiantes", "Registrar nuevos miembros", "Estudiantes"),
    PermisoDef("estudiantes.editar", "Editar estudiantes", "Actualizar datos de miembros", "Estudiantes"),
    PermisoDef("estudiantes.eliminar", "Eliminar estudiantes", "Dar de baja miembros", "Estudiantes"),
    PermisoDef("estudiantes.nfc", "Asignar NFC", "Vincular tarjetas de acceso", "Estudiantes"),
    PermisoDef("instructores.listar", "Listar entrenadores", "Ver instructores", "Entrenadores"),
    PermisoDef("instructores.gestionar", "Gestionar entrenadores", "Crear, editar y eliminar instructores", "Entrenadores"),
    PermisoDef("acceso.ver", "Control de acceso", "Monitorear entradas en tiempo real", "Acceso NFC"),
    PermisoDef("acceso.historial", "Historial de accesos", "Consultar registros de entrada", "Acceso NFC"),
    PermisoDef("reservas.listar", "Listar reservas", "Ver reservas de actividades", "Reservas"),
    PermisoDef("reservas.gestionar", "Gestionar reservas", "Confirmar, cancelar o modificar reservas", "Reservas"),
    PermisoDef("membresias.listar", "Listar membresías", "Ver planes y suscripciones", "Membresías"),
    PermisoDef("membresias.gestionar", "Gestionar membresías", "Crear y modificar planes", "Membresías"),
    PermisoDef("pagos.listar", "Listar pagos", "Ver historial de cobros", "Pagos"),
    PermisoDef("pagos.registrar", "Registrar pagos", "Registrar nuevos cobros", "Pagos"),
    PermisoDef("actividades.listar", "Listar actividades", "Ver clases grupales", "Actividades"),
    PermisoDef("actividades.gestionar", "Gestionar actividades", "Crear y editar clases", "Actividades"),
    PermisoDef("horarios.gestionar", "Gestionar horarios", "Configurar horarios y salas", "Horarios"),
    PermisoDef("maquinas.listar", "Listar máquinas", "Ver equipamiento", "Máquinas"),
    PermisoDef("maquinas.gestionar", "Gestionar máquinas", "Administrar equipos y mantenimiento", "Máquinas"),
    PermisoDef("ejercicios.listar", "Listar ejercicios", "Ver catálogo de ejercicios", "Ejercicios"),
    PermisoDef("ejercicios.gestionar", "Gestionar ejercicios", "Crear y editar ejercicios", "Ejercicios"),
    PermisoDef("rutinas.listar", "Listar rutinas", "Ver planes de entrenamiento", "Rutinas"),
    PermisoDef("rutinas.gestionar", "Gestionar rutinas", "Crear y asignar rutinas", "Rutinas"),
    PermisoDef("reportes.ver", "Ver reportes", "Consultar reportes y gráficos", "Reportes"),
    PermisoDef("reportes.exportar", "Exportar reportes", "Descargar datos en CSV", "Reportes"),
    PermisoDef("notificaciones.listar", "Listar notificaciones", "Ver alertas enviadas", "Notificaciones"),
    PermisoDef("notificaciones.enviar", "Enviar notificaciones", "Crear alertas para miembros", "Notificaciones"),
    PermisoDef("instructor.rutinas", "Mis rutinas", "Gestionar rutinas asignadas (instructor)", "Portal instructor"),
    PermisoDef("instructor.actividades", "Mis actividades", "Ver actividades a cargo (instructor)", "Portal instructor"),
    PermisoDef("instructor.horarios", "Mis horarios", "Gestionar turnos de máquinas (instructor)", "Portal instructor"),
    PermisoDef("instructor.reservas", "Reservas instructor", "Ver reservas de sus clases", "Portal instructor"),
    PermisoDef("estudiante.portal", "Portal estudiante", "Acceso al área personal del miembro", "Portal estudiante"),
)

PERMISO_CODIGOS: frozenset[str] = frozenset(p.codigo for p in PERMISOS)

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
        "acceso.ver",
        "acceso.historial",
        "reservas.listar",
        "reservas.gestionar",
        "membresias.listar",
        "pagos.listar",
        "pagos.registrar",
    }
)

_DEFAULT_INSTRUCTOR = frozenset(
    {
        "instructor.rutinas",
        "instructor.actividades",
        "instructor.horarios",
        "instructor.reservas",
        "actividades.listar",
        "maquinas.listar",
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
