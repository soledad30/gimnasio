from sqlalchemy import Column, Date, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class AsignacionInstructor(Base):
    __tablename__ = "asignaciones_instructor"

    instructor_id = Column(Integer, ForeignKey("instructores.id"), nullable=False)
    sala_id = Column(Integer, ForeignKey("salas.id"), nullable=False)
    fecha = Column(Date, nullable=True)
    hora_inicio = Column(String(5), nullable=False)
    hora_fin = Column(String(5), nullable=False)
    tipo = Column(String(20), nullable=False, default="coach_maquinas")
    turno = Column(String(10), nullable=True)
    vigencia_tipo = Column(String(20), nullable=False, default="mes")
    vigencia_inicio = Column(Date, nullable=True)
    vigencia_fin = Column(Date, nullable=True)
    actividad_id = Column(Integer, ForeignKey("actividades.id"), nullable=True)

    instructor = relationship("Instructor", back_populates="asignaciones")
    sala = relationship("Sala", back_populates="asignaciones")
    actividad = relationship("Actividad", back_populates="asignaciones")
