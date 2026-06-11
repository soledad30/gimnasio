from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class RutinaEjercicio(Base):
    __tablename__ = "rutina_ejercicios"
    __table_args__ = (UniqueConstraint("rutina_id", "ejercicio_id", name="uq_rutina_ejercicio"),)

    rutina_id = Column(Integer, ForeignKey("rutinas.id", ondelete="CASCADE"), nullable=False)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios.id", ondelete="CASCADE"), nullable=False)
    series = Column(Integer, nullable=True)
    repeticiones = Column(String(50), nullable=True)
    orden = Column(Integer, default=0, nullable=False)

    rutina = relationship("Rutina", back_populates="ejercicios_assoc")
    ejercicio = relationship("Ejercicio", back_populates="rutinas_assoc")
