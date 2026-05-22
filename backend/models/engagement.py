"""Patient engagement — outbound voice-bot calls and appointment scheduling."""
from sqlalchemy import Column, DateTime, JSON, String, Text

from models.base import Base, utcnow


class VoiceBotCall(Base):
    __tablename__ = "voice_bot_calls"
    call_id      = Column(String, primary_key=True)
    patient_id   = Column(String, nullable=True)
    call_type    = Column(String, default="post_discharge")  # post_discharge / routine_followup
    status       = Column(String, default="pending")         # pending / completed / failed / cancelled
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    transcript   = Column(Text, nullable=True)
    summary      = Column(JSON, nullable=True)               # {symptom_status, alerts, follow_up_needed}
    created_by   = Column(String, nullable=True)
    created_at   = Column(DateTime, default=utcnow)


class Appointment(Base):
    __tablename__ = "appointments"
    appt_id      = Column(String, primary_key=True)
    patient_id   = Column(String, nullable=True)
    patient_name = Column(String, nullable=True)   # denormalized for display
    doctor_id    = Column(String, nullable=True)
    slot_date    = Column(String, nullable=False)  # "2026-05-21"
    slot_time    = Column(String, nullable=False)  # "10:30"
    appt_type    = Column(String, default="consultation")  # consultation/echo/cath/followup
    status       = Column(String, default="scheduled")     # scheduled/confirmed/completed/cancelled
    source       = Column(String, default="manual")        # manual/bot
    notes        = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=utcnow)
