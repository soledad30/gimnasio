"""
Asigna IDs de huella de demo (HUELLA-001 …) a los primeros estudiantes
y deja listo el acceso para probar Proteus.

Uso (con el backend/DB ya configurados):
  cd gimnasio_back
  python ../proteus_huella/seed_huellas_demo.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACK = Path(__file__).resolve().parents[1] / "gimnasio_back"
sys.path.insert(0, str(BACK))

from sqlalchemy import select  # noqa: E402

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.estudiante import Estudiante  # noqa: E402
import app.models  # noqa: F401, E402

IDS = ["HUELLA-001", "HUELLA-002", "HUELLA-003", "HUELLA-004"]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Liberar IDs si ya estaban en otros alumnos
        result = await db.execute(select(Estudiante).where(Estudiante.nfc_uid.in_(IDS)))
        for est in result.scalars().all():
            est.nfc_uid = None
        await db.flush()

        estudiantes = list(
            (await db.execute(select(Estudiante).order_by(Estudiante.id).limit(len(IDS))))
            .scalars()
            .all()
        )
        if not estudiantes:
            print("No hay estudiantes en la BD. Creá algunos primero.")
            return

        for est, uid in zip(estudiantes, IDS):
            est.nfc_uid = uid
            print(f"  {uid} → id={est.id} {est.nombre}")

        await db.commit()
        print("\nListo. En Proteus pulsá los botones D2..D5 (HUELLA-001..004).")
        print("Abrí /admin/acceso en el front para ver entradas/salidas.")


if __name__ == "__main__":
    asyncio.run(main())
