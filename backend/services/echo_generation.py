"""
Echo / Cath / Stress / Holter — template-aware AI generation.

The doctor dictates the report. GPT-4o reads the dictation plus any structured
fields already entered, then returns:
  - `findings`: structured field values for the active template's form
  - `impression`: a polished 2-5 sentence clinical impression
  - `icd_codes`: 0-4 ICD-10 codes

Each template has its own field schema (with exact dropdown options). The
system prompt is built dynamically from the schema so the LLM can only output
allowed values; an additional post-validation step drops any select value that
isn't in the allowed list, in case the model deviates.

No patient PII (name/phone/ABHA/address) is ever sent to the LLM.
"""
from openai import OpenAI, APIError
from fastapi import HTTPException
import json

from config import settings

client = OpenAI(api_key=settings.openai_api_key)

# ──────────────────────────────────────────────────────────────────────
# Field schemas — must match the dropdown options in
# frontend/app/dashboard/echo/[reportId]/page.tsx exactly.
# ──────────────────────────────────────────────────────────────────────

_SEVERITY = ["Normal", "Mildly dilated", "Moderately dilated", "Severely dilated"]
_RV_FUNCTION = ["Normal", "Mildly reduced", "Moderately reduced", "Severely reduced"]
_REGURG = ["None", "Trivial (1+)", "Mild (2+)", "Moderate (3+)", "Severe (4+)"]
_STENOSIS_YN = ["No", "Yes — mild", "Yes — moderate", "Yes — severe"]
_TIMI = ["0", "1", "2", "3"]
_STENOSIS = ["Normal", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "95%", "99%", "100% (total occlusion)"]

ECHO_SCHEMA = [
    {"key": "lv_ef",           "type": "number", "unit": "%",   "label": "LV ejection fraction (Simpson biplane)"},
    {"key": "lv_hypertrophy",  "type": "select", "options": ["None", "Mild", "Moderate", "Severe"]},
    {"key": "lvedd",           "type": "number", "unit": "mm",  "label": "LV end-diastolic dimension"},
    {"key": "lvesd",           "type": "number", "unit": "mm",  "label": "LV end-systolic dimension"},
    {"key": "rwma",            "type": "text",   "label": "Regional wall motion abnormality — free-text territory"},
    {"key": "rv_size",         "type": "select", "options": _SEVERITY},
    {"key": "rv_function",     "type": "select", "options": _RV_FUNCTION},
    {"key": "mr_grade",        "type": "select", "options": _REGURG, "label": "Mitral regurgitation"},
    {"key": "ms",              "type": "select", "options": _STENOSIS_YN, "label": "Mitral stenosis"},
    {"key": "mva",             "type": "number", "unit": "cm²", "label": "Mitral valve area (only if MS present)"},
    {"key": "ar_grade",        "type": "select", "options": _REGURG, "label": "Aortic regurgitation"},
    {"key": "as",              "type": "select", "options": _STENOSIS_YN, "label": "Aortic stenosis"},
    {"key": "av_gradient",     "type": "number", "unit": "mmHg","label": "Mean aortic valve gradient (only if AS)"},
    {"key": "tr_grade",        "type": "select", "options": _REGURG, "label": "Tricuspid regurgitation"},
    {"key": "rvsp",            "type": "number", "unit": "mmHg","label": "Estimated RVSP"},
    {"key": "la_size",         "type": "select", "options": _SEVERITY, "label": "Left atrium"},
    {"key": "ra_size",         "type": "select", "options": _SEVERITY, "label": "Right atrium"},
    {"key": "pericardium",     "type": "select", "options": ["Normal", "Trivial effusion", "Small effusion", "Moderate effusion", "Large effusion", "Constrictive features"]},
    {"key": "ivc",             "type": "select", "options": ["Normal", "Dilated (no collapse)", "Dilated (partial collapse)"]},
]

