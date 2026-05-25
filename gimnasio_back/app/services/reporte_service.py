from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.acceso import Acceso
from app.models.estudiante import Estudiante
from app.models.membresia import Membresia


class ReporteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def dashboard(self) -> Dict[str, Any]:
        hoy = date.today()

        total_estudiantes = await self.db.scalar(select(func.count(Estudiante.id)))

        # Estudiantes con membresía vigente hoy
        activos = await self.db.scalar(
            select(func.count(Estudiante.id)).where(
                and_(
                    Estudiante.fechainicio_membresia <= hoy,
                    Estudiante.fechafin_membresia >= hoy,
                )
            )
        )

        # Accesos concedidos hoy
        inicio_dia = datetime.combine(hoy, datetime.min.time()).replace(tzinfo=timezone.utc)
        accesos_hoy = await self.db.scalar(
            select(func.count(Acceso.id)).where(
                and_(Acceso.acceso_concedido == True, Acceso.created_at >= inicio_dia)
            )
        )

        # Membresías por vencer en 7 días
        por_vencer = await self.db.scalar(
            select(func.count(Estudiante.id)).where(
                and_(
                    Estudiante.fechafin_membresia >= hoy,
                    Estudiante.fechafin_membresia <= hoy + timedelta(days=7),
                )
            )
        )

        return {
            "total_estudiantes": total_estudiantes or 0,
            "estudiantes_activos": activos or 0,
            "accesos_hoy": accesos_hoy or 0,
            "membresias_por_vencer": por_vencer or 0,
            "fecha": hoy.isoformat(),
        }

    async def reporte_accesos(self, fecha_inicio: date, fecha_fin: date) -> Dict[str, Any]:
        result = await self.db.execute(
            select(Acceso).where(
                and_(
                    func.date(Acceso.created_at) >= fecha_inicio,
                    func.date(Acceso.created_at) <= fecha_fin,
                )
            )
        )
        registros = result.scalars().all()
        total = len(registros)
        concedidos = sum(1 for r in registros if r.acceso_concedido)
        denegados = total - concedidos

        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "total_escaneos": total,
            "accesos_concedidos": concedidos,
            "accesos_denegados": denegados,
            "tasa_denegacion_pct": round((denegados / total * 100) if total else 0, 2),
        }
