"""Population lookup utilities for per-capita case calculations."""

from __future__ import annotations

import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "populations.json"
DEFAULT_POPULATION = 50_000_000


def _load_populations() -> dict[str, int]:
    """Load ISO2 -> population from bundled JSON data."""
    try:
        raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    populations: dict[str, int] = {}
    for country_code, value in raw.items():
        if not isinstance(country_code, str) or len(country_code) != 2:
            continue
        if not isinstance(value, int) or value <= 0:
            continue
        populations[country_code.upper()] = value
    return populations


POPULATIONS = _load_populations()


def get_population(country_code: str) -> int:
    return POPULATIONS.get(country_code.upper(), DEFAULT_POPULATION)
