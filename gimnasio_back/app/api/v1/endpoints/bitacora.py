from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.models.usuario import Usuario
from app.schemas.bitacora import BitacoraListResponse
from app.services.bitacora_service import BitacoraService

router = APIRouter()


@router.get("/", response_model=BitacoraListResponse)
async def listar_bitacora(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    modulo: Optional[str] = Query(None),
    accion: Optional[str] = Query(None),
    usuario_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None, description="Buscar por usuario, ruta o detalle"),
    _: Usuario = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lista entradas de la bitácora de auditoría (solo admin)."""
    items, total = await BitacoraService(db).listar(
        limit=limit,
        offset=offset,
        modulo=modulo,
        accion=accion,
        usuario_id=usuario_id,
        q=q,
    )
    return BitacoraListResponse(total=total, items=items)
