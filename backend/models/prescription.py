"""Cardiac prescriptions — drug list, WhatsApp send state."""
from sqlalchemy import Column, DateTime, JSON, String, Text

from models.base import Base, utcnow


class Prescription(Base):
    __tablename__ = "prescriptions"
    rx_id            = Column(String, primary_key=True)       # RX-0001
    patient_id       = Column(String, nullable=True)          # PT-XXXX (no PII stored here)
    doctor_id        = Column(String, nullable=True)
    session_id       = Column(String, nullable=True)          # linked consultation, if any
    diagnosis        = Column(String, nullable=True)
    drugs            = Column(JSON, default=list)             # [{drug, dose, freq, duration, instructions}]
    notes            = Column(Text, nullable=True)
    status           = Column(String, default="active")       # active / sent / printed
    whatsapp_sent_at = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, default=utcnow)
