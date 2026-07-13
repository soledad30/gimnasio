"""
Carga datos de demostración coherentes para UAGRM-GYM.
Uso:
  python scripts/seed_demo.py          # solo si no hay datos demo
  python scripts/seed_demo.py --force  # borra demo anterior y vuelve a cargar

Genera ~500+ registros: estudiantes, instructores, accesos, pagos, reservas, etc.
Credenciales demo: estudiante1@demo.gympro.com / Demo123!
Admin: admin@gympro.com / admin123  (python scripts/seed_admin.py)
"""
from __future__ import annotations

import argparse
import asyncio
import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.acceso import Acceso
from app.models.actividad import Actividad
from app.models.administrador import Administrador
from app.models.asignacion_instructor import AsignacionInstructor
from app.models.asistencia import Asistencia
from app.models.ejercicio import Ejercicio
from app.models.estudiante import Estudiante
from app.models.inscripcion import Inscripcion
from app.models.instructor import Instructor
from app.models.maquina import Maquina
from app.models.mantenimiento_maquina import MantenimientoMaquina
from app.models.membresia import Membresia
from app.models.notificacion import Notificacion
from app.models.pago import Pago
from app.models.reporte import Reporte
from app.models.reserva import Reserva
from app.models.rutina import Rutina
from app.models.rutina_ejercicio import RutinaEjercicio
from app.models.sala import Sala
from app.models.usuario import Usuario
from app.services.inscripcion_service import ESTADO_CONFIRMADA, ESTADO_PENDIENTE_PAGO, generar_referencia_pago, primer_dia_mes
import app.models  # noqa: F401

DEMO_DOMAIN = "demo.gympro.com"
DEMO_PASSWORD = "Demo123!"
RNG = random.Random(42)

N_ESTUDIANTES = 85
N_INSTRUCTORES = 6
N_ACCESOS = 180
N_PAGOS = 95
N_RESERVAS = 75
N_NOTIFICACIONES = 50
N_ASISTENCIAS = 80
N_MAQUINAS = 14
N_MANTENIMIENTOS = 20

