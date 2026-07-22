from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_estudiante, get_current_staff, get_db
from app.schemas.schemas import (
    AccesoManualRequest,
    AccesoMonitorStats,
    AccesoResponse,
    AlertaSeguridad,
    CodigoAccesoResponse,
    FaceEmbeddingRequest,
    FaceEnrollRequest,
    FaceEnrollResponse,
    HuellaScanRequest,
    NFCScanRequest,
    NFCScanResponse,
)
from app.services.acceso_service import AccesoService
from app.services.estudiante_service import EstudianteService, qr_payload_for
from app.services.face_service import FaceService

router = APIRouter()


@router.post("/nfc-scan", response_model=NFCScanResponse)
async def nfc_scan(payload: NFCScanRequest, db: AsyncSession = Depends(get_db)):
    """Lector NFC. modo=auto alterna; entrada/salida fuerzan el movimiento."""
    return await AccesoService(db).procesar_nfc(payload.nfc_uid, modo=payload.modo)


@router.post("/huella-scan", response_model=NFCScanResponse)
async def huella_scan(payload: HuellaScanRequest, db: AsyncSession = Depends(get_db)):
    """
    Lector de huella digital (Proteus COMPIM o sensor físico).
    El `huella_id` se guarda/consulta en el mismo campo `nfc_uid` del estudiante.
    """
    return await AccesoService(db).procesar_nfc(payload.huella_id, modo=payload.modo)


@router.post("/face-scan", response_model=NFCScanResponse)
async def face_scan(
    payload: FaceEmbeddingRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """Reconocimiento facial: el front envía el embedding (webcam + face-api)."""
    return await AccesoService(db).procesar_face(payload.embedding, modo=payload.modo)


@router.post("/face-enroll", response_model=FaceEnrollResponse)
async def face_enroll(
    payload: FaceEnrollRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """Enrolar rostro de un estudiante (guarda embedding en BD)."""
    try:
        est = await FaceService(db).enroll(payload.estudiante_id, payload.embedding)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FaceEnrollResponse(
        estudiante_id=est.id,
        nombre=est.nombre,
        tiene_rostro=True,
        mensaje=f"Rostro enrolado para {est.nombre}",
    )


@router.delete("/face-enroll/{estudiante_id}", response_model=FaceEnrollResponse)
async def face_clear(
    estudiante_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """Eliminar embedding facial de un estudiante."""
    try:
        est = await FaceService(db).clear(estudiante_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FaceEnrollResponse(
        estudiante_id=est.id,
        nombre=est.nombre,
        tiene_rostro=False,
        mensaje=f"Rostro eliminado de {est.nombre}",
    )


@router.post("/manual", response_model=NFCScanResponse)
async def acceso_manual(
    payload: AccesoManualRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """Registro manual por QR, código de acceso, registro universitario o cédula."""
    return await AccesoService(db).procesar_manual(payload.codigo, modo=payload.modo)


@router.post("/qr-scan", response_model=NFCScanResponse)
async def qr_scan(
    payload: AccesoManualRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """Escaneo de QR del estudiante (mismo formato que acceso manual)."""
    return await AccesoService(db).procesar_manual(payload.codigo, modo=payload.modo)


@router.get("/mi-qr", response_model=CodigoAccesoResponse)
async def mi_codigo_qr(
    estudiante=Depends(get_current_estudiante),
    db: AsyncSession = Depends(get_db),
):
    """Código y payload QR para el estudiante (sin NFC en el teléfono)."""
    service = EstudianteService(db)
    codigo = await service.ensure_codigo_acceso(estudiante)
    return CodigoAccesoResponse(
        codigo=codigo,
        qr_payload=qr_payload_for(codigo),
        nombre=estudiante.nombre,
    )


@router.post("/check-in", response_model=NFCScanResponse)
async def check_in_estudiante(
    estudiante=Depends(get_current_estudiante),
    db: AsyncSession = Depends(get_db),
):
    """El estudiante registra su propia entrada o salida desde la app."""
    codigo = await EstudianteService(db).ensure_codigo_acceso(estudiante)
    return await AccesoService(db).procesar_manual(codigo)


@router.get("/monitor", response_model=AccesoMonitorStats)
async def monitor_acceso(db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    return await AccesoService(db).get_monitor_stats()


@router.get("/tiempo-real", response_model=List[AccesoResponse])
async def accesos_tiempo_real(
    limit: int = 15,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    return await AccesoService(db).get_tiempo_real(limit=limit)


@router.get("/alertas", response_model=List[AlertaSeguridad])
async def alertas_seguridad(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    return await AccesoService(db).get_alertas_seguridad(limit=limit)


@router.get("/historial", response_model=List[AccesoResponse])
async def historial_accesos(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    return await AccesoService(db).get_historial(skip=skip, limit=limit)
