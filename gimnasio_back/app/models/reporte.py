from sqlalchemy import Column, String, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class Reporte(Base):
    __tablename__ = "reportes"

    administrador_id = Column(Integer, ForeignKey("administradores.id"), nullable=False)

    
    tipo = Column(String(100), nullable=False)           # "asistencia", "membresía", "ingresos", etc.
    nombre = Column(String(255), nullable=False)
    fecha = Column(Date, nullable=False)

    # Relationships
    administrador = relationship("Administrador", back_populates="reportes")
