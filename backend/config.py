"""Centralised application configuration.

Every environment variable the backend reads is declared here once, as a typed
field on `Settings`. Import `settings` anywhere instead of calling os.getenv.
"""
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(override=True)  # .env is authoritative — beat any stale shell vars


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    # ── Database ──────────────────────────────────────────────────────
    database_url: str = "sqlite:///./stobaeus.db"

    # ── Auth / JWT ────────────────────────────────────────────────────
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 hours

    # ── External services ─────────────────────────────────────────────
    openai_api_key: str = ""
    deepgram_api_key: str = ""

    # ── CORS ──────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS_ORIGINS is a comma-separated string in env; expose it as a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
