# StobaeusVoice — Progress Tracker

## Status: Full clinical spine built · Next: B1 Follow-up OPD + B2 Cath depth + B3 Alerts engine

---

## ✅ Completed

### Research & Planning
- [x] Market research — India voice AI in hospitals (real data, sourced)
- [x] Competitive analysis — Augnito, Nuance, Sarvam, Gnani
- [x] Azure infrastructure cost calculation (3 scenarios: 50 / 200 / 500 doctors)
- [x] Feature set defined — 14 screens, all flows mapped
- [x] Tech stack decided — Next.js + FastAPI + OpenAI + JWT Auth + SQLite→Postgres
- [x] PII firewall architecture defined — patient personal data never reaches LLM
- [x] **Product pivoted to cardiology-only** — cardiologists, not all specialties

### Design
- [x] Wireframes — all 14 screens designed (open `design/StobaeusVoice Wireframes.html`)
- [x] Design system defined (post-rebrand):
  - Primary: `#E11D48` red-pink (rose scale — all branding, buttons, active states)
  - Success: `#10B981` green (clinical success only)
  - Warning: `#F59E0B` amber (clinical warning only)
  - Critical: `#EF4444` red (clinical critical only — severity also via icons/labels, not colour alone)
  - Font: **Poppins** everywhere (headings, body, IDs/times)
  - Cards: 12px radius, 1.5px solid border, white background
  - Sidebar: 200px, always present

### Auth (Complete)
- [x] JWT auth — FastAPI + python-jose + bcrypt (no Firebase)
- [x] Invite-only — no self-registration, admin creates all accounts
- [x] Roles: `cardiologist` / `cardiac_surgeon` / `cardiac_nurse` / `admin`
- [x] `/auth/login` — email + password → JWT (8hr expiry)
- [x] `/auth/me` — validate token, return user
- [x] `/auth/users/create` — admin only
- [x] `/auth/users` — list all users (admin only)
- [x] `/auth/users/{id}/toggle` — activate / deactivate
- [x] `/auth/users/{id}/reset-password` — reset any user's password
- [x] Role-based redirect: admin → `/admin`, others → `/dashboard`
- [x] Seed script: `python seed_admin.py` → creates `admin@stobaeus.com`

### Login Page (Complete)
- [x] Email + password form only
- [x] "Access by invitation only" message (no sign-up button)
- [x] Dot-grid background, card with shadow, teal CTA
- [x] Error messages from backend shown inline

### Admin Module (Complete)
- [x] `/admin` layout — sidebar (Overview, Users, Settings), role guard
- [x] `/admin` overview page — live user counts by role, recent users table
- [x] `/admin/users` — full user management:
  - Filter tabs by role
  - Create user modal (name, email, temp password, role, hospital)
  - Activate / Deactivate toggle per user
  - Reset password modal
- [x] `/admin/settings` — placeholder
- [ ] **Admin dashboard visuals — deferred until other modules are built:**
  - Notes by cardiologist (bar chart) — needs consultation data
  - Doctor compliance % and leaderboard — needs SOAP note approval data
  - ABDM milestone tracker — needs EMR push data
  - Cost savings widget (₹ saved on transcription) — needs consultation count × avg time
  - System-wide consultation stats — needs active doctor accounts
  - These will be wired with real data after doctor + nurse modules are complete

### Doctor Dashboard (Complete — mock data)
- [x] `/dashboard` layout — sidebar (Dashboard, Patients, Echo/Cath Lab, Prescriptions, Alerts, Settings)
- [x] Auth guard — redirects admin → `/admin`, unauthenticated → `/`
- [x] Stats cards — Consultations today, Time saved, Notes generated, Documentation %
- [x] SVG line chart — consultations this week (today highlighted)
- [x] Recent consultations table — patient ID, time, diagnosis, ICD-10 (teal), status dots
- [x] Right panel — Today's Queue + Activity feed

