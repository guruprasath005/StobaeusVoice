from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Prescription, Patient
from routers.auth import get_current_user, assert_owner, User
from audit import log_access
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import urllib.parse, uuid

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def generate_rx_id(db: Session) -> str:
    while True:
        rx_id = f"RX-{uuid.uuid4().hex[:6].upper()}"
        if not db.query(Prescription).filter(Prescription.rx_id == rx_id).first():
            return rx_id


def fmt_rx_for_whatsapp(rx: Prescription, doctor_name: str = "") -> str:
    drugs = rx.drugs or []
    lines = []
    for i, d in enumerate(drugs, 1):
        line = f"{i}. {d.get('drug', '')}"
        if d.get("dose"):
            line += f" {d['dose']}"
        if d.get("freq"):
            line += f" — {d['freq']}"
        if d.get("duration"):
            line += f" × {d['duration']}"
        if d.get("instructions"):
            line += f"\n   {d['instructions']}"
        lines.append(line)

    msg = "*StobaeusVoice — Prescription*\n"
    if doctor_name:
        msg += f"Dr. {doctor_name}\n"
    msg += f"Date: {datetime.now().strftime('%d %b %Y')}\n"
    if rx.diagnosis:
        msg += f"Diagnosis: {rx.diagnosis}\n"
    msg += "\n*Medications:*\n"
    msg += "\n".join(lines) if lines else "(none)"
    if rx.notes:
        msg += f"\n\n*Notes:* {rx.notes}"
    msg += "\n\n_Take medicines as prescribed. Contact your doctor if you have any concerns._"
    return msg


# ── Schemas ─────────────────────────────────────────────────────────

class CreateRxRequest(BaseModel):
    patient_id: Optional[str] = None
    session_id: Optional[str] = None
    diagnosis: Optional[str] = None
    drugs: Optional[List[dict]] = []
    notes: Optional[str] = None


class UpdateRxRequest(BaseModel):
    diagnosis: Optional[str] = None
    drugs: Optional[List[dict]] = None
    notes: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────

@router.get("")
def list_prescriptions(patient_id: Optional[str] = None, limit: int = 40, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Prescription)
    if current_user.role != "admin":
        q = q.filter(Prescription.doctor_id == current_user.id)
    if patient_id:
        q = q.filter(Prescription.patient_id == patient_id)
    rows = q.order_by(Prescription.created_at.desc()).limit(limit).all()

    result = []
    for rx in rows:
        patient = db.query(Patient).filter(Patient.patient_id == rx.patient_id).first() if rx.patient_id else None
        result.append({
            "rx_id": rx.rx_id,
            "patient_id": rx.patient_id,
            "patient_display": patient.full_name if patient else None,
            "diagnosis": rx.diagnosis,
            "drugs": rx.drugs or [],
            "status": rx.status,
            "whatsapp_sent_at": rx.whatsapp_sent_at.isoformat() if rx.whatsapp_sent_at else None,
            "created_at": rx.created_at.isoformat() if rx.created_at else None,
        })
    return result


@router.post("")
def create_prescription(req: CreateRxRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rx_id = generate_rx_id(db)
    rx = Prescription(
        rx_id=rx_id,
        patient_id=req.patient_id,
        doctor_id=current_user.id,
        session_id=req.session_id,
        diagnosis=req.diagnosis,
        drugs=req.drugs or [],
        notes=req.notes,
        status="active",
    )
    db.add(rx)
    db.commit()
    return {"rx_id": rx_id}


@router.get("/{rx_id}")
def get_prescription(rx_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rx = db.query(Prescription).filter(Prescription.rx_id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    assert_owner(rx.doctor_id, current_user)
    log_access(db, current_user.id, "view", "prescription", rx_id, rx.patient_id)
    patient = db.query(Patient).filter(Patient.patient_id == rx.patient_id).first() if rx.patient_id else None
    return {
        "rx_id": rx.rx_id,
        "patient_id": rx.patient_id,
        "patient_display": patient.full_name if patient else None,
        "patient_phone": patient.phone if patient else None,
        "session_id": rx.session_id,
        "diagnosis": rx.diagnosis,
        "drugs": rx.drugs or [],
        "notes": rx.notes,
        "status": rx.status,
        "whatsapp_sent_at": rx.whatsapp_sent_at.isoformat() if rx.whatsapp_sent_at else None,
        "created_at": rx.created_at.isoformat() if rx.created_at else None,
    }


@router.patch("/{rx_id}")
def update_prescription(rx_id: str, req: UpdateRxRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rx = db.query(Prescription).filter(Prescription.rx_id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    assert_owner(rx.doctor_id, current_user)
    if req.diagnosis is not None:
        rx.diagnosis = req.diagnosis
    if req.drugs is not None:
        rx.drugs = req.drugs
    if req.notes is not None:
        rx.notes = req.notes
    db.commit()
    return {"status": "ok"}


@router.post("/{rx_id}/send-whatsapp")
def send_whatsapp(rx_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rx = db.query(Prescription).filter(Prescription.rx_id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    assert_owner(rx.doctor_id, current_user)
    log_access(db, current_user.id, "export", "prescription", rx_id, rx.patient_id)
    patient = db.query(Patient).filter(Patient.patient_id == rx.patient_id).first() if rx.patient_id else None

    message = fmt_rx_for_whatsapp(rx)
    encoded = urllib.parse.quote(message)

    # Clean phone number: strip non-digits, remove leading 0, prepend country code 91
    raw_phone = patient.phone if patient else ""
    digits = "".join(c for c in (raw_phone or "") if c.isdigit())
    if digits.startswith("0"):
        digits = digits[1:]
    if digits and not digits.startswith("91"):
        digits = "91" + digits
    whatsapp_url = f"https://wa.me/{digits}?text={encoded}" if digits else f"https://wa.me/?text={encoded}"

    # Mark sent
    rx.status = "sent"
    rx.whatsapp_sent_at = datetime.now(timezone.utc)
    db.commit()

    return {"whatsapp_url": whatsapp_url}
