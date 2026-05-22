from openai import OpenAI, APIError
from fastapi import HTTPException
import json

from config import settings

client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a clinical documentation assistant for Indian hospitals.
Generate a structured SOAP note from the consultation transcript.

Rules:
- Output ONLY valid JSON. No explanation, no markdown.
- Use Indian drug brand names where appropriate.
- ICD-10 codes must be standard.
- If a field cannot be determined, use null.

Output format:
{
  "subjective": "string",
  "objective": "string",
  "assessment": "string",
  "plan": "string",
  "icd_codes": [{"code": "J06.9", "description": "...", "confidence": 0.94}],
  "prescription": [{"drug": "...", "dose": "...", "frequency": "...", "duration": "...", "interaction_flag": false}]
}"""

def build_patient_context(clinical: dict) -> str:
    """Build safe LLM context from clinical data only — zero PII."""
    parts = []
    if clinical.get("age") and clinical.get("gender_code"):
        parts.append(f"Patient: {clinical['age']}{clinical['gender_code']}")
    if clinical.get("conditions"):
        parts.append(f"K/c/o: {', '.join(clinical['conditions'])}")
    if clinical.get("medications"):
        meds = ", ".join(f"{m['drug']} {m.get('dose','')} {m.get('freq','')}".strip() for m in clinical["medications"])
        parts.append(f"Current medications: {meds}")
    if clinical.get("allergies"):
        parts.append(f"Allergies: {', '.join(clinical['allergies'])}")
    return "\n".join(parts)

def build_followup_context(previous_soap: dict) -> str:
    """Summarise previous SOAP for LLM follow-up context — no PII."""
    lines = ["--- Previous Visit SOAP Note ---"]
    if previous_soap.get("subjective"):
        lines.append(f"Subjective: {previous_soap['subjective']}")
    if previous_soap.get("objective"):
        lines.append(f"Objective: {previous_soap['objective']}")
    if previous_soap.get("assessment"):
        lines.append(f"Assessment: {previous_soap['assessment']}")
    if previous_soap.get("plan"):
        lines.append(f"Plan: {previous_soap['plan']}")
    lines.append("---")
    lines.append("This is a FOLLOW-UP consultation. In Subjective: note symptom progression (better/worse/same). "
                 "In Plan: note any medication changes vs last visit. Keep the note concise — only document what changed.")
    return "\n".join(lines)

async def generate_soap_note(transcript: str, clinical_context: dict, previous_soap: dict | None = None) -> dict:
    """
    Generate SOAP note. Only transcript + clinical context (no PII) sent to OpenAI.
    For follow-ups, previous SOAP is included as context.
    """
    patient_ctx = build_patient_context(clinical_context)
    followup_ctx = build_followup_context(previous_soap) if previous_soap else ""

    user_content = "\n\n".join(filter(None, [patient_ctx, followup_ctx, f"Transcript:\n{transcript}"]))

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
        )
        return json.loads(response.choices[0].message.content)
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Note generation service unavailable: {e.message}")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="Note generation returned invalid response — please try again")
    except Exception:
        raise HTTPException(status_code=502, detail="Note generation failed — check OpenAI API key and try again")
