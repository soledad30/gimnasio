from sqlalchemy import Column, Date, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base


class MantenimientoMaquina(Base):
    __tablename__ = "mantenimientos_maquina"

    maquina_id = Column(Integer, ForeignKey("maquinas.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(30), nullable=False, default="preventivo")
    responsable = Column(String(150), nullable=True)
    observaciones = Column(String(1000), nullable=True)
    checklist = Column(JSON, nullable=False, default=list)
    fecha_realizado = Column(Date, nullable=False)
    proximo_mantenimiento = Column(Date, nullable=True)
    resultado = Column(String(30), nullable=False, default="ok")

    maquina = relationship("Maquina", back_populates="mantenimientos")
