from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base


class Inscripcion(Base):
    __tablename__ = "inscripciones"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # actividad | sala_maquinas
    actividad_id = Column(Integer, ForeignKey("actividades.id"), nullable=True)
    mes_inicio = Column(Date, nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    referencia_pago = Column(String(50), unique=True, nullable=False)
    estado = Column(Integer, nullable=False, default=3)  # 3=pendiente_pago, 1=confirmada, 0=cancelada
    pago_id = Column(Integer, ForeignKey("pagos.id"), nullable=True)
    pago_expira_en = Column(DateTime(timezone=True), nullable=True)
    # Estudiante avisó que ya pagó (espera confirmación en recepción)
    pago_reportado_en = Column(DateTime(timezone=True), nullable=True)
    pago_reportado_metodo = Column(String(30), nullable=True)
    pago_reportado_comprobante = Column(String(120), nullable=True)
    pago_reportado_notas = Column(String(500), nullable=True)
    creado_por_admin = Column(Boolean, nullable=False, default=False)

    estudiante = relationship("Estudiante", back_populates="inscripciones")
    actividad = relationship("Actividad")
    pago = relationship("Pago", back_populates="inscripcion", foreign_keys=[pago_id])
