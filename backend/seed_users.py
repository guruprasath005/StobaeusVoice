"""
Seed the cardiac care team — run once after seed_admin.py:
  python seed_users.py

Creates the clinical staff an Admin would normally add via /auth/users/create.
All accounts use the same temporary password — change after first login.
"""
from database import SessionLocal, User, init_db
from routers.auth import hash_password
import uuid

init_db()

HOSPITAL = "Apollo Hospitals, Chennai"
TEMP_PASSWORD = "Cardio@2026"

# 1 Cardiologist, 2 Cardiac Surgeons, 2 Cardiac Nurses
TEAM = [
    {"full_name": "Dr. Priya Sharma",   "email": "priya.sharma@stobaeus.com",   "role": "cardiologist"},
    {"full_name": "Dr. Rajesh Menon",   "email": "rajesh.menon@stobaeus.com",   "role": "cardiac_surgeon"},
    {"full_name": "Dr. Anand Krishnan", "email": "anand.krishnan@stobaeus.com", "role": "cardiac_surgeon"},
    {"full_name": "Lakshmi Nair",       "email": "lakshmi.nair@stobaeus.com",   "role": "cardiac_nurse"},
    {"full_name": "Deepa Reddy",        "email": "deepa.reddy@stobaeus.com",    "role": "cardiac_nurse"},
]

db = SessionLocal()
created = 0
for member in TEAM:
    if db.query(User).filter(User.email == member["email"]).first():
        print(f"Skip (already exists): {member['email']}")
        continue
    db.add(User(
        id=str(uuid.uuid4()),
        email=member["email"],
        password_hash=hash_password(TEMP_PASSWORD),
        full_name=member["full_name"],
        role=member["role"],
        hospital=HOSPITAL,
    ))
    created += 1
    print(f"Created: {member['full_name']:20s} {member['role']:16s} {member['email']}")
db.commit()
db.close()
print(f"\nDone — {created} user(s) created. Temp password for all: {TEMP_PASSWORD}")
