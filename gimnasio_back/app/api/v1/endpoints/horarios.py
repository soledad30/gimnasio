from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.dependencies import get_current_admin, get_current_instructor_profile, get_current_usuario, get_db
from app.models.asignacion_instructor import AsignacionInstructor
from app.models.instructor import Instructor
from app.models.sala import Sala
from app.services.periodo_service import formatear_vigencia, resolver_coaches_para_fecha, resolver_coaches_para_mes
from app.services.scheduling_service import (
    bloques_gym,
    disponibilidad_salas_fecha,
    disponibilidad_salas_semanal,
    instructor_ocupado_en_fecha,
    resumen_staffing,
    turnos_coach_maquinas,
    validar_asignacion_coach,
)
from app.schemas.schemas import (
    AsignacionInstructorCreate,
    AsignacionInstructorResponse,
    ConfigGymResponse,
    DisponibilidadBloque,
    DisponibilidadSemanalResponse,
    InstructorOcupacion,
    StaffingResumen,
)

router = APIRouter()


def to_asignacion_response(obj: AsignacionInstructor) -> AsignacionInstructorResponse:
    return AsignacionInstructorResponse(
        id=obj.id,
        instructor_id=obj.instructor_id,
        instructor_nombre=obj.instructor.nombre if obj.instructor else None,
        sala_id=obj.sala_id,
        sala_nombre=obj.sala.nombre if obj.sala else None,
        fecha=obj.fecha or obj.vigencia_inicio,
        turno=obj.turno,
        hora_inicio=obj.hora_inicio,
        hora_fin=obj.hora_fin,
        tipo=obj.tipo,
        vigencia_tipo=obj.vigencia_tipo or "mes",
        vigencia_inicio=obj.vigencia_inicio,
        vigencia_fin=obj.vigencia_fin,
        vigencia_label=formatear_vigencia(obj.vigencia_tipo, obj.vigencia_inicio, obj.vigencia_fin),
        actividad_id=obj.actividad_id,
        created_at=obj.created_at,
    )


async def _sala_maquinas(db: AsyncSession) -> Optional[Sala]:
    return (
        await db.execute(select(Sala).where(Sala.tipo == "maquinas", Sala.activa == True))  # noqa: E712
    ).scalar_one_or_none()


async def _coaches_vigentes(
    db: AsyncSession,
    ref: date,
    *,
    por_mes: bool = False,
) -> list[AsignacionInstructor]:
    sala = await _sala_maquinas(db)
    if not sala:
        return []
    result = await db.execute(
        select(AsignacionInstructor)
        .options(selectinload(AsignacionInstructor.instructor), selectinload(AsignacionInstructor.sala))
        .where(AsignacionInstructor.tipo == "coach_maquinas")
    )
    asignaciones = list(result.scalars().all())
    if por_mes:
        return resolver_coaches_para_mes(asignaciones, sala.id, ref.year, ref.month)
    return resolver_coaches_para_fecha(asignaciones, sala.id, ref)


@router.get("/config", response_model=ConfigGymResponse)
async def config_gym(_=Depends(get_current_usuario)):
    from app.services.scheduling_service import gym_close_display, gym_open_display

    bloques = [hi for hi, _ in bloques_gym()]
    return ConfigGymResponse(
        hora_apertura=gym_open_display(),
        hora_cierre=gym_close_display(),
        bloques=bloques,
        turnos_coach=turnos_coach_maquinas(),
        capacidad_actividad=settings.CAPACIDAD_SALA_ACTIVIDAD,
        capacidad_maquinas=settings.CAPACIDAD_SALA_MAQUINAS,
        min_coaches_manana=settings.MIN_COACHES_MANANA,
        min_coaches_tarde=settings.MIN_COACHES_TARDE,
        min_entrenadores_actividad=settings.MIN_ENTRENADORES_ACTIVIDAD,
    )


