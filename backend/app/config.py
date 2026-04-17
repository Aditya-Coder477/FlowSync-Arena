"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FlowSync Arena API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Google Cloud / Firestore
    GOOGLE_CLOUD_PROJECT: str = "flowsync-arena"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""  # Path to service account JSON (local dev only)
    # In Cloud Run, leave blank — ADC is used automatically via attached service account

    # Redis — all optional. App degrades gracefully when Redis is unavailable.
    REDIS_HOST: str = ""          # Empty = Redis disabled
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    REDIS_TLS: bool = False       # Set True for Google Cloud Memorystore with TLS

    # Cache TTLs (seconds)
    ZONE_DENSITY_TTL: int = 30
    SESSION_TTL: int = 3600
    ALERT_TTL: int = 300
    QUEUE_STATE_TTL: int = 20

    # CORS — comma-separated list of allowed origins
    # In production set this to your frontend Cloud Run URL
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [s.strip() for s in self.ALLOWED_ORIGINS.split(",") if s.strip()]

    @property
    def redis_enabled(self) -> bool:
        """Redis is only enabled when REDIS_HOST is explicitly configured."""
        return bool(self.REDIS_HOST.strip())

    # Crowd thresholds (percentage of capacity)
    ZONE_GREEN_THRESHOLD: float = 0.50   # < 50% = green
    ZONE_AMBER_THRESHOLD: float = 0.75   # 50–75% = amber
    ZONE_RED_THRESHOLD: float = 0.90     # 75–90% = red, > 90% = critical
    CALM_MODE_TRIGGER: float = 0.70      # avg density > 70% → Calm Mode

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
