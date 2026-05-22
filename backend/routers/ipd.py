from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db, IpdNote, NurseBedLog, Patient, PatientClinical, Admission, Bed, Ward, BedTier, BedTransfer
from routers.auth import get_current_user, assert_owner, User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/ipd", tags=["ipd"])


def _next_admission_id(db: Session) -> str:
    count = db.query(Admission).count()
    return f"ADM-{count + 1:04d}"


def _admission_to_dict(adm: Admission, db: Session) -> dict:
    patient = db.query(Patient).filter(Patient.patient_id == adm.patient_id).first() if adm.patient_id else None
    bed = db.query(Bed).filter(Bed.bed_id == adm.bed_id).first() if adm.bed_id else None
    tier = db.query(BedTier).filter(BedTier.tier_id == adm.tier_id_snapshot).first() if adm.tier_id_snapshot else None
    ward = db.query(Ward).filter(Ward.ward_id == adm.ward_id_snapshot).first() if adm.ward_id_snapshot else None
    return {
        "admission_id": adm.admission_id,
        "patient_id": adm.patient_id,
        "patient_name": patient.full_name if patient else None,
        "bed_id": adm.bed_id,
        "bed_label": (bed.label or bed.bed_id) if bed else adm.bed_id,
        "ward_id": adm.ward_id_snapshot,
        "ward_name": ward.name if ward else None,
        "tier_id": adm.tier_id_snapshot,
        "tier_name": tier.name if tier else None,
        "admitting_doctor_id": adm.admitting_doctor_id,
        "mode": adm.mode,
        "transcript": adm.transcript,
        "chief_complaint": adm.chief_complaint,
        "hopi": adm.hopi,
        "examination": adm.examination,
        "provisional_dx": adm.provisional_dx,
        "soap": adm.soap,
        "admit_orders": adm.admit_orders,
        "icd_codes": adm.icd_codes,
        "status": adm.status,
        "admitted_at": adm.admitted_at.isoformat() if adm.admitted_at else None,
        "discharged_at": adm.discharged_at.isoformat() if adm.discharged_at else None,
    }

class IpdNoteRequest(BaseModel):
    patient_id: Optional[str] = None
    admission_id: Optional[str] = None
    bed_id: Optional[str] = None
    vitals: Optional[dict] = None
    status_text: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


