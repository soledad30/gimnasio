from __future__ import annotations

import re
from copy import deepcopy
from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maquina import Maquina

CHECKLIST_GENERAL = [
    {
        "titulo": "Limpieza e inspección diaria (ISO 55000)",
        "items": [
            {"id": "limpieza_superficies", "texto": "Limpieza y desinfección de superficies de contacto (asientos, agarres, tapetes)"},
            {"id": "retiro_objetos", "texto": "Retiro de restos, polvo u objetos en tapetes, bancos y sujetadores"},
            {"id": "inspeccion_visual", "texto": "Inspección visual de daños, cables sueltos o partes en deterioro"},
            {"id": "partes_usuario", "texto": "Revisión de partes donde se sujeta el usuario (sin rasgaduras ni desgaste crítico)"},
        ],
    },
    {
        "titulo": "Lubricación y ajustes periódicos",
        "items": [
            {"id": "lubricacion_partes", "texto": "Lubricación de partes móviles según manual del fabricante"},
            {"id": "nivel_lubricante", "texto": "Verificación del nivel de lubricante (equipos auto-lubricados)"},
            {"id": "ajuste_tornilleria", "texto": "Reposición y ajuste de tornillería y sujetadores"},
        ],
    },
]

CHECKLIST_CARDIO = [
    {
        "titulo": "Mantenimiento preventivo — cardio",
        "items": [
            {"id": "limpieza_general", "texto": "Limpieza general del equipo"},
            {"id": "limpieza_electronica", "texto": "Limpieza de tarjeta y partes electrónicas"},
            {"id": "revision_monitor", "texto": "Revisión del monitor y conexiones eléctricas"},
            {"id": "verificacion_sensores", "texto": "Verificación de sensores ópticos / electrónicos"},
            {"id": "revision_motor", "texto": "Revisión del motor principal y motor de elevación/inclinación"},
            {"id": "limpieza_banda", "texto": "Limpieza, ajuste y lubricación de banda o correa"},
            {"id": "medicion_corriente", "texto": "Medición de corriente (amperajes y voltajes)"},
            {"id": "inspeccion_pedales", "texto": "Inspección de pedales, cadena, rodamientos y freno (si aplica)"},
        ],
    },
    {
        "titulo": "Mantenimiento correctivo — señales de falla",
        "items": [
            {"id": "velocidad_anormal", "texto": "Sin cambios anormales en velocidad o resistencia"},
            {"id": "recalentamiento", "texto": "Sin recalentamiento de motor"},
            {"id": "desgaste_banda", "texto": "Sin ruptura ni desgaste crítico de banda/correa"},
            {"id": "apagado_inesperado", "texto": "Sin apagados inesperados del equipo"},
            {"id": "resbalon_banda", "texto": "Sin frenado o resbalón anormal de banda durante uso"},
            {"id": "fallas_tarjeta", "texto": "Sin fallas en tarjeta electrónica"},
        ],
    },
]

CHECKLIST_FUERZA = [
    {
        "titulo": "Mantenimiento preventivo — máquinas de fuerza",
        "items": [
            {"id": "guayas", "texto": "Sustitución o revisión de guayas/cables dañados"},
            {"id": "tornilleria", "texto": "Reposición y ajustes de tornillería"},
            {"id": "poleas_correas", "texto": "Reposición, ajuste y lubricación de poleas y correas"},
            {"id": "revision_poleas", "texto": "Revisión de poleas y chumaceras"},
            {"id": "barras_guias", "texto": "Revisión, limpieza y lubricación de barras guías"},
            {"id": "placas_peso", "texto": "Revisión de placas de peso y ajuste"},
            {"id": "estructura", "texto": "Inspección de soldaduras y estructura (sin fisuras ni deformaciones)"},
        ],
    },
]

CHECKLIST_FUNCIONAL = [
    {
        "titulo": "Mantenimiento preventivo — funcional / libre",
        "items": [
            {"id": "estructura_general", "texto": "Revisión de estructura, bases y anclajes"},
            {"id": "superficies", "texto": "Limpieza y desinfección de superficies de uso"},
            {"id": "elementos_moviles", "texto": "Revisión de elementos móviles, cadenas y rodamientos"},
            {"id": "accesorios", "texto": "Revisión de accesorios (discos, barras, cuerdas) sin desgaste crítico"},
        ],
    },
]

TIPOS_MANTENIMIENTO = [
    {"value": "preventivo", "label": "Preventivo"},
    {"value": "correctivo", "label": "Correctivo"},
    {"value": "predictivo", "label": "Predictivo"},
    {"value": "limpieza", "label": "Limpieza e inspección"},
    {"value": "lubricacion", "label": "Lubricación"},
]


def _prefix_from_nombre(nombre: str) -> str:
    letters = re.sub(r"[^A-Za-z]", "", nombre.upper())
    if len(letters) >= 3:
        return letters[:3]
    padded = (letters + "MAQ").upper()
    return padded[:3]


async def generar_codigo_maquina(db: AsyncSession, nombre: str) -> str:
    prefix = _prefix_from_nombre(nombre)
    result = await db.execute(select(Maquina.codigo).where(Maquina.codigo.like(f"{prefix}%")))
    max_num = 0
    for codigo in result.scalars().all():
        if not codigo or len(codigo) <= len(prefix):
            continue
        suffix = codigo[len(prefix) :]
        if suffix.isdigit():
            max_num = max(max_num, int(suffix))
    return f"{prefix}{max_num + 1:03d}"


def _categoria_key(categoria: Optional[str]) -> str:
    if not categoria:
        return "general"
    return categoria.strip().lower()


def plantilla_checklist(categoria: Optional[str]) -> list[dict]:
    cat = _categoria_key(categoria)
    secciones = deepcopy(CHECKLIST_GENERAL)
    if cat == "cardio":
        secciones.extend(deepcopy(CHECKLIST_CARDIO))
    elif cat == "fuerza":
        secciones.extend(deepcopy(CHECKLIST_FUERZA))
    elif cat in ("funcional", "libre"):
        secciones.extend(deepcopy(CHECKLIST_FUNCIONAL))
    else:
        secciones.extend(deepcopy(CHECKLIST_FUERZA[:1]))
    return secciones


def checklist_vacio(categoria: Optional[str]) -> list[dict]:
    plantilla = plantilla_checklist(categoria)
    result = []
    for seccion in plantilla:
        result.append(
            {
                "titulo": seccion["titulo"],
                "items": [
                    {"id": item["id"], "texto": item["texto"], "completado": False}
                    for item in seccion["items"]
                ],
            }
        )
    return result


def calcular_proximo_mantenimiento(fecha: date, tipo: str) -> Optional[date]:
    from datetime import timedelta

    if tipo == "limpieza":
        return fecha + timedelta(days=7)
    if tipo == "lubricacion":
        return fecha + timedelta(days=30)
    if tipo == "preventivo":
        return fecha + timedelta(days=90)
    if tipo == "correctivo":
        return None
    return fecha + timedelta(days=60)
