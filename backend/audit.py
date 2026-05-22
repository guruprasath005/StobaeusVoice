"""DPDP access-audit logging — records who touched which patient data."""
from sqlalchemy.orm import Session
from models import AccessLog
import uuid


def log_access(
    db: Session,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    patient_id: str | None = None,
) -> None:
    """
    Append an access-audit entry. Best-effort: an audit failure must never
    block or break a clinical request, so all errors are swallowed.
    """
    try:
        db.add(AccessLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            patient_id=patient_id,
        ))
        db.commit()
    except Exception:
        db.rollback()
