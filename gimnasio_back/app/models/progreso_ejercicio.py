from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ProgresoEjercicio(Base):
    """Registro de rendimiento del estudiante en un ejercicio de su rutina."""

    __tablename__ = "progreso_ejercicios"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id", ondelete="CASCADE"), nullable=False)
    rutina_id = Column(Integer, ForeignKey("rutinas.id", ondelete="CASCADE"), nullable=False)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), nullable=False)

    fecha = Column(Date, nullable=False)
    series_completadas = Column(Integer, nullable=True)
    repeticiones_logradas = Column(String(80), nullable=True)  # ej. "12,10,8"
    peso_kg = Column(Float, nullable=True)
    dificultad_percibida = Column(Integer, nullable=True)  # 1=fácil … 5=muy difícil
    notas = Column(Text, nullable=True)

    estudiante = relationship("Estudiante", back_populates="progreso_ejercicios")
    rutina = relationship("Rutina", back_populates="progreso_ejercicios")
    ejercicio = relationship("Ejercicio", back_populates="progreso_registros")
