"""Database engine, session factory and the FastAPI request dependency.

Models live in the `models` package; this module owns the connection only.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from models import Base

_connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)
engine = create_engine(settings.database_url, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Yield a request-scoped database session, closed when the request ends."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create any tables that don't yet exist.

    Dev convenience — production schema changes should go through migrations.
    """
    Base.metadata.create_all(bind=engine)
