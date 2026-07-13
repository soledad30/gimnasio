from datetime import date, datetime, timezone
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
    InscripcionReportarPago,
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
    qr_cobro_display,
    qr_pago_payload,
    usa_qr_simple,
    validar_mes_futuro,
    validar_mes_objetivo,
    validar_nueva_inscripcion_actividad,
    validar_ventana_estudiante,
)
from app.services.configuracion_service import ConfiguracionService
from app.services.notificacion_service import NotificacionService

router = APIRouter()

ESTADO_LABELS = {
    ESTADO_CANCELADA: "Cancelada",
    ESTADO_CONFIRMADA: "Confirmada",
    ESTADO_PENDIENTE_PAGO: "Pendiente de pago",
}


def to_inscripcion_response(
    ins: Inscripcion,
    *,
    qr_contenido_org: Optional[str] = None,
) -> InscripcionResponse:
    act = ins.actividad
    est = ins.estudiante
    ref = ins.referencia_pago
    qr_interno = qr_pago_payload(ref)
    qr_cobro = qr_cobro_display(qr_contenido_org, ref)
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
        referencia_pago=ref,
        qr_pago=qr_interno,
        qr_cobro=qr_cobro,
        usa_qr_simple=usa_qr_simple(qr_contenido_org),
        estado=ins.estado,
        estado_label=ESTADO_LABELS.get(ins.estado, str(ins.estado)),
        pago_id=ins.pago_id,
        pago_expira_en=ins.pago_expira_en,
        qr_vigente=pago_qr_vigente(ins),
        pago_reportado=ins.pago_reportado_en is not None and ins.estado == ESTADO_PENDIENTE_PAGO,
        pago_reportado_en=ins.pago_reportado_en,
        pago_reportado_metodo=ins.pago_reportado_metodo,
        pago_reportado_comprobante=ins.pago_reportado_comprobante,
        pago_reportado_notas=ins.pago_reportado_notas,
        creado_por_admin=ins.creado_por_admin,
        created_at=ins.created_at,
    )


async def _qr_contenido_org(db: AsyncSession) -> Optional[str]:
    row = await ConfiguracionService(db).get()
    return row.qr_pago_contenido


async def _map_inscripciones(db: AsyncSession, items: list[Inscripcion]) -> list[InscripcionResponse]:
    qr_content = await _qr_contenido_org(db)
    return [to_inscripcion_response(i, qr_contenido_org=qr_content) for i in items]


async def _respuesta_inscripcion(db: AsyncSession, ins: Inscripcion) -> InscripcionResponse:
    qr_content = await _qr_contenido_org(db)
    return to_inscripcion_response(ins, qr_contenido_org=qr_content)


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


async def _aplicar_confirmacion_pago(
    db: AsyncSession,
    ins: Inscripcion,
    *,
    metodo: str,
    referencia: str | None,
    notas: str | None,
) -> None:
    pago = Pago(
        estudiante_id=ins.estudiante_id,
        inscripcion_id=ins.id,
        monto=ins.monto,
        metodo=metodo,
        referencia=referencia or ins.referencia_pago,
        fecha=date.today(),
        notas=notas or f"Inscripción {ins.referencia_pago}",
    )
    db.add(pago)
    await db.flush()

    ins.pago_id = pago.id
    ins.estado = ESTADO_CONFIRMADA
    ins.pago_reportado_en = None
    ins.pago_reportado_metodo = None
    ins.pago_reportado_comprobante = None
    ins.pago_reportado_notas = None

    # Pago de sala de máquinas → activa membresía (QR / NFC / ingreso a máquinas)
    if ins.tipo == "sala_maquinas":
        from app.models.membresia import Membresia
        from app.services.membresia_service import MembresiaService

        mem = await MembresiaService(db).sincronizar_desde_pago_sala_maquinas(
            estudiante_id=ins.estudiante_id,
            mes_inicio=ins.mes_inicio,
            monto=ins.monto,
        )
        pago.membresia_id = mem.id

    act = ins.actividad
    concepto = etiqueta_inscripcion(ins.tipo, act)
    await NotificacionService(db).notificar_inscripcion_confirmada(
        ins.estudiante_id, concepto, formatear_mes(ins.mes_inicio)
    )


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
    cfg = await ConfiguracionService(db).get()
    qr_display = qr_cobro_display(cfg.qr_pago_contenido, referencia)
    expira = ins.pago_expira_en or calcular_expiracion_pago()

    notif = NotificacionService(db)
    await notif.notificar_pago_pendiente_inscripcion(
        ins.estudiante_id,
        concepto,
        mes_label,
        monto,
        referencia,
        qr_display,
        expira,
        creado_por_admin=creado_por_admin,
        renovacion=renovacion,
        usa_qr_simple=usa_qr_simple(cfg.qr_pago_contenido),
        banco_nombre=cfg.banco_nombre,
        banco_cuenta=cfg.banco_cuenta,
        banco_titular=cfg.banco_titular,
    )
    if ins.estudiante:
        await notif.enviar_pago_pendiente_email(
            ins.estudiante,
            concepto=concepto,
            mes_label=mes_label,
            monto=monto,
            referencia=referencia,
            qr_pago=qr_display,
            expira_en=expira,
            usa_qr_simple=usa_qr_simple(cfg.qr_pago_contenido),
            banco_nombre=cfg.banco_nombre,
            banco_cuenta=cfg.banco_cuenta,
            banco_titular=cfg.banco_titular,
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

    if tipo == "actividad" and act is not None:
        await validar_nueva_inscripcion_actividad(
            db,
            estudiante_id=estudiante_id,
            actividad=act,
            mes_inicio=mes,
        )
    elif await inscripcion_duplicada(db, estudiante_id, tipo, mes, actividad_id):
        raise HTTPException(
            status_code=409,
            detail="Ya existe una inscripción activa o pendiente de sala de máquinas para ese mes",
        )

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
        .order_by(
            Inscripcion.pago_reportado_en.desc().nullslast(),
            Inscripcion.mes_inicio.desc(),
            Inscripcion.pago_expira_en.asc().nullslast(),
        )
    )
    return await _map_inscripciones(db, list(result.scalars().all()))


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
    return await _map_inscripciones(db, list(result.scalars().all()))


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
    return await _map_inscripciones(db, list(result.scalars().all()))


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
    return await _respuesta_inscripcion(db, ins)


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
    return await _respuesta_inscripcion(db, ins)


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
    ins.pago_reportado_en = None
    ins.pago_reportado_metodo = None
    ins.pago_reportado_comprobante = None
    ins.pago_reportado_notas = None
    await _enviar_solicitud_pago(db, ins, ins.actividad, renovacion=True)
    await db.commit()
    return await _respuesta_inscripcion(db, await _load_inscripcion(db, ins.id))


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
    # Staff/recepción puede confirmar pagos pendientes aunque el mes ya haya empezado
    # (cobros en recepción / regularización). La ventana restringe la inscripción del estudiante.

    await _aplicar_confirmacion_pago(
        db,
        ins,
        metodo=data.metodo,
        referencia=data.referencia,
        notas=data.notas,
    )
    await db.commit()
    return await _respuesta_inscripcion(db, await _load_inscripcion(db, ins.id))


