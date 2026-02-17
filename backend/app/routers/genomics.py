from datetime import date, timedelta
from fastapi import APIRouter, Query
from sqlalchemy import select, func, desc, cast, String
from app.database import async_session
from app.models import GenomicSequence
from app.schemas import GenomicTrendPoint, GenomicSummary, GenomicCountryRow

router = APIRouter()


@router.get("/trends", response_model=list[GenomicTrendPoint])
async def genomic_trends(
    years: int = Query(1, description="Years of data"),
    country: str = Query("", description="Country filter"),
    top_n: int = Query(6, description="Top N clades"),
):
    async with async_session() as session:
        cutoff = date.today() - timedelta(days=years * 365)

        # Get top clades
        top_q = (
            select(
                GenomicSequence.clade,
                func.sum(GenomicSequence.count).label("total"),
            )
            .where(GenomicSequence.collection_date >= cutoff)
            .group_by(GenomicSequence.clade)
            .order_by(desc("total"))
            .limit(top_n)
        )
        if country:
            top_q = top_q.where(GenomicSequence.country_code == country)

        top_result = await session.execute(top_q)
        top_clades = [r.clade for r in top_result]

        if not top_clades:
            return []

        # Monthly trends for top clades — use extract() for DB-agnostic grouping
        year_col = func.extract("year", GenomicSequence.collection_date).label("yr")
        month_col = func.extract("month", GenomicSequence.collection_date).label("mn")
        q = (
            select(
                year_col,
                month_col,
                GenomicSequence.clade,
                func.sum(GenomicSequence.count).label("total"),
            )
            .where(
                GenomicSequence.collection_date >= cutoff,
                GenomicSequence.clade.in_(top_clades),
            )
            .group_by(year_col, month_col, GenomicSequence.clade)
            .order_by(year_col, month_col)
        )
        if country:
            q = q.where(GenomicSequence.country_code == country)

        result = await session.execute(q)
        return [
            GenomicTrendPoint(
                date=f"{int(r.yr)}-{int(r.mn):02d}-01",
                clade=r.clade,
                count=r.total,
            )
            for r in result
        ]


@router.get("/summary", response_model=GenomicSummary)
async def genomic_summary():
    async with async_session() as session:
        total_r = await session.execute(select(func.sum(GenomicSequence.count)))
        total = total_r.scalar() or 0

        countries_r = await session.execute(
            select(func.count(func.distinct(GenomicSequence.country_code)))
        )
        countries = countries_r.scalar() or 0

        clades_r = await session.execute(
            select(func.count(func.distinct(GenomicSequence.clade)))
        )
        clades = clades_r.scalar() or 0

        dom_r = await session.execute(
            select(GenomicSequence.clade, func.sum(GenomicSequence.count).label("total"))
            .group_by(GenomicSequence.clade)
            .order_by(desc("total"))
            .limit(1)
        )
        dom = dom_r.first()
        dominant = dom.clade if dom else ""

        return GenomicSummary(
            total_sequences=total,
            countries=countries,
            unique_clades=clades,
            dominant_clade=dominant,
        )


@router.get("/countries", response_model=list[GenomicCountryRow])
async def genomic_countries():
    async with async_session() as session:
        ranked_clades = (
            select(
                GenomicSequence.country_code,
                GenomicSequence.clade,
                func.sum(func.sum(GenomicSequence.count))
                .over(partition_by=GenomicSequence.country_code)
                .label("country_total"),
                func.row_number()
                .over(
                    partition_by=GenomicSequence.country_code,
                    order_by=(desc(func.sum(GenomicSequence.count)), GenomicSequence.clade),
                )
                .label("rn"),
            )
            .group_by(GenomicSequence.country_code, GenomicSequence.clade)
            .subquery()
        )

        q = (
            select(
                ranked_clades.c.country_code,
                ranked_clades.c.country_total,
                ranked_clades.c.clade,
            )
            .where(ranked_clades.c.rn == 1)
            .order_by(desc(ranked_clades.c.country_total))
            .limit(20)
        )
        result = await session.execute(q)
        rows = list(result)

        return [
            GenomicCountryRow(
                country_code=r.country_code,
                total_sequences=r.country_total,
                top_clade=r.clade or "",
            )
            for r in rows
        ]
