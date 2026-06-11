from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Maquina(Base):
    __tablename__ = "maquinas"

    instructor_id = Column(Integer, ForeignKey("instructores.id"), nullable=True)  # supervisor

   
    codigo = Column(String(100), unique=True, nullable=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(500), nullable=True)
    categoria = Column(String(50), nullable=True)
    marca = Column(String(100), nullable=True)
    ubicacion = Column(String(150), nullable=True)
    fotourl = Column(String(500), nullable=True)
    estado_maquina = Column(String(50), nullable=False, default="disponible")

    # Relationships
    instructor = relationship("Instructor", back_populates="maquinas")
