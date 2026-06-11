from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Ejercicio(Base):
    __tablename__ = "ejercicios"

    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(500), nullable=True)
    grupo_muscular = Column(String(100), nullable=True)
    objetivo = Column(String(100), nullable=True)
    con_maquina = Column(Boolean, default=False, nullable=False)
    maquina_id = Column(Integer, ForeignKey("maquinas.id"), nullable=True)
    fotourl = Column(String(500), nullable=True)
    videourl = Column(String(500), nullable=True)

    maquina = relationship("Maquina")
    rutinas_assoc = relationship("RutinaEjercicio", back_populates="ejercicio", cascade="all, delete-orphan")