CATH_SCHEMA = [
    {"key": "access",          "type": "select", "options": ["Radial (right)", "Radial (left)", "Femoral (right)", "Femoral (left)"]},
    {"key": "catheter_fr",     "type": "select", "options": ["5F", "6F", "7F", "8F"]},
    {"key": "fluoro_time",     "type": "number", "unit": "min", "label": "Fluoroscopy time"},
    {"key": "contrast_vol",    "type": "number", "unit": "mL"},
    {"key": "dominance",       "type": "select", "options": ["Right dominant", "Left dominant", "Co-dominant"]},

    {"key": "lmca",            "type": "select", "options": ["Normal"] + _STENOSIS[3:], "label": "Left main stenosis"},
    {"key": "lad_prox",        "type": "select", "options": _STENOSIS, "label": "LAD proximal stenosis"},
    {"key": "lad_mid",         "type": "select", "options": _STENOSIS, "label": "LAD mid stenosis"},
    {"key": "lad_dist",        "type": "select", "options": _STENOSIS, "label": "LAD distal stenosis"},
    {"key": "lad_timi",        "type": "select", "options": _TIMI, "label": "LAD TIMI pre"},
    {"key": "lad_timi_post",   "type": "select", "options": _TIMI, "label": "LAD TIMI post (after PCI)"},
    {"key": "lcx_prox",        "type": "select", "options": _STENOSIS, "label": "LCX proximal stenosis"},
    {"key": "lcx_om1",         "type": "select", "options": _STENOSIS, "label": "LCX OM1 stenosis"},
    {"key": "lcx_om2",         "type": "select", "options": _STENOSIS, "label": "LCX OM2 stenosis"},
    {"key": "lcx_timi",        "type": "select", "options": _TIMI, "label": "LCX TIMI pre"},
    {"key": "lcx_timi_post",   "type": "select", "options": _TIMI, "label": "LCX TIMI post"},
    {"key": "rca_prox",        "type": "select", "options": _STENOSIS, "label": "RCA proximal stenosis"},
    {"key": "rca_mid",         "type": "select", "options": _STENOSIS, "label": "RCA mid stenosis"},
    {"key": "rca_dist",        "type": "select", "options": _STENOSIS, "label": "RCA distal stenosis"},
    {"key": "rca_timi",        "type": "select", "options": _TIMI, "label": "RCA TIMI pre"},
    {"key": "rca_timi_post",   "type": "select", "options": _TIMI, "label": "RCA TIMI post"},

    {"key": "lvedp",           "type": "number", "unit": "mmHg"},
    {"key": "aortic_bp",       "type": "text",   "label": "Aortic pressure systolic/diastolic e.g. 130/80"},
    {"key": "lv_ef",           "type": "number", "unit": "%",   "label": "LV EF on ventriculogram"},

    {"key": "recommendation",  "type": "select", "options": ["Medical management", "PCI — single vessel", "PCI — multi vessel", "CABG", "CABG + valve surgery", "Palliative"]},
    {
        "key": "stents",
        "type": "json_array",
        "label": (
            "Stents deployed — JSON array of objects, one per stent. "
            "Each object: {\"vessel\": \"LAD proximal\", \"brand\": \"Xience (Abbott)\", "
            "\"dia\": \"3.0 mm\", \"len\": \"28 mm\", \"post_dilation\": \"No\"}. "
            "brand must be one of: Xience (Abbott) | Resolute Onyx (Medtronic) | Synergy (BSci) | "
            "BioFreedom (Biosensors) | Ultimaster (Terumo) | Supraflex (Sahajanand) | "
            "Coroflex ISAR (B.Braun) | Other. "
            "dia must be one of: 2.25 mm | 2.5 mm | 2.75 mm | 3.0 mm | 3.25 mm | 3.5 mm | 3.75 mm | 4.0 mm. "
            "len must be one of: 8 mm | 12 mm | 14 mm | 16 mm | 18 mm | 20 mm | 23 mm | 24 mm | 28 mm | 32 mm | 38 mm. "
            "post_dilation must be one of: No | Yes — NC balloon | Yes — cutting balloon. "
            "Only include stents the doctor explicitly mentioned. Omit field if no stents deployed."
        ),
    },
    {"key": "complications",   "type": "multiselect", "options": ["Nil", "Coronary dissection", "No-reflow / slow-flow", "Perforation", "Access site haematoma", "Contrast reaction", "Hypotension requiring support", "Arrhythmia", "Cardiac arrest", "Stroke"]},
]

