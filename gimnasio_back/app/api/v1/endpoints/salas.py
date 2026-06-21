from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_usuario, get_db
from app.models.sala import Sala
from app.schemas.schemas import SalaResponse

router = APIRouter()


@router.get("/", response_model=List[SalaResponse])
async def listar_salas(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_usuario),
):
    result = await db.execute(select(Sala).where(Sala.activa == True).order_by(Sala.id))  # noqa: E712
    return list(result.scalars().all())
