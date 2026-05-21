# StobaeusVoice — Project Context for Claude

## What This Product Is

StobaeusVoice is a **voice-first cardiac documentation platform** built specifically for cardiologists and cardiac care teams in Indian hospitals.

**Core value:** Cardiologists spend 30–40% of time on paperwork. We eliminate that using ambient AI — mic listens passively during consultations, generates structured cardiac SOAP notes with cardiology-specific ICD-10 coding, pushes to EMR. Zero behaviour change required from doctors.

**Target market:** Cardiology departments in Indian private hospitals (Apollo, Fortis, Max, Narayana), cardiac hospitals, cath labs, cardiac ICUs. Entry wedge is cardiology consultation notes → expand to echo reports, cath lab dictation, discharge summaries.

**Why cardiology first:** Highest documentation burden per consultation (complex histories, multiple investigations, device therapy), highest revenue per doctor, and cardiology teams are early tech adopters. One cardiology department = 5–10 doctors × ₹4,000/mo = ₹20–40k MRR per hospital.

---

## Wireframes

All 14 screens are in `design/StobaeusVoice Wireframes.html`. Open it in a browser to view the full design canvas.

**Screen inventory:**
| # | Screen | Role |
|---|---|---|
| 01 | Login | JWT email+password, invite-only |
| 02 | Cardiologist Dashboard | Home — stats, chart, consultation queue, activity |
| 03 | Active Consultation | Ambient recording — live transcript, cardiac entity extraction |
| 04 | Cardiac SOAP Note Review | AI-generated note — approve/edit/push to EMR |
| 05 | Voice Agent | Hands-free cardiac round mode — voice commands |
| 06 | Cardiac Nurse Station | Bed grid, vitals logging, drip rates, handoff notes |
| 07 | Clinical Alerts | Drug interactions, cardiac contraindications, ABDM warnings |
| 08 | Patient Records | Patient list + detail — cardiac timeline, echo, cath reports, ABHA |
| 09 | Echo / Cath Lab Dictation | Template-based echo report and cath lab structured reporting |
| 10 | Prescription Manager | Cardiac drug list, interaction checker, WhatsApp/print/ABHA send |
| 11 | Patient Voice Bot (Outbound) | Post-discharge cardiac follow-up calls, symptom monitoring |
| 12 | Appointment Bot (Inbound) | Multilingual scheduling bot — books cardiology slots directly |
| 13 | Hospital Admin Dashboard | Notes by cardiologist, compliance, ABDM milestones, cost savings |
| 14 | Settings | Profile, EMR integrations, language, privacy, account |

**Design system:**
- Colors: `#E11D48` red-pink (primary), `#10B981` green (success), `#F59E0B` amber (warning), `#EF4444` red (critical)
- Fonts: Poppins everywhere — headings, body, IDs/times (closest free match to Google Sans, which is proprietary and unavailable via Google Fonts)
- Cards: 12px radius, 1.5px solid border, white background
- Sidebar: 200px, always present, `StobaeusVoice` branding
- All screens share same 3-column shell: sidebar + main + right panel

**Wireframe files** (all in `design/`):
- `design/StobaeusVoice Wireframes.html` — entry point (React via CDN)
- `design/wf-screens-a.jsx` — screens 1–7
- `design/wf-screens-b.jsx` — screens 8–14
- `design/wf-shell.jsx` — shared Sidebar, ScreenFrame, PageHead, Stat, ChartLine, Waveform, Avatar
- `design/icons.jsx` — Lucide-style SVG icon library
- `design/wf-app.jsx` — canvas assembly, tweak system
- `design/design-canvas.jsx` — pan/zoom design canvas
- `design/tweaks-panel.jsx` — fidelity/density/surface controls

---

## Tech Stack Decisions

### Auth
- **JWT (FastAPI + python-jose + bcrypt)** — Email/Password only, invite-only access
- Role-based access: Cardiologist / Cardiac Surgeon / Cardiac Nurse / Admin
- Roles assigned by Admin at account creation, not self-selected
- No self-registration — Admin creates accounts via `/auth/users/create`

