"""Tests for the /api/health endpoint."""

from datetime import date

import pytest

from app.models import FluCase, GenomicSequence


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_schema(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"status"}
    assert isinstance(data["status"], str)
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_health_backfill_empty(client):
    resp = await client.get("/api/health/backfill")
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_years"] == 10
    assert data["flu_cases"]["min_date"] is None
    assert data["flu_cases"]["max_date"] is None
    assert data["flu_cases"]["span_days"] is None
    assert data["flu_cases"]["meets_target"] is False
    assert data["genomics"]["min_date"] is None
    assert data["genomics"]["max_date"] is None
    assert data["genomics"]["span_days"] is None
    assert data["genomics"]["meets_target"] is False


@pytest.mark.asyncio
async def test_health_backfill_meets_target(client, db_session):
    rows = [
        FluCase(
            country_code="US",
            flu_type="H1N1",
            source="who_flunet",
            time=date(2015, 1, 1),
            new_cases=10,
            iso_year=2015,
            iso_week=1,
        ),
        FluCase(
            country_code="US",
            flu_type="H1N1",
            source="who_flunet",
            time=date(2025, 1, 1),
            new_cases=12,
            iso_year=2025,
            iso_week=1,
        ),
        GenomicSequence(
            country_code="US",
            clade="2a",
            lineage="",
            collection_date=date(2015, 1, 1),
            count=1,
        ),
        GenomicSequence(
            country_code="US",
            clade="2a",
            lineage="",
            collection_date=date(2025, 1, 1),
            count=1,
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/health/backfill")
    assert resp.status_code == 200
    data = resp.json()
    assert data["flu_cases"]["span_days"] >= 3650
    assert data["flu_cases"]["meets_target"] is True
    assert data["genomics"]["span_days"] >= 3650
    assert data["genomics"]["meets_target"] is True