@router.post("/{inscripcion_id}/reportar-pago", response_model=InscripcionResponse)
async def reportar_pago_estudiante(
    inscripcion_id: int,
    data: InscripcionReportarPago,
    db: AsyncSession = Depends(get_db),
    current=Depends(get_current_usuario),
):
    """
    Estudiante declara que ya pagó.
    - modo=auto: registra el pago y confirma la inscripción de inmediato.
    - modo=notificar: marca el aviso para que recepción verifique el comprobante.
    """
    ins = await _load_inscripcion(db, inscripcion_id)
    if ins.estado != ESTADO_PENDIENTE_PAGO:
        raise HTTPException(status_code=400, detail="La inscripción no está pendiente de pago")

    est = (
        await db.execute(select(Estudiante).where(Estudiante.usuario_id == current.id))
    ).scalar_one_or_none()
    if not est or ins.estudiante_id != est.id:
        raise HTTPException(status_code=403, detail="Solo el estudiante puede reportar este pago")

    if not pago_qr_vigente(ins):
        raise HTTPException(
            status_code=400,
            detail="El método de pago expiró. Solicita uno nuevo y luego reporta el pago.",
        )

    concepto = etiqueta_inscripcion(ins.tipo, ins.actividad)
    mes_label = formatear_mes(ins.mes_inicio)
    comprobante = (data.referencia_comprobante or "").strip() or None
    notas_extra = (data.notas or "").strip() or None
    ref_pago = comprobante or ins.referencia_pago

    if data.modo == "auto":
        notas_auto = (
            f"Autoconfirmado por estudiante ({data.metodo}). "
            f"Inscripción {ins.referencia_pago}"
            + (f". Comp: {comprobante}" if comprobante else "")
            + (f". {notas_extra}" if notas_extra else "")
        )
        await _aplicar_confirmacion_pago(
            db,
            ins,
            metodo=data.metodo,
            referencia=ref_pago,
            notas=notas_auto,
        )
        await NotificacionService(db).avisar_staff_pago_estudiante(
            estudiante_nombre=est.nombre,
            concepto=concepto,
            mes_label=mes_label,
            monto=str(ins.monto),
            referencia=ins.referencia_pago,
            metodo=data.metodo,
            comprobante=comprobante,
            modo="auto",
        )
        await db.commit()
        return await _respuesta_inscripcion(db, await _load_inscripcion(db, ins.id))

    # modo = notificar
    if ins.pago_reportado_en is not None:
        raise HTTPException(
            status_code=400,
            detail="Ya avisaste este pago. Recepción lo verá en Pendientes; espera la confirmación.",
        )

    ins.pago_reportado_en = datetime.now(timezone.utc)
    insp_metodo = data.metodo
    ins.pago_reportado_metodo = insp_metodo
    ins.pago_reportado_comprobante = comprobante
    ins.pago_reportado_notas = notas_extra

    await NotificacionService(db).notificar_pago_reportado_estudiante(
        ins.estudiante_id,
        concepto=concepto,
        mes_label=mes_label,
        monto=str(ins.monto),
        referencia=ins.referencia_pago,
        metodo=data.metodo,
        comprobante=comprobante,
    )
    await NotificacionService(db).avisar_staff_pago_estudiante(
        estudiante_nombre=est.nombre,
        concepto=concepto,
        mes_label=mes_label,
        monto=str(ins.monto),
        referencia=ins.referencia_pago,
        metodo=data.metodo,
        comprobante=comprobante,
        modo="notificar",
    )
    await db.commit()
    return await _respuesta_inscripcion(db, await _load_inscripcion(db, ins.id))


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
    return await _respuesta_inscripcion(db, ins)


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
    return await _respuesta_inscripcion(db, await _load_inscripcion(db, ins.id))


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
    return await _map_inscripciones(db, list(result.scalars().all()))
