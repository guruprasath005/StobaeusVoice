"""Clinical alerts engine — drug interaction + cardiac contraindication checks.

Pure stateless function: check_alerts(meds, conditions, *, condition_only=False).
No DB access — callers fetch and pass data in.
"""
from __future__ import annotations
from typing import Any

# Maps lowercase drug name substrings → internal class tag.
_DRUG_CLASSES: list[tuple[str, str]] = [
    ("aspirin", "aspirin"),
    ("clopidogrel", "clopidogrel"),
    ("ticagrelor", "ticagrelor"),
    ("prasugrel", "prasugrel"),
    ("warfarin", "warfarin"),
    ("rivaroxaban", "noac"),
    ("apixaban", "noac"),
    ("dabigatran", "noac"),
    ("edoxaban", "noac"),
    ("enoxaparin", "lmwh"),
    ("heparin", "lmwh"),
    ("atorvastatin", "statin"),
    ("rosuvastatin", "statin"),
    ("pitavastatin", "statin"),
    ("simvastatin", "statin"),
    ("pravastatin", "statin"),
    ("metoprolol", "beta_blocker"),
    ("carvedilol", "beta_blocker"),
    ("bisoprolol", "beta_blocker"),
    ("atenolol", "beta_blocker"),
    ("nebivolol", "beta_blocker"),
    ("propranolol", "beta_blocker"),
    ("ramipril", "acei"),
    ("enalapril", "acei"),
    ("lisinopril", "acei"),
    ("perindopril", "acei"),
    ("captopril", "acei"),
    ("telmisartan", "arb"),
    ("losartan", "arb"),
    ("valsartan", "arb"),
    ("candesartan", "arb"),
    ("olmesartan", "arb"),
    ("sacubitril", "arb"),
    ("furosemide", "loop_diuretic"),
    ("torsemide", "loop_diuretic"),
    ("spironolactone", "spironolactone"),
    ("eplerenone", "eplerenone"),
    ("amlodipine", "ccb"),
    ("diltiazem", "diltiazem"),
    ("verapamil", "verapamil"),
    ("amiodarone", "amiodarone"),
    ("digoxin", "digoxin"),
    ("sotalol", "sotalol"),
    ("ivabradine", "ivabradine"),
]


def _classify(meds: list[dict]) -> set[str]:
    tags: set[str] = set()
    for m in meds:
        name = (m.get("drug") or "").lower()
        for token, cls in _DRUG_CLASSES:
            if token in name:
                tags.add(cls)
    return tags


def _cond_text(conditions: list[Any]) -> str:
    return " ".join(str(c).lower() for c in conditions)


def _has_rheumatic_ms(text: str) -> bool:
    return (
        ("rheumatic" in text and ("mitral" in text or " ms " in text or "stenosis" in text))
        or "rheumatic ms" in text
        or " rms " in text
        or "i05" in text
    )


def _has_af(text: str) -> bool:
    markers = ["atrial fib", "a.fib", "afib", "a fib", "i48"]
    if any(m in text for m in markers):
        return True
    return " af " in text or text.startswith("af ") or text.endswith(" af")


