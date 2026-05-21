"""
Run once to create the first admin user:
  python seed_admin.py
"""
from database import SessionLocal, User, init_db
from routers.auth import hash_password
import uuid

init_db()

email = "admin@stobaeus.com"
password = "admin123"   # change after first login

db = SessionLocal()
if db.query(User).filter(User.email == email).first():
    print(f"Admin already exists: {email}")
else:
    admin = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password(password),
        full_name="StobaeusVoice Admin",
        role="admin",
        hospital="StobaeusVoice",
    )
    db.add(admin)
    db.commit()
    print(f"Admin created: {email} / {password}")
db.close()
