from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    # Destinatario: estudiante (portal alumno) y/o usuario (staff)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    fecha = Column(Date, nullable=True)
    titulo = Column(String(255), nullable=False)
    mensaje = Column(String(1000), nullable=False)
    leida = Column(Boolean, default=False, nullable=False)
    tipo = Column(String(100), nullable=True)  # "membresía", "aviso", "mantenimiento", etc.

    estudiante = relationship("Estudiante", back_populates="notificaciones")
    usuario = relationship("Usuario", backref="notificaciones")