STRESS_SCHEMA = [
    {"key": "protocol",        "type": "select", "options": ["Bruce", "Modified Bruce", "Naughton", "Pharmacological (Dobutamine)", "Pharmacological (Adenosine)"]},
    {"key": "duration",        "type": "text",   "label": "Duration completed, e.g. 8:30 min"},
    {"key": "stop_reason",     "type": "select", "options": ["Target HR achieved", "Fatigue", "Angina", "Dyspnoea", "ST changes", "BP drop", "Arrhythmia", "Patient request"]},
    {"key": "baseline_hr",     "type": "number", "unit": "bpm"},
    {"key": "peak_hr",         "type": "number", "unit": "bpm"},
    {"key": "baseline_bp",     "type": "text",   "label": "Baseline BP, e.g. 130/80"},
    {"key": "peak_bp",         "type": "text",   "label": "Peak BP, e.g. 180/90"},
    {"key": "st_changes",      "type": "select", "options": ["No ST changes", "ST depression", "ST elevation", "LBBB", "RBBB", "Non-specific"]},
    {"key": "st_depth",        "type": "number", "unit": "mm",  "label": "ST depth (only if ST changes)"},
    {"key": "st_leads",        "type": "text",   "label": "Leads affected, e.g. V4–V6, II, aVF"},
    {"key": "symptoms",        "type": "select", "options": ["None", "Chest pain (typical)", "Chest pain (atypical)", "Dyspnoea", "Palpitations", "Presyncope"]},
    {"key": "result",          "type": "select", "options": ["Negative — no evidence of ischaemia", "Positive — evidence of ischaemia", "Non-diagnostic — inadequate HR", "Non-diagnostic — arrhythmia", "Indeterminate"]},
    {"key": "duke_score",      "type": "text",   "label": "Duke Treadmill Score, e.g. +5 or -11"},
]

HOLTER_SCHEMA = [
    {"key": "duration",        "type": "select", "options": ["24 hours", "48 hours", "7 days", "14 days"]},
    {"key": "quality",         "type": "select", "options": ["Good — full recording", "Adequate — minor artefact", "Poor — significant artefact"]},
    {"key": "dominant_rhythm", "type": "select", "options": ["Sinus rhythm", "Atrial fibrillation", "Atrial flutter", "Ectopic atrial rhythm", "Paced rhythm"]},
    {"key": "af_burden",       "type": "number", "unit": "%",   "label": "AF burden (only if AF)"},
    {"key": "hr_min",          "type": "number", "unit": "bpm"},
    {"key": "hr_max",          "type": "number", "unit": "bpm"},
    {"key": "hr_mean",         "type": "number", "unit": "bpm"},
    {"key": "vpc_total",       "type": "number", "label": "Total VPCs (integer count)"},
    {"key": "vpc_burden",      "type": "number", "unit": "%"},
    {"key": "couplets",        "type": "number", "label": "Couplets count"},
    {"key": "vt_runs",         "type": "select", "options": ["None", "NSVT (< 30s)", "Sustained VT (≥ 30s)"]},
    {"key": "svt",             "type": "select", "options": ["None", "Isolated SVPCs", "SVT runs"]},
    {"key": "longest_pause",   "type": "number", "unit": "sec"},
    {"key": "av_block",        "type": "select", "options": ["None", "1st degree AV block", "2nd degree — Mobitz I (Wenckebach)", "2nd degree — Mobitz II", "3rd degree (complete heart block)"]},
    {"key": "bbb",             "type": "select", "options": ["None", "LBBB (persistent)", "RBBB (persistent)", "LBBB (rate-related)", "RBBB (rate-related)"]},
]

TEMPLATES: dict[str, dict] = {
    "echo":        {"label": "Transthoracic Echocardiogram (TTE)",       "schema": ECHO_SCHEMA},
    "cath":        {"label": "Coronary Angiogram / Cath Lab",            "schema": CATH_SCHEMA},
    "stress_test": {"label": "Stress Test (TMT / Exercise ECG)",         "schema": STRESS_SCHEMA},
    "holter":      {"label": "Holter Monitor Report",                    "schema": HOLTER_SCHEMA},
}


