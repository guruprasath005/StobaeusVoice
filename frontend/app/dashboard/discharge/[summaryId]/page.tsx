"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface Sections {
  [key: string]: string;
  chief_complaint: string;
  presenting_history: string;
  clinical_course: string;
  investigations: string;
  procedures: string;
  discharge_condition: string;
  follow_up: string;
  advice: string;
}

interface DSData {
  summary_id: string;
  patient_id: string | null;
  patient_display: string | null;
  patient_phone: string | null;
  session_id: string | null;
  sections: Sections;
  icd_codes: { code: string; description: string }[];
  discharge_meds: { drug: string; dose?: string; freq?: string; duration?: string }[];
  admission_date: string | null;
  discharge_date: string | null;
  status: string;
  created_at: string | null;
}

const SECTION_META: { key: keyof Sections; label: string; rows: number }[] = [
  { key: "chief_complaint",     label: "Chief Complaint",          rows: 2 },
  { key: "presenting_history",  label: "Presenting History",       rows: 4 },
  { key: "clinical_course",     label: "Clinical Course",          rows: 5 },
  { key: "investigations",      label: "Investigations & Reports", rows: 4 },
  { key: "procedures",          label: "Procedures Performed",     rows: 3 },
  { key: "discharge_condition", label: "Condition at Discharge",   rows: 2 },
  { key: "follow_up",           label: "Follow-up Instructions",   rows: 3 },
  { key: "advice",              label: "Advice to Patient",        rows: 3 },
];

// ── Helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function admissionDays(adm: string | null, dis: string | null) {
  if (!adm || !dis) return null;
  const days = Math.round((new Date(dis).getTime() - new Date(adm).getTime()) / 86400000);
  return days > 0 ? `${days} day${days !== 1 ? "s" : ""}` : "Same day";
}

// ── Print layout ───────────────────────────────────────────────────

