"""Tests for the _per_100k helper in the cases router."""

from app.population import DEFAULT_POPULATION, POPULATIONS
from app.routers.cases import _per_100k


def test_known_country():
    result = _per_100k(1000, "US")
    expected = round(1000 / POPULATIONS["US"] * 100000, 2)
    assert result == expected


def test_unknown_country_uses_default():
    result = _per_100k(1000, "ZZ")
    expected = round(1000 / DEFAULT_POPULATION * 100000, 2)
    assert result == expected


def test_zero_cases():
    assert _per_100k(0, "US") == 0.0


def test_small_country_dataset_entry_is_used():
    result = _per_100k(1000, "LU")
    expected = round(1000 / POPULATIONS["LU"] * 100000, 2)
    assert result == expected


def test_large_case_count():
    result = _per_100k(1_000_000, "US")
    assert result > 0
    assert isinstance(result, float)
