from datetime import datetime
from typing import Optional
import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

_TIME_RE = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$")


def normalizar_tiempo(value: str) -> str:
    """Acepta HH:MM o HH:MM:SS y devuelve HH:MM:SS."""
    text = value.strip()
    m = _TIME_RE.match(text)
    if not m:
        raise ValueError("Formato de hora inválido. Use HH:MM:SS")
    h, mi, s = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
    return f"{h:02d}:{mi:02d}:{s:02d}"


def tiempo_a_segundos(value: str) -> int:
    h, mi, s = normalizar_tiempo(value).split(":")
    return int(h) * 3600 + int(mi) * 60 + int(s)


def segundos_a_tiempo(total: int) -> str:
    total = max(0, min(total, 24 * 3600 - 1))
    h = total // 3600
    mi = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{mi:02d}:{s:02d}"


class ConfiguracionSistemaResponse(BaseModel):
    nombre_organizacion: Optional[str] = None
    ubicacion: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    sitio_web: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    whatsapp: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None
    banco_nombre: Optional[str] = None
    banco_cuenta: Optional[str] = None
    banco_titular: Optional[str] = None
    qr_pago_contenido: Optional[str] = None
    gym_open_time: str
    gym_close_time: str
    # derivados (compat)
    gym_open_hour: int
    gym_close_hour: int
    dias_ventana_inscripcion: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConfiguracionSistemaUpdate(BaseModel):
    nombre_organizacion: Optional[str] = Field(None, max_length=150)
    ubicacion: Optional[str] = Field(None, max_length=255)
    telefono_contacto: Optional[str] = Field(None, max_length=40)
    email_contacto: Optional[EmailStr] = None
    sitio_web: Optional[str] = Field(None, max_length=255)
    facebook: Optional[str] = Field(None, max_length=255)
    instagram: Optional[str] = Field(None, max_length=255)
    whatsapp: Optional[str] = Field(None, max_length=80)
    tiktok: Optional[str] = Field(None, max_length=255)
    youtube: Optional[str] = Field(None, max_length=255)
    banco_nombre: Optional[str] = Field(None, max_length=150)
    banco_cuenta: Optional[str] = Field(None, max_length=80)
    banco_titular: Optional[str] = Field(None, max_length=150)
    qr_pago_contenido: Optional[str] = Field(None, max_length=500)
    gym_open_time: Optional[str] = None
    gym_close_time: Optional[str] = None
    dias_ventana_inscripcion: Optional[int] = Field(None, ge=1, le=31)

    @field_validator("gym_open_time", "gym_close_time")
    @classmethod
    def validar_tiempo(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not str(v).strip():
            return None
        return normalizar_tiempo(str(v))

    @model_validator(mode="after")
    def validar_rango(self):
        if self.gym_open_time and self.gym_close_time:
            if tiempo_a_segundos(self.gym_close_time) <= tiempo_a_segundos(self.gym_open_time):
                raise ValueError("La hora de cierre debe ser mayor que la de apertura")
        return self
