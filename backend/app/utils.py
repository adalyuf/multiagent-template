from datetime import date, timedelta


def weeks_ago(reference_date: date, n: int) -> date:
    return reference_date - timedelta(weeks=n)
