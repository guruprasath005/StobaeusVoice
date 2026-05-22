"""Patient identity and clinical context.

PII firewall: `Patient` holds personal data and is NEVER sent to an LLM/STT
service. `PatientClinical` holds only LLM-safe clinical context.
"""
from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from models.base import Base, utcnow


class Patient(Base):
    """PII table — never queried by AI services."""
    __tablename__ = "patients"
    patient_id   = Column(String, primary_key=True)         # PT-0042
    full_name    = Column(String, nullable=False)           # PII — never sent to LLM
    dob          = Column(String)                           # PII
    gender       = Column(String)
    phone        = Column(String)                           # PII
    abha_id      = Column(String, unique=True, nullable=True)  # PII
    insurance    = Column(String)
    address      = Column(Text)                             # PII
    mrn          = Column(String)
    created_at   = Column(DateTime, default=utcnow)


class PatientClinical(Base):
    """Clinical context — safe to include in LLM prompts."""
    __tablename__ = "patient_clinical"
    patient_id   = Column(String, primary_key=True)         # FK to patients
    age          = Column(Integer)                          # safe for LLM
    gender_code  = Column(String)                           # M/F/O
    conditions   = Column(JSON, default=list)               # ["T2DM","HTN"]
    medications  = Column(JSON, default=list)               # [{drug,dose,freq}]
    allergies    = Column(JSON, default=list)               # ["Penicillin"]
    blood_group  = Column(String)
    updated_at   = Column(DateTime, default=utcnow)
