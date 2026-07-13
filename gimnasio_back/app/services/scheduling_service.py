from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.asignacion_instructor import AsignacionInstructor
from app.models.actividad import Actividad
from app.models.instructor import Instructor
from app.models.sala import Sala

DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
DIAS_ACTIVIDAD = ["lunes", "martes", "miercoles", "jueves", "viernes"]
DIAS_MAP = {i: DIAS_SEMANA[i] for i in range(7)}  # Monday=0 in Python weekday()


def normalizar_hora(hora: str) -> str:
    """Convierte HH:MM o HH:MM:SS a HH:MM."""
    parts = hora.strip().split(":")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Formato de hora inválido (use HH:MM)")
    h, m = int(parts[0]), int(parts[1])
    return f"{h:02d}:{m:02d}"


def hora_a_minutos(hora: str) -> int:
    h, m = normalizar_hora(hora).split(":")
    return int(h) * 60 + int(m)


def minutos_a_hora(minutos: int) -> str:
    return f"{minutos // 60:02d}:{minutos % 60:02d}"


def _gym_time_to_minutes(value: str) -> int:
    """Convierte HH:MM o HH:MM:SS a minutos desde medianoche."""
    parts = value.strip().split(":")
    h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    return h * 60 + m


def gym_open_display() -> str:
    t = getattr(settings, "GYM_OPEN_TIME", None) or f"{settings.GYM_OPEN_HOUR:02d}:00:00"
    parts = t.split(":")
    return f"{int(parts[0]):02d}:{int(parts[1]):02d}"


def gym_close_display() -> str:
    t = getattr(settings, "GYM_CLOSE_TIME", None) or f"{settings.GYM_CLOSE_HOUR:02d}:00:00"
    parts = t.split(":")
    return f"{int(parts[0]):02d}:{int(parts[1]):02d}"


def bloques_gym() -> list[tuple[str, str]]:
    """Bloques de 1 hora entre apertura y cierre (usa HH:MM:SS de configuración)."""
    bloques = []
    open_t = getattr(settings, "GYM_OPEN_TIME", None) or f"{settings.GYM_OPEN_HOUR:02d}:00:00"
    close_t = getattr(settings, "GYM_CLOSE_TIME", None) or f"{settings.GYM_CLOSE_HOUR:02d}:00:00"
    inicio = _gym_time_to_minutes(open_t)
    fin = _gym_time_to_minutes(close_t)
    # alinear al siguiente bloque :00 si apertura no cae en hora en punto
    if inicio % 60 != 0:
        inicio = inicio - (inicio % 60) + 60
    while inicio + 60 <= fin:
        bloques.append((minutos_a_hora(inicio), minutos_a_hora(inicio + 60)))
        inicio += 60
    return bloques


def turnos_coach_maquinas() -> list[dict]:
    """Dos turnos fijos: mañana y tarde (entrada/salida del coach)."""
    hi_manana = gym_open_display()
    hf_manana = f"{settings.GYM_AFTERNOON_START_HOUR:02d}:00"
    hi_tarde = hf_manana
    hf_tarde = gym_close_display()
    return [
        {
            "id": "manana",
            "nombre": "Mañana",
            "hora_inicio": hi_manana,
            "hora_fin": hf_manana,
        },
        {
            "id": "tarde",
            "nombre": "Tarde",
            "hora_inicio": hi_tarde,
            "hora_fin": hf_tarde,
        },
    ]


def resolver_turno_coach(turno: str) -> tuple[str, str, bool]:
    """Convierte 'manana'|'tarde' a hora_inicio, hora_fin y si es turno mañana."""
    t = turno.strip().lower()
    for item in turnos_coach_maquinas():
        if item["id"] == t:
            return item["hora_inicio"], item["hora_fin"], t == "manana"
    raise HTTPException(
        status_code=400,
        detail="Turno inválido. Use 'manana' o 'tarde'",
    )


def es_turno_manana(hora_inicio: str) -> bool:
    return hora_a_minutos(normalizar_hora(hora_inicio)) < settings.GYM_AFTERNOON_START_HOUR * 60


