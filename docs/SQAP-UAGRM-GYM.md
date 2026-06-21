# UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO
## FACULTAD DE INGENIERÍA EN CIENCIAS DE LA COMPUTACIÓN Y TELECOMUNICACIONES

---

# SQAP
## Plan de Aseguramiento de Calidad de Software

**Proyecto:** UAGRM-GYM — Sistema de Gestión de Gimnasio (GymPro)

| Campo | Valor |
|-------|-------|
| **GRUPO** | [Completar número de grupo] |
| **DOCENTE** | Ing. Rolando Antonio Martínez Canedo |
| **MATERIA** | Ingeniería de Software II |
| **GRUPO PARALELO** | [Completar, ej. SB] |
| **SEMESTRE** | I/2026 |
| **ESTUDIANTES** | [Completar nombres de integrantes] |
| **CIUDAD** | Santa Cruz — Bolivia |

---

## Contenido

1. [Introducción y contexto organizacional](#1-introducción-y-contexto-organizacional)
   - 1.1 Introducción
   - 1.2 Antecedentes
   - 1.3 Objetivos
   - 1.4 Misión
   - 1.5 Visión
   - 1.6 Políticas de Calidad
   - 1.7 Slogan
2. [Plan de Aseguramiento de Calidad de Software (SQAP)](#2-plan-de-aseguramiento-de-calidad-de-software-sqap)
   - 2.1 Propósito, objetivo y descripción
   - 2.2 Alcance del ciclo de vida
   - 2.3 Organización, tareas y roles
   - 2.4 Documentación mínima requerida
   - 2.5 Estándares, prácticas y convenciones
   - 2.6 Revisión y auditorías
   - 2.7 Gestión de configuración
   - 2.8 Gestión de problemas
   - 2.9 Herramientas técnicas y metodologías
   - 2.10 Control de código, medios y registros

---

# 1. Introducción y contexto organizacional

## 1.1 Introducción

En **GymPro (UAGRM-GYM)**, la excelencia en el desarrollo de software es el pilar fundamental de nuestro sistema de gestión de gimnasio. Reconocemos que, en un entorno universitario donde la operación diaria del gimnasio depende de procesos digitales —control de acceso NFC, membresías, pagos, rutinas, reservas y reportes—, la calidad del software es crucial para garantizar la confiabilidad, seguridad y satisfacción de administradores, instructores, personal de recepción y estudiantes.

Este documento representa la hoja de ruta hacia estándares de calidad sobresalientes para el proyecto **UAGRM-GYM**, reflejando el compromiso del equipo de desarrollo con la excelencia en cada componente del sistema: API REST (FastAPI + PostgreSQL), panel web administrativo (React + Vite) y los módulos de acceso para cada rol del gimnasio.

Nos distinguimos por un enfoque tridimensional para garantizar la calidad del software, abordando las perspectivas del **usuario final** (estudiante, instructor, recepción), del **desarrollador** (frontend, backend, base de datos) y del **producto** (funcionalidad, rendimiento, mantenibilidad). La gestión de calidad está estandarizada conforme a normas IEEE e ISO/IEC, lo que permite ofrecer una solución tecnológica integral para la administración del gimnasio universitario.

## 1.2 Antecedentes

**GymPro** es un proyecto de software desarrollado en el marco de la materia Ingeniería de Software II de la Universidad Autónoma Gabriel René Moreno. Surge como respuesta a la necesidad de digitalizar y centralizar la gestión del gimnasio universitario, reemplazando procesos manuales o fragmentados por una plataforma web unificada.

El sistema aborda los siguientes desafíos operativos del gimnasio:

- **Control de acceso:** Validación de entrada mediante tarjetas NFC vinculadas a estudiantes con membresía vigente.
- **Gestión de miembros:** Registro de estudiantes, asignación de membresías y seguimiento de pagos.
- **Operaciones del gimnasio:** Administración de instructores, actividades grupales, máquinas, ejercicios y rutinas de entrenamiento.
- **Reservas y notificaciones:** Reserva de actividades y envío de alertas a los usuarios.
- **Reportes administrativos:** Dashboard con KPIs, historial de accesos y reportes por fechas.

### Arquitectura del sistema

El proyecto se compone de dos submódulos principales:

| Módulo | Tecnología | Descripción |
|--------|-----------|-------------|
| `gimnasio_back/` | FastAPI 0.115, SQLAlchemy 2.0 async, PostgreSQL, Alembic, JWT | API REST con 14 grupos de endpoints |
| `gimnasio_front/` | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui | Panel web con rutas por rol |

### Entidades del dominio

| Entidad | Tabla | Descripción |
|---------|-------|-------------|
| Usuario | `usuarios` | Autenticación y roles (admin, recepción, instructor, estudiante) |
| Administrador | `administradores` | Gestión y reportes |
| Instructor | `instructores` | Rutinas y actividades |
| Estudiante | `estudiantes` | Miembro del gimnasio con UID NFC |
| Acceso | `accesos` | Control NFC de entrada |
| Asistencia | `asistencias` | Registro de asistencia |
| Membresía | `membresias` | Tipo, precio y duración |
| Pago | `pagos` | Registro de pagos |
| Notificación | `notificaciones` | Alertas al estudiante |
| Reporte | `reportes` | Reportes administrativos |
| Rutina | `rutinas` | Planes de entrenamiento |
| Ejercicio | `ejercicios` | Catálogo de ejercicios |
| Actividad | `actividades` | Clases grupales |
| Máquina | `maquinas` | Equipamiento del gym |
| Reserva | `reservas` | Reservas de actividades |

### Roles y módulos funcionales

| Rol | Ruta base | Funcionalidades principales |
|-----|-----------|----------------------------|
| **Admin** | `/admin` | Dashboard, usuarios, instructores, actividades, máquinas, ejercicios, rutinas, reportes, notificaciones |
| **Recepción** | `/admin` | Dashboard, estudiantes, control NFC, reservas, membresías, pagos |
| **Instructor** | `/instructor` | Rutinas asignadas, actividades, reservas |
| **Estudiante** | `/app` | Acceso NFC, rutina personal, reservas, notificaciones, actividades, máquinas |

A pesar de ser un proyecto académico en desarrollo activo, GymPro ha demostrado capacidad para abordar un sistema de complejidad media-alta con arquitectura cliente-servidor, autenticación JWT, control de acceso por roles y flujo NFC completo.

## 1.3 Objetivos

### 1.3.1 Objetivo General

Desarrollar e implementar un **Sistema de Gestión de Gimnasio (UAGRM-GYM)** que cumpla con los más altos estándares de calidad de software, satisfaciendo las necesidades operativas del gimnasio universitario y ofreciendo una experiencia digital confiable para todos los actores involucrados.

### 1.3.2 Objetivos Específicos

- Desarrollar una solución de software integral que cumpla con estándares de calidad y se adapte a las necesidades específicas del gimnasio universitario: control de acceso, membresías, pagos, rutinas y reportes.
- Implementar una arquitectura cliente-servidor escalable con separación clara entre frontend (React) y backend (FastAPI), facilitando el mantenimiento y la evolución del sistema.
- Garantizar la seguridad del sistema mediante autenticación JWT, control de acceso basado en roles (RBAC) y validación de datos con Pydantic v2.
- Fomentar un ambiente de colaboración y mejora continua dentro del equipo de desarrollo, promoviendo revisiones de código, pruebas y documentación actualizada.
- Establecer procesos de verificación y validación que aseguren la conformidad entre requisitos (SRS), diseño (SDD), implementación y pruebas.
- Entregar documentación técnica y de usuario que facilite la adopción del sistema por parte de administradores, instructores y estudiantes.

## 1.4 Misión

En GymPro, nuestra misión es **transformar la gestión del gimnasio universitario** mediante una plataforma digital integral que optimice el control de acceso, la administración de membresías, la planificación de rutinas y la experiencia de los usuarios. Nos comprometemos a desarrollar software confiable, seguro y fácil de usar que mejore la eficiencia operativa del gimnasio y la satisfacción de sus miembros.

## 1.5 Visión

Visualizamos a **UAGRM-GYM** como el sistema de referencia para la gestión digital de gimnasios universitarios, reconocido por su calidad técnica, su arquitectura moderna y su capacidad de adaptarse a las necesidades cambiantes de la comunidad universitaria. Aspiramos a que el sistema evolucione hacia una plataforma completa que integre analítica avanzada, notificaciones en tiempo real y experiencia móvil.

## 1.6 Políticas de Calidad

En GymPro, la política de calidad no es solo un documento formal; es la esencia de cada decisión de diseño, cada endpoint de la API y cada pantalla del panel web. Guiados por estándares IEEE e ISO/IEC, elevamos el estándar en cada etapa del ciclo de vida del software, asegurando que cada entrega sea un testimonio de dedicación y compromiso con la perfección funcional y técnica.

### 1.6.1 Principios de Calidad

- **Compromiso con la excelencia:** Alcanzar y mantener altos estándares de calidad en todas las etapas, desde la especificación de requisitos hasta el despliegue y mantenimiento.
- **Enfoque centrado en el usuario:** Priorizar las necesidades de administradores, instructores, personal de recepción y estudiantes en el diseño de interfaces y flujos de trabajo.
- **Adhesión a estándares:** Seguir estándares IEEE (SRS, SDD, PVVS) e ISO/IEC 25010 para garantizar coherencia, calidad y confiabilidad.
- **Mejora continua:** Buscar oportunidades de mejora mediante retroalimentación, métricas de calidad y acciones correctivas.
- **Transparencia y responsabilidad:** Asumir responsabilidad por la calidad del software ante docentes, evaluadores y usuarios del gimnasio.
- **Colaboración y comunicación:** Promover comunicación efectiva entre integrantes del equipo y con el docente/consultor del proyecto.

## 1.7 Slogan

**GymPro: Gestión Inteligente, Acceso Seguro, Entrenamiento Eficiente**

---

# 2. Plan de Aseguramiento de Calidad de Software (SQAP)

## 2.1.1 Propósito

El propósito del Plan de Aseguramiento de Calidad de Software (SQAP) en GymPro es garantizar la entrega de un producto de software que cumpla con los más altos estándares de calidad para la gestión del gimnasio universitario. Este plan establece procesos, procedimientos y controles que aseguren la fiabilidad, seguridad y eficacia del sistema UAGRM-GYM, promoviendo una cultura de calidad en todo el equipo de desarrollo.

## 2.1.2 Objetivo

El objetivo primordial del SQAP en GymPro es establecer un marco metodológico que asegure la entrega consistente de un sistema de gestión de gimnasio de alta calidad. Para lograrlo, el SQAP se enfoca en:

- Establecer procesos claros para el desarrollo del software, desde la planificación hasta la entrega.
- Definir roles y responsabilidades precisas para los integrantes del equipo.
- Implementar controles de calidad en cada etapa del ciclo de vida del software.
- Promover una cultura de calidad, colaboración y aprendizaje continuo.
- Mejorar continuamente los procesos mediante retroalimentación y acciones correctivas.

## 2.1.3 Descripción

El SQAP de GymPro es el documento maestro que traza las líneas directrices, establece los estándares y define los procesos que aseguran la calidad excepcional en cada componente del sistema: API REST, panel web administrativo, módulo de control NFC, gestión de membresías, pagos, rutinas, reservas y reportes.

Desde la concepción de los requisitos hasta la entrega del producto, el SQAP garantiza que cada paso esté respaldado por documentación, revisiones y pruebas que validen la conformidad con los estándares establecidos.

### 2.1.3.1 Modelo de calidad interna y externa

El modelo de calidad de GymPro se basa en **ISO/IEC 25010**, evaluando:

**Calidad interna (atributos del producto en desarrollo):**

| Característica | Aplicación en GymPro |
|----------------|---------------------|
| Mantenibilidad | Arquitectura modular (services, endpoints, schemas), migraciones Alembic |
| Fiabilidad | Validación Pydantic, manejo de errores HTTP, logs de acceso NFC |
| Eficiencia de rendimiento | SQLAlchemy async, consultas optimizadas, React Query para caché |
| Seguridad | JWT, bcrypt, RBAC por rol, CORS configurado |
| Compatibilidad | API REST estándar, frontend desacoplado vía HTTP/JSON |

**Calidad externa (atributos percibidos por el usuario):**

| Característica | Aplicación en GymPro |
|----------------|---------------------|
| Funcionalidad | 14 módulos API, 4 perfiles de usuario, flujo NFC completo |
| Usabilidad | UI con shadcn/ui, sidebar por rol, tema oscuro "gym" |
| Fiabilidad | Control de acceso con validación de membresía vigente |
| Desempeño | Dashboard con KPIs en tiempo real |
| Seguridad | Autenticación obligatoria, rutas protegidas por rol |

## 2.1.4 Alcance del ciclo de vida

El SQAP de GymPro abarca todas las fases del ciclo de vida del desarrollo de software:

### 2.1.4.1 Planificación de Calidad

Definición de objetivos de calidad, asignación de responsabilidades y cronograma de actividades de aseguramiento de calidad alineadas con las entregas del proyecto académico.

### 2.1.4.1 Requisitos

Verificación y validación de todos los requisitos del software. Revisiones para garantizar claridad y completitud de funcionalidades: autenticación, roles, NFC, membresías, pagos, rutinas, reservas, reportes y notificaciones.

### 2.1.4.2 Diseño

Procesos de revisión del diseño de la arquitectura cliente-servidor, modelo de datos (13+ entidades), diseño de API REST y diseño de interfaces por rol. Verificación de conformidad con la SRS.

### 2.1.4.3 Implementación

Revisión de código (Python/FastAPI y TypeScript/React), pruebas unitarias, gestión de configuración con Git. Estándares de codificación para backend y frontend.

### 2.1.4.4 Pruebas

Plan integral de pruebas: unitarias (servicios backend), integración (endpoints API), sistema (flujos completos frontend-backend) y aceptación (validación con casos de uso del gimnasio).

### 2.1.4.5 Despliegue

Actividades de aseguramiento de calidad durante la implementación en entornos de desarrollo y producción: configuración de `.env`, PostgreSQL, Uvicorn y build de Vite.

### 2.1.4.6 Mantenimiento

Gestión de actualizaciones, correcciones de errores y nuevas funcionalidades (recuperación de contraseña, notificaciones por email) sin comprometer la calidad existente.

### 2.1.4.7 Medición y Mejora Continua

Métricas de calidad: cobertura de pruebas, defectos por módulo, tiempo de respuesta de API, satisfacción de usuarios de prueba.

### 2.1.4.8 Documentación y Revisiones

Procedimientos para documentar actividades de aseguramiento de calidad y realizar revisiones periódicas (SRR, PDR, CDR, auditorías).

### 2.1.4.9 Documentos de Referencia

| Estándar | Aplicación |
|----------|-----------|
| IEEE STD 730-1998 / 730.1-1995 | Planes de aseguramiento de calidad |
| ISO/IEC 25000 (SQuaRE) | Evaluación de calidad del producto |
| ISO/IEC 9126 / ISO/IEC 25010 | Modelo de calidad del software |
| ISO 9001 | Sistema de gestión de calidad |
| ISO/IEC 12207 | Procesos del ciclo de vida del software |
| ISO/IEC 15504 (SPICE) | Evaluación y mejora de procesos |
| ANSI/IEEE Std 830 | Especificación de requisitos (SRS) |
| ANSI/IEEE Std 1016 | Descripción del diseño (SDD) |
| ANSI/IEEE Std 829 / 1008 / 1012 | Verificación y validación (PVVS) |
| ANSI/IEEE Std 1063 | Documentación del usuario (UD) |
| ANSI/IEEE Std 1028 | Revisiones y auditorías |

## 2.1.5 Alcance de gestión del SQAP

En la gestión del SQAP de GymPro, se coordina el equipo de calidad, se asignan roles y responsabilidades, se desarrollan procesos para cada etapa del proyecto y se realiza seguimiento riguroso del cumplimiento de estándares. Se fomenta la comunicación entre equipos de backend, frontend y pruebas, con monitoreo continuo para identificar desviaciones de calidad.

## 2.1.6 Organización

### Estructura organizativa del proyecto GymPro

```
GymPro — UAGRM-GYM
├── Liderazgo del Proyecto
│   ├── Líder de Proyecto / Gerente
│   └── Consultor Académico (Docente IS II)
├── Equipo de Gestión de Proyectos
│   ├── Gerente de Proyecto
│   ├── Coordinador de Proyecto
│   └── Analista de Proyectos
├── Equipo de Desarrollo
│   ├── Arquitecto de Software
│   ├── Ingeniero Backend (FastAPI / PostgreSQL)
│   ├── Ingeniero Frontend (React / TypeScript)
│   └── Ingeniero Full-stack
├── Equipo de Calidad y Pruebas
│   ├── Gerente de Calidad del Software (SQA)
│   ├── Ingeniero de Pruebas
│   └── Analista de Control de Calidad
├── Interfaz con el Cliente
│   ├── Representante del Gimnasio (Usuario final)
│   └── Especialista UX
└── Colaboradores Externos
    ├── Docente / Consultor académico
    └── Stakeholders (administración del gimnasio)
```

## 2.1.6 Tareas

| Área | Tareas |
|------|--------|
| **Gestión de Proyectos** | Planificación, coordinación de recursos, seguimiento de progreso, gestión de riesgos |
| **Desarrollo Backend** | Modelos SQLAlchemy, servicios de negocio, endpoints API, migraciones Alembic, JWT y NFC |
| **Desarrollo Frontend** | Componentes React, rutas por rol, integración API, UI con shadcn/ui y Tailwind |
| **Control de Calidad** | Estándares de codificación, pruebas, revisiones formales, informes SQA |
| **Interacción con Usuario** | Recopilación de requisitos del gimnasio, demostraciones, validación de aceptación |

## 2.1.7 Roles y Responsabilidades

### 2.1.7.1 Liderazgo del Proyecto

- **Líder de Proyecto:** Define visión y estrategia, toma decisiones clave, representa al equipo ante el docente y stakeholders.
- **Consultor Académico (Docente):** Supervisa el cumplimiento del SQAP, evalúa entregables y guía metodológica.

### 2.1.7.2 Equipo de Gestión de Proyectos

- **Gerente de Proyecto:** Planifica, organiza y supervisa la ejecución; coordina equipos; gestiona riesgos.
- **Coordinador de Proyecto:** Asiste en planificación, coordina comunicación, actualiza informes de estado.
- **Analista de Proyectos:** Recopila y analiza requisitos del gimnasio; elabora planes detallados.

### 2.1.7.3 Equipo de Desarrollo

- **Arquitecto de Software:** Diseña arquitectura cliente-servidor, modelo de datos y estándares técnicos.
- **Ingeniero Backend:** Desarrolla API FastAPI, servicios, autenticación JWT, lógica NFC y migraciones.
- **Ingeniero Frontend:** Desarrolla panel React, rutas protegidas por rol, formularios CRUD y dashboard.
- **Ingeniero Full-stack:** Integra frontend-backend, configura despliegue y variables de entorno.

### 2.1.7.4 Equipo de Calidad y Pruebas

- **Gerente de Calidad (SQA):** Establece estándares y procesos de calidad; supervisa pruebas y revisiones.
- **Ingeniero de Pruebas:** Diseña y ejecuta planes de prueba; documenta resultados; reporta defectos.
- **Analista de Control de Calidad:** Verifica cumplimiento de estándares de codificación y documentación.

---

## 2.1.7 Documentación

### 2.1.7.1 Propósito

La documentación en el SQAP de GymPro es clave para mantener la organización y asegurar la calidad en cada etapa. Establece reglas claras y procesos definidos que guían al equipo en el desarrollo del sistema de gestión de gimnasio, sirviendo como referencia para todos los involucrados.

### 2.1.7.2 Requisitos Mínimos de Documentación

#### 2.1.7.2.1 Especificación de Requisitos de Software (SRS)

La SRS de GymPro describe las funciones, características y comportamientos esperados del sistema de gestión de gimnasio, con enfoque centrado en los usuarios (admin, recepción, instructor, estudiante).

**Modelo de contenido del SRS:**

```
1. INTRODUCCIÓN
   1.1 Objetivo
   1.2 Alcance
   1.3 Definiciones, acrónimos y abreviaciones
   1.4 Referencias
   1.5 Revisión
2. DESCRIPCIÓN GENERAL
   2.1 Perspectiva del producto
   2.2 Funciones del producto
   2.3 Características de los usuarios
   2.4 Restricciones generales
   2.5 Asunciones y dependencias
3. ESPECIFICACIÓN DE REQUERIMIENTOS
   3.1 Requerimientos Funcionales
       - RF-01: Autenticación y autorización (JWT, roles)
       - RF-02: Gestión de usuarios y estudiantes
       - RF-03: Control de acceso NFC
       - RF-04: Gestión de membresías y pagos
       - RF-05: Gestión de instructores, actividades y reservas
       - RF-06: Gestión de máquinas, ejercicios y rutinas
       - RF-07: Notificaciones y reportes
       - RF-08: Recuperación de contraseña
   3.2 Requerimientos No Funcionales
       - RNF-01: Seguridad (JWT, bcrypt, RBAC)
       - RNF-02: Rendimiento (respuesta API < 500ms)
       - RNF-03: Usabilidad (UI responsive, accesible por rol)
       - RNF-04: Mantenibilidad (arquitectura modular)
       - RNF-05: Disponibilidad (99% en horario del gimnasio)
4. APÉNDICES
5. ÍNDICE
6. ANEXOS
```

#### 2.1.7.2.2 Descripción del Diseño del Software (SDD)

La SDD de GymPro sigue ANSI/IEEE Std 1016, describiendo la arquitectura cliente-servidor, módulos y entidades de datos.

**Vistas de diseño:**

| Vista | Alcance | Representación |
|-------|---------|----------------|
| Descomposición | Partición en backend/frontend y módulos API | Diagrama de componentes |
| Dependencia | Relaciones entre servicios, modelos y endpoints | Tablas de dependencias |
| Interfaces | API REST, interfaces de usuario por rol | Diagramas de flujo, OpenAPI/Swagger |
| Detalle | Lógica interna de servicios (acceso NFC, pagos, rutinas) | Diagramas de secuencia |

**Modelo de contenido del SDD:**

```
1. INTRODUCCIÓN
2. REFERENCIAS
3. DESCRIPCIÓN DE DESCOMPOSICIÓN
   3.1 Módulos Backend (FastAPI)
       3.1.1 auth — Autenticación JWT
       3.1.2 usuarios — Gestión de usuarios
       3.1.3 estudiantes — CRUD estudiantes + NFC
       3.1.4 instructores — Gestión de instructores
       3.1.5 acceso — Control NFC
       3.1.6 membresias — Tipos de membresía
       3.1.7 pagos — Registro de pagos
       3.1.8 rutinas / ejercicios — Planes de entrenamiento
       3.1.9 actividades / reservas — Clases y reservas
       3.1.10 maquinas — Equipamiento
       3.1.11 notificaciones — Alertas
       3.1.12 reportes — Dashboard y KPIs
   3.2 Módulos Frontend (React)
       3.2.1 Panel Admin/Recepción
       3.2.2 Panel Instructor
       3.2.3 Panel Estudiante
   3.3 Entidades de datos (PostgreSQL)
4. DESCRIPCIÓN DE DEPENDENCIAS
5. DESCRIPCIÓN DE INTERFACES
6. DISEÑO DETALLADO
7. APÉNDICES
```

#### 2.1.7.2.3 Plan de Verificación y Validación de Software (PVVS)

El PVVS de GymPro asegura la calidad y rendimiento del sistema mediante verificación y validación en cada fase.

**Objetivos del PVVS:**

- Validar que los requisitos de la SRS sean aprobados por el equipo y el docente.
- Verificar que el diseño (SDD) implemente correctamente los requisitos.
- Asegurar que el código refleje fielmente el diseño.
- Validar que el software ejecutado cumpla los requisitos funcionales y no funcionales.

**Modelo de contenido del PVVS:**

```
1. OBJETIVO
2. ALCANCE
3. DEFINICIONES, ACRÓNIMOS Y ABREVIACIONES
4. ORGANIZACIÓN RESPONSABLES
5. CICLO DE VIDA DE VERIFICACIÓN Y VALIDACIÓN
6. APÉNDICE
7. ÍNDICE
```

**Ciclo de vida de V&V — GymPro:**

| Proceso | Actividades | Tareas específicas GymPro |
|---------|-------------|--------------------------|
| Gestión | Planificación PVVS, criterios V&V, asignación de recursos | Definir calendario de pruebas por sprint/entrega |
| Adquisición | Evaluación de componentes externos | Validar dependencias: FastAPI, React, PostgreSQL, librerías npm/pip |
| Suministro | Integración de componentes | Verificar compatibilidad de versiones en requirements.txt y package.json |
| Desarrollo | Diseño, codificación, pruebas unitarias | Probar servicios (acceso_service, usuario_service), endpoints con httpx |
| Operación | Despliegue y monitoreo | Verificar health check `/health`, Swagger `/docs` |
| Mantenimiento | Parches y actualizaciones | Probar regresión tras cambios en auth, NFC, membresías |

#### 2.1.7.2.4 Informe de Verificación y Validación de Software (IVVS)

El IVVS documenta los resultados de las actividades de V&V: pruebas de unidad, integración, sistema y aceptación. Incluye defectos encontrados y acciones correctivas.

**Casos de prueba mínimos para GymPro:**

| ID | Módulo | Caso de prueba | Resultado esperado |
|----|--------|----------------|-------------------|
| TC-01 | Auth | Login con credenciales válidas | JWT retornado, redirección por rol |
| TC-02 | Auth | Login con credenciales inválidas | Error 401 |
| TC-03 | NFC | Escaneo UID registrado con membresía activa | Acceso concedido |
| TC-04 | NFC | Escaneo UID sin membresía vigente | Acceso denegado |
| TC-05 | Estudiantes | Crear estudiante (admin) | Estudiante creado en BD |
| TC-06 | Membresías | Asignar membresía a estudiante | Estado membresía actualizado |
| TC-07 | Reservas | Reservar actividad (estudiante) | Reserva registrada |
| TC-08 | Reportes | Dashboard KPIs (admin) | Métricas cargadas correctamente |
| TC-09 | Roles | Acceso a ruta admin sin rol admin | Redirección a home del rol |
| TC-10 | Pagos | Registrar pago de membresía | Pago registrado y visible |

#### 2.1.7.2.5 Documentación del Usuario (UD)

La UD de GymPro proporciona instrucciones claras para cada rol del sistema.

**Contenido mínimo por rol:**

| Rol | Secciones de la UD |
|-----|-------------------|
| Administrador | Gestión de usuarios, instructores, configuración del sistema, reportes |
| Recepción | Registro de estudiantes, control NFC, membresías, pagos, reservas |
| Instructor | Consulta de rutinas, actividades y reservas asignadas |
| Estudiante | Consulta de acceso NFC, rutina, reservas, notificaciones y actividades |

**Modelo de contenido del UD:**

```
1. TÍTULO
2. RESTRICCIONES
3. TABLA DE CONTENIDO
4. INTRODUCCIÓN
   4.1 Audiencia (admin, recepción, instructor, estudiante)
   4.2 Aplicación (UAGRM-GYM / GymPro)
   4.3 Objetivos
5. CUERPO — MODO INSTRUCCIONAL
   5.1 Inicio de sesión y recuperación de contraseña
   5.2 Panel de administración
   5.3 Control de acceso NFC
   5.4 Gestión de membresías y pagos
   5.5 Rutinas y ejercicios
   5.6 Reservas de actividades
6. CUERPO — MODO REFERENCIA
   6.1 Mensajes de error
   6.2 Glosario (NFC, JWT, membresía, rutina)
7. ANEXOS
8. BIBLIOGRAFÍA
```

#### 2.1.7.2.6 Plan de Gestión de Configuración del Software (SCMP)

El SCMP de GymPro establece procesos para identificar, controlar e implementar cambios en el software.

**Elementos de configuración (CI) identificados:**

| CI | Ubicación | Descripción |
|----|-----------|-------------|
| Código backend | `gimnasio_back/app/` | Modelos, servicios, endpoints, schemas |
| Código frontend | `gimnasio_front/src/` | Páginas, componentes, rutas, servicios API |
| Configuración | `.env`, `.env.example`, `config.py` | Variables de entorno y settings |
| Base de datos | `migrations/versions/` | Migraciones Alembic |
| Dependencias | `requirements.txt`, `package.json` | Paquetes Python y npm |
| Documentación | `docs/`, `README.md` | SRS, SDD, SQAP, manuales |

**Procesos de configuración:**

1. **Identificación de CI:** Todos los artefactos listados son elementos bajo control.
2. **Control de cambios:** Solicitudes vía issues/pull requests en Git; revisión por pares antes de merge.
3. **Implementación de cambios:** Merge a rama principal tras aprobación; migraciones Alembic para cambios de BD.
4. **Registro y reporte:** Historial de commits Git; changelog por entrega académica.

---

## 2.1.9 Estándares, Prácticas y Convenciones

### 2.1.9.1 Estándar de Codificación

#### Backend (Python / FastAPI)

- El software se subdivide en módulos independientes: `models/`, `schemas/`, `services/`, `api/v1/endpoints/`.
- Cada módulo debe documentar su objetivo en docstring al inicio del archivo.
- Nombres de funciones en `snake_case` que indiquen su funcionalidad.
- Cada endpoint debe tener tipado con Pydantic v2 para entrada y salida.
- Una instrucción principal por línea; máximo 120 caracteres por línea.
- Mensajes de error HTTP deben indicar el contexto (ej. `HTTPException` con `detail` descriptivo).

**Formato de documentación de módulo backend:**

```
Nombre del módulo: acceso_service.py
Objetivo: Lógica de negocio para control de acceso NFC
Entradas: nfc_uid (string), sesión de BD
Salidas: AccesoResponse (concedido/denegado, mensaje)
Autor: [nombre]
Fecha de creación: [fecha]
Historial de actualizaciones:
  - v1.0 [fecha]: Implementación inicial
  - v1.1 [fecha]: Validación de membresía vigente
```

#### Frontend (TypeScript / React)

- Componentes en `PascalCase`; hooks y utilidades en `camelCase`.
- Archivos de página en `src/pages/` organizados por rol (`admin/`, `instructor/`, `student/`).
- Servicios API centralizados en `src/api/services.ts`.
- Tipos compartidos en `src/types/index.ts`.
- Componentes UI reutilizables en `src/components/ui/` (shadcn).
- Props tipadas con interfaces TypeScript.

### 2.1.9.2 Estándar de Comentarios

- Los comentarios explican **por qué** se realiza una acción, no **qué** hace el código obvio.
- Comentarios de múltiples líneas para descripciones de módulos y lógica de negocio compleja.
- Comentarios de una línea para especificaciones puntuales.
- En el backend, docstrings en funciones públicas de servicios.
- En el frontend, comentarios solo en lógica no evidente (ej. filtros de rol, permisos).

### 2.1.9.3 Estándar de verificar el cumplimiento

Responsables de verificar el cumplimiento:

- **Líder del equipo de desarrollo** — Revisión de código y arquitectura.
- **Organización SQA** — Verificación de estándares, documentación y pruebas.
- **Docente / Consultor académico** — Evaluación de entregables y conformidad con el SQAP.

### 2.1.9.4 Patrón de Desarrollo

GymPro adopta el patrón **Cliente-Servidor** con arquitectura de **tres capas**:

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                  │
│         React + TypeScript + Tailwind + shadcn/ui        │
│    (Login, Dashboard, CRUD, NFC, Reservas, Reportes)     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON (REST API)
                         │ JWT Authorization Header
┌────────────────────────▼────────────────────────────────┐
│                    CAPA DE LÓGICA                        │
│              FastAPI + Services + Schemas                 │
│    (auth, acceso, membresías, pagos, rutinas, etc.)      │
└────────────────────────┬────────────────────────────────┘
                         │ SQLAlchemy async
┌────────────────────────▼────────────────────────────────┐
│                    CAPA DE DATOS                         │
│                   PostgreSQL + Alembic                   │
│    (usuarios, estudiantes, accesos, membresías, etc.)    │
└─────────────────────────────────────────────────────────┘
```

**Ventajas para GymPro:**

- **Escalabilidad:** Backend y frontend se despliegan y escalan de forma independiente.
- **Mantenimiento:** Cambios en la UI no afectan la lógica de negocio y viceversa.
- **Seguridad:** Autenticación centralizada en el servidor; el cliente solo almacena el JWT.
- **Reutilización:** La API REST puede servir a futuras apps móviles o integraciones NFC.

**Metodología de desarrollo:** Ágil (Scrum adaptado a proyecto académico) con iteraciones por módulo funcional.

---

## 2.1.10 Revisión y Auditorías

Las revisiones involucran evaluación minuciosa de componentes, procesos y documentos. Responsables: organización SQA con participación de diseñadores, desarrolladores y agentes de pruebas.

### Revisiones obligatorias

| Revisión | Sigla | Objetivo | Producto GymPro |
|----------|-------|----------|-----------------|
| Revisión de Requisitos | SRR | Verificar SRS correcta y completa | SRS de UAGRM-GYM |
| Revisión de Diseño Preliminar | PDR | Evaluar arquitectura y modelo de datos | SDD preliminar |
| Revisión de Diseño Crítico | CDR | Verificar SDD vs SRS | SDD detallado |
| Revisión del Plan V&V | SVVPR | Evaluar métodos de verificación | PVVS |
| Auditoría Funcional | — | Verificar cumplimiento de requisitos | Sistema completo |
| Auditoría Física | PA | Coherencia código-documentación | Repositorio + docs |
| Auditoría de Proceso | IPA | Consistencia diseño-implementación | Proceso de desarrollo |
| Revisión de Gestión | — | Evaluar ejecución del SQAP | SQAP + informes |

### 2.1.10.1 Evaluación de la calidad de los productos

- **Objetivo:** Detectar desviaciones respecto a estándares y objetivos de calidad.
- **Proceso:** Revisión de productos críticos (SRS, SDD, código de acceso NFC, módulo de auth).
- **Resultado:** Informe SQA con desviaciones y medidas correctivas.

### 2.1.10.2 Revisar el ajuste al proceso

- **Objetivo:** Verificar que los productos se obtuvieron siguiendo el modelo de proceso definido.
- **Proceso:** Trazabilidad desde SRS → SDD → código → pruebas.
- **Resultado:** Informe de ajuste al proceso SQA.

### 2.1.10.3 Revisión Técnica Formal (RTF)

- **Objetivo:** Identificar errores en función, lógica o implementación.
- **Proceso:** Evaluación rigurosa con SQA y equipo de desarrollo; informe de hallazgos.
- **Participantes:** SQA, arquitecto, desarrolladores backend/frontend.

### 2.1.10.4 Requerimientos Mínimos y Cronograma de Revisiones

| Entregable | Fase / Iteración | Semana | Tipo de revisión |
|------------|------------------|--------|------------------|
| SRS — UAGRM-GYM | Requisitos — Iteración 1 | Semana 2 | SRR |
| SDD — Arquitectura | Diseño — Iteración 1 | Semana 4 | PDR |
| SDD — Detallado | Diseño — Iteración 2 | Semana 6 | CDR |
| PVVS | Verificación — Iteración 1 | Semana 5 | SVVPR |
| Código Backend (API) | Implementación — Iteración 2 | Semana 8 | RTF |
| Código Frontend (UI) | Implementación — Iteración 3 | Semana 10 | RTF |
| Sistema completo | Pruebas — Iteración 4 | Semana 12 | Auditoría Funcional |
| Documentación + Código | Entrega final | Semana 14 | Auditoría Física (PA) |
| SQAP + Proceso | Gestión — Continuo | Semana 14 | Revisión de Gestión |

**Elementos mínimos a revisar:**

- Especificación de Requerimientos (SRS)
- Modelo de Diseño y Descripción de la Arquitectura (SDD)
- Plan de Verificación y Validación (PVVS)
- Plan de Gestión del Proyecto
- Plan de Gestión de Configuración (SCMP)
- Diseño vs. Especificación de requerimientos
- Implementación vs. Diseño
- Verificación vs. Especificación de requerimientos

---

## 2.1.11 Gestión de Configuración

Actividades mínimas de SQA en gestión de configuración:

- Verificar que la **línea base del proyecto** se haya creado según el modelo de proceso.
- Asegurar que la línea base sea precisa y se ajuste a las especificaciones.
- Revisiones periódicas del control de configuración (SCM) sobre requisitos, diseño, código y documentación.
- Supervisar el **Comité de Control de Cambios** según el SCMP.

**Línea base del proyecto GymPro:**

| Línea base | Contenido | Versión |
|------------|-----------|---------|
| LB-REQ | SRS aprobada | v1.0 |
| LB-DES | SDD aprobado | v1.0 |
| LB-COD-BE | Código backend estable | v1.0 |
| LB-COD-FE | Código frontend estable | v1.0 |
| LB-DOC | Documentación completa | v1.0 |

---

## 2.1.12 Gestión de problemas y acciones correlativas

**Objetivos del sistema de gestión de problemas:**

- Garantizar que todos los problemas se documenten, aborden y no se pasen por alto.
- Evaluar la autenticidad de los informes.
- Proporcionar retroalimentación constante a desarrolladores y usuarios.
- Suministrar datos para medir y predecir la calidad del software.

**Formato de informe de problema:**

| Campo | Descripción |
|-------|-------------|
| ID | Identificador único (ej. BUG-001) |
| Fecha de detección | Fecha y hora |
| Detectado por | Nombre del integrante o usuario |
| Módulo | Backend/Frontend — módulo afectado |
| Severidad | Crítica / Alta / Media / Baja |
| Descripción | Descripción detallada del problema |
| Pasos para reproducir | Secuencia de acciones |
| Estado | Abierto / En progreso / Resuelto / Cerrado |
| Acción correctiva | Solución implementada |

**Organización responsable:** Equipo SQA bajo supervisión del docente/consultor académico.

**Ejemplos de problemas típicos en GymPro:**

| ID | Módulo | Descripción | Severidad |
|----|--------|-------------|-----------|
| BUG-001 | NFC | Acceso concedido con membresía vencida | Crítica |
| BUG-002 | Auth | Token JWT no se renueva tras expiración | Alta |
| BUG-003 | Frontend | Ruta admin accesible sin rol admin | Alta |
| BUG-004 | Pagos | Monto no se refleja en dashboard | Media |
| BUG-005 | UI | Sidebar no filtra opciones para recepción | Baja |

---

## 2.1.13 Herramientas Técnicas y Metodologías

### Herramientas de desarrollo

| Categoría | Herramienta | Uso en GymPro |
|-----------|------------|---------------|
| Sistema operativo | Windows 10/11, Linux | Desarrollo y despliegue |
| IDE | Visual Studio Code / Cursor | Edición de código |
| Control de versiones | Git + GitHub | Repositorio del proyecto |
| Backend runtime | Python 3.11+, Uvicorn | Servidor API |
| Frontend tooling | Node.js 18+, Vite | Build y desarrollo React |
| Base de datos | PostgreSQL 14+, pgAdmin/psql | Almacenamiento |
| Migraciones | Alembic | Control de esquema BD |
| API docs | Swagger UI / ReDoc | Documentación interactiva (`/docs`) |
| Testing HTTP | httpx, Postman | Pruebas de endpoints |
| Debugging | Debugger de VS Code, DevTools | Depuración backend/frontend |
| Análisis de código | ESLint, TypeScript compiler | Calidad frontend |
| UI | Tailwind CSS, shadcn/ui, Lucide | Componentes visuales |
| Estado/Caché | TanStack React Query | Gestión de datos en frontend |
| Email | aiosmtplib | Notificaciones y recuperación de contraseña |

### Estándares y guías aplicadas

- ANSI/IEEE Std 830 — Guía para Especificación de Requisitos de Software
- ANSI/IEEE Std 1016 — Práctica recomendada para Descripciones de Diseño de Software
- ANSI/IEEE Std 1008 — Estándar para Pruebas Unitarias de Software
- ANSI/IEEE Std 1063 — Estándar para Documentación del Usuario de Software
- ANSI/IEEE Std 1028 — Estándar para Revisiones y Auditorías de Software

### Metodología

- **Scrum adaptado** para proyecto académico con sprints por módulo funcional.
- **Revisión de código** (code review) antes de cada merge.
- **Integración continua** manual: verificar build backend + frontend antes de cada entrega.

---

## 2.1.14 Control de Código

El control de código de GymPro se gestiona mediante **Git**:

| Aspecto | Detalle |
|---------|---------|
| Software bajo control | `gimnasio_back/`, `gimnasio_front/`, `docs/` |
| Identificación | Commits con mensajes descriptivos; tags por versión (v1.0, v1.1) |
| Ubicación | Repositorio Git remoto (GitHub) + copia local en máquinas del equipo |
| Copias de seguridad | Repositorio remoto + branches de respaldo |
| Distribución | Clone del repositorio; `.env` no versionado (`.gitignore`) |
| Documentación afectada | README, docs/SRS, docs/SDD, docs/SQAP actualizados con cada cambio mayor |
| Nueva versión | Tag Git + actualización de changelog + migración Alembic si aplica |

**Ramas del repositorio:**

| Rama | Propósito |
|------|-----------|
| `main` | Código estable y entregable |
| `develop` | Integración de features en progreso |
| `feature/*` | Desarrollo de funcionalidades específicas |
| `fix/*` | Corrección de defectos |

**Archivos excluidos del control (`.gitignore`):**

- `.env` (credenciales)
- `venv/` / `node_modules/`
- `__pycache__/`
- Archivos de build (`dist/`)

---

## 2.1.15 Control de Medios

**Responsable:** Equipo de desarrollo bajo supervisión SQA.

**Medidas de protección:**

- Almacenamiento y recuperación confiable del software.
- Acceso restringido solo a integrantes del equipo.
- Control del entorno para evitar degradación del medio físico.
- Copias seguras del código fuente fuera de las instalaciones del equipo.

**Medios de almacenamiento:**

| Medio | Uso | Contenido |
|-------|-----|-----------|
| Disco duro (SSD/HDD) | Primario | Código fuente, entorno de desarrollo |
| Repositorio Git remoto | Respaldo principal | Historial completo del proyecto |
| USB / Nube (Google Drive, OneDrive) | Respaldo secundario | Copias periódicas del repositorio |
| Documentación impresa | Respaldo físico | SRS, SDD, SQAP, PVVS |

**Copias de seguridad:** Al finalizar cada sesión de trabajo significativa y antes de cada entrega académica. Registro con fecha y hora.

**Control de acceso:**

- Cuentas individuales en GitHub para cada integrante.
- Variables de entorno (`.env`) con credenciales de BD y JWT solo en máquinas locales.
- Roles de usuario en la aplicación (admin, recepción, instructor, estudiante) con permisos diferenciados.

---

## 2.1.16 Control de Suministros y Subcontratos

GymPro utiliza componentes y servicios externos que deben cumplir estándares de calidad:

| Suministro | Proveedor | Control de calidad |
|------------|-----------|-------------------|
| Framework backend | FastAPI (open source) | Versión fijada en requirements.txt |
| ORM | SQLAlchemy 2.0 | Verificación de compatibilidad con PostgreSQL |
| Framework frontend | React 18 + Vite | Versión fijada en package.json |
| Base de datos | PostgreSQL 14+ | Instalación verificada, backups periódicos |
| Componentes UI | shadcn/ui + Radix | Revisión de accesibilidad y compatibilidad |
| Servicio de email | SMTP (aiosmtplib) | Pruebas de envío en entorno de desarrollo |

No se utilizan subcontratos de desarrollo; todo el software es desarrollado por el equipo del proyecto.

---

## 2.1.17 Recolección, Mantenimiento y Retención de Registros

**Responsables:** Consultor académico (docente) en coordinación con el equipo SQA.

### Documentos a preservar

| Documento | Retención | Ubicación |
|-----------|-----------|-----------|
| Plan de Aseguramiento de Calidad (SQAP) | Permanente | `docs/SQAP-UAGRM-GYM.md` |
| Especificación de Requisitos (SRS) | Permanente | `docs/SRS-UAGRM-GYM.md` |
| Descripción del Diseño (SDD) | Permanente | `docs/SDD-UAGRM-GYM.md` |
| Plan de Verificación y Validación (PVVS) | Permanente | `docs/PVVS-UAGRM-GYM.md` |
| Informe de Verificación y Validación (IVVS) | Permanente | `docs/IVVS-UAGRM-GYM.md` |
| Documentación del Usuario (UD) | Permanente | `docs/UD-UAGRM-GYM.md` |
| Plan de Gestión de Configuración (SCMP) | Permanente | `docs/SCMP-UAGRM-GYM.md` |
| Informes de revisión y auditoría | 2 años | `docs/informes/` |
| Informes de problemas (bugs) | 2 años | `docs/informes/bugs/` |
| Código fuente versionado | Permanente | Repositorio Git |

### Mantenimiento de registros

- Actualizaciones sucesivas con registro de modificaciones (versión, fecha, autor, motivo).
- Documentos verificados y validados se registran con fecha de aprobación.
- Tres copias de cada documento crítico en ubicaciones diferentes (repositorio Git, nube, impreso).
- Retención al concluir cada fase del ciclo de vida y en puntos de verificación del docente.

### Medios físicos de prueba

Se conservan los medios que almacenan versiones de programas y materiales de prueba (scripts de prueba, datos de prueba de NFC, capturas de pantalla de resultados) para permitir repetir las pruebas si fuera necesario.

---

## Anexo A — Resumen técnico del proyecto UAGRM-GYM

### Stack tecnológico completo

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework API | FastAPI | 0.115.0 |
| Servidor | Uvicorn | 0.30.6 |
| ORM | SQLAlchemy (async) | 2.0.35 |
| Driver BD | asyncpg | ≥ 0.29.0 |
| BD | PostgreSQL | 14+ |
| Migraciones | Alembic | 1.13.3 |
| Validación | Pydantic | 2.9.2 |
| Auth | python-jose + passlib/bcrypt | JWT |
| Email | aiosmtplib | 3.0.2 |
| Frontend | React + TypeScript | 18.3 / 5.6 |
| Build | Vite | 5.4 |
| Estilos | Tailwind CSS + shadcn/ui | 3.4 |
| HTTP Client | Axios + React Query | — |
| Routing | React Router DOM | 6.28 |

### Endpoints principales de la API

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| POST | `/api/v1/auth/login` | Login → JWT | Público |
| POST | `/api/v1/auth/register` | Registro de usuario | Público |
| POST | `/api/v1/auth/forgot-password` | Recuperación de contraseña | Público |
| GET | `/api/v1/auth/me` | Perfil del usuario autenticado | Auth |
| CRUD | `/api/v1/usuarios/` | Gestión de usuarios | Admin |
| CRUD | `/api/v1/estudiantes/` | Gestión de estudiantes | Staff |
| POST | `/api/v1/estudiantes/{id}/nfc` | Asignar UID NFC | Admin |
| POST | `/api/v1/acceso/nfc-scan` | Escaneo NFC en puerta | Dispositivo |
| GET | `/api/v1/acceso/historial` | Historial de accesos | Staff |
| CRUD | `/api/v1/membresias/` | Tipos de membresía | Staff |
| CRUD | `/api/v1/pagos/` | Registro de pagos | Staff |
| CRUD | `/api/v1/rutinas/` | Rutinas de entrenamiento | Admin/Instructor |
| CRUD | `/api/v1/ejercicios/` | Catálogo de ejercicios | Admin |
| CRUD | `/api/v1/actividades/` | Actividades grupales | Admin |
| CRUD | `/api/v1/maquinas/` | Equipamiento | Admin |
| CRUD | `/api/v1/reservas/` | Reservas de actividades | Auth |
| CRUD | `/api/v1/notificaciones/` | Alertas a usuarios | Admin |
| GET | `/api/v1/reportes/dashboard` | KPIs en tiempo real | Admin |
| GET | `/api/v1/reportes/accesos` | Reporte de accesos por fecha | Admin |

### Flujo de control de acceso NFC

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

---

*Documento generado para el proyecto UAGRM-GYM (GymPro) — Ingeniería de Software II*
*Versión: 1.0 — Fecha: Junio 2026*
