from __future__ import annotations

import calendar
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.actividad import Actividad
from app.models.inscripcion import Inscripcion

QR_PAGO_PREFIX = "GYMPAY"

ESTADO_CANCELADA = 0
ESTADO_CONFIRMADA = 1
ESTADO_PENDIENTE_PAGO = 3


def generar_referencia_pago() -> str:
    return f"PAY-{secrets.token_hex(4).upper()}"


def qr_pago_payload(referencia: str) -> str:
    return f"{QR_PAGO_PREFIX}:{referencia}"


def qr_cobro_display(qr_contenido_org: Optional[str], referencia: str) -> str:
    """QR escaneable: contenido QR Simple del gimnasio o código interno de respaldo."""
    content = (qr_contenido_org or "").strip()
    if content:
        return content
    return qr_pago_payload(referencia)


def usa_qr_simple(qr_contenido_org: Optional[str]) -> bool:
    return bool((qr_contenido_org or "").strip())


def normalizar_referencia_pago(texto: str) -> str:
    t = texto.strip()
    if t.upper().startswith(f"{QR_PAGO_PREFIX}:"):
        return t.split(":", 1)[1].strip()
    return t


def primer_dia_mes(d: date) -> date:
    return d.replace(day=1)


def mes_siguiente(d: date) -> date:
    y, m = d.year, d.month
    if m == 12:
        return date(y + 1, 1, 1)
    return date(y, m + 1, 1)


def ventana_inscripcion(mes_objetivo: date) -> tuple[date, date]:
    """Últimos N días del mes anterior al mes objetivo."""
    primer = primer_dia_mes(mes_objetivo)
    fin = primer - timedelta(days=1)
    inicio = primer - timedelta(days=settings.DIAS_VENTANA_INSCRIPCION)
    return inicio, fin


def esta_en_ventana(hoy: date, mes_objetivo: date) -> bool:
    inicio, fin = ventana_inscripcion(primer_dia_mes(mes_objetivo))
    return inicio <= hoy <= fin


def mes_inscripcion_abierto(hoy: date) -> Optional[date]:
    objetivo = mes_siguiente(hoy)
    if esta_en_ventana(hoy, objetivo):
        return objetivo
    return None


def info_ventana(hoy: date) -> dict:
    objetivo = mes_siguiente(hoy)
    inicio, fin = ventana_inscripcion(objetivo)
    abierta = esta_en_ventana(hoy, objetivo)
    return {
        "hoy": hoy.isoformat(),
        "mes_objetivo": objetivo.isoformat(),
        "ventana_inicio": inicio.isoformat(),
        "ventana_fin": fin.isoformat(),
        "ventana_abierta": abierta,
        "dias_ventana": settings.DIAS_VENTANA_INSCRIPCION,
        "precio_actividad": str(settings.PRECIO_INSCRIPCION_ACTIVIDAD),
        "precio_sala_maquinas": str(settings.PRECIO_INSCRIPCION_SALA_MAQUINAS),
    }


def validar_mes_objetivo(mes_objetivo: date) -> date:
    mes = primer_dia_mes(mes_objetivo)
    if mes != mes_objetivo:
        raise HTTPException(status_code=400, detail="mes_inicio debe ser el primer día del mes")
    return mes


def validar_ventana_estudiante(hoy: date, mes_objetivo: date) -> None:
    if not esta_en_ventana(hoy, mes_objetivo):
        inicio, fin = ventana_inscripcion(mes_objetivo)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Inscripciones para {mes_objetivo.strftime('%B %Y')} solo del "
                f"{inicio.isoformat()} al {fin.isoformat()} "
                f"({settings.DIAS_VENTANA_INSCRIPCION} días antes del mes)"
            ),
        )


def validar_mes_futuro(hoy: date, mes_objetivo: date) -> None:
    if hoy >= mes_objetivo:
        raise HTTPException(status_code=400, detail="No se puede inscribir en un mes que ya empezó")


def calcular_monto(tipo: str) -> Decimal:
    if tipo == "sala_maquinas":
        return Decimal(str(settings.PRECIO_INSCRIPCION_SALA_MAQUINAS))
    return Decimal(str(settings.PRECIO_INSCRIPCION_ACTIVIDAD))


def etiqueta_inscripcion(tipo: str, actividad: Optional[Actividad]) -> str:
    if tipo == "sala_maquinas":
        return "Sala de máquinas"
    return actividad.nombre if actividad else "Actividad"


