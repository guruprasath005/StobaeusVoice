"""
Seed default IPD configuration: cardiac wards, bed tiers, beds.
Run once after schema migration:
  python seed_ipd.py
Idempotent — re-running is safe (skips existing rows by name/id).
"""
from database import SessionLocal, Ward, BedTier, Bed, init_db
import uuid

init_db()
db = SessionLocal()

# --- Tiers (CCU > HDU > Ward > Private, with realistic Indian per-day rates) ---
TIERS = [
    {"name": "CCU",     "daily_charge_inr": 28000, "nurse_ratio": "1:1", "color": "#EF4444", "sort_order": 1},
    {"name": "HDU",     "daily_charge_inr": 18000, "nurse_ratio": "2:1", "color": "#F59E0B", "sort_order": 2},
    {"name": "Ward",    "daily_charge_inr":  8000, "nurse_ratio": "5:1", "color": "#10B981", "sort_order": 3},
    {"name": "Private", "daily_charge_inr": 22000, "nurse_ratio": "2:1", "color": "#6366F1", "sort_order": 4},
]
tier_ids = {}
for t in TIERS:
    existing = db.query(BedTier).filter(BedTier.name == t["name"]).first()
    if existing:
        tier_ids[t["name"]] = existing.tier_id
        continue
    row = BedTier(tier_id=f"TIER-{t['name'].upper()}", **t)
    db.add(row); tier_ids[t["name"]] = row.tier_id
db.commit()

# --- Wards ---
WARDS = [
    {"name": "Cardiac CCU",  "floor": "5", "color": "#FEE2E2", "description": "Coronary Care Unit, 5th floor", "sort_order": 1},
    {"name": "Cardiac HDU",  "floor": "5", "color": "#FEF3C7", "description": "Step-down high dependency",   "sort_order": 2},
    {"name": "Cardiac Ward", "floor": "4", "color": "#DCFCE7", "description": "General cardiac ward",         "sort_order": 3},
    {"name": "Private",      "floor": "6", "color": "#E0E7FF", "description": "Private rooms",                "sort_order": 4},
]
ward_ids = {}
for w in WARDS:
    existing = db.query(Ward).filter(Ward.name == w["name"]).first()
    if existing:
        ward_ids[w["name"]] = existing.ward_id; continue
    row = Ward(ward_id=f"WARD-{w['name'].split()[-1].upper()[:6]}-{uuid.uuid4().hex[:3].upper()}", is_active=True, **w)
    db.add(row); ward_ids[w["name"]] = row.ward_id
db.commit()

# --- Beds ---
BEDS = [
    # CCU
    ("CCU-01", "Cardiac CCU", "CCU"), ("CCU-02", "Cardiac CCU", "CCU"),
    ("CCU-03", "Cardiac CCU", "CCU"), ("CCU-04", "Cardiac CCU", "CCU"),
    # HDU
    ("HDU-01", "Cardiac HDU", "HDU"), ("HDU-02", "Cardiac HDU", "HDU"),
    ("HDU-03", "Cardiac HDU", "HDU"), ("HDU-04", "Cardiac HDU", "HDU"),
    # Ward (B01-B08 retain legacy ids so nurse-station vitals still link)
    ("B01", "Cardiac Ward", "Ward"), ("B02", "Cardiac Ward", "Ward"),
    ("B03", "Cardiac Ward", "Ward"), ("B04", "Cardiac Ward", "Ward"),
    ("B05", "Cardiac Ward", "Ward"), ("B06", "Cardiac Ward", "Ward"),
    ("B07", "Cardiac Ward", "Ward"), ("B08", "Cardiac Ward", "Ward"),
    # Private
    ("PVT-01", "Private", "Private"), ("PVT-02", "Private", "Private"),
]
for i, (bed_id, ward_name, tier_name) in enumerate(BEDS):
    if db.query(Bed).filter(Bed.bed_id == bed_id).first():
        continue
    db.add(Bed(
        bed_id=bed_id, label=bed_id,
        ward_id=ward_ids[ward_name], tier_id=tier_ids[tier_name],
        is_active=True, sort_order=i,
    ))
db.commit()

print(f"Seeded {len(TIERS)} tiers, {len(WARDS)} wards, {len(BEDS)} beds.")
db.close()
