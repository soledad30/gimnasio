"""Evaluación predictiva de máquinas: calendario preventivo (6 meses) y vida útil."""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.maquina import Maquina
from app.models.mantenimiento_maquina import MantenimientoMaquina
from app.schemas.schemas import AlertasMantenimientoResumen, MaquinaEvaluacionResponse
from app.services.mantenimiento_maquina_service import (
    DIAS_AVISO_PREVENTIVO,
    DIAS_PREVENTIVO,
    UMBRAL_VIDA_EVALUACION,
    UMBRAL_VIDA_MAYOR,
    UMBRAL_VIDA_REEMPLAZO,
    calcular_proximo_mantenimiento,
    vida_util_default,
)


def _add_years(fecha: date, anios: int) -> date:
    try:
        return fecha.replace(year=fecha.year + anios)
    except ValueError:
        return fecha.replace(year=fecha.year + anios, day=28)


class MaquinaEvaluacionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ultimo_preventivo(self, maquina_id: int) -> MantenimientoMaquina | None:
        result = await self.db.execute(
            select(MantenimientoMaquina)
            .where(
                MantenimientoMaquina.maquina_id == maquina_id,
                MantenimientoMaquina.tipo.in_(("preventivo", "predictivo")),
            )
            .order_by(MantenimientoMaquina.fecha_realizado.desc(), MantenimientoMaquina.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    def _proximo_preventivo(
        self,
        maquina: Maquina,
        ultimo: MantenimientoMaquina | None,
        hoy: date,
    ) -> date | None:
        if ultimo and ultimo.proximo_mantenimiento:
            return ultimo.proximo_mantenimiento
        if ultimo:
            return calcular_proximo_mantenimiento(
                ultimo.fecha_realizado, "preventivo", maquina.categoria
            )
        if maquina.fecha_adquisicion:
            return calcular_proximo_mantenimiento(
                maquina.fecha_adquisicion, "preventivo", maquina.categoria
            )
        return hoy + timedelta(days=DIAS_PREVENTIVO)

    def _estado_preventivo(self, proximo: date | None, hoy: date) -> tuple[str, int | None]:
        if proximo is None:
            return "sin_datos", None
        dias = (proximo - hoy).days
        if dias < 0:
            return "vencido", dias
        if dias <= DIAS_AVISO_PREVENTIVO:
            return "proximo", dias
        return "al_dia", dias

    def _evaluar_vida_util(
        self, maquina: Maquina, hoy: date
    ) -> tuple[str, float | None, float | None, date | None, int]:
        anios_vida = maquina.anios_vida_util or vida_util_default(maquina.categoria)
        if not maquina.fecha_adquisicion:
            return "sin_datos", None, None, None, anios_vida

        edad_dias = (hoy - maquina.fecha_adquisicion).days
        edad_anios = round(edad_dias / 365.25, 1)
        pct = round(edad_anios / anios_vida * 100, 1) if anios_vida > 0 else None
        fecha_fin = _add_years(maquina.fecha_adquisicion, anios_vida)

        if pct is None:
            estado = "sin_datos"
        elif pct >= UMBRAL_VIDA_REEMPLAZO:
            estado = "reemplazo"
        elif pct >= UMBRAL_VIDA_MAYOR:
            estado = "mantenimiento_mayor"
        elif pct >= UMBRAL_VIDA_EVALUACION:
            estado = "evaluacion"
        else:
            estado = "normal"

        return estado, edad_anios, pct, fecha_fin, anios_vida

    def _sugerencia(
        self,
        *,
        nombre: str,
        codigo: str | None,
        estado_preventivo: str,
        dias_preventivo: int | None,
        proximo_preventivo: date | None,
        estado_vida: str,
        pct_vida: float | None,
        anios_vida: int,
    ) -> str:
        ref = codigo or nombre
        partes: list[str] = []

        if estado_vida == "reemplazo":
            partes.append(
                f"{ref}: superó el 100% de vida útil ({pct_vida}%). Se recomienda planificar reemplazo."
            )
        elif estado_vida == "mantenimiento_mayor":
            partes.append(
                f"{ref}: {pct_vida}% de vida útil ({anios_vida} años estimados). "
                "Evaluar cambio de bandas, cables, poleas o motor."
            )
        elif estado_vida == "evaluacion":
            partes.append(
                f"{ref}: {pct_vida}% de vida útil. Programar evaluación técnica y presupuesto."
            )

        if estado_preventivo == "vencido":
            partes.append(
                f"Mantenimiento preventivo vencido"
                + (f" desde hace {abs(dias_preventivo or 0)} día(s)" if dias_preventivo is not None else "")
                + "."
            )
        elif estado_preventivo == "proximo" and proximo_preventivo:
            partes.append(
                f"Próximo preventivo el {proximo_preventivo} ({dias_preventivo} día(s))."
            )
        elif estado_preventivo == "al_dia" and proximo_preventivo and not partes:
            partes.append(f"Preventivo al día. Próxima revisión: {proximo_preventivo}.")

        if not partes:
            return f"{ref}: operación normal. Mantener calendario preventivo cada 6 meses."
        return " ".join(partes)

    def _prioridad(
        self, estado_preventivo: str, estado_vida: str, dias_preventivo: int | None
    ) -> int:
        if estado_vida == "reemplazo":
            return 100
        if estado_preventivo == "vencido":
            return 90
        if estado_vida == "mantenimiento_mayor":
            return 80
        if estado_preventivo == "proximo":
            return 70
        if estado_vida == "evaluacion":
            return 60
        return 10

    async def evaluar_maquina(self, maquina: Maquina, hoy: date | None = None) -> MaquinaEvaluacionResponse:
        hoy = hoy or date.today()
        ultimo = await self._ultimo_preventivo(maquina.id)
        proximo = self._proximo_preventivo(maquina, ultimo, hoy)
        estado_prev, dias_prev = self._estado_preventivo(proximo, hoy)
        estado_vida, edad_anios, pct_vida, fecha_fin, anios_vida = self._evaluar_vida_util(maquina, hoy)

        sugerencia = self._sugerencia(
            nombre=maquina.nombre,
            codigo=maquina.codigo,
            estado_preventivo=estado_prev,
            dias_preventivo=dias_prev,
            proximo_preventivo=proximo,
            estado_vida=estado_vida,
            pct_vida=pct_vida,
            anios_vida=anios_vida,
        )
        prioridad = self._prioridad(estado_prev, estado_vida, dias_prev)

        return MaquinaEvaluacionResponse(
            maquina_id=maquina.id,
            codigo=maquina.codigo,
            nombre=maquina.nombre,
            categoria=maquina.categoria,
            estado_maquina=maquina.estado_maquina,
            proximo_preventivo=proximo,
            dias_hasta_preventivo=dias_prev,
            estado_preventivo=estado_prev,
            ultimo_preventivo=ultimo.fecha_realizado if ultimo else None,
            anios_vida_util=anios_vida,
            edad_anios=edad_anios,
            porcentaje_vida_util=pct_vida,
            fecha_fin_vida_util=fecha_fin,
            estado_vida_util=estado_vida,
            sugerencia=sugerencia,
            prioridad=prioridad,
        )

    async def evaluar_todas(self) -> list[MaquinaEvaluacionResponse]:
        result = await self.db.execute(select(Maquina).order_by(Maquina.nombre))
        maquinas = list(result.scalars().all())
        evaluaciones = [await self.evaluar_maquina(m) for m in maquinas]
        evaluaciones.sort(key=lambda e: (-e.prioridad, e.dias_hasta_preventivo or 9999))
        return evaluaciones

    async def resumen_alertas(self) -> AlertasMantenimientoResumen:
        evaluaciones = await self.evaluar_todas()
        return AlertasMantenimientoResumen(
            total_maquinas=len(evaluaciones),
            preventivo_vencido=sum(1 for e in evaluaciones if e.estado_preventivo == "vencido"),
            preventivo_proximo=sum(1 for e in evaluaciones if e.estado_preventivo == "proximo"),
            vida_util_evaluacion=sum(
                1 for e in evaluaciones if e.estado_vida_util in ("evaluacion", "mantenimiento_mayor")
            ),
            vida_util_reemplazo=sum(1 for e in evaluaciones if e.estado_vida_util == "reemplazo"),
            maquinas=evaluaciones,
        )
