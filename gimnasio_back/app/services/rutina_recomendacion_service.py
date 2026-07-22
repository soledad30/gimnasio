"""Recomendaciones de rutina según historial de accesos, asistencias y progreso registrado."""
from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.acceso import Acceso
from app.models.asistencia import Asistencia
from app.models.progreso_ejercicio import ProgresoEjercicio
from app.models.rutina import Rutina
from app.schemas.schemas import (
    AjusteEjercicioRecomendado,
    RendimientoResumen,
    RutinaRecomendacionResponse,
)
from app.services.rutina_service import build_rutina_response, list_plantillas, list_rutinas_by_estudiante


def _parse_target_reps(reps: Optional[str]) -> int:
    if not reps:
        return 10
    nums = [int(x) for x in re.findall(r"\d+", reps)]
    return max(nums) if nums else 10


def _avg_logged_reps(reps_str: Optional[str]) -> Optional[float]:
    if not reps_str:
        return None
    nums = [int(x) for x in re.findall(r"\d+", reps_str)]
    return sum(nums) / len(nums) if nums else None


def _bump_reps(reps: Optional[str]) -> str:
    if not reps:
        return "12"
    nums = re.findall(r"\d+", reps)
    if not nums:
        return reps
    bumped = [str(int(n) + 2) for n in nums]
    if "-" in reps:
        return f"{bumped[0]}-{bumped[-1]}"
    return bumped[0]


