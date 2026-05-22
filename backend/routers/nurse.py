from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db import get_db
from models import NurseBedLog, Patient
from routers.auth import get_current_user, User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.transcription import transcribe_audio
import re

router = APIRouter(prefix="/nurse", tags=["nurse"])

BEDS = [f"B{i:02d}" for i in range(1, 13)]  # B01 – B12

class VitalsRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    bp: Optional[str] = None
    hr: Optional[int] = None
    spo2: Optional[int] = None
    temp: Optional[str] = None
    rr: Optional[int] = None
    drips: Optional[list] = None
    notes: Optional[str] = None

class VoiceRequest(BaseModel):
    text: str

def parse_vitals_text(text: str) -> dict:
    result = {}
    t = text.lower()
    m = re.search(r'b\.?p\.?\s*(\d{2,3})[/\\](\d{2,3})', t)
    if m: result['bp'] = f"{m.group(1)}/{m.group(2)}"
    m = re.search(r'(?:hr|heart rate|pulse)\s*[:\-]?\s*(\d{2,3})', t)
    if m: result['hr'] = int(m.group(1))
    m = re.search(r'(?:spo2|spo 2|oxygen|saturation|o2 sat)\s*[:\-]?\s*(\d{2,3})', t)
    if m: result['spo2'] = int(m.group(1))
    m = re.search(r'(?:temp|temperature)\s*[:\-]?\s*(\d{2}\.?\d*)', t)
    if m: result['temp'] = m.group(1)
    m = re.search(r'(?:rr|resp(?:iratory)?\s*rate)\s*[:\-]?\s*(\d{1,2})', t)
    if m: result['rr'] = int(m.group(1))
    drips = []
    for dm in re.finditer(
        r'(dopamine|dobutamine|noradrenaline|norepinephrine|adrenaline|epinephrine|heparin|insulin|nitroglycerine|nitroglycerin|morphine|fentanyl|midazolam|propofol|vasopressin|amiodarone)'
        r'\s*(\d+\.?\d*)\s*(mcg/kg/min|mcg/min|mg/hr|units/hr|ml/hr|iu/hr|u/hr)',
        t
    ):
        drips.append({"name": dm.group(1), "rate": dm.group(2), "unit": dm.group(3)})
    if drips:
        result['drips'] = drips
    return result


@router.get("/beds")
def list_beds(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return latest log entry per bed for all 12 beds."""
    beds = []
    for bed_id in BEDS:
        latest = (
            db.query(NurseBedLog)
            .filter(NurseBedLog.bed_id == bed_id)
            .order_by(desc(NurseBedLog.recorded_at))
            .first()
        )
        if latest:
            beds.append({
                "bed_id": bed_id,
                "patient_id": latest.patient_id,
                "patient_name": latest.patient_name,
                "bp": latest.bp,
                "hr": latest.hr,
                "spo2": latest.spo2,
                "temp": latest.temp,
                "rr": latest.rr,
                "drips": latest.drips or [],
                "notes": latest.notes,
                "recorded_at": latest.recorded_at.isoformat() if latest.recorded_at else None,
            })
        else:
            beds.append({"bed_id": bed_id, "patient_id": None, "patient_name": None,
                         "bp": None, "hr": None, "spo2": None, "temp": None, "rr": None,
                         "drips": [], "notes": None, "recorded_at": None})
    return beds


@router.get("/beds/{bed_id}/history")
def bed_history(bed_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    logs = (
        db.query(NurseBedLog)
        .filter(NurseBedLog.bed_id == bed_id)
        .order_by(desc(NurseBedLog.recorded_at))
        .limit(20)
        .all()
    )
    return [
        {
            "id": l.id, "bed_id": l.bed_id, "patient_id": l.patient_id,
            "patient_name": l.patient_name, "bp": l.bp, "hr": l.hr,
            "spo2": l.spo2, "temp": l.temp, "rr": l.rr,
            "drips": l.drips or [], "notes": l.notes,
            "recorded_at": l.recorded_at.isoformat() if l.recorded_at else None,
        }
        for l in logs
    ]


@router.post("/beds/{bed_id}/log")
def log_vitals(bed_id: str, req: VitalsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = NurseBedLog(
        bed_id=bed_id,
        patient_id=req.patient_id,
        patient_name=req.patient_name,
        bp=req.bp,
        hr=req.hr,
        spo2=req.spo2,
        temp=req.temp,
        rr=req.rr,
        drips=req.drips,
        notes=req.notes,
        nurse_id=current_user.id,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    return {"ok": True, "id": log.id}


@router.post("/beds/{bed_id}/transcribe")
async def transcribe_voice(bed_id: str, audio: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Transcribe audio → parse vitals → log to bed."""
    audio_bytes = await audio.read()
    text = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    parsed = parse_vitals_text(text)
    if not parsed:
        return {"ok": False, "transcript": text, "parsed": {}}
    log = NurseBedLog(
        bed_id=bed_id,
        bp=parsed.get("bp"),
        hr=parsed.get("hr"),
        spo2=parsed.get("spo2"),
        temp=parsed.get("temp"),
        rr=parsed.get("rr"),
        drips=parsed.get("drips"),
        notes=text,
        nurse_id=current_user.id,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    return {"ok": True, "id": log.id, "transcript": text, "parsed": parsed}


@router.post("/beds/{bed_id}/voice")
def voice_log(bed_id: str, req: VoiceRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    parsed = parse_vitals_text(req.text)
    if not parsed:
        raise HTTPException(400, "Could not parse any vitals from the text")
    log = NurseBedLog(
        bed_id=bed_id,
        bp=parsed.get("bp"),
        hr=parsed.get("hr"),
        spo2=parsed.get("spo2"),
        temp=parsed.get("temp"),
        rr=parsed.get("rr"),
        drips=parsed.get("drips"),
        notes=req.text,
        nurse_id=current_user.id,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    return {"ok": True, "id": log.id, "parsed": parsed}
