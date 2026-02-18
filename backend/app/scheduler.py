import asyncio
import logging
from datetime import date
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import delete, func, select
from app.database import async_session, engine
from app.models import FluCase, GenomicSequence, Anomaly, Base

logger = logging.getLogger(__name__)

TARGET_BACKFILL_YEARS = 10
TARGET_BACKFILL_DAYS = TARGET_BACKFILL_YEARS * 365
STARTUP_BACKFILL_ATTEMPTS = 3
STARTUP_BACKFILL_RETRY_SECONDS = 15


async def _run_who_flunet():
    from app.services.flunet import ingest_flunet
    logger.info("Running WHO FluNet ingestion (last 4 weeks)")
    await ingest_flunet(weeks_back=4)


async def _run_anomaly_detection():
    from app.services.anomaly import detect_anomalies
    logger.info("Running anomaly detection")
    await detect_anomalies()


async def _run_full_rebuild():
    from app.services.flunet import ingest_flunet_full
    from app.services.nextstrain import ingest_nextstrain
    from app.services.anomaly import detect_anomalies

    logger.info("Running full daily rebuild")
    async with async_session() as session:
        await session.execute(delete(FluCase))
        await session.execute(delete(GenomicSequence))
        await session.execute(delete(Anomaly))
        await session.commit()
    logger.info("Cleared all tables for rebuild")

    await ingest_flunet_full()
    await ingest_nextstrain()
    await detect_anomalies()
    logger.info("Full rebuild complete")


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        _run_who_flunet,
        trigger=IntervalTrigger(hours=6),
        id="who_flunet",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_anomaly_detection,
        trigger=CronTrigger(hour="1,7,13,19"),
        id="anomaly_detection",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_full_rebuild,
        trigger=CronTrigger(hour=5),
        id="full_daily_rebuild",
        replace_existing=True,
    )

    return scheduler


async def init_db():
    """Create tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")


async def run_startup_jobs():
    """Run initial data ingestion on startup."""
    from app.services.flunet import ingest_flunet_full
    from app.services.nextstrain import ingest_nextstrain

    logger.info("Running startup jobs...")
    await _run_who_flunet()

    await _ensure_min_history_span(
        label="flu cases",
        fetch_span=_get_flu_case_span,
        ingest=ingest_flunet_full,
    )

    await _run_anomaly_detection()
    await _ensure_min_history_span(
        label="genomics",
        fetch_span=_get_genomics_span,
        ingest=ingest_nextstrain,
    )


def _span_days(min_date: date | None, max_date: date | None) -> int | None:
    if not min_date or not max_date:
        return None
    return (max_date - min_date).days


async def _get_flu_case_span() -> tuple[date | None, date | None, int | None]:
    async with async_session() as session:
        result = await session.execute(
            select(func.min(FluCase.time).label("min_date"), func.max(FluCase.time).label("max_date"))
        )
        row = result.one()
        return row.min_date, row.max_date, _span_days(row.min_date, row.max_date)


async def _get_genomics_span() -> tuple[date | None, date | None, int | None]:
    async with async_session() as session:
        result = await session.execute(
            select(
                func.min(GenomicSequence.collection_date).label("min_date"),
                func.max(GenomicSequence.collection_date).label("max_date"),
            )
        )
        row = result.one()
        return row.min_date, row.max_date, _span_days(row.min_date, row.max_date)


async def _ensure_min_history_span(label: str, fetch_span, ingest):
    for attempt in range(1, STARTUP_BACKFILL_ATTEMPTS + 1):
        min_date, max_date, span_days = await fetch_span()
        if span_days is not None and span_days >= TARGET_BACKFILL_DAYS:
            logger.info(
                "Startup %s span is %s days (%s to %s), meeting %s-year target",
                label,
                span_days,
                min_date,
                max_date,
                TARGET_BACKFILL_YEARS,
            )
            return

        logger.info(
            "Startup %s span is %s days (%s to %s), below %s-year target; ingest attempt %s/%s",
            label,
            span_days if span_days is not None else "none",
            min_date,
            max_date,
            TARGET_BACKFILL_YEARS,
            attempt,
            STARTUP_BACKFILL_ATTEMPTS,
        )
        await ingest()

        if attempt < STARTUP_BACKFILL_ATTEMPTS:
            await asyncio.sleep(STARTUP_BACKFILL_RETRY_SECONDS)

    min_date, max_date, span_days = await fetch_span()
    if span_days is not None and span_days >= TARGET_BACKFILL_DAYS:
        logger.info(
            "Startup %s reached %s-year target after retries (%s days)",
            label,
            TARGET_BACKFILL_YEARS,
            span_days,
        )
    else:
        logger.error(
            "Startup %s failed to reach %s-year target after %s attempts; final span=%s days (%s to %s)",
            label,
            TARGET_BACKFILL_YEARS,
            STARTUP_BACKFILL_ATTEMPTS,
            span_days if span_days is not None else "none",
            min_date,
            max_date,
        )


async def get_backfill_status() -> dict:
    flu_min, flu_max, flu_span = await _get_flu_case_span()
    gen_min, gen_max, gen_span = await _get_genomics_span()
    return {
        "target_years": TARGET_BACKFILL_YEARS,
        "flu_cases": {
            "min_date": flu_min.isoformat() if flu_min else None,
            "max_date": flu_max.isoformat() if flu_max else None,
            "span_days": flu_span,
            "meets_target": bool(flu_span is not None and flu_span >= TARGET_BACKFILL_DAYS),
        },
        "genomics": {
            "min_date": gen_min.isoformat() if gen_min else None,
            "max_date": gen_max.isoformat() if gen_max else None,
            "span_days": gen_span,
            "meets_target": bool(gen_span is not None and gen_span >= TARGET_BACKFILL_DAYS),
        },
    }
