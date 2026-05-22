from openai import OpenAI, APIError
from fastapi import HTTPException
import json

from config import settings

client = OpenAI(api_key=settings.openai_api_key)

TEMPLATE_LABELS = {
    "chest_xray":    "Chest X-Ray",
    "ct_cardiac":    "CT Cardiac (Coronary Angiogram / Calcium Score)",
    "ct_pa":         "CT Pulmonary Angiography",
    "mri_heart":     "Cardiac MRI",
    "lipid_profile": "Lipid Profile (cardiac risk assessment)",
    "hba1c":         "HbA1c (glycated haemoglobin — diabetes / cardiac risk)",
}


async def generate_radiology_impression(template: str, findings: dict) -> dict:
    """
    Generate a radiology impression from structured findings.
    Only findings (no patient name/PII) are sent to the LLM.
    """
    prompt = (
        f"You are a cardiac radiologist. Generate a concise, structured radiology impression "
        f"for a {TEMPLATE_LABELS.get(template, template)} report.\n\n"
        f"Findings:\n{json.dumps(findings, indent=2)}\n\n"
        f"Write a 3–5 sentence impression suitable for a cardiology referral. "
        f"Include key positive and relevant negative findings. Use standard radiology terminology."
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
        )
        return {"impression": resp.choices[0].message.content.strip()}
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"AI impression generation failed: {e.message}")
    except Exception:
        raise HTTPException(status_code=502, detail="Impression generation failed — check OpenAI API key and try again")
