from sqlalchemy import Column, String, Integer, ForeignKey, Time, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base


class Acceso(Base):
    """
    Registro de cada ingreso/egreso al gimnasio.
    Generado por el lector NFC en la puerta.
    """
    __tablename__ = "accesos"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)  # Null si UID desconocido

    
    fecha = Column(String(50), nullable=False)           # fecha como string según diagrama
    hora_entrada = Column(Integer, nullable=True)         # hora en int (epoch o HHMM)
    hora_salida = Column(Integer, nullable=True)
    tiempo_permanencia = Column(String(50), nullable=True)  # tipo Time en diagrama → guardamos como string HH:MM

    # Extra para lógica NFC
    nfc_uid_escaneado = Column(String(64), nullable=True)
    acceso_concedido = Column(Boolean, default=False, nullable=False)
    motivo_denegacion = Column(String(255), nullable=True)

    # Relationships
    estudiante = relationship("Estudiante", back_populates="accesos")
