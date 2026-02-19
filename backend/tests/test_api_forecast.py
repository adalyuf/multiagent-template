"""Tests for /api/forecast endpoint."""

from datetime import date, timedelta

import pytest

from app.models import FluCase


@pytest.mark.asyncio
async def test_forecast_empty(client):
    resp = await client.get("/api/forecast")
    assert resp.status_code == 200
    data = resp.json()
    assert data["historical"] == []
    assert data["forecast"] == []


@pytest.mark.asyncio
async def test_forecast_with_data(client, seed_flu_cases):
    resp = await client.get("/api/forecast")
    assert resp.status_code == 200
    data = resp.json()
    # Only 2 data points in seed, below the 10-point threshold
    assert data["historical"] == []
    assert data["forecast"] == []


@pytest.mark.asyncio
async def test_forecast_with_enough_data_points(client, db_session):
    # Need 26+ data points for historical to populate (forecast.py slices last 26)
    start = date(2025, 1, 6)
    for i in range(30):
        db_session.add(
            FluCase(
                country_code="US",
                flu_type="H1N1",
                source="who_flunet",
                time=start + timedelta(weeks=i),
                new_cases=100 + (i * 10),
                iso_year=2025,
                iso_week=1 + i,
            )
        )
    await db_session.commit()

    resp = await client.get("/api/forecast?country=US&weeks=3")
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["historical"]) == 26
    assert len(data["forecast"]) == 3
    assert all(point["forecast"] is not None for point in data["forecast"])
    assert all(point["gaussian_mean"] is not None for point in data["forecast"])
    assert all(point["gaussian_stddev"] is not None for point in data["forecast"])
