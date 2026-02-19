"""Tests for Pydantic response schemas."""

from datetime import datetime

from app.schemas import (
    CaseSummary,
    MapDataPoint,
    CountryRow,
    AnomalyOut,
    ForecastPoint,
    GenomicSummary,
)


def test_case_summary_defaults():
    s = CaseSummary()
    assert s.total_cases == 0
    assert s.week_change_pct == 0.0


def test_map_data_point():
    p = MapDataPoint(country_code="US", total_cases=1000, per_100k=3.02)
    assert p.country_code == "US"


def test_country_row_sparkline():
    r = CountryRow(country_code="GB", sparkline=[1, 2, 3])
    assert r.sparkline == [1, 2, 3]
    assert r.dominant_type == ""


def test_anomaly_out():
    a = AnomalyOut(
        id=1, country_code="US", country_name="United States",
        anomaly_type="spike", severity="high",
        message="test", detected_at=datetime(2025, 6, 1),
    )
    assert a.severity == "high"


def test_forecast_point_optional_fields():
    p = ForecastPoint(date="2025-06-01")
    assert p.actual is None
    assert p.forecast is None
    assert p.gaussian_mean is None
    assert p.gaussian_stddev is None


def test_genomic_summary_defaults():
    s = GenomicSummary()
    assert s.total_sequences == 0
    assert s.dominant_clade == ""