def es_asignacion_turno_completo(asig: AsignacionInstructor) -> bool:
    """Coach en sala máquinas con turno completo (mañana o tarde), no bloque suelto."""
    if asig.tipo != "coach_maquinas":
        return False
    duracion = hora_a_minutos(asig.hora_fin) - hora_a_minutos(asig.hora_inicio)
    return duracion >= (settings.GYM_AFTERNOON_START_HOUR - settings.GYM_OPEN_HOUR) * 60


def hora_en_turno(hora: str, es_manana: bool) -> bool:
    m = hora_a_minutos(normalizar_hora(hora))
    if es_manana:
        return settings.GYM_OPEN_HOUR * 60 <= m < settings.GYM_AFTERNOON_START_HOUR * 60
    return settings.GYM_AFTERNOON_START_HOUR * 60 <= m < settings.GYM_CLOSE_HOUR * 60


def parse_dias_semana(value: Optional[str]) -> list[str]:
    """Parsea 'lunes,miercoles' o un solo día."""
    if not value or not value.strip():
        return []
    dias: list[str] = []
    for part in value.replace(";", ",").split(","):
        d = part.strip().lower()
        if not d:
            continue
        if d not in DIAS_SEMANA:
            raise HTTPException(status_code=400, detail=f"Día de semana inválido: {d}")
        if d in ("sabado", "domingo"):
            raise HTTPException(
                status_code=400,
                detail="Sábado y domingo no hay atención en el gimnasio (solo lunes a viernes)",
            )
        if d not in dias:
            dias.append(d)
    return dias


def serializar_dias(dias: list[str]) -> str:
    orden = {d: i for i, d in enumerate(DIAS_ACTIVIDAD)}
    unicos = []
    for d in dias:
        dl = d.lower()
        if dl in DIAS_ACTIVIDAD and dl not in unicos:
            unicos.append(dl)
    return ",".join(sorted(unicos, key=lambda x: orden[x]))


def actividad_incluye_dia(act: Actividad, dia: str) -> bool:
    return dia.lower() in parse_dias_semana(act.dia_semana)


def formatear_dias(value: Optional[str]) -> str:
    dias = parse_dias_semana(value)
    if not dias:
        return ""
    return ", ".join(d.capitalize() for d in dias)


def dia_semana_de_fecha(fecha: date) -> str:
    return DIAS_MAP[fecha.weekday()]


def calcular_hora_fin(hora_inicio: str) -> str:
    inicio = hora_a_minutos(normalizar_hora(hora_inicio))
    return minutos_a_hora(inicio + 60)


def validar_bloque_una_hora(hora_inicio: str, hora_fin: Optional[str]) -> tuple[str, str]:
    hi = normalizar_hora(hora_inicio)
    hf = normalizar_hora(hora_fin) if hora_fin else calcular_hora_fin(hi)
    if hora_a_minutos(hf) - hora_a_minutos(hi) != 60:
        raise HTTPException(status_code=400, detail="Las actividades deben durar exactamente 1 hora")
    validar_horario_gym(hi, hf)
    return hi, hf


def validar_horario_gym(hora_inicio: str, hora_fin: str) -> None:
    open_t = getattr(settings, "GYM_OPEN_TIME", None) or f"{settings.GYM_OPEN_HOUR:02d}:00:00"
    close_t = getattr(settings, "GYM_CLOSE_TIME", None) or f"{settings.GYM_CLOSE_HOUR:02d}:00:00"
    apertura = _gym_time_to_minutes(open_t)
    cierre = _gym_time_to_minutes(close_t)
    hi = hora_a_minutos(normalizar_hora(hora_inicio))
    hf = hora_a_minutos(normalizar_hora(hora_fin))
    if hi < apertura or hf > cierre:
        raise HTTPException(
            status_code=400,
            detail=f"El gimnasio opera de {gym_open_display()} a {gym_close_display()}",
        )


