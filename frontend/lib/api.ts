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

  // Alerts
  getAlerts: () =>
    apiFetch(`${BASE}/consultations/alerts`).then(r => r.json()),

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

  updateTranscript: (sessionId: string, transcript: string) =>
    apiFetch(`${BASE}/consultations/${sessionId}/transcript`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    }).then(r => r.json()),

  generateNote: (sessionId: string) =>
    apiFetch(`${BASE}/consultations/${sessionId}/generate-note`, {
      method: "POST",
    }).then(r => r.json()),

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

  generateEchoImpression: (reportId: string) =>
    apiFetch(`${BASE}/echo/reports/${reportId}/generate-impression`, { method: "POST" }).then(r => r.json()),

  dictateEchoImpression: (reportId: string, audioBlob: Blob) => {
    const form = new FormData();
    form.append("audio", audioBlob, "audio.webm");
    return apiFetch(`${BASE}/echo/reports/${reportId}/dictate`, { method: "POST", body: form }).then(r => r.json());
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

  transcribeBedAudio: (bedId: string, audioBlob: Blob) => {
    const form = new FormData();
    form.append("audio", audioBlob, "audio.webm");
    return apiFetch(`${BASE}/nurse/beds/${bedId}/transcribe`, { method: "POST", body: form }).then(r => r.json());
  },

  // IPD Progress Notes
  getWardPatients: () =>
    apiFetch(`${BASE}/ipd/ward-patients`).then(r => r.json()),

  listIpdNotes: (patientId?: string) =>
    apiFetch(`${BASE}/ipd/notes${patientId ? `?patient_id=${patientId}` : ""}`).then(r => r.json()),

  createIpdNote: (data: { patient_id?: string; bed_id?: string; vitals?: Record<string, unknown>; status_text?: string; assessment?: string; plan?: string }) =>
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

  dictateRadiologyField: (reportId: string, audioBlob: Blob) => {
    const form = new FormData();
    form.append("audio", audioBlob, "audio.webm");
    return apiFetch(`${BASE}/radiology/reports/${reportId}/dictate`, { method: "POST", body: form }).then(r => r.json());
  },

  dictateIpdNote: (audioBlob: Blob) => {
    const form = new FormData();
    form.append("audio", audioBlob, "audio.webm");
    return apiFetch(`${BASE}/ipd/dictate`, { method: "POST", body: form }).then(r => r.json());
  },

  // Admin stats
  getAdminStats: () =>
    apiFetch(`${BASE}/consultations/admin-stats`).then(r => r.json()),

  // Discharge summaries
  generateDischargeSummary: (sessionId: string) =>
    apiFetch(`${BASE}/discharge/generate/${sessionId}`, { method: "POST" }).then(r => r.json()),

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
