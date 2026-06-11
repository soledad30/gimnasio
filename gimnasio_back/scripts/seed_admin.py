"""
Crea el primer usuario administrador si la base está vacía.
Uso: python scripts/seed_admin.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.models.usuario import Usuario
from app.models.administrador import Administrador
from app.core.security import get_password_hash
import app.models  # noqa: F401

ADMIN_EMAIL = "admin@gympro.com"
ADMIN_PASSWORD = "admin123"
ADMIN_NOMBRE = "Administrador GymPro"


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario).where(Usuario.email == ADMIN_EMAIL))
        if result.scalar_one_or_none():
            print(f"Ya existe el admin: {ADMIN_EMAIL}")
            return

        user = Usuario(
            nombre=ADMIN_NOMBRE,
            email=ADMIN_EMAIL,
            telefono="0000000000",
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            es_admin=True,
            rol="admin",
            activo=True,
        )
        db.add(user)
        await db.flush()

        db.add(
            Administrador(
                usuario_id=user.id,
                nombre=ADMIN_NOMBRE,
                email=ADMIN_EMAIL,
            )
        )
        await db.commit()
        print("Admin creado correctamente")
        print(f"  Email:    {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
