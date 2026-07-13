-- =============================================================================
-- GymPro (UAGRM-GYM) — Script DDL PostgreSQL
-- Solo definición de tablas (21 tablas)
-- Base de datos: gymdb
-- =============================================================================

-- Opcional: crear base de datos y usuario
-- CREATE DATABASE gymdb;
-- CREATE USER gymuser WITH PASSWORD 'gympassword';
-- GRANT ALL PRIVILEGES ON DATABASE gymdb TO gymuser;

-- Eliminar tablas en orden inverso (si se re-ejecuta el script)
DROP TABLE IF EXISTS mantenimientos_maquina CASCADE;
DROP TABLE IF EXISTS rutina_ejercicios CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS asignaciones_instructor CASCADE;
DROP TABLE IF EXISTS reportes CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS accesos CASCADE;
DROP TABLE IF EXISTS rutinas CASCADE;
DROP TABLE IF EXISTS ejercicios CASCADE;
DROP TABLE IF EXISTS actividades CASCADE;
DROP TABLE IF EXISTS maquinas CASCADE;
DROP TABLE IF EXISTS membresias CASCADE;
DROP TABLE IF EXISTS salas CASCADE;
DROP TABLE IF EXISTS estudiantes CASCADE;
DROP TABLE IF EXISTS instructores CASCADE;
DROP TABLE IF EXISTS administradores CASCADE;
DROP TABLE IF EXISTS rol_permisos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- =============================================================================
-- 1. usuarios
-- =============================================================================
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    telefono        VARCHAR(20),
    hashed_password VARCHAR(255)  NOT NULL,
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    es_admin        BOOLEAN       NOT NULL DEFAULT FALSE,
    rol             VARCHAR(20)   NOT NULL DEFAULT 'estudiante',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_usuarios_id ON usuarios (id);
CREATE INDEX ix_usuarios_email ON usuarios (email);

-- =============================================================================
-- 2. rol_permisos
-- =============================================================================
CREATE TABLE rol_permisos (
    id         SERIAL PRIMARY KEY,
    rol        VARCHAR(20) NOT NULL,
    permiso    VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rol_permiso UNIQUE (rol, permiso)
);

CREATE INDEX ix_rol_permisos_id ON rol_permisos (id);
CREATE INDEX ix_rol_permisos_rol ON rol_permisos (rol);
CREATE INDEX ix_rol_permisos_permiso ON rol_permisos (permiso);