### Frontend
- **Next.js 14** (App Router) — web app, PWA for mobile
- **React Native** (Android first) — for mobile/tablet in wards
- Tailwind CSS, component library: shadcn/ui
- WebSocket for real-time transcript streaming

### Backend
- **FastAPI (Python)** — AI pipeline (STT → NLP → note generation)
- **Node.js** — real-time WebSocket server, API gateway
- REST APIs for EMR integrations

### AI / ML Pipeline
```
Audio → Noise Cancellation → Language Detection
     → Whisper large-v3 (English)
     → Sarvam AI STT API (regional languages)
     → Medical NLP (entity extraction)
     → Azure OpenAI GPT-4o (SOAP note generation, Phase 1)
     → vLLM + Llama 3.1 70B Q4 (on-prem, Phase 2)
     → FHIR R4 structured output
     → EMR push
```

### Infrastructure (Azure, India South region)
- **AKS** (Kubernetes) — app backend
- **Azure OpenAI** — GPT-4o for note generation (Phase 1)
- **NV6ads_A10_v5** — GPU VM for Whisper STT
- **NC24ads_A100_v4** — GPU VM for self-hosted LLM (Phase 2)
- **PostgreSQL Flexible Server** — clinical data (FHIR schema)
- **Azure Blob** — audio files, documents
- **Redis Cache** — sessions, real-time state
- **Azure App Gateway WAF** — ingress + security
- All data stays in Azure India South (DPDP compliant)

### EMR Integrations
- Practo API
- KareXpert API
- NIC eHospital (government)
- ABDM FHIR R4 gateway (mandatory)
- Custom FHIR adapter for others

### Compliance
- **DPDP Act 2023** — all data in India (Azure India South)
- **DISHA** — health data sovereignty
- **ABDM M1–M4 milestones** — mandatory for hospital participation
- FHIR R4 for all clinical data interchange

---

## User Flows

### Primary: Cardiologist Consultation Flow
```
Login → Dashboard → "Start Consultation" button
→ Search/select patient (or register new cardiac patient)
→ Active Consultation screen (mic on, passive listening)
→ Cardiologist and patient speak
→ "Stop & Generate" → Cardiac SOAP Note Review screen
→ Cardiologist reviews/edits → "Approve & Push to EMR"
→ Note in EMR + cardiac prescription sent via WhatsApp
→ Back to Dashboard
```

### Echo / Cath Lab Dictation Flow
```
Login → Echo/Cath Lab Dictation → select template (Echo / Cath / Stress Test / Holter)
→ Dictate findings → structured report auto-fills (EF%, wall motion, valves, pressures)
→ Impression + FHIR output → "Save & Send to referring doctor"
```

### Cardiac Nurse Ward Round
```
Login (nurse role) → Cardiac Nurse Station screen
→ Tap a CCU/ICU bed → "Voice log" → speak vitals/drip update → saved
→ Or: say "Bed 4 BP 100/70, HR 88, drip 10ml/hr" → auto-captured
```

### Voice Agent (hands-free cardiac round)
```
Login → Voice Agent screen (large mic)
→ Say "Update bed 7 troponin 2.4" → saved
→ Say "Show last echo for patient 204" → opens
→ Say "Schedule cath lab for tomorrow 9am" → booked
```

### Admin
```
Login (admin role) → Hospital Admin Dashboard
→ See cardiologist-wise notes, compliance, ABDM milestones
→ Cost savings widget shows ₹ saved on transcription this month
```

---

