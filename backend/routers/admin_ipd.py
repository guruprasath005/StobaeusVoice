"""Admin-only CRUD for the IPD configuration catalogue: Wards, Bed Tiers, Beds.

Standard Indian HIS admin model — admins define their own ward layout, bed-tier
catalogue (CCU/HDU/Ward/Private/Deluxe + daily charge), and place individual
beds. Consultants/nurses read this through the IPD flows; only admins mutate.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional
import uuid

from db import get_db
from models import Ward, BedTier, Bed, Admission
from routers.auth import require_admin, User

router = APIRouter(prefix="/admin/ipd", tags=["admin-ipd"])


# --- Wards ---

class WardRequest(BaseModel):
    name: str
    floor: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True
    sort_order: Optional[int] = 0


def _ward_dict(w: Ward) -> dict:
    return {
        "ward_id": w.ward_id, "name": w.name, "floor": w.floor, "color": w.color,
        "description": w.description, "is_active": w.is_active, "sort_order": w.sort_order,
    }


@router.get("/wards")
def list_wards(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [_ward_dict(w) for w in db.query(Ward).order_by(Ward.sort_order, Ward.name).all()]


@router.post("/wards")
def create_ward(req: WardRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    w = Ward(
        ward_id=f"WARD-{uuid.uuid4().hex[:6].upper()}",
        name=req.name, floor=req.floor, color=req.color, description=req.description,
        is_active=req.is_active if req.is_active is not None else True,
        sort_order=req.sort_order or 0,
    )
    db.add(w); db.commit(); db.refresh(w)
    return _ward_dict(w)


@router.patch("/wards/{ward_id}")
def update_ward(ward_id: str, req: WardRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    w = db.query(Ward).filter(Ward.ward_id == ward_id).first()
    if not w: raise HTTPException(404, "Ward not found")
    for f in ("name", "floor", "color", "description", "is_active", "sort_order"):
        val = getattr(req, f)
        if val is not None: setattr(w, f, val)
    db.commit(); db.refresh(w)
    return _ward_dict(w)


@router.delete("/wards/{ward_id}")
def delete_ward(ward_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    in_use = db.query(Bed).filter(Bed.ward_id == ward_id).first()
    if in_use:
        raise HTTPException(409, "Ward has beds attached. Reassign or delete those first.")
    w = db.query(Ward).filter(Ward.ward_id == ward_id).first()
    if not w: raise HTTPException(404, "Ward not found")
    db.delete(w); db.commit()
    return {"ok": True}


# --- Bed tiers (CCU / HDU / Ward / Private / …) ---

class BedTierRequest(BaseModel):
    name: str
    daily_charge_inr: Optional[int] = 0
    nurse_ratio: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


def _tier_dict(t: BedTier) -> dict:
    return {
        "tier_id": t.tier_id, "name": t.name, "daily_charge_inr": t.daily_charge_inr,
        "nurse_ratio": t.nurse_ratio, "color": t.color, "sort_order": t.sort_order,
        "is_active": t.is_active,
    }


@router.get("/tiers")
def list_tiers(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [_tier_dict(t) for t in db.query(BedTier).order_by(BedTier.sort_order, BedTier.name).all()]


@router.post("/tiers")
def create_tier(req: BedTierRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = BedTier(
        tier_id=f"TIER-{uuid.uuid4().hex[:6].upper()}",
        name=req.name, daily_charge_inr=req.daily_charge_inr or 0,
        nurse_ratio=req.nurse_ratio, color=req.color, sort_order=req.sort_order or 0,
        is_active=req.is_active if req.is_active is not None else True,
    )
    db.add(t); db.commit(); db.refresh(t)
    return _tier_dict(t)


@router.patch("/tiers/{tier_id}")
def update_tier(tier_id: str, req: BedTierRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    t = db.query(BedTier).filter(BedTier.tier_id == tier_id).first()
    if not t: raise HTTPException(404, "Tier not found")
    for f in ("name", "daily_charge_inr", "nurse_ratio", "color", "sort_order", "is_active"):
        val = getattr(req, f)
        if val is not None: setattr(t, f, val)
    db.commit(); db.refresh(t)
    return _tier_dict(t)


@router.delete("/tiers/{tier_id}")
def delete_tier(tier_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    in_use = db.query(Bed).filter(Bed.tier_id == tier_id).first()
    if in_use:
        raise HTTPException(409, "Tier is assigned to beds. Reassign those beds first.")
    t = db.query(BedTier).filter(BedTier.tier_id == tier_id).first()
    if not t: raise HTTPException(404, "Tier not found")
    db.delete(t); db.commit()
    return {"ok": True}


# --- Beds ---

class BedRequest(BaseModel):
    bed_id: Optional[str] = None     # admins can pick the id, e.g. "CCU-01"
    label: Optional[str] = None
    ward_id: Optional[str] = None
    tier_id: Optional[str] = None
    is_active: Optional[bool] = True
    notes: Optional[str] = None
    sort_order: Optional[int] = 0


def _bed_dict(b: Bed, db: Session) -> dict:
    ward = db.query(Ward).filter(Ward.ward_id == b.ward_id).first() if b.ward_id else None
    tier = db.query(BedTier).filter(BedTier.tier_id == b.tier_id).first() if b.tier_id else None
    occupant = db.query(Admission).filter(Admission.bed_id == b.bed_id, Admission.status == "active").first()
    return {
        "bed_id": b.bed_id, "label": b.label, "ward_id": b.ward_id,
        "ward_name": ward.name if ward else None,
        "tier_id": b.tier_id, "tier_name": tier.name if tier else None,
        "tier_color": tier.color if tier else None,
        "tier_charge_inr": tier.daily_charge_inr if tier else None,
        "is_active": b.is_active, "notes": b.notes, "sort_order": b.sort_order,
        "occupied": bool(occupant),
        "admission_id": occupant.admission_id if occupant else None,
        "occupant_patient_id": occupant.patient_id if occupant else None,
    }


@router.get("/beds")
def list_beds(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [_bed_dict(b, db) for b in db.query(Bed).order_by(Bed.sort_order, Bed.bed_id).all()]


@router.post("/beds")
def create_bed(req: BedRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    bed_id = (req.bed_id or "").strip() or f"BED-{uuid.uuid4().hex[:6].upper()}"
    if db.query(Bed).filter(Bed.bed_id == bed_id).first():
        raise HTTPException(409, f"Bed id {bed_id} already exists")
    b = Bed(
        bed_id=bed_id, label=req.label, ward_id=req.ward_id, tier_id=req.tier_id,
        is_active=req.is_active if req.is_active is not None else True,
        notes=req.notes, sort_order=req.sort_order or 0,
    )
    db.add(b); db.commit(); db.refresh(b)
    return _bed_dict(b, db)


@router.patch("/beds/{bed_id}")
def update_bed(bed_id: str, req: BedRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    b = db.query(Bed).filter(Bed.bed_id == bed_id).first()
    if not b: raise HTTPException(404, "Bed not found")
    for f in ("label", "ward_id", "tier_id", "is_active", "notes", "sort_order"):
        val = getattr(req, f)
        if val is not None: setattr(b, f, val)
    db.commit(); db.refresh(b)
    return _bed_dict(b, db)


@router.delete("/beds/{bed_id}")
def delete_bed(bed_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    busy = db.query(Admission).filter(Admission.bed_id == bed_id, Admission.status == "active").first()
    if busy:
        raise HTTPException(409, "Bed has an active admission. Discharge or transfer first.")
    b = db.query(Bed).filter(Bed.bed_id == bed_id).first()
    if not b: raise HTTPException(404, "Bed not found")
    db.delete(b); db.commit()
    return {"ok": True}


