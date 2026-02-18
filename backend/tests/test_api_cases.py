"""Tests for /api/cases/* endpoints."""

from datetime import date

import pytest

from app.models import FluCase
from app.population import POPULATIONS


@pytest.mark.asyncio
async def test_cases_summary_empty(client):
    resp = await client.get("/api/cases/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cases"] == 0
    assert data["countries_reporting"] == 0


@pytest.mark.asyncio
async def test_cases_summary_with_data(client, seed_flu_cases):
    resp = await client.get("/api/cases/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cases"] > 0
    assert data["countries_reporting"] == 2  # US and GB


@pytest.mark.asyncio
async def test_cases_map_empty(client):
    resp = await client.get("/api/cases/map")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_cases_map_with_data(client, seed_flu_cases):
    resp = await client.get("/api/cases/map")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    codes = {d["country_code"] for d in data}
    assert "US" in codes


@pytest.mark.asyncio
async def test_cases_map_computes_per_100k(client, db_session):
    rows = [
        FluCase(
            country_code="US",
            flu_type="H1N1",
            source="who_flunet",
            time=date(2025, 2, 1),
            new_cases=331,
            iso_year=2025,
            iso_week=5,
        ),
        FluCase(
            country_code="GB",
            flu_type="H3N2",
            source="who_flunet",
            time=date(2025, 2, 1),
            new_cases=67,
            iso_year=2025,
            iso_week=5,
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/cases/map")
    assert resp.status_code == 200
    data = {row["country_code"]: row for row in resp.json()}

    assert data["US"]["total_cases"] == 331
    assert data["GB"]["total_cases"] == 67
    assert data["US"]["per_100k"] == round(331 / POPULATIONS["US"] * 100000, 2)
    assert data["GB"]["per_100k"] == round(67 / POPULATIONS["GB"] * 100000, 2)


@pytest.mark.asyncio
async def test_cases_historical_empty(client):
    resp = await client.get("/api/cases/historical")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_cases_historical_with_data(client, seed_flu_cases):
    resp = await client.get("/api/cases/historical")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert "season" in data[0]
    assert "week_offset" in data[0]


@pytest.mark.asyncio
async def test_cases_historical_normalizes_oct_sep_season(client, db_session):
    rows = [
        FluCase(
            country_code="US",
            flu_type="H1N1",
            source="who_flunet",
            time=date(2025, 9, 30),
            new_cases=10,
            iso_year=2025,
            iso_week=40,
        ),
        FluCase(
            country_code="US",
            flu_type="H1N1",
            source="who_flunet",
            time=date(2025, 10, 1),
            new_cases=20,
            iso_year=2025,
            iso_week=40,
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/cases/historical")
    assert resp.status_code == 200
    data = resp.json()

    assert len(data) == 2
    assert data[0]["date"] == "2025-09-30"
    assert data[0]["season"] == "2024/2025"
    assert data[0]["week_offset"] == 52
    assert data[1]["date"] == "2025-10-01"
    assert data[1]["season"] == "2025/2026"
    assert data[1]["week_offset"] == 0


@pytest.mark.asyncio
async def test_cases_historical_country_filter(client, db_session):
    rows = [
        FluCase(
            country_code="US",
            flu_type="H1N1",
            source="who_flunet",
            time=date(2025, 1, 1),
            new_cases=10,
            iso_year=2025,
            iso_week=1,
        ),
        FluCase(
            country_code="GB",
            flu_type="H3N2",
            source="who_flunet",
            time=date(2025, 1, 1),
            new_cases=20,
            iso_year=2025,
            iso_week=1,
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/cases/historical?country=US")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["cases"] == 10

@pytest.mark.asyncio
async def test_cases_subtypes_empty(client):
    resp = await client.get("/api/cases/subtypes")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_cases_subtypes_with_data(client, seed_flu_cases):
    resp = await client.get("/api/cases/subtypes")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    subtypes = {d["subtype"] for d in data}
    assert len(subtypes) >= 1


@pytest.mark.asyncio
async def test_cases_countries_empty(client):
    resp = await client.get("/api/cases/countries")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_cases_countries_with_data(client, seed_flu_cases):
    resp = await client.get("/api/cases/countries")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert "country_code" in data[0]
    assert "total_cases" in data[0]
    assert "sparkline" in data[0]


@pytest.mark.asyncio
async def test_cases_countries_search_filter(client, seed_flu_cases):
    resp = await client.get("/api/cases/countries?search=US")
    assert resp.status_code == 200
    data = resp.json()
    for row in data:
        assert "US" in row["country_code"].upper()


@pytest.mark.asyncio
async def test_cases_countries_search_no_match(client, seed_flu_cases):
    resp = await client.get("/api/cases/countries?search=ZZZZ")
    assert resp.status_code == 200
    assert resp.json() == []
