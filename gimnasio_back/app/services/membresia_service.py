from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.estudiante import Estudiante
from app.models.membresia import Membresia
from app.schemas.schemas import MembresiaCreate, MembresiaResponse, MembresiaUpdate


def to_membresia_response(mem: Membresia) -> MembresiaResponse:
    est = mem.estudiante
    return MembresiaResponse(
        id=mem.id,
        estudiante_id=mem.estudiante_id,
        estudiante_nombre=est.nombre if est else None,
        registro_universitario=est.registro_univercotario if est else None,
        tipo=mem.tipo,
        precio=mem.precio,
        duracion=mem.duracion,
        fecha_inicio=est.fechainicio_membresia if est else None,
        fecha_fin=est.fechafin_membresia if est else None,
        created_at=mem.created_at,
    )


class MembresiaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _aplicar_vigencia(
        self,
        estudiante: Estudiante,
        duracion: int,
        fecha_inicio: date | None = None,
    ) -> None:
        """
        Activa o renueva la vigencia.
        - Si el admin indica fecha_inicio: vigencia desde esa fecha por `duracion` días.
        - Si está vencida o sin fechas: desde hoy (o fecha_inicio).
        - Si aún está vigente y no hay fecha_inicio: extiende desde el fin actual.
        """
        hoy = date.today()
        inicio_forzado = fecha_inicio

        if inicio_forzado is not None:
            estudiante.fechainicio_membresia = inicio_forzado
            estudiante.fechafin_membresia = inicio_forzado + timedelta(days=duracion)
            return

        if estudiante.fechafin_membresia and estudiante.fechafin_membresia >= hoy:
            base = estudiante.fechafin_membresia
            estudiante.fechafin_membresia = base + timedelta(days=duracion)
            if not estudiante.fechainicio_membresia:
                estudiante.fechainicio_membresia = hoy
        else:
            estudiante.fechainicio_membresia = hoy
            estudiante.fechafin_membresia = hoy + timedelta(days=duracion)

    async def crear(self, data: MembresiaCreate) -> Membresia:
        est_result = await self.db.execute(
            select(Estudiante).where(Estudiante.id == data.estudiante_id)
        )
        estudiante = est_result.scalar_one_or_none()
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        existing = await self.db.execute(
            select(Membresia).where(Membresia.estudiante_id == data.estudiante_id)
        )
        mem = existing.scalar_one_or_none()

        self._aplicar_vigencia(estudiante, data.duracion, data.fecha_inicio)

        payload = data.model_dump(exclude={"fecha_inicio"})
        if mem:
            mem.tipo = data.tipo
            mem.precio = data.precio
            mem.duracion = data.duracion
        else:
            mem = Membresia(**payload)
            self.db.add(mem)

        await self.db.commit()
        await self.db.refresh(mem)
        loaded = await self.get_loaded(mem.id)
        return loaded

    async def get_loaded(self, membresia_id: int) -> Membresia | None:
        result = await self.db.execute(
            select(Membresia)
            .options(selectinload(Membresia.estudiante))
            .where(Membresia.id == membresia_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[Membresia]:
        result = await self.db.execute(
            select(Membresia)
            .options(selectinload(Membresia.estudiante))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def renovar(self, membresia_id: int, data: MembresiaUpdate) -> Membresia:
        mem = await self.get_loaded(membresia_id)
        if not mem:
            raise HTTPException(status_code=404, detail="Membresía no encontrada")

        updates = data.model_dump(exclude_none=True)
        duracion = updates.pop("duracion", None)
        fecha_inicio = updates.pop("fecha_inicio", None)
        for field, value in updates.items():
            setattr(mem, field, value)

        if duracion is not None:
            mem.duracion = duracion
            self._aplicar_vigencia(mem.estudiante, duracion, fecha_inicio)
        elif fecha_inicio is not None and mem.estudiante:
            self._aplicar_vigencia(mem.estudiante, mem.duracion, fecha_inicio)
        elif mem.estudiante and (
            not mem.estudiante.fechafin_membresia
            or mem.estudiante.fechafin_membresia < date.today()
        ):
            self._aplicar_vigencia(mem.estudiante, mem.duracion)

        await self.db.commit()
        return await self.get_loaded(membresia_id)

    async def eliminar(self, membresia_id: int) -> bool:
        mem = await self.get_loaded(membresia_id)
        if not mem:
            return False
        if mem.estudiante:
            mem.estudiante.fechainicio_membresia = None
            mem.estudiante.fechafin_membresia = None
        await self.db.delete(mem)
        await self.db.commit()
        return True

    async def sincronizar_desde_pago_sala_maquinas(
        self,
        *,
        estudiante_id: int,
        mes_inicio: date,
        monto,
    ) -> Membresia:
        """
        Al pagar inscripción de sala de máquinas, activa/renueva la membresía
        (habilita QR, NFC y registro de ingreso a máquinas).
        """
        from app.services.inscripcion_service import ultimo_dia_mes

        est_result = await self.db.execute(
            select(Estudiante).where(Estudiante.id == estudiante_id)
        )
        estudiante = est_result.scalar_one_or_none()
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        fin_mes = ultimo_dia_mes(mes_inicio)
        hoy = date.today()
        # Membresía solo cubre el mes pagado (p. ej. pago de agosto → 1–31 ago)
        inicio = mes_inicio
        fin = fin_mes

        # Extender si ya tenía vigencia más allá del mes pagado
        if estudiante.fechafin_membresia and estudiante.fechafin_membresia > fin:
            fin = estudiante.fechafin_membresia
        if (
            estudiante.fechainicio_membresia
            and estudiante.fechafin_membresia
            and estudiante.fechafin_membresia >= hoy
            and estudiante.fechainicio_membresia < inicio
        ):
            inicio = estudiante.fechainicio_membresia

        estudiante.fechainicio_membresia = inicio
        estudiante.fechafin_membresia = fin
        duracion = max((fin - inicio).days, 1)

        existing = await self.db.execute(
            select(Membresia).where(Membresia.estudiante_id == estudiante_id)
        )
        mem = existing.scalar_one_or_none()
        if mem:
            mem.tipo = "mensual"
            mem.precio = monto
            mem.duracion = duracion
        else:
            mem = Membresia(
                estudiante_id=estudiante_id,
                tipo="mensual",
                precio=monto,
                duracion=duracion,
            )
            self.db.add(mem)

        await self.db.flush()
        return mem