NOMBRES = [
    "María", "Juan", "Carlos", "Ana", "Luis", "Sofía", "Diego", "Valeria",
    "Roberto", "Camila", "Fernando", "Lucía", "Miguel", "Paula", "Andrés",
    "Daniela", "Jorge", "Gabriela", "Ricardo", "Elena", "Pablo", "Isabel",
    "Héctor", "Natalia", "Oscar", "Adriana", "Raúl", "Verónica", "Sergio",
    "Patricia", "Mauricio", "Claudia", "Eduardo", "Rosa", "Alberto",
]
APELLIDOS = [
    "Mamani", "Quispe", "Condori", "Flores", "Gutiérrez", "Rojas", "Vargas",
    "Chávez", "Pérez", "López", "Martínez", "García", "Torrez", "Aguilar",
    "Salazar", "Montaño", "Cabrera", "Ortiz", "Silva", "Mendoza", "Ramos",
    "Encinas", "Bustillos", "Aparicio", "Justiniano", "Terrazas", "Claure",
]
CARRERAS = [
    "Ingeniería Industrial", "Medicina", "Derecho", "Economía", "Informática",
    "Arquitectura", "Psicología", "Contaduría", "Enfermería", "Agronomía",
    "Comunicación Social", "Administración de Empresas", "Bioquímica",
]
PLANES = [
    ("mensual", 150, 30),
    ("trimestral", 400, 90),
    ("semestral", 700, 180),
    ("anual", 1200, 365),
]
METODOS_PAGO = ["efectivo", "transferencia", "qr", "tarjeta"]
MOTIVOS_DENEGADO = [
    "NFC no registrado en el sistema",
    "sin inscripción pagada este mes",
    "sin membresía",
    "Código no registrado en el sistema",
    "inscripción pendiente de pago",
]
ACTIVIDADES_DATA = [
    ("Yoga Matutino", "lunes,miercoles,viernes", "07:00", "08:00", "Estiramientos y respiración consciente"),
    ("CrossFit UAGRM", "martes,jueves", "18:00", "19:00", "Entrenamiento funcional de alta intensidad"),
    ("Spinning", "lunes,miercoles", "19:00", "20:00", "Cardio en bicicleta estática"),
    ("Zumba Fitness", "martes,jueves", "17:30", "18:30", "Baile y cardio latino"),
    ("Funcional Tarde", "lunes,martes,miercoles,jueves,viernes", "16:00", "17:00", "Circuitos con peso corporal"),
    ("Box Deportivo", "miercoles,viernes", "20:00", "21:00", "Técnica de box y acondicionamiento"),
    ("Pilates", "martes,jueves", "08:00", "09:00", "Core y postura"),
    ("HIIT Express", "lunes,miercoles,viernes", "12:00", "12:45", "Intervalos de 45 minutos"),
    ("GAP", "jueves", "19:00", "20:00", "Glúteos, abdomen y piernas"),
    ("Stretching", "viernes", "09:00", "10:00", "Flexibilidad y recuperación"),
]
MAQUINAS_DATA = [
    ("M-001", "Press de banca", "pecho", "Technogym", "Sala Máquinas"),
    ("M-002", "Leg press 45°", "piernas", "Life Fitness", "Sala Máquinas"),
    ("M-003", "Polea alta/baja", "espalda", "Precor", "Sala Máquinas"),
    ("M-004", "Elíptica Pro", "cardio", "Matrix", "Zona cardio"),
    ("M-005", "Cinta de correr T5", "cardio", "Technogym", "Zona cardio"),
    ("M-006", "Multipower sentadilla", "piernas", "Hammer Strength", "Sala Máquinas"),
    ("M-007", "Bíceps Scott", "bíceps", "Life Fitness", "Sala Máquinas"),
    ("M-008", "Remo sentado", "espalda", "Technogym", "Sala Máquinas"),
    ("M-009", "Bicicleta spinning", "cardio", "Keiser", "Sala Actividades 2"),
    ("M-010", "Hack squat", "piernas", "Hammer Strength", "Sala Máquinas"),
    ("M-011", "Extensión de cuádriceps", "piernas", "Precor", "Sala Máquinas"),
    ("M-012", "Pec deck", "pecho", "Technogym", "Sala Máquinas"),
    ("M-013", "Remo T-bar", "espalda", "Life Fitness", "Sala Máquinas"),
    ("M-014", "Escaladora", "cardio", "Matrix", "Zona cardio"),
]
INSTRUCTORES_DATA = [
    ("Carlos Mendoza", "CrossFit, Funcional, HIIT"),
    ("Ana Rodríguez", "Yoga, Pilates, Stretching"),
    ("Luis Terrazas", "Spinning, Cardio, GAP"),
    ("Patricia Justiniano", "Zumba, Rumba, Baile"),
    ("Roberto Encinas", "Box, Fuerza, Máquinas"),
    ("Daniela Claure", "Funcional, Rutinas personalizadas"),
]
NOTIF_TEMPLATES = [
    ("membresía", "Tu membresía vence pronto", "Renueva antes del {fecha} para seguir entrenando sin interrupciones."),
    ("reserva", "Reserva confirmada", "Tu cupo en {actividad} está confirmado para el {fecha}."),
    ("rutina", "Nueva rutina asignada", "Tu instructor te asignó la rutina «{rutina}». Revísala en la app."),
    ("pago", "Pago registrado", "Recibimos Bs {monto} por tu inscripción de {mes}. ¡Gracias!"),
    ("general", "Horario extendido", "Este fin de semana el gimnasio abre hasta las 21:00 hrs."),
]


def _nombre_completo() -> str:
    return f"{RNG.choice(NOMBRES)} {RNG.choice(APELLIDOS)} {RNG.choice(APELLIDOS)}"


def _email_demo(tipo: str, idx: int) -> str:
    return f"{tipo}{idx}@{DEMO_DOMAIN}"


def _nfc_uid(idx: int) -> str:
    return f"DEMO-NFC-{idx:05X}"


