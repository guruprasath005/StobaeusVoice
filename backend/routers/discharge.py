from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc
from database import get_db, DischargeSummary, Consultation, Patient, PatientClinical, EchoReport, Prescription, Admission, IpdNote, BedTransfer, BedTier, Bed
from routers.auth import get_current_user, assert_owner, User
from services.discharge_generation import generate_discharge_summary
from audit import log_access
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import urllib.parse, uuid

router = APIRouter(prefix="/discharge", tags=["discharge"])


def generate_ds_id(db: Session) -> str:
    while True:
        ds_id = f"DS-{uuid.uuid4().hex[:6].upper()}"
        if not db.query(DischargeSummary).filter(DischargeSummary.summary_id == ds_id).first():
            return ds_id


# ── Schemas ─────────────────────────────────────────────────────────

class UpdateSummaryRequest(BaseModel):
    sections: Optional[dict] = None
    discharge_meds: Optional[list] = None
    icd_codes: Optional[list] = None


# ── Routes ───────────────────────────────────────────────────────────

@router.post("/generate/{session_id}")
async def generate_from_consultation(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return existing summary if already generated for this session
    existing = db.query(DischargeSummary).filter(DischargeSummary.session_id == session_id).first()
    if existing:
        assert_owner(existing.doctor_id, current_user)
        return {"summary_id": existing.summary_id, "existing": True}

    consultation = db.query(Consultation).filter(Consultation.session_id == session_id).first()
    if not consultation:
        raise HTTPException(404, "Consultation not found")
    assert_owner(consultation.doctor_id, current_user)

    # Clinical context (no PII) for LLM
    clinical = {}
    if consultation.patient_id:
        pc = db.query(PatientClinical).filter(PatientClinical.patient_id == consultation.patient_id).first()
        if pc:
            clinical = {
                "age": pc.age,
                "gender_code": pc.gender_code,
                "conditions": pc.conditions or [],
                "medications": pc.medications or [],
                "allergies": pc.allergies or [],
            }

    # Gather all echo/cath reports for the patient
    echo_reports = []
    if consultation.patient_id:
        reports = db.query(EchoReport).filter(EchoReport.patient_id == consultation.patient_id).all()
        echo_reports = [{"template": r.template, "impression": r.impression} for r in reports if r.impression]

    # Get prescription for this session
    prescription = []
    rx = db.query(Prescription).filter(Prescription.session_id == session_id).first()
    if rx:
        prescription = rx.drugs or []
    elif consultation.prescription:
        prescription = consultation.prescription

    soap_note = consultation.soap_note or {}
    icd_codes = consultation.icd_codes or soap_note.get("icd_codes") or []

    # Generate via GPT-4o
    sections = await generate_discharge_summary(
        clinical_context=clinical,
        soap_note=soap_note,
        icd_codes=icd_codes,
        prescription=prescription,
        echo_reports=echo_reports,
        admission_date=consultation.started_at,
        discharge_date=consultation.ended_at or datetime.now(timezone.utc),
    )

    summary_id = generate_ds_id(db)
    ds = DischargeSummary(
        summary_id=summary_id,
        patient_id=consultation.patient_id,
        session_id=session_id,
        doctor_id=consultation.doctor_id,
        sections=sections,
        icd_codes=icd_codes,
        discharge_meds=prescription,
        admission_date=consultation.started_at,
        discharge_date=consultation.ended_at or datetime.now(timezone.utc),
        status="draft",
    )
    db.add(ds)
    db.commit()
    log_access(db, current_user.id, "create", "discharge", summary_id, consultation.patient_id)
    return {"summary_id": summary_id, "existing": False}


@router.post("/generate-from-admission/{admission_id}")
async def generate_from_admission(admission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Build a discharge summary from an IPD admission + its progress notes.

    Also marks the admission as discharged and frees the bed.
    Returns the existing summary if one was already generated for this admission.
    """
    existing = db.query(DischargeSummary).filter(DischargeSummary.admission_id == admission_id).first()
    if existing:
        assert_owner(existing.doctor_id, current_user)
        return {"summary_id": existing.summary_id, "existing": True}

    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm:
        raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)

    # PII-safe clinical context
    clinical = {}
    if adm.patient_id and not adm.patient_id.startswith("PT-ANON"):
        pc = db.query(PatientClinical).filter(PatientClinical.patient_id == adm.patient_id).first()
        if pc:
            clinical = {
                "age": pc.age, "gender_code": pc.gender_code,
                "conditions": pc.conditions or [], "medications": pc.medications or [],
                "allergies": pc.allergies or [],
            }

    # Progress notes (oldest → newest, for chronological clinical course)
    progress_notes = (
        db.query(IpdNote)
        .filter(IpdNote.admission_id == admission_id)
        .order_by(asc(IpdNote.created_at)).all()
    )
    # Synthesise a SOAP-like dict the existing prompt understands
    soap_note = {
        "subjective": adm.chief_complaint or (adm.soap or {}).get("subjective") or "",
        "objective":  (adm.soap or {}).get("objective") or adm.examination or "",
        "assessment": adm.provisional_dx or (adm.soap or {}).get("assessment") or "",
        "plan":       (progress_notes[-1].plan if progress_notes else "") or (adm.soap or {}).get("plan") or "",
    }
    # Append IPD course into objective so the LLM can narrate the clinical course
    if progress_notes:
        course = " ".join(
            f"[{n.created_at.strftime('%d %b')}] {n.status_text or ''}".strip()
            for n in progress_notes if n.status_text
        )
        if course:
            soap_note["objective"] = (soap_note["objective"] + " | IPD course: " + course).strip(" |")

    # Bed timeline (for context — LLM will weave this into clinical_course)
    transfers = db.query(BedTransfer).filter(BedTransfer.admission_id == admission_id).order_by(asc(BedTransfer.transferred_at)).all()
    if transfers:
        tier_names = {t.tier_id: t.name for t in db.query(BedTier).all()}
        timeline = "; ".join(
            f"{tier_names.get(tr.from_tier_id,'—')}→{tier_names.get(tr.to_tier_id,'—')}"
            + (f" ({tr.reason})" if tr.reason else "")
            for tr in transfers
        )
        soap_note["objective"] = (soap_note["objective"] + " | Bed timeline: " + timeline).strip(" |")

    # Imaging / cath reports
    echo_reports = []
    if adm.patient_id and not adm.patient_id.startswith("PT-ANON"):
        reports = db.query(EchoReport).filter(EchoReport.patient_id == adm.patient_id).all()
        echo_reports = [{"template": r.template, "impression": r.impression} for r in reports if r.impression]

    # Discharge meds: prefer most recent OPD Rx for this patient, else admit-orders drugs
    discharge_meds: list = []
    if adm.patient_id and not adm.patient_id.startswith("PT-ANON"):
        latest_rx = (
            db.query(Prescription)
            .filter(Prescription.patient_id == adm.patient_id)
            .order_by(Prescription.created_at.desc()).first()
        )
        if latest_rx and latest_rx.drugs:
            discharge_meds = latest_rx.drugs
    if not discharge_meds and adm.admit_orders:
        # Normalise admit-orders drugs into prescription shape
        for d in (adm.admit_orders.get("drugs") or []):
            discharge_meds.append({
                "drug": d.get("drug", ""), "dose": d.get("dose", ""),
                "freq": d.get("freq", d.get("frequency", "")), "duration": "",
            })

    icd_codes = adm.icd_codes or []
    now = datetime.now(timezone.utc)

    sections = await generate_discharge_summary(
        clinical_context=clinical,
        soap_note=soap_note,
        icd_codes=icd_codes,
        prescription=discharge_meds,
        echo_reports=echo_reports,
        admission_date=adm.admitted_at,
        discharge_date=now,
    )

    summary_id = generate_ds_id(db)
    ds = DischargeSummary(
        summary_id=summary_id,
        patient_id=adm.patient_id,
        admission_id=admission_id,
        session_id=None,
        doctor_id=adm.admitting_doctor_id,
        sections=sections,
        icd_codes=icd_codes,
        discharge_meds=discharge_meds,
        admission_date=adm.admitted_at,
        discharge_date=now,
        status="draft",
    )
    db.add(ds)

    # Mark admission discharged + free bed in the same transaction
    adm.status = "discharged"
    adm.discharged_at = now

    db.commit()
    log_access(db, current_user.id, "create", "discharge", summary_id, adm.patient_id)
    return {"summary_id": summary_id, "existing": False, "admission_id": admission_id, "discharged_at": now.isoformat()}


@router.get("/{summary_id}")
def get_summary(summary_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(DischargeSummary).filter(DischargeSummary.summary_id == summary_id).first()
    if not ds:
        raise HTTPException(404, "Discharge summary not found")
    assert_owner(ds.doctor_id, current_user)
    log_access(db, current_user.id, "view", "discharge", summary_id, ds.patient_id)

    patient = db.query(Patient).filter(Patient.patient_id == ds.patient_id).first() if ds.patient_id else None

    return {
        "summary_id": ds.summary_id,
        "patient_id": ds.patient_id,
        "patient_display": patient.full_name if patient else None,
        "patient_phone": patient.phone if patient else None,
        "session_id": ds.session_id,
        "sections": ds.sections or {},
        "icd_codes": ds.icd_codes or [],
        "discharge_meds": ds.discharge_meds or [],
        "admission_date": ds.admission_date.isoformat() if ds.admission_date else None,
        "discharge_date": ds.discharge_date.isoformat() if ds.discharge_date else None,
        "status": ds.status,
        "created_at": ds.created_at.isoformat() if ds.created_at else None,
    }


@router.patch("/{summary_id}")
def update_summary(summary_id: str, req: UpdateSummaryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(DischargeSummary).filter(DischargeSummary.summary_id == summary_id).first()
    if not ds:
        raise HTTPException(404, "Discharge summary not found")
    assert_owner(ds.doctor_id, current_user)
    if req.sections is not None:
        ds.sections = req.sections
    if req.discharge_meds is not None:
        ds.discharge_meds = req.discharge_meds
    if req.icd_codes is not None:
        ds.icd_codes = req.icd_codes
    db.commit()
    return {"status": "ok"}


@router.post("/{summary_id}/finalize")
def finalize_summary(summary_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(DischargeSummary).filter(DischargeSummary.summary_id == summary_id).first()
    if not ds:
        raise HTTPException(404, "Discharge summary not found")
    assert_owner(ds.doctor_id, current_user)
    ds.status = "final"
    db.commit()
    return {"status": "final"}


@router.post("/{summary_id}/send-whatsapp")
def send_whatsapp(summary_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ds = db.query(DischargeSummary).filter(DischargeSummary.summary_id == summary_id).first()
    if not ds:
        raise HTTPException(404, "Discharge summary not found")
    assert_owner(ds.doctor_id, current_user)
    log_access(db, current_user.id, "export", "discharge", summary_id, ds.patient_id)
    patient = db.query(Patient).filter(Patient.patient_id == ds.patient_id).first() if ds.patient_id else None

    sections = ds.sections or {}
    meds = ds.discharge_meds or []

    # Patient-friendly WhatsApp message (no clinical jargon)
    msg = "*Discharge Summary*\n"
    msg += f"Date: {datetime.now().strftime('%d %b %Y')}\n\n"
    if sections.get("discharge_condition"):
        msg += f"Condition at discharge: {sections['discharge_condition']}\n\n"
    if meds:
        msg += "*Your Medicines:*\n"
        for i, d in enumerate(meds, 1):
            line = f"{i}. {d.get('drug', '')} {d.get('dose', '')} — {d.get('freq', '')}"
            if d.get("duration"):
                line += f" × {d['duration']}"
            msg += line + "\n"
        msg += "\n"
    if sections.get("follow_up"):
        msg += f"*Follow-up:* {sections['follow_up']}\n\n"
    if sections.get("advice"):
        msg += f"*Advice:* {sections['advice']}\n\n"
    msg += "_Please contact your doctor immediately if you develop chest pain, severe breathlessness, or swelling._"

    raw_phone = patient.phone if patient else ""
    digits = "".join(c for c in (raw_phone or "") if c.isdigit())
    if digits.startswith("0"):
        digits = digits[1:]
    if digits and not digits.startswith("91"):
        digits = "91" + digits
    encoded = urllib.parse.quote(msg)
    whatsapp_url = f"https://wa.me/{digits}?text={encoded}" if digits else f"https://wa.me/?text={encoded}"

    return {"whatsapp_url": whatsapp_url}