async def inscripcion_duplicada(
    db: AsyncSession,
    estudiante_id: int,
    tipo: str,
    mes_inicio: date,
    actividad_id: Optional[int],
) -> bool:
    q = select(Inscripcion.id).where(
        and_(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.tipo == tipo,
            Inscripcion.mes_inicio == mes_inicio,
            Inscripcion.estado.in_([ESTADO_CONFIRMADA, ESTADO_PENDIENTE_PAGO]),
        )
    )
    if tipo == "actividad":
        q = q.where(Inscripcion.actividad_id == actividad_id)
    else:
        q = q.where(Inscripcion.actividad_id.is_(None))
    return (await db.scalar(q)) is not None


def actividad_habilitada_para_mes(act: Actividad, mes_inicio: date) -> bool:
    """La actividad debe estar vigente (habilitada) para el mes de inscripción."""
    from app.services.periodo_service import vigencias_se_solapan

    if not act.vigencia_inicio or not act.vigencia_fin:
        return True
    return vigencias_se_solapan(
        mes_inicio,
        ultimo_dia_mes(mes_inicio),
        act.vigencia_inicio,
        act.vigencia_fin,
    )


def _hora_fin_efectiva(act: Actividad) -> str:
    from app.services.scheduling_service import calcular_hora_fin, normalizar_hora

    if act.hora_fin:
        return normalizar_hora(act.hora_fin)
    if act.hora_inicio:
        return calcular_hora_fin(act.hora_inicio)
    return "00:00"


def actividades_chocan_horario(a: Actividad, b: Actividad) -> bool:
    """True si comparten al menos un día y sus franjas horarias se solapan."""
    from app.services.scheduling_service import hora_a_minutos, normalizar_hora, parse_dias_semana

    dias_a = set(parse_dias_semana(a.dia_semana))
    dias_b = set(parse_dias_semana(b.dia_semana))
    if not dias_a.intersection(dias_b):
        return False
    if not a.hora_inicio or not b.hora_inicio:
        return False

    a0 = hora_a_minutos(normalizar_hora(a.hora_inicio))
    a1 = hora_a_minutos(_hora_fin_efectiva(a))
    b0 = hora_a_minutos(normalizar_hora(b.hora_inicio))
    b1 = hora_a_minutos(_hora_fin_efectiva(b))
    return a0 < b1 and b0 < a1


def _etiqueta_horario(act: Actividad) -> str:
    from app.services.scheduling_service import formatear_dias

    partes: list[str] = []
    dias = formatear_dias(act.dia_semana)
    if dias:
        partes.append(dias)
    if act.hora_inicio:
        partes.append(f"{act.hora_inicio}-{_hora_fin_efectiva(act)}")
    return " · ".join(partes) if partes else act.nombre


async def validar_nueva_inscripcion_actividad(
    db: AsyncSession,
    *,
    estudiante_id: int,
    actividad: Actividad,
    mes_inicio: date,
) -> None:
    """
    Permite varias actividades el mismo mes si:
    - la actividad está habilitada (vigente) para ese mes,
    - no está ya inscrito en esa misma actividad,
    - no choca el horario con otra inscripción activa/pendiente del mes.
    """
    if not actividad_habilitada_para_mes(actividad, mes_inicio):
        raise HTTPException(
            status_code=400,
            detail=(
                f"La actividad '{actividad.nombre}' no está habilitada "
                f"para inscripción en {formatear_mes(mes_inicio)}"
            ),
        )

    if await inscripcion_duplicada(db, estudiante_id, "actividad", mes_inicio, actividad.id):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Ya estás inscrito/a en la actividad '{actividad.nombre}' "
                f"para {formatear_mes(mes_inicio)}. "
                "No podés volver a inscribirte a la misma actividad el mismo mes."
            ),
        )

    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Inscripcion)
        .options(selectinload(Inscripcion.actividad))
        .where(
            and_(
                Inscripcion.estudiante_id == estudiante_id,
                Inscripcion.tipo == "actividad",
                Inscripcion.mes_inicio == mes_inicio,
                Inscripcion.estado.in_([ESTADO_CONFIRMADA, ESTADO_PENDIENTE_PAGO]),
            )
        )
    )
    for otra in result.scalars().all():
        act_otra = otra.actividad
        if not act_otra:
            continue
        if actividades_chocan_horario(actividad, act_otra):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"El horario de '{actividad.nombre}' ({_etiqueta_horario(actividad)}) "
                    f"choca con tu inscripción a '{act_otra.nombre}' "
                    f"({_etiqueta_horario(act_otra)})"
                ),
            )


def formatear_mes(mes: date) -> str:
    meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ]
    return f"{meses[mes.month - 1]} {mes.year}"


def ultimo_dia_mes(mes: date) -> date:
    return date(mes.year, mes.month, calendar.monthrange(mes.year, mes.month)[1])


