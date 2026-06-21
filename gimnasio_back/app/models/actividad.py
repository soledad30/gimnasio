from sqlalchemy import Column, String, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class Actividad(Base):
    __tablename__ = "actividades"

    instructor_id = Column(Integer, ForeignKey("instructores.id"), nullable=True)
    sala_id = Column(Integer, ForeignKey("salas.id"), nullable=True)

    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(500), nullable=True)
    dia_semana = Column(String(80), nullable=True)
    hora_inicio = Column(String(10), nullable=True)
    hora_fin = Column(String(10), nullable=True)
    capacidad = Column(Integer, nullable=False, default=20)
    vigencia_tipo = Column(String(20), nullable=False, default="mes")
    vigencia_inicio = Column(Date, nullable=True)
    vigencia_fin = Column(Date, nullable=True)

    # Relationships
    instructor = relationship("Instructor", back_populates="actividades")
    sala = relationship("Sala", back_populates="actividades")
    reservas = relationship("Reserva", back_populates="actividad")
    asignaciones = relationship("AsignacionInstructor", back_populates="actividad")
