from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime, JSON, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stobaeus.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id         = Column(String, primary_key=True)       # UUID
    email      = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name  = Column(String)
    role       = Column(String)                         # doctor/radiologist/nurse/admin
    hospital   = Column(String)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Patient(Base):
    __tablename__ = "patients"
    patient_id   = Column(String, primary_key=True)        # PT-0042
    full_name    = Column(String, nullable=False)           # PII — never sent to LLM
    dob          = Column(String)                           # PII
    gender       = Column(String)
    phone        = Column(String)                           # PII
    abha_id      = Column(String, unique=True, nullable=True)  # PII
    insurance    = Column(String)
    address      = Column(Text)                             # PII
    mrn          = Column(String)
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PatientClinical(Base):
    __tablename__ = "patient_clinical"
    patient_id   = Column(String, primary_key=True)         # FK to patients
    age          = Column(Integer)                           # safe for LLM
    gender_code  = Column(String)                           # M/F/O
    conditions   = Column(JSON, default=list)               # ["T2DM","HTN"]
    medications  = Column(JSON, default=list)               # [{drug,dose,freq}]
    allergies    = Column(JSON, default=list)               # ["Penicillin"]
    blood_group  = Column(String)
    updated_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Consultation(Base):
    __tablename__ = "consultations"
    session_id          = Column(String, primary_key=True)   # UUID
    patient_id          = Column(String, nullable=True)       # PT-XXXX or PT-ANON
    doctor_id           = Column(String)                      # user.id
    started_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at            = Column(DateTime, nullable=True)
    transcript          = Column(Text, nullable=True)         # no PII
    soap_note           = Column(JSON, nullable=True)         # generated note
    icd_codes           = Column(JSON, nullable=True)
    prescription        = Column(JSON, nullable=True)
    status              = Column(String, default="recording") # recording/reviewing/approved/pushed
    is_followup         = Column(Boolean, default=False)
    previous_session_id = Column(String, nullable=True)       # session_id of last approved consultation

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
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finalized_at = Column(DateTime, nullable=True)


class DischargeSummary(Base):
    __tablename__ = "discharge_summaries"
    summary_id     = Column(String, primary_key=True)      # DS-0001
    patient_id     = Column(String, nullable=True)          # PT-XXXX (no PII stored)
    session_id     = Column(String, nullable=True)          # primary consultation
    doctor_id      = Column(String, nullable=True)
    sections       = Column(JSON, nullable=True)            # {chief_complaint, presenting_history, clinical_course, investigations, procedures, discharge_condition, follow_up, advice}
    icd_codes      = Column(JSON, nullable=True)            # [{code, description}]
    discharge_meds = Column(JSON, nullable=True)            # [{drug, dose, freq, duration}]
    admission_date = Column(DateTime, nullable=True)
    discharge_date = Column(DateTime, nullable=True)
    status         = Column(String, default="draft")        # draft / final
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Prescription(Base):
    __tablename__ = "prescriptions"
    rx_id            = Column(String, primary_key=True)      # RX-0001
    patient_id       = Column(String, nullable=True)          # PT-XXXX (FK to patients; no PII stored here)
    doctor_id        = Column(String, nullable=True)
    session_id       = Column(String, nullable=True)          # linked consultation, if any
    diagnosis        = Column(String, nullable=True)
    drugs            = Column(JSON, default=list)             # [{drug, dose, freq, duration, instructions}]
    notes            = Column(Text, nullable=True)
    status           = Column(String, default="active")       # active / sent / printed
    whatsapp_sent_at = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NurseBedLog(Base):
    __tablename__ = "nurse_bed_logs"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    bed_id      = Column(String, nullable=False)       # "B01" – "B12"
    patient_id  = Column(String, nullable=True)
    patient_name= Column(String, nullable=True)        # denormalized for display
    bp          = Column(String, nullable=True)        # "120/80"
    hr          = Column(Integer, nullable=True)
    spo2        = Column(Integer, nullable=True)
    temp        = Column(String, nullable=True)        # "37.2"
    rr          = Column(Integer, nullable=True)
    drips       = Column(JSON, nullable=True)          # [{name, rate, unit}]
    notes       = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    nurse_id    = Column(String, nullable=True)


class IpdNote(Base):
    __tablename__ = "ipd_notes"
    note_id    = Column(String, primary_key=True)
    patient_id = Column(String, nullable=True)
    doctor_id  = Column(String, nullable=True)
    bed_id     = Column(String, nullable=True)
    vitals     = Column(JSON, nullable=True)      # {bp, hr, spo2, temp, rr}
    status_text= Column(Text, nullable=True)      # clinical status free text
    assessment = Column(Text, nullable=True)
    plan       = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RadiologyReport(Base):
    __tablename__ = "radiology_reports"
    report_id    = Column(String, primary_key=True)
    patient_id   = Column(String, nullable=True)
    doctor_id    = Column(String, nullable=True)
    template     = Column(String, nullable=False)   # chest_xray / ct_cardiac / ct_pa / mri_heart
    findings     = Column(JSON, nullable=True)
    impression   = Column(Text, nullable=True)
    icd_codes    = Column(JSON, nullable=True)
    status       = Column(String, default="draft")  # draft / final
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finalized_at = Column(DateTime, nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
