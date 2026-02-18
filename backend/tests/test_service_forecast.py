from datetime import date, timedelta

import pytest
import numpy as np

from app.models import FluCase
from app.config import settings
from app.services.forecast import generate_forecast


@pytest.mark.asyncio
async def test_generate_forecast_requires_minimum_points(db_session):
    start = date(2025, 1, 6)
    for i in range(3):
        db_session.add(
            FluCase(
                country_code="US",
                flu_type="H1N1",
                source="who_flunet",
                time=start + timedelta(weeks=i),
                new_cases=100 + i,
                iso_year=2025,
                iso_week=1 + i,
            )
        )
    await db_session.commit()

    out = await generate_forecast(country_code="US", weeks_ahead=4)
    assert out == {"historical": [], "forecast": []}


@pytest.mark.asyncio
async def test_generate_forecast_exponential_smoothing_output(db_session):
    start = date(2025, 1, 6)
    # Need 26+ points for historical to be populated
    values = [100 + i * 5 for i in range(30)]

    for i, v in enumerate(values):
        db_session.add(
            FluCase(
                country_code="US",
                flu_type="H1N1",
                source="who_flunet",
                time=start + timedelta(weeks=i),
                new_cases=v,
                iso_year=2025,
                iso_week=1 + i,
            )
        )

    # Different country should be ignored when filtering by US
    db_session.add(
        FluCase(
            country_code="GB",
            flu_type="H3N2",
            source="who_flunet",
            time=start,
            new_cases=999,
            iso_year=2025,
            iso_week=1,
        )
    )

    await db_session.commit()

    out = await generate_forecast(country_code="US", weeks_ahead=3)

    assert len(out["historical"]) == 26
    assert len(out["forecast"]) == 3

    # Verify exponential smoothing calculation
    alpha = 0.3
    smoothed = float(values[0])
    for v in values[1:]:
        smoothed = alpha * v + (1 - alpha) * smoothed

    first = out["forecast"][0]
    assert first["forecast"] == round(smoothed, 1)
    assert first["lower"] <= first["forecast"] <= first["upper"]

    # Verify forecast dates are sequential weeks after last data point
    last_data_date = start + timedelta(weeks=len(values) - 1)
    assert out["forecast"][0]["date"] == (last_data_date + timedelta(weeks=1)).isoformat()
    assert out["forecast"][1]["date"] == (last_data_date + timedelta(weeks=2)).isoformat()


@pytest.mark.asyncio
async def test_generate_forecast_uses_configurable_parameters(db_session):
    start = date(2025, 1, 6)
    values = [100, 140, 120, 150, 130, 160, 140, 170, 150, 180]

    for i, v in enumerate(values):
        db_session.add(
            FluCase(
                country_code="US",
                flu_type="H1N1",
                source="who_flunet",
                time=start + timedelta(weeks=i),
                new_cases=v,
                iso_year=2025,
                iso_week=1 + i,
            )
        )
    await db_session.commit()

    original_alpha = settings.FORECAST_ALPHA
    original_multiplier = settings.FORECAST_CI_MULTIPLIER
    settings.FORECAST_ALPHA = 0.5
    settings.FORECAST_CI_MULTIPLIER = 3.0
    try:
        out = await generate_forecast(country_code="US", weeks_ahead=1)
    finally:
        settings.FORECAST_ALPHA = original_alpha
        settings.FORECAST_CI_MULTIPLIER = original_multiplier

    smoothed = float(values[0])
    for v in values[1:]:
        smoothed = 0.5 * v + (1 - 0.5) * smoothed

    residuals = []
    smoothed_for_residuals = float(values[0])
    residuals.append(abs(values[0] - smoothed_for_residuals))
    for v in values[1:]:
        smoothed_for_residuals = 0.5 * v + (1 - 0.5) * smoothed_for_residuals
        residuals.append(abs(v - smoothed_for_residuals))

    std_residual = float(np.std(residuals))
    expected_width = 3.0 * std_residual * (1 ** 0.5)

    first = out["forecast"][0]
    assert first["forecast"] == round(smoothed, 1)
    assert first["lower"] == round(max(0, smoothed - expected_width), 1)
    assert first["upper"] == round(smoothed + expected_width, 1)
