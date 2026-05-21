from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, Patient, PatientClinical
from routers.auth import get_current_user, User
from datetime import date, datetime, timezone
import uuid, re

router = APIRouter(prefix="/patients", tags=["patients"])

def generate_patient_id(db: Session) -> str:
    # UUID-based to avoid race conditions on concurrent registrations
    while True:
        pid = f"PT-{uuid.uuid4().hex[:6].upper()}"
        if not db.query(Patient).filter(Patient.patient_id == pid).first():
            return pid

def calc_age(dob_str: str) -> int:
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return 0

# ── Request models ────────────────────────────────────────────────

class MedicationItem(BaseModel):
    drug: str
    dose: Optional[str] = None
    freq: Optional[str] = None

class PatientCreateRequest(BaseModel):
    # PII fields
    full_name:  str
    dob:        Optional[str] = None        # YYYY-MM-DD
    gender:     Optional[str] = None        # Male/Female/Other
    phone:      Optional[str] = None
    abha_id:    Optional[str] = None
    insurance:  Optional[str] = None
    address:    Optional[str] = None
    mrn:        Optional[str] = None
    # Clinical fields (safe for LLM)
    conditions:  list[str] = []
    medications: list[MedicationItem] = []
    allergies:   list[str] = []
    blood_group: Optional[str] = None

class PatientClinicalUpdateRequest(BaseModel):
    conditions:  Optional[list[str]] = None
    medications: Optional[list[MedicationItem]] = None
    allergies:   Optional[list[str]] = None
    blood_group: Optional[str] = None

class PatientSearchResult(BaseModel):
    patient_id:  str
    display:     str                        # "Ravi Kumar · 45M · PT-0042"
    age:         Optional[int]
    gender_code: Optional[str]
    conditions:  list
    medications: list
    allergies:   list

# ── Routes ────────────────────────────────────────────────────────

