import logging
from datetime import timedelta
from sqlalchemy import select, func
from app.config import settings
from app.database import async_session
from app.models import FluCase
import numpy as np

logger = logging.getLogger(__name__)


async def generate_forecast(country_code: str = None, weeks_ahead: int = 8):
    """Simple exponential smoothing forecast with confidence intervals."""
    try:
        async with async_session() as session:
            q = (
                select(
                    FluCase.time,
                    func.sum(FluCase.new_cases).label("total")
                )
                .group_by(FluCase.time)
                .order_by(FluCase.time)
            )
            if country_code:
                q = q.where(FluCase.country_code == country_code)

            result = await session.execute(q)
            rows = list(result)

        if len(rows) < 4:
            return {"historical": [], "forecast": []}

        dates = [r.time for r in rows]
        values = [float(r.total) for r in rows]
        gaussian_window = values[-12:] if len(values) >= 12 else values
        gaussian_mean = float(np.mean(gaussian_window)) if gaussian_window else 0.0
        gaussian_stddev = float(np.std(gaussian_window)) if gaussian_window else 0.0

        # Simple exponential smoothing
        alpha = settings.FORECAST_ALPHA
        smoothed = [values[0]]
        for v in values[1:]:
            smoothed.append(alpha * v + (1 - alpha) * smoothed[-1])

        last_val = smoothed[-1]
        last_date = dates[-1]

        # Residuals for confidence intervals
        residuals = [abs(values[i] - smoothed[i]) for i in range(len(values))]
        std_residual = float(np.std(residuals)) if residuals else 0

        historical = [
            {
                "date": d.isoformat(),
                "actual": int(v),
                "forecast": None,
                "lower": None,
                "upper": None,
            }
            for d, v in zip(dates[-26:], values[-26:])
        ]

        forecast = []
        for w in range(1, weeks_ahead + 1):
            fd = last_date + timedelta(weeks=w)
            width = settings.FORECAST_CI_MULTIPLIER * std_residual * (w ** 0.5)
            point = {
                "date": fd.isoformat(),
                "actual": None,
                "forecast": round(last_val, 1),
                "lower": round(max(0, last_val - width), 1),
                "upper": round(last_val + width, 1),
                "gaussian_mean": round(gaussian_mean, 1),
                "gaussian_stddev": round(gaussian_stddev, 1),
            }
            logger.debug(
                "Forecast week=%s deterministic=%.1f gaussian_mean=%.1f gaussian_stddev=%.1f",
                w,
                point["forecast"],
                point["gaussian_mean"],
                point["gaussian_stddev"],
            )
            forecast.append(point)

        return {"historical": historical, "forecast": forecast}
    except Exception:
        logger.exception("Forecast generation failed")
        return {"historical": [], "forecast": []}
