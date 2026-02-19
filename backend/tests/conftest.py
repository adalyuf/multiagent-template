"""
Shared fixtures for backend tests.

Uses an in-memory SQLite database (via aiosqlite) so tests run without
a real PostgreSQL instance.
"""

from datetime import date, datetime

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.models import Base, FluCase, GenomicSequence, Anomaly

# ---------------------------------------------------------------------------
# Engine / session that every test will share
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite+aiosqlite:///file:test?mode=memory&cache=shared&uri=true"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# All modules that do "from app.database import async_session"
_MODULES_USING_SESSION = [
    "app.database",
    "app.scheduler",
    "app.routers.cases",
    "app.routers.genomics",
    "app.routers.anomalies",
    "app.services.flunet",
    "app.services.nextstrain",
    "app.services.anomaly",
    "app.services.forecast",
]


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop them after."""
    import sys

    # Patch async_session in every module that imported it
    originals = {}
    for mod_name in _MODULES_USING_SESSION:
        mod = sys.modules.get(mod_name)
        if mod and hasattr(mod, "async_session"):
            originals[mod_name] = getattr(mod, "async_session")
            setattr(mod, "async_session", TestSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # Restore originals
    for mod_name, orig in originals.items():
        mod = sys.modules.get(mod_name)
        if mod:
            setattr(mod, "async_session", orig)


@pytest_asyncio.fixture
async def db_session():
    """Provide a clean database session for direct DB tests."""
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """Async HTTPX client wired to the FastAPI app with test DB."""
    from app.main import app as fastapi_app

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def seed_flu_cases(db_session: AsyncSession):
    """Insert a handful of flu-case rows spanning two weeks and two countries."""
    cases = [
        FluCase(country_code="US", flu_type="H1N1", source="who_flunet",
                time=date(2025, 6, 2), new_cases=100, iso_year=2025, iso_week=23),
        FluCase(country_code="US", flu_type="H3N2", source="who_flunet",
                time=date(2025, 6, 2), new_cases=50, iso_year=2025, iso_week=23),
        FluCase(country_code="US", flu_type="H1N1", source="who_flunet",
                time=date(2025, 6, 9), new_cases=120, iso_year=2025, iso_week=24),
        FluCase(country_code="GB", flu_type="H3N2", source="who_flunet",
                time=date(2025, 6, 2), new_cases=80, iso_year=2025, iso_week=23),
        FluCase(country_code="GB", flu_type="H3N2", source="who_flunet",
                time=date(2025, 6, 9), new_cases=60, iso_year=2025, iso_week=24),
    ]
    db_session.add_all(cases)
    await db_session.commit()
    return cases


@pytest_asyncio.fixture
async def seed_genomic_sequences(db_session: AsyncSession):
    """Insert genomic sequence rows."""
    seqs = [
        GenomicSequence(country_code="US", clade="2a.3a.1", lineage="",
                        collection_date=date(2025, 5, 1), count=10),
        GenomicSequence(country_code="US", clade="2a.3", lineage="",
                        collection_date=date(2025, 5, 1), count=5),
        GenomicSequence(country_code="GB", clade="2a.3a.1", lineage="",
                        collection_date=date(2025, 5, 1), count=8),
    ]
    db_session.add_all(seqs)
    await db_session.commit()
    return seqs


@pytest_asyncio.fixture
async def seed_anomalies(db_session: AsyncSession):
    """Insert anomaly rows."""
    anomalies = [
        Anomaly(country_code="US", country_name="United States",
                anomaly_type="spike", severity="high",
                message="US: cases 3.2x std above mean",
                detected_at=datetime(2025, 6, 10, 12, 0)),
        Anomaly(country_code="GB", country_name="United Kingdom",
                anomaly_type="spike", severity="medium",
                message="GB: cases 2.5x std above mean",
                detected_at=datetime(2025, 6, 10, 12, 0)),
    ]
    db_session.add_all(anomalies)
    await db_session.commit()
    return anomalies