### Backend Scaffolding (Complete)
- [x] FastAPI app — CORS configured for localhost:3000
- [x] SQLite (dev) → PostgreSQL (prod) via `DATABASE_URL` env var
- [x] DB tables: `users`, `patients`, `patient_clinical`, `consultations`
- [x] `services/transcription.py` — Whisper STT (audio in memory, never stored)
- [x] `services/note_generation.py` — GPT-4o SOAP note (no PII in prompt)
- [x] `routers/patients.py` — register, search, clinical context
- [x] `routers/consultations.py` — start, transcribe, generate-note, approve

---

## 🚧 In Progress / Next Up (in order)

### 1. Doctor Module
- [x] Patients page — `/dashboard/patients`
  - Patient list with search (by name / ABHA / MRN / PT-ID)
  - Right-panel patient detail — conditions, meds, allergies, blood group, ABHA
  - "Consult" shortcut per row, "Register Patient" / "Start Consultation" header actions
- [x] Start Consultation modal (Screen 0A) — `/dashboard/consultation/new`
  - Search existing patient or register new
  - Anonymous consultation option (PT-ANON)
  - Pre-fill patient when navigated from patients page
- [x] New Patient Registration (Screen 0B) — inline in Start Consultation flow
  - Identity section (PII — stored in DB only, never sent to LLM)
  - Clinical context section (age, conditions, meds, allergies — LLM-safe)
  - Tag-based condition/allergy entry, medication drug+dose+freq form
- [x] Active Consultation (Screen 03) — `/dashboard/consultation/[sessionId]`
  - MediaRecorder → audio blob → POST to `/consultations/{id}/transcribe`
  - Live waveform animation, recording timer
  - Editable transcript area, word count
  - Patient context sidebar (clinical only — no PII)
  - PII firewall badge in sidebar
  - "Stop & Generate SOAP Note" button
- [x] Cardiac SOAP Note Review (Screen 04) — `/dashboard/consultation/[sessionId]/review`
  - Transcript (left panel, editable) + generated note (right)
  - Editable S/O/A/P sections
  - ICD-10 codes with add/remove
  - Prescription list with remove
  - "Approve & Save" → marks approved, redirects to dashboard
- [x] Backend: `GET /patients` list endpoint + `GET /patients/{id}` detail

### 2. Echo / Cath Lab Dictation
- [x] Template selector tiles — Echo / Cath / Stress Test / Holter
- [x] `/dashboard/echo` — report list + template selector with patient picker before draft creation
- [x] `/dashboard/echo/[reportId]` — structured form (per template)
  - Echo: LV (EF%, LVEDD/LVESD, RWMA, LVH), RV, all valves (MR/MS/AR/AS/TR with grades + gradients), LA/RA, pericardium, IVC
  - Cath: access, dominance, LMCA/LAD/LCX/RCA stenosis per segment, TIMI flow, LVEDP, aortic BP, LV EF, recommendation (PCI/CABG/Medical), stent details, complications multi-select
  - Stress Test: protocol, HR/BP at baseline + peak, % MPHR (auto-calculated), ST changes + depth + leads, symptoms, Duke score, result
  - Holter: duration, dominant rhythm, AF burden, HR range, VPCs (count/burden/couplets/VT), SVT, longest pause, AV block, BBB
- [x] **Live Deepgram dictation** (Nova-3 `language=multi`, Tamil + English) — replaced Whisper batch; transcript appears live in target field
- [x] **Template-aware AI extraction** — `Generate via AI` now fills every structured field (dropdowns, numbers, text) AND impression AND ICD-10 codes for ALL 4 templates. Per-template field schemas in `backend/services/echo_generation.py`; dropdown options enforced verbatim; validator drops invalid values post-LLM.
- [x] Autosave on field change (1.5s debounce)
- [x] "Finalize Report" → status = final, redirect to list

