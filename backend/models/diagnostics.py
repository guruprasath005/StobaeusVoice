"""Structured diagnostic reports — echo/cath lab and radiology."""
from sqlalchemy import Column, DateTime, JSON, String, Text

from models.base import Base, utcnow


class EchoReport(Base):
    __tablename__ = "echo_reports"
    report_id    = Column(String, primary_key=True)         # UUID
    patient_id   = Column(String, nullable=True)            # PT-XXXX (no PII stored here)
    doctor_id    = Column(String, nullable=True)
    template     = Column(String, nullable=False)           # echo/cath/stress_test/holter
    findings     = Column(JSON, nullable=True)              # template-specific structured data
    impression   = Column(Text, nullable=True)              # generated or typed impression
    icd_codes    = Column(JSON, nullable=True)              # [{code, description}]
    status       = Column(String, default="draft")          # draft / final
    created_at   = Column(DateTime, default=utcnow)
    finalized_at = Column(DateTime, nullable=True)


class RadiologyReport(Base):
    __tablename__ = "radiology_reports"
    report_id    = Column(String, primary_key=True)
    patient_id   = Column(String, nullable=True)
    doctor_id    = Column(String, nullable=True)
    template     = Column(String, nullable=False)           # chest_xray / ct_cardiac / ct_pa / mri_heart
    findings     = Column(JSON, nullable=True)
    impression   = Column(Text, nullable=True)
    icd_codes    = Column(JSON, nullable=True)
    status       = Column(String, default="draft")          # draft / final
    created_at   = Column(DateTime, default=utcnow)
    finalized_at = Column(DateTime, nullable=True)
