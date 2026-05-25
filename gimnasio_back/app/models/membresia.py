from sqlalchemy import Column, String, Integer, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.db.base import Base


class Membresia(Base):
    __tablename__ = "membresias"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False, unique=True)

    
    tipo = Column(String(100), nullable=False)           # mensual, trimestral, anual, etc.
    precio = Column(Numeric(10, 2), nullable=False)      
    duracion = Column(Integer, nullable=False)           

    # Relationships
    estudiante = relationship("Estudiante", back_populates="membresia")
