from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class FichaInscripcion(Base):
    """Ficha de inscripción DUBSS-FR-03 con versionado."""

    __tablename__ = "fichas_inscripcion"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    vigente = Column(Boolean, nullable=False, default=True)

    nombre = Column(String(150), nullable=False)
    cs = Column(String(100), nullable=True)
    carrera = Column(String(150), nullable=True)
    domicilio = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    sexo = Column(String(1), nullable=True)
    grupo_sanguineo = Column(String(10), nullable=True)
    altura_cm = Column(Integer, nullable=True)
    peso_kg = Column(Numeric(5, 2), nullable=True)
    mes_horario = Column(String(100), nullable=True)

    antecedentes_cardiovasculares = Column(Boolean, nullable=False, default=False)
    antecedentes_cardiovasculares_detalle = Column(String(1000), nullable=True)
    procedimientos_cardiovasculares = Column(Boolean, nullable=False, default=False)
    procedimientos_cardiovasculares_detalle = Column(String(1000), nullable=True)
    condiciones = Column(JSON, nullable=False, default=dict)
    condiciones_detalle = Column(String(2000), nullable=True)
    intervencion_quirurgica = Column(Boolean, nullable=False, default=False)
    intervencion_quirurgica_detalle = Column(String(1000), nullable=True)
    fracturas = Column(Boolean, nullable=False, default=False)
    fracturas_detalle = Column(String(1000), nullable=True)
    sintomas_deportivos = Column(Boolean, nullable=False, default=False)
    sintomas_deportivos_detalle = Column(String(2000), nullable=True)

    acepta_reglamento = Column(Boolean, nullable=False, default=False)
    declaracion_jurada = Column(Boolean, nullable=False, default=False)
    firma_nombre = Column(String(150), nullable=False)
    firma_fecha = Column(Date, nullable=False)
    firma_ci = Column(String(100), nullable=True)

    requiere_certificado_medico = Column(Boolean, nullable=False, default=False)
    certificado_medico_recibido = Column(Boolean, nullable=False, default=False)
    certificado_medico_url = Column(String(500), nullable=True)

    fecha_vigencia_desde = Column(Date, nullable=False)
    fecha_vigencia_hasta = Column(Date, nullable=False)
    estado = Column(String(30), nullable=False, default="vigente")

    created_by_usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    estudiante = relationship("Estudiante", back_populates="fichas_inscripcion")
