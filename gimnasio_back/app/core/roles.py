"""Roles y permisos del sistema."""

from typing import Literal

RolUsuario = Literal["admin", "recepcion", "instructor", "estudiante"]

ROLES_VALIDOS: tuple[str, ...] = ("admin", "recepcion", "instructor", "estudiante")

ROLES_STAFF: tuple[str, ...] = ("admin", "recepcion")


def sync_es_admin(rol: str) -> bool:
    return rol == "admin"


def is_admin(user) -> bool:
    rol = getattr(user, "rol", None) or ""
    return bool(user.es_admin or rol == "admin")


def is_staff(user) -> bool:
    rol = getattr(user, "rol", None) or ""
    return is_admin(user) or rol == "recepcion"


def resolve_rol(
    user,
    *,
    tiene_instructor: bool = False,
    tiene_estudiante: bool = False,
) -> str:
    rol = getattr(user, "rol", None)
    if rol and rol in ROLES_VALIDOS:
        return rol
    if user.es_admin:
        return "admin"
    if tiene_instructor:
        return "instructor"
    if tiene_estudiante:
        return "estudiante"
    return "estudiante"
