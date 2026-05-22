"""OPD consultation sessions — the bridge between PII and AI output."""
from sqlalchemy import Boolean, Column, DateTime, JSON, String, Text

from models.base import Base, utcnow


class Consultation(Base):
    __tablename__ = "consultations"
    session_id          = Column(String, primary_key=True)    # UUID
    patient_id          = Column(String, nullable=True)       # PT-XXXX or PT-ANON
    doctor_id           = Column(String)                      # user.id
    started_at          = Column(DateTime, default=utcnow)
    ended_at            = Column(DateTime, nullable=True)
    transcript          = Column(Text, nullable=True)         # no PII
    soap_note           = Column(JSON, nullable=True)         # generated note
    icd_codes           = Column(JSON, nullable=True)
    prescription        = Column(JSON, nullable=True)
    status              = Column(String, default="recording")  # recording/reviewing/approved/pushed
    is_followup         = Column(Boolean, default=False)
    previous_session_id = Column(String, nullable=True)       # session_id of last approved consultation
