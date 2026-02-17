"""Tests for /api/anomalies endpoint."""

from datetime import datetime, timedelta

import pytest

from app.models import Anomaly


@pytest.mark.asyncio
async def test_anomalies_empty(client):
    resp = await client.get("/api/anomalies")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_anomalies_with_data(client, seed_anomalies):
    resp = await client.get("/api/anomalies")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    severities = {a["severity"] for a in data}
    assert "high" in severities
    assert "medium" in severities
    # Check all required fields present
    for a in data:
        assert "id" in a
        assert "country_code" in a
        assert "message" in a
        assert "detected_at" in a


@pytest.mark.asyncio
async def test_anomalies_sorted_desc_and_limited_to_50(client, db_session):
    base = datetime(2025, 1, 1, 12, 0, 0)
    rows = []
    for i in range(60):
        rows.append(
            Anomaly(
                country_code=f"C{i:02d}",
                country_name=f"Country {i}",
                anomaly_type="spike",
                severity="medium",
                message=f"anomaly-{i}",
                detected_at=base + timedelta(hours=i),
            )
        )
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get("/api/anomalies")
    assert resp.status_code == 200
    data = resp.json()

    assert len(data) == 50
    timestamps = [datetime.fromisoformat(item["detected_at"]) for item in data]
    assert timestamps == sorted(timestamps, reverse=True)
    # Latest inserted rows should be returned, oldest 10 should be excluded.
    assert data[0]["message"] == "anomaly-59"
    assert data[-1]["message"] == "anomaly-10"
