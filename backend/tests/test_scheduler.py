from app.scheduler import create_scheduler


def test_create_scheduler_has_expected_jobs():
    scheduler = create_scheduler()

    jobs = scheduler.get_jobs()
    job_ids = {job.id for job in jobs}

    assert len(jobs) == 3
    assert job_ids == {"who_flunet", "anomaly_detection", "full_daily_rebuild"}