def check_alerts(
    meds: list[dict],
    conditions: list[Any],
    *,
    condition_only: bool = False,
) -> list[dict]:
    """Return list of alert dicts sorted critical-first.

    condition_only=True skips drug-drug-only rules (used when frontend already
    handles drug interactions and only needs condition-aware checks).
    """
    tags = _classify(meds)
    ctext = _cond_text(conditions)
    alerts: list[dict] = []

    antiplatelets = {"aspirin", "clopidogrel", "ticagrelor", "prasugrel"} & tags
    anticoagulants = {"warfarin", "noac", "lmwh"} & tags

    # ── Condition-aware rules (condition_only=True returns only these) ─────────

    # NOAC contraindicated in Rheumatic MS + AF — cardinal rule in Indian cardiology
    if "noac" in tags and _has_rheumatic_ms(ctext) and _has_af(ctext):
        alerts.append({
            "severity": "critical",
            "type": "contraindication",
            "title": "NOAC contraindicated — Rheumatic MS + AF",
            "message": (
                "NOACs (rivaroxaban, apixaban, dabigatran) are contraindicated in rheumatic "
                "mitral stenosis with atrial fibrillation. Switch to Warfarin, target INR 2.5–3.5. "
                "All major RHD-AF trials excluded NOAC patients — this is non-negotiable."
            ),
            "drugs": ["NOAC"],
        })

    if condition_only:
        return alerts

    # ── Drug-drug rules ────────────────────────────────────────────────────────

    # Triple antithrombotic therapy
    if anticoagulants and len(antiplatelets) >= 2:
        alerts.append({
            "severity": "critical",
            "type": "interaction",
            "title": "Triple Antithrombotic Therapy",
            "message": (
                "Anticoagulant + dual antiplatelet — major GI and systemic bleeding risk. "
                "Mandatory PPI cover (Pantoprazole 40mg OD). Limit duration to ≤1 month post-PCI. "
                "Review indication at every visit."
            ),
            "drugs": sorted(anticoagulants | antiplatelets),
        })

    # Beta-blocker + Verapamil (generally contraindicated)
    if "beta_blocker" in tags and "verapamil" in tags:
        alerts.append({
            "severity": "critical",
            "type": "interaction",
            "title": "Beta-blocker + Verapamil — AV Block Risk",
            "message": (
                "Severe bradycardia and complete AV block risk. "
                "Combination is generally contraindicated. Replace Verapamil with Amlodipine."
            ),
            "drugs": ["Beta-blocker", "Verapamil"],
        })

    # Warfarin + Amiodarone (INR potentiation)
    if "warfarin" in tags and "amiodarone" in tags:
        alerts.append({
            "severity": "critical",
            "type": "interaction",
            "title": "Warfarin + Amiodarone — INR Potentiation",
            "message": (
                "Amiodarone inhibits warfarin metabolism — INR rises 30–50%. "
                "Reduce warfarin dose by 30–50% on starting amiodarone. "
                "Check INR weekly for 4 weeks, then monthly."
            ),
            "drugs": ["Warfarin", "Amiodarone"],
        })

    # Digoxin + Amiodarone (toxicity)
    if "digoxin" in tags and "amiodarone" in tags:
        alerts.append({
            "severity": "critical",
            "type": "interaction",
            "title": "Digoxin + Amiodarone — Toxicity Risk",
            "message": (
                "Amiodarone doubles digoxin levels — toxicity risk (nausea, bradycardia, AV block). "
                "Reduce digoxin dose by 50% when starting amiodarone. Monitor levels."
            ),
            "drugs": ["Digoxin", "Amiodarone"],
        })

    # Digoxin + Verapamil (toxicity)
    if "digoxin" in tags and "verapamil" in tags:
        alerts.append({
            "severity": "critical",
            "type": "interaction",
            "title": "Digoxin + Verapamil — Toxicity Risk",
            "message": (
                "Verapamil raises digoxin levels by 50–75% — toxicity risk. "
                "Reduce digoxin dose by 30–50% and monitor levels closely."
            ),
            "drugs": ["Digoxin", "Verapamil"],
        })

    # Beta-blocker + Diltiazem (warning)
    if "beta_blocker" in tags and "diltiazem" in tags:
        alerts.append({
            "severity": "warning",
            "type": "interaction",
            "title": "Beta-blocker + Diltiazem — Bradycardia Risk",
            "message": (
                "Bradycardia and AV block risk. Use with extreme caution. "
                "Monitor ECG and PR interval. Avoid if resting HR <60 bpm."
            ),
            "drugs": ["Beta-blocker", "Diltiazem"],
        })

    # ACEi/ARB + MRA (hyperkalemia)
    if ("acei" in tags or "arb" in tags) and ("spironolactone" in tags or "eplerenone" in tags):
        alerts.append({
            "severity": "warning",
            "type": "monitoring",
            "title": "RAAS + MRA — Hyperkalemia Risk",
            "message": (
                "ACEi/ARB + mineralocorticoid receptor antagonist — hyperkalemia risk. "
                "Monitor serum K⁺ at 1 week and 1 month. Hold if K⁺ >5.5 mEq/L."
            ),
            "drugs": ["ACEi/ARB", "Spironolactone/Eplerenone"],
        })

    # NOAC + single antiplatelet (dual antithrombotic — not triple)
    if "noac" in tags and antiplatelets:
        triple_fired = any(a["title"] == "Triple Antithrombotic Therapy" for a in alerts)
        if not triple_fired:
            alerts.append({
                "severity": "warning",
                "type": "interaction",
                "title": "NOAC + Antiplatelet — Dual Antithrombotic",
                "message": (
                    "Increased bleeding risk. Add PPI (Pantoprazole 40mg OD). "
                    "Limit duration and document indication clearly."
                ),
                "drugs": ["NOAC", list(antiplatelets)[0].capitalize()],
            })

    # Warfarin + single antiplatelet (dual — not triple)
    if "warfarin" in tags and antiplatelets:
        triple_fired = any(a["title"] == "Triple Antithrombotic Therapy" for a in alerts)
        if not triple_fired:
            alerts.append({
                "severity": "warning",
                "type": "interaction",
                "title": "Warfarin + Antiplatelet — Dual Antithrombotic",
                "message": (
                    "Increased bleeding risk. Monitor INR closely. "
                    "Add PPI cover. Review indication and duration regularly."
                ),
                "drugs": ["Warfarin", list(antiplatelets)[0].capitalize()],
            })

    # Statin + Amiodarone (myopathy)
    if "statin" in tags and "amiodarone" in tags:
        alerts.append({
            "severity": "warning",
            "type": "monitoring",
            "title": "Statin + Amiodarone — Myopathy Risk",
            "message": (
                "Amiodarone inhibits CYP3A4 — raises statin levels. "
                "Limit Atorvastatin to ≤40mg/day with Amiodarone. "
                "Monitor for muscle pain and CK elevation."
            ),
            "drugs": ["Statin", "Amiodarone"],
        })

    return alerts
