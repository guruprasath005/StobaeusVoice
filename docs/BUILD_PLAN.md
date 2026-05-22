# StobaeusVoice — Build Plan

The reference for **what to build, why, and how it wires in**. Structured around
the real Indian cardiology hospital workflow. CLAUDE.md keeps the short priority
list; this file keeps the detail.

Last updated: 2026-05-22.

---

## 1. The traditional hospital workflow (what we are replacing)

A cardiac patient's journey through a private Indian cardiology hospital. The
hospital's HIS handles only billing, lab orders and pharmacy — **every clinical
note is handwritten or dictated-to-a-resident**. The 13 stages:

| # | Stage | What happens today (manual) | Paper artifact |
|---|-------|------------------------------|----------------|
| 1 | Registration | Clerk creates a cardboard folder + MRN; patient queues | Folder, MRN |
| 2 | OPD consultation | Cardiologist sees 40–60/day, ~10 min each; handwrites note + paper Rx | Handwritten note, Rx pad |
| 3 | Diagnostics | Patient walks the folder to ECG / echo / labs; results stapled in | ECG strip, echo sheet, lab printouts |
| 4 | Decision | Cardiologist re-reviews folder → medical mgmt / admit / cath | — |
| 5 | Admission | Bed assigned (CCU/HDU/Ward tiers); TPA pre-auth filed | Admission form, IP number |
| 6 | IPD case sheet | Resident hand-clerks the patient; consultant dictates admit orders | Bound case sheet |
| 7 | Cath lab | Angiogram ± PCI; cath form filled by hand, often incomplete | Cath/PCI report, stent sticker |
| 8 | Rounds & nurse charting | Consultant dictates one-liners AM; resident writes notes; nurse charts vitals on a bedside grid | Progress notes, nurse flow sheet |
| 9 | Step-down | CCU → HDU → Ward to cut cost (~₹6k/day delta) | Bed-transfer entries |
| 10 | Discharge | Resident hand-rebuilds the whole admission into a discharge summary — late, family waits | Discharge summary (free-text) |
| 11 | Billing & coding | Non-clinical coder assigns ICD-10 *after* discharge from the summary → claim rejections | Claim file |
| 12 | Going home | Handwritten Rx; family takes a WhatsApp photo of it | Paper Rx |
| 13 | After discharge | No follow-up call; patient drops off the radar until the next ER visit | — |

**Where time and money leak:** illegible free-text notes that can't be reused;
the discharge summary rebuilt from scratch; ICD coding done after-the-fact by a
non-clinician; information lost at every queue, shift change and bed transfer;
the patient unmonitored after discharge.

---

## 2. Product overlay — where StobaeusVoice fits

StobaeusVoice replaces the **clinical documentation layer** (not the HIS). Status
per stage:

| Stage | StobaeusVoice module | Status |
|-------|----------------------|--------|
| 1 Registration | `patients` (PII firewall, PT-id) | ✅ built · 🔧 appointment bot + ABHA scan |
| 2 OPD consult | `consultations` + `streaming` (dictation → GPT-4o SOAP + ICD) | ✅ built (B1 follow-up mode done) |
| 3 Diagnostics | `echo`, `radiology` (template dictation → AI impression) | ✅ built · 🔧 cath fields (B2), PACS (deferred) |
| 4 Decision | structured note + ICD surfaced to the doctor | ✅ inherent |
| 5 Admission | `ipd` + `admin_ipd` (admissions, bed tiers, ward CRUD) | ✅ built · 🔧 TPA pre-auth (B9) |
| 6 IPD case sheet | `ipd` admission note (dictation → AI SOAP + admit orders), STEMI fast-track | ✅ built |
| 7 Cath lab | `echo` cath template | ✅ built (B2) |
| 8 Rounds & charting | `ipd` AI progress notes; `nurse` bed logs | ✅ built · 🔧 nurse voice charting (B6) |
| 9 Step-down | `ipd` transfer (step up/down, audit trail) | ✅ built |
| 10 Discharge | `discharge` generate-from-admission (AI summary) | ✅ built · 🔧 letterhead PDF, pull OPD consult |
| 11 Billing & coding | ICD-10 generated at point of care | ✅ built · ✅ ABDM FHIR R4 export (B4) |
| 12 Going home | `prescription` (drug list, interactions, WhatsApp) | ✅ built · 🔧 EMR push (B8) |
| 13 After discharge | `voice_bot` | 🔧 partial — finish (B5) |