## Sample Data Used in Wireframes
- **Doctor:** Dr. Priya Sharma, Interventional Cardiologist, Apollo Hospitals Chennai
- **Patient 1:** Ravi Kumar, 58M, ABHA 14-5678-9012-3456, K/c/o CAD (post-CABG 2021), HTN, Dyslipidaemia
- **Patient 2:** Anitha Devi, 52F, K/c/o Atrial Fibrillation, Mitral Stenosis
- **Patient 3:** Suresh Babu, 67M, Acute STEMI presenting to cath lab
- **Cardiac drugs:** Aspirin 75mg OD, Clopidogrel 75mg OD, Atorvastatin 40mg HS, Metoprolol 25mg BD, Ramipril 5mg OD, Furosemide 40mg OD, Digoxin 0.25mg OD, Warfarin 3mg OD
- **ICD-10 codes:** I21.9 (Acute STEMI), I25.10 (CAD, native vessel), I50.9 (Heart Failure), I48.91 (Atrial Fibrillation), I34.0 (Mitral regurgitation), I10 (HTN), Z95.1 (CABG status)
- **Cardiac investigations:** Echo (EF 35%, RWMA, MR grade 2+), ECG (AF with RVR, LBBB), Troponin I 18.4 ng/mL, BNP 890 pg/mL, Coronary angiogram (LAD 90%, LCX 70%)
- **Transcript language:** Hindi + English code-switching (common in Indian cardiology wards)

---

## Pricing Model (for context when building features)
| Tier | Doctors | Price | Features |
|---|---|---|---|
| Starter | 1–10 | ₹3,000/doc/mo | Dictation + SOAP + 1 EMR |
| Pro | 11–50 | ₹4,000/doc/mo | + ICD coding + Prescription + Voice bot |
| Enterprise | 50+ | ₹5,000–6,000/doc/mo | + Admin dashboard + On-prem option + SLA |

---

## PII Firewall Architecture (CRITICAL — read before touching any patient data code)

**Rule: Patient personal data NEVER reaches any LLM or STT service.**

### What this means in practice

Every patient gets a `patient_id` (e.g. `PT-0042`). The LLM only ever sees this ID plus safe clinical context. Names, phone numbers, ABHA IDs, addresses — these stay in the database only.

```
patients table          → PII only. NEVER sent to LLM/Whisper.
patient_clinical table  → Age, gender, conditions, meds, allergies. SAFE to send to LLM.
consultations table     → session_id + patient_id + transcript + SOAP note.
```

### What gets sent to each service

| Data | DB | Whisper (STT) | LLM (GPT-4o/Llama) | EMR |
|---|---|---|---|---|
| Full name | ✓ | ✗ | ✗ | ✓ direct push |
| Phone / ABHA / Address | ✓ | ✗ | ✗ | ✓ |
| Age (approximate) | ✓ | ✗ | ✓ | ✓ |
| Known conditions | ✓ | ✗ | ✓ | ✓ |
| Current medications | ✓ | ✗ | ✓ | ✓ |
| Allergies | ✓ | ✗ | ✓ | ✓ |
| Raw audio | session_id only | ✓ | ✗ | ✗ |
| Transcript text | session_id only | — | ✓ anonymized | ✗ |
| SOAP note | ✓ with PT-ID | ✗ | ✗ | ✓ |

### LLM system prompt template (safe pattern)
```
Patient: 58M. K/c/o CAD (post-CABG 2021), Hypertension, Dyslipidaemia.
Current medications: Aspirin 75mg OD, Atorvastatin 40mg HS, Metoprolol 25mg BD, Ramipril 5mg OD.
Allergies: Penicillin.
Specialty: Cardiology.
Session: {session_id}

Generate a cardiology SOAP note from the following consultation transcript.
Include: cardiac symptoms, relevant examination findings, investigation summary (ECG/Echo/labs),
assessment with ICD-10 codes, and cardiac management plan...
```
No name. No ABHA. No phone. No address. Ever.

### Backend join pattern
```
session_id → patient_id (from sessions table)
patient_id → full patient record (from patients table)
→ display name in frontend AFTER note is generated
→ attach patient_id to note record, not name
```

---

## Patient Registration & Consultation Start Flow

### Missing screen: Start Consultation Modal (Screen 0A)
When doctor taps "Start Consultation":
1. Modal opens — search existing patients by ABHA / MRN / name
2. If found → load clinical context (age, conditions, meds, allergies) → start recording
3. If not found → "Register new patient" → Screen 0B
4. Option: "Anonymous consultation" (emergency cases) → PT-ANON-{session_id}

### Missing screen: New Patient Registration (Screen 0B)
Two clear sections:

**IDENTITY — stored in DB only, never sent to LLM:**
- Full name, Date of birth (age auto-calculated), Gender
- Phone number, ABHA ID (scan or type), Insurance, Address