@router.get("/disponibilidad-semanal", response_model=DisponibilidadSemanalResponse)
async def disponibilidad_semanal(
    referencia: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    data = await disponibilidad_salas_semanal(db, referencia)
    return DisponibilidadSemanalResponse(**data)


@router.get("/disponibilidad", response_model=List[DisponibilidadBloque])
async def disponibilidad(
    fecha: date,
    dia_semana: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    data = await disponibilidad_salas_fecha(db, fecha, dia_semana=dia_semana)
    return [DisponibilidadBloque(**d) for d in data]


@router.get("/staffing", response_model=StaffingResumen)
async def staffing(
    fecha: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    data = await resumen_staffing(db, fecha)
    return StaffingResumen(**data)


@router.get("/asignaciones", response_model=List[AsignacionInstructorResponse])
async def listar_asignaciones(
    fecha: Optional[date] = None,
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    if tipo == "coach_maquinas" and fecha:
        vigentes = await _coaches_vigentes(db, fecha, por_mes=True)
        return [to_asignacion_response(a) for a in vigentes]

    query = select(AsignacionInstructor).options(
        selectinload(AsignacionInstructor.instructor),
        selectinload(AsignacionInstructor.sala),
    )
    if tipo:
        query = query.where(AsignacionInstructor.tipo == tipo)
    query = query.order_by(
        AsignacionInstructor.vigencia_inicio.desc().nullslast(),
        AsignacionInstructor.fecha.desc().nullslast(),
        AsignacionInstructor.hora_inicio,
    )
    result = await db.execute(query)
    return [to_asignacion_response(a) for a in result.scalars().all()]


@router.get("/mis-asignaciones", response_model=List[AsignacionInstructorResponse])
async def mis_asignaciones_coach(
    fecha: Optional[date] = None,
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    ref = fecha or date.today()
    vigentes = await _coaches_vigentes(db, ref)
    mine = [a for a in vigentes if a.instructor_id == instructor.id]
    return [to_asignacion_response(a) for a in mine]


@router.post("/asignaciones", response_model=AsignacionInstructorResponse, status_code=201)
async def crear_asignacion(
    data: AsignacionInstructorCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    if data.tipo not in ("coach_maquinas", "actividad"):
        raise HTTPException(status_code=400, detail="Tipo debe ser coach_maquinas o actividad")

    v_inicio = data.vigencia_inicio or data.fecha
    hi, hf, turno, v_tipo, v_ini, v_fin = await validar_asignacion_coach(
        db,
        instructor_id=data.instructor_id,
        sala_id=data.sala_id,
        turno=data.turno,
        vigencia_tipo=data.vigencia_tipo,
        vigencia_inicio=v_inicio,
    )
    obj = AsignacionInstructor(
        instructor_id=data.instructor_id,
        sala_id=data.sala_id,
        fecha=v_ini,
        turno=turno,
        hora_inicio=hi,
        hora_fin=hf,
        tipo=data.tipo,
        vigencia_tipo=v_tipo,
        vigencia_inicio=v_ini,
        vigencia_fin=v_fin,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    loaded = await db.execute(
        select(AsignacionInstructor)
        .options(selectinload(AsignacionInstructor.instructor), selectinload(AsignacionInstructor.sala))
        .where(AsignacionInstructor.id == obj.id)
    )
    return to_asignacion_response(loaded.scalar_one())


@router.delete("/asignaciones/{asignacion_id}", status_code=204)
async def eliminar_asignacion(
    asignacion_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    obj = await db.get(AsignacionInstructor, asignacion_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    await db.delete(obj)
    await db.commit()


@router.get("/instructores/{instructor_id}/ocupacion", response_model=InstructorOcupacion)
async def ocupacion_instructor(
    instructor_id: int,
    fecha: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    inst = await db.get(Instructor, instructor_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")

    bloques_ocupados = []
    bloques_libres = []
    for hi, hf in bloques_gym():
        motivo = await instructor_ocupado_en_fecha(db, instructor_id, fecha, hi)
        if motivo:
            bloques_ocupados.append({"hora_inicio": hi, "hora_fin": hf, "motivo": motivo})
        else:
            bloques_libres.append(hi)

    return InstructorOcupacion(
        instructor_id=instructor_id,
        instructor_nombre=inst.nombre,
        fecha=fecha.isoformat(),
        bloques_ocupados=bloques_ocupados,
        bloques_libres=bloques_libres,
    )


@router.post("/asignaciones/mi-turno", response_model=AsignacionInstructorResponse, status_code=201)
async def asignar_mi_turno_coach(
    data: AsignacionInstructorCreate,
    instructor=Depends(get_current_instructor_profile),
    db: AsyncSession = Depends(get_db),
):
    """Coach se asigna en sala de máquinas (admin también puede usar el endpoint general)."""
    v_inicio = data.vigencia_inicio or data.fecha
    hi, hf, turno, v_tipo, v_ini, v_fin = await validar_asignacion_coach(
        db,
        instructor_id=instructor.id,
        sala_id=data.sala_id,
        turno=data.turno,
        vigencia_tipo=data.vigencia_tipo,
        vigencia_inicio=v_inicio,
    )
    obj = AsignacionInstructor(
        instructor_id=instructor.id,
        sala_id=data.sala_id,
        fecha=v_ini,
        turno=turno,
        hora_inicio=hi,
        hora_fin=hf,
        tipo="coach_maquinas",
        vigencia_tipo=v_tipo,
        vigencia_inicio=v_ini,
        vigencia_fin=v_fin,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    loaded = await db.execute(
        select(AsignacionInstructor)
        .options(selectinload(AsignacionInstructor.instructor), selectinload(AsignacionInstructor.sala))
        .where(AsignacionInstructor.id == obj.id)
    )
    return to_asignacion_response(loaded.scalar_one())
