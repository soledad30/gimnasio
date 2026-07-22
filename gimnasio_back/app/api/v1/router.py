from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, usuarios, roles, estudiantes, instructores,
    acceso, membresias, pagos, rutinas, ejercicios, actividades,
    maquinas, reservas, inscripciones, notificaciones, reportes, salas, horarios, configuracion,
    fichas_inscripcion,
    backups,
    bitacora,
)

api_router = APIRouter()

api_router.include_router(auth.router,           prefix="/auth",           tags=[" Auth"])
api_router.include_router(usuarios.router,       prefix="/usuarios",       tags=[" Usuarios"])
api_router.include_router(roles.router,          prefix="/roles",          tags=[" Roles"])
api_router.include_router(estudiantes.router,    prefix="/estudiantes",    tags=[" Estudiantes"])
api_router.include_router(instructores.router,   prefix="/instructores",   tags=[" Instructores"])
api_router.include_router(acceso.router,         prefix="/acceso",         tags=[" Control Acceso NFC"])
api_router.include_router(membresias.router,     prefix="/membresias",     tags=[" Membresías"])
api_router.include_router(pagos.router,          prefix="/pagos",          tags=[" Pagos"])
api_router.include_router(rutinas.router,        prefix="/rutinas",        tags=[" Rutinas"])
api_router.include_router(ejercicios.router,     prefix="/ejercicios",     tags=[" Ejercicios"])
api_router.include_router(actividades.router,    prefix="/actividades",    tags=[" Actividades"])
api_router.include_router(maquinas.router,       prefix="/maquinas",       tags=[" Máquinas"])
api_router.include_router(reservas.router,       prefix="/reservas",       tags=[" Reservas"])
api_router.include_router(inscripciones.router,  prefix="/inscripciones",  tags=[" Inscripciones"])
api_router.include_router(notificaciones.router, prefix="/notificaciones", tags=[" Notificaciones"])
api_router.include_router(reportes.router,       prefix="/reportes",       tags=[" Reportes"])
api_router.include_router(salas.router,          prefix="/salas",          tags=[" Salas"])
api_router.include_router(horarios.router,       prefix="/horarios",       tags=[" Horarios"])
api_router.include_router(configuracion.router,  prefix="/configuracion",  tags=[" Configuración"])
api_router.include_router(fichas_inscripcion.router, prefix="/fichas-inscripcion", tags=[" Fichas inscripción"])
api_router.include_router(backups.router, prefix="/backups", tags=[" Backups"])
api_router.include_router(bitacora.router, prefix="/bitacora", tags=[" Bitácora"])