### 3. Prescription Manager (COMPLETE)
- [x] `/dashboard/prescriptions` — list + filter, status badges, WhatsApp-sent timestamps
- [x] `/dashboard/prescriptions/[rxId]` — diagnosis, medications, notes
- [x] 61-drug Indian cardiac catalogue with category + default dose/freq, drug search w/ custom add
- [x] **Cardiac interaction checker** — 14 rules covering triple antithrombotic, warfarin+amiodarone, digoxin+amiodarone, BB+verapamil, ACEi+spironolactone (hyperK), NOAC+antiplatelet, statin+amiodarone (myopathy). High/moderate severity. Triple-therapy suppresses redundant subset warnings.
- [x] **Dictation panel + live transcript review** (right column) — doctor dictates, transcript appears live, can be edited
- [x] **Generate from Dictation** — GPT-4o extracts `{diagnosis, drugs[], notes}` from transcript; drug names canonicalised against the 61-drug catalog; freq mapped to `OD/BD/TDS/QID/HS/SOS/...`; duration mapped to `7 days/.../Lifelong`; merges with existing drugs (no overwrite). Backend: `services/prescription_generation.py` + `POST /prescriptions/{rx_id}/generate-from-dictation`.
- [x] **Confirm & Lock** — `POST /prescriptions/{rx_id}/confirm` sets `status=confirmed`; PATCH returns 409 once locked; frontend disables every editable control + hides dictation/confirm cards + shows green `✓ Confirmed` badge
- [x] **WhatsApp send** — backend formats Rx as text, frontend rewrites `wa.me` → `whatsapp://send?phone=…` desktop deep link so WhatsApp Desktop opens to the patient's registered number with prescription pre-filled. Print-to-PDF dialog triggers alongside so doctor can attach PDF manually (WhatsApp URL API does not allow auto-attach).
- [x] **Print** — fixed broken `visibility: hidden/visible` rule that couldn't override `display:none`; print container now flips to `display:block` in `@media print` with `@page` size rule.

### 4. Radiology (COMPLETE)
- [x] `/dashboard/radiology` — 6 templates (CXR, CT Cardiac, CT PA, Cardiac MRI, Lipid Profile, HbA1c) with template-stamped cards
- [x] **Patient-first flow** — clicking any template opens `PatientSearchModal`; existing patient + template combo opens the existing draft (no duplicates); anonymous always creates a new draft
- [x] **Template switching preserves patient** — chip click on detail page saves current edits, looks up patient + new template, opens existing report or creates fresh draft for same patient. Anonymous reports get fresh drafts per template.
- [x] Per-field live dictation + global impression dictation (live Deepgram)
- [x] AI impression generation (GPT-4o) with template label in prompt
- [x] `/dashboard/radiology/[reportId]` — structured fields per template + DICOM placeholder

### 5. Active Consultation (UPDATED)
- [x] Live Deepgram WS dictation streaming straight into the transcript pane (was already live; still good)
- [x] Tamil → English transcript normalisation before SOAP gen
- [x] Follow-up detection (180d window) + "Previous Visit" tab on review page
- [x] Auto-create Prescription record on consultation approve

### 6. Nurse + IPD (COMPLETE)
- [x] Nurse station — 12-bed grid, vitals logging form, drip rates, regex vitals parser
- [x] Voice log per bed — **live Deepgram** transcription populates the voice-text box; existing "Parse & Log" extracts vitals via regex
- [x] **Full IPD flow** (commit `7b6cbcb`) — Admission, bed tiers (CCU/HDU/Ward/Private), STEMI fast-track, AI admission + progress notes, bed transfers, discharge-from-admission
- [x] **Admin IPD** — ward CRUD, bed CRUD, admin configures tiers per hospital
- [x] Care-team record access — patient records readable by whole care team; mutations stay owner-locked

### 7. Discharge Summary (COMPLETE)
- [x] `/dashboard/discharge/[summaryId]` — sections + meds + ICD codes
- [x] AI generation from SOAP + ICD + meds + echo impressions
- [x] WhatsApp send (patient-friendly format)

### 8. Voice Bot — placeholder records only (no real call engine)
- [x] `/dashboard/voice-bot` — list eligible patients, trigger/cancel call records
- [ ] Actual outbound call infrastructure (Phase 2)

### 9. Appointments (COMPLETE)
- [x] `/dashboard/appointments` — slot picker, 14 slots/day, doctor + patient assignment

