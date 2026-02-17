import httpx
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.database import async_session
from app.models import FluCase

logger = logging.getLogger(__name__)

FLUNET_URL = "https://xmart-api-public.who.int/FLUMART/VIW_FNT"

UK_CODES = {"XE", "XI", "XS", "XW"}

SUBTYPE_MAP = {
    "AH1N12009": "H1N1",
    "AH3": "H3N2",
    "AH5": "H5N1",
    "AH7N9": "H7N9",
    "BYAM": "B/Yamagata",
    "BVIC": "B/Victoria",
}
AGGREGATE_MAP = {
    "INF_A": "A (unsubtyped)",
    "INF_B": "B (lineage unknown)",
}
LAST_RESORT = {"INF_ALL", "ALL_INF"}

SPECIFIC_FIELDS = list(SUBTYPE_MAP.keys())
AGGREGATE_FIELDS = list(AGGREGATE_MAP.keys())
LAST_RESORT_FIELDS = list(LAST_RESORT)


def _parse_week_date(iso_year: int, iso_week: int) -> datetime:
    return datetime.strptime(f"{iso_year}-W{iso_week:02d}-1", "%G-W%V-%u")


def _normalize_country(code: str) -> str:
    if code and code.upper() in UK_CODES:
        return "GB"
    return (code or "").upper()


async def fetch_flunet(weeks_back: int = 4):
    """Fetch WHO FluNet data for the last N weeks."""
    cutoff = datetime.utcnow() - timedelta(weeks=weeks_back)
    iso_year = cutoff.isocalendar()[0]
    iso_week = cutoff.isocalendar()[1]

    url = (
        f"{FLUNET_URL}?$filter=ISO_YEAR ge {iso_year} and ISO_WEEK ge {iso_week}"
        f"&$top=120000"
    )

    records = []
    async with httpx.AsyncClient(timeout=120) as client:
        while url:
            logger.info(f"Fetching FluNet: {url[:120]}...")
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            records.extend(data.get("value", []))
            url = data.get("@odata.nextLink")

    logger.info(f"Fetched {len(records)} raw FluNet records")
    return _process_records(records)


async def fetch_flunet_full():
    """Full backfill — fetch all available data."""
    url = f"{FLUNET_URL}?$top=120000"
    records = []
    async with httpx.AsyncClient(timeout=180) as client:
        while url:
            logger.info(f"Fetching FluNet (full): {url[:120]}...")
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            records.extend(data.get("value", []))
            url = data.get("@odata.nextLink")

    logger.info(f"Fetched {len(records)} raw FluNet records (full)")
    return _process_records(records)


def _process_records(records: list) -> list[dict]:
    """Parse FluNet records with subtype priority and UK normalization."""
    parsed = []

    for rec in records:
        iso_year = rec.get("ISO_YEAR")
        iso_week = rec.get("ISO_WEEK")
        if not iso_year or not iso_week:
            continue

        country_code = _normalize_country(
            rec.get("ISO2") or rec.get("COUNTRY_CODE") or ""
        )
        if not country_code:
            continue

        try:
            time_val = _parse_week_date(iso_year, iso_week)
        except (ValueError, TypeError):
            continue

        has_specific = False
        for field, label in SUBTYPE_MAP.items():
            val = rec.get(field)
            if val and int(val) > 0:
                has_specific = True
                parsed.append({
                    "country_code": country_code,
                    "region": "",
                    "city": "",
                    "flu_type": label,
                    "source": "who_flunet",
                    "time": time_val.date(),
                    "new_cases": int(val),
                    "iso_year": iso_year,
                    "iso_week": iso_week,
                })

        if not has_specific:
            for field, label in AGGREGATE_MAP.items():
                val = rec.get(field)
                if val and int(val) > 0:
                    has_specific = True
                    parsed.append({
                        "country_code": country_code,
                        "region": "",
                        "city": "",
                        "flu_type": label,
                        "source": "who_flunet",
                        "time": time_val.date(),
                        "new_cases": int(val),
                        "iso_year": iso_year,
                        "iso_week": iso_week,
                    })

        if not has_specific:
            for field in LAST_RESORT_FIELDS:
                val = rec.get(field)
                if val and int(val) > 0:
                    parsed.append({
                        "country_code": country_code,
                        "region": "",
                        "city": "",
                        "flu_type": "unknown",
                        "source": "who_flunet",
                        "time": time_val.date(),
                        "new_cases": int(val),
                        "iso_year": iso_year,
                        "iso_week": iso_week,
                    })
                    break

    # Aggregate duplicates (handles UK merging)
    agg = defaultdict(int)
    meta = {}
    for r in parsed:
        key = (r["time"], r["country_code"], r["region"], r["city"], r["flu_type"], r["source"])
        agg[key] += r["new_cases"]
        meta[key] = (r["iso_year"], r["iso_week"])

    result = []
    for key, total in agg.items():
        time_val, cc, region, city, flu_type, source = key
        iy, iw = meta[key]
        result.append({
            "country_code": cc,
            "region": region,
            "city": city,
            "flu_type": flu_type,
            "source": source,
            "time": time_val,
            "new_cases": total,
            "iso_year": iy,
            "iso_week": iw,
        })

    return result


async def ingest_flunet(weeks_back: int = 4):
    """Fetch and upsert FluNet data."""
    try:
        records = await fetch_flunet(weeks_back)
        await _upsert_records(records)
        logger.info(f"Ingested {len(records)} FluNet records")
    except Exception:
        logger.exception("FluNet ingestion failed")


async def ingest_flunet_full():
    """Full backfill and upsert."""
    try:
        records = await fetch_flunet_full()
        await _upsert_records(records)
        logger.info(f"Ingested {len(records)} FluNet records (full)")
    except Exception:
        logger.exception("FluNet full ingestion failed")


async def _upsert_records(records: list[dict]):
    if not records:
        return

    async with async_session() as session:
        # Deduplicate records within this payload only; existing-row duplicates
        # are handled by ON CONFLICT DO NOTHING at the database level.
        deduped_records = []
        seen = set()
        for r in records:
            key = (r["country_code"], r["region"], r["city"],
                   r["flu_type"], r["source"], r["time"])
            if key not in seen:
                seen.add(key)
                deduped_records.append(r)

        if deduped_records:
            # Batch insert
            for i in range(0, len(deduped_records), 1000):
                batch = deduped_records[i:i + 1000]
                stmt = pg_insert(FluCase).values(batch)
                stmt = stmt.on_conflict_do_nothing(
                    constraint="uq_flu_case"
                )
                await session.execute(stmt)
            await session.commit()
            logger.info(f"Upserted {len(deduped_records)} FluNet records")
        else:
            logger.info("No new FluNet records to insert")
