from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Pago(Base):
    __tablename__ = "pagos"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    membresia_id = Column(Integer, ForeignKey("membresias.id"), nullable=True)
    inscripcion_id = Column(Integer, ForeignKey("inscripciones.id"), nullable=True)

    monto = Column(Numeric(10, 2), nullable=False)
    metodo = Column(String(50), nullable=False, default="efectivo")
    referencia = Column(String(100), nullable=True)
    fecha = Column(Date, nullable=False)
    notas = Column(String(500), nullable=True)

    estudiante = relationship("Estudiante")
    membresia = relationship("Membresia")
    inscripcion = relationship(
        "Inscripcion",
        back_populates="pago",
        foreign_keys="Inscripcion.pago_id",
        uselist=False,
    )
