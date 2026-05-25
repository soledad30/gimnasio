from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Instructor(Base):
    __tablename__ = "instructores"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    nombre = Column(String(150), nullable=False)
    especialidad = Column(String(150), nullable=True)

    # Relationships
    usuario = relationship("Usuario", back_populates="instructor")
    rutinas = relationship("Rutina", back_populates="instructor")
    actividades = relationship("Actividad", back_populates="instructor")
    maquinas = relationship("Maquina", back_populates="instructor")
