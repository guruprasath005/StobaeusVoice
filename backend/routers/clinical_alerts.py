"""Clinical alerts — drug interaction + cardiac contraindication endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from db import get_db
from models import Patient, PatientClinical, Prescription
from routers.auth import get_current_user, User
from services.clinical_alerts import check_alerts

router = APIRouter(prefix="/clinical-alerts", tags=["clinical-alerts"])


class CheckRequest(BaseModel):
    meds: list[dict[str, Any]] = []
    conditions: list[Any] = []
    condition_only: bool = False


@router.post("/check")
def check(req: CheckRequest, current_user: User = Depends(get_current_user)):
    """Stateless alert check — caller provides meds and conditions."""
    alerts = check_alerts(req.meds, req.conditions, condition_only=req.condition_only)
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/patient/{patient_id}")
def patient_alerts(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alerts for a patient's latest active prescription merged with stored conditions."""
    pc = db.query(PatientClinical).filter(PatientClinical.patient_id == patient_id).first()
    conditions = (pc.conditions or []) if pc else []

    rx = (
        db.query(Prescription)
        .filter(
            Prescription.patient_id == patient_id,
            Prescription.status.in_(["active", "confirmed"]),
        )
        .order_by(Prescription.created_at.desc())
        .first()
    )
    meds = (rx.drugs or []) if rx else []
    alerts = check_alerts(meds, conditions)
    return {"patient_id": patient_id, "alerts": alerts, "count": len(alerts)}


@router.get("/active")
def active_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All clinical safety alerts across current doctor's active prescriptions."""
    rxs = (
        db.query(Prescription)
        .filter(
            Prescription.doctor_id == current_user.id,
            Prescription.status.in_(["active", "confirmed"]),
        )
        .order_by(Prescription.created_at.desc())
        .limit(50)
        .all()
    )

    results = []
    for rx in rxs:
        meds = rx.drugs or []
        if not meds:
            continue
        conditions: list = []
        if rx.patient_id:
            pc = db.query(PatientClinical).filter(
                PatientClinical.patient_id == rx.patient_id
            ).first()
            if pc:
                conditions = pc.conditions or []
        alerts = check_alerts(meds, conditions)
        if not alerts:
            continue
        patient = (
            db.query(Patient).filter(Patient.patient_id == rx.patient_id).first()
            if rx.patient_id
            else None
        )
        results.append({
            "rx_id": rx.rx_id,
            "patient_id": rx.patient_id,
            "patient_display": patient.full_name if patient else rx.patient_id,
            "alerts": alerts,
        })

    return {
        "patients_with_alerts": results,
        "total_alerts": sum(len(r["alerts"]) for r in results),
    }
