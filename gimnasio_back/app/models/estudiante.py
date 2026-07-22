from sqlalchemy import Column, String, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base


class Estudiante(Base):
    """
    Miembro/estudiante del gimnasio.
    Contiene los datos específicos del diagrama de clases.
    """
    __tablename__ = "estudiantes"

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)

    
    cs = Column(String(100), nullable=True)                          # campo 'cs' del diagrama
    registro_univercotario = Column(String(100), nullable=True)      # registro universitario
    nombre = Column(String(150), nullable=False)
    carrera = Column(String(150), nullable=True)
    email = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    fotourl = Column(String(500), nullable=True)
    fechainicio_membresia = Column(Date, nullable=True)
    fechafin_membresia = Column(Date, nullable=True)

    # NFC tag para control de acceso
    nfc_uid = Column(String(64), unique=True, index=True, nullable=True)
    codigo_acceso = Column(String(20), unique=True, index=True, nullable=True)
    # Embedding facial (JSON array de floats, p.ej. face-api.js 128-d)
    face_embedding = Column(String, nullable=True)

    @property
    def tiene_rostro(self) -> bool:
        return bool(self.face_embedding and self.face_embedding.strip())

    # Relationships
    usuario = relationship("Usuario", back_populates="estudiante")
    accesos = relationship("Acceso", back_populates="estudiante")
    asistencias = relationship("Asistencia", back_populates="estudiante")
    notificaciones = relationship("Notificacion", back_populates="estudiante")
    membresia = relationship("Membresia", back_populates="estudiante", uselist=False)
    reservas = relationship("Reserva", back_populates="estudiante")
    inscripciones = relationship("Inscripcion", back_populates="estudiante")
    rutinas = relationship("Rutina", back_populates="estudiante")
    fichas_inscripcion = relationship("FichaInscripcion", back_populates="estudiante")
    progreso_ejercicios = relationship("ProgresoEjercicio", back_populates="estudiante")
