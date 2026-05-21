from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db, IpdNote, NurseBedLog, Patient
from routers.auth import get_current_user, User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/ipd", tags=["ipd"])

class IpdNoteRequest(BaseModel):
    patient_id: Optional[str] = None
    bed_id: Optional[str] = None
    vitals: Optional[dict] = None
    status_text: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


@router.get("/notes")
def list_notes(patient_id: Optional[str] = None, skip: int = 0, limit: int = 30,
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(IpdNote).filter(IpdNote.doctor_id == current_user.id)
    if patient_id:
        q = q.filter(IpdNote.patient_id == patient_id)
    notes = q.order_by(desc(IpdNote.created_at)).offset(skip).limit(limit).all()
    result = []
    for n in notes:
        patient = db.query(Patient).filter(Patient.patient_id == n.patient_id).first() if n.patient_id else None
        result.append({
            "note_id": n.note_id,
            "patient_id": n.patient_id,
            "patient_name": patient.full_name if patient else None,
            "bed_id": n.bed_id,
            "vitals": n.vitals,
            "status_text": n.status_text,
            "assessment": n.assessment,
            "plan": n.plan,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    return result


@router.post("/notes")
def create_note(req: IpdNoteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note_id = f"IPD-{uuid.uuid4().hex[:8].upper()}"
    note = IpdNote(
        note_id=note_id,
        patient_id=req.patient_id,
        doctor_id=current_user.id,
        bed_id=req.bed_id,
        vitals=req.vitals,
        status_text=req.status_text,
        assessment=req.assessment,
        plan=req.plan,
        created_at=datetime.now(timezone.utc),
    )
    db.add(note)
    db.commit()
    return {"note_id": note_id, "ok": True}


@router.get("/notes/{note_id}")
def get_note(note_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    note = db.query(IpdNote).filter(IpdNote.note_id == note_id).first()
    if not note:
        from fastapi import HTTPException
        raise HTTPException(404, "Note not found")
    patient = db.query(Patient).filter(Patient.patient_id == note.patient_id).first() if note.patient_id else None
    return {
        "note_id": note.note_id,
        "patient_id": note.patient_id,
        "patient_name": patient.full_name if patient else None,
        "bed_id": note.bed_id,
        "vitals": note.vitals,
        "status_text": note.status_text,
        "assessment": note.assessment,
        "plan": note.plan,
        "created_at": note.created_at.isoformat() if note.created_at else None,
    }


@router.patch("/notes/{note_id}")
def update_note(note_id: str, req: IpdNoteRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    note = db.query(IpdNote).filter(IpdNote.note_id == note_id).first()
    if not note:
        from fastapi import HTTPException
        raise HTTPException(404, "Note not found")
    if req.vitals is not None: note.vitals = req.vitals
    if req.status_text is not None: note.status_text = req.status_text
    if req.assessment is not None: note.assessment = req.assessment
    if req.plan is not None: note.plan = req.plan
    db.commit()
    return {"ok": True}


@router.get("/ward-patients")
def ward_patients(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return currently occupied beds with latest vitals — used to populate the ward round list."""
    from sqlalchemy import desc as _desc
    beds = []
    for bed_id in [f"B{i:02d}" for i in range(1, 13)]:
        latest = (
            db.query(NurseBedLog)
            .filter(NurseBedLog.bed_id == bed_id, NurseBedLog.patient_name.isnot(None))
            .order_by(_desc(NurseBedLog.recorded_at))
            .first()
        )
        if latest and latest.patient_name:
            patient = db.query(Patient).filter(Patient.patient_id == latest.patient_id).first() if latest.patient_id else None
            beds.append({
                "bed_id": bed_id,
                "patient_id": latest.patient_id,
                "patient_name": latest.patient_name,
                "full_name": patient.full_name if patient else latest.patient_name,
                "bp": latest.bp, "hr": latest.hr, "spo2": latest.spo2,
                "temp": latest.temp, "rr": latest.rr,
                "drips": latest.drips or [],
                "recorded_at": latest.recorded_at.isoformat() if latest.recorded_at else None,
            })
    return beds


@router.post("/dictate")
async def dictate_note_field(
    audio: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    audio_bytes = await audio.read()
    from services.transcription import transcribe_audio
    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    return {"transcript": transcript}
