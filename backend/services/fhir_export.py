"""FHIR R4 Bundle builder — ABDM-compliant export.

Builds document Bundles from our internal models without any external calls.
Two entrypoints:
  build_consultation_fhir(consultation, patient, pc, doctor) → dict
  build_discharge_fhir(ds, patient, pc, doctor)              → dict

ABDM profiles used:
  OP Consult Record   — nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord
  Discharge Summary   — nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryDocument
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


# ── Helpers ────────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ref(resource_id: str, resource_type: str) -> dict:
    return {"reference": f"{resource_type}/{resource_id}"}


def _narrative(text: str) -> dict:
    """Minimal XHTML narrative required by FHIR spec."""
    safe = (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return {"status": "generated", "div": f'<div xmlns="http://www.w3.org/1999/xhtml">{safe}</div>'}


def _gender_fhir(gender_code: str | None) -> str:
    return {"M": "male", "F": "female", "O": "other"}.get((gender_code or "").upper(), "unknown")


# ── Resource builders ──────────────────────────────────────────────────────────

def _build_patient(patient: Any, pc: Any) -> dict:
    resource_id = str(uuid4())
    identifiers = []

    # ABHA Health ID (primary ABDM identifier)
    if patient and patient.abha_id:
        identifiers.append({
            "use": "official",
            "system": "https://healthid.ndhm.gov.in",
            "value": patient.abha_id,
        })

    # Internal patient ID
    patient_id_val = patient.patient_id if patient else "PT-UNKNOWN"
    identifiers.append({
        "use": "secondary",
        "system": "https://stobaeusvoice.app/patients",
        "value": patient_id_val,
    })

    # MRN
    if patient and patient.mrn:
        identifiers.append({
            "use": "official",
            "system": "https://ndhm.gov.in/patients/mrn",
            "value": patient.mrn,
        })

    resource: dict = {
        "resourceType": "Patient",
        "id": resource_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"],
        },
        "identifier": identifiers,
    }

    if patient and patient.full_name:
        resource["name"] = [{"text": patient.full_name}]

    if patient and patient.dob:
        resource["birthDate"] = str(patient.dob)[:10]

    gender_code = (pc.gender_code if pc else None) or (patient.gender if patient else None)
    resource["gender"] = _gender_fhir(gender_code)

    if patient and patient.phone:
        resource["telecom"] = [{"system": "phone", "value": patient.phone, "use": "mobile"}]

    return resource


def _build_practitioner(doctor: Any) -> dict:
    resource_id = str(uuid4())
    resource: dict = {
        "resourceType": "Practitioner",
        "id": resource_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner"],
        },
        "name": [{"text": doctor.full_name if doctor else "Unknown"}],
    }
    if doctor and doctor.hospital:
        resource["qualification"] = [{"code": {"text": doctor.role or "cardiologist"}}]
    return resource


def _build_organization(doctor: Any) -> dict:
    resource_id = str(uuid4())
    return {
        "resourceType": "Organization",
        "id": resource_id,
        "name": doctor.hospital if doctor and doctor.hospital else "Hospital",
        "type": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/organization-type", "code": "prov", "display": "Healthcare Provider"}]}],
    }


def _build_conditions(icd_codes: list, patient_ref_id: str) -> list[dict]:
    resources = []
    for ic in (icd_codes or []):
        code = ic.get("code", "") if isinstance(ic, dict) else str(ic)
        desc = ic.get("description", code) if isinstance(ic, dict) else code
        if not code:
            continue
        resources.append({
            "resourceType": "Condition",
            "id": str(uuid4()),
            "clinicalStatus": {
                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}],
            },
            "verificationStatus": {
                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "confirmed"}],
            },
            "code": {
                "coding": [{"system": "http://hl7.org/fhir/sid/icd-10", "code": code, "display": desc}],
                "text": desc,
            },
            "subject": _ref(patient_ref_id, "Patient"),
            "text": _narrative(f"{code} — {desc}"),
        })
    return resources


def _build_medication_requests(meds: list, patient_ref_id: str, practitioner_ref_id: str) -> list[dict]:
    resources = []
    for m in (meds or []):
        if isinstance(m, dict):
            drug = m.get("drug", "")
            dose = m.get("dose", "")
            freq = m.get("freq", "")
            duration = m.get("duration", "")
            instructions = m.get("instructions", "")
        else:
            drug = str(m)
            dose = freq = duration = instructions = ""

        if not drug:
            continue

        dosage_text = " ".join(filter(None, [dose, freq, duration, instructions]))

        resources.append({
            "resourceType": "MedicationRequest",
            "id": str(uuid4()),
            "status": "active",
            "intent": "order",
            "medicationCodeableConcept": {
                "text": f"{drug} {dose}".strip(),
            },
            "subject": _ref(patient_ref_id, "Patient"),
            "requester": _ref(practitioner_ref_id, "Practitioner"),
            "dosageInstruction": [{"text": dosage_text or dose or freq or "As directed"}],
            "text": _narrative(f"{drug} {dose} {freq}".strip()),
        })
    return resources


def _section(title: str, loinc_code: str, loinc_display: str, text: str, entry_refs: list | None = None) -> dict:
    section: dict = {
        "title": title,
        "code": {
            "coding": [{"system": "http://loinc.org", "code": loinc_code, "display": loinc_display}],
        },
        "text": _narrative(text or "—"),
    }
    if entry_refs:
        section["entry"] = entry_refs
    return section


# ── Consultation FHIR bundle ───────────────────────────────────────────────────

def build_consultation_fhir(
    consultation: Any,
    patient: Any,
    pc: Any,
    doctor: Any,
) -> dict:
    """ABDM OPConsultRecord FHIR R4 Bundle for an approved OPD consultation."""
    bundle_id = str(uuid4())
    now = _now_iso()

    patient_res = _build_patient(patient, pc)
    prac_res = _build_practitioner(doctor)
    org_res = _build_organization(doctor)

    soap = consultation.soap_note or {}
    icd_codes = consultation.icd_codes or soap.get("icd_codes") or []
    prescription = consultation.prescription or soap.get("prescription") or []

    conditions = _build_conditions(icd_codes, patient_res["id"])
    med_requests = _build_medication_requests(prescription, patient_res["id"], prac_res["id"])

    # Composition sections
    sections = []
    if soap.get("subjective"):
        sections.append(_section("Chief Complaint", "10154-3", "Chief complaint Narrative - Reported", soap["subjective"]))
    if soap.get("objective"):
        sections.append(_section("Examination & Investigations", "30954-2", "Relevant diagnostic tests/laboratory data Narrative", soap["objective"]))
    if soap.get("assessment"):
        cond_refs = [_ref(c["id"], "Condition") for c in conditions]
        sections.append(_section("Assessment", "51847-2", "Evaluation+Plan note", soap["assessment"], cond_refs or None))
    if soap.get("plan"):
        med_refs = [_ref(m["id"], "MedicationRequest") for m in med_requests]
        sections.append(_section("Management Plan", "18776-5", "Plan of care note", soap["plan"], med_refs or None))
    if prescription:
        med_refs2 = [_ref(m["id"], "MedicationRequest") for m in med_requests]
        sections.append(_section("Medications", "10183-2", "Hospital discharge medications Narrative", "", med_refs2))

    composition: dict = {
        "resourceType": "Composition",
        "id": str(uuid4()),
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"],
        },
        "language": "en-IN",
        "status": "final",
        "type": {
            "coding": [{"system": "http://snomed.info/sct", "code": "371530004", "display": "Clinical consultation report"}],
        },
        "subject": _ref(patient_res["id"], "Patient"),
        "date": consultation.started_at.isoformat() if consultation.started_at else now,
        "author": [_ref(prac_res["id"], "Practitioner")],
        "custodian": _ref(org_res["id"], "Organization"),
        "title": "OP Consultation Record",
        "section": sections,
        "text": _narrative(f"OPD consultation — {consultation.session_id}"),
    }

    entries = [
        {"fullUrl": f"urn:uuid:{composition['id']}", "resource": composition},
        {"fullUrl": f"urn:uuid:{patient_res['id']}", "resource": patient_res},
        {"fullUrl": f"urn:uuid:{prac_res['id']}", "resource": prac_res},
        {"fullUrl": f"urn:uuid:{org_res['id']}", "resource": org_res},
    ]
    for c in conditions:
        entries.append({"fullUrl": f"urn:uuid:{c['id']}", "resource": c})
    for m in med_requests:
        entries.append({"fullUrl": f"urn:uuid:{m['id']}", "resource": m})

    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Bundle"],
        },
        "identifier": {
            "system": "https://ndhm.gov.in/bundles",
            "value": bundle_id,
        },
        "type": "document",
        "timestamp": now,
        "entry": entries,
    }


# ── Discharge Summary FHIR bundle ─────────────────────────────────────────────

def build_discharge_fhir(
    ds: Any,
    patient: Any,
    pc: Any,
    doctor: Any,
) -> dict:
    """ABDM DischargeSummaryDocument FHIR R4 Bundle."""
    bundle_id = str(uuid4())
    now = _now_iso()

    patient_res = _build_patient(patient, pc)
    prac_res = _build_practitioner(doctor)
    org_res = _build_organization(doctor)

    icd_codes = ds.icd_codes or []
    discharge_meds = ds.discharge_meds or []
    secs = ds.sections or {}

    conditions = _build_conditions(icd_codes, patient_res["id"])
    med_requests = _build_medication_requests(discharge_meds, patient_res["id"], prac_res["id"])

    # FHIR Composition sections mapped from our discharge sections dict
    _SECTION_MAP = [
        ("chief_complaint",        "Chief Complaint",                  "10154-3", "Chief complaint Narrative - Reported"),
        ("clinical_course",        "Clinical Course",                  "8648-8",  "Hospital course Narrative"),
        ("hospital_course",        "Hospital Course",                  "8648-8",  "Hospital course Narrative"),
        ("investigations",         "Investigations",                   "30954-2", "Relevant diagnostic tests/laboratory data Narrative"),
        ("diagnosis",              "Discharge Diagnosis",              "11535-2", "Hospital discharge Dx Narrative"),
        ("treatment",              "Treatment Given",                  "62387-6", "Procedures Narrative"),
        ("condition_at_discharge", "Condition at Discharge",           "8656-1",  "Discharge condition Narrative"),
        ("follow_up",              "Follow-up Instructions",           "18776-5", "Plan of care note"),
    ]

    comp_sections = []
    for key, title, loinc_code, loinc_display in _SECTION_MAP:
        text_val = secs.get(key, "")
        if text_val:
            refs = None
            if key == "diagnosis":
                refs = [_ref(c["id"], "Condition") for c in conditions] or None
            comp_sections.append(_section(title, loinc_code, loinc_display, text_val, refs))

    # Always add discharge medications section if meds exist
    if med_requests:
        med_refs = [_ref(m["id"], "MedicationRequest") for m in med_requests]
        comp_sections.append(_section(
            "Discharge Medications", "10183-2", "Hospital discharge medications Narrative",
            " · ".join(f"{m.get('drug','')} {m.get('dose','')} {m.get('freq','')}" for m in discharge_meds),
            med_refs,
        ))

    admission_date = ds.admission_date.isoformat() if ds.admission_date else None
    discharge_date = ds.discharge_date.isoformat() if ds.discharge_date else None

    composition: dict = {
        "resourceType": "Composition",
        "id": str(uuid4()),
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryDocument"],
        },
        "language": "en-IN",
        "status": "final" if ds.status == "final" else "preliminary",
        "type": {
            "coding": [{"system": "http://snomed.info/sct", "code": "373942005", "display": "Discharge summary"}],
        },
        "subject": _ref(patient_res["id"], "Patient"),
        "date": discharge_date or now,
        "author": [_ref(prac_res["id"], "Practitioner")],
        "custodian": _ref(org_res["id"], "Organization"),
        "title": "Discharge Summary",
        "section": comp_sections,
        "text": _narrative(f"Discharge summary — {ds.summary_id}"),
    }

    if admission_date or discharge_date:
        composition["event"] = [{
            "period": {k: v for k, v in {"start": admission_date, "end": discharge_date}.items() if v},
        }]

    entries = [
        {"fullUrl": f"urn:uuid:{composition['id']}", "resource": composition},
        {"fullUrl": f"urn:uuid:{patient_res['id']}", "resource": patient_res},
        {"fullUrl": f"urn:uuid:{prac_res['id']}", "resource": prac_res},
        {"fullUrl": f"urn:uuid:{org_res['id']}", "resource": org_res},
    ]
    for c in conditions:
        entries.append({"fullUrl": f"urn:uuid:{c['id']}", "resource": c})
    for m in med_requests:
        entries.append({"fullUrl": f"urn:uuid:{m['id']}", "resource": m})

    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Bundle"],
        },
        "identifier": {
            "system": "https://ndhm.gov.in/bundles",
            "value": bundle_id,
        },
        "type": "document",
        "timestamp": now,
        "entry": entries,
    }
