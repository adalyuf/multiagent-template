from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    FORECAST_ALPHA: float = 0.3
    FORECAST_CI_MULTIPLIER: float = 1.96

    model_config = {"extra": "ignore"}

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
