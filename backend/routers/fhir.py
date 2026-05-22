"""FHIR R4 export — ABDM-compliant Bundle endpoints.

GET /fhir/consultations/{session_id}  → OPConsultRecord Bundle
GET /fhir/discharge/{summary_id}      → DischargeSummaryDocument Bundle

Both endpoints return the raw FHIR JSON.  Future: POST to ABDM HDF gateway.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from db import get_db
from models import Consultation, DischargeSummary, Patient, PatientClinical
from models.user import User as UserModel
from routers.auth import get_current_user, User
from services.fhir_export import build_consultation_fhir, build_discharge_fhir
from audit import log_access

router = APIRouter(prefix="/fhir", tags=["fhir"])


@router.get("/consultations/{session_id}")
def consultation_fhir(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """FHIR R4 OPConsultRecord Bundle for an approved OPD consultation."""
    c = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not c:
        raise HTTPException(404, "Consultation not found")
    if c.status not in ("approved", "pushed"):
        raise HTTPException(409, "FHIR export is only available for approved consultations")

    patient = db.query(Patient).filter(Patient.patient_id == c.patient_id).first() if c.patient_id else None
    pc = db.query(PatientClinical).filter(PatientClinical.patient_id == c.patient_id).first() if c.patient_id else None
    doctor = db.query(UserModel).filter(UserModel.id == c.doctor_id).first() if c.doctor_id else None

    bundle = build_consultation_fhir(c, patient, pc, doctor)
    log_access(db, current_user.id, "export_fhir", "consultation", session_id, c.patient_id)

    return JSONResponse(
        content=bundle,
        headers={"Content-Disposition": f'attachment; filename="consult-{session_id[:8]}.fhir.json"'},
    )


@router.get("/discharge/{summary_id}")
def discharge_fhir(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """FHIR R4 DischargeSummaryDocument Bundle for a discharge summary."""
    ds = db.query(DischargeSummary).filter(DischargeSummary.summary_id == summary_id).first()
    if not ds:
        raise HTTPException(404, "Discharge summary not found")

    patient = db.query(Patient).filter(Patient.patient_id == ds.patient_id).first() if ds.patient_id else None
    pc = db.query(PatientClinical).filter(PatientClinical.patient_id == ds.patient_id).first() if ds.patient_id else None
    doctor = db.query(UserModel).filter(UserModel.id == ds.doctor_id).first() if ds.doctor_id else None

    bundle = build_discharge_fhir(ds, patient, pc, doctor)
    log_access(db, current_user.id, "export_fhir", "discharge", summary_id, ds.patient_id)

    return JSONResponse(
        content=bundle,
        headers={"Content-Disposition": f'attachment; filename="discharge-{summary_id}.fhir.json"'},
    )
