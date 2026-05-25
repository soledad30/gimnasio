from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.acceso import Acceso
from app.models.membresia import Membresia
from app.schemas.schemas import NFCScanResponse
from app.services.base_service import BaseService
from app.services.estudiante_service import EstudianteService


class AccesoService(BaseService[Acceso]):
    def __init__(self, db: AsyncSession):
        super().__init__(Acceso, db)

    async def procesar_nfc(self, nfc_uid: str) -> NFCScanResponse:
        now = datetime.now(timezone.utc)
        hora_int = int(now.strftime("%H%M"))   # HHMM como entero
        fecha_str = now.strftime("%Y-%m-%d")

        estudiante = await EstudianteService(self.db).get_by_nfc(nfc_uid)

        if not estudiante:
            acceso = Acceso(
                fecha=fecha_str,
                hora_entrada=hora_int,
                nfc_uid_escaneado=nfc_uid,
                acceso_concedido=False,
                motivo_denegacion="NFC no registrado en el sistema",
            )
            self.db.add(acceso)
            await self.db.commit()
            return NFCScanResponse(
                acceso_concedido=False,
                motivo_denegacion="NFC no registrado en el sistema",
                mensaje="Acceso denegado",
            )

        # Verificar membresía vigente
        membresia = estudiante.membresia
        hoy = date.today()
        membresia_activa = (
            membresia is not None
            and estudiante.fechainicio_membresia is not None
            and estudiante.fechafin_membresia is not None
            and estudiante.fechainicio_membresia <= hoy <= estudiante.fechafin_membresia
        )

        if not membresia_activa:
            estado = "sin membresía" if not membresia else "membresía vencida"
            acceso = Acceso(
                estudiante_id=estudiante.id,
                fecha=fecha_str,
                hora_entrada=hora_int,
                nfc_uid_escaneado=nfc_uid,
                acceso_concedido=False,
                motivo_denegacion=estado,
            )
            self.db.add(acceso)
            await self.db.commit()
            return NFCScanResponse(
                acceso_concedido=False,
                estudiante_id=estudiante.id,
                nombre=estudiante.nombre,
                estado_membresia=estado,
                motivo_denegacion=estado,
                mensaje="Acceso denegado",
            )

        # Acceso concedido
        acceso = Acceso(
            estudiante_id=estudiante.id,
            fecha=fecha_str,
            hora_entrada=hora_int,
            nfc_uid_escaneado=nfc_uid,
            acceso_concedido=True,
        )
        self.db.add(acceso)
        await self.db.commit()
        await self.db.refresh(acceso)

        return NFCScanResponse(
            acceso_concedido=True,
            estudiante_id=estudiante.id,
            nombre=estudiante.nombre,
            estado_membresia="activa",
            acceso_id=acceso.id,
            mensaje=f"¡Bienvenido/a, {estudiante.nombre}!",
        )
