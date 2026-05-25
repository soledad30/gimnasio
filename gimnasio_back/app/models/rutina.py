from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Rutina(Base):
    __tablename__ = "rutinas"

    instructor_id = Column(Integer, ForeignKey("instructores.id"), nullable=True)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)

    
    nombre = Column(String(150), nullable=False)
    objetivo = Column(String(255), nullable=True)        # "Pérdida de peso", "Hipertrofia", etc.

    # Relationships
    instructor = relationship("Instructor", back_populates="rutinas")
    estudiante = relationship("Estudiante", back_populates="rutinas")
