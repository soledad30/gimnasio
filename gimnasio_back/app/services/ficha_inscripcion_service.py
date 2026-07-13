from datetime import date, timedelta
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.estudiante import Estudiante
from app.models.ficha_inscripcion import FichaInscripcion
from app.schemas.ficha_inscripcion import FichaEstadoResponse, FichaInscripcionCreate, FichaInscripcionResumen
from app.services.base_service import BaseService

VIGENCIA_MESES = 6


def _requiere_certificado(data: FichaInscripcionCreate) -> bool:
    if data.antecedentes_cardiovasculares or data.procedimientos_cardiovasculares:
        return True
    if data.intervencion_quirurgica or data.fracturas or data.sintomas_deportivos:
        return True
    cond = data.condiciones
    return any(
        [
            cond.hipertension,
            cond.pulmonar,
            cond.diabetes,
            cond.osteoarticular,
            cond.neurologica,
            cond.convulsiones,
        ]
    )


def _calcular_estado(requiere_cert: bool, cert_recibido: bool, vigencia_hasta: date) -> str:
    hoy = date.today()
    if vigencia_hasta < hoy:
        return "vencida"
    if requiere_cert and not cert_recibido:
        return "pendiente_certificado"
    return "vigente"


class FichaInscripcionService(BaseService[FichaInscripcion]):
    def __init__(self, db: AsyncSession):
        super().__init__(FichaInscripcion, db)

    async def get_vigente(self, estudiante_id: int) -> Optional[FichaInscripcion]:
        result = await self.db.execute(
            select(FichaInscripcion)
            .where(FichaInscripcion.estudiante_id == estudiante_id, FichaInscripcion.vigente.is_(True))
            .order_by(FichaInscripcion.version.desc())
        )
        return result.scalar_one_or_none()

    async def get_estado(self, estudiante_id: int) -> FichaEstadoResponse:
        ficha = await self.get_vigente(estudiante_id)
        if not ficha:
            return FichaEstadoResponse(
                tiene_ficha=False,
                vigente=False,
                requiere_actualizacion=True,
            )

        hoy = date.today()
        dias = (ficha.fecha_vigencia_hasta - hoy).days
        estado_actual = _calcular_estado(
            ficha.requiere_certificado_medico,
            ficha.certificado_medico_recibido,
            ficha.fecha_vigencia_hasta,
        )
        if ficha.estado != estado_actual:
            ficha.estado = estado_actual
            await self.db.commit()
            await self.db.refresh(ficha)

        requiere_actualizacion = estado_actual in ("vencida", "pendiente_certificado") or dias <= 15

        return FichaEstadoResponse(
            tiene_ficha=True,
            vigente=estado_actual == "vigente",
            estado=estado_actual,
            fecha_vigencia_hasta=ficha.fecha_vigencia_hasta,
            dias_para_vencer=dias,
            requiere_actualizacion=requiere_actualizacion,
            requiere_certificado_medico=ficha.requiere_certificado_medico,
            certificado_medico_recibido=ficha.certificado_medico_recibido,
            ficha=ficha,
        )

    async def list_historial(self, estudiante_id: int) -> List[FichaInscripcion]:
        result = await self.db.execute(
            select(FichaInscripcion)
            .where(FichaInscripcion.estudiante_id == estudiante_id)
            .order_by(FichaInscripcion.version.desc())
        )
        return list(result.scalars().all())

    async def list_resumen_staff(
        self,
        estado: Optional[str] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> List[FichaInscripcionResumen]:
        query = (
            select(FichaInscripcion)
            .options(selectinload(FichaInscripcion.estudiante))
            .where(FichaInscripcion.vigente.is_(True))
            .order_by(FichaInscripcion.fecha_vigencia_hasta.asc())
            .offset(skip)
            .limit(limit)
        )
        if estado:
            query = query.where(FichaInscripcion.estado == estado)
        result = await self.db.execute(query)
        fichas = list(result.scalars().all())
        return [
            FichaInscripcionResumen(
                id=f.id,
                estudiante_id=f.estudiante_id,
                estudiante_nombre=f.estudiante.nombre if f.estudiante else f.nombre,
                estudiante_registro=f.estudiante.registro_univercotario if f.estudiante else None,
                version=f.version,
                vigente=f.vigente,
                estado=f.estado,
                fecha_vigencia_desde=f.fecha_vigencia_desde,
                fecha_vigencia_hasta=f.fecha_vigencia_hasta,
                requiere_certificado_medico=f.requiere_certificado_medico,
                certificado_medico_recibido=f.certificado_medico_recibido,
                certificado_medico_url=f.certificado_medico_url,
                created_at=f.created_at,
            )
            for f in fichas
        ]

    async def create_ficha(
        self,
        estudiante: Estudiante,
        data: FichaInscripcionCreate,
        usuario_id: int,
    ) -> FichaInscripcion:
        anterior = await self.get_vigente(estudiante.id)
        version = (anterior.version + 1) if anterior else 1

        if anterior:
            anterior.vigente = False
            if anterior.estado == "vigente":
                anterior.estado = "reemplazada"

        hoy = date.today()
        vigencia_hasta = hoy + timedelta(days=VIGENCIA_MESES * 30)
        requiere_cert = _requiere_certificado(data)
        estado = _calcular_estado(requiere_cert, False, vigencia_hasta)

        if data.cs:
            estudiante.cs = data.cs

        ficha = FichaInscripcion(
            estudiante_id=estudiante.id,
            version=version,
            vigente=True,
            nombre=estudiante.nombre,
            cs=data.cs or estudiante.cs,
            carrera=estudiante.carrera,
            domicilio=data.domicilio,
            email=estudiante.email,
            telefono=estudiante.telefono,
            fecha_nacimiento=data.fecha_nacimiento,
            sexo=data.sexo,
            grupo_sanguineo=data.grupo_sanguineo,
            altura_cm=data.altura_cm,
            peso_kg=data.peso_kg,
            mes_horario=data.mes_horario,
            antecedentes_cardiovasculares=data.antecedentes_cardiovasculares,
            antecedentes_cardiovasculares_detalle=data.antecedentes_cardiovasculares_detalle,
            procedimientos_cardiovasculares=data.procedimientos_cardiovasculares,
            procedimientos_cardiovasculares_detalle=data.procedimientos_cardiovasculares_detalle,
            condiciones=data.condiciones.model_dump(),
            condiciones_detalle=data.condiciones_detalle,
            intervencion_quirurgica=data.intervencion_quirurgica,
            intervencion_quirurgica_detalle=data.intervencion_quirurgica_detalle,
            fracturas=data.fracturas,
            fracturas_detalle=data.fracturas_detalle,
            sintomas_deportivos=data.sintomas_deportivos,
            sintomas_deportivos_detalle=data.sintomas_deportivos_detalle,
            acepta_reglamento=data.acepta_reglamento,
            declaracion_jurada=data.declaracion_jurada,
            firma_nombre=data.firma_nombre,
            firma_fecha=hoy,
            firma_ci=data.firma_ci or data.cs or estudiante.cs,
            requiere_certificado_medico=requiere_cert,
            certificado_medico_recibido=False,
            fecha_vigencia_desde=hoy,
            fecha_vigencia_hasta=vigencia_hasta,
            estado=estado,
            created_by_usuario_id=usuario_id,
        )
        self.db.add(ficha)
        await self.db.commit()
        await self.db.refresh(ficha)
        return ficha

    async def marcar_certificado(self, ficha_id: int, recibido: bool = True) -> FichaInscripcion:
        ficha = await self.get_by_id(ficha_id)
        if not ficha:
            raise HTTPException(status_code=404, detail="Ficha no encontrada")
        ficha.certificado_medico_recibido = recibido
        ficha.estado = _calcular_estado(
            ficha.requiere_certificado_medico,
            recibido,
            ficha.fecha_vigencia_hasta,
        )
        await self.db.commit()
        await self.db.refresh(ficha)
        return ficha

    async def get_by_estudiante_staff(self, estudiante_id: int) -> Optional[FichaInscripcion]:
        return await self.get_vigente(estudiante_id)

    async def validar_acceso(self, estudiante_id: int) -> tuple[bool, str]:
        estado = await self.get_estado(estudiante_id)
        if not estado.tiene_ficha:
            return False, "sin ficha de inscripción (complete el formulario DUBSS-FR-03)"
        if estado.estado == "vencida":
            return False, "ficha de inscripción vencida"
        if estado.estado == "pendiente_certificado":
            return False, "certificado médico pendiente de validación en recepción"
        if not estado.vigente:
            return False, "ficha de inscripción no vigente"
        return True, "ficha vigente"

    async def subir_certificado(self, estudiante_id: int, url: str) -> FichaInscripcion:
        ficha = await self.get_vigente(estudiante_id)
        if not ficha:
            raise HTTPException(status_code=404, detail="No tienes ficha de inscripción vigente")
        if not ficha.requiere_certificado_medico:
            raise HTTPException(status_code=400, detail="Tu ficha no requiere certificado médico")
        if ficha.certificado_medico_recibido:
            raise HTTPException(status_code=400, detail="El certificado ya fue validado por recepción")
        ficha.certificado_medico_url = url
        await self.db.commit()
        await self.db.refresh(ficha)
        return ficha
