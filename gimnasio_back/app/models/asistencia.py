from sqlalchemy import Column, Integer, ForeignKey, Date, Time
from sqlalchemy.orm import relationship
from app.db.base import Base


class Asistencia(Base):
    __tablename__ = "asistencias"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)

    
    fecha = Column(Date, nullable=False)
    horaentrada = Column(Time, nullable=True)

    # Relationships
    estudiante = relationship("Estudiante", back_populates="asistencias")
