"""ORM models — one module per domain. Import everything from `models`.

`Base` aggregates the metadata for every model below, so `Base.metadata.create_all`
(see db.py) sees the whole schema once this package is imported.
"""
from models.base import Base, utcnow
from models.user import User
from models.patient import Patient, PatientClinical
from models.consultation import Consultation
from models.diagnostics import EchoReport, RadiologyReport
from models.prescription import Prescription
from models.discharge import DischargeSummary
from models.ipd import (
    Admission,
    Bed,
    BedTier,
    BedTransfer,
    IpdNote,
    NurseBedLog,
    Ward,
)
from models.engagement import Appointment, VoiceBotCall
from models.audit import AccessLog

__all__ = [
    "Base",
    "utcnow",
    "User",
    "Patient",
    "PatientClinical",
    "Consultation",
    "EchoReport",
    "RadiologyReport",
    "Prescription",
    "DischargeSummary",
    "Admission",
    "Bed",
    "BedTier",
    "BedTransfer",
    "IpdNote",
    "NurseBedLog",
    "Ward",
    "Appointment",
    "VoiceBotCall",
    "AccessLog",
]