function PrintLayout({ ds, sections }: { ds: DSData; sections: Sections }) {
  const days = admissionDays(ds.admission_date, ds.discharge_date);
  return (
    <div id="print-ds" className="hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-ds, #print-ds * { visibility: visible !important; }
          #print-ds { position: fixed; inset: 0; padding: 32px 40px; background: white; font-family: Inter, sans-serif; font-size: 11px; }
        }
      `}</style>

      {/* Letterhead */}
      <div style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 10, marginBottom: 14 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Cardiac Discharge Summary</p>
        <p style={{ fontSize: 10, color: "#6b7280", margin: "2px 0 0" }}>StobaeusVoice — Cardiac Documentation Platform</p>
      </div>

      {/* Patient + dates */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 11 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>{ds.patient_display || ds.patient_id || "Anonymous"}</p>
        </div>
        <div style={{ textAlign: "right", color: "#374151" }}>
          <p style={{ margin: 0 }}>Summary: {ds.summary_id}</p>
          <p style={{ margin: "2px 0 0" }}>Admitted: {fmtDate(ds.admission_date)}</p>
          <p style={{ margin: "2px 0 0" }}>Discharged: {fmtDate(ds.discharge_date)}{days ? ` (${days})` : ""}</p>
        </div>
      </div>

      {/* ICD codes */}
      {ds.icd_codes.length > 0 && (
        <div style={{ marginBottom: 12, padding: "6px 10px", background: "#f0f9ff", borderRadius: 4 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Diagnoses (ICD-10)</p>
          <p style={{ margin: "3px 0 0", color: "#0369a1" }}>
            {ds.icd_codes.map(c => `${c.code} — ${c.description}`).join("  ·  ")}
          </p>
        </div>
      )}

      {/* Sections */}
      {SECTION_META.map(({ key, label }) => {
        const val = sections[key];
        if (!val) return null;
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 11 }}>{label}</p>
            <p style={{ margin: "3px 0 0", color: "#374151", whiteSpace: "pre-wrap" }}>{val}</p>
          </div>
        );
      })}

      {/* Discharge medications */}
      {ds.discharge_meds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Discharge Medications</p>
          {ds.discharge_meds.map((d, i) => (
            <p key={i} style={{ margin: "2px 0", color: "#374151" }}>
              {i + 1}. {d.drug} {d.dose} — {d.freq}{d.duration ? ` × ${d.duration}` : ""}
            </p>
          ))}
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 9, color: "#9ca3af" }}>
        This discharge summary was generated with AI assistance and reviewed by the treating cardiologist.
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function DischargeSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const summaryId = params.summaryId as string;

  const [ds, setDs] = useState<DSData | null>(null);
  const [sections, setSections] = useState<Sections>({
    chief_complaint: "", presenting_history: "", clinical_course: "",
    investigations: "", procedures: "", discharge_condition: "", follow_up: "", advice: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);
  const [error, setError] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.getDischargeSummary(summaryId)
      .then((data: DSData) => {
        setDs(data);
        setSections({
          chief_complaint:     data.sections?.chief_complaint     || "",
          presenting_history:  data.sections?.presenting_history  || "",
          clinical_course:     data.sections?.clinical_course     || "",
          investigations:      data.sections?.investigations       || "",
          procedures:          data.sections?.procedures           || "",
          discharge_condition: data.sections?.discharge_condition  || "",
          follow_up:           data.sections?.follow_up            || "",
          advice:              data.sections?.advice               || "",
        });
      })
      .catch(() => setError("Failed to load discharge summary"))
      .finally(() => setLoading(false));
  }, [summaryId]);

  const autosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.updateDischargeSummary(summaryId, { sections: sections });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [summaryId, sections]);

  useEffect(() => { autosave(); }, [sections, autosave]);

  const updateSection = (key: keyof Sections, val: string) =>
    setSections(s => ({ ...s, [key]: val }));

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await api.updateDischargeSummary(summaryId, { sections: sections });
      await api.finalizeDischargeSummary(summaryId);
      setDs(d => d ? { ...d, status: "final" } : d);
    } catch {
      setError("Failed to finalize.");
    } finally {
      setFinalizing(false);
    }
  };

  const handleWhatsApp = async () => {
    setSendingWA(true);
    try {
      const res = await api.sendDischargeSummaryWhatsApp(summaryId);
      if (res.whatsapp_url) window.open(res.whatsapp_url, "_blank");
    } catch {
      setError("Failed to generate WhatsApp link.");
    } finally {
      setSendingWA(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Generating discharge summary…</div>;
  }

  if (!ds) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">{error || "Summary not found"}</p>
        <button onClick={() => router.back()} className="text-xs text-[#0EA5E9] hover:underline cursor-pointer">← Go back</button>
      </div>
    );
  }

  const days = admissionDays(ds.admission_date, ds.discharge_date);
  const isFinal = ds.status === "final";

  return (
    <div className="flex h-full overflow-hidden">
      <PrintLayout ds={ds} sections={sections} />

      {/* Main editor */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hand text-xl font-bold text-gray-900">Discharge Summary</h1>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isFinal ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF9C3] text-[#A16207]"}`}>
                {isFinal ? "Final" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {ds.patient_display || ds.patient_id || "Anonymous"} · {ds.summary_id}
              {saving && <span className="ml-2 text-gray-300">Saving…</span>}
              {saved && <span className="ml-2 text-[#10B981]">Saved</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              ← Back
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              style={{ border: "1.5px solid #d4d4d2" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
              Print
            </button>
            {!isFinal && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="flex items-center gap-2 bg-[#10B981] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#059669] transition cursor-pointer disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 #047857" }}
              >
                {finalizing ? (
                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Finalizing…</>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    Finalise Summary
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && <div className="mx-5 mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>}

        <div className="p-5 flex flex-col gap-4">
          {SECTION_META.map(({ key, label, rows }) => (
            <div key={key} className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
                <span className="w-2 h-2 rounded-sm bg-[#0EA5E9] shrink-0" />
                <h3 className="font-hand text-sm font-bold text-gray-900">{label}</h3>
              </div>
              <textarea
                value={sections[key]}
                onChange={e => updateSection(key, e.target.value)}
                rows={rows}
                disabled={isFinal}
                className="w-full px-4 py-3 text-xs text-gray-700 leading-relaxed outline-none resize-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                placeholder={`${label}…`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: "1px dashed #d4d4d2" }}>
        <div className="flex items-center px-4 h-[72px] shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h3 className="font-hand text-base font-bold text-gray-900">Summary Details</h3>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Admission info */}
          <div className="rounded-xl p-3 bg-[#F0F9FF]" style={{ border: "1px solid #BAE6FD" }}>
            <p className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wide mb-1.5">Admission</p>
            <p className="text-sm font-semibold text-gray-800">{ds.patient_display || "Anonymous"}</p>
            {ds.patient_id && <p className="text-[10px] font-mono text-gray-500 mt-0.5">{ds.patient_id}</p>}
            <div className="mt-2 flex flex-col gap-0.5">
              <p className="text-[11px] text-gray-600">In: {fmtDate(ds.admission_date)}</p>
              <p className="text-[11px] text-gray-600">Out: {fmtDate(ds.discharge_date)}</p>
              {days && <p className="text-[11px] font-semibold text-[#0369A1]">Duration: {days}</p>}
            </div>
          </div>

          {/* ICD codes */}
          {ds.icd_codes.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a", background: "white" }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
                <span className="w-2 h-2 rounded-sm bg-[#0EA5E9] shrink-0" />
                <p className="text-xs font-bold text-gray-800">ICD-10 Diagnoses</p>
              </div>
              <div className="px-3 py-2 flex flex-col gap-1.5">
                {ds.icd_codes.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#0EA5E9] shrink-0 mt-0.5">{c.code}</span>
                    <span className="text-[10px] text-gray-600 leading-tight">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discharge medications */}
          {ds.discharge_meds.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a", background: "white" }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
                <span className="w-2 h-2 rounded-sm bg-[#10B981] shrink-0" />
                <p className="text-xs font-bold text-gray-800">Discharge Medications</p>
              </div>
              <div className="px-3 py-2 flex flex-col gap-1.5">
                {ds.discharge_meds.map((d, i) => (
                  <div key={i} style={{ borderBottom: "1px dashed #ececea", paddingBottom: 4, marginBottom: 2 }}>
                    <p className="text-[11px] font-semibold text-gray-800">{d.drug} {d.dose}</p>
                    <p className="text-[10px] text-gray-500">{d.freq}{d.duration ? ` · ${d.duration}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp send */}
          <div className="rounded-xl p-3" style={{ border: "1.5px solid #1a1a1a", background: "white" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.998 0C5.372 0 0 5.373 0 12.002c0 2.117.554 4.104 1.522 5.825L.057 23.997l6.304-1.652A11.954 11.954 0 0011.998 24C18.627 24 24 18.628 24 12.002 24 5.373 18.627 0 11.998 0zm0 21.818a9.817 9.817 0 01-5.007-1.371l-.359-.214-3.722.976.993-3.63-.234-.374a9.808 9.808 0 01-1.503-5.203c0-5.414 4.406-9.818 9.832-9.818 5.427 0 9.832 4.404 9.832 9.818 0 5.415-4.405 9.816-9.832 9.816z"/></svg>
              </div>
              <p className="text-xs font-bold text-gray-800">Send to Patient</p>
            </div>
            <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">Sends a patient-friendly version — diagnosis, medications, follow-up instructions.</p>
            {!ds.patient_phone && (
              <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg mb-2">No phone on file — WhatsApp will open without recipient.</p>
            )}
            <button
              onClick={handleWhatsApp}
              disabled={sendingWA}
              className="w-full flex items-center justify-center gap-2 bg-[#16A34A] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#15803D] transition cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0 #14532D" }}
            >
              {sendingWA ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing…</>
              ) : "Send Discharge Summary on WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
