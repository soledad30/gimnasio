from sqlalchemy import Column, String, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class Reserva(Base):
    __tablename__ = "reservas"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    actividad_id = Column(Integer, ForeignKey("actividades.id"), nullable=False)

    
    fecha = Column(Date, nullable=False)
    estado = Column(Integer, nullable=False, default=1)   # 1=confirmada, 0=cancelada, 2=asistió

    # Relationships
    estudiante = relationship("Estudiante", back_populates="reservas")
    actividad = relationship("Actividad", back_populates="reservas")
