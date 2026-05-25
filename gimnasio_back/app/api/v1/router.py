from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, usuarios, estudiantes, instructores,
    acceso, membresias, rutinas, actividades,
    maquinas, reservas, notificaciones, reportes,
)

api_router = APIRouter()

api_router.include_router(auth.router,           prefix="/auth",           tags=[" Auth"])
api_router.include_router(usuarios.router,       prefix="/usuarios",       tags=[" Usuarios"])
api_router.include_router(estudiantes.router,    prefix="/estudiantes",    tags=[" Estudiantes"])
api_router.include_router(instructores.router,   prefix="/instructores",   tags=[" Instructores"])
api_router.include_router(acceso.router,         prefix="/acceso",         tags=[" Control Acceso NFC"])
api_router.include_router(membresias.router,     prefix="/membresias",     tags=[" Membresías"])
api_router.include_router(rutinas.router,        prefix="/rutinas",        tags=[" Rutinas"])
api_router.include_router(actividades.router,    prefix="/actividades",    tags=[" Actividades"])
api_router.include_router(maquinas.router,       prefix="/maquinas",       tags=[" Máquinas"])
api_router.include_router(reservas.router,       prefix="/reservas",       tags=[" Reservas"])
api_router.include_router(notificaciones.router, prefix="/notificaciones", tags=[" Notificaciones"])
api_router.include_router(reportes.router,       prefix="/reportes",       tags=[" Reportes"])
