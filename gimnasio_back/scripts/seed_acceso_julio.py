"""
Asigna a 10 estudiantes membresía + inscripciones confirmadas del mes en curso
para probar NFC / acceso.

Uso:
  python scripts/seed_acceso_julio.py
"""
from __future__ import annotations

import asyncio
import secrets
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import AsyncSessionLocal
from app.models.actividad import Actividad
from app.models.estudiante import Estudiante
from app.models.inscripcion import Inscripcion
from app.models.membresia import Membresia
from app.models.pago import Pago
from app.services.inscripcion_service import (
    ESTADO_CONFIRMADA,
    calcular_monto,
    primer_dia_mes,
    ultimo_dia_mes,
)
from app.services.membresia_service import MembresiaService
from app.services.periodo_service import vigencias_se_solapan
import app.models  # noqa: F401


def ref_pago() -> str:
    return f"PAY-{secrets.token_hex(4).upper()}"


async def main() -> None:
    hoy = date.today()
    mes = primer_dia_mes(hoy)
    fin = ultimo_dia_mes(mes)

    async with AsyncSessionLocal() as db:
        estudiantes = list(
            (
                await db.execute(
                    select(Estudiante).order_by(Estudiante.id).limit(10)
                )
            ).scalars().all()
        )
        if len(estudiantes) < 10:
            print(f"Solo hay {len(estudiantes)} estudiantes; se usarán todos.")

        actividades = list(
            (
                await db.execute(
                    select(Actividad).order_by(Actividad.id)
                )
            ).scalars().all()
        )
        actividades_mes = [
            a
            for a in actividades
            if not a.vigencia_inicio
            or not a.vigencia_fin
            or vigencias_se_solapan(mes, fin, a.vigencia_inicio, a.vigencia_fin)
        ]
        if not actividades_mes:
            actividades_mes = actividades[:6]
            print("Aviso: no hay actividades con vigencia de este mes; se usan las primeras.")

        mem_svc = MembresiaService(db)
        resumen: list[str] = []

        for i, est in enumerate(estudiantes):
            # Membresía / sala de máquinas del mes en curso
            await mem_svc.sincronizar_desde_pago_sala_maquinas(
                estudiante_id=est.id,
                mes_inicio=mes,
                monto=calcular_monto("sala_maquinas"),
            )

            # Inscripción sala_maquinas confirmada (si no existe)
            existente_maq = (
                await db.execute(
                    select(Inscripcion).where(
                        Inscripcion.estudiante_id == est.id,
                        Inscripcion.tipo == "sala_maquinas",
                        Inscripcion.mes_inicio == mes,
                        Inscripcion.estado == ESTADO_CONFIRMADA,
                    )
                )
            ).scalar_one_or_none()

            if not existente_maq:
                monto_m = calcular_monto("sala_maquinas")
                ins_m = Inscripcion(
                    estudiante_id=est.id,
                    tipo="sala_maquinas",
                    actividad_id=None,
                    mes_inicio=mes,
                    monto=monto_m,
                    referencia_pago=ref_pago(),
                    estado=ESTADO_CONFIRMADA,
                    creado_por_admin=True,
                )
                db.add(ins_m)
                await db.flush()
                pago_m = Pago(
                    estudiante_id=est.id,
                    inscripcion_id=ins_m.id,
                    monto=monto_m,
                    metodo="efectivo",
                    referencia=ins_m.referencia_pago,
                    fecha=hoy,
                    notas=f"Seed acceso julio — sala máquinas {mes.isoformat()}",
                )
                db.add(pago_m)
                await db.flush()
                ins_m.pago_id = pago_m.id

            # 1–2 actividades distintas del mes (rotando)
            n_acts = 1 if i % 3 == 0 else 2
            elegidas = []
            for offset in range(len(actividades_mes)):
                act = actividades_mes[(i + offset) % len(actividades_mes)]
                if act.id in {a.id for a in elegidas}:
                    continue
                elegidas.append(act)
                if len(elegidas) >= n_acts:
                    break

            nombres_act: list[str] = []
            for act in elegidas:
                ya = (
                    await db.execute(
                        select(Inscripcion).where(
                            Inscripcion.estudiante_id == est.id,
                            Inscripcion.tipo == "actividad",
                            Inscripcion.actividad_id == act.id,
                            Inscripcion.mes_inicio == mes,
                            Inscripcion.estado == ESTADO_CONFIRMADA,
                        )
                    )
                ).scalar_one_or_none()
                if ya:
                    nombres_act.append(f"{act.nombre} (ya)")
                    continue

                monto_a = calcular_monto("actividad")
                ins_a = Inscripcion(
                    estudiante_id=est.id,
                    tipo="actividad",
                    actividad_id=act.id,
                    mes_inicio=mes,
                    monto=monto_a,
                    referencia_pago=ref_pago(),
                    estado=ESTADO_CONFIRMADA,
                    creado_por_admin=True,
                )
                db.add(ins_a)
                await db.flush()
                pago_a = Pago(
                    estudiante_id=est.id,
                    inscripcion_id=ins_a.id,
                    monto=monto_a,
                    metodo="efectivo",
                    referencia=ins_a.referencia_pago,
                    fecha=hoy,
                    notas=f"Seed acceso julio — {act.nombre}",
                )
                db.add(pago_a)
                await db.flush()
                ins_a.pago_id = pago_a.id
                nombres_act.append(act.nombre)

            resumen.append(
                f"  · {est.nombre} (id={est.id}) — máquinas + {', '.join(nombres_act)}"
            )

        await db.commit()

        print(f"\nOK - mes {mes.isoformat()} a {fin.isoformat()}")
        print(f"Estudiantes habilitados ({len(estudiantes)}):\n")
        print("\n".join(resumen))
        print(
            "\nPrueba NFC en /admin/acceso con cualquiera de estos. "
            "Deben entrar (maquinas y/o actividades) este mes."
        )


if __name__ == "__main__":
    asyncio.run(main())
