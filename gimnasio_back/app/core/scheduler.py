"""Scheduler de tareas periódicas (alertas automáticas diarias)."""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _job_alertas_diarias() -> None:
    from app.services.notificacion_service import procesar_todas_las_alertas

    try:
        async with AsyncSessionLocal() as db:
            resultado = await procesar_todas_las_alertas(db)
        logger.info("Alertas diarias procesadas: %s", resultado)
    except Exception:  # noqa: BLE001 — el scheduler no debe caerse por un error
        logger.exception("Error procesando alertas diarias")


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        _job_alertas_diarias,
        trigger="cron",
        hour=7,
        minute=0,
        id="alertas_diarias",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado (alertas diarias 07:00)")


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