-- =============================================================================
-- 3. administradores
-- =============================================================================
CREATE TABLE administradores (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER      NOT NULL UNIQUE REFERENCES usuarios (id),
    nombre     VARCHAR(150) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_administradores_id ON administradores (id);

-- =============================================================================
-- 4. instructores
-- =============================================================================
CREATE TABLE instructores (
    id           SERIAL PRIMARY KEY,
    usuario_id   INTEGER       NOT NULL UNIQUE REFERENCES usuarios (id),
    nombre       VARCHAR(150)  NOT NULL,
    especialidad VARCHAR(500),
    fotourl      VARCHAR(500),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_instructores_id ON instructores (id);

-- =============================================================================
-- 5. estudiantes
-- =============================================================================
CREATE TABLE estudiantes (
    id                      SERIAL PRIMARY KEY,
    usuario_id              INTEGER       NOT NULL UNIQUE REFERENCES usuarios (id),
    cs                      VARCHAR(100),
    registro_univercotario  VARCHAR(100),
    nombre                  VARCHAR(150)  NOT NULL,
    carrera                 VARCHAR(150),
    email                   VARCHAR(255)  NOT NULL,
    telefono                VARCHAR(20),
    fotourl                 VARCHAR(500),
    fechainicio_membresia   DATE,
    fechafin_membresia      DATE,
    nfc_uid                 VARCHAR(64)   UNIQUE,
    codigo_acceso           VARCHAR(20)   UNIQUE,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_estudiantes_id ON estudiantes (id);
CREATE INDEX ix_estudiantes_nfc_uid ON estudiantes (nfc_uid);
CREATE INDEX ix_estudiantes_codigo_acceso ON estudiantes (codigo_acceso);

-- =============================================================================
-- 6. salas
-- =============================================================================
CREATE TABLE salas (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    tipo       VARCHAR(20)  NOT NULL,
    capacidad  INTEGER      NOT NULL DEFAULT 20,
    activa     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_salas_id ON salas (id);

-- =============================================================================
-- 7. maquinas
-- =============================================================================
CREATE TABLE maquinas (
    id                SERIAL PRIMARY KEY,
    instructor_id     INTEGER       REFERENCES instructores (id),
    codigo            VARCHAR(100)  UNIQUE,
    nombre            VARCHAR(150)  NOT NULL,
    descripcion       VARCHAR(500),
    categoria         VARCHAR(50),
    marca             VARCHAR(100),
    ubicacion         VARCHAR(150),
    fotourl           VARCHAR(500),
    estado_maquina    VARCHAR(50)   NOT NULL DEFAULT 'disponible',
    anios_vida_util   INTEGER,
    fecha_adquisicion DATE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_maquinas_id ON maquinas (id);

-- =============================================================================
-- 8. membresias
-- =============================================================================
CREATE TABLE membresias (
    id            SERIAL PRIMARY KEY,
    estudiante_id INTEGER        NOT NULL UNIQUE REFERENCES estudiantes (id),
    tipo          VARCHAR(100)   NOT NULL,
    precio        NUMERIC(10, 2) NOT NULL,
    duracion      INTEGER        NOT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX ix_membresias_id ON membresias (id);

-- =============================================================================
-- 9. actividades
-- =============================================================================
CREATE TABLE actividades (
    id              SERIAL PRIMARY KEY,
    instructor_id   INTEGER       REFERENCES instructores (id),
    sala_id         INTEGER       REFERENCES salas (id),
    nombre          VARCHAR(150)  NOT NULL,
    descripcion     VARCHAR(500),
    dia_semana      VARCHAR(80),
    hora_inicio     VARCHAR(10),
    hora_fin        VARCHAR(10),
    capacidad       INTEGER       NOT NULL DEFAULT 20,
    vigencia_tipo   VARCHAR(20)   NOT NULL DEFAULT 'mes',
    vigencia_inicio DATE,
    vigencia_fin    DATE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_actividades_id ON actividades (id);

-- =============================================================================
-- 10. ejercicios
-- =============================================================================
CREATE TABLE ejercicios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    VARCHAR(500),
    grupo_muscular VARCHAR(100),
    objetivo       VARCHAR(100),
    con_maquina    BOOLEAN      NOT NULL DEFAULT FALSE,
    maquina_id     INTEGER      REFERENCES maquinas (id),
    fotourl        VARCHAR(500),
    videourl       VARCHAR(500),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_ejercicios_id ON ejercicios (id);

-- =============================================================================
-- 11. rutinas
-- =============================================================================
CREATE TABLE rutinas (
    id               SERIAL PRIMARY KEY,
    instructor_id    INTEGER       REFERENCES instructores (id),
    estudiante_id    INTEGER       REFERENCES estudiantes (id),
    plantilla_id     INTEGER       REFERENCES rutinas (id),
    nombre           VARCHAR(150)  NOT NULL,
    objetivo         VARCHAR(255),
    notas_asignacion VARCHAR(500),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_rutinas_id ON rutinas (id);

-- =============================================================================
-- 12. rutina_ejercicios
-- =============================================================================
CREATE TABLE rutina_ejercicios (
    id           SERIAL PRIMARY KEY,
    rutina_id    INTEGER      NOT NULL REFERENCES rutinas (id) ON DELETE CASCADE,
    ejercicio_id INTEGER      NOT NULL REFERENCES ejercicios (id) ON DELETE CASCADE,
    series       INTEGER,
    repeticiones VARCHAR(50),
    orden        INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_rutina_ejercicio UNIQUE (rutina_id, ejercicio_id)
);

CREATE INDEX ix_rutina_ejercicios_id ON rutina_ejercicios (id);

-- =============================================================================
-- 13. accesos
-- =============================================================================
CREATE TABLE accesos (
    id                 SERIAL PRIMARY KEY,
    estudiante_id      INTEGER       REFERENCES estudiantes (id),
    fecha              VARCHAR(50)   NOT NULL,
    hora_entrada       INTEGER,
    hora_salida        INTEGER,
    tiempo_permanencia VARCHAR(50),
    nfc_uid_escaneado  VARCHAR(64),
    acceso_concedido   BOOLEAN       NOT NULL DEFAULT FALSE,
    motivo_denegacion  VARCHAR(255),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_accesos_id ON accesos (id);

-- =============================================================================
-- 14. asistencias
-- =============================================================================
CREATE TABLE asistencias (
    id            SERIAL PRIMARY KEY,
    estudiante_id INTEGER     NOT NULL REFERENCES estudiantes (id),
    fecha         DATE        NOT NULL,
    horaentrada   TIME,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_asistencias_id ON asistencias (id);

-- =============================================================================
-- 15. notificaciones
-- =============================================================================
CREATE TABLE notificaciones (
    id            SERIAL PRIMARY KEY,
    estudiante_id INTEGER        NOT NULL REFERENCES estudiantes (id),
    fecha         DATE,
    titulo        VARCHAR(255)   NOT NULL,
    mensaje       VARCHAR(1000)  NOT NULL,
    leida         BOOLEAN        NOT NULL DEFAULT FALSE,
    tipo          VARCHAR(100),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX ix_notificaciones_id ON notificaciones (id);

-- =============================================================================
-- 16. reportes
-- =============================================================================
CREATE TABLE reportes (
    id               SERIAL PRIMARY KEY,
    administrador_id INTEGER       NOT NULL REFERENCES administradores (id),
    tipo             VARCHAR(100)  NOT NULL,
    nombre           VARCHAR(255)  NOT NULL,
    fecha            DATE          NOT NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_reportes_id ON reportes (id);

-- =============================================================================
-- 17. reservas
-- =============================================================================
CREATE TABLE reservas (
    id            SERIAL PRIMARY KEY,
    estudiante_id INTEGER     NOT NULL REFERENCES estudiantes (id),
    actividad_id  INTEGER     NOT NULL REFERENCES actividades (id),
    fecha         DATE        NOT NULL,
    estado        INTEGER     NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_reservas_id ON reservas (id);

-- =============================================================================
-- 18. asignaciones_instructor
-- =============================================================================
CREATE TABLE asignaciones_instructor (
    id              SERIAL PRIMARY KEY,
    instructor_id   INTEGER      NOT NULL REFERENCES instructores (id),
    sala_id         INTEGER      NOT NULL REFERENCES salas (id),
    actividad_id    INTEGER      REFERENCES actividades (id),
    fecha           DATE,
    hora_inicio     VARCHAR(5)   NOT NULL,
    hora_fin        VARCHAR(5)   NOT NULL,
    tipo            VARCHAR(20)  NOT NULL DEFAULT 'coach_maquinas',
    turno           VARCHAR(10),
    vigencia_tipo   VARCHAR(20)  NOT NULL DEFAULT 'mes',
    vigencia_inicio DATE,
    vigencia_fin    DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_asignaciones_instructor_id ON asignaciones_instructor (id);

-- =============================================================================
-- 19. inscripciones  (pago_id FK se agrega después de crear pagos)
-- =============================================================================
CREATE TABLE inscripciones (
    id               SERIAL PRIMARY KEY,
    estudiante_id    INTEGER        NOT NULL REFERENCES estudiantes (id),
    tipo             VARCHAR(20)    NOT NULL,
    actividad_id     INTEGER        REFERENCES actividades (id),
    mes_inicio       DATE           NOT NULL,
    monto            NUMERIC(10, 2) NOT NULL,
    referencia_pago  VARCHAR(50)    NOT NULL UNIQUE,
    estado           INTEGER        NOT NULL DEFAULT 3,
    pago_id          INTEGER,
    pago_expira_en   TIMESTAMPTZ,
    creado_por_admin BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX ix_inscripciones_id ON inscripciones (id);

-- =============================================================================
-- 20. pagos
-- =============================================================================
CREATE TABLE pagos (
    id             SERIAL PRIMARY KEY,
    estudiante_id  INTEGER        NOT NULL REFERENCES estudiantes (id),
    membresia_id   INTEGER        REFERENCES membresias (id),
    inscripcion_id INTEGER        REFERENCES inscripciones (id),
    monto          NUMERIC(10, 2) NOT NULL,
    metodo         VARCHAR(50)    NOT NULL DEFAULT 'efectivo',
    referencia     VARCHAR(100),
    fecha          DATE           NOT NULL,
    notas          VARCHAR(500),
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX ix_pagos_id ON pagos (id);

-- FK circular: inscripciones.pago_id -> pagos
ALTER TABLE inscripciones
    ADD CONSTRAINT fk_inscripciones_pago_id
    FOREIGN KEY (pago_id) REFERENCES pagos (id);

-- =============================================================================
-- 21. mantenimientos_maquina
-- =============================================================================
CREATE TABLE mantenimientos_maquina (
    id                    SERIAL PRIMARY KEY,
    maquina_id            INTEGER        NOT NULL REFERENCES maquinas (id) ON DELETE CASCADE,
    tipo                  VARCHAR(30)    NOT NULL DEFAULT 'preventivo',
    responsable           VARCHAR(150),
    observaciones         VARCHAR(1000),
    checklist             JSON           NOT NULL DEFAULT '[]'::json,
    fecha_realizado       DATE           NOT NULL,
    proximo_mantenimiento DATE,
    resultado             VARCHAR(30)    NOT NULL DEFAULT 'ok',
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX ix_mantenimientos_maquina_id ON mantenimientos_maquina (id);

-- =============================================================================
-- 22. fichas_inscripcion (DUBSS-FR-03)
-- =============================================================================
CREATE TABLE fichas_inscripcion (
    id                                    SERIAL PRIMARY KEY,
    estudiante_id                         INTEGER        NOT NULL REFERENCES estudiantes (id) ON DELETE CASCADE,
    version                               INTEGER        NOT NULL DEFAULT 1,
    vigente                               BOOLEAN        NOT NULL DEFAULT TRUE,
    nombre                                VARCHAR(150)   NOT NULL,
    cs                                    VARCHAR(100),
    carrera                               VARCHAR(150),
    domicilio                             VARCHAR(255),
    email                                 VARCHAR(255)   NOT NULL,
    telefono                              VARCHAR(20),
    fecha_nacimiento                      DATE,
    sexo                                  VARCHAR(1),
    grupo_sanguineo                       VARCHAR(10),
    altura_cm                             INTEGER,
    peso_kg                               NUMERIC(5, 2),
    mes_horario                           VARCHAR(100),
    antecedentes_cardiovasculares         BOOLEAN        NOT NULL DEFAULT FALSE,
    antecedentes_cardiovasculares_detalle VARCHAR(1000),
    procedimientos_cardiovasculares       BOOLEAN        NOT NULL DEFAULT FALSE,
    procedimientos_cardiovasculares_detalle VARCHAR(1000),
    condiciones                           JSON           NOT NULL DEFAULT '{}'::json,
    condiciones_detalle                   VARCHAR(2000),
    intervencion_quirurgica               BOOLEAN        NOT NULL DEFAULT FALSE,
    intervencion_quirurgica_detalle       VARCHAR(1000),
    fracturas                             BOOLEAN        NOT NULL DEFAULT FALSE,
    fracturas_detalle                     VARCHAR(1000),
    sintomas_deportivos                   BOOLEAN        NOT NULL DEFAULT FALSE,
    sintomas_deportivos_detalle           VARCHAR(2000),
    acepta_reglamento                     BOOLEAN        NOT NULL DEFAULT FALSE,
    declaracion_jurada                    BOOLEAN        NOT NULL DEFAULT FALSE,
    firma_nombre                          VARCHAR(150)   NOT NULL,
    firma_fecha                           DATE           NOT NULL,
    firma_ci                              VARCHAR(100),
    requiere_certificado_medico           BOOLEAN        NOT NULL DEFAULT FALSE,
    certificado_medico_recibido           BOOLEAN        NOT NULL DEFAULT FALSE,
    certificado_medico_url                VARCHAR(500),
    fecha_vigencia_desde                  DATE           NOT NULL,
    fecha_vigencia_hasta                  DATE           NOT NULL,
    estado                                VARCHAR(30)    NOT NULL DEFAULT 'vigente',
    created_by_usuario_id                 INTEGER REFERENCES usuarios (id),
    created_at                            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                            TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_fichas_inscripcion_estudiante ON fichas_inscripcion (estudiante_id);
CREATE INDEX idx_fichas_inscripcion_vigente ON fichas_inscripcion (estudiante_id, vigente);
