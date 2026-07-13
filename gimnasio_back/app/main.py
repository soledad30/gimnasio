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


async def seed_salas_default() -> None:
    from sqlalchemy import func, select

    from app.models.sala import Sala
    from app.core.config import settings

    async with AsyncSessionLocal() as db:
        total = await db.scalar(select(func.count()).select_from(Sala))
        if total and total > 0:
            return
        db.add_all(
            [
                Sala(
                    nombre="Sala Actividades 1",
                    tipo="actividad",
                    capacidad=settings.CAPACIDAD_SALA_ACTIVIDAD,
                ),
                Sala(
                    nombre="Sala Actividades 2",
                    tipo="actividad",
                    capacidad=settings.CAPACIDAD_SALA_ACTIVIDAD,
                ),
                Sala(
                    nombre="Sala Máquinas",
                    tipo="maquinas",
                    capacidad=settings.CAPACIDAD_SALA_MAQUINAS,
                ),
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
        await conn.execute(text("ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS usuario_id INTEGER"))
        await conn.execute(text("ALTER TABLE notificaciones ALTER COLUMN estudiante_id DROP NOT NULL"))
        # FK suave si aún no existe (ignorar error en re-arranques)
        try:
            await conn.execute(
                text(
                    """
                    DO $$ BEGIN
                      ALTER TABLE notificaciones
                        ADD CONSTRAINT fk_notificaciones_usuario
                        FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
                    EXCEPTION WHEN duplicate_object THEN NULL;
                    END $$;
                    """
                )
            )
        except Exception:
            pass
        await conn.execute(text("ALTER TABLE ejercicios ADD COLUMN IF NOT EXISTS fotourl VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE ejercicios ADD COLUMN IF NOT EXISTS videourl VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS categoria VARCHAR(50)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS marca VARCHAR(100)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(150)"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS anios_vida_util INTEGER"))
        await conn.execute(text("ALTER TABLE maquinas ADD COLUMN IF NOT EXISTS fecha_adquisicion DATE"))
        await conn.execute(text("ALTER TABLE pagos ADD COLUMN IF NOT EXISTS inscripcion_id INTEGER REFERENCES inscripciones(id)"))
        await conn.execute(text("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_expira_en TIMESTAMPTZ"))
        await conn.execute(text("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_reportado_en TIMESTAMPTZ"))
        await conn.execute(
            text("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_reportado_metodo VARCHAR(30)")
        )
        await conn.execute(
            text("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_reportado_comprobante VARCHAR(120)")
        )
        await conn.execute(
            text("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS pago_reportado_notas VARCHAR(500)")
        )
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS dia_semana VARCHAR(80)"))
        await conn.execute(text("ALTER TABLE actividades ALTER COLUMN dia_semana TYPE VARCHAR(80)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS hora_inicio VARCHAR(10)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS hora_fin VARCHAR(10)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS sala_id INTEGER REFERENCES salas(id)"))
        await conn.execute(text("ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS plantilla_id INTEGER REFERENCES rutinas(id)"))
        await conn.execute(text("ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS notas_asignacion VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS vigencia_tipo VARCHAR(20) DEFAULT 'mes'"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS vigencia_inicio DATE"))
        await conn.execute(text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS vigencia_fin DATE"))
        await conn.execute(
            text(
                """
                UPDATE actividades SET
                  vigencia_tipo = COALESCE(vigencia_tipo, 'mes'),
                  vigencia_inicio = COALESCE(vigencia_inicio, DATE_TRUNC('month', CURRENT_DATE)::date),
                  vigencia_fin = COALESCE(
                    vigencia_fin,
                    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date
                  )
                WHERE vigencia_inicio IS NULL OR vigencia_fin IS NULL
                """
            )
        )
        await conn.execute(text("ALTER TABLE asignaciones_instructor ADD COLUMN IF NOT EXISTS turno VARCHAR(10)"))
        await conn.execute(text("ALTER TABLE asignaciones_instructor ADD COLUMN IF NOT EXISTS vigencia_tipo VARCHAR(20) DEFAULT 'mes'"))
        await conn.execute(text("ALTER TABLE asignaciones_instructor ADD COLUMN IF NOT EXISTS vigencia_inicio DATE"))
        await conn.execute(text("ALTER TABLE asignaciones_instructor ADD COLUMN IF NOT EXISTS vigencia_fin DATE"))
        await conn.execute(text("ALTER TABLE asignaciones_instructor ALTER COLUMN fecha DROP NOT NULL"))
        await conn.execute(
            text(
                """
                UPDATE asignaciones_instructor SET
                  vigencia_tipo = COALESCE(vigencia_tipo, 'mes'),
                  vigencia_inicio = COALESCE(vigencia_inicio, COALESCE(fecha, DATE_TRUNC('month', CURRENT_DATE)::date)),
                  vigencia_fin = COALESCE(
                    vigencia_fin,
                    (DATE_TRUNC('month', COALESCE(fecha, CURRENT_DATE)) + INTERVAL '1 month' - INTERVAL '1 day')::date
                  ),
                  fecha = COALESCE(fecha, vigencia_inicio)
                WHERE vigencia_inicio IS NULL OR vigencia_fin IS NULL
                """
            )
        )
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

        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS configuracion_sistema (
                  id SERIAL PRIMARY KEY,
                  nombre_organizacion VARCHAR(150),
                  ubicacion VARCHAR(255),
                  telefono_contacto VARCHAR(40),
                  email_contacto VARCHAR(255),
                  sitio_web VARCHAR(255),
                  facebook VARCHAR(255),
                  instagram VARCHAR(255),
                  whatsapp VARCHAR(80),
                  tiktok VARCHAR(255),
                  youtube VARCHAR(255),
                  gym_open_hour INTEGER,
                  gym_close_hour INTEGER,
                  dias_ventana_inscripcion INTEGER,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS youtube VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS gym_open_hour INTEGER"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS gym_close_hour INTEGER"))
        await conn.execute(
            text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS dias_ventana_inscripcion INTEGER")
        )
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS gym_open_time VARCHAR(8)"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS gym_close_time VARCHAR(8)"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS banco_nombre VARCHAR(150)"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS banco_cuenta VARCHAR(80)"))
        await conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS banco_titular VARCHAR(150)"))
        await conn.execute(
            text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS qr_pago_contenido VARCHAR(500)")
        )
        await conn.execute(
            text(
                """
                UPDATE configuracion_sistema SET
                  gym_open_time = COALESCE(
                    gym_open_time,
                    CASE WHEN gym_open_hour IS NOT NULL THEN lpad(gym_open_hour::text, 2, '0') || ':00:00' ELSE NULL END
                  ),
                  gym_close_time = COALESCE(
                    gym_close_time,
                    CASE WHEN gym_close_hour IS NOT NULL THEN lpad(gym_close_hour::text, 2, '0') || ':00:00' ELSE NULL END
                  )
                WHERE gym_open_time IS NULL OR gym_close_time IS NULL
                """
            )
        )
    await seed_ejercicios_default()
    await seed_salas_default()
    async with AsyncSessionLocal() as db:
        from app.services.configuracion_service import ConfiguracionService

        await ConfiguracionService(db).get()
    async with AsyncSessionLocal() as db:
        from app.services.rol_service import RolService
        await RolService(db).seed_defaults_if_empty()
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