def _hora_int(h: int, m: int) -> int:
    return h * 100 + m


def _random_dt(start: date, end: date) -> datetime:
    days = max((end - start).days, 0)
    d = start + timedelta(days=RNG.randint(0, days))
    hour = RNG.choice([7, 8, 9, 10, 11, 12, 17, 18, 19, 20, 21])
    return datetime.combine(d, time(hour, RNG.randint(0, 59)), tzinfo=timezone.utc)


def _meses_recientes(n: int = 3) -> list[date]:
    hoy = date.today()
    mes = primer_dia_mes(hoy)
    meses = [mes]
    for _ in range(n - 1):
        if mes.month == 1:
            mes = date(mes.year - 1, 12, 1)
        else:
            mes = date(mes.year, mes.month - 1, 1)
        meses.append(mes)
    return meses


async def _demo_exists(db) -> bool:
    count = await db.scalar(
        select(func.count(Estudiante.id)).where(Estudiante.email.like(f"%@{DEMO_DOMAIN}"))
    )
    return (count or 0) > 0


async def _clear_demo(db) -> None:
    demo_est_ids = select(Estudiante.id).where(Estudiante.email.like(f"%@{DEMO_DOMAIN}"))
    demo_user_ids = select(Usuario.id).where(Usuario.email.like(f"%@{DEMO_DOMAIN}"))

    await db.execute(delete(Acceso).where(Acceso.estudiante_id.in_(demo_est_ids)))
    await db.execute(delete(Acceso).where(Acceso.nfc_uid_escaneado.like("DEMO-%")))
    await db.execute(delete(Asistencia).where(Asistencia.estudiante_id.in_(demo_est_ids)))
    await db.execute(delete(Notificacion).where(Notificacion.estudiante_id.in_(demo_est_ids)))
    await db.execute(delete(Reserva).where(Reserva.estudiante_id.in_(demo_est_ids)))
    await db.execute(delete(Pago).where(Pago.estudiante_id.in_(demo_est_ids)))
    await db.execute(delete(Inscripcion).where(Inscripcion.estudiante_id.in_(demo_est_ids)))

    demo_rutina_ids = select(Rutina.id).where(Rutina.estudiante_id.in_(demo_est_ids))
    await db.execute(delete(RutinaEjercicio).where(RutinaEjercicio.rutina_id.in_(demo_rutina_ids)))
    await db.execute(delete(Rutina).where(Rutina.estudiante_id.in_(demo_est_ids)))

    await db.execute(delete(Membresia).where(Membresia.estudiante_id.in_(demo_est_ids)))
    await db.execute(delete(Estudiante).where(Estudiante.id.in_(demo_est_ids)))

    demo_inst_ids = select(Instructor.id).join(Usuario).where(Usuario.email.like(f"%@{DEMO_DOMAIN}"))
    demo_act_ids = select(Actividad.id).where(Actividad.nombre.like("[Demo]%"))
    await db.execute(delete(Reserva).where(Reserva.actividad_id.in_(demo_act_ids)))
    await db.execute(delete(AsignacionInstructor).where(AsignacionInstructor.instructor_id.in_(demo_inst_ids)))
    await db.execute(delete(Actividad).where(Actividad.id.in_(demo_act_ids)))
    await db.execute(delete(MantenimientoMaquina).where(MantenimientoMaquina.maquina_id.in_(
        select(Maquina.id).where(Maquina.codigo.like("DEMO-%"))
    )))
    await db.execute(delete(Maquina).where(Maquina.codigo.like("DEMO-%")))
    await db.execute(delete(Instructor).where(Instructor.usuario_id.in_(demo_user_ids)))
    await db.execute(delete(Administrador).where(Administrador.email.like(f"%@{DEMO_DOMAIN}")))
    await db.execute(delete(Usuario).where(Usuario.email.like(f"%@{DEMO_DOMAIN}")))
    await db.commit()
    print("Datos demo anteriores eliminados.")