**Built spine:** OPD consult → diagnostics → admission → ward rounds → transfer →
discharge is working and smoke-tested. The gaps are the **two ends** (appointment
bot, follow-up bot), the **connective tissue** (ABDM/EMR push, unified timeline),
and **two depth gaps** (cath fields, clinical alerts).

---

## 3. Build backlog — detailed specs

Each item: goal · data model · backend · AI · frontend · acceptance.

### B1 — Follow-up OPD mode  ·  stage 2  ·  priority HIGH
The highest-frequency visit type; today cardiologists write 3–4 lines or nothing.
- **Goal:** for a returning patient, show the previous SOAP and capture only the
  delta (interval history, what changed, med adjustments).
- **Data model:** `Consultation.is_followup` and `previous_session_id` already
  exist — no migration.
- **Backend:** `/consultations/start` accepts `is_followup` + `previous_session_id`;
  resolve the patient's last `approved` consultation automatically.
- **AI:** `note_generation` follow-up prompt variant — takes the previous SOAP as
  context, outputs a delta note (carries forward unchanged items as "continued",
  highlights changes).
- **Frontend:** Start-Consultation modal flags returning patients and offers a
  "Follow-up" toggle; Active Consultation shows the previous SOAP in a side panel;
  review screen visually marks what changed.
- **Acceptance:** returning patient → previous note loads → dictate only changes →
  generated note references prior visit and marks continued vs changed.

### B2 — Cath lab report completeness  ·  stage 7  ·  priority HIGH
Every Indian cath form has fields we don't capture.
- **Goal:** extend the `cath` template with haemodynamics + procedure detail.
- **Fields:** `access_site` (radial/femoral), `catheter_size` (e.g. 6F),
  `contrast_volume_ml`, `fluoroscopy_time_min`, `lvedp_mmhg`, `aortic_pressure`
  (systolic/diastolic), `complications` (nil/dissection/perforation/no-reflow/
  contrast-reaction), `stents[]` `{vessel, brand, diameter_mm, length_mm,
  post_dilation}`, `timi_pre`, `timi_post`, `recommendation` (PCI done / CABG
  referral / medical management).
- **Data model:** stored in `EchoReport.findings` (JSON) under the cath template —
  no schema change.
- **Backend / AI:** extend the `echo_generation` cath prompt + the cath template
  field list; missing fields → `null`, never invented.
- **Frontend:** cath report form section for the new fields.
- **Acceptance:** a cath dictation populates all fields; FHIR-ready structure.

### B3 — Clinical alerts engine  ·  stages 2, 8  ·  priority HIGH
- **Goal:** flag drug interactions and cardiac contraindications at the point of
  prescribing / admitting.
- **Rules to cover:** triple therapy (warfarin + aspirin + clopidogrel),
  NOAC + antiplatelet, **NOAC contraindicated in rheumatic MS + AF** (must be
  warfarin, INR 2.5–3.5), renal dosing, bradycardia-risk stacking (beta-blocker +
  digoxin + diltiazem), QT-prolonging combinations.
- **Data model:** compute on the fly from meds + conditions; optionally persist
  dismissed/acknowledged alerts (`Alert` table — defer until needed).
- **Backend:** new `services/clinical_alerts.py` — input meds + conditions, output
  `[{severity, type, message}]`. Wire the existing `/consultations/alerts`
  endpoint and add a per-prescription check.
- **Frontend:** wire the existing Alerts page to real data; show inline alerts on
  the SOAP review and prescription screens.
- **Acceptance:** warfarin + DAPT → triple-therapy warning; NOAC + rheumatic MS →
  contraindication alert with the correct alternative.

### B4 — ABDM FHIR R4 export  ·  stage 11  ·  priority HIGH (mandatory)
- **Goal:** emit ABDM-compliant FHIR R4 for consultations and discharge summaries.
- **Backend:** new `services/fhir_export.py` — map `DischargeSummary` /
  `Consultation` → FHIR Bundle (Composition, Patient, Condition, MedicationRequest,
  Observation, Procedure). Endpoints `/discharge/{id}/fhir`, `/consultations/{id}/fhir`.
- **Dependencies:** ABHA linkage at registration; ABDM gateway sandbox credentials.
- **Acceptance:** output validates as FHIR R4; key clinical resources present.

### B5 — Post-discharge voice bot  ·  stage 13  ·  priority MEDIUM
`voice_bot` exists but is partial — finish it.
- **Goal:** scheduled outbound follow-up calls; symptom monitoring; INR-clinic
  reminders for warfarin / rheumatic-heart-disease patients.