# ──────────────────────────────────────────────────────────────────────
# Prompt construction
# ──────────────────────────────────────────────────────────────────────

def _format_field(field: dict) -> str:
    """Render one field as a single line for the LLM prompt."""
    parts = [f"- {field['key']}"]
    t = field["type"]
    if t == "select":
        parts.append(f"(select — exactly one of: {' | '.join(field['options'])})")
    elif t == "multiselect":
        parts.append(f"(multi-select — comma-separated, each from: {' | '.join(field['options'])})")
    elif t == "number":
        unit = f" {field['unit']}" if field.get("unit") else ""
        parts.append(f"(number{unit})")
    elif t == "json_array":
        parts.append("(JSON array string)")
    else:
        parts.append("(text)")
    if field.get("label"):
        parts.append(f"— {field['label']}")
    return " ".join(parts)


def _build_system_prompt(template: str) -> str:
    meta = TEMPLATES[template]
    field_lines = "\n".join(_format_field(f) for f in meta["schema"])
    return f"""You are a senior cardiologist filling in a structured {meta['label']} report from the doctor's dictation.

Your job is to:
1. EXTRACT structured field values from the dictation.
2. Generate a polished 2-5 sentence clinical impression.
3. Suggest 0-4 ICD-10 codes that match the findings.

FIELDS for this {template} report:
{field_lines}

EXTRACTION RULES — read carefully:
- Only fill a field if the doctor explicitly stated its value. NEVER guess or infer.
- If the doctor did not mention a field, OMIT it from the output (do not output null or empty string).
- For "select" fields, the value MUST be one of the listed options, copied VERBATIM (including punctuation, em-dashes, parentheses, units). If the doctor's phrasing doesn't clearly map to one of the listed options, OMIT the field.
- For "multi-select" fields, return a comma-separated string of one or more options. If the doctor says "no complications" or "nil", return "Nil".
- For "number" fields, return the numeric value only (no units, no % sign — the form attaches units). E.g. "35" not "35%".
- For "text" fields, return the doctor's phrasing concisely.
- Convert spoken numbers to digits ("thirty-five" → "35").
- Convert spoken percentages ("ninety percent" → "90%") only if the field is a stenosis select with "%" options; otherwise plain number.
- "Mildly dilated" / "moderately dilated" / etc. must match the LV/RV/LA/RA size options exactly.
- Regurgitation grades: "mild" → "Mild (2+)", "moderate" → "Moderate (3+)", "severe" → "Severe (4+)", "trivial" / "trace" → "Trivial (1+)".

IMPRESSION RULES:
- 2-5 sentences in professional cardiology language.
- Reflect what the doctor dictated, do not add findings not in the dictation.
- If a prior dictated impression is provided, refine it lightly rather than rewriting.

ICD-10 RULES:
- Use standard ICD-10 codes accurate to the diagnoses.
- Max 4 codes.

OUTPUT FORMAT — return ONLY valid JSON. No markdown, no commentary:
{{
  "findings": {{ <field_key>: <value>, ... }},
  "impression": "string",
  "icd_codes": [{{"code": "I25.5", "description": "Ischaemic cardiomyopathy"}}]
}}"""


def _build_user_message(
    transcript: str,
    existing_findings: dict | None,
    clinical: dict | None,
) -> str:
    sections: list[str] = []

    if clinical:
        ctx = []
        if clinical.get("age") and clinical.get("gender_code"):
            ctx.append(f"Patient: {clinical['age']}{clinical['gender_code']}")
        if clinical.get("conditions"):
            ctx.append(f"K/c/o: {', '.join(clinical['conditions'])}")
        if ctx:
            sections.append("Patient clinical context:\n" + "\n".join(ctx))

    # Already-entered fields — tell the LLM not to overwrite unless dictation conflicts.
    if existing_findings:
        non_empty = {k: v for k, v in existing_findings.items() if v not in (None, "", [])}
        if non_empty:
            sections.append(
                "Already-entered fields (do NOT overwrite unless the dictation clearly states a different value):\n"
                + json.dumps(non_empty, indent=2)
            )

    sections.append("Doctor's dictation / impression:\n" + (transcript or "").strip())
    return "\n\n".join(sections)