async def _ensure_admin(db) -> Administrador:
    result = await db.execute(select(Usuario).where(Usuario.email == "admin@gympro.com"))
    user = result.scalar_one_or_none()
    if not user:
        user = Usuario(
            nombre="Administrador UAGRM-GYM",
            email="admin@gympro.com",
            telefono="70000000",
            hashed_password=get_password_hash("admin123"),
            es_admin=True,
            rol="admin",
            activo=True,
        )
        db.add(user)
        await db.flush()
    admin_row = await db.execute(select(Administrador).where(Administrador.usuario_id == user.id))
    admin = admin_row.scalar_one_or_none()
    if not admin:
        admin = Administrador(usuario_id=user.id, nombre=user.nombre, email=user.email)
        db.add(admin)
        await db.flush()
    return admin


async def _ensure_salas(db) -> list[Sala]:
    result = await db.execute(select(Sala).order_by(Sala.id))
    salas = list(result.scalars().all())
    if len(salas) >= 3:
        return salas
    db.add_all([
        Sala(nombre="Sala Actividades 1", tipo="actividad", capacidad=25),
        Sala(nombre="Sala Actividades 2", tipo="actividad", capacidad=25),
        Sala(nombre="Sala Máquinas", tipo="maquinas", capacidad=40),
    ])
    await db.flush()
    result = await db.execute(select(Sala).order_by(Sala.id))
    return list(result.scalars().all())


async def _ensure_ejercicios(db) -> list[Ejercicio]:
    result = await db.execute(select(Ejercicio).order_by(Ejercicio.id))
    ejercicios = list(result.scalars().all())
    if ejercicios:
        return ejercicios
    db.add_all([
        Ejercicio(nombre="Plancha abdominal", grupo_muscular="abdomen", objetivo="abdomen", con_maquina=False),
        Ejercicio(nombre="Press de banca", grupo_muscular="pecho", objetivo="hipertrofia", con_maquina=True),
        Ejercicio(nombre="Sentadilla libre", grupo_muscular="piernas", objetivo="fuerza", con_maquina=False),
        Ejercicio(nombre="Peso muerto", grupo_muscular="espalda", objetivo="fuerza", con_maquina=False),
        Ejercicio(nombre="Curl de bíceps", grupo_muscular="bíceps", objetivo="hipertrofia", con_maquina=True),
        Ejercicio(nombre="Remo con cable", grupo_muscular="espalda", objetivo="hipertrofia", con_maquina=True),
        Ejercicio(nombre="Elíptica", grupo_muscular="cardio", objetivo="resistencia", con_maquina=True),
        Ejercicio(nombre="Burpees", grupo_muscular="cuerpo completo", objetivo="perdida_peso", con_maquina=False),
        Ejercicio(nombre="Dominadas", grupo_muscular="espalda", objetivo="fuerza", con_maquina=False),
        Ejercicio(nombre="Zancadas", grupo_muscular="piernas", objetivo="hipertrofia", con_maquina=False),
    ])
    await db.flush()
    result = await db.execute(select(Ejercicio).order_by(Ejercicio.id))
    return list(result.scalars().all())


