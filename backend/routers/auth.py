from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from db import get_db
from models import User, AccessLog
from config import settings
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = settings.jwt_secret
if not SECRET_KEY:
    import sys
    print("FATAL: JWT_SECRET environment variable is not set. Refusing to start.", file=sys.stderr)
    sys.exit(1)
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# --- helpers ---

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise credentials_exc
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def assert_owner(owner_id: Optional[str], user: User) -> None:
    """
    Raise 403 unless `user` owns the resource (its doctor/creator id matches)
    or is an admin. Records with no owner are treated as admin-only.
    """
    if user.role == "admin":
        return
    if not owner_id or owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")


# --- schemas ---

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str           # cardiologist / cardiac_surgeon / cardiac_nurse / admin
    hospital: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    hospital: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# --- endpoints ---

@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username, User.is_active == True).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_token(user.id)
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "hospital": user.hospital,
        },
    }

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "hospital": current_user.hospital,
    }

@router.patch("/me")
def update_profile(body: UpdateProfileRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.hospital is not None:
        current_user.hospital = body.hospital
    db.commit()
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "hospital": current_user.hospital,
    }


@router.post("/me/change-password")
def change_password(body: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@router.post("/users/create", status_code=201)
def create_user(body: CreateUserRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        hospital=body.hospital,
    )
    db.add(user)
    db.commit()
    return {"id": user.id, "email": user.email, "role": user.role}

@router.get("/users")
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "hospital": u.hospital,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@router.patch("/users/{user_id}/toggle")
def toggle_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}

@router.get("/audit-logs")
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """DPDP access-audit trail — who viewed/exported which patient data. Admin only."""
    rows = db.query(AccessLog).order_by(AccessLog.created_at.desc()).limit(min(limit, 500)).all()
    user_names = {u.id: u.full_name for u in db.query(User).all()}
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": user_names.get(r.user_id),
            "action": r.action,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "patient_id": r.patient_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.patch("/users/{user_id}/reset-password")
def reset_password(user_id: str, body: dict, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_password = body.get("password", "")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"ok": True}
