from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Moodle Settings
    MOODLE_BASE_URL: str = "https://school.moodledemo.net"
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
