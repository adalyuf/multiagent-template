import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SAEnum,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase


class FluType(str, enum.Enum):
    H1N1 = "H1N1"
    H3N2 = "H3N2"
    H5N1 = "H5N1"
    H7N9 = "H7N9"
    B_YAMAGATA = "B/Yamagata"
    B_VICTORIA = "B/Victoria"
    A_UNSUBTYPED = "A (unsubtyped)"
    B_LINEAGE_UNKNOWN = "B (lineage unknown)"
    UNKNOWN = "unknown"


class AnomalyType(str, enum.Enum):
    SPIKE = "spike"


class Severity(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"


class Base(DeclarativeBase):
    pass


class FluCase(Base):
    __tablename__ = "flu_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    country_code = Column(String(10), nullable=False, index=True)
    region = Column(String(100), default="")
    city = Column(String(100), default="")
    flu_type = Column(SAEnum(FluType, native_enum=False), nullable=False)
    source = Column(String(50), nullable=False, default="who_flunet")
    time = Column(Date, nullable=False, index=True)
    new_cases = Column(Integer, nullable=False, default=0)
    iso_year = Column(Integer, nullable=False)
    iso_week = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("country_code", "region", "city", "flu_type", "source", "time",
                         name="uq_flu_case"),
    )


class GenomicSequence(Base):
    __tablename__ = "genomic_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    country_code = Column(String(10), nullable=False, index=True)
    clade = Column(String(100), nullable=False)
    lineage = Column(String(100), default="")
    collection_date = Column(Date, nullable=False)
    count = Column(Integer, nullable=False, default=1)

    __table_args__ = (
        UniqueConstraint("country_code", "clade", "lineage", "collection_date",
                         name="uq_genomic_seq"),
    )


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    country_code = Column(String(10), nullable=False)
    country_name = Column(String(200), nullable=False, default="")
    anomaly_type = Column(SAEnum(AnomalyType, native_enum=False), nullable=False)
    severity = Column(
        SAEnum(Severity, native_enum=False),
        nullable=False,
        default=Severity.MEDIUM,
    )
    message = Column(String(500), nullable=False, default="")
    # Single-column index: /api/anomalies orders by detected_at only (no
    # additional equality filters on severity or anomaly_type), so a composite
    # index would not improve that query.
    # For existing deployments run migrations/add_anomaly_detected_at_index.sql
    # which uses CREATE INDEX CONCURRENTLY to avoid locking the table.
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
