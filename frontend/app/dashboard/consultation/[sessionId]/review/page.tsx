"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface SoapNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  icd_codes?: { code: string; description: string }[];
  prescription?: { drug: string; dose?: string; freq?: string; duration?: string; instructions?: string }[];
}

interface PreviousConsultation {
  session_id: string;
  started_at: string | null;
  soap_note: SoapNote | null;
  icd_codes: { code: string; description: string }[] | null;
}

interface ConsultationData {
  session_id: string;
  patient_id: string;
  patient_display: string | null;
  transcript: string | null;
  soap_note: SoapNote | null;
  icd_codes: { code: string; description: string }[] | null;
  prescription: unknown[] | null;
  status: string;
  is_followup: boolean;
  previous_consultation: PreviousConsultation | null;
}

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ d, d2, size = 16 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

// ── Editable section ───────────────────────────────────────────────

function SoapSection({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <span className="w-2 h-2 rounded-sm bg-[#e11d48] shrink-0" />
        <h3 className="font-hand text-sm font-bold text-gray-900">{label}</h3>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full p-3 text-xs text-gray-700 leading-relaxed outline-none resize-none bg-white"
        style={{ minHeight: rows * 22 }}
      />
    </div>
  );
}

// ── ICD-10 row ─────────────────────────────────────────────────────

function IcdBadge({ code, description, onRemove }: {
  code: string; description: string; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px dashed #ececea" }}>
      <span className="text-[11px] font-mono font-bold text-[#e11d48] w-16 shrink-0">{code}</span>
      <span className="flex-1 text-[11px] text-gray-700">{description}</span>
      <button onClick={onRemove} className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0">×</button>
    </div>
  );
}

// ── Prescription row ───────────────────────────────────────────────

function RxRow({ drug, dose, freq, duration, instructions, onRemove }: {
  drug: string; dose?: string; freq?: string; duration?: string; instructions?: string; onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2 py-2" style={{ borderBottom: "1px dashed #ececea" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">{drug}{dose ? ` ${dose}` : ""}{freq ? ` · ${freq}` : ""}</p>
        {duration && <p className="text-[10px] text-gray-500">Duration: {duration}</p>}
        {instructions && <p className="text-[10px] text-gray-400">{instructions}</p>}
      </div>
      <button onClick={onRemove} className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0 mt-0.5">×</button>
    </div>
  );
}

// ── Read-only SOAP section (previous visit) ───────────────────────

