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
    GOOGLE_APPLICATION_CREDENTIALS: str = ""  # Path to service account JSON (local dev)
    # In Cloud Run, ADC (Application Default Credentials) is used automatically

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # Cache TTLs (seconds)
    ZONE_DENSITY_TTL: int = 30
    SESSION_TTL: int = 3600
    ALERT_TTL: int = 300
    QUEUE_STATE_TTL: int = 20

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://flowsync-arena.run.app",
    ]

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