### 10. Clinical Alerts (PARTIAL)
- [x] `/dashboard/alerts` — pending consultations + draft echo reports needing impression
- [x] Drug interaction flags already in prescription page (see §3)
- [ ] Cardiac contraindication warnings, ABDM compliance alerts

### 11. Hospital Admin Dashboard (DATA WIRED)
- [x] `/admin` — overview, users, settings
- [x] `/consultations/admin-stats` — month totals, by-doctor leaderboard, cost savings (₹500/note × approved), ABDM milestone tracker

### 12. Production Readiness
- [x] PostgreSQL via `DATABASE_URL` env var (was SQLite, switched per prior commit `69c2e33`)
- [x] DPDP access audit log (`AccessLog` table) — who viewed/exported which patient
- [x] Record ownership enforcement (`assert_owner`) on every detail endpoint
- [x] Audio never written to disk — in-memory only via OpenAI / streamed over WS to Deepgram
- [ ] Swap OpenAI → self-hosted Llama 3.1 70B Q4 on Azure A100 (Phase 2)
- [ ] Swap STT → self-hosted Whisper on Azure A10 (Phase 2)
- [ ] ABDM FHIR R4 output format
- [ ] DPDP Act 2023 full compliance audit

---

## Build backlog — next items

Full specs in `docs/BUILD_PLAN.md`. Priority order:

| # | Item | Status | Priority |
|---|------|--------|----------|
| B1 | Follow-up OPD mode | Not built — schema exists, need backend endpoint + AI prompt variant + frontend delta-view | HIGH |
| B2 | Cath lab completeness | Partial — `access_site`, `contrast_volume_ml`, `fluoroscopy_time_min`, `lvedp_mmhg`, `stents[]`, `timi_pre/post` missing from form + AI extraction | HIGH |
| B3 | Clinical alerts engine | Not built — `services/clinical_alerts.py` doesn't exist; Alerts page needs real drug-interaction rules | HIGH |
| B4 | ABDM FHIR R4 export | Not built — mandatory for any hospital pilot | HIGH |
| B5 | Post-discharge voice bot | Partial — placeholder records; no real call engine | MEDIUM |
| B6 | Nurse Station voice charting | Partial — voice log exists but no structured vitals parse via LLM | MEDIUM |
| B7 | Appointment bot | Partial — appointments module exists, no bot | MEDIUM |
| B8 | EMR push adapters | Not built (per-hospital, build on demand) | MEDIUM |
| B9 | TPA pre-auth & claim packet | Not built | LOWER |

Wire tasks:
- W1 Unified patient timeline (OPD + IPD + echo + Rx + discharge in one view)
- W2 OPD → IPD continuity (admission pre-loads from OPD SOAP)
- W3 Consult ↔ diagnostics link
- W4 Alerts page → real B3 engine
- W5 Admin dashboard → real aggregates

Backend refactor Phases 2–5 pending (interleave as foundation):
- Phase 2: thin routers — extract `schemas/`, move logic to `services/` + `repositories/`
- Phase 3: frontend design system — `components/ui/`, split `api.ts`, shared types
- Phase 4: Alembic migrations + integration tests
- Phase 5: optional module regrouping by workflow domain

---

## Architecture Decisions Locked

| Decision | Choice | Reason |
|---|---|---|
| Product focus | **Cardiology only** | Highest documentation burden, early adopters |
| Auth | JWT (FastAPI + bcrypt) | No Firebase — invite-only B2B access |
| Frontend | Next.js 16 App Router | SSR, PWA-ready |
| Backend | FastAPI (Python) | AI pipeline friendly |
| Database (dev) | SQLite | No Docker needed |
| Database (prod) | PostgreSQL on Azure India South | DPDP compliant |
| STT | OpenAI Whisper API (dev) | No GPU needed |
| Note Gen | OpenAI GPT-4o (dev) | Best accuracy |
| STT (prod) | Self-hosted Whisper on Azure A10 | Cost + compliance |
| Note Gen (prod) | Llama 3.1 70B Q4 on Azure A100 | Cost + compliance at scale |
| Audio storage | **None** | DPDP compliance — audio discarded after transcription |
| PII to LLM | **Never** | Only age, conditions, meds, allergies sent |
| Font | **Poppins** everywhere | Post-rebrand — replaces Kalam/Inter |
| Card style | 12px radius, 1.5px solid border, white bg | Matches current CLAUDE.md design system |
| Accent colour | **`#E11D48` red-pink** | Post-rebrand (commit 20e3b31) |