- **Data model:** `VoiceBotCall` exists (`call_type`, `status`, `scheduled_at`,
  `transcript`, `summary`).
- **Backend:** auto-schedule a call on discharge; call-script service; transcript →
  `summary` `{symptom_status, alerts, follow_up_needed}`; escalation when a red-flag
  symptom is reported.
- **Acceptance:** discharge → call scheduled → completed → summary + escalation flag.

### B6 — Nurse Station voice charting  ·  stage 8  ·  priority MEDIUM
Wireframe Screen 06 exists; `nurse` bed logs exist.
- **Goal:** nurse speaks "Bed 4 BP 100/70, HR 88, dopamine 8 mcg/kg/min" → parsed
  into a structured `NurseBedLog`.
- **Backend:** nurse dictate endpoint + LLM extraction to the vitals/drips schema.
- **Frontend:** CCU bed grid + per-bed voice-log button + flow-sheet view.
- **Acceptance:** spoken vitals → correct structured row; bad audio → no invented values.

### B7 — Appointment bot (inbound)  ·  stage 1  ·  priority MEDIUM
`appointments` module is partial.
- **Goal:** multilingual (English + Tamil) phone/WhatsApp bot that books cardiology
  slots directly and pre-registers the patient.
- **Acceptance:** patient message → slot offered → `Appointment` created with
  `source="bot"`.

### B8 — EMR push adapters  ·  stages 2, 10, 12  ·  priority MEDIUM (per-hospital)
- **Goal:** push approved consultations / discharge summaries / prescriptions into
  the hospital's EMR.
- **Backend:** `services/emr/` adapter pattern — Practo, KareXpert, NIC eHospital,
  generic FHIR. Per-hospital config.
- **Acceptance:** approve → record appears in the target EMR (or sandbox).

### B9 — TPA pre-auth & claim packet  ·  stages 5, 11  ·  priority LOWER
- **Goal:** auto-assemble the insurer pre-authorisation (on admission) and the
  claim packet (on discharge) from Dx + ICD + summary.
- **Acceptance:** admission → pre-auth draft; discharge → claim packet with ICD.

### Deferred
- **DICOM / PACS import** — "Import from PACS" on echo/cath via WADO-RS + `pydicom`.
  Build on first hospital request. See CLAUDE.md "DICOM / PACS Integration Plan".
- **Self-hosted Llama (Phase 2)** — swap Azure OpenAI → vLLM + Llama at ~100 doctors.

---

## 4. Wire backlog — connect what already exists

| # | Task | Detail |
|---|------|--------|
| W1 | **Unified patient timeline** | One patient view stitching OPD consults + IPD admissions + echo/cath + prescriptions + discharge summaries in chronological order. Care-team read access already makes them visible — they now need to be merged into one timeline. |
| W2 | **OPD → IPD continuity** | When a consult leads to admission, link them so the admission note pre-loads OPD history and the discharge summary pulls the originating consult. |
| W3 | **Consult ↔ diagnostics link** | An echo/cath/radiology report ordered during a consult should attach to that `session_id`. |
| W4 | **Alerts page → real engine** | Wire the Alerts UI shell to the B3 `clinical_alerts` service. |
| W5 | **Admin dashboard → real data** | Replace mock data with real aggregates: notes per cardiologist, ABDM milestones, cost saved on transcription. |

---

## 5. Foundation — codebase refactor (running underneath)

Behaviour-preserving, phased, verified per phase. See memory `backend-refactor-plan`.
- **Phase 1 — DONE:** `config.py`, `models/` package, `db.py`, `core/errors.py`,
  pytest smoke harness.
- **Phase 2:** thin routers — extract `schemas/`, move logic to `services/` +
  `repositories/`.
- **Phase 3:** frontend design system — `components/ui/`, split `api.ts`, shared types.
- **Phase 4:** Alembic migrations + integration tests per workflow stage.
- **Phase 5:** optional module regrouping by workflow domain.

---

## 6. Suggested sequence

1. **B1 Follow-up OPD mode** — highest patient volume, schema already exists.
2. **B2 Cath completeness** + **B3 Clinical alerts** — depth gaps, safety.
3. **W1 Unified timeline** + **W2 OPD↔IPD continuity** — makes the built spine feel whole.
4. **B4 ABDM FHIR export** — mandatory for any real hospital pilot.
5. **B5 voice bot**, **B6 nurse charting**, **B7 appointment bot** — the journey ends.
6. **B8 EMR adapters**, **B9 TPA** — per-hospital integration, build on demand.

Refactor Phases 2–5 interleave as foundation between feature work.
