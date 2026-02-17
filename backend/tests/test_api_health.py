"""Tests for the /api/health endpoint."""

import pytest


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
