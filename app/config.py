from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Moodle Settings
    MOODLE_BASE_URL: str = "https://learn.ucu.edu.ua"
    MOODLE_SERVICE_SHORTNAME: str = "moodle_mobile_app"
    MOODLE_MOCK_MODE: bool = False
    MOODLE_REQUEST_TIMEOUT: float = 15.0

    # Security Settings
    SECRET_KEY: str = "super-secret-moodle-connector-jwt-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Cookie Settings
    COOKIE_NAME: str = "moodle_session"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Gemini AI Settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Workspace Persistence & Isolation (Zero Moodle passwords/cookies stored; only mixes & hashes)
    WORKSPACE_DB_PATH: str = "data/workspace.db"
    WORKSPACE_COOKIE_NAME: str = "workspace_session"
    WORKSPACE_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    BUILD_DEBOUNCE_SECONDS: float = 30.0
    BUILD_MAX_CONCURRENCY: int = 3
    CORS_ALLOW_ORIGIN_REGEX: str = (
        r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$"
        r"|^(chrome|edge|moz)-extension://.*$"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def clean_moodle_url(self) -> str:
        """Ensure base URL does not have trailing slashes"""
        return self.MOODLE_BASE_URL.rstrip("/")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
