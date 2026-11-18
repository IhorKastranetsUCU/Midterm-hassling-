from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HUSTLE_PUBLIC_ORIGIN: str = "http://127.0.0.1:8000"
    HUSTLE_EXTENSION_STORE_URL: str = ""

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
    PLATFORM_COOKIE_NAME: str = "platform_session"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Gemini AI Settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    VERTEX_AI_PROJECT: Optional[str] = None
    VERTEX_AI_LOCATION: str = "global"

    # Google OAuth (Website Account Login -> pairs MoodleSession without passwords)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8000/api/auth/google/callback"
    AUTH_DEV_GOOGLE_ENABLED: bool = False

    # Workspace Persistence & Isolation (Zero Moodle passwords/cookies stored; only mixes & hashes)
    WORKSPACE_DB_PATH: str = "data/workspace.db"
    WORKSPACE_COOKIE_NAME: str = "workspace_session"
    WORKSPACE_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    BUILD_DEBOUNCE_SECONDS: float = 30.0
    BUILD_MAX_CONCURRENCY: int = 3

    # Per-Person Temporary File Staging Storage (ОБД: retained only for validation & processing)
    TEMP_STORAGE_DIR: str = "data/staging"
    TEMP_STORAGE_TTL_SECONDS: int = 3600
    TEMP_STORAGE_MAX_FILE_BYTES: int = 20 * 1024 * 1024
    TEMP_STORAGE_AUTO_PURGE: bool = True
    S3_BUCKET: str = ""
    S3_REGION: str = "eu-central-1"
    S3_PREFIX: str = "staging"
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
