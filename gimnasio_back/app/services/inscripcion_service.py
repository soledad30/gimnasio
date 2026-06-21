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


async def estudiante_habilitado_hoy(db: AsyncSession, estudiante_id: int) -> tuple[bool, str]:
    """Acceso al gym: inscripción confirmada y pagada para el mes en curso."""
    hoy = date.today()
    result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_CONFIRMADA,
        )
    )
    for ins in result.scalars().all():
        if ins.mes_inicio <= hoy <= ultimo_dia_mes(ins.mes_inicio):
            return True, "inscripción activa"

    pendiente = await db.scalar(
        select(Inscripcion.id).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_PENDIENTE_PAGO,
            Inscripcion.mes_inicio == primer_dia_mes(hoy),
        ).limit(1)
    )
    if pendiente:
        return False, "inscripción pendiente de pago"

    pendiente_futuro = await db.scalar(
        select(Inscripcion.id).where(
            Inscripcion.estudiante_id == estudiante_id,
            Inscripcion.estado == ESTADO_PENDIENTE_PAGO,
            Inscripcion.mes_inicio > hoy,
        ).limit(1)
    )
    if pendiente_futuro:
        return False, "inscripción pendiente de pago"

    return False, "sin inscripción pagada este mes"


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
