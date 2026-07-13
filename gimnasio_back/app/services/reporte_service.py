import csv
import io
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.acceso import Acceso
from app.models.estudiante import Estudiante
from app.models.membresia import Membresia
from app.models.pago import Pago
from app.services.acceso_service import AccesoService


def csv_response(filename: str, headers: List[str], rows: List[List[Any]]) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    content = "\ufeff" + output.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class ReporteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def dashboard(self) -> Dict[str, Any]:
        hoy = date.today()
        total_estudiantes = await self.db.scalar(select(func.count(Estudiante.id)))
        activos = await self.db.scalar(
            select(func.count(Estudiante.id)).where(
                and_(
                    Estudiante.fechainicio_membresia <= hoy,
                    Estudiante.fechafin_membresia >= hoy,
                )
            )
        )
        inicio_dia = datetime.combine(hoy, datetime.min.time()).replace(tzinfo=timezone.utc)
        accesos_hoy = await self.db.scalar(
            select(func.count(Acceso.id)).where(
                and_(Acceso.acceso_concedido.is_(True), Acceso.created_at >= inicio_dia)
            )
        )
        por_vencer = await self.db.scalar(
            select(func.count(Estudiante.id)).where(
                and_(
                    Estudiante.fechafin_membresia >= hoy,
                    Estudiante.fechafin_membresia <= hoy + timedelta(days=7),
                )
            )
        )
        monitor = await AccesoService(self.db).get_monitor_stats()
        total_pagos_mes = await self.db.scalar(
            select(func.coalesce(func.sum(Pago.monto), 0)).where(
                func.date(Pago.fecha) >= hoy.replace(day=1)
            )
        )
        return {
            "total_estudiantes": total_estudiantes or 0,
            "estudiantes_activos": activos or 0,
            "accesos_hoy": accesos_hoy or 0,
            "membresias_por_vencer": por_vencer or 0,
            "fecha": hoy.isoformat(),
            "en_gimnasio_ahora": monitor.en_gimnasio_ahora,
            "alertas_activas": monitor.alertas_activas,
            "total_registrados": monitor.total_registrados,
            "ingresos_hoy": monitor.ingresos_hoy,
            "salidas_hoy": monitor.salidas_hoy,
            "ingresos_mes": float(total_pagos_mes or 0),
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

    async def reporte_graficos(self, fecha_inicio: date, fecha_fin: date) -> Dict[str, Any]:
        hoy = date.today()

        accesos_result = await self.db.execute(
            select(Acceso)
            .options(selectinload(Acceso.estudiante))
            .where(
                and_(
                    func.date(Acceso.created_at) >= fecha_inicio,
                    func.date(Acceso.created_at) <= fecha_fin,
                )
            )
        )
        registros = accesos_result.scalars().all()

        pagos_result = await self.db.execute(
            select(Pago).where(and_(Pago.fecha >= fecha_inicio, Pago.fecha <= fecha_fin))
        )
        pagos = pagos_result.scalars().all()

        membresias_result = await self.db.execute(
            select(Membresia.tipo, func.count(Membresia.id))
            .join(Estudiante, Membresia.estudiante_id == Estudiante.id)
            .where(
                and_(
                    Estudiante.fechainicio_membresia <= hoy,
                    Estudiante.fechafin_membresia >= hoy,
                )
            )
            .group_by(Membresia.tipo)
        )
        membresias_por_plan = [
            {"plan": row[0], "count": row[1]} for row in membresias_result.all()
        ]

        dias: List[date] = []
        cursor = fecha_inicio
        while cursor <= fecha_fin:
            dias.append(cursor)
            cursor += timedelta(days=1)

        accesos_por_dia_map: Dict[str, Dict[str, Any]] = {
            d.isoformat(): {
                "fecha": d.isoformat(),
                "concedidos": 0,
                "denegados": 0,
                "total": 0,
            }
            for d in dias
        }
        ingresos_por_dia_map: Dict[str, float] = {d.isoformat(): 0.0 for d in dias}
        motivos_map: Dict[str, int] = defaultdict(int)
        horas_map: Dict[int, int] = defaultdict(int)
        carreras_map: Dict[str, int] = defaultdict(int)

        for acceso in registros:
            fecha_key = acceso.created_at.date().isoformat()
            if fecha_key not in accesos_por_dia_map:
                accesos_por_dia_map[fecha_key] = {
                    "fecha": fecha_key,
                    "concedidos": 0,
                    "denegados": 0,
                    "total": 0,
                }
            bucket = accesos_por_dia_map[fecha_key]
            bucket["total"] += 1
            if acceso.acceso_concedido:
                bucket["concedidos"] += 1
            else:
                bucket["denegados"] += 1
                motivo = acceso.motivo_denegacion or "Sin especificar"
                motivos_map[motivo] += 1

            hora_raw = acceso.hora_entrada or acceso.hora_salida
            if hora_raw is not None:
                hora = int(str(hora_raw).zfill(4)[:2])
            elif acceso.created_at:
                hora = acceso.created_at.hour
            else:
                hora = 0
            horas_map[hora] += 1

            if acceso.estudiante and acceso.estudiante.carrera:
                carreras_map[acceso.estudiante.carrera] += 1

        pagos_por_metodo_map: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"metodo": "", "monto": 0.0, "count": 0}
        )
        for pago in pagos:
            fecha_key = pago.fecha.isoformat()
            ingresos_por_dia_map[fecha_key] = ingresos_por_dia_map.get(fecha_key, 0.0) + float(pago.monto)
            metodo_key = pago.metodo or "otro"
            bucket = pagos_por_metodo_map[metodo_key]
            bucket["metodo"] = metodo_key
            bucket["monto"] += float(pago.monto)
            bucket["count"] += 1

        accesos_por_dia = [accesos_por_dia_map[d.isoformat()] for d in dias]
        ingresos_por_dia = [
            {"fecha": d.isoformat(), "monto": round(ingresos_por_dia_map.get(d.isoformat(), 0.0), 2)}
            for d in dias
        ]
        tasa_denegacion_por_dia = [
            {
                "fecha": row["fecha"],
                "tasa": round((row["denegados"] / row["total"] * 100) if row["total"] else 0, 2),
            }
            for row in accesos_por_dia
        ]
        resumen_diario = [
            {
                "fecha": row["fecha"],
                "escaneos": row["total"],
                "concedidos": row["concedidos"],
                "denegados": row["denegados"],
                "ingresos": ingresos_por_dia_map.get(row["fecha"], 0.0),
                "tasa_denegacion_pct": round(
                    (row["denegados"] / row["total"] * 100) if row["total"] else 0, 2
                ),
            }
            for row in accesos_por_dia
        ]

        total_concedidos = sum(r["concedidos"] for r in accesos_por_dia)
        total_denegados = sum(r["denegados"] for r in accesos_por_dia)

        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "accesos_por_dia": accesos_por_dia,
            "resultado_accesos": [
                {"nombre": "Concedidos", "valor": total_concedidos},
                {"nombre": "Denegados", "valor": total_denegados},
            ],
            "motivos_denegacion": [
                {"motivo": motivo, "count": count}
                for motivo, count in sorted(motivos_map.items(), key=lambda x: -x[1])
            ],
            "accesos_por_hora": [
                {"hora": h, "count": horas_map.get(h, 0)} for h in range(6, 23)
            ],
            "ingresos_por_dia": ingresos_por_dia,
            "pagos_por_metodo": list(pagos_por_metodo_map.values()),
            "membresias_por_plan": membresias_por_plan,
            "top_carreras": [
                {"carrera": carrera, "accesos": count}
                for carrera, count in sorted(carreras_map.items(), key=lambda x: -x[1])[:8]
            ],
            "tasa_denegacion_por_dia": tasa_denegacion_por_dia,
            "resumen_diario": resumen_diario,
            "total_ingresos": round(sum(float(p.monto) for p in pagos), 2),
        }

    async def export_accesos_csv(self, fecha_inicio: date, fecha_fin: date) -> StreamingResponse:
        result = await self.db.execute(
            select(Acceso)
            .options(selectinload(Acceso.estudiante))
            .where(
                and_(
                    func.date(Acceso.created_at) >= fecha_inicio,
                    func.date(Acceso.created_at) <= fecha_fin,
                )
            )
            .order_by(Acceso.created_at.desc())
        )
        rows = []
        for a in result.scalars().all():
            est = a.estudiante
            tipo = "denegado" if not a.acceso_concedido else ("salida" if a.hora_salida else "entrada")
            rows.append([
                a.fecha,
                a.hora_entrada,
                a.hora_salida,
                est.nombre if est else "",
                est.carrera if est else "",
                tipo,
                "si" if a.acceso_concedido else "no",
                a.motivo_denegacion or "",
            ])
        return csv_response(
            f"accesos_{fecha_inicio}_{fecha_fin}.csv",
            ["Fecha", "Hora entrada", "Hora salida", "Estudiante", "Carrera", "Movimiento", "Concedido", "Motivo"],
            rows,
        )

    async def export_pagos_csv(self, fecha_inicio: date, fecha_fin: date) -> StreamingResponse:
        result = await self.db.execute(
            select(Pago)
            .options(selectinload(Pago.estudiante))
            .where(and_(Pago.fecha >= fecha_inicio, Pago.fecha <= fecha_fin))
            .order_by(Pago.fecha.desc())
        )
        rows = [
            [p.fecha, p.estudiante.nombre if p.estudiante else "", p.monto, p.metodo, p.referencia or "", p.notas or ""]
            for p in result.scalars().all()
        ]
        return csv_response(
            f"pagos_{fecha_inicio}_{fecha_fin}.csv",
            ["Fecha", "Estudiante", "Monto", "Método", "Referencia", "Notas"],
            rows,
        )

    async def export_membresias_csv(self) -> StreamingResponse:
        result = await self.db.execute(
            select(Membresia).options(selectinload(Membresia.estudiante))
        )
        rows = []
        for m in result.scalars().all():
            est = m.estudiante
            rows.append([
                est.nombre if est else "",
                m.tipo,
                m.precio,
                m.duracion,
                est.fechainicio_membresia if est else "",
                est.fechafin_membresia if est else "",
            ])
        return csv_response(
            "membresias.csv",
            ["Estudiante", "Plan", "Precio", "Duración días", "Inicio", "Fin"],
            rows,
        )

    async def export_estudiantes_csv(self) -> StreamingResponse:
        result = await self.db.execute(select(Estudiante).order_by(Estudiante.nombre))
        rows = [
            [
                e.nombre,
                e.email,
                e.telefono or "",
                e.carrera or "",
                e.registro_univercotario or "",
                e.nfc_uid or "",
                e.fechainicio_membresia or "",
                e.fechafin_membresia or "",
            ]
            for e in result.scalars().all()
        ]
        return csv_response(
            "estudiantes.csv",
            ["Nombre", "Email", "Teléfono", "Carrera", "Registro", "NFC", "Membresía inicio", "Membresía fin"],
            rows,
        )
