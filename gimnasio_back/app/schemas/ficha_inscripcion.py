from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Optional

from pydantic import BaseModel, Field, model_validator


class CondicionesMedicas(BaseModel):
    hipertension: bool = False
    pulmonar: bool = False
    diabetes: bool = False
    osteoarticular: bool = False
    neurologica: bool = False
    convulsiones: bool = False


class FichaInscripcionCreate(BaseModel):
    domicilio: str = Field(..., min_length=3, max_length=255)
    fecha_nacimiento: date
    sexo: str = Field(..., pattern="^[FM]$")
    grupo_sanguineo: Optional[str] = Field(None, max_length=10)
    altura_cm: int = Field(..., ge=100, le=250)
    peso_kg: Decimal = Field(..., ge=30, le=300)
    mes_horario: Optional[str] = Field(None, max_length=100)
    cs: Optional[str] = Field(None, max_length=100)

    antecedentes_cardiovasculares: bool = False
    antecedentes_cardiovasculares_detalle: Optional[str] = Field(None, max_length=1000)
    procedimientos_cardiovasculares: bool = False
    procedimientos_cardiovasculares_detalle: Optional[str] = Field(None, max_length=1000)
    condiciones: CondicionesMedicas = Field(default_factory=CondicionesMedicas)
    condiciones_detalle: Optional[str] = Field(None, max_length=2000)
    intervencion_quirurgica: bool = False
    intervencion_quirurgica_detalle: Optional[str] = Field(None, max_length=1000)
    fracturas: bool = False
    fracturas_detalle: Optional[str] = Field(None, max_length=1000)
    sintomas_deportivos: bool = False
    sintomas_deportivos_detalle: Optional[str] = Field(None, max_length=2000)

    acepta_reglamento: bool
    declaracion_jurada: bool
    firma_nombre: str = Field(..., min_length=3, max_length=150)
    firma_ci: Optional[str] = Field(None, max_length=100)

    @model_validator(mode="after")
    def validar_declaracion(self):
        if not self.acepta_reglamento:
            raise ValueError("Debe aceptar el reglamento del gimnasio")
        if not self.declaracion_jurada:
            raise ValueError("Debe aceptar la declaración jurada")
        return self


class FichaInscripcionResponse(BaseModel):
    id: int
    estudiante_id: int
    version: int
    vigente: bool
    nombre: str
    cs: Optional[str]
    carrera: Optional[str]
    domicilio: Optional[str]
    email: str
    telefono: Optional[str]
    fecha_nacimiento: Optional[date]
    sexo: Optional[str]
    grupo_sanguineo: Optional[str]
    altura_cm: Optional[int]
    peso_kg: Optional[Decimal]
    mes_horario: Optional[str]
    antecedentes_cardiovasculares: bool
    antecedentes_cardiovasculares_detalle: Optional[str]
    procedimientos_cardiovasculares: bool
    procedimientos_cardiovasculares_detalle: Optional[str]
    condiciones: Dict[str, bool]
    condiciones_detalle: Optional[str]
    intervencion_quirurgica: bool
    intervencion_quirurgica_detalle: Optional[str]
    fracturas: bool
    fracturas_detalle: Optional[str]
    sintomas_deportivos: bool
    sintomas_deportivos_detalle: Optional[str]
    acepta_reglamento: bool
    declaracion_jurada: bool
    firma_nombre: str
    firma_fecha: date
    firma_ci: Optional[str]
    requiere_certificado_medico: bool
    certificado_medico_recibido: bool
    certificado_medico_url: Optional[str]
    fecha_vigencia_desde: date
    fecha_vigencia_hasta: date
    estado: str
    created_at: datetime

    class Config:
        from_attributes = True


class FichaInscripcionResumen(BaseModel):
    id: int
    estudiante_id: int
    estudiante_nombre: str
    estudiante_registro: Optional[str]
    version: int
    vigente: bool
    estado: str
    fecha_vigencia_desde: date
    fecha_vigencia_hasta: date
    requiere_certificado_medico: bool
    certificado_medico_recibido: bool
    certificado_medico_url: Optional[str] = None
    created_at: datetime


class FichaEstadoResponse(BaseModel):
    tiene_ficha: bool
    vigente: bool
    estado: Optional[str] = None
    fecha_vigencia_hasta: Optional[date] = None
    dias_para_vencer: Optional[int] = None
    requiere_actualizacion: bool = False
    requiere_certificado_medico: bool = False
    certificado_medico_recibido: bool = False
    ficha: Optional[FichaInscripcionResponse] = None


class CertificadoRecibidoUpdate(BaseModel):
    recibido: bool = True
