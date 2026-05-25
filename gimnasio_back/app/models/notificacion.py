from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)

    
    fecha = Column(Date, nullable=True)
    titulo = Column(String(255), nullable=False)
    mensaje = Column(String(1000), nullable=False)
    leida = Column(Boolean, default=False, nullable=False)
    tipo = Column(String(100), nullable=True)            # "membresía", "rutina", "reserva", etc.

    # Relationships
    estudiante = relationship("Estudiante", back_populates="notificaciones")
