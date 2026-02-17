from datetime import date, timedelta

import pytest

from app.models import FluCase
from app.services.forecast import generate_forecast


@pytest.mark.asyncio
async def test_generate_forecast_requires_minimum_points(db_session):
    start = date(2025, 1, 6)
    for i in range(9):
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
