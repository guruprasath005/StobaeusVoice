# StobaeusVoice — Progress Tracker

## Status: Admin Module Complete · Doctor Module Next

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
- [x] Wireframes — all 14 screens designed (open `StobaeusVoice Wireframes.html`)
- [x] Design system defined:
  - Primary: `#0EA5E9` teal-blue
  - Success: `#10B981` green
  - Warning: `#F59E0B` amber
  - Critical: `#EF4444` red
  - Font: **Kalam** (handwritten, headings + stat values) + **Inter** (body)
  - Cards: solid `1.5px #1a1a1a` border, dashed `1px #d4d4d2` internal dividers
  - Sidebar: 200px, `1.5px solid #1a1a1a` right border

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
- [x] `/dashboard/echo` — report list + template selector
- [x] `/dashboard/echo/[reportId]` — structured form (per template)
  - Echo: LV (EF%, LVEDD/LVESD, RWMA, LVH), RV, all valves (MR/MS/AR/AS/TR with grades + gradients), LA/RA, pericardium, IVC
  - Cath: access, dominance, LMCA/LAD/LCX/RCA stenosis per segment, TIMI flow, LVEDP, aortic BP, LV EF, recommendation (PCI/CABG/Medical)
  - Stress Test: protocol, HR/BP at baseline + peak, % MPHR (auto-calculated), ST changes + depth + leads, symptoms, Duke score, result
  - Holter: duration, dominant rhythm, AF burden, HR range, VPCs (count/burden/couplets/VT), SVT, longest pause, AV block, BBB
- [x] Dictation widget — mic → Whisper → appends to impression field
- [x] "Generate via AI" — GPT-4o reads structured findings + patient clinical context → impression + ICD-10 codes (no PII)
- [x] Autosave on field change (1.5s debounce)
- [x] "Finalize Report" → status = final, redirect to list
- [x] Backend: `echo_reports` table, `GET/POST /echo/reports`, `PATCH`, `/finalize`, `/generate-impression`, `/dictate`

### 3. Prescription Manager
- [ ] Drug list with cardiac interaction checker
- [ ] WhatsApp / Print / ABHA send

### 4. Cardiac Nurse Module
- [ ] Nurse station — bed grid, vitals logging, drip rates, handoff notes
- [ ] Voice log per bed

### 5. Clinical Alerts
- [ ] Drug interaction flags (warfarin + aspirin, etc.)
- [ ] Cardiac contraindication warnings
- [ ] ABDM compliance alerts

### 6. Voice Agent (Hands-free ward round)
- [ ] Large mic interface
- [ ] Voice command parsing — update vitals, show reports, schedule

### 7. Voice Bots (Phase 2)
- [ ] Patient Voice Bot — post-discharge cardiac symptom monitoring
- [ ] Appointment Bot — cardiology slot booking (multilingual)

### 8. Hospital Admin Dashboard
- [ ] Notes by cardiologist, compliance %, ABDM milestones, cost savings
- [ ] Doctor leaderboard

### 9. Settings
- [ ] Profile, EMR integrations, language, privacy

### 10. Production Readiness
- [ ] Swap OpenAI → self-hosted Llama 3.1 70B Q4 on Azure A100
- [ ] Swap SQLite → PostgreSQL on Azure India South
- [ ] Audio pipeline: in-memory only, no blob storage
- [ ] ABDM FHIR R4 output format
- [ ] DPDP Act 2023 compliance audit

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
| Font | Kalam (headings) + Inter (body) | Matches wireframe design system |
| Card style | 1.5px solid border + dashed dividers | Matches wireframe |

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
| `StobaeusVoice Wireframes.html` | Open in browser — all 14 screen designs |
| `backend/main.py` | FastAPI entry point |
| `backend/database.py` | DB schema — users, patients, consultations |
| `backend/routers/auth.py` | JWT login, user CRUD (admin) |
| `backend/services/transcription.py` | Whisper STT — audio never saved |
| `backend/services/note_generation.py` | GPT-4o SOAP note — no PII |
| `backend/services/echo_generation.py` | GPT-4o impression from structured findings — no PII |
| `backend/routers/echo.py` | Echo/Cath/Stress/Holter report CRUD + AI impression + dictation |
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