**CLINICAL CONTEXT — stored in DB, safe to send to LLM:**
- Known conditions (tag-based entry)
- Current medications (drug + dose)
- Allergies
- Blood group

On save → patient_id auto-assigned → immediately start consultation.

### Complete flow
```
"Start Consultation" tap
  → Search modal (Screen 0A)
      ├── Existing patient found → load PT-XXXX clinical context
      ├── Not found → Registration form (Screen 0B) → assign PT-XXXX
      └── Anonymous → PT-ANON-{uuid}
  → Active Consultation (Screen 03)
      → session_id generated, patient_id linked
      → audio sent to Whisper (tagged session_id only)
      → transcript + clinical context sent to LLM (no PII)
  → SOAP Note Review (Screen 04)
      → backend joins session_id → patient_id → displays name in UI
      → note stored with patient_id (not name)
  → Approve → push to EMR (patient_id mapped to MRN at push time)
```

---

## Database Schema (Core Tables)

```sql
-- PII table — NEVER queried by AI services
CREATE TABLE patients (
  patient_id    VARCHAR PRIMARY KEY,  -- PT-0042
  full_name     VARCHAR NOT NULL,
  dob           DATE,
  gender        VARCHAR,
  phone         VARCHAR,
  abha_id       VARCHAR UNIQUE,
  insurance     VARCHAR,
  address       TEXT,
  mrn           VARCHAR,              -- hospital MRN
  created_at    TIMESTAMP
);

-- Clinical context — safe to include in LLM prompts
CREATE TABLE patient_clinical (
  patient_id    VARCHAR REFERENCES patients(patient_id),
  age           INTEGER,             -- derived from dob, updated
  gender_code   VARCHAR,             -- M/F/O
  conditions    JSONB,               -- ["T2DM", "HTN"]
  medications   JSONB,               -- [{drug, dose, freq}]
  allergies     JSONB,               -- ["Penicillin"]
  blood_group   VARCHAR,
  updated_at    TIMESTAMP
);

-- Consultation sessions — bridge between PII and AI output
CREATE TABLE consultations (
  session_id    UUID PRIMARY KEY,
  patient_id    VARCHAR REFERENCES patients(patient_id),
  doctor_id     VARCHAR,
  started_at    TIMESTAMP,
  ended_at      TIMESTAMP,
  audio_blob    VARCHAR,             -- Azure Blob URL (encrypted)
  transcript    TEXT,               -- raw transcript (no PII)
  soap_note     JSONB,              -- generated note
  icd_codes     JSONB,
  status        VARCHAR             -- recording/reviewing/approved/pushed
);
```

---

## What to Build Next (Priority Order)

> Priority order updated based on Indian hospital cardiology workflow research (May 2026).
> Research findings in section below.

1. ✅ JWT Auth — invite-only login, admin creates accounts
2. ✅ Cardiologist Dashboard — sidebar + stats + consultation queue (mock data → real data)
3. ✅ Cardiac patient registration (Screen 0B) + patients list page
4. ✅ Start Consultation modal (Screen 0A) — search / register / anonymous
5. ✅ Active Consultation recording — MediaRecorder → Whisper → transcript + PII firewall sidebar
6. ✅ Cardiac SOAP note generation — GPT-4o (NO PII), editable S/O/A/P, ICD-10, approve & save
7. ✅ Echo / Cath Lab dictation — Echo / Cath / Stress Test / Holter templates, AI impression, dictation
8. ✅ Prescription Manager — cardiac drug list (55 drugs), interaction checker, WhatsApp send, auto-created on consultation approve
9. **Follow-up OPD mode** — highest-frequency consultation type; cardiologists currently write 3–4 lines or nothing; show previous SOAP, only note what changed
10. **Discharge Summary auto-generation** — most hated task in Indian hospitals; residents write hours/days post-discharge; we already have all data (SOAP + ICD + meds) to generate it
11. **Cath report completeness** — add haemodynamics (LVEDP, aortic pressure), contrast volume (mL), fluoroscopy time, access site (radial/femoral), complications, stent brand/size/length; these fields are on every Indian cath lab paper form
12. Clinical alerts — cardiac contraindications, drug interactions (warfarin+aspirin+clopidogrel triple therapy, NOAC+antiplatelets)
13. Cardiac Nurse Station — CCU voice charting ("Bed 4 BP 100/70, dopamine 8 mcg/kg/min" → structured flow sheet); wireframe exists (Screen 06)
14. IPD progress note mode — fast bedside ward round note; differs from OPD: no new history, just vitals + clinical status + plan update
15. Patient voice bot — post-discharge cardiac symptom monitoring
16. Appointment bot — cardiology slot booking
17. Admin dashboard — wire up real data (notes by cardiologist, ABDM milestones, cost savings)
18. **DICOM / PACS Integration (dcm4che)** — pull echo SR (Structured Report) measurements directly into echo form fields; pull cath DICOM SR into cath report; "Import from PACS" button on echo/cath detail page. Build when first hospital requests it — don't pre-build.
19. Swap to self-hosted Llama (Phase 2, ~100 cardiologists)

