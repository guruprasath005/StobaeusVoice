from openai import OpenAI, APIError
from fastapi import HTTPException
import os, json

from services.note_generation import build_patient_context

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT_STANDARD = """You are a cardiology admission documentation assistant for Indian hospitals.
Generate a structured IPD admission note from the doctor's dictation.

Rules:
- Output ONLY valid JSON. No markdown, no commentary.
- Use Indian drug brand names where appropriate.
- ICD-10 codes must be standard (cardiology focus: I21.x, I25.x, I50.x, I48.x, I05.x, I34.x, I10).
- If a field cannot be determined from the dictation, use null (do NOT invent findings).
- Admit orders should be specific: drug + dose + route, monitoring frequency, NPO/diet, IV access, special instructions.

Output format:
{
  "chief_complaint": "string",
  "hopi": "string",
  "examination": "string (general + cardiac exam)",
  "provisional_dx": "string",
  "soap": {
    "subjective": "string",
    "objective": "string",
    "assessment": "string",
    "plan": "string"
  },
  "admit_orders": {
    "drugs": [{"drug": "...", "dose": "...", "route": "...", "freq": "..."}],
    "monitoring": ["Continuous ECG", "BP q15min for 2h then q1h"],
    "diet": "NPO / clear liquids / cardiac diet",
    "access": "Peripheral 18G left forearm / Central line",
    "special": "string or null"
  },
  "icd_codes": [{"code": "I21.9", "description": "Acute STEMI"}]
}"""

SYSTEM_PROMPT_STEMI = """You are a cardiology STEMI fast-track admission assistant for Indian cath labs.
Generate a paperwork-light admission note optimised for door-to-cath time. Apollo Delhi-style protocol.

Rules:
- Output ONLY valid JSON. No markdown.
- This is an emergency STEMI presentation. Provisional dx defaults to "Acute STEMI" with ICD I21.9 unless transcript indicates otherwise (NSTEMI → I21.4, unstable angina → I20.0).
- Admit orders MUST pre-populate the standard STEMI protocol unless contraindicated in the dictation:
  drugs: Aspirin 325mg loading PO/chewed, Clopidogrel 600mg loading PO (or Ticagrelor 180mg), Atorvastatin 80mg PO, unfractionated heparin bolus, GTN infusion as needed.
  monitoring: Continuous ECG, BP q5min, SpO2 continuous.
  diet: NPO.
  access: Bilateral large-bore IV (16G or 18G).
  special: "Activate cath lab. Door-to-balloon target < 90 min."
- Keep HOPI and examination brief — just what's clinically essential to get to cath lab.
- If a field cannot be determined, use null (never invent vitals/findings).

Output format:
{
  "chief_complaint": "string (e.g. chest pain, duration)",
  "hopi": "string (concise)",
  "examination": "string (cardiac focus)",
  "provisional_dx": "string",
  "soap": {
    "subjective": "string",
    "objective": "string",
    "assessment": "string",
    "plan": "string"
  },
  "admit_orders": {
    "drugs": [{"drug": "...", "dose": "...", "route": "...", "freq": "STAT/once"}],
    "monitoring": [...],
    "diet": "NPO",
    "access": "...",
    "special": "Activate cath lab. Door-to-balloon target < 90 min."
  },
  "icd_codes": [{"code": "I21.9", "description": "Acute STEMI"}]
}"""


async def generate_admission_note(transcript: str, clinical_context: dict, mode: str = "standard") -> dict:
    """
    Extract full IPD admission note from a doctor's dictation.
    PII firewall: only age/gender/conditions/meds/allergies from clinical_context are sent.
    mode='stemi_fast_track' loads STEMI protocol pre-fills.
    """
    patient_ctx = build_patient_context(clinical_context or {})
    system = SYSTEM_PROMPT_STEMI if mode == "stemi_fast_track" else SYSTEM_PROMPT_STANDARD
    user_content = "\n\n".join(filter(None, [patient_ctx, f"Admission dictation:\n{transcript}"]))

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
        )
        return json.loads(response.choices[0].message.content)
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Admission note generation unavailable: {e.message}")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="Admission note generation returned invalid response — please try again")
    except Exception:
        raise HTTPException(status_code=502, detail="Admission note generation failed — check OpenAI API key and try again")
