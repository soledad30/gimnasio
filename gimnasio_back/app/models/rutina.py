from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Rutina(Base):
    __tablename__ = "rutinas"

    instructor_id = Column(Integer, ForeignKey("instructores.id"), nullable=True)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)
    plantilla_id = Column(Integer, ForeignKey("rutinas.id"), nullable=True)

    nombre = Column(String(150), nullable=False)
    objetivo = Column(String(255), nullable=True)
    notas_asignacion = Column(String(500), nullable=True)

    # Relationships
    instructor = relationship("Instructor", back_populates="rutinas")
    estudiante = relationship("Estudiante", back_populates="rutinas")
    plantilla = relationship("Rutina", remote_side="Rutina.id", foreign_keys=[plantilla_id])
    ejercicios_assoc = relationship(
        "RutinaEjercicio",
        back_populates="rutina",
        cascade="all, delete-orphan",
        order_by="RutinaEjercicio.orden",
    )
