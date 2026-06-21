from __future__ import annotations

import calendar
from datetime import date
from typing import Optional, TypeVar

from fastapi import HTTPException

VIGENCIA_TIPOS = ("mes", "trimestre", "semestre", "anual")

T = TypeVar("T")


def validar_vigencia_tipo(tipo: str) -> str:
    t = (tipo or "mes").strip().lower()
    if t not in VIGENCIA_TIPOS:
        raise HTTPException(
            status_code=400,
            detail="Vigencia inválida. Use: mes, trimestre, semestre o anual",
        )
    return t


def _ultimo_dia_mes(anio: int, mes: int) -> int:
    return calendar.monthrange(anio, mes)[1]


def calcular_vigencia_fin(inicio: date, tipo: str) -> date:
    tipo = validar_vigencia_tipo(tipo)
    y, m = inicio.year, inicio.month

    if tipo == "mes":
        return date(y, m, _ultimo_dia_mes(y, m))

    if tipo == "trimestre":
        mes_fin = m + 2
        anio_fin = y
        while mes_fin > 12:
            mes_fin -= 12
            anio_fin += 1
        return date(anio_fin, mes_fin, _ultimo_dia_mes(anio_fin, mes_fin))

    if tipo == "semestre":
        mes_fin = m + 5
        anio_fin = y
        while mes_fin > 12:
            mes_fin -= 12
            anio_fin += 1
        return date(anio_fin, mes_fin, _ultimo_dia_mes(anio_fin, mes_fin))

    # anual: 12 meses desde el mes de inicio
    mes_fin = m + 11
    anio_fin = y
    while mes_fin > 12:
        mes_fin -= 12
        anio_fin += 1
    return date(anio_fin, mes_fin, _ultimo_dia_mes(anio_fin, mes_fin))


def normalizar_vigencia(
    vigencia_tipo: Optional[str],
    vigencia_inicio: Optional[date],
) -> tuple[str, date, date]:
    tipo = validar_vigencia_tipo(vigencia_tipo or "mes")
    inicio = vigencia_inicio or date.today().replace(day=1)
    fin = calcular_vigencia_fin(inicio, tipo)
    return tipo, inicio, fin


def vigencias_se_solapan(
    a_inicio: date,
    a_fin: date,
    b_inicio: date,
    b_fin: date,
) -> bool:
    return a_inicio <= b_fin and b_inicio <= a_fin


def aplica_vigencia_en_fecha(
    vigencia_inicio: Optional[date],
    vigencia_fin: Optional[date],
    ref: date,
) -> bool:
    if not vigencia_inicio or not vigencia_fin:
        return True
    return vigencia_inicio <= ref <= vigencia_fin


def formatear_vigencia(
    vigencia_tipo: Optional[str],
    vigencia_inicio: Optional[date],
    vigencia_fin: Optional[date],
) -> str:
    if not vigencia_inicio or not vigencia_fin:
        return "Sin vigencia"
    labels = {
        "mes": "Mes",
        "trimestre": "Trimestre",
        "semestre": "Semestre",
        "anual": "Anual",
    }
    t = labels.get(vigencia_tipo or "mes", vigencia_tipo or "mes")
    return f"{t}: {vigencia_inicio.isoformat()} → {vigencia_fin.isoformat()}"


def _elegir_vigente(items: list[T], ref: date, get_inicio, get_fin) -> Optional[T]:
    if not items:
        return None

    with_dates = [i for i in items if get_inicio(i) and get_fin(i)]
    legacy = [i for i in items if not get_inicio(i) or not get_fin(i)]

    current = [i for i in with_dates if get_inicio(i) <= ref <= get_fin(i)]
    if current:
        return max(current, key=lambda x: get_inicio(x))

    past = [i for i in with_dates if get_fin(i) < ref]
    if past:
        latest_fin = max(get_fin(i) for i in past)
        same_period = [i for i in past if get_fin(i) == latest_fin]
        return max(same_period, key=lambda x: get_inicio(x))

    if legacy:
        return legacy[0]

    return None


