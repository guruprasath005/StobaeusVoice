"""
Seed 10 realistic cardiac patients — run once:
  python seed_patients.py

Mirrors the /patients/register endpoint: assigns a PT-XXXXXX id, derives age
from dob, and writes both the PII row (patients) and the LLM-safe clinical
row (patient_clinical). Idempotent on ABHA ID — re-running skips duplicates.
"""
from db import SessionLocal, init_db
from models import Patient, PatientClinical
from datetime import date, datetime, timezone
import uuid

init_db()


def generate_patient_id(db) -> str:
    while True:
        pid = f"PT-{uuid.uuid4().hex[:6].upper()}"
        if not db.query(Patient).filter(Patient.patient_id == pid).first():
            return pid


def calc_age(dob_str: str) -> int:
    dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


# 10 clinically-coherent cardiac patients (Chennai cohort)
PATIENTS = [
    {
        "full_name": "Anitha Devi", "dob": "1973-09-14", "gender": "Female",
        "phone": "+91 94441 20783", "abha_id": "14-2290-4471-8830",
        "mrn": "APH-2025-10233", "insurance": "Star Health — Family Optima / SH-77120",
        "address": "Mylapore, Chennai 600004",
        "conditions": ["Atrial Fibrillation", "Rheumatic Mitral Stenosis"],
        "medications": [
            {"drug": "Warfarin", "dose": "3mg", "freq": "OD"},
            {"drug": "Digoxin", "dose": "0.25mg", "freq": "OD"},
            {"drug": "Furosemide", "dose": "40mg", "freq": "OD"},
            {"drug": "Metoprolol", "dose": "25mg", "freq": "BD"},
        ],
        "allergies": [], "blood_group": "B+",
    },
    {
        "full_name": "Suresh Babu", "dob": "1958-07-22", "gender": "Male",
        "phone": "+91 98401 55621", "abha_id": "14-6612-9035-2274",
        "mrn": "APH-2025-10234", "insurance": "Ayushman Bharat PM-JAY / TN-4471209",
        "address": "Velachery, Chennai 600042",
        "conditions": ["Acute STEMI (anterior wall)", "Type 2 Diabetes Mellitus", "Hypertension"],
        "medications": [
            {"drug": "Aspirin", "dose": "75mg", "freq": "OD"},
            {"drug": "Ticagrelor", "dose": "90mg", "freq": "BD"},
            {"drug": "Atorvastatin", "dose": "80mg", "freq": "HS"},
            {"drug": "Ramipril", "dose": "5mg", "freq": "OD"},
            {"drug": "Metoprolol", "dose": "25mg", "freq": "BD"},
        ],
        "allergies": [], "blood_group": "O+",
    },
    {
        "full_name": "Mohammed Iqbal", "dob": "1964-11-03", "gender": "Male",
        "phone": "+91 99620 47118", "abha_id": "14-3380-1192-5567",
        "mrn": "APH-2025-10235", "insurance": "Niva Bupa — ReAssure / NB-220817",
        "address": "Triplicane, Chennai 600005",
        "conditions": ["Coronary Artery Disease (post-PCI LAD 2024)", "Type 2 Diabetes Mellitus", "Dyslipidaemia"],
        "medications": [
            {"drug": "Aspirin", "dose": "75mg", "freq": "OD"},
            {"drug": "Clopidogrel", "dose": "75mg", "freq": "OD"},
            {"drug": "Atorvastatin", "dose": "40mg", "freq": "HS"},
            {"drug": "Metformin", "dose": "500mg", "freq": "BD"},
        ],
        "allergies": ["Sulfa drugs"], "blood_group": "A+",
    },
    {
        "full_name": "Lakshmi Narayanan", "dob": "1968-02-19", "gender": "Female",
        "phone": "+91 90030 71284", "abha_id": "14-7741-2208-9913",
        "mrn": "APH-2025-10236", "insurance": "CGHS / CG-CHN-558102",
        "address": "Anna Nagar, Chennai 600040",
        "conditions": ["Heart Failure (HFrEF, EF 35%)", "Hypertension"],
        "medications": [
            {"drug": "Carvedilol", "dose": "6.25mg", "freq": "BD"},
            {"drug": "Ramipril", "dose": "5mg", "freq": "OD"},
            {"drug": "Furosemide", "dose": "40mg", "freq": "OD"},
            {"drug": "Spironolactone", "dose": "25mg", "freq": "OD"},
        ],
        "allergies": [], "blood_group": "O+",
    },
    {
        "full_name": "Rajalakshmi Iyer", "dob": "1955-12-08", "gender": "Female",
        "phone": "+91 94445 60192", "abha_id": "14-1129-6680-3341",
        "mrn": "APH-2025-10237", "insurance": "HDFC Ergo — Optima Secure / HE-901244",
        "address": "T. Nagar, Chennai 600017",
        "conditions": ["Atrial Fibrillation (non-valvular)", "Hypertension"],
        "medications": [
            {"drug": "Apixaban", "dose": "5mg", "freq": "BD"},
            {"drug": "Bisoprolol", "dose": "5mg", "freq": "OD"},
            {"drug": "Amlodipine", "dose": "5mg", "freq": "OD"},
        ],
        "allergies": [], "blood_group": "AB+",
    },
    {
        "full_name": "Vijay Anand", "dob": "1981-04-30", "gender": "Male",
        "phone": "+91 98842 30077", "abha_id": "14-5503-7741-2208",
        "mrn": "APH-2025-10238", "insurance": "Self-pay",
        "address": "Adyar, Chennai 600020",
        "conditions": ["Unstable Angina", "Dyslipidaemia"],
        "medications": [
            {"drug": "Aspirin", "dose": "75mg", "freq": "OD"},
            {"drug": "Clopidogrel", "dose": "75mg", "freq": "OD"},
            {"drug": "Atorvastatin", "dose": "40mg", "freq": "HS"},
            {"drug": "Metoprolol", "dose": "25mg", "freq": "BD"},
            {"drug": "Isosorbide mononitrate", "dose": "20mg", "freq": "BD"},
        ],
        "allergies": [], "blood_group": "B+",
    },
    {
        "full_name": "Fatima Begum", "dob": "1961-08-17", "gender": "Female",
        "phone": "+91 99410 88265", "abha_id": "14-8820-3391-7745",
        "mrn": "APH-2025-10239", "insurance": "Star Health — Senior Citizens Red Carpet / SH-44218",
        "address": "Royapettah, Chennai 600014",
        "conditions": ["Hypertensive Heart Disease", "Type 2 Diabetes Mellitus", "Chronic Kidney Disease Stage 3"],
        "medications": [
            {"drug": "Telmisartan", "dose": "40mg", "freq": "OD"},
            {"drug": "Amlodipine", "dose": "5mg", "freq": "OD"},
            {"drug": "Metformin", "dose": "500mg", "freq": "OD"},
            {"drug": "Atorvastatin", "dose": "20mg", "freq": "HS"},
        ],
        "allergies": [], "blood_group": "A-",
    },
    {
        "full_name": "Karthik Subramaniam", "dob": "1988-01-25", "gender": "Male",
        "phone": "+91 73580 19940", "abha_id": "14-2207-5519-6680",
        "mrn": "APH-2025-10240", "insurance": "ICICI Lombard — Complete Health / IL-330912",
        "address": "Porur, Chennai 600116",
        "conditions": ["Dilated Cardiomyopathy (EF 30%)"],
        "medications": [
            {"drug": "Sacubitril/Valsartan", "dose": "50mg", "freq": "BD"},
            {"drug": "Carvedilol", "dose": "3.125mg", "freq": "BD"},
            {"drug": "Furosemide", "dose": "40mg", "freq": "OD"},
            {"drug": "Dapagliflozin", "dose": "10mg", "freq": "OD"},
        ],
        "allergies": [], "blood_group": "O+",
    },
    {
        "full_name": "Sunita Patel", "dob": "1971-03-12", "gender": "Female",
        "phone": "+91 90871 26654", "abha_id": "14-6680-1129-3341",
        "mrn": "APH-2025-10241", "insurance": "Niva Bupa — Aspire / NB-771208",
        "address": "Besant Nagar, Chennai 600090",
        "conditions": ["Coronary Artery Disease (post-CABG 2022)", "Hypertension", "Dyslipidaemia"],
        "medications": [
            {"drug": "Aspirin", "dose": "75mg", "freq": "OD"},
            {"drug": "Atorvastatin", "dose": "40mg", "freq": "HS"},
            {"drug": "Metoprolol", "dose": "25mg", "freq": "BD"},
            {"drug": "Ramipril", "dose": "2.5mg", "freq": "OD"},
        ],
        "allergies": [], "blood_group": "B+",
    },
    {
        "full_name": "Govindaraj Pillai", "dob": "1953-10-05", "gender": "Male",
        "phone": "+91 94440 73318", "abha_id": "14-3341-8820-5503",
        "mrn": "APH-2025-10242", "insurance": "CGHS / CG-CHN-220914",
        "address": "Kilpauk, Chennai 600010",
        "conditions": ["Complete Heart Block (post permanent pacemaker 2023)", "Atrial Fibrillation", "Hypertension"],
        "medications": [
            {"drug": "Apixaban", "dose": "2.5mg", "freq": "BD"},
            {"drug": "Amlodipine", "dose": "5mg", "freq": "OD"},
            {"drug": "Atorvastatin", "dose": "20mg", "freq": "HS"},
        ],
        "allergies": ["Iodine contrast"], "blood_group": "O+",
    },
]

db = SessionLocal()
created = 0
for p in PATIENTS:
    if p["abha_id"] and db.query(Patient).filter(Patient.abha_id == p["abha_id"]).first():
        print(f"Skip (ABHA exists): {p['full_name']}")
        continue
    pid = generate_patient_id(db)
    gender_code = {"male": "M", "female": "F"}.get(p["gender"].lower(), "O")
    db.add(Patient(
        patient_id=pid,
        full_name=p["full_name"], dob=p["dob"], gender=p["gender"],
        phone=p["phone"], abha_id=p["abha_id"], insurance=p["insurance"],
        address=p["address"], mrn=p["mrn"],
    ))
    db.add(PatientClinical(
        patient_id=pid,
        age=calc_age(p["dob"]), gender_code=gender_code,
        conditions=p["conditions"], medications=p["medications"],
        allergies=p["allergies"], blood_group=p["blood_group"],
    ))
    created += 1
    print(f"Created: {pid}  {p['full_name']:22s} {calc_age(p['dob'])}{gender_code}  {', '.join(p['conditions'])}")
db.commit()
db.close()
print(f"\nDone — {created} patient(s) created.")
