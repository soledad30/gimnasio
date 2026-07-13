from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    PROJECT_NAME: str = "GymPro Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "gymdb"
    POSTGRES_USER: str = "gymuser"
    POSTGRES_PASSWORD: str = "gympassword"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@gympro.com"
    EMAILS_FROM_NAME: str = "UAGRM-GYM"
    # Si SMTP falla o no está configurado, imprime el correo en la consola del backend (solo desarrollo)
    EMAIL_DEV_LOG_TO_CONSOLE: bool = True

    # Horario UAGRM-GYM (7:00:00 – 19:00:00). Las horas enteras se mantienen por compatibilidad.
    GYM_OPEN_HOUR: int = 7
    GYM_CLOSE_HOUR: int = 19
    GYM_OPEN_TIME: str = "07:00:00"
    GYM_CLOSE_TIME: str = "19:00:00"
    CAPACIDAD_SALA_ACTIVIDAD: int = 20
    CAPACIDAD_SALA_MAQUINAS: int = 30
    MIN_COACHES_MANANA: int = 2
    MIN_COACHES_TARDE: int = 2
    MIN_ENTRENADORES_ACTIVIDAD: int = 2
    GYM_AFTERNOON_START_HOUR: int = 13

    # Inscripciones mensuales (actividades / sala máquinas)
    DIAS_VENTANA_INSCRIPCION: int = 10
    PRECIO_INSCRIPCION_ACTIVIDAD: float = 50.0
    PRECIO_INSCRIPCION_SALA_MAQUINAS: float = 80.0
    HORAS_VALIDEZ_QR_PAGO: int = 24

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