---

## How to Run

```bash
# Backend
cd /Users/guruprasath/Documents/StobaeusVoice/backend
source ../venv/bin/activate
python seed_admin.py        # first time only — creates admin@stobaeus.com / admin123
uvicorn main:app --reload
# API docs: http://localhost:8000/docs

# Frontend
cd /Users/guruprasath/Documents/StobaeusVoice/frontend
npm run dev
# App: http://localhost:3000
```

**Test accounts:**
| Email | Password | Role | Access |
|---|---|---|---|
| admin@stobaeus.com | admin123 | admin | `/admin` — user management |
| (create via admin) | (set by admin) | cardiologist | `/dashboard` |

---

## Key Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Full project context — read this first |
| `PROGRESS.md` | This file |
| `design/StobaeusVoice Wireframes.html` | Open in browser — all 14 screen designs |
| `backend/main.py` | FastAPI entry point (lifespan, config-driven CORS) |
| `backend/db.py` | engine, SessionLocal, get_db, init_db (replaces old database.py) |
| `backend/models/` | SQLAlchemy models split by domain (user, patient, consultation, diagnostics, prescription, discharge, ipd, engagement, audit) |
| `backend/config.py` | Pydantic-settings `Settings` — all secrets/config in one place |
| `backend/core/errors.py` | Catch-all 500 handler |
| `backend/routers/auth.py` | JWT login, user CRUD (admin) |
| `backend/services/transcription.py` | Whisper STT — audio never saved |
| `backend/services/note_generation.py` | GPT-4o SOAP note — no PII |
| `backend/services/echo_generation.py` | GPT-4o **template-aware extraction** (echo/cath/stress/holter): fills structured fields + impression + ICD codes from dictation. Per-template schemas with verbatim dropdown options + post-LLM validator. |
| `backend/services/prescription_generation.py` | GPT-4o prescription extraction: canonicalises drug names against 61-drug Indian cardiac catalog; freq/duration mapped to allowed lists |
| `backend/routers/echo.py` | Echo/Cath/Stress/Holter report CRUD + AI extraction; generation merges findings into existing record |
| `backend/routers/prescriptions.py` | Rx CRUD + `generate-from-dictation` + `confirm` (lock) + WhatsApp link; PATCH 409s once confirmed |
| `frontend/lib/useLiveDictation.ts` | Live Deepgram WS hook + `useLiveAppend` helper used by every dictation surface |
| `frontend/components/PatientSearchModal.tsx` | Reusable patient picker — search by name/ABHA/MRN/PT-ID, anonymous option |
| `backend/seed_admin.py` | Create first admin user |
| `frontend/lib/auth-context.tsx` | JWT auth state (localStorage token) |
| `frontend/lib/api.ts` | Backend API client |
| `frontend/app/page.tsx` | Login page |
| `frontend/app/admin/` | Admin module (overview + users) |
| `frontend/app/dashboard/` | Doctor dashboard (mock data) |
| `frontend/app/dashboard/patients/` | Patient list + search + detail panel |
| `frontend/app/dashboard/consultation/new/` | Start Consultation — search / register / anonymous |
| `frontend/app/dashboard/consultation/[sessionId]/` | Active Consultation — recording + transcript |
| `frontend/app/dashboard/consultation/[sessionId]/review/` | SOAP Note Review — edit + approve |
| `frontend/app/dashboard/echo/` | Echo/Cath template selector + reports list |
| `frontend/app/dashboard/echo/[reportId]/` | Structured report form (all 4 templates) |
| `frontend/.env.local` | Keys — never commit |
