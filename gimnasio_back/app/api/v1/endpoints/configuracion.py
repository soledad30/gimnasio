from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.schemas.configuracion import ConfiguracionSistemaResponse, ConfiguracionSistemaUpdate
from app.services.configuracion_service import ConfiguracionService

router = APIRouter()


@router.get("/organizacion", response_model=ConfiguracionSistemaResponse)
async def obtener_configuracion(db: AsyncSession = Depends(get_db)):
    """Público: login/registro (ubicación, redes y reglas operativas)."""
    service = ConfiguracionService(db)
    row = await service.get()
    return ConfiguracionSistemaResponse(**service.to_public_dict(row))


@router.patch("/organizacion", response_model=ConfiguracionSistemaResponse)
async def actualizar_configuracion(
    data: ConfiguracionSistemaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    service = ConfiguracionService(db)
    row = await service.update(data)
    return ConfiguracionSistemaResponse(**service.to_public_dict(row))