async def obtener_sala(db: AsyncSession, sala_id: int, tipo_esperado: Optional[str] = None) -> Sala:
    sala = await db.get(Sala, sala_id)
    if not sala or not sala.activa:
        raise HTTPException(status_code=404, detail="Sala no encontrada o inactiva")
    if tipo_esperado and sala.tipo != tipo_esperado:
        raise HTTPException(status_code=400, detail=f"La sala debe ser de tipo '{tipo_esperado}'")
    return sala


async def sala_ocupada_actividad(
    db: AsyncSession,
    sala_id: int,
    dia_semana: str,
    hora_inicio: str,
    vigencia_inicio: date,
    vigencia_fin: date,
    exclude_actividad_id: Optional[int] = None,
) -> Optional[Actividad]:
    from app.services.periodo_service import vigencias_se_solapan

    hi = normalizar_hora(hora_inicio)
    query = select(Actividad).where(
        Actividad.sala_id == sala_id,
        Actividad.hora_inicio == hi,
    )
    if exclude_actividad_id:
        query = query.where(Actividad.id != exclude_actividad_id)
    result = await db.execute(query)
    for act in result.scalars().all():
        if not actividad_incluye_dia(act, dia_semana):
            continue
        if not act.vigencia_inicio or not act.vigencia_fin:
            return act
        if vigencias_se_solapan(vigencia_inicio, vigencia_fin, act.vigencia_inicio, act.vigencia_fin):
            return act
    return None


async def instructor_ocupado_actividad(
    db: AsyncSession,
    instructor_id: int,
    dia_semana: str,
    hora_inicio: str,
    vigencia_inicio: date,
    vigencia_fin: date,
    exclude_actividad_id: Optional[int] = None,
) -> Optional[Actividad]:
    from app.services.periodo_service import vigencias_se_solapan

    hi = normalizar_hora(hora_inicio)
    query = select(Actividad).where(
        Actividad.instructor_id == instructor_id,
        Actividad.hora_inicio == hi,
    )
    if exclude_actividad_id:
        query = query.where(Actividad.id != exclude_actividad_id)
    result = await db.execute(query)
    for act in result.scalars().all():
        if not actividad_incluye_dia(act, dia_semana):
            continue
        if not act.vigencia_inicio or not act.vigencia_fin:
            return act
        if vigencias_se_solapan(vigencia_inicio, vigencia_fin, act.vigencia_inicio, act.vigencia_fin):
            return act
    return None


async def instructor_ocupado_asignacion(
    db: AsyncSession,
    instructor_id: int,
    fecha: date,
    hora_inicio: str,
    exclude_asignacion_id: Optional[int] = None,
) -> Optional[AsignacionInstructor]:
    hi = normalizar_hora(hora_inicio)
    minutos = hora_a_minutos(hi)
    query = select(AsignacionInstructor).where(
        AsignacionInstructor.instructor_id == instructor_id,
        AsignacionInstructor.fecha == fecha,
    )
    if exclude_asignacion_id:
        query = query.where(AsignacionInstructor.id != exclude_asignacion_id)
    result = await db.execute(query)
    for asig in result.scalars().all():
        if asig.tipo == "coach_maquinas" and es_asignacion_turno_completo(asig):
            ini = hora_a_minutos(asig.hora_inicio)
            fin = hora_a_minutos(asig.hora_fin)
            if ini <= minutos < fin:
                return asig
        elif asig.hora_inicio == hi:
            return asig
    return None


async def instructor_tiene_actividad_en_turno(
    db: AsyncSession,
    instructor_id: int,
    es_manana: bool,
    vigencia_inicio: date,
    vigencia_fin: date,
) -> Optional[Actividad]:
    from app.services.periodo_service import vigencias_se_solapan

    result = await db.execute(select(Actividad).where(Actividad.instructor_id == instructor_id))
    for act in result.scalars().all():
        if not act.hora_inicio:
            continue
        if not act.vigencia_inicio or not act.vigencia_fin:
            if hora_en_turno(act.hora_inicio, es_manana):
                return act
            continue
        if not vigencias_se_solapan(vigencia_inicio, vigencia_fin, act.vigencia_inicio, act.vigencia_fin):
            continue
        if hora_en_turno(act.hora_inicio, es_manana):
            return act
    return None


