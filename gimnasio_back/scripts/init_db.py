"""
Crea todas las tablas del proyecto en la BD configurada en .env
Uso: python scripts/init_db.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import engine
from app.db.base import Base
import app.models  # noqa: F401


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas creadas en:", engine.url.render_as_string(hide_password=True))


if __name__ == "__main__":
    asyncio.run(main())
