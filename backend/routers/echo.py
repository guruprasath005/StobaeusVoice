from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, EchoReport, Patient, PatientClinical
from routers.auth import get_current_user, assert_owner, User
from services.echo_generation import generate_echo_impression
from services.transcription import transcribe_audio
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/echo", tags=["echo"])

VALID_TEMPLATES = {"echo", "cath", "stress_test", "holter"}

# ── Schemas ───────────────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    template: str
    patient_id: Optional[str] = None

class SaveReportRequest(BaseModel):
    findings: dict
    impression: Optional[str] = None
    icd_codes: Optional[list] = None

class FinalizeRequest(BaseModel):
    findings: dict
    impression: str
    icd_codes: Optional[list] = None

# ── Routes ────────────────────────────────────────────────────────

@router.post("/reports")
def create_report(req: CreateReportRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.template not in VALID_TEMPLATES:
        raise HTTPException(400, f"Invalid template. Must be one of: {', '.join(VALID_TEMPLATES)}")
    report = EchoReport(
        report_id=str(uuid.uuid4()),
        patient_id=req.patient_id,
        doctor_id=current_user.id,
        template=req.template,
        findings={},
        status="draft",
    )
    db.add(report)
    db.commit()
    return {"report_id": report.report_id, "template": report.template}


@router.get("/reports")
def list_reports(patient_id: Optional[str] = None, limit: int = 30, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(EchoReport)
    if current_user.role != "admin":
        query = query.filter(EchoReport.doctor_id == current_user.id)
    if patient_id:
        query = query.filter(EchoReport.patient_id == patient_id)
    reports = query.order_by(EchoReport.created_at.desc()).limit(limit).all()

    result = []
    for r in reports:
        # Skip empty/abandoned drafts — a template was picked but nothing was entered.
        if r.status == "draft" and not r.findings:
            continue
        patient_display = None
        if r.patient_id and not r.patient_id.startswith("PT-ANON"):
            p = db.query(Patient).filter(Patient.patient_id == r.patient_id).first()
            if p:
                patient_display = p.full_name
        result.append({
            "report_id": r.report_id,
            "template": r.template,
            "patient_id": r.patient_id,
            "patient_display": patient_display,
            "impression": r.impression,
            "icd_codes": r.icd_codes,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.get("/reports/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(EchoReport).filter(EchoReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    assert_owner(r.doctor_id, current_user)
    patient_display = None
    if r.patient_id and not r.patient_id.startswith("PT-ANON"):
        p = db.query(Patient).filter(Patient.patient_id == r.patient_id).first()
        if p:
            patient_display = p.full_name
    return {
        "report_id": r.report_id,
        "template": r.template,
        "patient_id": r.patient_id,
        "patient_display": patient_display,
        "findings": r.findings or {},
        "impression": r.impression,
        "icd_codes": r.icd_codes or [],
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.patch("/reports/{report_id}")
def save_report(report_id: str, req: SaveReportRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(EchoReport).filter(EchoReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    assert_owner(r.doctor_id, current_user)
    r.findings = req.findings
    if req.impression is not None:
        r.impression = req.impression
    if req.icd_codes is not None:
        r.icd_codes = req.icd_codes
    db.commit()
    return {"ok": True}


@router.post("/reports/{report_id}/finalize")
def finalize_report(report_id: str, req: FinalizeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(EchoReport).filter(EchoReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    assert_owner(r.doctor_id, current_user)
    r.findings = req.findings
    r.impression = req.impression
    r.icd_codes = req.icd_codes or []
    r.status = "final"
    r.finalized_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "report_id": report_id}


@router.post("/reports/{report_id}/generate-impression")
async def generate_impression(report_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Run GPT-4o on the saved findings to generate impression + ICD codes. No PII sent."""
    r = db.query(EchoReport).filter(EchoReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    assert_owner(r.doctor_id, current_user)
    if not r.findings:
        raise HTTPException(400, "No findings saved — fill in findings first")

    clinical = None
    if r.patient_id and not r.patient_id.startswith("PT-ANON"):
        pc = db.query(PatientClinical).filter(PatientClinical.patient_id == r.patient_id).first()
        if pc:
            clinical = {
                "age": pc.age,
                "gender_code": pc.gender_code,
                "conditions": pc.conditions or [],
            }

    result = await generate_echo_impression(r.template, r.findings, clinical)
    r.impression = result.get("impression", "")
    r.icd_codes = result.get("icd_codes", [])
    db.commit()
    return result


@router.post("/reports/{report_id}/dictate")
async def dictate_impression(
    report_id: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe dictated impression audio. Audio not stored."""
    r = db.query(EchoReport).filter(EchoReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    assert_owner(r.doctor_id, current_user)
    audio_bytes = await audio.read()
    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    return {"transcript": transcript}
