"""Tests for API rate limiting."""

import pytest


@pytest.mark.asyncio
async def test_health_endpoint_rate_limited(client):
    status_codes = []
    for _ in range(70):
        resp = await client.get("/api/health")
        status_codes.append(resp.status_code)

    assert 200 in status_codes
    assert 429 in status_codes