async def contar_coaches_turno(
    db: AsyncSession,
    sala_id: int,
    vigencia_inicio: date,
    vigencia_fin: date,
    es_manana: bool,
    exclude_asignacion_id: Optional[int] = None,
) -> int:
    from app.services.periodo_service import vigencias_se_solapan

    result = await db.execute(
        select(AsignacionInstructor).where(
            AsignacionInstructor.sala_id == sala_id,
            AsignacionInstructor.tipo == "coach_maquinas",
        )
    )
    count = 0
    for asig in result.scalars().all():
        if exclude_asignacion_id and asig.id == exclude_asignacion_id:
            continue
        if not es_asignacion_turno_completo(asig) or es_turno_manana(asig.hora_inicio) != es_manana:
            continue
        if not asig.vigencia_inicio or not asig.vigencia_fin:
            continue
        if vigencias_se_solapan(vigencia_inicio, vigencia_fin, asig.vigencia_inicio, asig.vigencia_fin):
            count += 1
    return count


async def coach_ya_asignado_en_turno(
    db: AsyncSession,
    instructor_id: int,
    vigencia_inicio: date,
    vigencia_fin: date,
    es_manana: bool,
    exclude_asignacion_id: Optional[int] = None,
) -> Optional[AsignacionInstructor]:
    from app.services.periodo_service import vigencias_se_solapan

    result = await db.execute(
        select(AsignacionInstructor).where(
            AsignacionInstructor.instructor_id == instructor_id,
            AsignacionInstructor.tipo == "coach_maquinas",
        )
    )
    for asig in result.scalars().all():
        if exclude_asignacion_id and asig.id == exclude_asignacion_id:
            continue
        if not es_asignacion_turno_completo(asig) or es_turno_manana(asig.hora_inicio) != es_manana:
            continue
        if not asig.vigencia_inicio or not asig.vigencia_fin:
            continue
        if vigencias_se_solapan(vigencia_inicio, vigencia_fin, asig.vigencia_inicio, asig.vigencia_fin):
            return asig
    return None


async def instructor_ocupado_en_fecha(
    db: AsyncSession,
    instructor_id: int,
    fecha: date,
    hora_inicio: str,
    exclude_asignacion_id: Optional[int] = None,
) -> Optional[str]:
    """Retorna motivo si el instructor está ocupado en esa fecha/hora."""
    dia = dia_semana_de_fecha(fecha)
    hi = normalizar_hora(hora_inicio)

    act = await instructor_ocupado_actividad(db, instructor_id, dia, hi, fecha, fecha, exclude_asignacion_id)
    if act:
        return f"Tiene la actividad '{act.nombre}' en ese horario"

    asig = await instructor_ocupado_asignacion(db, instructor_id, fecha, hi, exclude_asignacion_id)
    if asig:
        tipo = "coach en máquinas" if asig.tipo == "coach_maquinas" else "asignación"
        return f"Está asignado como {tipo} en ese horario"

    return None