function PrevSoapSection({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<ConsultationData | null>(null);
  const [soap, setSoap] = useState<SoapNote>({});
  const [transcript, setTranscript] = useState("");
  const [icdCodes, setIcdCodes] = useState<{ code: string; description: string }[]>([]);
  const [prescription, setPrescription] = useState<{ drug: string; dose?: string; freq?: string; duration?: string; instructions?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingDs, setGeneratingDs] = useState(false);
  const [error, setError] = useState("");
  const [leftTab, setLeftTab] = useState<"transcript" | "previous">("transcript");

  // New ICD code input
  const [newIcd, setNewIcd] = useState({ code: "", description: "" });

  useEffect(() => {
    api.getConsultation(sessionId).then(d => {
      setData(d);
      setTranscript(d.transcript || "");
      const note = d.soap_note || {};
      setSoap(note);
      const codes = d.icd_codes || note.icd_codes || [];
      setIcdCodes(Array.isArray(codes) ? codes : []);
      const rx = d.prescription || note.prescription || [];
      setPrescription(Array.isArray(rx) ? rx as { drug: string; dose?: string; freq?: string; duration?: string; instructions?: string }[] : []);
    }).catch(() => setError("Failed to load consultation"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const updateSoap = (key: keyof SoapNote) => (val: string) =>
    setSoap(s => ({ ...s, [key]: val }));

  const approve = async () => {
    setSaving(true); setError("");
    try {
      const finalNote = { ...soap, icd_codes: icdCodes, prescription };
      await api.updateTranscript(sessionId, transcript);
      await api.approveNote(sessionId, finalNote, prescription);
      setSaved(true);
    } catch {
      setError("Failed to save — check backend is running.");
      setSaving(false);
    }
  };

  const generateDischarge = async () => {
    setGeneratingDs(true); setError("");
    try {
      // Approve first if not already saved
      if (!saved) {
        const finalNote = { ...soap, icd_codes: icdCodes, prescription };
        await api.updateTranscript(sessionId, transcript);
        await api.approveNote(sessionId, finalNote, prescription);
        setSaved(true);
      }
      const res = await api.generateDischargeSummary(sessionId);
      if (res.summary_id) router.push(`/dashboard/discharge/${res.summary_id}`);
    } catch {
      setError("Failed to generate discharge summary.");
      setGeneratingDs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading consultation…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">Consultation not found</p>
        <button onClick={() => router.push("/dashboard")} className="text-xs text-[#e11d48] hover:underline cursor-pointer">← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Transcript / Previous Visit */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden border-r" style={{ borderColor: "#d4d4d2", borderStyle: "dashed" }}>
        {/* Tab header */}
        <div className="flex shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <button
            onClick={() => setLeftTab("transcript")}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition cursor-pointer ${leftTab === "transcript" ? "text-gray-900 bg-white border-b-2 border-[#e11d48]" : "text-gray-400 hover:text-gray-600 bg-gray-50"}`}
          >
            Transcript
          </button>
          {data?.is_followup && (
            <button
              onClick={() => setLeftTab("previous")}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition cursor-pointer ${leftTab === "previous" ? "text-gray-900 bg-white border-b-2 border-[#F59E0B]" : "text-gray-400 hover:text-gray-600 bg-gray-50"}`}
            >
              Previous Visit
            </button>
          )}
        </div>

        {/* Transcript tab */}
        {leftTab === "transcript" && (
          <>
            <div className="px-4 py-2 bg-white shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <p className="text-[10px] text-gray-400">Edit before approving</p>
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              className="flex-1 p-4 text-xs text-gray-700 leading-relaxed outline-none resize-none bg-white"
              placeholder="No transcript recorded."
            />
          </>
        )}

        {/* Previous visit tab */}
        {leftTab === "previous" && data?.previous_consultation && (
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50" style={{ border: "1px dashed #fcd34d" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-[10px] font-mono text-amber-700">
                {data.previous_consultation.started_at
                  ? new Date(data.previous_consultation.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "Previous visit"}
              </p>
            </div>
            {data.previous_consultation.soap_note ? (
              <>
                <PrevSoapSection label="Subjective" value={data.previous_consultation.soap_note.subjective || ""} />
                <PrevSoapSection label="Objective" value={data.previous_consultation.soap_note.objective || ""} />
                <PrevSoapSection label="Assessment" value={data.previous_consultation.soap_note.assessment || ""} />
                <PrevSoapSection label="Plan" value={data.previous_consultation.soap_note.plan || ""} />
                {(data.previous_consultation.icd_codes || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">ICD Codes</p>
                    <div className="flex flex-wrap gap-1">
                      {(data.previous_consultation.icd_codes || []).map((ic, i) => (
                        <span key={i} className="text-[10px] font-mono bg-[#ffe4e6] text-[#9f1239] px-1.5 py-0.5 rounded">{ic.code}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[10px] text-gray-400">No SOAP note from previous visit.</p>
            )}
          </div>
        )}
      </div>

      {/* Right: SOAP Note */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hand text-2xl font-bold text-gray-900">Cardiac SOAP Note</h1>
              {data.is_followup && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700" style={{ border: "1px solid #fcd34d" }}>
                  Follow-up
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.patient_display || data.patient_id} · Session {sessionId.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/dashboard/consultation/${sessionId}`)}
              className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              ← Back to Recording
            </button>
            {saved && (
              <button
                onClick={generateDischarge}
                disabled={generatingDs}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50 shrink-0"
                style={{ border: "1.5px solid #1a1a1a", background: "white", color: "#1a1a1a", boxShadow: "2px 2px 0 #d4d4d2" }}
              >
                {generatingDs ? (
                  <><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin shrink-0" /> Generating…</>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
                    Discharge Summary
                  </>
                )}
              </button>
            )}
            <button
              onClick={saved ? () => router.push("/dashboard") : approve}
              disabled={saving}
              className="flex items-center gap-2 bg-[#10B981] text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-[#059669] transition cursor-pointer disabled:opacity-50 shrink-0"
              style={{ boxShadow: "2px 2px 0 #047857" }}
            >
              {saved ? (
                <><Icon d="M20 6L9 17l-5-5" size={13} /> Done — Dashboard</>
              ) : saving ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> Saving…</>
              ) : (
                <><Icon d="M20 6L9 17l-5-5" size={13} /> Approve &amp; Push to EMR</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {/* SOAP sections */}
          <SoapSection
            label="S — Subjective (Patient's complaints)"
            value={typeof soap.subjective === "string" ? soap.subjective : ""}
            onChange={updateSoap("subjective")}
            rows={5}
          />
          <SoapSection
            label="O — Objective (Examination & investigations)"
            value={typeof soap.objective === "string" ? soap.objective : ""}
            onChange={updateSoap("objective")}
            rows={5}
          />
          <SoapSection
            label="A — Assessment (Diagnosis)"
            value={typeof soap.assessment === "string" ? soap.assessment : ""}
            onChange={updateSoap("assessment")}
            rows={4}
          />
          <SoapSection
            label="P — Plan (Management)"
            value={typeof soap.plan === "string" ? soap.plan : ""}
            onChange={updateSoap("plan")}
            rows={5}
          />

          {/* ICD-10 codes */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-[#e11d48] shrink-0" />
                <h3 className="font-hand text-sm font-bold text-gray-900">ICD-10 Codes</h3>
              </div>
              <span className="text-[10px] text-gray-400">{icdCodes.length} codes</span>
            </div>
            <div className="px-4 pt-2 pb-1">
              {icdCodes.length === 0 && (
                <p className="text-[10px] text-gray-400 py-2">No ICD-10 codes generated — add manually below</p>
              )}
              {icdCodes.map((ic, i) => (
                <IcdBadge
                  key={i}
                  code={ic.code}
                  description={ic.description}
                  onRemove={() => setIcdCodes(arr => arr.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            {/* Add ICD code */}
            <div className="px-4 py-3 flex gap-2 items-center" style={{ borderTop: "1px dashed #d4d4d2" }}>
              <input
                value={newIcd.code}
                onChange={e => setNewIcd(n => ({ ...n, code: e.target.value }))}
                placeholder="I21.9"
                className="w-20 px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] font-mono"
                style={{ border: "1.5px solid #d4d4d2" }}
              />
              <input
                value={newIcd.description}
                onChange={e => setNewIcd(n => ({ ...n, description: e.target.value }))}
                placeholder="Description"
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48]"
                style={{ border: "1.5px solid #d4d4d2" }}
              />
              <button
                onClick={() => {
                  if (!newIcd.code.trim()) return;
                  setIcdCodes(arr => [...arr, newIcd]);
                  setNewIcd({ code: "", description: "" });
                }}
                className="px-2.5 py-1.5 text-xs bg-[#ffe4e6] text-[#9f1239] rounded-lg hover:bg-[#fecdd3] cursor-pointer font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Prescription */}
          {prescription.length > 0 && (
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
              <div className="px-4 py-2.5" style={{ borderBottom: "1px dashed #d4d4d2" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm bg-[#10B981] shrink-0" />
                  <h3 className="font-hand text-sm font-bold text-gray-900">Prescription</h3>
                </div>
              </div>
              <div className="px-4 pt-2 pb-3">
                {prescription.map((rx, i) => (
                  <RxRow
                    key={i}
                    {...rx}
                    onRemove={() => setPrescription(arr => arr.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pb-4">
            {saved && (
              <button
                onClick={generateDischarge}
                disabled={generatingDs}
                className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition cursor-pointer disabled:opacity-50"
                style={{ border: "1.5px solid #1a1a1a", background: "white", boxShadow: "3px 3px 0 #d4d4d2" }}
              >
                {generatingDs ? "Generating…" : "Generate Discharge Summary"}
              </button>
            )}
            <button
              onClick={saved ? () => router.push("/dashboard") : approve}
              disabled={saving}
              className="flex items-center gap-2 bg-[#10B981] text-white text-sm font-semibold px-8 py-3 rounded-xl hover:bg-[#059669] transition cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "3px 3px 0 #047857" }}
            >
              {saved ? "Done — Back to Dashboard" : saving ? "Saving…" : "Approve & Save to Records"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
