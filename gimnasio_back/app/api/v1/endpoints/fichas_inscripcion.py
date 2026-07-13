from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_current_estudiante,
    get_current_staff,
    get_current_usuario,
    get_db,
)
from app.core.roles import is_staff
from app.core.uploads import save_document_upload
from app.schemas.ficha_inscripcion import (
    CertificadoRecibidoUpdate,
    FichaEstadoResponse,
    FichaInscripcionCreate,
    FichaInscripcionResponse,
    FichaInscripcionResumen,
)
from app.services.ficha_export_service import render_ficha_html
from app.services.ficha_inscripcion_service import FichaInscripcionService

router = APIRouter()


@router.get("/mi-ficha/estado", response_model=FichaEstadoResponse)
async def mi_ficha_estado(estudiante=Depends(get_current_estudiante), db: AsyncSession = Depends(get_db)):
    return await FichaInscripcionService(db).get_estado(estudiante.id)


@router.get("/mi-ficha", response_model=FichaInscripcionResponse)
async def mi_ficha_vigente(estudiante=Depends(get_current_estudiante), db: AsyncSession = Depends(get_db)):
    ficha = await FichaInscripcionService(db).get_vigente(estudiante.id)
    if not ficha:
        raise HTTPException(status_code=404, detail="No tienes ficha de inscripción")
    return ficha


@router.get("/mi-ficha/historial", response_model=List[FichaInscripcionResponse])
async def mi_ficha_historial(estudiante=Depends(get_current_estudiante), db: AsyncSession = Depends(get_db)):
    return await FichaInscripcionService(db).list_historial(estudiante.id)


@router.post("/mi-ficha", response_model=FichaInscripcionResponse, status_code=201)
async def crear_mi_ficha(
    data: FichaInscripcionCreate,
    estudiante=Depends(get_current_estudiante),
    current=Depends(get_current_usuario),
    db: AsyncSession = Depends(get_db),
):
    return await FichaInscripcionService(db).create_ficha(estudiante, data, current.id)


@router.post("/mi-ficha/certificado", response_model=FichaInscripcionResponse)
async def subir_certificado_mi_ficha(
    file: UploadFile = File(...),
    estudiante=Depends(get_current_estudiante),
    db: AsyncSession = Depends(get_db),
):
    url = await save_document_upload(file, "fichas")
    return await FichaInscripcionService(db).subir_certificado(estudiante.id, url)


@router.get("/mi-ficha/export", response_class=HTMLResponse)
async def exportar_mi_ficha(
    estudiante=Depends(get_current_estudiante),
    db: AsyncSession = Depends(get_db),
):
    ficha = await FichaInscripcionService(db).get_vigente(estudiante.id)
    if not ficha:
        raise HTTPException(status_code=404, detail="No tienes ficha de inscripción")
    return HTMLResponse(content=render_ficha_html(ficha))


@router.get("/", response_model=List[FichaInscripcionResumen])
async def listar_fichas(
    estado: Optional[str] = Query(None, description="vigente | vencida | pendiente_certificado"),
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    return await FichaInscripcionService(db).list_resumen_staff(estado=estado, skip=skip, limit=limit)


@router.get("/estudiante/{estudiante_id}", response_model=FichaInscripcionResponse)
async def ficha_por_estudiante(
    estudiante_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    if not is_staff(current):
        raise HTTPException(status_code=403, detail="No autorizado")
    ficha = await FichaInscripcionService(db).get_by_estudiante_staff(estudiante_id)
    if not ficha:
        raise HTTPException(status_code=404, detail="El estudiante no tiene ficha vigente")
    return ficha


@router.get("/estudiante/{estudiante_id}/historial", response_model=List[FichaInscripcionResponse])
async def historial_por_estudiante(
    estudiante_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    return await FichaInscripcionService(db).list_historial(estudiante_id)


@router.patch("/{ficha_id}/certificado", response_model=FichaInscripcionResponse)
async def marcar_certificado(
    ficha_id: int,
    data: CertificadoRecibidoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    return await FichaInscripcionService(db).marcar_certificado(ficha_id, data.recibido)


@router.get("/{ficha_id}/export", response_class=HTMLResponse)
async def exportar_ficha(
    ficha_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    ficha = await FichaInscripcionService(db).get_by_id(ficha_id)
    if not ficha:
        raise HTTPException(status_code=404, detail="Ficha no encontrada")
    return HTMLResponse(content=render_ficha_html(ficha))
