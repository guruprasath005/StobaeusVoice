from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db, VoiceBotCall, Patient, Consultation, DischargeSummary
from routers.auth import get_current_user, User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/voice-bot", tags=["voice_bot"])

class TriggerCallRequest(BaseModel):
    patient_id: str
    call_type: str = "post_discharge"   # post_discharge / routine_followup
    scheduled_at: Optional[str] = None  # ISO string; None means "now"
    notes: Optional[str] = None


@router.get("/calls")
def list_calls(skip: int = 0, limit: int = 40,
               db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    calls = db.query(VoiceBotCall).order_by(desc(VoiceBotCall.created_at)).offset(skip).limit(limit).all()
    result = []
    for c in calls:
        patient = db.query(Patient).filter(Patient.patient_id == c.patient_id).first() if c.patient_id else None
        result.append({
            "call_id": c.call_id,
            "patient_id": c.patient_id,
            "patient_name": patient.full_name if patient else None,
            "call_type": c.call_type,
            "status": c.status,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "transcript": c.transcript,
            "summary": c.summary,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return result


@router.post("/calls")
def trigger_call(req: TriggerCallRequest,
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    call_id = f"VC-{uuid.uuid4().hex[:8].upper()}"
    sched = datetime.fromisoformat(req.scheduled_at) if req.scheduled_at else datetime.now(timezone.utc)
    call = VoiceBotCall(
        call_id=call_id,
        patient_id=req.patient_id,
        call_type=req.call_type,
        status="pending",
        scheduled_at=sched,
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(call)
    db.commit()
    return {"call_id": call_id, "ok": True}


@router.patch("/calls/{call_id}")
def update_call(call_id: str, data: dict,
                db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    call = db.query(VoiceBotCall).filter(VoiceBotCall.call_id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")
    if "status" in data: call.status = data["status"]
    if "transcript" in data: call.transcript = data["transcript"]
    if "summary" in data: call.summary = data["summary"]
    if data.get("status") == "completed":
        call.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.delete("/calls/{call_id}")
def cancel_call(call_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    call = db.query(VoiceBotCall).filter(VoiceBotCall.call_id == call_id).first()
    if not call:
        raise HTTPException(404, "Call not found")
    call.status = "cancelled"
    db.commit()
    return {"ok": True}


@router.get("/eligible-patients")
def eligible_patients(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Patients with a finalized discharge summary who haven't had a voice bot call yet."""
    summaries = (
        db.query(DischargeSummary)
        .filter(DischargeSummary.status == "final")
        .order_by(desc(DischargeSummary.created_at))
        .limit(50)
        .all()
    )
    existing_calls = {c.patient_id for c in db.query(VoiceBotCall).filter(VoiceBotCall.status != "cancelled").all()}
    result = []
    seen = set()
    for s in summaries:
        if not s.patient_id or s.patient_id in seen or s.patient_id in existing_calls:
            continue
        seen.add(s.patient_id)
        patient = db.query(Patient).filter(Patient.patient_id == s.patient_id).first()
        if patient:
            result.append({
                "patient_id": patient.patient_id,
                "patient_name": patient.full_name,
                "discharge_date": s.discharge_date.isoformat() if s.discharge_date else None,
                "summary_id": s.summary_id,
            })
    return result
