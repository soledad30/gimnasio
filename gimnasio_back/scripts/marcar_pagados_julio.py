"""Marca como pagadas (confirmadas) las inscripciones de julio para 10 estudiantes + Soledad NFC."""
from __future__ import annotations

import asyncio
import secrets
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import and_, select

from app.db.session import AsyncSessionLocal
from app.models.actividad import Actividad
from app.models.estudiante import Estudiante
from app.models.inscripcion import Inscripcion
from app.models.pago import Pago
from app.services.inscripcion_service import (
    ESTADO_CONFIRMADA,
    calcular_monto,
    entitlements_acceso_hoy,
    primer_dia_mes,
    ultimo_dia_mes,
)
from app.services.membresia_service import MembresiaService
from app.services.periodo_service import vigencias_se_solapan
import app.models  # noqa: F401


def ref() -> str:
    return f"PAY-{secrets.token_hex(4).upper()}"


async def asegurar_pagado(db, est, mes, actividades, n_acts: int) -> None:
    hoy = date.today()
    await MembresiaService(db).sincronizar_desde_pago_sala_maquinas(
        estudiante_id=est.id,
        mes_inicio=mes,
        monto=calcular_monto("sala_maquinas"),
    )

    ex = (
        await db.execute(
            select(Inscripcion).where(
                and_(
                    Inscripcion.estudiante_id == est.id,
                    Inscripcion.tipo == "sala_maquinas",
                    Inscripcion.mes_inicio == mes,
                    Inscripcion.estado == ESTADO_CONFIRMADA,
                )
            )
        )
    ).scalar_one_or_none()
    if not ex:
        monto = calcular_monto("sala_maquinas")
        ins = Inscripcion(
            estudiante_id=est.id,
            tipo="sala_maquinas",
            actividad_id=None,
            mes_inicio=mes,
            monto=monto,
            referencia_pago=ref(),
            estado=ESTADO_CONFIRMADA,
            creado_por_admin=True,
        )
        db.add(ins)
        await db.flush()
        p = Pago(
            estudiante_id=est.id,
            inscripcion_id=ins.id,
            monto=monto,
            metodo="efectivo",
            referencia=ins.referencia_pago,
            fecha=hoy,
            notas="Pago confirmado julio - sala maquinas",
        )
        db.add(p)
        await db.flush()
        ins.pago_id = p.id

    for act in actividades[:n_acts]:
        ya = (
            await db.execute(
                select(Inscripcion).where(
                    and_(
                        Inscripcion.estudiante_id == est.id,
                        Inscripcion.tipo == "actividad",
                        Inscripcion.actividad_id == act.id,
                        Inscripcion.mes_inicio == mes,
                        Inscripcion.estado == ESTADO_CONFIRMADA,
                    )
                )
            )
        ).scalar_one_or_none()
        if ya:
            continue
        monto = calcular_monto("actividad")
        ins = Inscripcion(
            estudiante_id=est.id,
            tipo="actividad",
            actividad_id=act.id,
            mes_inicio=mes,
            monto=monto,
            referencia_pago=ref(),
            estado=ESTADO_CONFIRMADA,
            creado_por_admin=True,
        )
        db.add(ins)
        await db.flush()
        p = Pago(
            estudiante_id=est.id,
            inscripcion_id=ins.id,
            monto=monto,
            metodo="efectivo",
            referencia=ins.referencia_pago,
            fecha=hoy,
            notas=f"Pago confirmado julio - {act.nombre}",
        )
        db.add(p)
        await db.flush()
        ins.pago_id = p.id


async def main() -> None:
    hoy = date.today()
    mes = primer_dia_mes(hoy)
    fin = ultimo_dia_mes(mes)

    async with AsyncSessionLocal() as db:
        acts = list((await db.execute(select(Actividad).order_by(Actividad.id))).scalars().all())
        acts_mes = [
            a
            for a in acts
            if not a.vigencia_inicio
            or not a.vigencia_fin
            or vigencias_se_solapan(mes, fin, a.vigencia_inicio, a.vigencia_fin)
        ] or acts[:6]

        # 10 primeros + Soledad del NFC (id 101, Derecho)
        ids = list(range(1, 11)) + [101]
        ests = list(
            (
                await db.execute(
                    select(Estudiante).where(Estudiante.id.in_(ids)).order_by(Estudiante.id)
                )
            ).scalars().all()
        )

        for i, e in enumerate(ests):
            rotadas = acts_mes[i % len(acts_mes) :] + acts_mes[: i % len(acts_mes)]
            await asegurar_pagado(db, e, mes, rotadas, n_acts=2 if i % 2 else 1)

        await db.commit()

        print(f"Pagos confirmados mes {mes.isoformat()}:")
        for e in ests:
            await db.refresh(e)
            info = await entitlements_acceso_hoy(db, e.id)
            inscs = list(
                (
                    await db.execute(
                        select(Inscripcion).where(
                            and_(
                                Inscripcion.estudiante_id == e.id,
                                Inscripcion.mes_inicio == mes,
                                Inscripcion.estado == ESTADO_CONFIRMADA,
                            )
                        )
                    )
                ).scalars().all()
            )
            conceptos = []
            for ins in inscs:
                if ins.tipo == "sala_maquinas":
                    conceptos.append("Sala maquinas")
                else:
                    conceptos.append(f"Act#{ins.actividad_id}")
            ok = info["ok"]
            print(
                f"  id={e.id:3d} | {e.nombre[:32]:32s} | PAGADO | {conceptos} | NFC_ok={ok}"
            )


if __name__ == "__main__":
    asyncio.run(main())
