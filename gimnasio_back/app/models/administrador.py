from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Administrador(Base):
    __tablename__ = "administradores"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False)

    # Relationships
    usuario = relationship("Usuario", back_populates="administrador")
    reportes = relationship("Reporte", back_populates="administrador")
