from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Sala(Base):
    __tablename__ = "salas"

    nombre = Column(String(100), nullable=False)
    tipo = Column(String(20), nullable=False)  # actividad | maquinas
    capacidad = Column(Integer, nullable=False, default=20)
    activa = Column(Boolean, nullable=False, default=True)

    actividades = relationship("Actividad", back_populates="sala")
    asignaciones = relationship("AsignacionInstructor", back_populates="sala")