# ──────────────────────────────────────────────────────────────────────
# Output validation
# ──────────────────────────────────────────────────────────────────────

_STENT_BRANDS = {"Xience (Abbott)", "Resolute Onyx (Medtronic)", "Synergy (BSci)", "BioFreedom (Biosensors)", "Ultimaster (Terumo)", "Supraflex (Sahajanand)", "Coroflex ISAR (B.Braun)", "Other"}
_STENT_DIAS   = {"2.25 mm", "2.5 mm", "2.75 mm", "3.0 mm", "3.25 mm", "3.5 mm", "3.75 mm", "4.0 mm"}
_STENT_LENS   = {"8 mm", "12 mm", "14 mm", "16 mm", "18 mm", "20 mm", "23 mm", "24 mm", "28 mm", "32 mm", "38 mm"}
_STENT_POSTDIL = {"No", "Yes — NC balloon", "Yes — cutting balloon"}

def _validate_stent(s: dict) -> dict | None:
    """Validate one stent object; return None if malformed."""
    if not isinstance(s, dict):
        return None
    out: dict = {}
    if isinstance(s.get("vessel"), str) and s["vessel"].strip():
        out["vessel"] = s["vessel"].strip()
    if s.get("brand") in _STENT_BRANDS:
        out["brand"] = s["brand"]
    if s.get("dia") in _STENT_DIAS:
        out["dia"] = s["dia"]
    if s.get("len") in _STENT_LENS:
        out["len"] = s["len"]
    if s.get("post_dilation") in _STENT_POSTDIL:
        out["post_dilation"] = s["post_dilation"]
    return out if out else None

def _validate_findings(template: str, raw: dict) -> dict:
    """Drop any value that violates its field's type/options."""
    import re as _re, json as _json
    schema = {f["key"]: f for f in TEMPLATES[template]["schema"]}
    out: dict = {}
    for key, value in (raw or {}).items():
        spec = schema.get(key)
        if not spec or value in (None, "", []):
            continue
        t = spec["type"]
        if t == "select":
            if isinstance(value, str) and value in spec["options"]:
                out[key] = value
        elif t == "multiselect":
            if not isinstance(value, str):
                continue
            picked = [v.strip() for v in value.split(",") if v.strip()]
            kept = [v for v in picked if v in spec["options"]]
            if kept:
                out[key] = ", ".join(kept)
        elif t == "number":
            if isinstance(value, (int, float)):
                out[key] = str(value)
            elif isinstance(value, str):
                cleaned = value.strip().rstrip("%").strip()
                m = _re.search(r"-?\d+(?:\.\d+)?", cleaned)
                if m:
                    out[key] = m.group(0)
        elif t == "json_array":
            try:
                arr = _json.loads(value) if isinstance(value, str) else value
                if isinstance(arr, list):
                    validated = [v for s in arr if (v := _validate_stent(s)) is not None]
                    if validated:
                        out[key] = _json.dumps(validated)
            except (TypeError, ValueError):
                pass
        else:  # text
            if isinstance(value, str) and value.strip():
                out[key] = value.strip()
    return out


# ──────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────

async def generate_echo_report(
    template: str,
    findings: dict | None,
    clinical: dict | None,
    impression: str | None,
) -> dict:
    """
    Run GPT-4o over the doctor's dictation and any existing structured fields,
    returning extracted findings + polished impression + ICD-10 codes.

    Returns: { "findings": {...validated...}, "impression": str, "icd_codes": [...] }
    """
    if template not in TEMPLATES:
        raise HTTPException(400, f"Unknown template: {template}")

    transcript = (impression or "").strip()
    if not transcript and not findings:
        raise HTTPException(400, "Nothing to generate from — dictate the report or fill in findings first")

    system_prompt = _build_system_prompt(template)
    user_content = _build_user_message(transcript, findings, clinical)

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
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

    return {
        "findings":  _validate_findings(template, data.get("findings") or {}),
        "impression": (data.get("impression") or "").strip(),
        "icd_codes":  data.get("icd_codes") or [],
    }


# Backwards-compatible alias for the older import name.
generate_echo_impression = generate_echo_report
