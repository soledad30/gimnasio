from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.dependencies import get_current_admin, get_current_staff, get_current_usuario, get_db
from app.models.actividad import Actividad
from app.models.estudiante import Estudiante
from app.models.inscripcion import Inscripcion
from app.models.pago import Pago
from app.schemas.schemas import (
    InscripcionAdminCreate,
    InscripcionConfirmarPago,
    InscripcionCreate,
    InscripcionResponse,
    VentanaInscripcionResponse,
)
from app.services.inscripcion_service import (
    ESTADO_CANCELADA,
    ESTADO_CONFIRMADA,
    ESTADO_PENDIENTE_PAGO,
    calcular_expiracion_pago,
    calcular_monto,
    etiqueta_inscripcion,
    formatear_mes,
    generar_referencia_pago,
    info_ventana,
    inscripcion_duplicada,
    mes_inscripcion_abierto,
    pago_qr_vigente,
    primer_dia_mes,
    qr_pago_payload,
    validar_mes_futuro,
    validar_mes_objetivo,
    validar_ventana_estudiante,
)
from app.services.notificacion_service import NotificacionService

router = APIRouter()

ESTADO_LABELS = {
    ESTADO_CANCELADA: "Cancelada",
    ESTADO_CONFIRMADA: "Confirmada",
    ESTADO_PENDIENTE_PAGO: "Pendiente de pago",
}


def to_inscripcion_response(ins: Inscripcion) -> InscripcionResponse:
    act = ins.actividad
    est = ins.estudiante
    return InscripcionResponse(
        id=ins.id,
        estudiante_id=ins.estudiante_id,
        estudiante_nombre=est.nombre if est else None,
        tipo=ins.tipo,
        actividad_id=ins.actividad_id,
        actividad_nombre=act.nombre if act else None,
        mes_inicio=ins.mes_inicio,
        mes_label=formatear_mes(ins.mes_inicio),
        monto=ins.monto,
        referencia_pago=ins.referencia_pago,
        qr_pago=qr_pago_payload(ins.referencia_pago),
        estado=ins.estado,
        estado_label=ESTADO_LABELS.get(ins.estado, str(ins.estado)),
        pago_id=ins.pago_id,
        pago_expira_en=ins.pago_expira_en,
        qr_vigente=pago_qr_vigente(ins),
        creado_por_admin=ins.creado_por_admin,
        created_at=ins.created_at,
    )


async def _load_inscripcion(db: AsyncSession, inscripcion_id: int) -> Inscripcion:
    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.estudiante), selectinload(Inscripcion.actividad))
        .where(Inscripcion.id == inscripcion_id)
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return ins


async def _validar_tipo_actividad(
    db: AsyncSession, tipo: str, actividad_id: Optional[int]
) -> Optional[Actividad]:
    if tipo not in ("actividad", "sala_maquinas"):
        raise HTTPException(status_code=400, detail="tipo debe ser actividad o sala_maquinas")
    if tipo == "sala_maquinas":
        if actividad_id:
            raise HTTPException(status_code=400, detail="sala_maquinas no lleva actividad_id")
        return None
    if not actividad_id:
        raise HTTPException(status_code=400, detail="Debe seleccionar una actividad")
    act = await db.get(Actividad, actividad_id)
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return act


async def _enviar_solicitud_pago(
    db: AsyncSession,
    ins: Inscripcion,
    act: Optional[Actividad],
    *,
    creado_por_admin: bool = False,
    renovacion: bool = False,
) -> None:
    concepto = etiqueta_inscripcion(ins.tipo, act)
    mes_label = formatear_mes(ins.mes_inicio)
    monto = str(ins.monto)
    referencia = ins.referencia_pago
    qr = qr_pago_payload(referencia)
    expira = ins.pago_expira_en or calcular_expiracion_pago()

    notif = NotificacionService(db)
    await notif.notificar_pago_pendiente_inscripcion(
        ins.estudiante_id,
        concepto,
        mes_label,
        monto,
        referencia,
        qr,
        expira,
        creado_por_admin=creado_por_admin,
        renovacion=renovacion,
    )
    if ins.estudiante:
        await notif.enviar_pago_pendiente_email(
            ins.estudiante,
            concepto=concepto,
            mes_label=mes_label,
            monto=monto,
            referencia=referencia,
            qr_pago=qr,
            expira_en=expira,
        )


