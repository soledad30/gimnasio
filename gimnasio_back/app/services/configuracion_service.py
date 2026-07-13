from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.configuracion_sistema import ConfiguracionSistema
from app.schemas.configuracion import (
    ConfiguracionSistemaUpdate,
    normalizar_tiempo,
    tiempo_a_segundos,
)


def _default_open() -> str:
    return f"{settings.GYM_OPEN_HOUR:02d}:00:00"


def _default_close() -> str:
    return f"{settings.GYM_CLOSE_HOUR:02d}:00:00"


def resolver_tiempos(row: ConfiguracionSistema) -> tuple[str, str]:
    open_t = row.gym_open_time
    close_t = row.gym_close_time
    if not open_t and row.gym_open_hour is not None:
        open_t = f"{int(row.gym_open_hour):02d}:00:00"
    if not close_t and row.gym_close_hour is not None:
        close_t = f"{int(row.gym_close_hour):02d}:00:00"
    open_t = normalizar_tiempo(open_t or _default_open())
    close_t = normalizar_tiempo(close_t or _default_close())
    return open_t, close_t


def _aplicar_operativa(row: ConfiguracionSistema) -> tuple[str, str, int]:
    open_t, close_t = resolver_tiempos(row)
    settings.GYM_OPEN_TIME = open_t
    settings.GYM_CLOSE_TIME = close_t
    settings.GYM_OPEN_HOUR = int(open_t.split(":")[0])
    settings.GYM_CLOSE_HOUR = int(close_t.split(":")[0])
    # Si cierra después de :00, la última hora completa se cuenta (ej. 19:30 → 19+1=20 para bloques)
    close_secs = tiempo_a_segundos(close_t)
    if close_secs % 3600 != 0:
        # mantener CLOSE_HOUR como techo, scheduling usará el tiempo completo
        pass
    dias = (
        int(row.dias_ventana_inscripcion)
        if row.dias_ventana_inscripcion is not None
        else settings.DIAS_VENTANA_INSCRIPCION
    )
    settings.DIAS_VENTANA_INSCRIPCION = dias
    return open_t, close_t, dias


class ConfiguracionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self) -> ConfiguracionSistema:
        result = await self.db.execute(select(ConfiguracionSistema).order_by(ConfiguracionSistema.id.asc()).limit(1))
        row = result.scalar_one_or_none()
        if row:
            open_t, close_t = resolver_tiempos(row)
            # migrar en caliente a columnas de tiempo completo
            changed = False
            if not row.gym_open_time:
                row.gym_open_time = open_t
                changed = True
            if not row.gym_close_time:
                row.gym_close_time = close_t
                changed = True
            if row.dias_ventana_inscripcion is None:
                row.dias_ventana_inscripcion = settings.DIAS_VENTANA_INSCRIPCION
                changed = True
            if changed:
                await self.db.commit()
                await self.db.refresh(row)
            _aplicar_operativa(row)
            return row

        row = ConfiguracionSistema(
            nombre_organizacion="UAGRM-GYM",
            gym_open_time=_default_open(),
            gym_close_time=_default_close(),
            gym_open_hour=settings.GYM_OPEN_HOUR,
            gym_close_hour=settings.GYM_CLOSE_HOUR,
            dias_ventana_inscripcion=settings.DIAS_VENTANA_INSCRIPCION,
        )
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        _aplicar_operativa(row)
        return row

    async def update(self, data: ConfiguracionSistemaUpdate) -> ConfiguracionSistema:
        row = await self.get()
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(row, field, value)
        if "gym_open_time" in updates and updates["gym_open_time"]:
            row.gym_open_hour = int(updates["gym_open_time"].split(":")[0])
        if "gym_close_time" in updates and updates["gym_close_time"]:
            row.gym_close_hour = int(updates["gym_close_time"].split(":")[0])
        await self.db.commit()
        await self.db.refresh(row)
        _aplicar_operativa(row)
        return row

    def to_public_dict(self, row: ConfiguracionSistema) -> dict:
        open_t, close_t, dias = _aplicar_operativa(row)
        return {
            "nombre_organizacion": row.nombre_organizacion,
            "ubicacion": row.ubicacion,
            "telefono_contacto": row.telefono_contacto,
            "email_contacto": row.email_contacto,
            "sitio_web": row.sitio_web,
            "facebook": row.facebook,
            "instagram": row.instagram,
            "whatsapp": row.whatsapp,
            "tiktok": row.tiktok,
            "youtube": getattr(row, "youtube", None),
            "banco_nombre": row.banco_nombre,
            "banco_cuenta": row.banco_cuenta,
            "banco_titular": row.banco_titular,
            "qr_pago_contenido": row.qr_pago_contenido,
            "gym_open_time": open_t,
            "gym_close_time": close_t,
            "gym_open_hour": int(open_t.split(":")[0]),
            "gym_close_hour": int(close_t.split(":")[0]),
            "dias_ventana_inscripcion": dias,
            "updated_at": row.updated_at,
        }
