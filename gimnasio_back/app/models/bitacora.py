from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Bitacora(Base):
    """Registro de auditoría de acciones relevantes en el sistema."""

    __tablename__ = "bitacora"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    usuario_nombre = Column(String(150), nullable=True)
    usuario_email = Column(String(255), nullable=True)
    usuario_rol = Column(String(20), nullable=True)

    accion = Column(String(40), nullable=False, index=True)
    modulo = Column(String(80), nullable=False, index=True)
    metodo = Column(String(10), nullable=False)
    ruta = Column(String(400), nullable=False)
    status_code = Column(Integer, nullable=True)
    ip = Column(String(64), nullable=True)
    detalle = Column(String(500), nullable=True)

    usuario = relationship("Usuario")
