"""Discharge summaries — generated from an OPD consultation or an IPD admission."""
from sqlalchemy import Column, DateTime, JSON, String

from models.base import Base, utcnow


class DischargeSummary(Base):
    __tablename__ = "discharge_summaries"
    summary_id     = Column(String, primary_key=True)       # DS-0001
    patient_id     = Column(String, nullable=True)          # PT-XXXX (no PII stored)
    session_id     = Column(String, nullable=True)          # source consultation (OPD discharge)
    admission_id   = Column(String, nullable=True)          # source IPD admission
    doctor_id      = Column(String, nullable=True)
    sections       = Column(JSON, nullable=True)            # {chief_complaint, clinical_course, ...}
    icd_codes      = Column(JSON, nullable=True)            # [{code, description}]
    discharge_meds = Column(JSON, nullable=True)            # [{drug, dose, freq, duration}]
    admission_date = Column(DateTime, nullable=True)
    discharge_date = Column(DateTime, nullable=True)
    status         = Column(String, default="draft")        # draft / final
    created_at     = Column(DateTime, default=utcnow)
