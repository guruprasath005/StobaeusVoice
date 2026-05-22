"""Inpatient (IPD) domain — ward configuration, admissions, round notes, transfers.

Standard Indian HIS admin model: Ward -> Bed Tier -> Bed. Admins define their own
ward layout and bed-tier catalogue (CCU/HDU/Ward/Private + daily charge); an
`Admission` is one inpatient episode and round notes hang off `admission_id`.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text

from models.base import Base, utcnow


class NurseBedLog(Base):
    """A nurse's vitals/drip charting entry against a bed."""
    __tablename__ = "nurse_bed_logs"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    bed_id       = Column(String, nullable=False)
    patient_id   = Column(String, nullable=True)
    patient_name = Column(String, nullable=True)        # denormalized for display
    bp           = Column(String, nullable=True)        # "120/80"
    hr           = Column(Integer, nullable=True)
    spo2         = Column(Integer, nullable=True)
    temp         = Column(String, nullable=True)        # "37.2"
    rr           = Column(Integer, nullable=True)
    drips        = Column(JSON, nullable=True)          # [{name, rate, unit}]
    notes        = Column(Text, nullable=True)
    recorded_at  = Column(DateTime, default=utcnow)
    nurse_id     = Column(String, nullable=True)


class IpdNote(Base):
    """A daily ward-round progress note on an admission."""
    __tablename__ = "ipd_notes"
    note_id      = Column(String, primary_key=True)
    admission_id = Column(String, nullable=True)        # FK to admissions; null for legacy notes
    patient_id   = Column(String, nullable=True)
    doctor_id    = Column(String, nullable=True)
    bed_id       = Column(String, nullable=True)
    vitals       = Column(JSON, nullable=True)          # {bp, hr, spo2, temp, rr}
    status_text  = Column(Text, nullable=True)          # clinical status free text
    assessment   = Column(Text, nullable=True)
    plan         = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=utcnow)


class Ward(Base):
    __tablename__ = "wards"
    ward_id     = Column(String, primary_key=True)        # WARD-A1
    name        = Column(String, nullable=False)          # "Cardiac CCU"
    floor       = Column(String, nullable=True)           # "5"
    color       = Column(String, nullable=True)           # hex for grid view
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True)
    sort_order  = Column(Integer, default=0)
    created_at  = Column(DateTime, default=utcnow)


class BedTier(Base):
    """Admin-defined bed tier catalogue (CCU, HDU, Ward, Private, Deluxe, ...)."""
    __tablename__ = "bed_tiers"
    tier_id          = Column(String, primary_key=True)   # TIER-CCU
    name             = Column(String, nullable=False)     # "CCU"
    daily_charge_inr = Column(Integer, default=0)
    nurse_ratio      = Column(String, nullable=True)      # "1:1" / "2:1"
    color            = Column(String, nullable=True)
    sort_order       = Column(Integer, default=0)
    is_active        = Column(Boolean, default=True)


class Bed(Base):
    __tablename__ = "beds"
    bed_id      = Column(String, primary_key=True)        # CCU-01 / B-12
    label       = Column(String, nullable=True)           # display label if different from id
    ward_id     = Column(String, nullable=True)           # FK to wards
    tier_id     = Column(String, nullable=True)           # FK to bed_tiers
    is_active   = Column(Boolean, default=True)           # admin can decommission beds
    notes       = Column(Text, nullable=True)             # e.g. "near nurse station", "isolation"
    sort_order  = Column(Integer, default=0)
    created_at  = Column(DateTime, default=utcnow)


class Admission(Base):
    """One inpatient episode. Round notes (IpdNote) hang off admission_id."""
    __tablename__ = "admissions"
    admission_id        = Column(String, primary_key=True)   # ADM-0001
    patient_id          = Column(String, nullable=True)      # PT-XXXX or PT-ANON
    bed_id              = Column(String, nullable=True)      # current bed (changes on transfer)
    ward_id_snapshot    = Column(String, nullable=True)      # snapshot at admit
    tier_id_snapshot    = Column(String, nullable=True)      # snapshot at admit
    admitting_doctor_id = Column(String, nullable=True)
    mode                = Column(String, default="standard")  # standard / stemi_fast_track
    transcript          = Column(Text, nullable=True)        # raw dictation (no PII)
    chief_complaint     = Column(Text, nullable=True)
    hopi                = Column(Text, nullable=True)        # history of present illness
    examination         = Column(Text, nullable=True)        # general + cardiac
    provisional_dx      = Column(Text, nullable=True)
    soap                = Column(JSON, nullable=True)        # {subjective,objective,assessment,plan}
    admit_orders        = Column(JSON, nullable=True)        # {drugs, monitoring, npo, access, special}
    icd_codes           = Column(JSON, nullable=True)        # [{code, description}]
    status              = Column(String, default="active")   # active / discharged / cancelled
    admitted_at         = Column(DateTime, default=utcnow)
    discharged_at       = Column(DateTime, nullable=True)


class BedTransfer(Base):
    """Audit trail of bed/tier moves on an admission (CCU -> HDU -> Ward step-down)."""
    __tablename__ = "bed_transfers"
    transfer_id     = Column(String, primary_key=True)
    admission_id    = Column(String, nullable=False)
    from_bed_id     = Column(String, nullable=True)
    from_tier_id    = Column(String, nullable=True)
    from_ward_id    = Column(String, nullable=True)
    to_bed_id       = Column(String, nullable=False)
    to_tier_id      = Column(String, nullable=True)
    to_ward_id      = Column(String, nullable=True)
    direction       = Column(String, nullable=True)          # step_down / step_up / lateral
    reason          = Column(Text, nullable=True)            # one-line clinical justification
    transferred_by  = Column(String, nullable=True)          # user.id
    transferred_at  = Column(DateTime, default=utcnow)