@router.get("/notes")
def list_notes(patient_id: Optional[str] = None, admission_id: Optional[str] = None,
               skip: int = 0, limit: int = 30,
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(IpdNote).filter(IpdNote.doctor_id == current_user.id)
    if admission_id:
        q = q.filter(IpdNote.admission_id == admission_id)
    elif patient_id:
        q = q.filter(IpdNote.patient_id == patient_id)
    notes = q.order_by(desc(IpdNote.created_at)).offset(skip).limit(limit).all()
    result = []
    for n in notes:
        patient = db.query(Patient).filter(Patient.patient_id == n.patient_id).first() if n.patient_id else None
        result.append({
            "note_id": n.note_id,
            "admission_id": n.admission_id,
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
        admission_id=req.admission_id,
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
def get_note(note_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(IpdNote).filter(IpdNote.note_id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    assert_owner(note.doctor_id, current_user)
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
def update_note(note_id: str, req: IpdNoteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(IpdNote).filter(IpdNote.note_id == note_id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    assert_owner(note.doctor_id, current_user)
    if req.vitals is not None: note.vitals = req.vitals
    if req.status_text is not None: note.status_text = req.status_text
    if req.assessment is not None: note.assessment = req.assessment
    if req.plan is not None: note.plan = req.plan
    db.commit()
    return {"ok": True}


@router.get("/ward-patients")
def ward_patients(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Active admissions → ward round list. Vitals come from latest nurse log per bed (if any)."""
    admissions = db.query(Admission).filter(Admission.status == "active").order_by(desc(Admission.admitted_at)).all()
    out = []
    for adm in admissions:
        patient = db.query(Patient).filter(Patient.patient_id == adm.patient_id).first() if adm.patient_id else None
        bed = db.query(Bed).filter(Bed.bed_id == adm.bed_id).first() if adm.bed_id else None
        tier = db.query(BedTier).filter(BedTier.tier_id == adm.tier_id_snapshot).first() if adm.tier_id_snapshot else None
        ward = db.query(Ward).filter(Ward.ward_id == adm.ward_id_snapshot).first() if adm.ward_id_snapshot else None
        latest = None
        if adm.bed_id:
            latest = (
                db.query(NurseBedLog)
                .filter(NurseBedLog.bed_id == adm.bed_id)
                .order_by(desc(NurseBedLog.recorded_at))
                .first()
            )
        out.append({
            "admission_id": adm.admission_id,
            "bed_id": adm.bed_id,
            "bed_label": (bed.label or bed.bed_id) if bed else adm.bed_id,
            "ward_name": ward.name if ward else None,
            "tier_name": tier.name if tier else None,
            "tier_color": tier.color if tier else None,
            "patient_id": adm.patient_id,
            "patient_name": patient.full_name if patient else (adm.patient_id or "Anonymous"),
            "full_name": patient.full_name if patient else (adm.patient_id or "Anonymous"),
            "provisional_dx": adm.provisional_dx,
            "mode": adm.mode,
            "admitted_at": adm.admitted_at.isoformat() if adm.admitted_at else None,
            "bp": latest.bp if latest else None,
            "hr": latest.hr if latest else None,
            "spo2": latest.spo2 if latest else None,
            "temp": latest.temp if latest else None,
            "rr": latest.rr if latest else None,
            "drips": (latest.drips or []) if latest else [],
            "recorded_at": latest.recorded_at.isoformat() if (latest and latest.recorded_at) else None,
        })
    return out


# --- IPD catalogue (used by Admit Patient modal) ---

@router.get("/catalogue")
def ipd_catalogue(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Wards, tiers, beds + live occupancy. Drives the bed picker."""
    wards = [{"ward_id": w.ward_id, "name": w.name, "floor": w.floor, "color": w.color, "sort_order": w.sort_order}
             for w in db.query(Ward).filter(Ward.is_active == True).order_by(Ward.sort_order, Ward.name).all()]
    tiers = [{"tier_id": t.tier_id, "name": t.name, "color": t.color, "daily_charge_inr": t.daily_charge_inr,
              "nurse_ratio": t.nurse_ratio, "sort_order": t.sort_order}
             for t in db.query(BedTier).filter(BedTier.is_active == True).order_by(BedTier.sort_order, BedTier.name).all()]
    beds = []
    for b in db.query(Bed).filter(Bed.is_active == True).order_by(Bed.sort_order, Bed.bed_id).all():
        occ = db.query(Admission).filter(Admission.bed_id == b.bed_id, Admission.status == "active").first()
        beds.append({
            "bed_id": b.bed_id, "label": b.label or b.bed_id,
            "ward_id": b.ward_id, "tier_id": b.tier_id,
            "occupied": bool(occ),
            "occupant_admission_id": occ.admission_id if occ else None,
        })
    return {"wards": wards, "tiers": tiers, "beds": beds}


# --- Admissions ---

class AdmissionCreateRequest(BaseModel):
    patient_id: Optional[str] = None        # PT-XXXX or None for anonymous
    bed_id: str
    mode: str = "standard"                  # standard / stemi_fast_track


class AdmissionGenerateRequest(BaseModel):
    transcript: str


class AdmissionPatchRequest(BaseModel):
    chief_complaint: Optional[str] = None
    hopi: Optional[str] = None
    examination: Optional[str] = None
    provisional_dx: Optional[str] = None
    soap: Optional[dict] = None
    admit_orders: Optional[dict] = None
    icd_codes: Optional[list] = None
    transcript: Optional[str] = None


@router.post("/admissions")
def create_admission(req: AdmissionCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bed = db.query(Bed).filter(Bed.bed_id == req.bed_id, Bed.is_active == True).first()
    if not bed:
        raise HTTPException(404, "Bed not found or inactive")
    # Refuse if bed already has an active admission
    busy = db.query(Admission).filter(Admission.bed_id == req.bed_id, Admission.status == "active").first()
    if busy:
        raise HTTPException(409, f"Bed {req.bed_id} is already occupied by {busy.admission_id}")
    patient_id = req.patient_id or f"PT-ANON-{uuid.uuid4().hex[:6].upper()}"
    adm = Admission(
        admission_id=_next_admission_id(db),
        patient_id=patient_id,
        bed_id=req.bed_id,
        ward_id_snapshot=bed.ward_id,
        tier_id_snapshot=bed.tier_id,
        admitting_doctor_id=current_user.id,
        mode=req.mode if req.mode in ("standard", "stemi_fast_track") else "standard",
        status="active",
        admitted_at=datetime.now(timezone.utc),
    )
    db.add(adm)
    db.commit()
    db.refresh(adm)
    return _admission_to_dict(adm, db)


@router.get("/admissions")
def list_admissions(status: Optional[str] = "active", db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Admission)
    if status:
        q = q.filter(Admission.status == status)
    return [_admission_to_dict(a, db) for a in q.order_by(desc(Admission.admitted_at)).all()]


@router.get("/admissions/{admission_id}")
def get_admission(admission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm:
        raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)
    return _admission_to_dict(adm, db)


@router.post("/admissions/{admission_id}/generate")
async def generate_admission(admission_id: str, req: AdmissionGenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm:
        raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)
    if not req.transcript.strip():
        raise HTTPException(400, "Empty transcript")
    # Build clinical context (PII-safe). Anonymous patients have none.
    clinical = {}
    if adm.patient_id and not adm.patient_id.startswith("PT-ANON"):
        pc = db.query(PatientClinical).filter(PatientClinical.patient_id == adm.patient_id).first()
        if pc:
            clinical = {
                "age": pc.age, "gender_code": pc.gender_code,
                "conditions": pc.conditions or [], "medications": pc.medications or [],
                "allergies": pc.allergies or [],
            }
    from services.admission_generation import generate_admission_note
    note = await generate_admission_note(req.transcript, clinical, mode=adm.mode)
    adm.transcript = req.transcript
    adm.chief_complaint = note.get("chief_complaint")
    adm.hopi = note.get("hopi")
    adm.examination = note.get("examination")
    adm.provisional_dx = note.get("provisional_dx")
    adm.soap = note.get("soap")
    adm.admit_orders = note.get("admit_orders")
    adm.icd_codes = note.get("icd_codes")
    db.commit()
    db.refresh(adm)
    return _admission_to_dict(adm, db)


@router.patch("/admissions/{admission_id}")
def patch_admission(admission_id: str, req: AdmissionPatchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm:
        raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)
    for field in ("chief_complaint", "hopi", "examination", "provisional_dx", "soap", "admit_orders", "icd_codes", "transcript"):
        val = getattr(req, field)
        if val is not None:
            setattr(adm, field, val)
    db.commit()
    db.refresh(adm)
    return _admission_to_dict(adm, db)


@router.post("/admissions/{admission_id}/generate-progress")
async def generate_progress(admission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Draft today's S/O/A/P progress note from admission context + latest vitals + prior notes."""
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
    # Latest vitals from nurse log on this bed
    latest_log = None
    if adm.bed_id:
        latest_log = db.query(NurseBedLog).filter(NurseBedLog.bed_id == adm.bed_id).order_by(desc(NurseBedLog.recorded_at)).first()
    latest_vitals = None
    if latest_log:
        latest_vitals = {
            "bp": latest_log.bp, "hr": latest_log.hr, "spo2": latest_log.spo2,
            "temp": latest_log.temp, "rr": latest_log.rr, "drips": latest_log.drips or [],
        }
    # Prior progress notes on this admission
    prior = (
        db.query(IpdNote)
        .filter(IpdNote.admission_id == admission_id)
        .order_by(desc(IpdNote.created_at)).limit(5).all()
    )
    prior_dicts = [{
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "status_text": n.status_text, "assessment": n.assessment, "plan": n.plan,
    } for n in prior]

    from services.progress_note_generation import generate_progress_note
    draft = await generate_progress_note(
        admission=_admission_to_dict(adm, db),
        clinical_context=clinical,
        latest_vitals=latest_vitals,
        prior_notes=prior_dicts,
    )
    return {
        "status_text": draft.get("status_text"),
        "assessment": draft.get("assessment"),
        "plan": draft.get("plan"),
        "vitals_used": latest_vitals,
        "prior_note_count": len(prior_dicts),
    }


class TransferRequest(BaseModel):
    to_bed_id: str
    reason: Optional[str] = None


@router.post("/admissions/{admission_id}/transfer")
def transfer_admission(admission_id: str, req: TransferRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Move an active admission to a different bed. Records an audit row with direction + reason."""
    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm: raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)
    if adm.status != "active":
        raise HTTPException(409, "Admission is not active")
    if req.to_bed_id == adm.bed_id:
        raise HTTPException(400, "Target bed is the same as current bed")

    target = db.query(Bed).filter(Bed.bed_id == req.to_bed_id, Bed.is_active == True).first()
    if not target: raise HTTPException(404, "Target bed not found or inactive")
    busy = db.query(Admission).filter(Admission.bed_id == req.to_bed_id, Admission.status == "active").first()
    if busy and busy.admission_id != admission_id:
        raise HTTPException(409, f"Target bed already occupied by {busy.admission_id}")

    # Direction: compare tier sort_order (lower = more acute, e.g. CCU=1 < Ward=3)
    from_tier = db.query(BedTier).filter(BedTier.tier_id == adm.tier_id_snapshot).first() if adm.tier_id_snapshot else None
    to_tier   = db.query(BedTier).filter(BedTier.tier_id == target.tier_id).first() if target.tier_id else None
    direction = "lateral"
    if from_tier and to_tier and from_tier.sort_order != to_tier.sort_order:
        direction = "step_down" if to_tier.sort_order > from_tier.sort_order else "step_up"

    transfer = BedTransfer(
        transfer_id=f"TRF-{uuid.uuid4().hex[:8].upper()}",
        admission_id=admission_id,
        from_bed_id=adm.bed_id, from_tier_id=adm.tier_id_snapshot, from_ward_id=adm.ward_id_snapshot,
        to_bed_id=target.bed_id, to_tier_id=target.tier_id, to_ward_id=target.ward_id,
        direction=direction, reason=(req.reason or None),
        transferred_by=current_user.id,
        transferred_at=datetime.now(timezone.utc),
    )
    db.add(transfer)
    adm.bed_id = target.bed_id
    adm.tier_id_snapshot = target.tier_id
    adm.ward_id_snapshot = target.ward_id
    db.commit(); db.refresh(adm)
    return {
        "ok": True,
        "transfer_id": transfer.transfer_id,
        "direction": direction,
        "admission": _admission_to_dict(adm, db),
    }


@router.get("/admissions/{admission_id}/transfers")
def list_transfers(admission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm: raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)
    transfers = db.query(BedTransfer).filter(BedTransfer.admission_id == admission_id).order_by(desc(BedTransfer.transferred_at)).all()
    out = []
    for t in transfers:
        from_tier = db.query(BedTier).filter(BedTier.tier_id == t.from_tier_id).first() if t.from_tier_id else None
        to_tier   = db.query(BedTier).filter(BedTier.tier_id == t.to_tier_id).first() if t.to_tier_id else None
        out.append({
            "transfer_id": t.transfer_id,
            "from_bed_id": t.from_bed_id, "from_tier_name": from_tier.name if from_tier else None,
            "to_bed_id": t.to_bed_id,     "to_tier_name": to_tier.name if to_tier else None,
            "direction": t.direction, "reason": t.reason,
            "transferred_at": t.transferred_at.isoformat() if t.transferred_at else None,
        })
    return out


@router.post("/admissions/{admission_id}/discharge")
def discharge_admission(admission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    adm = db.query(Admission).filter(Admission.admission_id == admission_id).first()
    if not adm:
        raise HTTPException(404, "Admission not found")
    assert_owner(adm.admitting_doctor_id, current_user)
    adm.status = "discharged"
    adm.discharged_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "admission_id": admission_id, "status": adm.status}


@router.post("/dictate")
async def dictate_note_field(
    audio: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    audio_bytes = await audio.read()
    from services.transcription import transcribe_audio
    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    return {"transcript": transcript}
