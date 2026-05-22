"""
Prescription extraction from doctor dictation.

GPT-4o reads the doctor's spoken note and returns:
- diagnosis        (free-text indication)
- drugs            (list of {drug, dose, freq, duration, instructions})
- notes            (clinical notes / dietary / follow-up)

Drug names should match the canonical Indian cardiac drug catalog where
possible. Frequencies and durations must be from the standard pick-lists used
by the prescription form. The validator strips invalid drug names through but
canonicalises freq/duration.

PII firewall: only the dictation transcript and (optionally) clinical context
are sent to the LLM — never names, phone numbers, or ABHA IDs.
"""
from openai import OpenAI, APIError
from fastapi import HTTPException
import json

from config import settings

client = OpenAI(api_key=settings.openai_api_key)

# ──────────────────────────────────────────────────────────────────────
# Canonical catalogue — must match frontend DRUG_DB names exactly.
# ──────────────────────────────────────────────────────────────────────

CARDIAC_DRUGS = [
    # Antiplatelets
    "Aspirin", "Aspirin 150mg", "Clopidogrel", "Ticagrelor", "Ticagrelor 60mg", "Prasugrel",
    # Anticoagulants
    "Warfarin", "Rivaroxaban", "Rivaroxaban 2.5mg", "Apixaban", "Dabigatran", "Enoxaparin",
    # Statins
    "Atorvastatin", "Atorvastatin 80mg", "Rosuvastatin", "Rosuvastatin 20mg", "Pitavastatin", "Ezetimibe",
    # Beta-blockers
    "Metoprolol succinate", "Metoprolol succinate 50mg", "Metoprolol tartrate",
    "Carvedilol", "Carvedilol 12.5mg", "Bisoprolol", "Atenolol",
    # ACE Inhibitors / ARBs
    "Ramipril", "Ramipril 10mg", "Enalapril", "Lisinopril", "Perindopril",
    "Telmisartan", "Telmisartan 80mg", "Losartan", "Valsartan",
    # Diuretics
    "Furosemide", "Furosemide 80mg", "Torsemide", "Spironolactone", "Eplerenone", "Hydrochlorothiazide",
    # Nitrates
    "Isosorbide mononitrate", "Isosorbide mononitrate 60mg", "Isosorbide dinitrate", "Nitroglycerin sublingual",
    # CCBs
    "Amlodipine", "Amlodipine 10mg", "Diltiazem", "Diltiazem SR", "Verapamil",
    # Antiarrhythmics
    "Amiodarone", "Amiodarone 100mg", "Digoxin", "Digoxin 0.125mg", "Ivabradine",
    # HF specifics
    "Sacubitril / Valsartan", "Sacubitril / Valsartan 24/26mg", "Dapagliflozin", "Empagliflozin",
    # Adjuncts
    "Ranolazine", "Colchicine", "Pantoprazole",
]

VALID_FREQS = [
    "OD", "BD", "TDS", "QID", "HS", "SOS", "Weekly",
    "OD (morning)", "BD (SC)", "OD with dinner", "OD (dose per INR)",
]

VALID_DURATIONS = [
    "7 days", "14 days", "1 month", "2 months", "3 months",
    "6 months", "1 year", "Lifelong",
]


# ──────────────────────────────────────────────────────────────────────
# Prompt
# ──────────────────────────────────────────────────────────────────────

def _build_system_prompt() -> str:
    return f"""You are a senior cardiologist's documentation assistant. Convert the doctor's free-text dictation into a structured cardiac prescription.

OUTPUT EXACTLY THIS JSON SHAPE — no markdown, no commentary:
{{
  "diagnosis": "string — the clinical indication / working diagnosis the prescription is for",
  "drugs": [
    {{
      "drug": "string — drug name",
      "dose": "string — e.g. 75mg, 40mg, 2.5mg",
      "freq": "string — one of: {' | '.join(VALID_FREQS)}",
      "duration": "string — one of: {' | '.join(VALID_DURATIONS)} (use empty string if not stated)",
      "instructions": "string — short note e.g. 'take after food', 'before breakfast' (empty if none)"
    }}
  ],
  "notes": "string — clinical / dietary / follow-up notes"
}}

RULES:
- DRUG NAMES: prefer one of the canonical names from this list (case-sensitive):
  {', '.join(CARDIAC_DRUGS)}
  If the doctor uses a brand name (e.g. "Ecospirin"), translate to the generic ("Aspirin"). If the doctor mentions a strength variant in the list (e.g. "Aspirin 150mg"), use that exact entry; otherwise use the base name and put the strength in "dose".
- FREQUENCY: must be one of {VALID_FREQS}. Map spoken forms — "once daily" → "OD", "twice daily" → "BD", "thrice" → "TDS", "four times" → "QID", "at bedtime" / "night" → "HS", "as needed" / "SOS" → "SOS".
- DURATION: must be one of {VALID_DURATIONS} or empty string. "continue lifelong" / "long term" → "Lifelong".
- DOSE: include the unit (mg, mcg, mL, IU). Convert spoken numbers ("seventy-five") to digits ("75mg").
- If the doctor said "no instructions" or similar, return empty string for instructions.
- If a field cannot be determined, use an empty string (NOT null, NOT omit).
- If no drugs are dictated, return drugs = [].
- DO NOT invent drugs or diagnoses the doctor did not mention."""