async def seed_demo(force: bool = False) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        if await _demo_exists(db):
            if not force:
                print(f"Ya existen datos demo (@{DEMO_DOMAIN}). Usa --force para recargar.")
                return
            await _clear_demo(db)

        admin = await _ensure_admin(db)
        salas = await _ensure_salas(db)
        ejercicios = await _ensure_ejercicios(db)
        sala_act = next(s for s in salas if s.tipo == "actividad")
        sala_act2 = next((s for s in salas if s.tipo == "actividad" and s.id != sala_act.id), sala_act)
        hoy = date.today()
        mes_actual = primer_dia_mes(hoy)
        meses = _meses_recientes(3)
        inicio_hist = hoy - timedelta(days=75)
        hash_pw = get_password_hash(DEMO_PASSWORD)

        # --- Instructores ---
        instructores: list[Instructor] = []
        for i, (nombre, esp) in enumerate(INSTRUCTORES_DATA, start=1):
            email = _email_demo("instructor", i)
            user = Usuario(
                nombre=nombre,
                email=email,
                telefono=f"7{RNG.randint(1000000, 9999999)}",
                hashed_password=hash_pw,
                es_admin=False,
                rol="instructor",
                activo=True,
            )
            db.add(user)
            await db.flush()
            inst = Instructor(usuario_id=user.id, nombre=nombre, especialidad=esp)
            db.add(inst)
            instructores.append(inst)
        await db.flush()

        # --- Máquinas ---
        maquinas: list[Maquina] = []
        for i, (codigo, nombre, cat, marca, ubic) in enumerate(MAQUINAS_DATA[:N_MAQUINAS], start=1):
            m = Maquina(
                codigo=f"DEMO-{codigo}",
                nombre=nombre,
                descripcion=f"Equipo {marca} para {cat}",
                categoria=cat,
                marca=marca,
                ubicacion=ubic,
                instructor_id=RNG.choice(instructores).id,
                estado_maquina=RNG.choice(["disponible", "disponible", "disponible", "mantenimiento"]),
                anios_vida_util=RNG.randint(5, 12),
                fecha_adquisicion=hoy - timedelta(days=RNG.randint(365, 2000)),
            )
            db.add(m)
            maquinas.append(m)
        await db.flush()

        # --- Actividades ---
        actividades: list[Actividad] = []
        for i, (nombre, dias, hi, hf, desc) in enumerate(ACTIVIDADES_DATA, start=1):
            act = Actividad(
                nombre=f"[Demo] {nombre}",
                descripcion=desc,
                instructor_id=instructores[i % len(instructores)].id,
                sala_id=sala_act.id if i % 2 else sala_act2.id,
                dia_semana=dias,
                hora_inicio=hi,
                hora_fin=hf,
                capacidad=RNG.randint(15, 25),
                vigencia_tipo="mes",
                vigencia_inicio=mes_actual,
                vigencia_fin=date(mes_actual.year, mes_actual.month, 28) + timedelta(days=4),
            )
            db.add(act)
            actividades.append(act)
        await db.flush()

        # --- Estudiantes + membresías + inscripciones ---
        estudiantes: list[Estudiante] = []
        inscripciones_ok: list[Inscripcion] = []

        for i in range(1, N_ESTUDIANTES + 1):
            nombre = _nombre_completo()
            email = _email_demo("estudiante", i)
            carrera = RNG.choice(CARRERAS)
            plan_tipo, precio, duracion = RNG.choice(PLANES)
            fin_mem = hoy + timedelta(days=RNG.randint(-15, 120))
            inicio_mem = fin_mem - timedelta(days=duracion)

            user = Usuario(
                nombre=nombre,
                email=email,
                telefono=f"7{RNG.randint(1000000, 9999999)}",
                hashed_password=hash_pw,
                es_admin=False,
                rol="estudiante",
                activo=True,
            )
            db.add(user)
            await db.flush()

            est = Estudiante(
                usuario_id=user.id,
                nombre=nombre,
                email=email,
                telefono=user.telefono,
                carrera=carrera,
                registro_univercotario=f"221{RNG.randint(100000, 999999)}",
                fechainicio_membresia=inicio_mem,
                fechafin_membresia=fin_mem,
                nfc_uid=_nfc_uid(i),
                codigo_acceso=f"GP-DEMO{i:04X}",
            )
            db.add(est)
            await db.flush()

            memb = Membresia(
                estudiante_id=est.id,
                tipo=plan_tipo,
                precio=Decimal(str(precio)),
                duracion=duracion,
            )
            db.add(memb)
            estudiantes.append(est)

            # Inscripción mes actual (mayoría confirmada)
            if i <= 72:
                ref = generar_referencia_pago()
                monto = Decimal(str(RNG.choice([80, 90, 100, 120])))
                ins = Inscripcion(
                    estudiante_id=est.id,
                    tipo=RNG.choice(["actividad", "sala_maquinas"]),
                    actividad_id=RNG.choice(actividades).id if RNG.random() > 0.3 else None,
                    mes_inicio=mes_actual,
                    monto=monto,
                    referencia_pago=ref,
                    estado=ESTADO_CONFIRMADA,
                    creado_por_admin=RNG.random() > 0.5,
                )
                db.add(ins)
                await db.flush()
                pago = Pago(
                    estudiante_id=est.id,
                    membresia_id=memb.id,
                    inscripcion_id=ins.id,
                    monto=monto,
                    metodo=RNG.choice(METODOS_PAGO),
                    referencia=ref,
                    fecha=hoy - timedelta(days=RNG.randint(0, 10)),
                    notas="Inscripción mensual demo",
                )
                db.add(pago)
                await db.flush()
                ins.pago_id = pago.id
                inscripciones_ok.append(ins)

                # Inscripción mes anterior (historial)
                if i <= 55:
                    mes_ant = meses[1]
                    ref2 = generar_referencia_pago()
                    monto2 = Decimal(str(RNG.choice([80, 90, 100])))
                    ins2 = Inscripcion(
                        estudiante_id=est.id,
                        tipo=RNG.choice(["actividad", "sala_maquinas"]),
                        actividad_id=RNG.choice(actividades).id,
                        mes_inicio=mes_ant,
                        monto=monto2,
                        referencia_pago=ref2,
                        estado=ESTADO_CONFIRMADA,
                    )
                    db.add(ins2)
                    await db.flush()
                    pago2 = Pago(
                        estudiante_id=est.id,
                        membresia_id=memb.id,
                        inscripcion_id=ins2.id,
                        monto=monto2,
                        metodo=RNG.choice(METODOS_PAGO),
                        fecha=mes_ant + timedelta(days=RNG.randint(0, 5)),
                    )
                    db.add(pago2)
            elif i <= 80:
                ref = generar_referencia_pago()
                db.add(
                    Inscripcion(
                        estudiante_id=est.id,
                        tipo="sala_maquinas",
                        mes_inicio=mes_actual,
                        monto=Decimal("90"),
                        referencia_pago=ref,
                        estado=ESTADO_PENDIENTE_PAGO,
                    )
                )

        await db.flush()

        # --- Pagos adicionales de membresía ---
        pagos_creados = 0
        for est in estudiantes:
            if pagos_creados >= N_PAGOS:
                break
            memb_row = await db.execute(select(Membresia).where(Membresia.estudiante_id == est.id))
            memb = memb_row.scalar_one()
            for _ in range(RNG.randint(0, 2)):
                if pagos_creados >= N_PAGOS:
                    break
                f = _random_dt(inicio_hist, hoy).date()
                db.add(
                    Pago(
                        estudiante_id=est.id,
                        membresia_id=memb.id,
                        monto=Decimal(str(RNG.choice([150, 400, 700]))),
                        metodo=RNG.choice(METODOS_PAGO),
                        fecha=f,
                        notas="Renovación membresía",
                    )
                )
                pagos_creados += 1
        await db.flush()

        # --- Accesos históricos ---
        activos_ids = {e.id for e in estudiantes[:72]}
        for _ in range(N_ACCESOS):
            dt = _random_dt(inicio_hist, hoy)
            fecha_str = dt.strftime("%Y-%m-%d")
            hora = dt.hour * 100 + dt.minute

            if RNG.random() < 0.88 and activos_ids:
                est = estudiantes[RNG.randint(0, 71)]
                concedido = True
                motivo = None
                est_id = est.id
                nfc = est.nfc_uid
                hora_salida = None
                if RNG.random() < 0.45:
                    salida_dt = dt + timedelta(minutes=RNG.randint(45, 120))
                    hora_salida = salida_dt.hour * 100 + salida_dt.minute
            elif RNG.random() < 0.7:
                est = RNG.choice(estudiantes)
                concedido = False
                motivo = RNG.choice(MOTIVOS_DENEGADO[:3])
                est_id = est.id if "NFC" not in motivo and "Código" not in motivo else est.id
                nfc = est.nfc_uid
                hora_salida = None
            else:
                est_id = None
                concedido = False
                motivo = RNG.choice(MOTIVOS_DENEGADO[:2])
                nfc = f"DEMO-UNK-{RNG.randint(1000, 9999)}"
                hora_salida = None

            acc = Acceso(
                estudiante_id=est_id,
                fecha=fecha_str,
                hora_entrada=hora,
                hora_salida=hora_salida,
                tiempo_permanencia=f"{RNG.randint(0, 2):02d}:{RNG.randint(10, 59):02d}" if hora_salida else None,
                nfc_uid_escaneado=nfc,
                acceso_concedido=concedido,
                motivo_denegacion=motivo,
            )
            acc.created_at = dt
            db.add(acc)
        await db.flush()

        # --- Reservas ---
        fechas_reserva = [hoy + timedelta(days=d) for d in range(-14, 15)]
        for _ in range(N_RESERVAS):
            est = RNG.choice(estudiantes[:70])
            act = RNG.choice(actividades)
            f = RNG.choice(fechas_reserva)
            db.add(
                Reserva(
                    estudiante_id=est.id,
                    actividad_id=act.id,
                    fecha=f,
                    estado=RNG.choice([1, 1, 1, 2, 0]),
                )
            )
        await db.flush()

        # --- Asistencias ---
        for _ in range(N_ASISTENCIAS):
            est = RNG.choice(estudiantes[:72])
            dt = _random_dt(inicio_hist, hoy)
            db.add(
                Asistencia(
                    estudiante_id=est.id,
                    fecha=dt.date(),
                    horaentrada=dt.time(),
                )
            )
        await db.flush()

        # --- Notificaciones ---
        for i in range(N_NOTIFICACIONES):
            est = RNG.choice(estudiantes)
            tipo, titulo, msg_tpl = RNG.choice(NOTIF_TEMPLATES)
            msg = msg_tpl.format(
                fecha=(hoy + timedelta(days=RNG.randint(1, 14))).isoformat(),
                actividad=RNG.choice(actividades).nombre,
                rutina=RNG.choice(["Fuerza Básica", "Definición 4 semanas", "Cardio Express"]),
                monto=RNG.choice([90, 120, 150]),
                mes=mes_actual.strftime("%B %Y"),
            )
            db.add(
                Notificacion(
                    estudiante_id=est.id,
                    fecha=hoy - timedelta(days=RNG.randint(0, 30)),
                    titulo=titulo,
                    mensaje=msg,
                    leida=RNG.random() < 0.4,
                    tipo=tipo,
                )
            )
        await db.flush()

        # --- Rutinas (plantillas + asignadas) ---
        plantillas: list[Rutina] = []
        for nombre, obj in [
            ("Fuerza Básica UAGRM", "hipertrofia"),
            ("Definición 4 semanas", "perdida_peso"),
            ("Cardio + Core", "resistencia"),
            ("Full Body Principiante", "fuerza"),
            ("Piernas Intenso", "hipertrofia"),
        ]:
            r = Rutina(
                instructor_id=RNG.choice(instructores).id,
                nombre=nombre,
                objetivo=obj,
            )
            db.add(r)
            plantillas.append(r)
        await db.flush()

        for pl in plantillas:
            for orden, ej in enumerate(RNG.sample(ejercicios, k=min(4, len(ejercicios)))):
                db.add(
                    RutinaEjercicio(
                        rutina_id=pl.id,
                        ejercicio_id=ej.id,
                        series=RNG.randint(3, 5),
                        repeticiones=str(RNG.randint(8, 15)),
                        orden=orden,
                    )
                )

        for est in RNG.sample(estudiantes[:50], k=min(35, len(estudiantes))):
            pl = RNG.choice(plantillas)
            r = Rutina(
                instructor_id=pl.instructor_id,
                estudiante_id=est.id,
                plantilla_id=pl.id,
                nombre=pl.nombre,
                objetivo=pl.objetivo,
                notas_asignacion="Rutina demo asignada por el instructor.",
            )
            db.add(r)
            await db.flush()
            for assoc in (
                await db.execute(
                    select(RutinaEjercicio).where(RutinaEjercicio.rutina_id == pl.id)
                )
            ).scalars():
                db.add(
                    RutinaEjercicio(
                        rutina_id=r.id,
                        ejercicio_id=assoc.ejercicio_id,
                        series=assoc.series,
                        repeticiones=assoc.repeticiones,
                        orden=assoc.orden,
                    )
                )
        await db.flush()

        # --- Mantenimientos ---
        for m in maquinas:
            for _ in range(RNG.randint(1, 2)):
                f = hoy - timedelta(days=RNG.randint(10, 180))
                db.add(
                    MantenimientoMaquina(
                        maquina_id=m.id,
                        tipo=RNG.choice(["preventivo", "correctivo"]),
                        responsable=RNG.choice(instructores).nombre,
                        observaciones="Revisión rutinaria demo",
                        checklist=[{"item": "Lubricación", "ok": True}, {"item": "Tensión cables", "ok": True}],
                        fecha_realizado=f,
                        proximo_mantenimiento=f + timedelta(days=90),
                        resultado=RNG.choice(["ok", "ok", "observacion"]),
                    )
                )
        await db.flush()

        # --- Asignaciones instructor ---
        for inst in instructores:
            for turno, hi, hf in [("AM", "07:00", "12:00"), ("PM", "14:00", "20:00")]:
                if RNG.random() < 0.6:
                    db.add(
                        AsignacionInstructor(
                            instructor_id=inst.id,
                            sala_id=RNG.choice([sala_act, sala_act2]).id,
                            fecha=hoy,
                            hora_inicio=hi,
                            hora_fin=hf,
                            tipo="coach_maquinas" if RNG.random() > 0.5 else "actividad",
                            turno=turno,
                            vigencia_tipo="mes",
                            vigencia_inicio=mes_actual,
                            vigencia_fin=hoy + timedelta(days=30),
                            actividad_id=RNG.choice(actividades).id if RNG.random() > 0.5 else None,
                        )
                    )
        await db.flush()

        # --- Reportes guardados ---
        for tipo, nombre in [
            ("accesos", "Reporte mensual de accesos"),
            ("ingresos", "Ingresos por membresías Q2"),
            ("asistencia", "Asistencia clases grupales"),
            ("membresía", "Membresías por vencer"),
            ("operaciones", "Resumen operativo semanal"),
        ]:
            db.add(
                Reporte(
                    administrador_id=admin.id,
                    tipo=tipo,
                    nombre=nombre,
                    fecha=hoy - timedelta(days=RNG.randint(1, 20)),
                )
            )

        await db.commit()

        # Resumen
        counts = {}
        for model, label in [
            (Estudiante, "estudiantes"),
            (Instructor, "instructores"),
            (Acceso, "accesos"),
            (Pago, "pagos"),
            (Reserva, "reservas"),
            (Inscripcion, "inscripciones"),
            (Membresia, "membresías"),
            (Notificacion, "notificaciones"),
            (Asistencia, "asistencias"),
            (Maquina, "máquinas"),
            (Actividad, "actividades"),
            (Rutina, "rutinas"),
            (MantenimientoMaquina, "mantenimientos"),
        ]:
            counts[label] = await db.scalar(select(func.count()).select_from(model)) or 0

        total = sum(counts.values())
        print("\n=== Seed demo completado ===")
        for label, n in counts.items():
            print(f"  {label}: {n}")
        print(f"\n  TOTAL registros en tablas principales: {total}")
        print(f"\n  Estudiantes: estudiante1@{DEMO_DOMAIN} … estudiante{N_ESTUDIANTES}@{DEMO_DOMAIN}")
        print(f"  Password:    {DEMO_PASSWORD}")
        print(f"  Instructores: instructor1@{DEMO_DOMAIN} … instructor{len(INSTRUCTORES_DATA)}@{DEMO_DOMAIN}")
        print(f"  Admin:       admin@gympro.com / admin123\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Cargar datos demo en UAGRM-GYM")
    parser.add_argument("--force", action="store_true", help="Eliminar demo anterior y recargar")
    args = parser.parse_args()
    asyncio.run(seed_demo(force=args.force))


if __name__ == "__main__":
    main()
