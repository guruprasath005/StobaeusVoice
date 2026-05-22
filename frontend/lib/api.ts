const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Auth helpers ───────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sv_token");
}

function bearerHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// Fetch wrapper that always includes Authorization header.
// For FormData uploads do NOT pass Content-Type — browser sets it with boundary.
function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = bearerHeaders(options.headers as Record<string, string> ?? {});
  return fetch(url, { ...options, headers });
}

// ── API client ─────────────────────────────────────────────────────

export const api = {
  // Auth / Profile
  updateProfile: async (data: { full_name?: string; hospital?: string }) => {
    const res = await apiFetch(`${BASE}/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  changePassword: async (data: { current_password: string; new_password: string }) => {
    const res = await apiFetch(`${BASE}/auth/me/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  // Workflow alerts (pending approvals)
  getAlerts: () =>
    apiFetch(`${BASE}/consultations/alerts`).then(r => r.json()),

  // Clinical safety alerts
  checkClinicalAlerts: (
    meds: { drug: string; dose?: string; freq?: string }[],
    conditions: string[],
    conditionOnly = false,
  ) =>
    apiFetch(`${BASE}/clinical-alerts/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meds, conditions, condition_only: conditionOnly }),
    }).then(r => r.json()),

  getActiveClinicalAlerts: () =>
    apiFetch(`${BASE}/clinical-alerts/active`).then(r => r.json()),

  getPatientClinicalAlerts: (patientId: string) =>
    apiFetch(`${BASE}/clinical-alerts/patient/${patientId}`).then(r => r.json()),

  // Patients
  listPatients: (q?: string, skip = 0, limit = 30) =>
    apiFetch(`${BASE}/patients?skip=${skip}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`).then(r => r.json()),

  searchPatients: (q: string) =>
    apiFetch(`${BASE}/patients/search?q=${encodeURIComponent(q)}`).then(r => r.json()),

  getPatient: (patientId: string) =>
    apiFetch(`${BASE}/patients/${patientId}`).then(r => r.json()),

  updatePatientClinical: (patientId: string, data: { conditions?: string[]; medications?: unknown[]; allergies?: string[]; blood_group?: string }) =>
    apiFetch(`${BASE}/patients/${patientId}/clinical`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  getPatientConsultations: (patientId: string) =>
    apiFetch(`${BASE}/patients/${patientId}/consultations`).then(r => r.json()),

  // Clinical context only — PII-safe payload for the consultation panel.
  getClinicalContext: (patientId: string) =>
    apiFetch(`${BASE}/patients/${patientId}/clinical`).then(r => (r.ok ? r.json() : null)),

  registerPatient: (data: Record<string, unknown>) =>
    apiFetch(`${BASE}/patients/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // Consultations
  startConsultation: (patientId?: string) =>
    apiFetch(`${BASE}/consultations/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    }).then(r => r.json()),

  transcribeAudio: (sessionId: string, audioBlob: Blob) => {
    const form = new FormData();
    form.append("audio", audioBlob, "audio.webm");
    return apiFetch(`${BASE}/consultations/${sessionId}/transcribe`, {
      method: "POST",
      body: form,
    }).then(r => r.json());
  },

  updateTranscript: async (sessionId: string, transcript: string) => {
    const res = await apiFetch(`${BASE}/consultations/${sessionId}/transcript`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  generateNote: async (sessionId: string) => {
    const res = await apiFetch(`${BASE}/consultations/${sessionId}/generate-note`, {
      method: "POST",
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  approveNote: (sessionId: string, soapNote: Record<string, unknown>, prescription?: unknown[]) =>
    apiFetch(`${BASE}/consultations/${sessionId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soap_note: soapNote, prescription }),
    }).then(r => r.json()),

  getDashboardStats: () =>
    apiFetch(`${BASE}/consultations/dashboard-stats`).then(r => r.json()),

  getConsultation: (sessionId: string) =>
    apiFetch(`${BASE}/consultations/${sessionId}`).then(r => r.json()),

  discardConsultation: (sessionId: string) =>
    apiFetch(`${BASE}/consultations/${sessionId}`, { method: "DELETE" }).then(r => r.json()),

  // Echo / Cath Lab / Stress Test / Holter reports
  createEchoReport: (template: string, patientId?: string) =>
    apiFetch(`${BASE}/echo/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, patient_id: patientId }),
    }).then(r => r.json()),

  listEchoReports: (patientId?: string) =>
    apiFetch(`${BASE}/echo/reports${patientId ? `?patient_id=${patientId}` : ""}`).then(r => r.json()),

  getEchoReport: (reportId: string) =>
    apiFetch(`${BASE}/echo/reports/${reportId}`).then(r => r.json()),

  saveEchoReport: (reportId: string, findings: Record<string, unknown>, impression?: string, icdCodes?: unknown[]) =>
    apiFetch(`${BASE}/echo/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings, impression, icd_codes: icdCodes }),
    }).then(r => r.json()),

  finalizeEchoReport: (reportId: string, findings: Record<string, unknown>, impression: string, icdCodes?: unknown[]) =>
    apiFetch(`${BASE}/echo/reports/${reportId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings, impression, icd_codes: icdCodes }),
    }).then(r => r.json()),

  setEchoReportPatient: async (reportId: string, patientId: string | null) => {
    const res = await apiFetch(`${BASE}/echo/reports/${reportId}/patient`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  generateEchoImpression: async (reportId: string) => {
    const res = await apiFetch(`${BASE}/echo/reports/${reportId}/generate-impression`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  // PACS / DICOMweb
  pacsSearch: (params: {
    wado_base: string; patient_id?: string; accession_number?: string;
    study_date?: string; modality?: string; username?: string; password?: string;
  }) =>
    apiFetch(`${BASE}/pacs/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).then(r => r.json()),

  pacsImport: (params: {
    wado_base: string; study_uid: string; template: string;
    username?: string; password?: string;
  }) =>
    apiFetch(`${BASE}/pacs/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).then(r => r.json()),

  pacsUpload: (file: File, template: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("template", template);
    return apiFetch(`${BASE}/pacs/upload`, { method: "POST", body: form }).then(r => r.json());
  },

  // Prescriptions
  listPrescriptions: (patientId?: string) =>
    apiFetch(`${BASE}/prescriptions${patientId ? `?patient_id=${patientId}` : ""}`).then(r => r.json()),

  createPrescription: (data: { patient_id?: string; session_id?: string; diagnosis?: string; drugs?: unknown[]; notes?: string }) =>
    apiFetch(`${BASE}/prescriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  getPrescription: (rxId: string) =>
    apiFetch(`${BASE}/prescriptions/${rxId}`).then(r => r.json()),

  updatePrescription: (rxId: string, data: { diagnosis?: string; drugs?: unknown[]; notes?: string }) =>
    apiFetch(`${BASE}/prescriptions/${rxId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  sendWhatsApp: (rxId: string) =>
    apiFetch(`${BASE}/prescriptions/${rxId}/send-whatsapp`, { method: "POST" }).then(r => r.json()),

  generatePrescriptionFromDictation: async (rxId: string, transcript: string) => {
    const res = await apiFetch(`${BASE}/prescriptions/${rxId}/generate-from-dictation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body as {
      diagnosis: string;
      drugs: { drug: string; dose: string; freq: string; duration: string; instructions: string }[];
      notes: string;
    };
  },

  confirmPrescription: async (rxId: string) => {
    const res = await apiFetch(`${BASE}/prescriptions/${rxId}/confirm`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body as { status: string };
  },

  // Nurse Station
  listBeds: () =>
    apiFetch(`${BASE}/nurse/beds`).then(r => r.json()),

  getBedHistory: (bedId: string) =>
    apiFetch(`${BASE}/nurse/beds/${bedId}/history`).then(r => r.json()),

  logBedVitals: (bedId: string, data: {
    patient_id?: string; patient_name?: string;
    bp?: string; hr?: number; spo2?: number; temp?: string; rr?: number;
    drips?: { name: string; rate: string; unit: string }[]; notes?: string;
  }) =>
    apiFetch(`${BASE}/nurse/beds/${bedId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  voiceBedLog: (bedId: string, text: string) =>
    apiFetch(`${BASE}/nurse/beds/${bedId}/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then(r => r.json()),

  // IPD: catalogue (wards/tiers/beds for Admit modal)
  getIpdCatalogue: () =>
    apiFetch(`${BASE}/ipd/catalogue`).then(r => r.json()),

  // IPD: admissions
  createAdmission: async (data: { patient_id?: string | null; bed_id: string; mode?: "standard" | "stemi_fast_track" }) => {
    const res = await apiFetch(`${BASE}/ipd/admissions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  listAdmissions: (status: string = "active") =>
    apiFetch(`${BASE}/ipd/admissions?status=${status}`).then(r => r.json()),

  getAdmission: (admissionId: string) =>
    apiFetch(`${BASE}/ipd/admissions/${admissionId}`).then(r => r.json()),

  generateAdmissionNote: async (admissionId: string, transcript: string) => {
    const res = await apiFetch(`${BASE}/ipd/admissions/${admissionId}/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body;
  },

  updateAdmission: (admissionId: string, data: Record<string, unknown>) =>
    apiFetch(`${BASE}/ipd/admissions/${admissionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  dischargeAdmission: (admissionId: string) =>
    apiFetch(`${BASE}/ipd/admissions/${admissionId}/discharge`, { method: "POST" }).then(r => r.json()),

  transferAdmission: async (admissionId: string, data: { to_bed_id: string; reason?: string }) => {
    const res = await apiFetch(`${BASE}/ipd/admissions/${admissionId}/transfer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body as { ok: boolean; transfer_id: string; direction: "step_up" | "step_down" | "lateral"; admission: Record<string, unknown> };
  },

  listTransfers: (admissionId: string) =>
    apiFetch(`${BASE}/ipd/admissions/${admissionId}/transfers`).then(r => r.json()),

  // Admin: IPD catalogue CRUD
  adminListWards: () => apiFetch(`${BASE}/admin/ipd/wards`).then(r => r.json()),
  adminCreateWard: (data: Record<string, unknown>) =>
    apiFetch(`${BASE}/admin/ipd/wards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  adminUpdateWard: (id: string, data: Record<string, unknown>) =>
    apiFetch(`${BASE}/admin/ipd/wards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  adminDeleteWard: (id: string) =>
    apiFetch(`${BASE}/admin/ipd/wards/${id}`, { method: "DELETE" }).then(r => r.json()),

  adminListTiers: () => apiFetch(`${BASE}/admin/ipd/tiers`).then(r => r.json()),
  adminCreateTier: (data: Record<string, unknown>) =>
    apiFetch(`${BASE}/admin/ipd/tiers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  adminUpdateTier: (id: string, data: Record<string, unknown>) =>
    apiFetch(`${BASE}/admin/ipd/tiers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  adminDeleteTier: (id: string) =>
    apiFetch(`${BASE}/admin/ipd/tiers/${id}`, { method: "DELETE" }).then(r => r.json()),

  adminListBeds: () => apiFetch(`${BASE}/admin/ipd/beds`).then(r => r.json()),
  adminCreateBed: (data: Record<string, unknown>) =>
    apiFetch(`${BASE}/admin/ipd/beds`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  adminUpdateBed: (id: string, data: Record<string, unknown>) =>
    apiFetch(`${BASE}/admin/ipd/beds/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
  adminDeleteBed: (id: string) =>
    apiFetch(`${BASE}/admin/ipd/beds/${id}`, { method: "DELETE" }).then(r => r.json()),

  // IPD Progress Notes
  getWardPatients: () =>
    apiFetch(`${BASE}/ipd/ward-patients`).then(r => r.json()),

  listIpdNotes: (opts?: { patient_id?: string; admission_id?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.admission_id) qs.set("admission_id", opts.admission_id);
    else if (opts?.patient_id) qs.set("patient_id", opts.patient_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch(`${BASE}/ipd/notes${suffix}`).then(r => r.json());
  },

  generateProgressNote: async (admissionId: string) => {
    const res = await apiFetch(`${BASE}/ipd/admissions/${admissionId}/generate-progress`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body as { status_text: string | null; assessment: string | null; plan: string | null; vitals_used: Record<string, unknown> | null; prior_note_count: number };
  },

  createIpdNote: (data: { patient_id?: string; admission_id?: string; bed_id?: string; vitals?: Record<string, unknown>; status_text?: string; assessment?: string; plan?: string }) =>
    apiFetch(`${BASE}/ipd/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  updateIpdNote: (noteId: string, data: { status_text?: string; assessment?: string; plan?: string }) =>
    apiFetch(`${BASE}/ipd/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // Voice Bot
  listVoiceBotCalls: () =>
    apiFetch(`${BASE}/voice-bot/calls`).then(r => r.json()),

  triggerVoiceBotCall: (data: { patient_id: string; call_type?: string; scheduled_at?: string }) =>
    apiFetch(`${BASE}/voice-bot/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  cancelVoiceBotCall: (callId: string) =>
    apiFetch(`${BASE}/voice-bot/calls/${callId}`, { method: "DELETE" }).then(r => r.json()),

  completeVoiceBotCall: (callId: string, transcript: string) =>
    apiFetch(`${BASE}/voice-bot/calls/${callId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    }).then(r => r.json()),

  getEligiblePatients: () =>
    apiFetch(`${BASE}/voice-bot/eligible-patients`).then(r => r.json()),

  // Appointments
  listAppointments: (date?: string, doctorId?: string) =>
    apiFetch(`${BASE}/appointments${date ? `?date=${date}${doctorId ? `&doctor_id=${doctorId}` : ""}` : ""}`).then(r => r.json()),

  createAppointment: (data: { patient_id?: string; patient_name?: string; doctor_id?: string; slot_date: string; slot_time: string; appt_type?: string; notes?: string }) =>
    apiFetch(`${BASE}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  updateAppointment: (apptId: string, data: Record<string, unknown>) =>
    apiFetch(`${BASE}/appointments/${apptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  cancelAppointment: (apptId: string) =>
    apiFetch(`${BASE}/appointments/${apptId}`, { method: "DELETE" }).then(r => r.json()),

  getAvailableSlots: (date: string, doctorId?: string) =>
    apiFetch(`${BASE}/appointments/slots/${date}${doctorId ? `?doctor_id=${doctorId}` : ""}`).then(r => r.json()),

  appointmentBotChat: (message: string, history: { role: string; content: string }[]) =>
    apiFetch(`${BASE}/appointments/bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    }).then(r => r.json()),

  // Radiology
  listRadiologyReports: (patientId?: string, template?: string) =>
    apiFetch(`${BASE}/radiology/reports${patientId ? `?patient_id=${patientId}` : ""}${template ? `${patientId ? "&" : "?"}template=${template}` : ""}`).then(r => r.json()),

  createRadiologyReport: (template: string, patientId?: string) =>
    apiFetch(`${BASE}/radiology/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, patient_id: patientId }),
    }).then(r => r.json()),

  getRadiologyReport: (reportId: string) =>
    apiFetch(`${BASE}/radiology/reports/${reportId}`).then(r => r.json()),

  saveRadiologyReport: (reportId: string, findings: Record<string, unknown>, impression?: string, icdCodes?: unknown[]) =>
    apiFetch(`${BASE}/radiology/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings, impression, icd_codes: icdCodes }),
    }).then(r => r.json()),

  finalizeRadiologyReport: (reportId: string, findings: Record<string, unknown>, impression: string, icdCodes?: unknown[]) =>
    apiFetch(`${BASE}/radiology/reports/${reportId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings, impression, icd_codes: icdCodes }),
    }).then(r => r.json()),

  generateRadiologyImpression: (reportId: string) =>
    apiFetch(`${BASE}/radiology/reports/${reportId}/generate-impression`, { method: "POST" }).then(r => r.json()),

  // Admin stats
  getAdminStats: () =>
    apiFetch(`${BASE}/consultations/admin-stats`).then(r => r.json()),

  // FHIR R4 export (ABDM)
  getConsultationFhir: (sessionId: string) =>
    apiFetch(`${BASE}/fhir/consultations/${sessionId}`).then(r => r.json()),

  getDischargeFhir: (summaryId: string) =>
    apiFetch(`${BASE}/fhir/discharge/${summaryId}`).then(r => r.json()),

  // Discharge summaries
  generateDischargeSummary: (sessionId: string) =>
    apiFetch(`${BASE}/discharge/generate/${sessionId}`, { method: "POST" }).then(r => r.json()),

  generateDischargeFromAdmission: async (admissionId: string) => {
    const res = await apiFetch(`${BASE}/discharge/generate-from-admission/${admissionId}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
    return body as { summary_id: string; existing: boolean; admission_id?: string; discharged_at?: string };
  },

  getDischargeSummary: (summaryId: string) =>
    apiFetch(`${BASE}/discharge/${summaryId}`).then(r => r.json()),

  updateDischargeSummary: (summaryId: string, data: { sections?: Record<string, unknown>; discharge_meds?: unknown[]; icd_codes?: unknown[] }) =>
    apiFetch(`${BASE}/discharge/${summaryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  finalizeDischargeSummary: (summaryId: string) =>
    apiFetch(`${BASE}/discharge/${summaryId}/finalize`, { method: "POST" }).then(r => r.json()),

  sendDischargeSummaryWhatsApp: (summaryId: string) =>
    apiFetch(`${BASE}/discharge/${summaryId}/send-whatsapp`, { method: "POST" }).then(r => r.json()),
};
