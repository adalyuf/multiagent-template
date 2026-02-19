from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.models import AnomalyType, Severity


class CaseSummary(BaseModel):
    total_cases: int = 0
    countries_reporting: int = 0
    current_week_cases: int = 0
    prior_week_cases: int = 0
    week_change_pct: float = 0.0


class MapDataPoint(BaseModel):
    country_code: str
    total_cases: int
    per_100k: float = 0.0


class HistoricalPoint(BaseModel):
    season: str
    week_offset: int
    date: str
    cases: int


class SubtypePoint(BaseModel):
    date: str
    subtype: str
    cases: int


class CountryRow(BaseModel):
    rank: int = 0
    country_code: str
    country_name: str = ""
    total_cases: int = 0
    per_100k: float = 0.0
    prior_year_cases: int = 0
    delta_pct: float = 0.0
    dominant_type: str = ""
    sparkline: list[int] = []
    severity: float = 0.0
    continent: str = ""


class AnomalyOut(BaseModel):
    id: int
    country_code: str
    country_name: str
    anomaly_type: AnomalyType
    severity: Severity
    message: str
    detected_at: datetime


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[int] = None
    forecast: Optional[float] = None
    lower: Optional[float] = None
    upper: Optional[float] = None
    gaussian_mean: Optional[float] = None
    gaussian_stddev: Optional[float] = None


class GenomicTrendPoint(BaseModel):
    date: str
    clade: str
    count: int


class GenomicSummary(BaseModel):
    total_sequences: int = 0
    countries: int = 0
    unique_clades: int = 0
    dominant_clade: str = ""


class GenomicCountryRow(BaseModel):
    country_code: str
    total_sequences: int
    top_clade: str = ""
