from __future__ import annotations

from typing import Optional
from urllib.parse import unquote

from jose import JWTError, jwt
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.config import settings
from app.models.bitacora import Bitacora
from app.models.usuario import Usuario

# Escaneos de puerta ya quedan en `accesos`; no saturar la bitácora.
_SKIP_PATH_SUFFIXES = (
    "/acceso/nfc-scan",
    "/acceso/huella-scan",
    "/acceso/face-scan",
    "/acceso/qr-scan",
    "/acceso/check-in",
    "/auth/login",
    "/auth/register",
)

_MODULO_LABELS: dict[str, str] = {
    "auth": "Autenticación",
    "usuarios": "Usuarios",
    "roles": "Roles",
    "estudiantes": "Estudiantes",
    "instructores": "Entrenadores",
    "acceso": "Control de acceso",
    "membresias": "Membresías",
    "pagos": "Pagos",
    "rutinas": "Rutinas",
    "ejercicios": "Ejercicios",
    "actividades": "Actividades",
    "maquinas": "Máquinas",
    "reservas": "Reservas",
    "inscripciones": "Inscripciones",
    "notificaciones": "Notificaciones",
    "reportes": "Reportes",
    "salas": "Salas",
    "horarios": "Horarios",
    "configuracion": "Configuración",
    "fichas-inscripcion": "Fichas de inscripción",
    "backups": "Respaldos",
    "bitacora": "Bitácora",
}

_ACCION_POR_METODO: dict[str, str] = {
    "POST": "CREAR",
    "PUT": "ACTUALIZAR",
    "PATCH": "ACTUALIZAR",
    "DELETE": "ELIMINAR",
}


class BitacoraService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def registrar(
        self,
        *,
        accion: str,
        modulo: str,
        metodo: str,
        ruta: str,
        status_code: Optional[int] = None,
        ip: Optional[str] = None,
        detalle: Optional[str] = None,
        usuario: Optional[Usuario] = None,
        usuario_id: Optional[int] = None,
        usuario_nombre: Optional[str] = None,
        usuario_email: Optional[str] = None,
        usuario_rol: Optional[str] = None,
    ) -> Bitacora:
        if usuario is not None:
            usuario_id = usuario.id
            usuario_nombre = usuario.nombre
            usuario_email = usuario.email
            usuario_rol = usuario.rol

        entry = Bitacora(
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
            usuario_email=usuario_email,
            usuario_rol=usuario_rol,
            accion=accion[:40],
            modulo=modulo[:80],
            metodo=metodo[:10],
            ruta=ruta[:400],
            status_code=status_code,
            ip=(ip or "")[:64] or None,
            detalle=(detalle or "")[:500] or None,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def listar(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        modulo: Optional[str] = None,
        accion: Optional[str] = None,
        usuario_id: Optional[int] = None,
        q: Optional[str] = None,
    ) -> tuple[list[Bitacora], int]:
        filters = []
        if modulo:
            filters.append(Bitacora.modulo == modulo)
        if accion:
            filters.append(Bitacora.accion == accion)
        if usuario_id:
            filters.append(Bitacora.usuario_id == usuario_id)
        if q:
            like = f"%{q.strip()}%"
            filters.append(
                or_(
                    Bitacora.usuario_nombre.ilike(like),
                    Bitacora.usuario_email.ilike(like),
                    Bitacora.detalle.ilike(like),
                    Bitacora.ruta.ilike(like),
                    Bitacora.modulo.ilike(like),
                )
            )

        count_q = select(func.count()).select_from(Bitacora)
        list_q = select(Bitacora).order_by(Bitacora.id.desc())
        if filters:
            for f in filters:
                count_q = count_q.where(f)
                list_q = list_q.where(f)

        total = int(await self.db.scalar(count_q) or 0)
        result = await self.db.execute(list_q.offset(offset).limit(min(limit, 500)))
        return list(result.scalars().all()), total

    @staticmethod
    def modulo_desde_ruta(path: str) -> str:
        # /api/v1/pagos/ → pagos
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
            key = parts[2]
            return _MODULO_LABELS.get(key, key)
        return "Sistema"

    @staticmethod
    def accion_desde_request(method: str, path: str, status_code: int) -> str:
        lower = path.lower()
        if "/auth/login" in lower:
            return "LOGIN" if status_code < 400 else "LOGIN_FALLIDO"
        if "/auth/register" in lower:
            return "REGISTRO" if status_code < 400 else "REGISTRO_FALLIDO"
        if "/auth/forgot-password" in lower:
            return "RECUPERAR_CLAVE"
        if method.upper() == "DELETE":
            return "ELIMINAR"
        if "face-enroll" in lower and method.upper() == "POST":
            return "ENROLAR_FACIAL"
        if "face-enroll" in lower and method.upper() == "DELETE":
            return "QUITAR_FACIAL"
        return _ACCION_POR_METODO.get(method.upper(), method.upper())

    @staticmethod
    def should_log(method: str, path: str) -> bool:
        m = method.upper()
        if m in {"GET", "HEAD", "OPTIONS"}:
            return False
        if not path.startswith("/api/"):
            return False
        if "/bitacora" in path:
            return False
        for suffix in _SKIP_PATH_SUFFIXES:
            if path.rstrip("/").endswith(suffix.rstrip("/")) or suffix in path:
                return False
        return True

    @staticmethod
    def client_ip(request: Request) -> Optional[str]:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return None

    @staticmethod
    def decode_user_id_from_auth_header(authorization: Optional[str]) -> Optional[int]:
        if not authorization or not authorization.lower().startswith("bearer "):
            return None
        token = authorization.split(" ", 1)[1].strip()
        if not token:
            return None
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            sub = payload.get("sub")
            return int(sub) if sub is not None else None
        except (JWTError, ValueError, TypeError):
            return None


async def log_request_to_bitacora(request: Request, status_code: int) -> None:
    """Escribe en bitácora sin afectar la respuesta HTTP si falla."""
    path = unquote(request.url.path)
    method = request.method
    if not BitacoraService.should_log(method, path):
        return

    from app.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            service = BitacoraService(db)
            user_id = BitacoraService.decode_user_id_from_auth_header(
                request.headers.get("authorization")
            )
            usuario: Optional[Usuario] = None
            if user_id:
                usuario = await db.get(Usuario, user_id)

            # Login: el token aún no existe; intentar resolver por email del form
            if usuario is None and "/auth/login" in path and status_code < 400:
                # No tenemos el body aquí de forma fiable tras consumirlo; queda anónimo o con IP
                pass

            detalle = None
            if status_code >= 400:
                detalle = f"Respuesta HTTP {status_code}"

            await service.registrar(
                accion=BitacoraService.accion_desde_request(method, path, status_code),
                modulo=BitacoraService.modulo_desde_ruta(path),
                metodo=method.upper(),
                ruta=path[:400],
                status_code=status_code,
                ip=BitacoraService.client_ip(request),
                detalle=detalle,
                usuario=usuario,
            )
    except Exception:
        # Nunca romper la API por un fallo de auditoría
        return
