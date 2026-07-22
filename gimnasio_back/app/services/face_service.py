"""
Matching facial por embeddings (face-api.js 128-d u otro modelo compatible).

No entrena un dataset: guarda el descriptor de cada estudiante y compara por distancia euclídea.
"""
from __future__ import annotations

import json
import math
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.estudiante import Estudiante

# Umbral típico de face-api.js (menor = más parecido). 0.55–0.6 suele funcionar bien.
FACE_MATCH_THRESHOLD = 0.55


def serialize_embedding(embedding: list[float]) -> str:
    return json.dumps([float(x) for x in embedding])


def parse_embedding(raw: Optional[str]) -> Optional[list[float]]:
    if not raw or not raw.strip():
        return None
    try:
        data = json.loads(raw)
        if not isinstance(data, list) or len(data) < 64:
            return None
        return [float(x) for x in data]
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


def euclidean_distance(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n == 0:
        return float("inf")
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(n)))


class FaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def enroll(self, estudiante_id: int, embedding: list[float]) -> Estudiante:
        estudiante = await self.db.get(Estudiante, estudiante_id)
        if not estudiante:
            raise ValueError("Estudiante no encontrado")
        estudiante.face_embedding = serialize_embedding(embedding)
        await self.db.commit()
        await self.db.refresh(estudiante)
        return estudiante

    async def clear(self, estudiante_id: int) -> Estudiante:
        estudiante = await self.db.get(Estudiante, estudiante_id)
        if not estudiante:
            raise ValueError("Estudiante no encontrado")
        estudiante.face_embedding = None
        await self.db.commit()
        await self.db.refresh(estudiante)
        return estudiante

    async def match(
        self,
        embedding: list[float],
        *,
        threshold: float = FACE_MATCH_THRESHOLD,
    ) -> tuple[Optional[Estudiante], Optional[float]]:
        """Devuelve (estudiante, distancia) del mejor match bajo el umbral, o (None, best_dist)."""
        result = await self.db.execute(
            select(Estudiante)
            .options(selectinload(Estudiante.membresia))
            .where(Estudiante.face_embedding.isnot(None))
        )
        best: Optional[Estudiante] = None
        best_dist = float("inf")
        for est in result.scalars().all():
            stored = parse_embedding(est.face_embedding)
            if not stored:
                continue
            dist = euclidean_distance(embedding, stored)
            if dist < best_dist:
                best_dist = dist
                best = est
        if best is not None and best_dist <= threshold:
            return best, best_dist
        return None, best_dist if best_dist != float("inf") else None
