from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db import get_db
from models import Consultation, Patient, PatientClinical, Prescription, DischargeSummary
from routers.auth import get_current_user, require_admin, assert_owner, User
from services.transcription import transcribe_audio
from services.note_generation import generate_soap_note
from services.translation import translate_to_english
from audit import log_access
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/consultations", tags=["consultations"])


# ── Dashboard stats ───────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Pending consultations needing approval + echo reports needing impression — current doctor only."""
    from models import EchoReport

    pending_rows = db.query(Consultation, Patient)\
        .outerjoin(Patient, Consultation.patient_id == Patient.patient_id)\
        .filter(Consultation.status == "reviewing", Consultation.doctor_id == current_user.id)\
        .order_by(Consultation.started_at.desc()).limit(20).all()

    pending_consultations = [
        {
            "session_id": c.session_id,
            "patient_id": c.patient_id,
            "patient_display": p.full_name if p and not (c.patient_id or "").startswith("PT-ANON") else c.patient_id,
            "started_at": c.started_at.isoformat() if c.started_at else None,
            "assessment": (c.soap_note or {}).get("assessment", "")[:80] if c.soap_note else "",
        }
        for c, p in pending_rows
    ]

    echo_rows = db.query(EchoReport, Patient)\
        .outerjoin(Patient, EchoReport.patient_id == Patient.patient_id)\
        .filter(EchoReport.status == "draft", EchoReport.impression == None,
                EchoReport.doctor_id == current_user.id)\
        .order_by(EchoReport.created_at.desc()).limit(20).all()

    # Only alert on reports that actually have findings — skip empty/abandoned drafts.
    pending_echo = [
        {
            "report_id": r.report_id,
            "template": r.template,
            "patient_id": r.patient_id,
            "patient_display": p.full_name if p and not (r.patient_id or "").startswith("PT-ANON") else r.patient_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, p in echo_rows
        if r.findings
    ]

    return {
        "pending_consultations": pending_consultations,
        "pending_echo_reports": pending_echo,
        "total": len(pending_consultations) + len(pending_echo),
    }


@router.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Real stats for the current doctor's dashboard."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=today_start.weekday())  # Monday

    # Only count "real" consultations — ones that actually have a transcript.
    # Abandoned sessions (started but never recorded) have transcript = NULL.
    today_count = db.query(Consultation).filter(
        Consultation.started_at >= today_start,
        Consultation.doctor_id == current_user.id,
        Consultation.transcript.isnot(None),
    ).count()

    # Consultations per day for the current week (Mon–Sun)
    week_days = []
    for i in range(7):
        day_start = week_start + timedelta(days=i)
        day_end   = day_start + timedelta(days=1)
        n = db.query(Consultation).filter(
            Consultation.started_at >= day_start,
            Consultation.started_at < day_end,
            Consultation.doctor_id == current_user.id,
            Consultation.transcript.isnot(None),
        ).count()
        week_days.append(n)

    week_total = sum(week_days)

    approved_today = db.query(Consultation).filter(
        Consultation.started_at >= today_start,
        Consultation.status == "approved",
        Consultation.doctor_id == current_user.id,
    ).count()

    # Recent consultations (last 10) — join patient name for display only
    recent_rows = db.query(Consultation, Patient)\
        .outerjoin(Patient, Consultation.patient_id == Patient.patient_id)\
        .filter(Consultation.doctor_id == current_user.id,
                Consultation.transcript.isnot(None))\
        .order_by(Consultation.started_at.desc())\
        .limit(10).all()

    recent = []
    for c, p in recent_rows:
        icd_codes = c.icd_codes or (c.soap_note or {}).get("icd_codes", [])
        first_icd = icd_codes[0] if icd_codes else None
        recent.append({
            "session_id":  c.session_id,
            "patient_id":  c.patient_id,
            "patient_display": p.full_name if p and not (c.patient_id or "").startswith("PT-ANON") else c.patient_id,
            "time": c.started_at.strftime("%I:%M %p") if c.started_at else "—",
            "diagnosis": (c.soap_note or {}).get("assessment", "")[:60] if c.soap_note else "",
            "icd": first_icd.get("code") if isinstance(first_icd, dict) else first_icd,
            "status": c.status,
        })

    doc_pct = round((approved_today / today_count * 100) if today_count else 0)

    return {
        "today_count":  today_count,
        "week_total":   week_total,
        "week_days":    week_days,          # [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
        "approved_today": approved_today,
        "doc_pct":      doc_pct,
        "recent":       recent,
    }

# ── Admin stats ───────────────────────────────────────────────────

@router.get("/admin-stats")
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """System-wide stats for admin dashboard. Admin only."""
    from models import User as DBUser, Prescription, EchoReport, DischargeSummary
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_consultations = db.query(Consultation).filter(Consultation.started_at >= month_start).count()
    approved_consultations = db.query(Consultation).filter(
        Consultation.started_at >= month_start, Consultation.status == "approved"
    ).count()
    total_prescriptions = db.query(Prescription).filter(Prescription.created_at >= month_start).count()
    total_echo = db.query(EchoReport).filter(EchoReport.created_at >= month_start).count()
    total_discharge = db.query(DischargeSummary).filter(DischargeSummary.created_at >= month_start).count()

    # Per-doctor consultation counts this month
    doctors = db.query(DBUser).filter(DBUser.role.in_(["cardiologist","cardiac_surgeon"]), DBUser.is_active == True).all()
    by_doctor = []
    for doc in doctors:
        count = db.query(Consultation).filter(
            Consultation.doctor_id == doc.id,
            Consultation.started_at >= month_start,
        ).count()
        by_doctor.append({
            "doctor_id": doc.id,
            "full_name": doc.full_name,
            "role": doc.role,
            "hospital": doc.hospital,
            "consultations_this_month": count,
        })
    by_doctor.sort(key=lambda x: x["consultations_this_month"], reverse=True)

    # Cost savings: assume ₹500 saved per approved note (transcription + coding time)
    cost_saved = approved_consultations * 500

    # ABDM milestones (simplified)
    abdm = {
        "m1_registered": total_consultations > 0,
        "m2_linked": approved_consultations > 5,
        "m3_fhir": approved_consultations > 20,
        "m4_share": total_discharge > 0,
    }

    return {
        "month": now.strftime("%B %Y"),
        "total_consultations": total_consultations,
        "approved_consultations": approved_consultations,
        "total_prescriptions": total_prescriptions,
        "total_echo_reports": total_echo,
        "total_discharge_summaries": total_discharge,
        "cost_saved_inr": cost_saved,
        "by_doctor": by_doctor,
        "abdm": abdm,
    }


# ── Start a consultation session ──────────────────────────────────

class StartRequest(BaseModel):
    patient_id: Optional[str] = None

@router.post("/start")
def start_consultation(body: StartRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    pid = body.patient_id or f"PT-ANON-{session_id[:8]}"

    # Detect follow-up: patient has a prior approved consultation in last 6 months
    is_followup = False
    previous_session_id = None
    if body.patient_id and not body.patient_id.startswith("PT-ANON"):
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=180)
        prev = db.query(Consultation).filter(
            Consultation.patient_id == body.patient_id,
            Consultation.status == "approved",
            Consultation.started_at >= cutoff,
        ).order_by(Consultation.started_at.desc()).first()
        if prev:
            is_followup = True
            previous_session_id = prev.session_id

    consultation = Consultation(
        session_id=session_id,
        patient_id=pid,
        doctor_id=current_user.id,
        status="recording",
        is_followup=is_followup,
        previous_session_id=previous_session_id,
    )
    db.add(consultation)
    db.commit()
    return {
        "session_id": session_id,
        "patient_id": pid,
        "is_followup": is_followup,
        "previous_session_id": previous_session_id,
    }


# ── Transcribe audio → return transcript (audio NOT stored) ───────

@router.post("/{session_id}/transcribe")
async def transcribe(
    session_id: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consultation = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not consultation:
        raise HTTPException(404, "Session not found")
    assert_owner(consultation.doctor_id, current_user)

    # Read audio bytes into memory only — never written to disk
    audio_bytes = await audio.read()
    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")

    # Append to existing transcript
    existing = consultation.transcript or ""
    consultation.transcript = (existing + "\n" + transcript).strip()
    consultation.status = "reviewing"
    db.commit()

    return {"transcript": consultation.transcript}


# ── Save doctor-edited transcript ─────────────────────────────────

class TranscriptUpdate(BaseModel):
    transcript: str

@router.patch("/{session_id}/transcript")
def update_transcript(session_id: str, body: TranscriptUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not c:
        raise HTTPException(404, "Session not found")
    assert_owner(c.doctor_id, current_user)
    c.transcript = body.transcript
    db.commit()
    return {"ok": True}


# ── Generate SOAP note from transcript ────────────────────────────

@router.post("/{session_id}/generate-note")
async def generate_note(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not c:
        raise HTTPException(404, "Session not found")
    assert_owner(c.doctor_id, current_user)
    if not c.transcript:
        raise HTTPException(400, "No transcript available")

    # Normalise the dictation to English before note generation — the doctor
    # may have dictated in Tamil. The stored transcript becomes the English one.
    c.transcript = await translate_to_english(c.transcript)
    db.commit()

    # Fetch clinical context (no PII) for LLM prompt
    clinical = {}
    if c.patient_id and not c.patient_id.startswith("PT-ANON"):
        pc = db.query(PatientClinical).filter(PatientClinical.patient_id == c.patient_id).first()
        if pc:
            clinical = {
                "age": pc.age,
                "gender_code": pc.gender_code,
                "conditions": pc.conditions or [],
                "medications": pc.medications or [],
                "allergies": pc.allergies or [],
            }

    # For follow-ups, pass previous SOAP note as context (no PII — only clinical content)
    previous_soap = None
    if c.previous_session_id:
        prev = db.query(Consultation).filter(Consultation.session_id == c.previous_session_id).first()
        if prev and prev.soap_note:
            previous_soap = prev.soap_note

    note = await generate_soap_note(c.transcript, clinical, previous_soap=previous_soap)
    c.soap_note = note
    c.icd_codes = note.get("icd_codes", [])
    c.prescription = note.get("prescription", [])
    c.status = "reviewing"
    db.commit()

    return note


# ── Approve note ──────────────────────────────────────────────────

class ApproveRequest(BaseModel):
    soap_note: dict
    prescription: Optional[list] = None

@router.post("/{session_id}/approve")
def approve_note(session_id: str, body: ApproveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not c:
        raise HTTPException(404, "Session not found")
    assert_owner(c.doctor_id, current_user)
    c.soap_note = body.soap_note
    if body.prescription:
        c.prescription = body.prescription
    c.status = "approved"
    c.ended_at = datetime.now(timezone.utc)

    # Auto-create a Prescription record if drugs were generated
    drugs = body.prescription or (body.soap_note or {}).get("prescription") or []
    if drugs:
        rx_count = db.query(Prescription).count()
        rx_id = f"RX-{rx_count + 1:04d}"
        # Pull diagnosis from assessment or first ICD code description
        soap = body.soap_note or {}
        icd = soap.get("icd_codes") or []
        diagnosis = soap.get("assessment") or (icd[0].get("description") if icd else None)
        db.add(Prescription(
            rx_id=rx_id,
            patient_id=c.patient_id,
            doctor_id=c.doctor_id,
            session_id=session_id,
            diagnosis=diagnosis,
            drugs=drugs,
            status="active",
        ))

    db.commit()
    log_access(db, current_user.id, "approve", "consultation", session_id, c.patient_id)
    return {"ok": True, "session_id": session_id}


# ── Get consultation (for review screen) ─────────────────────────

@router.delete("/{session_id}")
def discard_consultation(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Discard a cancelled consultation, transcript and all. An approved /
    pushed note is part of the record and is never removed here."""
    c = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not c:
        return {"ok": True, "discarded": False}
    assert_owner(c.doctor_id, current_user)
    if c.status in ("approved", "pushed"):
        return {"ok": True, "discarded": False}
    db.delete(c)
    db.commit()
    return {"ok": True, "discarded": True}


@router.get("/{session_id}")
def get_consultation(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    # Care-team read: any clinician may view a patient's consultation (access is audited).
    log_access(db, current_user.id, "view", "consultation", session_id, c.patient_id)

    # Join patient name from DB (only for display, never sent to LLM)
    patient_display = None
    if c.patient_id and not c.patient_id.startswith("PT-ANON"):
        p = db.query(Patient).filter(Patient.patient_id == c.patient_id).first()
        if p:
            patient_display = p.full_name

    # Include previous consultation data for follow-up review screen
    previous_consultation = None
    if c.previous_session_id:
        prev = db.query(Consultation).filter(Consultation.session_id == c.previous_session_id).first()
        if prev:
            previous_consultation = {
                "session_id": prev.session_id,
                "started_at": prev.started_at.isoformat() if prev.started_at else None,
                "soap_note": prev.soap_note,
                "icd_codes": prev.icd_codes,
            }

    ds = db.query(DischargeSummary).filter(DischargeSummary.session_id == session_id).first()

    return {
        "session_id": c.session_id,
        "patient_id": c.patient_id,
        "patient_display": patient_display,
        "transcript": c.transcript,
        "soap_note": c.soap_note,
        "icd_codes": c.icd_codes,
        "prescription": c.prescription,
        "status": c.status,
        "is_followup": c.is_followup or False,
        "previous_consultation": previous_consultation,
        "discharge_summary_id": ds.summary_id if ds else None,
    }