---

## Key Constraints to Remember
- **No dark theme anywhere** — Active Consultation was changed from dark to light (see chat log)
- **Red-pink `#E11D48` is the product accent** — rose scale used for all branding/primary UI. ⚠️ Tradeoff: the red-pink brand accent sits visually close to the `#EF4444` critical-alert red, so clinical severity must be conveyed with icons/labels/badges (not colour alone). Green `#10B981` and amber `#F59E0B` remain reserved for clinical signals.
- **DPDP compliance is non-negotiable** — never route patient audio or data outside Azure India region
- **ABDM FHIR format** — all clinical output must be FHIR R4 compatible; ABDM is now mandatory (not optional) for Indian healthcare providers as of 2024
- **Indian accent handling** — Whisper fine-tuned, Sarvam AI (Saarika-2.5) for 22 Indian regional languages; code-switched Hinglish is the norm in North Indian wards
- **Android first** for mobile — majority of Indian doctors use Android
- **Resident culture** — Consultants verbally dictate; residents write. Product must work for consultants directly (not require residents to change behaviour). Do not build features that assume the consultant is already typing.
- **WhatsApp is the last mile** — Indian cardiologists send prescriptions via WhatsApp photo. Any prescription feature must include a WhatsApp send path.
- **ICD coding is currently post-discharge** — done by non-clinical medical coders from discharge summaries. Our real-time ICD suggestion is a genuine differentiator that reduces insurance claim rejections.
- **Augnito is the incumbent competitor** — deployed at Apollo (37 sites), Fortis, Max, Medanta, Manipal. We differentiate on: (a) ambient (passive) recording vs. Augnito's active dictation, (b) cardiology-specific NLP vs. general medical, (c) ICD at point of care, (d) cath/echo structured reports.

---

## DICOM / PACS Integration Plan (dcm4che — Phase 2)

**Trigger:** Build when the first hospital explicitly requests PACS connection. Do not pre-build.

**What dcm4che is:** Open source Java DICOM toolkit (LGPL license). Powers many Indian hospital PACS systems. https://web.dcm4che.org/

**Python approach:** Use `pydicom` library to parse DICOM Structured Report (SR) objects — no Java needed on our backend.

**Where it plugs in:**
- Echo report page → "Import from PACS" button → fetches SR → auto-fills EF%, chamber dimensions, valve gradients, RVSP
- Cath report page → "Import from PACS" button → fetches SR → auto-fills stenosis %, TIMI flow, LVEDP

**Protocol:** WADO-RS REST API (`GET /wado/rs/studies/{uid}/series/{uid}/instances/{uid}`) — standard on dcm4chee-arc and most modern PACS. Hospital must expose PACS on network or VPN.

**Key DICOM SR concept codes for echo auto-fill:**
```
EF (biplane Simpson)  → LOINC 59063-1
LVIDd                 → LOINC 18156-0
LVIDs                 → LOINC 18033-1
IVSD                  → LOINC 18090-1
RVSP                  → LOINC 29436-9
```

