from sqlalchemy import Column, Float, Integer, String

from app.db.base import Base


class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"

    nombre_organizacion = Column(String(150), nullable=True)
    ubicacion = Column(String(255), nullable=True)

    telefono_contacto = Column(String(40), nullable=True)
    email_contacto = Column(String(255), nullable=True)

    sitio_web = Column(String(255), nullable=True)
    facebook = Column(String(255), nullable=True)
    instagram = Column(String(255), nullable=True)
    whatsapp = Column(String(80), nullable=True)
    tiktok = Column(String(255), nullable=True)
    youtube = Column(String(255), nullable=True)

    # Datos para cobro en recepción / estudiante
    banco_nombre = Column(String(150), nullable=True)
    banco_cuenta = Column(String(80), nullable=True)
    banco_titular = Column(String(150), nullable=True)
    # Texto o URL que se codifica/muestra como QR de pago (ej. QR Simple/banco)
    qr_pago_contenido = Column(String(500), nullable=True)

    # Horario operativo completo HH:MM:SS (editables por admin)
    gym_open_time = Column(String(8), nullable=True)
    gym_close_time = Column(String(8), nullable=True)
    # Compatibilidad con columnas antiguas (solo hora entera)
    gym_open_hour = Column(Integer, nullable=True)
    gym_close_hour = Column(Integer, nullable=True)
    dias_ventana_inscripcion = Column(Integer, nullable=True)

    # Inscripciones y precios (editables por admin)
    precio_inscripcion_actividad = Column(Float, nullable=True)
    precio_inscripcion_sala_maquinas = Column(Float, nullable=True)
    capacidad_sala_actividad = Column(Integer, nullable=True)
    capacidad_sala_maquinas = Column(Integer, nullable=True)
    horas_validez_qr_pago = Column(Integer, nullable=True)

    # Respaldos (carpeta local y Google Drive empresarial)
    backup_root = Column(String(500), nullable=True)
    backup_drive_path = Column(String(500), nullable=True)
