from datetime import date
from fastapi import APIRouter, Query
from sqlalchemy import select, func, desc, text
from app.database import async_session
from app.models import FluCase
from app.schemas import CaseSummary, MapDataPoint, HistoricalPoint, SubtypePoint, CountryRow
from app.utils import weeks_ago

router = APIRouter()

# Rough population data for per-100k calculations (millions)
POPULATIONS = {
    "US": 331, "CN": 1412, "IN": 1408, "BR": 214, "RU": 144, "JP": 125,
    "DE": 83, "GB": 67, "FR": 65, "IT": 59, "CA": 38, "AU": 26,
    "ES": 47, "MX": 129, "KR": 52, "ID": 274, "TR": 85, "SA": 35,
    "ZA": 60, "AR": 46, "PL": 38, "NL": 17, "TH": 72, "EG": 104,
    "PH": 114, "VN": 98, "BD": 170, "PK": 225, "NG": 218, "ET": 120,
    "CL": 19, "CO": 51, "PE": 34, "MY": 33, "TW": 24, "SE": 10,
    "NO": 5, "DK": 6, "FI": 6, "CH": 9, "AT": 9, "BE": 12,
    "PT": 10, "CZ": 11, "GR": 11, "IE": 5, "NZ": 5, "SG": 6,
    "IL": 10, "HK": 7, "AE": 10, "QA": 3, "KW": 4,
}


def _per_100k(cases: int, cc: str) -> float:
    pop = POPULATIONS.get(cc, 50)
    return round(cases / (pop * 10000) * 100000, 2) if pop else 0


@router.get("/cases/summary", response_model=CaseSummary)
async def cases_summary():
    async with async_session() as session:
        max_date_r = await session.execute(select(func.max(FluCase.time)))
        max_date = max_date_r.scalar()
        if not max_date:
            return CaseSummary()

        current_cutoff = weeks_ago(max_date, 1)
        prior_cutoff = weeks_ago(max_date, 2)

        total_r = await session.execute(select(func.sum(FluCase.new_cases)))
        total = total_r.scalar() or 0

        countries_r = await session.execute(
            select(func.count(func.distinct(FluCase.country_code)))
        )
        countries = countries_r.scalar() or 0

        current_r = await session.execute(
            select(func.sum(FluCase.new_cases)).where(FluCase.time >= current_cutoff)
        )
        current_week = current_r.scalar() or 0

        prior_r = await session.execute(
            select(func.sum(FluCase.new_cases)).where(
                FluCase.time >= prior_cutoff, FluCase.time < current_cutoff
            )
        )
        prior_week = prior_r.scalar() or 0

        change = ((current_week - prior_week) / prior_week * 100) if prior_week else 0

        return CaseSummary(
            total_cases=total,
            countries_reporting=countries,
            current_week_cases=current_week,
            prior_week_cases=prior_week,
            week_change_pct=round(change, 1),
        )


@router.get("/cases/map", response_model=list[MapDataPoint])
async def cases_map():
    async with async_session() as session:
        max_date_r = await session.execute(select(func.max(FluCase.time)))
        max_date = max_date_r.scalar()
        if not max_date:
            return []

        cutoff = weeks_ago(max_date, 4)
        q = (
            select(
                FluCase.country_code,
                func.sum(FluCase.new_cases).label("total"),
            )
            .where(FluCase.time >= cutoff)
            .group_by(FluCase.country_code)
        )
        result = await session.execute(q)
        return [
            MapDataPoint(
                country_code=r.country_code,
                total_cases=r.total,
                per_100k=_per_100k(r.total, r.country_code),
            )
            for r in result
        ]


@router.get("/cases/historical", response_model=list[HistoricalPoint])
async def cases_historical():
    """Season comparison data — current + past 9 seasons, normalized Oct-Sep."""
    async with async_session() as session:
        q = (
            select(
                FluCase.time,
                func.sum(FluCase.new_cases).label("total"),
            )
            .group_by(FluCase.time)
            .order_by(FluCase.time)
        )
        result = await session.execute(q)
        rows = list(result)

    if not rows:
        return []

    points = []
    for r in rows:
        d = r.time
        # Season year: Oct starts new season
        season_year = d.year if d.month >= 10 else d.year - 1
        season = f"{season_year}/{season_year + 1}"
        # Week offset from Oct 1
        season_start = date(season_year, 10, 1)
        week_offset = (d - season_start).days // 7
        points.append(HistoricalPoint(
            season=season,
            week_offset=week_offset,
            date=d.isoformat(),
            cases=r.total,
        ))

    return points