def resolver_actividades_para_fecha(actividades: list, ref: date) -> list:
    """Una actividad por slot (sala, día, hora) vigente o heredada."""
    from app.services.scheduling_service import actividad_incluye_dia, normalizar_hora, parse_dias_semana

    por_slot: dict[tuple, list] = {}
    for act in actividades:
        if not act.sala_id or not act.hora_inicio:
            continue
        hi = normalizar_hora(act.hora_inicio)
        for dia in parse_dias_semana(act.dia_semana):
            key = (act.sala_id, dia, hi)
            por_slot.setdefault(key, []).append(act)

    elegidas: dict[int, object] = {}
    for acts in por_slot.values():
        chosen = _elegir_vigente(
            acts,
            ref,
            lambda a: a.vigencia_inicio,
            lambda a: a.vigencia_fin,
        )
        if chosen:
            elegidas[chosen.id] = chosen
    return list(elegidas.values())


def _coaches_turno_para_fecha(turno_items: list, ref: date, max_items: int = 2) -> list:
    """Coaches vigentes en una fecha o heredados del periodo anterior."""
    current = [
        a
        for a in turno_items
        if aplica_vigencia_en_fecha(a.vigencia_inicio, a.vigencia_fin, ref)
    ]
    if current:
        current.sort(key=lambda x: x.vigencia_inicio or date.min, reverse=True)
        return current[:max_items]

    past = [a for a in turno_items if a.vigencia_fin and a.vigencia_fin < ref]
    if past:
        latest_fin = max(a.vigencia_fin for a in past)
        heredados = [a for a in past if a.vigencia_fin == latest_fin]
        heredados.sort(key=lambda x: x.vigencia_inicio or date.min, reverse=True)
        return heredados[:max_items]

    return []


def _candidatas_coaches_maquinas(asignaciones: list, sala_id: int) -> list:
    from app.services.scheduling_service import es_asignacion_turno_completo

    return [
        a
        for a in asignaciones
        if a.sala_id == sala_id
        and a.tipo == "coach_maquinas"
        and es_asignacion_turno_completo(a)
    ]


def resolver_coaches_para_fecha(asignaciones: list, sala_id: int, ref: date) -> list:
    """Coaches de sala máquinas vigentes o heredados en una fecha (máx. 2 por turno)."""
    from app.services.scheduling_service import es_turno_manana

    candidatas = _candidatas_coaches_maquinas(asignaciones, sala_id)
    resultado: list = []
    for es_manana in (True, False):
        turno_items = [a for a in candidatas if es_turno_manana(a.hora_inicio) == es_manana]
        resultado.extend(_coaches_turno_para_fecha(turno_items, ref))
    return resultado


def resolver_coaches_para_mes(asignaciones: list, sala_id: int, anio: int, mes: int) -> list:
    """Coaches de turno completo que aplican en el mes (solapamiento o herencia al inicio)."""
    from app.services.scheduling_service import es_turno_manana

    mes_inicio = date(anio, mes, 1)
    mes_fin = date(anio, mes, _ultimo_dia_mes(anio, mes))
    candidatas = _candidatas_coaches_maquinas(asignaciones, sala_id)

    resultado: list = []
    vistos: set[int] = set()
    for es_manana in (True, False):
        turno_items = [a for a in candidatas if es_turno_manana(a.hora_inicio) == es_manana]

        solapados = [
            a
            for a in turno_items
            if a.vigencia_inicio
            and a.vigencia_fin
            and vigencias_se_solapan(mes_inicio, mes_fin, a.vigencia_inicio, a.vigencia_fin)
        ]
        if solapados:
            solapados.sort(key=lambda x: x.vigencia_inicio or date.min, reverse=True)
            for a in solapados:
                if a.id not in vistos:
                    resultado.append(a)
                    vistos.add(a.id)
            continue

        for a in _coaches_turno_para_fecha(turno_items, mes_inicio):
            if a.id not in vistos:
                resultado.append(a)
                vistos.add(a.id)

    return resultado