@router.get("")
def list_patients(q: Optional[str] = None, skip: int = 0, limit: int = 30, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """List patients with optional search and pagination."""
    base = db.query(Patient, PatientClinical)\
        .join(PatientClinical, Patient.patient_id == PatientClinical.patient_id, isouter=True)
    if q:
        base = base.filter(
            Patient.full_name.ilike(f"%{q}%") |
            Patient.abha_id.ilike(f"%{q}%") |
            Patient.mrn.ilike(f"%{q}%") |
            Patient.patient_id.ilike(f"%{q}%")
        )
    total = base.count()
    results = base.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "patients": [
            {
                "patient_id": p.patient_id,
                "full_name": p.full_name,
                "age": c.age if c else None,
                "gender": p.gender,
                "gender_code": c.gender_code if c else None,
                "conditions": c.conditions if c else [],
                "medications": c.medications if c else [],
                "allergies": c.allergies if c else [],
                "blood_group": c.blood_group if c else None,
                "abha_id": p.abha_id,
                "mrn": p.mrn,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p, c in results
        ],
    }


@router.post("/register")
def register_patient(req: PatientCreateRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if req.abha_id:
        existing = db.query(Patient).filter(Patient.abha_id == req.abha_id).first()
        if existing:
            raise HTTPException(400, "Patient with this ABHA ID already exists")

    patient_id = generate_patient_id(db)
    gender_code = {"male":"M","female":"F"}.get(req.gender.lower() if req.gender else "", "O")
    age = calc_age(req.dob) if req.dob else None

    patient = Patient(
        patient_id=patient_id,
        full_name=req.full_name,
        dob=req.dob,
        gender=req.gender,
        phone=req.phone,
        abha_id=req.abha_id or None,
        insurance=req.insurance,
        address=req.address,
        mrn=req.mrn,
    )
    clinical = PatientClinical(
        patient_id=patient_id,
        age=age,
        gender_code=gender_code,
        conditions=req.conditions,
        medications=[m.model_dump() for m in req.medications],
        allergies=req.allergies,
        blood_group=req.blood_group,
    )
    db.add(patient)
    db.add(clinical)
    db.commit()
    return {"patient_id": patient_id, "message": "Patient registered"}


# /search must be declared before /{patient_id} to avoid param capture
@router.get("/search")
def search_patients(q: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Search by name, ABHA ID, or MRN. Returns display-safe results only."""
    results = db.query(Patient, PatientClinical)\
        .join(PatientClinical, Patient.patient_id == PatientClinical.patient_id, isouter=True)\
        .filter(
            Patient.full_name.ilike(f"%{q}%") |
            Patient.abha_id.ilike(f"%{q}%") |
            Patient.mrn.ilike(f"%{q}%") |
            Patient.patient_id.ilike(f"%{q}%")
        ).limit(10).all()

    return [
        PatientSearchResult(
            patient_id=p.patient_id,
            display=f"{p.full_name} · {c.age if c else '?'}{c.gender_code if c else ''} · {p.patient_id}",
            age=c.age if c else None,
            gender_code=c.gender_code if c else None,
            conditions=c.conditions if c else [],
            medications=c.medications if c else [],
            allergies=c.allergies if c else [],
        )
        for p, c in results
    ]


@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns patient PII + clinical context for display (not for LLM)."""
    p = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")
    c = db.query(PatientClinical).filter(PatientClinical.patient_id == patient_id).first()
    return {
        "patient_id": p.patient_id,
        "full_name": p.full_name,
        "dob": p.dob,
        "gender": p.gender,
        "phone": p.phone,
        "abha_id": p.abha_id,
        "insurance": p.insurance,
        "address": p.address,
        "mrn": p.mrn,
        "age": c.age if c else None,
        "gender_code": c.gender_code if c else None,
        "conditions": c.conditions if c else [],
        "medications": c.medications if c else [],
        "allergies": c.allergies if c else [],
        "blood_group": c.blood_group if c else None,
    }


@router.get("/{patient_id}/consultations")
def get_patient_consultations(patient_id: str, limit: int = 15, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """List recent consultations for a patient — for history tab in patient detail panel."""
    from database import Consultation, DischargeSummary
    rows = db.query(Consultation).filter(
        Consultation.patient_id == patient_id,
        Consultation.status.in_(["approved", "reviewing"]),
    ).order_by(Consultation.started_at.desc()).limit(limit).all()
    return [
        {
            "session_id": c.session_id,
            "started_at": c.started_at.isoformat() if c.started_at else None,
            "status": c.status,
            "assessment": (c.soap_note or {}).get("assessment", "")[:120] if c.soap_note else "",
            "icd_codes": (c.icd_codes or [])[:3],
            "is_followup": c.is_followup or False,
            "discharge_summary_id": (
                db.query(DischargeSummary.summary_id)
                .filter(DischargeSummary.session_id == c.session_id)
                .scalar()
            ),
        }
        for c in rows
    ]


@router.patch("/{patient_id}/clinical")
def update_clinical(patient_id: str, req: "PatientClinicalUpdateRequest", db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Update clinical context fields. Only modifies fields that are provided."""
    c = db.query(PatientClinical).filter(PatientClinical.patient_id == patient_id).first()
    if not c:
        raise HTTPException(404, "Patient clinical record not found")
    if req.conditions is not None:
        c.conditions = req.conditions
    if req.medications is not None:
        c.medications = [m.model_dump() for m in req.medications]
    if req.allergies is not None:
        c.allergies = req.allergies
    if req.blood_group is not None:
        c.blood_group = req.blood_group
    c.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.get("/{patient_id}/clinical")
def get_clinical_context(patient_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns ONLY clinical context — safe to pass to LLM. No PII."""
    c = db.query(PatientClinical).filter(PatientClinical.patient_id == patient_id).first()
    if not c:
        raise HTTPException(404, "Patient not found")
    return {
        "age": c.age,
        "gender_code": c.gender_code,
        "conditions": c.conditions,
        "medications": c.medications,
        "allergies": c.allergies,
        "blood_group": c.blood_group,
    }
