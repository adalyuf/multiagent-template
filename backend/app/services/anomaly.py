import logging
from datetime import datetime, timedelta
from sqlalchemy import select, func, delete, text
from app.database import async_session
from app.models import Anomaly, AnomalyType, FluCase, Severity

logger = logging.getLogger(__name__)

ZSCORE_THRESHOLD = 2.0


async def detect_anomalies():
    """Z-score based anomaly detection on recent case data."""
    try:
        async with async_session() as session:
            # Clear existing anomalies
            await session.execute(delete(Anomaly))

            # Get the max date in data
            result = await session.execute(select(func.max(FluCase.time)))
            max_date = result.scalar()
            if not max_date:
                logger.info("No case data for anomaly detection")
                await session.commit()
                return

            # Get recent 4 weeks of data per country
            recent_cutoff = max_date - timedelta(weeks=4)
            hist_cutoff = max_date - timedelta(weeks=52)

            # Recent totals per country
            recent_q = (
                select(
                    FluCase.country_code,
                    func.sum(FluCase.new_cases).label("recent_total")
                )
                .where(FluCase.time >= recent_cutoff)
                .group_by(FluCase.country_code)
            )
            recent_result = await session.execute(recent_q)
            recent_data = {row.country_code: row.recent_total for row in recent_result}

            # Historical weekly average and stddev per country (last 52 weeks)
            hist_q = (
                select(
                    FluCase.country_code,
                    func.avg(FluCase.new_cases).label("avg_cases"),
                    func.stddev(FluCase.new_cases).label("std_cases"),
                    func.count(FluCase.new_cases).label("n")
                )
                .where(FluCase.time >= hist_cutoff, FluCase.time < recent_cutoff)
                .group_by(FluCase.country_code)
            )
            hist_result = await session.execute(hist_q)
            hist_data = {}
            for row in hist_result:
                if row.std_cases and row.std_cases > 0 and row.n >= 10:
                    hist_data[row.country_code] = (row.avg_cases, row.std_cases)

            anomalies = []
            for cc, recent_total in recent_data.items():
                if cc not in hist_data:
                    continue
                avg, std = hist_data[cc]
                if std == 0:
                    continue
                # Weekly average for recent period
                weekly_avg = recent_total / 4.0
                zscore = (weekly_avg - avg) / std

                if zscore >= ZSCORE_THRESHOLD:
                    severity = Severity.HIGH if zscore >= 3.0 else Severity.MEDIUM
                    anomalies.append(Anomaly(
                        country_code=cc,
                        country_name=cc,
                        anomaly_type=AnomalyType.SPIKE,
                        severity=severity,
                        message=f"{cc}: cases {zscore:.1f}x std above mean ({int(weekly_avg)} vs avg {int(avg)})",
                        detected_at=datetime.utcnow(),
                    ))

            if anomalies:
                session.add_all(anomalies)
                logger.info(f"Detected {len(anomalies)} anomalies")
            else:
                logger.info("No anomalies detected")

            await session.commit()
    except Exception:
        logger.exception("Anomaly detection failed")