async def _crear_inscripcion(
    db: AsyncSession,
    *,
    estudiante_id: int,
    tipo: str,
    actividad_id: Optional[int],
    mes_inicio: date,
    creado_por_admin: bool,
) -> Inscripcion:
    hoy = date.today()
    mes = validar_mes_objetivo(mes_inicio)
    validar_mes_futuro(hoy, mes)
    act = await _validar_tipo_actividad(db, tipo, actividad_id)

    if not creado_por_admin:
        validar_ventana_estudiante(hoy, mes)

    if await inscripcion_duplicada(db, estudiante_id, tipo, mes, actividad_id):
        raise HTTPException(status_code=409, detail="Ya existe una inscripción activa o pendiente para ese mes")

    referencia = generar_referencia_pago()
    monto = calcular_monto(tipo)
    expira = calcular_expiracion_pago()
    obj = Inscripcion(
        estudiante_id=estudiante_id,
        tipo=tipo,
        actividad_id=actividad_id,
        mes_inicio=mes,
        monto=monto,
        referencia_pago=referencia,
        estado=ESTADO_PENDIENTE_PAGO,
        pago_expira_en=expira,
        creado_por_admin=creado_por_admin,
    )
    db.add(obj)
    await db.flush()

    ins = await _load_inscripcion(db, obj.id)
    await _enviar_solicitud_pago(db, ins, act, creado_por_admin=creado_por_admin)
    await db.commit()
    return await _load_inscripcion(db, obj.id)


@router.get("/ventana", response_model=VentanaInscripcionResponse)
async def ventana_inscripcion(_=Depends(get_current_usuario)):
    return VentanaInscripcionResponse(**info_ventana(date.today()))


@router.get("/pendientes", response_model=List[InscripcionResponse])
async def listar_pendientes_pago(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.estudiante), selectinload(Inscripcion.actividad))
        .where(Inscripcion.estado == ESTADO_PENDIENTE_PAGO)
        .order_by(Inscripcion.mes_inicio.desc(), Inscripcion.pago_expira_en.asc().nullslast())
    )
    return [to_inscripcion_response(i) for i in result.scalars().all()]


@router.get("/habilitados", response_model=List[InscripcionResponse])
async def listar_estudiantes_habilitados(
    mes: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    ref = primer_dia_mes(mes or date.today())
    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.estudiante), selectinload(Inscripcion.actividad))
        .where(
            Inscripcion.estado == ESTADO_CONFIRMADA,
            Inscripcion.mes_inicio == ref,
        )
        .order_by(Inscripcion.estudiante_id, Inscripcion.tipo)
    )
    return [to_inscripcion_response(i) for i in result.scalars().all()]


@router.get("/mis-inscripciones", response_model=List[InscripcionResponse])
async def mis_inscripciones(db: AsyncSession = Depends(get_db), current=Depends(get_current_usuario)):
    est = (
        await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    ).scalar_one_or_none()
    if not est:
        return []
    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.estudiante), selectinload(Inscripcion.actividad))
        .where(Inscripcion.estudiante_id == est.id)
        .order_by(Inscripcion.mes_inicio.desc(), Inscripcion.id.desc())
    )
    return [to_inscripcion_response(i) for i in result.scalars().all()]


@router.post("/", response_model=InscripcionResponse, status_code=201)
async def crear_inscripcion_estudiante(
    data: InscripcionCreate,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    est = (
        await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    ).scalar_one_or_none()
    if not est:
        raise HTTPException(status_code=400, detail="El usuario no tiene perfil de estudiante")

    hoy = date.today()
    mes = data.mes_inicio or mes_inscripcion_abierto(hoy)
    if not mes:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La ventana de inscripción no está abierta. "
                f"Solo los {settings.DIAS_VENTANA_INSCRIPCION} días antes de que empiece el mes."
            ),
        )

    ins = await _crear_inscripcion(
        db,
        estudiante_id=est.id,
        tipo=data.tipo,
        actividad_id=data.actividad_id,
        mes_inicio=mes,
        creado_por_admin=False,
    )
    return to_inscripcion_response(ins)


