import secrets
import string
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import ROLES_VALIDOS, resolve_rol, sync_es_admin
from app.core.security import get_password_hash, verify_password
from app.models.administrador import Administrador
from app.models.estudiante import Estudiante
from app.models.instructor import Instructor
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioAdminResponse, UsuarioCreate, UsuarioMeUpdate, UsuarioUpdate
from app.services.base_service import BaseService
from app.services.notification_service import NotificationResult, send_temp_password


@dataclass
class PasswordResetResult:
    password: str
    notification: NotificationResult


def _generar_password_temporal() -> str:
    chars = string.ascii_letters + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(8))
    return f"Uagrm{suffix}!"


class UsuarioService(BaseService[Usuario]):
    def __init__(self, db: AsyncSession):
        super().__init__(Usuario, db)

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        result = await self.db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalar_one_or_none()

    async def get_by_telefono(self, telefono: str) -> Optional[Usuario]:
        result = await self.db.execute(select(Usuario).where(Usuario.telefono == telefono))
        return result.scalar_one_or_none()

    async def _perfiles_por_usuario(self, usuario_ids: list[int]) -> tuple[dict[int, int], dict[int, int]]:
        if not usuario_ids:
            return {}, {}
        est_result = await self.db.execute(
            select(Estudiante.usuario_id, Estudiante.id).where(Estudiante.usuario_id.in_(usuario_ids))
        )
        inst_result = await self.db.execute(
            select(Instructor.usuario_id, Instructor.id).where(Instructor.usuario_id.in_(usuario_ids))
        )
        estudiantes = {row[0]: row[1] for row in est_result.all()}
        instructores = {row[0]: row[1] for row in inst_result.all()}
        return estudiantes, instructores

    def _to_admin_response(
        self,
        user: Usuario,
        estudiante_id: Optional[int],
        instructor_id: Optional[int],
    ) -> UsuarioAdminResponse:
        rol_efectivo = resolve_rol(
            user,
            tiene_instructor=instructor_id is not None,
            tiene_estudiante=estudiante_id is not None,
        )
        return UsuarioAdminResponse(
            id=user.id,
            nombre=user.nombre,
            email=user.email,
            telefono=user.telefono,
            activo=user.activo,
            es_admin=user.es_admin,
            rol=user.rol or rol_efectivo,
            created_at=user.created_at,
            estudiante_id=estudiante_id,
            instructor_id=instructor_id,
            rol_efectivo=rol_efectivo,
        )

    async def list_admin(
        self,
        skip: int = 0,
        limit: int = 500,
        rol: Optional[str] = None,
        activo: Optional[bool] = None,
        q: Optional[str] = None,
    ) -> list[UsuarioAdminResponse]:
        query = select(Usuario)
        term = (q or "").strip()
        if term:
            pattern = f"%{term}%"
            query = query.where(
                or_(
                    Usuario.nombre.ilike(pattern),
                    Usuario.email.ilike(pattern),
                    Usuario.telefono.ilike(pattern),
                )
            )
        if activo is not None:
            query = query.where(Usuario.activo == activo)
        if rol:
            query = query.where(Usuario.rol == rol)
        query = query.order_by(Usuario.id.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        users = list(result.scalars().all())
        ids = [u.id for u in users]
        estudiantes, instructores = await self._perfiles_por_usuario(ids)

        items = [
            self._to_admin_response(u, estudiantes.get(u.id), instructores.get(u.id))
            for u in users
        ]
        if rol:
            items = [i for i in items if i.rol_efectivo == rol]
        return items

    async def create_usuario(self, data: UsuarioCreate) -> UsuarioAdminResponse:
        if await self.get_by_email(data.email):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo")

        rol = data.rol if not data.es_admin else "admin"
        if rol not in ROLES_VALIDOS:
            raise HTTPException(status_code=400, detail="Rol no válido")

        user = Usuario(
            nombre=data.nombre,
            email=data.email,
            telefono=data.telefono,
            hashed_password=get_password_hash(data.password),
            es_admin=sync_es_admin(rol),
            rol=rol,
        )
        self.db.add(user)
        await self.db.flush()

        if rol == "admin":
            self.db.add(
                Administrador(
                    usuario_id=user.id,
                    nombre=data.nombre,
                    email=data.email,
                )
            )

        await self.db.commit()
        await self.db.refresh(user)
        estudiantes, instructores = await self._perfiles_por_usuario([user.id])
        return self._to_admin_response(user, estudiantes.get(user.id), instructores.get(user.id))

    async def _validar_cambio_rol(self, user: Usuario, nuevo_rol: str) -> None:
        if nuevo_rol not in ROLES_VALIDOS:
            raise HTTPException(status_code=400, detail="Rol no válido")

        if nuevo_rol == "instructor":
            inst = await self.db.execute(select(Instructor).where(Instructor.usuario_id == user.id))
            if not inst.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="El usuario no tiene perfil de instructor. Créalo primero en Entrenadores.",
                )
        if nuevo_rol == "estudiante":
            est = await self.db.execute(select(Estudiante).where(Estudiante.usuario_id == user.id))
            if not est.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="El usuario no tiene perfil de estudiante. Créalo primero en Estudiantes.",
                )

    async def _asegurar_administrador(self, user: Usuario) -> None:
        result = await self.db.execute(
            select(Administrador).where(Administrador.usuario_id == user.id)
        )
        if not result.scalar_one_or_none():
            self.db.add(
                Administrador(
                    usuario_id=user.id,
                    nombre=user.nombre,
                    email=user.email,
                )
            )

    async def update_usuario(self, user_id: int, data: UsuarioUpdate) -> UsuarioAdminResponse:
        user = await self.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        updates = data.model_dump(exclude_none=True)
        nuevo_rol = updates.pop("rol", None)

        for field, value in updates.items():
            setattr(user, field, value)

        if nuevo_rol:
            await self._validar_cambio_rol(user, nuevo_rol)
            user.rol = nuevo_rol
            user.es_admin = sync_es_admin(nuevo_rol)
            if nuevo_rol == "admin":
                await self._asegurar_administrador(user)

        await self.db.commit()
        await self.db.refresh(user)
        estudiantes, instructores = await self._perfiles_por_usuario([user.id])
        return self._to_admin_response(user, estudiantes.get(user.id), instructores.get(user.id))

    async def update_me(self, current: Usuario, data: UsuarioMeUpdate) -> Usuario:
        updates = data.model_dump(exclude_none=True)
        for field, value in updates.items():
            setattr(current, field, value)
        await self.db.commit()
        await self.db.refresh(current)
        return current

    async def authenticate(self, email: str, password: str) -> Optional[Usuario]:
        user = await self.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    async def cambiar_password(self, user: Usuario, actual: str, nueva: str) -> bool:
        if not verify_password(actual, user.hashed_password):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        user.hashed_password = get_password_hash(nueva)
        await self.db.commit()
        return True

    async def _aplicar_password_temporal(self, user: Usuario) -> PasswordResetResult:
        nueva = _generar_password_temporal()
        user.hashed_password = get_password_hash(nueva)
        await self.db.commit()
        notification = await send_temp_password(user, nueva)
        return PasswordResetResult(password=nueva, notification=notification)

    async def forgot_password_by_email(self, email: str) -> bool:
        user = await self.get_by_email(email)
        if not user or not user.activo:
            return False
        await self._aplicar_password_temporal(user)
        return True

    async def reset_password_admin(
        self,
        user_id: int,
        password_nueva: Optional[str] = None,
        generar_temporal: bool = True,
        enviar_notificacion: bool = True,
    ) -> PasswordResetResult:
        user = await self.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if password_nueva:
            user.hashed_password = get_password_hash(password_nueva)
            await self.db.commit()
            return PasswordResetResult(password=password_nueva, notification=NotificationResult())

        if generar_temporal:
            result = await self._aplicar_password_temporal(user)
            if not enviar_notificacion:
                return PasswordResetResult(
                    password=result.password,
                    notification=NotificationResult(),
                )
            return result

        raise HTTPException(status_code=400, detail="Indica una contraseña nueva o genera una temporal")
