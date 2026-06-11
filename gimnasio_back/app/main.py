from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.uploads import UPLOADS_ROOT, ensure_upload_dirs
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
import app.models  # noqa: F401 — registra todos los modelos con Alembic/Base


async def seed_ejercicios_default() -> None:
    from sqlalchemy import func, select

    from app.models.ejercicio import Ejercicio

    async with AsyncSessionLocal() as db:
        total = await db.scalar(select(func.count()).select_from(Ejercicio))
        if total and total > 0:
            return
        db.add_all(
            [
                Ejercicio(nombre="Plancha abdominal", grupo_muscular="abdomen", objetivo="abdomen", con_maquina=False, descripcion="Isométrico para core"),
                Ejercicio(nombre="Crunch en el suelo", grupo_muscular="abdomen", objetivo="abdomen", con_maquina=False),
                Ejercicio(nombre="Elevaciones de piernas", grupo_muscular="abdomen", objetivo="abdomen", con_maquina=False),
                Ejercicio(nombre="Press de banca", grupo_muscular="pecho", objetivo="hipertrofia", con_maquina=True),
                Ejercicio(nombre="Sentadilla libre", grupo_muscular="piernas", objetivo="fuerza", con_maquina=False),
                Ejercicio(nombre="Peso muerto", grupo_muscular="espalda", objetivo="fuerza", con_maquina=False),
                Ejercicio(nombre="Curl de bíceps", grupo_muscular="bíceps", objetivo="hipertrofia", con_maquina=True),
                Ejercicio(nombre="Remo con cable", grupo_muscular="espalda", objetivo="hipertrofia", con_maquina=True),
                Ejercicio(nombre="Elíptica", grupo_muscular="cardio", objetivo="resistencia", con_maquina=True),
                Ejercicio(nombre="Burpees", grupo_muscular="cuerpo completo", objetivo="perdida_peso", con_maquina=False),
                Ejercicio(nombre="Estiramientos dinámicos", grupo_muscular="cuerpo completo", objetivo="flexibilidad", con_maquina=False),
                Ejercicio(nombre="Dominadas", grupo_muscular="espalda", objetivo="fuerza", con_maquina=False),
            ]
        )
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_dirs()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS fotourl VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE instructores ADD COLUMN IF NOT EXISTS fotourl VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE instructores ALTER COLUMN especialidad TYPE VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS codigo_acceso VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE ejercicios ADD COLUMN IF NOT EXISTS fotourl VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE ejercicios ADD COLUMN IF NOT EXISTS videourl VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS categoria VARCHAR(50)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS marca VARCHAR(100)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(150)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS dia_semana VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS hora_inicio VARCHAR(10)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS hora_fin VARCHAR(10)"))
        await conn.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'estudiante'"))
        await conn.execute(text("UPDATE usuarios SET rol = 'admin' WHERE es_admin = true"))
        await conn.execute(
            text(
                """
                UPDATE usuarios u SET rol = 'instructor'
                FROM instructores i
                WHERE i.usuario_id = u.id AND u.es_admin = false
                  AND (u.rol IS NULL OR u.rol = 'estudiante')
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE usuarios u SET rol = 'estudiante'
                FROM estudiantes e
                WHERE e.usuario_id = u.id AND u.es_admin = false
                  AND NOT EXISTS (SELECT 1 FROM instructores i WHERE i.usuario_id = u.id)
                  AND (u.rol IS NULL OR u.rol = 'estudiante')
                """
            )
        )
    await seed_ejercicios_default()
    async with AsyncSessionLocal() as db:
        from app.services.notificacion_service import NotificacionService
        await NotificacionService(db).procesar_alertas_vencimiento()
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
## 🏋️ GymPro — Sistema de Gestión de Gimnasio




    """,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

ensure_upload_dirs()
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_ROOT)), name="uploads")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": settings.VERSION}
