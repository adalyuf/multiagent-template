"""Tests for /api/genomics/* endpoints."""

from datetime import date

import pytest

from app.models import GenomicSequence


@pytest.mark.asyncio
async def test_genomics_summary_empty(client):
    resp = await client.get("/api/genomics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_sequences"] == 0


@pytest.mark.asyncio
async def test_genomics_summary_with_data(client, seed_genomic_sequences):
    resp = await client.get("/api/genomics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_sequences"] == 23  # 10 + 5 + 8
    assert data["countries"] == 2
    assert data["unique_clades"] == 2
    assert data["dominant_clade"] == "2a.3a.1"


@pytest.mark.asyncio
async def test_genomics_summary_dominant_clade_uses_aggregated_totals(client, db_session):
    rows = [
        GenomicSequence(
            country_code="US",
            clade="A",
            lineage="",
            collection_date=date(2025, 1, 1),
            count=6,
        ),
        GenomicSequence(
            country_code="GB",
            clade="A",
            lineage="",
            collection_date=date(2025, 1, 1),
            count=7,
        ),
        GenomicSequence(
            country_code="US",
            clade="B",
            lineage="",
            collection_date=date(2025, 1, 1),
            count=12,
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/genomics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_sequences"] == 25
    assert data["dominant_clade"] == "A"


@pytest.mark.asyncio
async def test_genomics_countries_empty(client):
    resp = await client.get("/api/genomics/countries")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_genomics_countries_with_data(client, seed_genomic_sequences):
    resp = await client.get("/api/genomics/countries")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["country_code"] == "US"  # US has 15, GB has 8
    assert data[0]["total_sequences"] == 15


@pytest.mark.asyncio
async def test_genomics_trends_empty(client):
    resp = await client.get("/api/genomics/trends")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_genomics_trends_with_data(client, seed_genomic_sequences):
    resp = await client.get("/api/genomics/trends?years=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    # All seed data is from 2025-05, so there should be one month bucket
    dates = {item["date"] for item in data}
    assert "2025-05-01" in dates
    # Verify response shape
    for item in data:
        assert "date" in item
        assert "clade" in item
        assert "count" in item


@pytest.mark.asyncio
async def test_genomics_trends_anchors_cutoff_to_latest_db_date(client, db_session):
    rows = [
        GenomicSequence(
            country_code="US",
            clade="2a",
            lineage="",
            collection_date=date(2020, 1, 1),
            count=5,
        ),
        GenomicSequence(
            country_code="US",
            clade="2a",
            lineage="",
            collection_date=date(2020, 2, 1),
            count=6,
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/genomics/trends?years=1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