async def validar_actividad_horario(
    db: AsyncSession,
    *,
    sala_id: Optional[int],
    instructor_id: Optional[int],
    dia_semana: Optional[str],
    hora_inicio: Optional[str],
    hora_fin: Optional[str],
    capacidad: int,
    vigencia_tipo: Optional[str] = "mes",
    vigencia_inicio: Optional[date] = None,
    exclude_actividad_id: Optional[int] = None,
) -> tuple[str, str, str, str, date, date]:
    from app.services.periodo_service import normalizar_vigencia

    if not dia_semana or not str(dia_semana).strip() or not hora_inicio:
        raise HTTPException(status_code=400, detail="Selecciona al menos un día y la hora de inicio")
    if not sala_id:
        raise HTTPException(status_code=400, detail="Debe seleccionar una sala de actividades")
    if not instructor_id:
        raise HTTPException(status_code=400, detail="Debe asignar un entrenador a la actividad")

    v_tipo, v_ini, v_fin = normalizar_vigencia(vigencia_tipo, vigencia_inicio)
    dias = parse_dias_semana(str(dia_semana))
    if not dias:
        raise HTTPException(status_code=400, detail="Selecciona al menos un día de la semana")

    hi, hf = validar_bloque_una_hora(hora_inicio, None)
    sala = await obtener_sala(db, sala_id, "actividad")

    cap_max = min(sala.capacidad, settings.CAPACIDAD_SALA_ACTIVIDAD)
    if capacidad > cap_max:
        raise HTTPException(status_code=400, detail=f"Capacidad máxima para esta sala: {cap_max}")

    inst = await db.get(Instructor, instructor_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")

    for dia in dias:
        conflicto = await sala_ocupada_actividad(
            db, sala_id, dia, hi, v_ini, v_fin, exclude_actividad_id
        )
        if conflicto:
            raise HTTPException(
                status_code=409,
                detail=f"La sala ya está ocupada el {dia.capitalize()} por '{conflicto.nombre}' en ese periodo",
            )
        act_inst = await instructor_ocupado_actividad(
            db, instructor_id, dia, hi, v_ini, v_fin, exclude_actividad_id
        )
        if act_inst:
            raise HTTPException(
                status_code=409,
                detail=f"El entrenador ya tiene '{act_inst.nombre}' el {dia.capitalize()} a esa hora en ese periodo",
            )

    return hi, hf, serializar_dias(dias), v_tipo, v_ini, v_fin


async def validar_asignacion_coach(
    db: AsyncSession,
    *,
    instructor_id: int,
    sala_id: int,
    turno: str,
    vigencia_tipo: Optional[str] = "mes",
    vigencia_inicio: Optional[date] = None,
    exclude_asignacion_id: Optional[int] = None,
) -> tuple[str, str, str, str, date, date]:
    from app.services.periodo_service import normalizar_vigencia

    hi, hf, es_manana = resolver_turno_coach(turno)
    v_tipo, v_ini, v_fin = normalizar_vigencia(vigencia_tipo, vigencia_inicio)
    validar_horario_gym(hi, hf)
    await obtener_sala(db, sala_id, "maquinas")

    inst = await db.get(Instructor, instructor_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")

    max_coaches = settings.MIN_COACHES_MANANA if es_manana else settings.MIN_COACHES_TARDE
    count = await contar_coaches_turno(db, sala_id, v_ini, v_fin, es_manana, exclude_asignacion_id)
    if count >= max_coaches:
        nombre_turno = "mañana" if es_manana else "tarde"
        raise HTTPException(
            status_code=409,
            detail=f"Ya hay {count} coaches en la {nombre_turno} en ese periodo (máximo {max_coaches})",
        )

    if await coach_ya_asignado_en_turno(
        db, instructor_id, v_ini, v_fin, es_manana, exclude_asignacion_id
    ):
        raise HTTPException(status_code=409, detail="El entrenador ya está asignado en ese turno y periodo")

    act = await instructor_tiene_actividad_en_turno(db, instructor_id, es_manana, v_ini, v_fin)
    if act:
        raise HTTPException(
            status_code=409,
            detail=f"Entrenador no disponible: tiene la actividad '{act.nombre}' en ese turno y periodo",
        )

    return hi, hf, turno.strip().lower(), v_tipo, v_ini, v_fin


async def validar_reserva_estudiante(
    db: AsyncSession,
    actividad: Actividad,
    fecha: date,
) -> None:
    from app.services.periodo_service import resolver_actividades_para_fecha

    todas = list((await db.execute(select(Actividad))).scalars().all())
    vigentes = resolver_actividades_para_fecha(todas, fecha)
    if actividad.id not in {a.id for a in vigentes}:
        raise HTTPException(
            status_code=400,
            detail="Esta actividad no está vigente en la fecha elegida",
        )
    if actividad.dia_semana:
        dia_reserva = dia_semana_de_fecha(fecha)
        dias_act = parse_dias_semana(actividad.dia_semana)
        if dia_reserva not in dias_act:
            raise HTTPException(
                status_code=400,
                detail=f"Esta actividad es los {formatear_dias(actividad.dia_semana)}, no coincide con la fecha elegida",
            )
    if actividad.hora_inicio and actividad.hora_fin:
        validar_horario_gym(actividad.hora_inicio, actividad.hora_fin)


async def resumen_staffing(db: AsyncSession, fecha: date) -> dict:
    """Cuenta coaches y entrenadores vigentes en la fecha (con herencia del periodo anterior)."""
    from app.models.sala import Sala
    from app.services.periodo_service import resolver_actividades_para_fecha, resolver_coaches_para_fecha

    sala_maq = (
        await db.execute(select(Sala).where(Sala.tipo == "maquinas", Sala.activa == True))  # noqa: E712
    ).scalar_one_or_none()

    todas_asignaciones = list(
        (await db.execute(select(AsignacionInstructor).where(AsignacionInstructor.tipo == "coach_maquinas")))
        .scalars()
        .all()
    )
    coaches = (
        resolver_coaches_para_fecha(todas_asignaciones, sala_maq.id, fecha)
        if sala_maq
        else []
    )

    coaches_manana = sum(1 for a in coaches if es_turno_manana(a.hora_inicio))
    coaches_tarde = sum(1 for a in coaches if not es_turno_manana(a.hora_inicio))

    dia = dia_semana_de_fecha(fecha)
    todas_actividades = list((await db.execute(select(Actividad))).scalars().all())
    actividades_vigentes = resolver_actividades_para_fecha(todas_actividades, fecha)
    actividades_dia = sum(1 for a in actividades_vigentes if actividad_incluye_dia(a, dia))
    instructores_ids = {
        a.instructor_id for a in actividades_vigentes if a.instructor_id and actividad_incluye_dia(a, dia)
    }
    instructores_actividad = len(instructores_ids)

    alertas = []
    if coaches_manana < settings.MIN_COACHES_MANANA:
        alertas.append(
            f"Faltan coaches en la mañana ({coaches_manana}/{settings.MIN_COACHES_MANANA})"
        )
    if coaches_tarde < settings.MIN_COACHES_TARDE:
        alertas.append(
            f"Faltan coaches en la tarde ({coaches_tarde}/{settings.MIN_COACHES_TARDE})"
        )
    if instructores_actividad < settings.MIN_ENTRENADORES_ACTIVIDAD:
        alertas.append(
            f"Pocos entrenadores en actividades ({instructores_actividad}/{settings.MIN_ENTRENADORES_ACTIVIDAD})"
        )

    return {
        "fecha": fecha.isoformat(),
        "coaches_manana": coaches_manana,
        "coaches_tarde": coaches_tarde,
        "coaches_manana_requeridos": settings.MIN_COACHES_MANANA,
        "coaches_tarde_requeridos": settings.MIN_COACHES_TARDE,
        "entrenadores_actividad": instructores_actividad,
        "entrenadores_actividad_requeridos": settings.MIN_ENTRENADORES_ACTIVIDAD,
        "actividades_programadas": actividades_dia,
        "alertas": alertas,
        "staffing_ok": len(alertas) == 0,
    }


async def disponibilidad_salas_fecha(
    db: AsyncSession,
    fecha: date,
    dia_semana: Optional[str] = None,
) -> list[dict]:
    from app.services.periodo_service import resolver_actividades_para_fecha, resolver_coaches_para_fecha

    dia = (dia_semana or dia_semana_de_fecha(fecha)).strip().lower()
    if dia not in DIAS_ACTIVIDAD and dia not in ("sabado", "domingo"):
        raise HTTPException(status_code=400, detail="Día de semana inválido")

    salas = (await db.execute(select(Sala).where(Sala.activa == True))).scalars().all()  # noqa: E712

    todas_actividades = list((await db.execute(select(Actividad))).scalars().all())
    actividades_vigentes = resolver_actividades_para_fecha(todas_actividades, fecha)
    actividades_dia = [a for a in actividades_vigentes if actividad_incluye_dia(a, dia)]

    sala_maq = next((s for s in salas if s.tipo == "maquinas"), None)
    todas_asignaciones = list(
        (await db.execute(select(AsignacionInstructor).where(AsignacionInstructor.tipo == "coach_maquinas")))
        .scalars()
        .all()
    )
    coaches_vigentes = (
        resolver_coaches_para_fecha(todas_asignaciones, sala_maq.id, fecha) if sala_maq else []
    )

    bloques = []
    for hi, hf in bloques_gym():
        for sala in salas:
            disponible = True
            motivo = None

            if sala.tipo == "actividad":
                if dia in ("sabado", "domingo"):
                    motivo = "Sin actividades (fin de semana)"
                else:
                    disponible, motivo, _ = _celda_actividad_sala(actividades_dia, sala.id, hi)
            else:
                ocupacion = sum(
                    1
                    for a in coaches_vigentes
                    if a.sala_id == sala.id and a.hora_inicio == hi
                )
                if ocupacion == 0:
                    motivo = "Sin coach asignado"

            bloques.append(
                {
                    "fecha": fecha.isoformat(),
                    "dia_semana": dia,
                    "hora_inicio": hi,
                    "hora_fin": hf,
                    "sala_id": sala.id,
                    "sala_nombre": sala.nombre,
                    "sala_tipo": sala.tipo,
                    "capacidad": sala.capacidad,
                    "disponible": disponible,
                    "motivo_ocupacion": motivo,
                }
            )
    return bloques


def _celda_actividad_sala(
    actividades_dia: list[Actividad],
    sala_id: int,
    hi: str,
) -> tuple[bool, Optional[str], Optional[str]]:
    for act in actividades_dia:
        if not act.sala_id or not act.hora_inicio:
            continue
        if act.sala_id == sala_id and normalizar_hora(act.hora_inicio) == hi:
            return False, f"Actividad: {act.nombre}", act.nombre
    return True, None, None


async def disponibilidad_salas_semanal(db: AsyncSession, referencia: Optional[date] = None) -> dict:
    """Grilla L-V × salas actividad × bloques horarios (horario recurrente vigente)."""
    from app.services.periodo_service import resolver_actividades_para_fecha

    ref = referencia or date.today()
    salas = [
        s
        for s in (await db.execute(select(Sala).where(Sala.activa == True))).scalars().all()  # noqa: E712
        if s.tipo == "actividad"
    ]
    salas.sort(key=lambda s: s.id)

    todas_actividades = list((await db.execute(select(Actividad))).scalars().all())
    actividades_vigentes = resolver_actividades_para_fecha(todas_actividades, ref)
    bloques = [hi for hi, _ in bloques_gym()]

    celdas: list[dict] = []
    for dia in DIAS_ACTIVIDAD:
        actividades_dia = [a for a in actividades_vigentes if actividad_incluye_dia(a, dia)]
        for hi, hf in bloques_gym():
            for sala in salas:
                disponible, motivo, actividad = _celda_actividad_sala(actividades_dia, sala.id, hi)
                celdas.append(
                    {
                        "dia_semana": dia,
                        "hora_inicio": hi,
                        "hora_fin": hf,
                        "sala_id": sala.id,
                        "sala_nombre": sala.nombre,
                        "disponible": disponible,
                        "motivo_ocupacion": motivo,
                        "actividad_nombre": actividad,
                    }
                )

    return {
        "referencia": ref.isoformat(),
        "dias": DIAS_ACTIVIDAD,
        "bloques": bloques,
        "salas": [
            {
                "id": s.id,
                "nombre": s.nombre,
                "etiqueta": f"Sala {i}",
            }
            for i, s in enumerate(salas, start=1)
        ],
        "celdas": celdas,
    }
