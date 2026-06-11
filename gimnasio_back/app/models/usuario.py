from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base


class Usuario(Base):
    """
    Entidad base del diagrama.
    Representa cualquier persona del sistema (admin, instructor, estudiante).
    """
    __tablename__ = "usuarios"

    nombre = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    telefono = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)

    # Control de acceso
    activo = Column(Boolean, default=True, nullable=False)
    es_admin = Column(Boolean, default=False, nullable=False)
    rol = Column(String(20), default="estudiante", nullable=False)

    # Relationships
    administrador = relationship("Administrador", back_populates="usuario", uselist=False)
    instructor = relationship("Instructor", back_populates="usuario", uselist=False)
    estudiante = relationship("Estudiante", back_populates="usuario", uselist=False)