**Hospital requirements:**
- PACS accessible on same network / VPN
- Study UID or Accession Number passed from HIS/worklist to fetch the right study
- dcm4chee-arc (open source) supports all above natively; proprietary PACS (Synapse, Agfa, Carestream) support WADO-RS via configuration

---

## Indian Cardiology Workflow Research (May 2026)

> Summary of research into how cardiology departments actually operate in Indian hospitals.
> Use this to inform feature design and prioritisation decisions.

### Real consultation volumes
- Government hospital cardiology OPD: 100–200+ patients per session (2–5 min each)
- Private hospital cardiology OPD: 30–60 patients per day per cardiologist (10–15 min each)
- Busy cath labs: 10–15 angiograms per day per interventional cardiologist
- Ward rounds: morning (consultant) + evening (resident) daily

### Documentation reality today
- Government hospitals: almost entirely paper (case sheets, Rx pads, ECG strips pasted in, Word discharge summaries)
- Mid-tier private: hybrid — HIS for billing/labs, clinical notes still handwritten
- Apollo/Fortis/Max: HIS + Augnito voice dictation (active, not ambient). Even here, cardiology-specific structured documentation is weak — most EMRs store free-text.

### Prescription flow in Indian cardiology
1. Handwritten prescription pad (NMC-mandated letterhead) — still dominant
2. EMR printout — used for IPD in Apollo/Fortis
3. **WhatsApp photo of handwritten Rx** — extremely common; fills the gap but medico-legal risk, no audit trail, misread errors
4. Digital Rx apps (eka.care, MyRx) — growing but not dominant

### Common Indian cardiac drug combinations to know
- Post-ACS DAPT: Aspirin 75mg OD + Clopidogrel 75mg OD (or Ticagrelor 90mg BD for high-risk)
- Post-PCI: DAPT + Atorvastatin 80mg HS + Ramipril 5mg OD + Metoprolol succinate 50mg OD
- AF anticoagulation: Warfarin (INR 2–3) for RHD/MS; NOACs (Rivaroxaban/Apixaban) for non-valvular AF
- Triple therapy (warfarin/NOAC + DAPT): common in AF+ACS overlap; used in 54% of Indian AF/ACS patients
- HF: Carvedilol + Ramipril + Furosemide + Spironolactone (RALES quadruple)

### Rheumatic heart disease — India-specific
- Mitral stenosis from rheumatic fever is disproportionately prevalent in India vs. the West
- AF + RHD requires warfarin (NOACs are NOT appropriate for rheumatic MS + AF — use warfarin, target INR 2.5–3.5)
- INR monitoring (every 4–6 weeks) is a routine touchpoint for these patients
- Key ICD codes: I05.0 (Rheumatic MS), I34.0 (Mitral regurgitation non-rheumatic), I08.0 (MS + MR)

### ICD-10 coding in Indian hospitals
- Codes assigned post-discharge by non-clinical medical coders from discharge summaries
- Required for: TPA/insurance claims, Ayushman Bharat PM-JAY, CGHS, ABDM FHIR
- Coding errors cause claim rejections — major hospital revenue problem
- Our real-time ICD suggestion at consultation is novel; no Indian product does this today

### Cath lab report — required fields
Every Indian cath lab form includes (beyond what we currently capture):
- Access site: radial (preferred) or femoral
- Catheter details: size (e.g. 6F), guide catheter type
- Contrast volume: mL used
- Fluoroscopy time: minutes
- LVEDP: mmHg (left ventricular end-diastolic pressure)
- Aortic pressure: systolic/diastolic at pullback
- Complications: nil / dissection / perforation / no-reflow / contrast reaction
- Stent details (if PCI done): vessel, stent brand, size (diameter × length mm), post-dilation balloon
- TIMI flow: pre and post intervention (0/1/2/3)
- Recommendation: PCI done / CABG referral / Medical management

### Disease epidemiology (for SOAP note context)
- Indians develop CAD 10 years earlier than Western populations (mean onset age ~56)
- STEMI = >60% of ACS presentations in India (vs 30–40% in West)
- ~3 million heart attacks per year in India
- Rheumatic heart disease disproportionately high
- CVD prevalence: 11% overall (urban 12%, rural 6%)
