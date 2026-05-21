from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from database import get_db, Appointment, Patient, User as DBUser
from routers.auth import get_current_user, User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/appointments", tags=["appointments"])

class AppointmentRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_id: Optional[str] = None
    slot_date: str
    slot_time: str
    appt_type: str = "consultation"
    status: str = "scheduled"
    source: str = "manual"
    notes: Optional[str] = None


@router.get("")
def list_appointments(date: Optional[str] = None, doctor_id: Optional[str] = None,
                      skip: int = 0, limit: int = 50,
                      db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Appointment)
    if date:
        q = q.filter(Appointment.slot_date == date)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    appts = q.order_by(Appointment.slot_date, Appointment.slot_time).offset(skip).limit(limit).all()
    result = []
    for a in appts:
        patient = db.query(Patient).filter(Patient.patient_id == a.patient_id).first() if a.patient_id else None
        doctor = db.query(DBUser).filter(DBUser.id == a.doctor_id).first() if a.doctor_id else None
        result.append({
            "appt_id": a.appt_id,
            "patient_id": a.patient_id,
            "patient_name": patient.full_name if patient else a.patient_name,
            "doctor_id": a.doctor_id,
            "doctor_name": doctor.full_name if doctor else None,
            "slot_date": a.slot_date,
            "slot_time": a.slot_time,
            "appt_type": a.appt_type,
            "status": a.status,
            "source": a.source,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return result


@router.post("")
def create_appointment(req: AppointmentRequest,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appt_id = f"APT-{uuid.uuid4().hex[:8].upper()}"
    appt = Appointment(
        appt_id=appt_id,
        patient_id=req.patient_id,
        patient_name=req.patient_name,
        doctor_id=req.doctor_id or current_user.id,
        slot_date=req.slot_date,
        slot_time=req.slot_time,
        appt_type=req.appt_type,
        status=req.status,
        source=req.source,
        notes=req.notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(appt)
    db.commit()
    return {"appt_id": appt_id, "ok": True}


@router.patch("/{appt_id}")
def update_appointment(appt_id: str, data: dict,
                       db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    appt = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    for field in ("slot_date", "slot_time", "appt_type", "status", "notes", "doctor_id", "patient_name"):
        if field in data:
            setattr(appt, field, data[field])
    db.commit()
    return {"ok": True}


@router.delete("/{appt_id}")
def delete_appointment(appt_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    appt = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    appt.status = "cancelled"
    db.commit()
    return {"ok": True}


@router.get("/slots/{date}")
def available_slots(date: str, doctor_id: Optional[str] = None,
                    db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return all slots for a date and which are booked."""
    SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","14:00","14:30","15:00","15:30","16:00","16:30","17:00"]
    q = db.query(Appointment).filter(Appointment.slot_date == date, Appointment.status != "cancelled")
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    booked = {a.slot_time for a in q.all()}
    return [{"time": s, "available": s not in booked} for s in SLOTS]
