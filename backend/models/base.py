"""SQLAlchemy declarative base and shared helpers for every model."""
from datetime import datetime, timezone

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """Timezone-aware UTC now — the default for every created/updated timestamp."""
    return datetime.now(timezone.utc)