class RutinaRecomendacionService:
    DIAS_ANALISIS = 28

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _count_accesos(self, estudiante_id: int, desde: date) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Acceso)
            .where(
                Acceso.estudiante_id == estudiante_id,
                Acceso.acceso_concedido.is_(True),
                Acceso.fecha >= desde.isoformat(),
            )
        )
        return int(result.scalar_one() or 0)

    async def _count_asistencias(self, estudiante_id: int, desde: date) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Asistencia)
            .where(
                Asistencia.estudiante_id == estudiante_id,
                Asistencia.fecha >= desde,
            )
        )
        return int(result.scalar_one() or 0)

    async def _count_progreso(self, estudiante_id: int, desde: date) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(ProgresoEjercicio)
            .where(
                ProgresoEjercicio.estudiante_id == estudiante_id,
                ProgresoEjercicio.fecha >= desde,
            )
        )
        return int(result.scalar_one() or 0)

    def _nivel_actividad(self, accesos: int) -> str:
        if accesos < 4:
            return "bajo"
        if accesos < 12:
            return "moderado"
        return "alto"

    async def _progreso_por_ejercicio(
        self, estudiante_id: int, ejercicio_id: int, limit: int = 5
    ) -> list[ProgresoEjercicio]:
        result = await self.db.execute(
            select(ProgresoEjercicio)
            .where(
                ProgresoEjercicio.estudiante_id == estudiante_id,
                ProgresoEjercicio.ejercicio_id == ejercicio_id,
            )
            .order_by(ProgresoEjercicio.fecha.desc(), ProgresoEjercicio.id.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    def _calcular_cumplimiento(
        self,
        registros: list[ProgresoEjercicio],
        series_presc: Optional[int],
        reps_presc: Optional[str],
    ) -> Optional[float]:
        if not registros or not series_presc:
            return None
        target_reps = _parse_target_reps(reps_presc)
        scores: list[float] = []
        for reg in registros:
            if reg.series_completadas is None:
                continue
            series_ratio = min(reg.series_completadas / series_presc, 1.0)
            avg_reps = _avg_logged_reps(reg.repeticiones_logradas)
            reps_ratio = min(avg_reps / target_reps, 1.0) if avg_reps else 0.7
            scores.append((series_ratio + reps_ratio) / 2 * 100)
        return round(sum(scores) / len(scores), 1) if scores else None

    def _sugerir_ajuste(
        self,
        *,
        nombre: str,
        ejercicio_id: int,
        series_actual: Optional[int],
        reps_actual: Optional[str],
        registros: list[ProgresoEjercicio],
        nivel_actividad: str,
        cumplimiento: Optional[float],
        ultimo_peso: Optional[float],
    ) -> AjusteEjercicioRecomendado:
        series_sug = series_actual
        reps_sug = reps_actual
        peso_sug = ultimo_peso
        accion = "mantener"
        motivo = "Continúa con la carga actual."

        if not registros:
            if nivel_actividad == "bajo":
                motivo = (
                    "Poca frecuencia de visitas al gimnasio. Mantén la rutina actual "
                    "y registra tu progreso para ajustes personalizados."
                )
            else:
                motivo = (
                    "Aún no hay registros de este ejercicio. Anota series y repeticiones "
                    "después de entrenar para recibir recomendaciones más precisas."
                )
            return AjusteEjercicioRecomendado(
                ejercicio_id=ejercicio_id,
                nombre=nombre,
                series_actual=series_actual,
                repeticiones_actual=reps_actual,
                series_sugerida=series_sug,
                repeticiones_sugerida=reps_sug,
                peso_sugerido_kg=peso_sug,
                accion=accion,
                motivo=motivo,
            )

        if cumplimiento is not None and cumplimiento >= 85 and nivel_actividad in ("moderado", "alto"):
            accion = "intensificar"
            if series_actual:
                series_sug = min(series_actual + 1, 6)
            reps_sug = _bump_reps(reps_actual)
            if ultimo_peso:
                peso_sug = round(ultimo_peso * 1.05, 1)
            motivo = (
                f"Cumplimiento alto ({cumplimiento}%) y buena asistencia. "
                "Se sugiere aumentar ligeramente la intensidad."
            )
        elif cumplimiento is not None and cumplimiento < 60:
            accion = "reducir"
            if series_actual and series_actual > 2:
                series_sug = max(series_actual - 1, 2)
            motivo = (
                f"Cumplimiento bajo ({cumplimiento}%). "
                "Reduce la carga para evitar lesiones y mejorar la técnica."
            )
        elif nivel_actividad == "bajo":
            accion = "mantener"
            motivo = (
                "Baja frecuencia de entrenamiento en el último mes. "
                "Prioriza la constancia antes de subir intensidad."
            )
        else:
            motivo = f"Rendimiento estable ({cumplimiento or '—'}%). Mantén el plan actual."

        return AjusteEjercicioRecomendado(
            ejercicio_id=ejercicio_id,
            nombre=nombre,
            series_actual=series_actual,
            repeticiones_actual=reps_actual,
            series_sugerida=series_sug,
            repeticiones_sugerida=reps_sug,
            peso_sugerido_kg=peso_sug,
            accion=accion,
            motivo=motivo,
        )

    async def generar_recomendaciones(self, estudiante_id: int) -> RutinaRecomendacionResponse:
        hoy = date.today()
        desde = hoy - timedelta(days=self.DIAS_ANALISIS)

        accesos = await self._count_accesos(estudiante_id, desde)
        asistencias = await self._count_asistencias(estudiante_id, desde)
        registros_total = await self._count_progreso(estudiante_id, desde)
        nivel = self._nivel_actividad(accesos)

        rutinas = await list_rutinas_by_estudiante(self.db, estudiante_id)
        rutina_principal = rutinas[0] if rutinas else None

        ajustes: list[AjusteEjercicioRecomendado] = []
        cumplimientos: list[float] = []

        if rutina_principal:
            for ej in rutina_principal.ejercicios_assoc:
                ejercicio = ej.ejercicio
                registros = await self._progreso_por_ejercicio(estudiante_id, ej.ejercicio_id)
                cumpl = self._calcular_cumplimiento(registros, ej.series, ej.repeticiones)
                if cumpl is not None:
                    cumplimientos.append(cumpl)
                ultimo_peso = next((r.peso_kg for r in registros if r.peso_kg), None)
                ajustes.append(
                    self._sugerir_ajuste(
                        nombre=ejercicio.nombre,
                        ejercicio_id=ej.ejercicio_id,
                        series_actual=ej.series,
                        reps_actual=ej.repeticiones,
                        registros=registros,
                        nivel_actividad=nivel,
                        cumplimiento=cumpl,
                        ultimo_peso=ultimo_peso,
                    )
                )

        cumplimiento_prom = round(sum(cumplimientos) / len(cumplimientos), 1) if cumplimientos else None

        plantillas_sugeridas = []
        if not rutina_principal:
            objetivo_map = {"bajo": "flexibilidad", "moderado": "general", "alto": "hipertrofia"}
            objetivo = objetivo_map.get(nivel, "general")
            todas = await list_plantillas(self.db, limit=50)
            matching = [r for r in todas if r.objetivo == objetivo]
            candidatas = matching[:3] if matching else todas[:3]
            plantillas_sugeridas = [build_rutina_response(r) for r in candidatas]

        if not rutina_principal and plantillas_sugeridas:
            mensaje = (
                f"Según tu actividad reciente ({accesos} visitas en {self.DIAS_ANALISIS} días), "
                f"te sugerimos rutinas orientadas a {objetivo.replace('_', ' ')}. "
                "Consulta con un instructor para asignarte un plan."
            )
        elif nivel == "bajo":
            mensaje = (
                "Tu frecuencia de entrenamiento es baja. Enfócate en asistir al menos "
                "2–3 veces por semana antes de intensificar la rutina."
            )
        elif any(a.accion == "intensificar" for a in ajustes):
            mensaje = "¡Buen progreso! Varias recomendaciones sugieren aumentar la intensidad de forma gradual."
        else:
            mensaje = "Revisa los ajustes sugeridos por ejercicio según tu historial reciente."

        return RutinaRecomendacionResponse(
            estudiante_id=estudiante_id,
            rutina_id=rutina_principal.id if rutina_principal else None,
            rutina_nombre=rutina_principal.nombre if rutina_principal else None,
            resumen=RendimientoResumen(
                dias_analizados=self.DIAS_ANALISIS,
                accesos_ultimo_periodo=accesos,
                asistencias_ultimo_periodo=asistencias,
                registros_progreso=registros_total,
                nivel_actividad=nivel,
                cumplimiento_promedio=cumplimiento_prom,
            ),
            ajustes=ajustes,
            plantillas_sugeridas=plantillas_sugeridas,
            mensaje_general=mensaje,
        )