@router.get("/cases/subtypes", response_model=list[SubtypePoint])
async def cases_subtypes():
    async with async_session() as session:
        max_date_r = await session.execute(select(func.max(FluCase.time)))
        max_date = max_date_r.scalar()
        if not max_date:
            return []

        cutoff = weeks_ago(max_date, 52)
        q = (
            select(
                FluCase.time,
                FluCase.flu_type,
                func.sum(FluCase.new_cases).label("total"),
            )
            .where(FluCase.time >= cutoff)
            .group_by(FluCase.time, FluCase.flu_type)
            .order_by(FluCase.time)
        )
        result = await session.execute(q)
        return [
            SubtypePoint(date=r.time.isoformat(), subtype=r.flu_type, cases=r.total)
            for r in result
        ]


@router.get("/cases/countries", response_model=list[CountryRow])
async def cases_countries(
    search: str = Query("", description="Search filter"),
    continent: str = Query("", description="Continent filter"),
    flu_type: str = Query("", description="Flu type filter"),
    sort: str = Query("cases", description="Sort field"),
):
    async with async_session() as session:
        max_date_r = await session.execute(select(func.max(FluCase.time)))
        max_date = max_date_r.scalar()
        if not max_date:
            return []

        cutoff = weeks_ago(max_date, 4)
        prior_cutoff = weeks_ago(max_date, 56)

        # Current period totals
        q = (
            select(
                FluCase.country_code,
                func.sum(FluCase.new_cases).label("total"),
            )
            .where(FluCase.time >= cutoff)
            .group_by(FluCase.country_code)
            .order_by(desc("total"))
        )
        result = await session.execute(q)
        current_data = {r.country_code: r.total for r in result}

        # Prior year same period
        prior_start = weeks_ago(cutoff, 52)
        prior_end = weeks_ago(cutoff, 48)
        prior_q = (
            select(
                FluCase.country_code,
                func.sum(FluCase.new_cases).label("total"),
            )
            .where(FluCase.time >= prior_start, FluCase.time < prior_end)
            .group_by(FluCase.country_code)
        )
        prior_result = await session.execute(prior_q)
        prior_data = {r.country_code: r.total for r in prior_result}

        # Dominant type per country (current period)
        dom_q = (
            select(
                FluCase.country_code,
                FluCase.flu_type,
                func.sum(FluCase.new_cases).label("total"),
            )
            .where(FluCase.time >= cutoff)
            .group_by(FluCase.country_code, FluCase.flu_type)
            .order_by(desc("total"))
        )
        dom_result = await session.execute(dom_q)
        dominant = {}
        for r in dom_result:
            if r.country_code not in dominant:
                dominant[r.country_code] = r.flu_type

        # Sparkline data (last 12 weeks)
        spark_cutoff = weeks_ago(max_date, 12)
        spark_q = (
            select(
                FluCase.country_code,
                FluCase.time,
                func.sum(FluCase.new_cases).label("total"),
            )
            .where(FluCase.time >= spark_cutoff)
            .group_by(FluCase.country_code, FluCase.time)
            .order_by(FluCase.time)
        )
        spark_result = await session.execute(spark_q)
        sparklines = {}
        for r in spark_result:
            sparklines.setdefault(r.country_code, []).append(r.total)

    rows = []
    sorted_countries = sorted(current_data.items(), key=lambda x: x[1], reverse=True)

    for rank, (cc, total) in enumerate(sorted_countries, 1):
        prior = prior_data.get(cc, 0)
        delta = ((total - prior) / prior * 100) if prior else 0
        per100k = _per_100k(total, cc)
        max_per100k = max(_per_100k(t, c) for c, t in current_data.items()) if current_data else 1
        severity = min(per100k / max(max_per100k, 1), 1.0)

        if search and search.lower() not in cc.lower():
            continue

        rows.append(CountryRow(
            rank=rank,
            country_code=cc,
            country_name=cc,
            total_cases=total,
            per_100k=per100k,
            prior_year_cases=prior,
            delta_pct=round(delta, 1),
            dominant_type=dominant.get(cc, ""),
            sparkline=sparklines.get(cc, []),
            severity=round(severity, 3),
        ))

    return rows[:50]
