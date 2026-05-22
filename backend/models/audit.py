"""DPDP access-audit trail — who touched which patient data."""
from sqlalchemy import Column, DateTime, String

from models.base import Base, utcnow


class AccessLog(Base):
    __tablename__ = "access_logs"
    id            = Column(String, primary_key=True)        # UUID
    user_id       = Column(String, nullable=False)          # who accessed
    action        = Column(String, nullable=False)          # view / create / update / approve / finalize / export
    resource_type = Column(String, nullable=False)          # patient / consultation / prescription / discharge / echo / radiology
    resource_id   = Column(String, nullable=True)           # id of the accessed record
    patient_id    = Column(String, nullable=True)           # patient whose data was touched, if any
    created_at    = Column(DateTime, default=utcnow)
