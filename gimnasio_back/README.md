# 🏋️ GymPro Backend

Sistema de Gestión para Gimnasio — API REST con **FastAPI + SQLAlchemy async + PostgreSQL**.

---

## Diagrama de Clases Implementado

| Entidad | Tabla PostgreSQL | Descripción |
|---------|----------------|-------------|
| Usuario | `usuarios` | Base de autenticación |
| Administrador | `administradores` | Gestión y reportes |
| Instructor | `instructores` | Rutinas y actividades |
| Estudiante | `estudiantes` | Miembro del gimnasio |
| Acceso | `accesos` | Control NFC de entrada |
| Asistencia | `asistencias` | Registro de asistencia |
| Membresía | `membresias` | Tipo, precio, duración |
| Notificación | `notificaciones` | Alertas al estudiante |
| Reporte | `reportes` | Reportes administrativos |
| Rutina | `rutinas` | Planes de entrenamiento |
| Actividad | `actividades` | Clases grupales |
| Máquina | `maquinas` | Equipamiento del gym |
| Reserva | `reservas` | Reservas de actividades |

---

## Estructura del Proyecto

```
gym_backend/
├── app/
│   ├── main.py                        ← Entrada FastAPI + CORS + lifespan
│   ├── core/
│   │   ├── config.py                  ← Settings PostgreSQL + JWT
│   │   ├── security.py                ← JWT + bcrypt
│   │   └── dependencies.py            ← get_db, get_current_usuario, get_current_admin
│   ├── db/
│   │   ├── base.py                    ← Base declarativa con id/created_at/updated_at
│   │   └── session.py                 ← Engine asyncpg
│   ├── models/                        ← 13 modelos SQLAlchemy (fiel al diagrama)
│   │   ├── usuario.py
│   │   ├── administrador.py
│   │   ├── instructor.py
│   │   ├── estudiante.py
│   │   ├── acceso.py
│   │   ├── asistencia.py
│   │   ├── membresia.py
│   │   ├── notificacion.py
│   │   ├── reporte.py
│   │   ├── rutina.py
│   │   ├── actividad.py
│   │   ├── maquina.py
│   │   └── reserva.py
│   ├── schemas/                       ← Validación Pydantic v2
│   │   ├── auth.py
│   │   ├── usuario.py
│   │   ├── estudiante.py
│   │   ├── instructor.py
│   │   └── schemas.py                 ← Resto de entidades
│   ├── services/                      ← Lógica de negocio
│   │   ├── base_service.py
│   │   ├── usuario_service.py
│   │   ├── estudiante_service.py
│   │   ├── instructor_service.py
│   │   ├── acceso_service.py          ← Lógica NFC completa
│   │   └── reporte_service.py
│   └── api/v1/
│       ├── router.py                  ← Router principal
│       └── endpoints/                 ← Un archivo por entidad
│           ├── auth.py
│           ├── usuarios.py
│           ├── estudiantes.py
│           ├── instructores.py
│           ├── acceso.py
│           ├── membresias.py
│           ├── rutinas.py
│           ├── actividades.py
│           ├── maquinas.py
│           ├── reservas.py
│           ├── notificaciones.py
│           └── reportes.py
├── migrations/                        ← Alembic
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── .env.example
├── .gitignore
├── alembic.ini
├── requirements.txt
└── README.md
```

---

## Requisitos Previos

- Python 3.11+
- PostgreSQL 14+ instalado y corriendo
- pip

---

## Instalación paso a paso

### 1. Crear la base de datos en PostgreSQL

```sql
-- Abrir psql o pgAdmin y ejecutar:
CREATE DATABASE gymdb;
CREATE USER gymuser WITH PASSWORD 'gympassword';
GRANT ALL PRIVILEGES ON DATABASE gymdb TO gymuser;
```

### 2. Clonar y preparar el proyecto

```bash
# Crear entorno virtual
python -m venv venv

# Activar (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activar (Mac/Linux)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

### 4. Correr la aplicación

```bash
# Las tablas se crean automáticamente al iniciar
python -m uvicorn app.main:app --reload --port 8000
```

---

## Migraciones con Alembic (recomendado en producción)

```bash
# Generar migración inicial
alembic revision --autogenerate -m "initial"

# Aplicar migraciones
alembic upgrade head

# Ver historial
alembic history
```

---

## Documentación Interactiva

Una vez corriendo, abrir en el navegador:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

---

## Flujo NFC — Control de Acceso

```
Tarjeta NFC → Lector → POST /api/v1/acceso/nfc-scan {"nfc_uid": "XX:XX:XX:XX"}
                                    ↓
                         ¿UID registrado en estudiante?
                           NO → Acceso denegado + log
                                    ↓
                         ¿Membresía vigente hoy?
                           NO → Acceso denegado + log
                                    ↓
                         ✅ Acceso concedido + log en tabla accesos
```

Respuesta del endpoint:
```json
{
  "acceso_concedido": true,
  "estudiante_id": 5,
  "nombre": "Juan Pérez",
  "estado_membresia": "activa",
  "acceso_id": 123,
  "mensaje": "¡Bienvenido/a, Juan!"
}
```

---

## Endpoints principales

| Método | Endpoint | Descripción | Requiere |
|--------|----------|-------------|----------|
| POST | `/api/v1/auth/login` | Login → JWT | Público |
| GET | `/api/v1/auth/me` | Mi perfil | Auth |
| POST | `/api/v1/estudiantes/` | Crear estudiante | Admin |
| POST | `/api/v1/estudiantes/{id}/nfc` | Asignar NFC | Admin |
| POST | `/api/v1/acceso/nfc-scan` | Escaneo NFC puerta | Dispositivo |
| GET | `/api/v1/acceso/historial` | Historial accesos | Admin |
| POST | `/api/v1/membresias/` | Crear membresía | Admin |
| GET | `/api/v1/reportes/dashboard` | KPIs en tiempo real | Admin |
| GET | `/api/v1/reportes/accesos` | Reporte por fechas | Admin |
| POST | `/api/v1/reservas/` | Hacer reserva | Auth |
| GET | `/api/v1/reservas/mis-reservas` | Mis reservas | Auth |

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 async |
| Base de datos | PostgreSQL + asyncpg |
| Migraciones | Alembic |
| Validación | Pydantic v2 |
| Autenticación | JWT (python-jose) |
| Contraseñas | bcrypt (passlib) |
| Servidor | Uvicorn |
