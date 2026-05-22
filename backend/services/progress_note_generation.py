"""Generate a daily IPD progress (ward-round) note for an active admission.

Inputs (all PII-safe): admission context (CC/HOPI/Dx/orders), latest vitals,
recent prior progress notes. The model drafts a short S/O/A/P specifically for
*today* — what changed since yesterday, current status, plan.
"""
from openai import OpenAI, APIError
from fastapi import HTTPException
import json

from config import settings

from services.note_generation import build_patient_context

client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a cardiology ward-round documentation assistant for Indian hospitals.
Generate a SHORT daily progress note for an inpatient cardiology ward round.

Rules:
- Output ONLY valid JSON. No markdown.
- A progress note is NOT a full SOAP — it's a brief update: clinical status today, assessment of how the patient is trending, and the plan for the next 24h.
- Be concise. 1-3 sentences per field. Bedside readability matters.
- Reference what changed since the prior note (e.g. "vitals improved", "still requires inotrope support", "weaned off ventilator").
- If a field cannot be determined, use null. Never invent vitals or findings.

Output format:
{
  "status_text": "Clinical status today — short, factual, e.g. 'Conscious, oriented. Haemodynamically stable on tapering noradrenaline. Tolerating oral feeds.'",
  "assessment": "How the patient is trending vs. admission and prior note — short.",
  "plan": "Next 24h: medication changes, monitoring, planned procedures, transfer/discharge consideration."
}"""


def _format_admission(adm: dict) -> str:
    lines = ["--- Admission context ---"]
    if adm.get("admitted_at"): lines.append(f"Admitted: {adm['admitted_at']}")
    if adm.get("tier_name"): lines.append(f"Bed tier: {adm['tier_name']}")
    if adm.get("provisional_dx"): lines.append(f"Provisional Dx: {adm['provisional_dx']}")
    if adm.get("chief_complaint"): lines.append(f"CC: {adm['chief_complaint']}")
    if adm.get("admit_orders"):
        orders = adm["admit_orders"]
        if orders.get("drugs"):
            meds = ", ".join(f"{d.get('drug','')} {d.get('dose','')}".strip() for d in orders["drugs"][:6])
            lines.append(f"Admit meds: {meds}")
        if orders.get("special"): lines.append(f"Special: {orders['special']}")
    return "\n".join(lines)


def _format_vitals(vitals: dict | None) -> str:
    if not vitals: return ""
    parts = []
    for k in ("bp", "hr", "spo2", "temp", "rr"):
        v = vitals.get(k)
        if v is not None: parts.append(f"{k.upper()} {v}")
    if vitals.get("drips"):
        for d in vitals["drips"]:
            parts.append(f"{d.get('name','')} {d.get('rate','')}{d.get('unit','')}".strip())
    return "Latest vitals: " + ", ".join(parts) if parts else ""


def _format_prior_notes(notes: list[dict]) -> str:
    if not notes: return ""
    lines = ["--- Prior progress notes (most recent first) ---"]
    for n in notes[:5]:
        when = n.get("created_at") or ""
        lines.append(f"[{when}]")
        if n.get("status_text"): lines.append(f"S: {n['status_text']}")
        if n.get("assessment"):  lines.append(f"A: {n['assessment']}")
        if n.get("plan"):        lines.append(f"P: {n['plan']}")
    return "\n".join(lines)


async def generate_progress_note(
    admission: dict,
    clinical_context: dict,
    latest_vitals: dict | None,
    prior_notes: list[dict],
) -> dict:
    """Returns {status_text, assessment, plan}. PII-safe inputs only."""
    patient_ctx = build_patient_context(clinical_context or {})
    user_content = "\n\n".join(filter(None, [
        patient_ctx,
        _format_admission(admission),
        _format_vitals(latest_vitals),
        _format_prior_notes(prior_notes),
        "Draft today's progress note.",
    ]))

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
        )
        return json.loads(response.choices[0].message.content)
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Progress note generation unavailable: {e.message}")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="Progress note generation returned invalid response — please try again")
    except Exception:
        raise HTTPException(status_code=502, detail="Progress note generation failed — check OpenAI API key and try again")
