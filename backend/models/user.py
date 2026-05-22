"""Staff accounts — cardiologists, surgeons, nurses, admins."""
from sqlalchemy import Boolean, Column, DateTime, String

from models.base import Base, utcnow


class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True)       # UUID
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name     = Column(String)
    role          = Column(String)                         # cardiologist/cardiac_surgeon/cardiac_nurse/admin
    hospital      = Column(String)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=utcnow)