def _build_user_message(transcript: str, clinical: dict | None) -> str:
    parts: list[str] = []
    if clinical:
        ctx = []
        if clinical.get("age") and clinical.get("gender_code"):
            ctx.append(f"Patient: {clinical['age']}{clinical['gender_code']}")
        if clinical.get("conditions"):
            ctx.append(f"K/c/o: {', '.join(clinical['conditions'])}")
        if clinical.get("allergies"):
            ctx.append(f"Allergies: {', '.join(clinical['allergies'])}")
        if clinical.get("medications"):
            meds = ", ".join(
                f"{m.get('drug','')} {m.get('dose','')}".strip()
                for m in clinical["medications"]
            )
            if meds:
                ctx.append(f"Background medications: {meds}")
        if ctx:
            parts.append("Patient clinical context (do not include in prescription unless re-prescribed):\n" + "\n".join(ctx))

    parts.append("Doctor's dictation:\n" + (transcript or "").strip())
    return "\n\n".join(parts)


# ──────────────────────────────────────────────────────────────────────
# Validation — keep what's safe, drop / canonicalise the rest
# ──────────────────────────────────────────────────────────────────────

_FREQ_LOOKUP = {f.lower(): f for f in VALID_FREQS}
_DUR_LOOKUP = {d.lower(): d for d in VALID_DURATIONS}


def _validate_drug(raw: dict) -> dict | None:
    drug = (raw.get("drug") or "").strip()
    if not drug:
        return None
    dose = (raw.get("dose") or "").strip()
    freq = (raw.get("freq") or "").strip()
    duration = (raw.get("duration") or "").strip()
    instructions = (raw.get("instructions") or "").strip()

    # Canonicalise freq — exact match first, then case-insensitive
    if freq:
        if freq not in VALID_FREQS:
            freq = _FREQ_LOOKUP.get(freq.lower(), "OD")  # default to OD when invalid
    else:
        freq = "OD"

    # Canonicalise duration — empty string allowed
    if duration and duration not in VALID_DURATIONS:
        duration = _DUR_LOOKUP.get(duration.lower(), "")

    return {
        "drug": drug,
        "dose": dose,
        "freq": freq,
        "duration": duration,
        "instructions": instructions,
    }


def _validate_output(raw: dict) -> dict:
    drugs = []
    for d in raw.get("drugs") or []:
        if isinstance(d, dict):
            cleaned = _validate_drug(d)
            if cleaned:
                drugs.append(cleaned)
    return {
        "diagnosis": (raw.get("diagnosis") or "").strip(),
        "drugs": drugs,
        "notes": (raw.get("notes") or "").strip(),
    }


# ──────────────────────────────────────────────────────────────────────
# Public entry
# ──────────────────────────────────────────────────────────────────────

async def generate_prescription_from_dictation(
    transcript: str,
    clinical: dict | None = None,
) -> dict:
    """Return {diagnosis, drugs[], notes} extracted from the doctor's dictation."""
    if not transcript or not transcript.strip():
        raise HTTPException(400, "Nothing to generate from — dictate the prescription first")

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {"role": "user", "content": _build_user_message(transcript, clinical)},
            ],
            temperature=0.1,
        )
        data = json.loads(response.choices[0].message.content)
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Generation service unavailable: {e.message}")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="Generation returned invalid response — please try again")
    except Exception:
        raise HTTPException(status_code=502, detail="Generation failed — check OpenAI API key and try again")

    return _validate_output(data)
