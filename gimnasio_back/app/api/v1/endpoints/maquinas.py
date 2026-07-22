from datetime import date
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_admin, get_current_usuario, get_db
from app.core.uploads import save_image_upload
from app.models.maquina import Maquina
from app.models.mantenimiento_maquina import MantenimientoMaquina
from app.schemas.schemas import (
    AlertasMantenimientoResumen,
    MantenimientoMaquinaCreate,
    MantenimientoMaquinaResponse,
    MantenimientoPlantillaResponse,
    MaquinaCreate,
    MaquinaEvaluacionResponse,
    MaquinaResponse,
    MaquinaUpdate,
)
from app.services.maquina_evaluacion_service import MaquinaEvaluacionService
from app.services.mantenimiento_maquina_service import (
    TIPOS_MANTENIMIENTO,
    calcular_proximo_mantenimiento,
    checklist_vacio,
    generar_codigo_maquina,
    plantilla_checklist,
)

router = APIRouter()


async def _get_maquina(db: AsyncSession, maquina_id: int) -> Maquina:
    result = await db.execute(select(Maquina).where(Maquina.id == maquina_id))
    maq = result.scalar_one_or_none()
    if not maq:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    return maq


def to_mantenimiento_response(obj: MantenimientoMaquina) -> MantenimientoMaquinaResponse:
    return MantenimientoMaquinaResponse(
        id=obj.id,
        maquina_id=obj.maquina_id,
        maquina_codigo=obj.maquina.codigo if obj.maquina else None,
        maquina_nombre=obj.maquina.nombre if obj.maquina else None,
        tipo=obj.tipo,
        responsable=obj.responsable,
        observaciones=obj.observaciones,
        checklist=obj.checklist or [],
        fecha_realizado=obj.fecha_realizado,
        proximo_mantenimiento=obj.proximo_mantenimiento,
        resultado=obj.resultado,
        created_at=obj.created_at,
    )


@router.post("/upload-foto")
async def subir_foto_maquina(
    file: UploadFile = File(...),
    _=Depends(get_current_admin),
):
    fotourl = await save_image_upload(file, "maquinas")
    return {"fotourl": fotourl}


@router.post("/", response_model=MaquinaResponse, status_code=201)
async def crear_maquina(
    data: MaquinaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    payload = data.model_dump()
    codigo = await generar_codigo_maquina(db, data.nombre)
    payload["codigo"] = codigo
    if payload.get("estado_maquina") == "mantenimiento":
        payload["estado_maquina"] = "disponible"
    obj = Maquina(**payload)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/", response_model=List[MaquinaResponse])
async def listar_maquinas(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(select(Maquina).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/alertas-mantenimiento", response_model=AlertasMantenimientoResumen)
async def alertas_mantenimiento(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """Resumen predictivo: preventivo cada 6 meses y vida útil de equipos."""
    return await MaquinaEvaluacionService(db).resumen_alertas()


@router.get("/{maquina_id}/evaluacion", response_model=MaquinaEvaluacionResponse)
async def evaluacion_maquina(
    maquina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    maq = await _get_maquina(db, maquina_id)
    return await MaquinaEvaluacionService(db).evaluar_maquina(maq)


@router.get("/{maquina_id}/mantenimiento/plantilla", response_model=MantenimientoPlantillaResponse)
async def plantilla_mantenimiento(
    maquina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    maq = await _get_maquina(db, maquina_id)
    secciones = checklist_vacio(maq.categoria)
    return MantenimientoPlantillaResponse(tipos=TIPOS_MANTENIMIENTO, secciones=secciones)


@router.get("/{maquina_id}/mantenimientos", response_model=List[MantenimientoMaquinaResponse])
async def listar_mantenimientos(
    maquina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await _get_maquina(db, maquina_id)
    result = await db.execute(
        select(MantenimientoMaquina)
        .options(selectinload(MantenimientoMaquina.maquina))
        .where(MantenimientoMaquina.maquina_id == maquina_id)
        .order_by(MantenimientoMaquina.fecha_realizado.desc(), MantenimientoMaquina.id.desc())
    )
    return [to_mantenimiento_response(m) for m in result.scalars().all()]


@router.post("/{maquina_id}/mantenimientos", response_model=MantenimientoMaquinaResponse, status_code=201)
async def registrar_mantenimiento(
    maquina_id: int,
    data: MantenimientoMaquinaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    maq = await _get_maquina(db, maquina_id)
    tipos_validos = {t["value"] for t in TIPOS_MANTENIMIENTO}
    if data.tipo not in tipos_validos:
        raise HTTPException(status_code=400, detail="Tipo de mantenimiento inválido")
    if data.resultado not in ("ok", "pendiente", "requiere_repuesto"):
        raise HTTPException(status_code=400, detail="Resultado inválido")

    proximo = data.proximo_mantenimiento or calcular_proximo_mantenimiento(
        data.fecha_realizado, data.tipo, maq.categoria
    )
    checklist = [s.model_dump() for s in data.checklist]

    obj = MantenimientoMaquina(
        maquina_id=maquina_id,
        tipo=data.tipo,
        responsable=data.responsable,
        observaciones=data.observaciones,
        checklist=checklist,
        fecha_realizado=data.fecha_realizado,
        proximo_mantenimiento=proximo,
        resultado=data.resultado,
    )
    db.add(obj)

    if data.marcar_disponible and data.resultado == "ok":
        maq.estado_maquina = "disponible"
    elif data.resultado == "requiere_repuesto":
        maq.estado_maquina = "fuera_servicio"
    else:
        maq.estado_maquina = "mantenimiento"

    await db.commit()
    await db.refresh(obj)
    loaded = await db.execute(
        select(MantenimientoMaquina)
        .options(selectinload(MantenimientoMaquina.maquina))
        .where(MantenimientoMaquina.id == obj.id)
    )
    return to_mantenimiento_response(loaded.scalar_one())


@router.get("/{maquina_id}", response_model=MaquinaResponse)
async def obtener_maquina(
    maquina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    return await _get_maquina(db, maquina_id)


@router.patch("/{maquina_id}", response_model=MaquinaResponse)
async def actualizar_maquina(
    maquina_id: int,
    data: MaquinaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    maq = await _get_maquina(db, maquina_id)
    updates = data.model_dump(exclude_none=True)
    updates.pop("codigo", None)
    for field, value in updates.items():
        setattr(maq, field, value)
    await db.commit()
    await db.refresh(maq)
    return maq


@router.delete("/{maquina_id}", status_code=204)
async def eliminar_maquina(
    maquina_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    maq = await _get_maquina(db, maquina_id)
    await db.delete(maq)
    await db.commit()
