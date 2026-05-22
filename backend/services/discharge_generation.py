from openai import OpenAI, APIError
from fastapi import HTTPException
import json

from config import settings
from datetime import datetime

client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a clinical documentation assistant for Indian cardiology departments.
Generate a structured cardiac discharge summary from the consultation data provided.

Rules:
- Output ONLY valid JSON. No explanation, no markdown.
- Use Indian cardiology terminology and drug names.
- Be concise but complete — each section should be 1–5 sentences.
- Never include patient name, phone, or address in any field.
- If a section cannot be determined from available data, use a clinically reasonable placeholder.

Output format:
{
  "chief_complaint": "string",
  "presenting_history": "string",
  "clinical_course": "string",
  "investigations": "string",
  "procedures": "string",
  "discharge_condition": "string",
  "follow_up": "string",
  "advice": "string"
}"""


def _format_clinical(clinical: dict) -> str:
    parts = []
    if clinical.get("age") and clinical.get("gender_code"):
        parts.append(f"Patient: {clinical['age']}Y {clinical['gender_code']}")
    if clinical.get("conditions"):
        parts.append(f"K/c/o: {', '.join(clinical['conditions'])}")
    if clinical.get("medications"):
        meds = ", ".join(f"{m['drug']} {m.get('dose', '')}".strip() for m in clinical["medications"])
        parts.append(f"Background medications: {meds}")
    if clinical.get("allergies"):
        parts.append(f"Allergies: {', '.join(clinical['allergies'])}")
    return "\n".join(parts) if parts else "Clinical context not available"


def _format_soap(soap: dict) -> str:
    sections = []
    for key, label in [("subjective", "S"), ("objective", "O"), ("assessment", "A"), ("plan", "P")]:
        val = soap.get(key)
        if val:
            sections.append(f"{label}: {val}")
    return "\n".join(sections) if sections else "SOAP note not available"


def _format_icd(icd_codes: list) -> str:
    if not icd_codes:
        return "Not specified"
    return ", ".join(f"{c.get('code')} ({c.get('description', '')})" for c in icd_codes)


def _format_meds(prescription: list) -> str:
    if not prescription:
        return "As per prescription"
    lines = []
    for d in prescription:
        line = f"- {d.get('drug', '')} {d.get('dose', '')} {d.get('freq', '')}".strip()
        if d.get("duration"):
            line += f" × {d['duration']}"
        lines.append(line)
    return "\n".join(lines)


def _format_echo_reports(reports: list) -> str:
    if not reports:
        return "No reports on file"
    lines = []
    for r in reports:
        template = r.get("template", "").upper()
        impression = r.get("impression", "")
        if impression:
            lines.append(f"- {template}: {impression}")
    return "\n".join(lines) if lines else "No impressions recorded"


def _naive(dt: datetime | None) -> datetime | None:
    """Drop tzinfo so DB-stored naive datetimes and datetime.now(utc) can be compared."""
    return dt.replace(tzinfo=None) if (dt and dt.tzinfo) else dt


def _format_dates(admission: datetime | None, discharge: datetime | None) -> str:
    fmt = "%d %b %Y"
    adm = admission.strftime(fmt) if admission else "Unknown"
    dis = discharge.strftime(fmt) if discharge else "Unknown"
    if admission and discharge:
        days = (_naive(discharge) - _naive(admission)).days
        return f"Admitted: {adm} | Discharged: {dis} | Duration: {days} day{'s' if days != 1 else ''}"
    return f"Admitted: {adm} | Discharged: {dis}"


async def generate_discharge_summary(
    clinical_context: dict,
    soap_note: dict,
    icd_codes: list,
    prescription: list,
    echo_reports: list,
    admission_date: datetime | None,
    discharge_date: datetime | None,
) -> dict:
    """Generate discharge summary. Only clinical data (no PII) sent to OpenAI."""

    user_content = f"""
{_format_clinical(clinical_context)}

{_format_dates(admission_date, discharge_date)}

SOAP Note:
{_format_soap(soap_note)}

ICD-10 Diagnoses: {_format_icd(icd_codes)}

Investigations / Reports:
{_format_echo_reports(echo_reports)}

Discharge Medications:
{_format_meds(prescription)}

Generate the cardiac discharge summary now.
""".strip()

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.15,
        )
        return json.loads(response.choices[0].message.content)
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Discharge summary generation service unavailable: {e.message}")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="Discharge summary generation returned invalid response — please try again")
    except Exception:
        raise HTTPException(status_code=502, detail="Discharge summary generation failed — check OpenAI API key and try again")
