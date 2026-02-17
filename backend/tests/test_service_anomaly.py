from datetime import date
from types import SimpleNamespace

import pytest

from app.services import anomaly


class ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar(self):
        return self._value


class IterResult:
    def __init__(self, rows):
        self._rows = rows

    def __iter__(self):
        return iter(self._rows)


class FakeSession:
    def __init__(self, results):
        self._results = list(results)
        self.execute_calls = 0
        self.added = []
        self.committed = False

    async def execute(self, _stmt):
        idx = self.execute_calls
        self.execute_calls += 1
        return self._results[idx]

    def add_all(self, objs):
        self.added.extend(objs)

    async def commit(self):
        self.committed = True


class FakeSessionCtx:
    def __init__(self, session):
        self._session = session

    async def __aenter__(self):
        return self._session

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.mark.asyncio
async def test_detect_anomalies_no_case_data(monkeypatch):
    session = FakeSession([
        ScalarResult(None),  # delete
        ScalarResult(None),  # max date
    ])

    monkeypatch.setattr(anomaly, "async_session", lambda: FakeSessionCtx(session))

    await anomaly.detect_anomalies()

    assert session.committed is True
    assert session.added == []
    assert session.execute_calls == 2


@pytest.mark.asyncio
async def test_detect_anomalies_creates_high_severity_spike(monkeypatch):
    session = FakeSession([
        ScalarResult(None),
        ScalarResult(date(2025, 2, 1)),
        IterResult([
            SimpleNamespace(country_code="US", recent_total=400),
            SimpleNamespace(country_code="GB", recent_total=200),
        ]),
        IterResult([
            SimpleNamespace(country_code="US", avg_cases=50.0, std_cases=10.0, n=20),
        ]),
    ])

    monkeypatch.setattr(anomaly, "async_session", lambda: FakeSessionCtx(session))

    await anomaly.detect_anomalies()

    assert session.committed is True
    assert len(session.added) == 1

    created = session.added[0]
    assert created.country_code == "US"
    assert created.severity == "high"
    assert created.anomaly_type == "spike"
    assert "5.0x std above mean" in created.message
