from openai import OpenAI, APIError
from fastapi import HTTPException
import os, json

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

TEMPLATE_LABELS = {
    "echo": "Transthoracic Echocardiogram (TTE)",
    "cath": "Coronary Angiogram / Cardiac Catheterization",
    "stress_test": "Stress Test (TMT / Exercise ECG)",
    "holter": "Holter Monitor Report",
}

SYSTEM_PROMPT = """You are a senior cardiologist writing structured cardiac investigation reports for Indian hospitals.

Given the template type and structured findings, generate:
1. A concise clinical impression (2-5 sentences, professional cardiology language)
2. Relevant ICD-10 codes (max 4)

Rules:
- Output ONLY valid JSON. No explanation, no markdown.
- Impression must be clinically precise and actionable.
- ICD-10 codes must be standard and accurate.
- If findings are insufficient, state so in impression.
- Use Indian clinical terminology where appropriate.

Output format:
{
  "impression": "string",
  "icd_codes": [{"code": "I25.10", "description": "Coronary artery disease, native vessel"}]
}"""


def _summarise_findings(template: str, findings: dict) -> str:
    """Convert structured findings dict to a readable summary for the LLM."""
    lines = [f"Report type: {TEMPLATE_LABELS.get(template, template)}"]
    for key, val in findings.items():
        if val is None or val == "" or val == []:
            continue
        label = key.replace("_", " ").title()
        if isinstance(val, list):
            lines.append(f"{label}: {', '.join(str(v) for v in val)}")
        else:
            lines.append(f"{label}: {val}")
    return "\n".join(lines)


async def generate_echo_impression(template: str, findings: dict, clinical: dict | None = None) -> dict:
    """
    Generate impression + ICD codes from structured echo/cath/stress/holter findings.
    Only findings (no patient name/PII) are sent to the LLM.
    """
    findings_text = _summarise_findings(template, findings)
    patient_ctx = ""
    if clinical:
        parts = []
        if clinical.get("age") and clinical.get("gender_code"):
            parts.append(f"Patient: {clinical['age']}{clinical['gender_code']}")
        if clinical.get("conditions"):
            parts.append(f"K/c/o: {', '.join(clinical['conditions'])}")
        if parts:
            patient_ctx = "\n".join(parts) + "\n\n"

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{patient_ctx}Findings:\n{findings_text}"},
            ],
            temperature=0.1,
        )
        return json.loads(response.choices[0].message.content)
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Impression generation service unavailable: {e.message}")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="Impression generation returned invalid response — please try again")
    except Exception:
        raise HTTPException(status_code=502, detail="Impression generation failed — check OpenAI API key and try again")
