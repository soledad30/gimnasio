from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.core.dependencies import get_current_admin
from app.models.usuario import Usuario
from app.schemas.backup import BackupCreateRequest, BackupCreateResponse, BackupInfo
from app.services.backup_service import BackupService

router = APIRouter()


@router.get("/", response_model=List[BackupInfo])
async def listar_backups(_: Usuario = Depends(get_current_admin)):
    """Lista los respaldos ZIP disponibles en el servidor."""
    return BackupService().list_backups()


@router.post("/", response_model=BackupCreateResponse)
async def crear_backup(
    payload: BackupCreateRequest,
    admin: Usuario = Depends(get_current_admin),
):
    """Genera un nuevo respaldo en ZIP (base de datos y/o archivos)."""
    created_by = admin.nombre or admin.email
    return await BackupService().create_backup(
        created_by=created_by,
        include_database=payload.include_database,
        include_uploads=payload.include_uploads,
    )


@router.get("/{filename}/download")
async def descargar_backup(filename: str, _: Usuario = Depends(get_current_admin)):
    """Descarga un archivo ZIP de respaldo."""
    path = BackupService().get_backup_path(filename)
    return FileResponse(
        path=path,
        media_type="application/zip",
        filename=path.name,
    )


@router.delete("/{filename}", status_code=204)
async def eliminar_backup(filename: str, _: Usuario = Depends(get_current_admin)):
    """Elimina un respaldo del servidor."""
    BackupService().delete_backup(filename)