@router.post("/admin", response_model=InscripcionResponse, status_code=201)
async def crear_inscripcion_admin(
    data: InscripcionAdminCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    est = await db.get(Estudiante, data.estudiante_id)
    if not est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    ins = await _crear_inscripcion(
        db,
        estudiante_id=data.estudiante_id,
        tipo=data.tipo,
        actividad_id=data.actividad_id,
        mes_inicio=data.mes_inicio,
        creado_por_admin=True,
    )
    return to_inscripcion_response(ins)


@router.post("/{inscripcion_id}/renovar-pago", response_model=InscripcionResponse)
async def renovar_pago_inscripcion(
    inscripcion_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    ins = await _load_inscripcion(db, inscripcion_id)
    if ins.estado != ESTADO_PENDIENTE_PAGO:
        raise HTTPException(status_code=400, detail="La inscripción no está pendiente de pago")
    if pago_qr_vigente(ins):
        raise HTTPException(
            status_code=400,
            detail="Tu método de pago sigue vigente. Revisa notificaciones o correo.",
        )

    if not current.es_admin:
        est = (
            await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
        ).scalar_one_or_none()
        if not est or ins.estudiante_id != est.id:
            raise HTTPException(status_code=403, detail="No puedes renovar esta inscripción")

    ins.pago_expira_en = calcular_expiracion_pago()
    await _enviar_solicitud_pago(db, ins, ins.actividad, renovacion=True)
    await db.commit()
    return to_inscripcion_response(await _load_inscripcion(db, ins.id))


@router.post("/{inscripcion_id}/confirmar-pago", response_model=InscripcionResponse)
async def confirmar_pago_inscripcion(
    inscripcion_id: int,
    data: InscripcionConfirmarPago,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    ins = await _load_inscripcion(db, inscripcion_id)
    if ins.estado != ESTADO_PENDIENTE_PAGO:
        raise HTTPException(status_code=400, detail="La inscripción no está pendiente de pago")
    if date.today() >= ins.mes_inicio:
        raise HTTPException(status_code=400, detail="El mes ya empezó; no se puede confirmar este pago")

    pago = Pago(
        estudiante_id=ins.estudiante_id,
        inscripcion_id=ins.id,
        monto=ins.monto,
        metodo=data.metodo,
        referencia=data.referencia or ins.referencia_pago,
        fecha=date.today(),
        notas=data.notas or f"Inscripción {ins.referencia_pago}",
    )
    db.add(pago)
    await db.flush()

    ins.pago_id = pago.id
    ins.estado = ESTADO_CONFIRMADA

    act = ins.actividad
    concepto = etiqueta_inscripcion(ins.tipo, act)
    await NotificacionService(db).notificar_inscripcion_confirmada(
        ins.estudiante_id, concepto, formatear_mes(ins.mes_inicio)
    )
    await db.commit()
    return to_inscripcion_response(await _load_inscripcion(db, ins.id))


@router.get("/por-referencia/{referencia}", response_model=InscripcionResponse)
async def buscar_por_referencia(
    referencia: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    from app.services.inscripcion_service import normalizar_referencia_pago

    ref = normalizar_referencia_pago(referencia)
    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.estudiante), selectinload(Inscripcion.actividad))
        .where(Inscripcion.referencia_pago == ref)
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return to_inscripcion_response(ins)


@router.patch("/{inscripcion_id}/cancelar", response_model=InscripcionResponse)
async def cancelar_inscripcion(
    inscripcion_id: int,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    ins = await _load_inscripcion(db, inscripcion_id)
    if not current.es_admin:
        est = (
            await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
        ).scalar_one_or_none()
        if not est or ins.estudiante_id != est.id:
            raise HTTPException(status_code=403, detail="No puedes cancelar esta inscripción")
    ins.estado = ESTADO_CANCELADA
    await db.commit()
    return to_inscripcion_response(await _load_inscripcion(db, ins.id))


@router.get("/", response_model=List[InscripcionResponse])
async def listar_inscripciones(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.estudiante), selectinload(Inscripcion.actividad))
        .order_by(Inscripcion.mes_inicio.desc(), Inscripcion.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return [to_inscripcion_response(i) for i in result.scalars().all()]