def calcular_expiracion_pago(desde: Optional[datetime] = None) -> datetime:
    base = desde or datetime.now(timezone.utc)
    return base + timedelta(hours=settings.HORAS_VALIDEZ_QR_PAGO)


def pago_qr_vigente(ins: Inscripcion, ahora: Optional[datetime] = None) -> bool:
    if ins.estado != ESTADO_PENDIENTE_PAGO:
        return False
    if not ins.pago_expira_en:
        return True
    ref = ahora or datetime.now(timezone.utc)
    expira = ins.pago_expira_en
    if expira.tzinfo is None:
        expira = expira.replace(tzinfo=timezone.utc)
    return ref <= expira


async def entitlements_acceso_hoy(
    db: AsyncSession, estudiante_id: int
) -> dict[str, bool | str]:
    """
    Qué habilita el ingreso hoy según inscripciones pagadas del mes en curso.
    Solo el mes pagado habilita acceso (p. ej. pago de agosto → entra en agosto).
    - sala_maquinas: acceso a sala de máquinas (además de membresía admin)
    - actividad: acceso a sala de actividades / clases
    """
    hoy = date.today()
    result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_CONFIRMADA,
        )
    )
    maquinas = False
    actividad = False
    for ins in result.scalars().all():
        if not (ins.mes_inicio <= hoy <= ultimo_dia_mes(ins.mes_inicio)):
            continue
        if ins.tipo == "sala_maquinas":
            maquinas = True
        elif ins.tipo == "actividad":
            actividad = True

    if maquinas or actividad:
        partes = []
        if maquinas:
            partes.append("sala de máquinas")
        if actividad:
            partes.append("actividades")
        return {
            "ok": True,
            "maquinas": maquinas,
            "actividad": actividad,
            "estado": "inscripción: " + " + ".join(partes),
        }

    pendiente = await db.scalar(
        select(Inscripcion.id).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_PENDIENTE_PAGO,
            Inscripcion.mes_inicio == primer_dia_mes(hoy),
        ).limit(1)
    )
    if pendiente:
        return {
            "ok": False,
            "maquinas": False,
            "actividad": False,
            "estado": "inscripción pendiente de pago",
        }

    pendiente_futuro = await db.scalar(
        select(Inscripcion.id).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_PENDIENTE_PAGO,
            Inscripcion.mes_inicio > hoy,
        ).limit(1)
    )
    if pendiente_futuro:
        return {
            "ok": False,
            "maquinas": False,
            "actividad": False,
            "estado": "inscripción pendiente de pago (mes futuro)",
        }

    futura = await db.scalar(
        select(Inscripcion.id).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_CONFIRMADA,
            Inscripcion.mes_inicio > hoy,
        ).limit(1)
    )
    if futura:
        return {
            "ok": False,
            "maquinas": False,
            "actividad": False,
            "estado": "inscripción pagada para un mes futuro; el acceso inicia el 1 de ese mes",
        }

    return {
        "ok": False,
        "maquinas": False,
        "actividad": False,
        "estado": "sin inscripción pagada este mes",
    }


async def estudiante_habilitado_hoy(db: AsyncSession, estudiante_id: int) -> tuple[bool, str]:
    """Acceso al gym: inscripción confirmada y pagada para el mes en curso."""
    info = await entitlements_acceso_hoy(db, estudiante_id)
    return bool(info["ok"]), str(info["estado"])


async def tiene_inscripcion_confirmada(
    db: AsyncSession,
    estudiante_id: int,
    tipo: str,
    mes_inicio: date,
    actividad_id: Optional[int] = None,
) -> bool:
    q = select(Inscripcion.id).where(
        and_(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.tipo == tipo,
            Inscripcion.mes_inicio == mes_inicio,
            Inscripcion.estado == ESTADO_CONFIRMADA,
        )
    )
    if tipo == "actividad":
        q = q.where(Inscripcion.actividad_id == actividad_id)
    else:
        q = q.where(Inscripcion.actividad_id.is_(None))
    return (await db.scalar(q)) is not None


async def tiene_inscripcion_pendiente(
    db: AsyncSession,
    estudiante_id: int,
    tipo: str,
    mes_inicio: date,
    actividad_id: Optional[int] = None,
) -> bool:
    q = select(Inscripcion.id).where(
        and_(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.tipo == tipo,
            Inscripcion.mes_inicio == mes_inicio,
            Inscripcion.estado == ESTADO_PENDIENTE_PAGO,
        )
    )
    if tipo == "actividad":
        q = q.where(Inscripcion.actividad_id == actividad_id)
    else:
        q = q.where(Inscripcion.actividad_id.is_(None))
    return (await db.scalar(q)) is not None
