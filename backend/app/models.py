from sqlalchemy import Column, Integer, String, Date, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime


class Base(DeclarativeBase):
    pass


class FluCase(Base):
    __tablename__ = "flu_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    country_code = Column(String(10), nullable=False, index=True)
    region = Column(String(100), default="")
    city = Column(String(100), default="")
    flu_type = Column(String(50), nullable=False)
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
    anomaly_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, default="medium")
    message = Column(String(500), nullable=False, default="")
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
