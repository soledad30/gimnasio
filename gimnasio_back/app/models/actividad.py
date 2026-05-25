from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Actividad(Base):
    __tablename__ = "actividades"

    instructor_id = Column(Integer, ForeignKey("instructores.id"), nullable=True)

    
    nombre = Column(String(150), nullable=False)
    capacidad = Column(Integer, nullable=False, default=20)

    # Relationships
    instructor = relationship("Instructor", back_populates="actividades")
    reservas = relationship("Reserva", back_populates="actividad")
