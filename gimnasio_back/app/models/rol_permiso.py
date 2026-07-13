from sqlalchemy import Column, String, UniqueConstraint

from app.db.base import Base


class RolPermiso(Base):
    __tablename__ = "rol_permisos"
    __table_args__ = (UniqueConstraint("rol", "permiso", name="uq_rol_permiso"),)

    rol = Column(String(20), nullable=False, index=True)
    permiso = Column(String(80), nullable=False, index=True)
