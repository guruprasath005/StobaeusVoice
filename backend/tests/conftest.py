"""Pytest fixtures.

Tests run against an isolated SQLite database — never the real Postgres. The
`get_db` dependency is overridden, and the app lifespan (which would call
`init_db()` on the real engine) is intentionally not triggered: a plain
`TestClient(app)` does not run lifespan events.
"""
import os

# Fallbacks so importing the app never aborts if .env is absent in CI.
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("OPENAI_API_KEY", "test-key")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db import get_db
from main import app
from models import Base, User
from routers.auth import hash_password

_engine = create_engine(
    "sqlite:///./test_stobaeus.db", connect_args={"check_same_thread": False}
)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session", autouse=True)
def _database():
    """Build a fresh schema for the test session; tear it down afterwards."""
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)
    _engine.dispose()
    if os.path.exists("test_stobaeus.db"):
        os.remove("test_stobaeus.db")


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    """Seed an admin user (idempotent) and return a valid bearer token."""
    db = _TestSession()
    if not db.query(User).filter(User.email == "pytest-admin@stobaeus.com").first():
        db.add(
            User(
                id="pytest-admin",
                email="pytest-admin@stobaeus.com",
                password_hash=hash_password("pytestpass123"),
                full_name="Pytest Admin",
                role="admin",
                is_active=True,
            )
        )
        db.commit()
    db.close()
    resp = client.post(
        "/auth/login",
        data={"username": "pytest-admin@stobaeus.com", "password": "pytestpass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
