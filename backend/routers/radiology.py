from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db, RadiologyReport, Patient
from routers.auth import get_current_user, User
from services.transcription import transcribe_audio
from services.radiology_generation import generate_radiology_impression
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/radiology", tags=["radiology"])

TEMPLATES = ("chest_xray", "ct_cardiac", "ct_pa", "mri_heart", "lipid_profile", "hba1c")


class CreateReportRequest(BaseModel):
    template: str
    patient_id: Optional[str] = None


class UpdateReportRequest(BaseModel):
    findings: Optional[dict] = None
    impression: Optional[str] = None
    icd_codes: Optional[list] = None


@router.get("/reports")
def list_reports(patient_id: Optional[str] = None, template: Optional[str] = None,
                 skip: int = 0, limit: int = 30,
                 db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(RadiologyReport)
    if patient_id:
        q = q.filter(RadiologyReport.patient_id == patient_id)
    if template:
        q = q.filter(RadiologyReport.template == template)
    reports = q.order_by(desc(RadiologyReport.created_at)).offset(skip).limit(limit).all()
    result = []
    for r in reports:
        patient = db.query(Patient).filter(Patient.patient_id == r.patient_id).first() if r.patient_id else None
        result.append({
            "report_id": r.report_id, "patient_id": r.patient_id,
            "patient_name": patient.full_name if patient else None,
            "template": r.template, "status": r.status,
            "impression": r.impression,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "finalized_at": r.finalized_at.isoformat() if r.finalized_at else None,
        })
    return result


@router.post("/reports")
def create_report(req: CreateReportRequest,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.template not in TEMPLATES:
        raise HTTPException(400, f"Template must be one of {TEMPLATES}")
    report_id = f"RAD-{uuid.uuid4().hex[:8].upper()}"
    report = RadiologyReport(
        report_id=report_id,
        patient_id=req.patient_id,
        doctor_id=current_user.id,
        template=req.template,
        findings={},
        status="draft",
        created_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    return {"report_id": report_id, "template": req.template, "status": "draft"}


@router.get("/reports/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    r = db.query(RadiologyReport).filter(RadiologyReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    patient = db.query(Patient).filter(Patient.patient_id == r.patient_id).first() if r.patient_id else None
    return {
        "report_id": r.report_id, "patient_id": r.patient_id,
        "patient_name": patient.full_name if patient else None,
        "template": r.template, "findings": r.findings or {},
        "impression": r.impression, "icd_codes": r.icd_codes or [],
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "finalized_at": r.finalized_at.isoformat() if r.finalized_at else None,
    }


@router.patch("/reports/{report_id}")
def save_report(report_id: str, req: UpdateReportRequest,
                db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    r = db.query(RadiologyReport).filter(RadiologyReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    if req.findings is not None: r.findings = req.findings
    if req.impression is not None: r.impression = req.impression
    if req.icd_codes is not None: r.icd_codes = req.icd_codes
    db.commit()
    return {"ok": True}


@router.post("/reports/{report_id}/finalize")
def finalize_report(report_id: str, req: UpdateReportRequest,
                    db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    r = db.query(RadiologyReport).filter(RadiologyReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    if req.findings is not None: r.findings = req.findings
    if req.impression is not None: r.impression = req.impression
    if req.icd_codes is not None: r.icd_codes = req.icd_codes
    r.status = "final"
    r.finalized_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "report_id": report_id}


@router.post("/reports/{report_id}/dictate")
async def dictate_field(
    report_id: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    r = db.query(RadiologyReport).filter(RadiologyReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    audio_bytes = await audio.read()
    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    return {"transcript": transcript}


@router.post("/reports/{report_id}/generate-impression")
async def generate_impression(report_id: str,
                              db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    r = db.query(RadiologyReport).filter(RadiologyReport.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    findings = r.findings or {}
    if not findings:
        raise HTTPException(400, "No findings to generate impression from")
    result = await generate_radiology_impression(r.template, findings)
    r.impression = result["impression"]
    db.commit()
    return result
