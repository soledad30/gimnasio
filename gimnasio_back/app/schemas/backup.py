from datetime import datetime
from typing import Optional

from pydantic import BaseModel, model_validator


class BackupCreateRequest(BaseModel):
    include_database: bool = True
    include_uploads: bool = True

    @model_validator(mode="after")
    def at_least_one(self):
        if not self.include_database and not self.include_uploads:
            raise ValueError("Seleccioná al menos base de datos o archivos")
        return self


class BackupInfo(BaseModel):
    filename: str
    created_at: datetime
    size_bytes: int
    size_mb: float
    postgres_db: Optional[str] = None
    created_by: Optional[str] = None
    drive_copied: bool = False
    include_database: bool = True
    include_uploads: bool = True


class BackupCreateResponse(BackupInfo):
    message: str = "Backup creado correctamente"
