from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import (
    DEFAULT_ROLE_PERMISSIONS,
    PERMISO_CODIGOS,
    PERMISOS,
    ROLES_EDITABLES,
    permiso_info,
)
from app.core.roles import ROLES_VALIDOS
from app.models.rol_permiso import RolPermiso
from app.schemas.rol import PermisoInfo, RolPermisosDetalle, RolPermisosUpdate, RolResumen

ROL_LABELS: dict[str, tuple[str, str]] = {
    "admin": ("Administrador", "Acceso total al sistema."),
    "recepcion": ("Recepción", "Recepcion: acceso, estudiantes, pagos e inscripciones."),
    "instructor": ("Instructor", "Entrenadores, acceso a su portal y actividades asignadas."),
    "estudiante": ("Estudiante", "Miembros con acceso al portal personal."),
}


class RolService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _permisos_en_db(self, rol: str) -> set[str]:
        result = await self.db.execute(
            select(RolPermiso.permiso).where(RolPermiso.rol == rol)
        )
        return set(result.scalars().all())

    async def get_permisos_efectivos(self, rol: str) -> set[str]:
        if rol == "admin":
            return set(PERMISO_CODIGOS)
        stored = await self._permisos_en_db(rol)
        if stored:
            return stored
        return set(DEFAULT_ROLE_PERMISSIONS.get(rol, frozenset()))

    async def list_roles(self) -> list[RolResumen]:
        items: list[RolResumen] = []
        for codigo in ROLES_VALIDOS:
            nombre, descripcion = ROL_LABELS.get(codigo, (codigo.title(), ""))
            permisos = await self.get_permisos_efectivos(codigo)
            items.append(
                RolResumen(
                    codigo=codigo,
                    nombre=nombre,
                    descripcion=descripcion,
                    editable=codigo in ROLES_EDITABLES,
                    permisos_activos=len(permisos),
                    permisos_total=len(PERMISO_CODIGOS),
                )
            )
        return items

    def _catalogo(self) -> list[PermisoInfo]:
        return [
            PermisoInfo(
                codigo=p.codigo,
                nombre=p.nombre,
                descripcion=p.descripcion,
                categoria=p.categoria,
            )
            for p in PERMISOS
        ]

    async def get_rol_permisos(self, rol: str) -> RolPermisosDetalle:
        if rol not in ROLES_VALIDOS:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        nombre, descripcion = ROL_LABELS.get(rol, (rol.title(), ""))
        permisos = sorted(await self.get_permisos_efectivos(rol))
        return RolPermisosDetalle(
            codigo=rol,
            nombre=nombre,
            descripcion=descripcion,
            editable=rol in ROLES_EDITABLES,
            permisos=permisos,
            catalogo=self._catalogo(),
        )

    async def update_rol_permisos(self, rol: str, data: RolPermisosUpdate) -> RolPermisosDetalle:
        if rol not in ROLES_VALIDOS:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        if rol == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los permisos del administrador no se pueden modificar",
            )

        invalidos = [p for p in data.permisos if p not in PERMISO_CODIGOS]
        if invalidos:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Permisos inválidos: {', '.join(invalidos)}",
            )

        await self.db.execute(delete(RolPermiso).where(RolPermiso.rol == rol))
        for codigo in sorted(set(data.permisos)):
            self.db.add(RolPermiso(rol=rol, permiso=codigo))
        await self.db.commit()
        return await self.get_rol_permisos(rol)

    async def usuario_tiene_permiso(self, rol: str, permiso: str) -> bool:
        if rol == "admin":
            return True
        return permiso in await self.get_permisos_efectivos(rol)

    async def seed_defaults_if_empty(self) -> None:
        total = await self.db.scalar(select(func.count()).select_from(RolPermiso))
        if total and total > 0:
            return
        for rol in ROLES_EDITABLES:
            for codigo in DEFAULT_ROLE_PERMISSIONS.get(rol, frozenset()):
                info = permiso_info(codigo)
                if info:
                    self.db.add(RolPermiso(rol=rol, permiso=codigo))
        await self.db.commit()

    async def sync_new_default_permissions(self) -> None:
        """Agrega permisos nuevos del catálogo a roles con defaults, sin quitar personalizados."""
        for rol in ROLES_EDITABLES:
            stored = await self._permisos_en_db(rol)
            if not stored:
                continue
            defaults = DEFAULT_ROLE_PERMISSIONS.get(rol, frozenset())
            nuevos = defaults - stored
            for codigo in sorted(nuevos):
                if codigo in PERMISO_CODIGOS:
                    self.db.add(RolPermiso(rol=rol, permiso=codigo))
        await self.db.commit()
