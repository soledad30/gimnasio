from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_admin
from app.schemas.schemas import NFCScanRequest, NFCScanResponse, AccesoResponse
from app.services.acceso_service import AccesoService

router = APIRouter()


@router.post("/nfc-scan", response_model=NFCScanResponse)
async def nfc_scan(payload: NFCScanRequest, db: AsyncSession = Depends(get_db)):
    """
    Endpoint llamado por el lector NFC en la puerta.
    Verifica identidad y membresía, registra el acceso.
    En producción proteger con API Key de dispositivo.
    """
    return await AccesoService(db).procesar_nfc(payload.nfc_uid)


@router.get("/historial", response_model=List[AccesoResponse])
async def historial_accesos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await AccesoService(db).get_all(skip=skip, limit=limit)
