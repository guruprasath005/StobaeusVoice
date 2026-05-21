"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Per-field dictation button ─────────────────────────────────────

function FieldMicBtn({ reportId, onTranscript, disabled }: {
  reportId: string; onTranscript: (t: string) => void; disabled: boolean;
}) {
  const [rec, setRec] = useState(false);
  const [working, setWorking] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      setRec(true);
    } catch { /* mic denied */ }
  };

  const stop = useCallback(async () => {
    const mr = mrRef.current;
    if (!mr) return;
    mr.onstop = async () => {
      mr.stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      if (blob.size > 0) {
        setWorking(true);
        try {
          const res = await api.dictateRadiologyField(reportId, blob);
          if (res.transcript) onTranscript(res.transcript);
        } catch { /* silent */ }
        finally { setWorking(false); }
      }
    };
    mr.stop();
    setRec(false);
  }, [reportId, onTranscript]);

  if (disabled) return null;
  return (
    <button
      onClick={rec ? stop : start}
      disabled={working}
      title={rec ? "Stop dictating" : "Dictate this field"}
      className={`w-5 h-5 flex items-center justify-center rounded transition cursor-pointer disabled:opacity-50 shrink-0 ${
        rec ? "text-red-500" : "text-gray-300 hover:text-[#0EA5E9]"
      }`}
    >
      {working ? (
        <div className="w-3 h-3 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
      ) : rec ? (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block" />
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
        </svg>
      )}
    </button>
  );
}

// ── Template catalogue (visual bar) ───────────────────────────────

const ALL_TEMPLATES = [
  { id: "chest_xray",    label: "Chest X-Ray",          short: "CXR"  },
  { id: "ct_cardiac",    label: "CT Cardiac",           short: "CTCA" },
  { id: "ct_pa",         label: "CT Pulmonary Angio",   short: "CTPA" },
  { id: "mri_heart",     label: "Cardiac MRI",          short: "CMR"  },
  { id: "lipid_profile", label: "Lipid Profile",        short: "LIP"  },
  { id: "hba1c",         label: "HbA1c",                short: "A1C"  },
];

// ── Structured dictation fields per template ──────────────────────

const DICTATION_FIELDS: Record<string, { key: string; label: string; autoText?: string }[]> = {
  chest_xray: [
    { key: "technique",   label: "TECHNIQUE",            autoText: "PA view of the chest acquired in full inspiration." },
    { key: "lungs",       label: "LUNGS" },
    { key: "heart",       label: "HEART" },
    { key: "mediastinum", label: "MEDIASTINUM" },
    { key: "bones",       label: "BONES & SOFT TISSUE" },
    { key: "devices",     label: "CARDIAC DEVICES / LINES" },
  ],
  ct_cardiac: [
    { key: "technique",      label: "TECHNIQUE" },
    { key: "lm",             label: "LEFT MAIN" },
    { key: "lad",            label: "LAD" },
    { key: "lcx",            label: "LCX" },
    { key: "rca",            label: "RCA" },
    { key: "agatston_score", label: "CALCIUM SCORE" },
    { key: "lv_function",    label: "LV FUNCTION" },
    { key: "pericardium",    label: "PERICARDIUM" },
  ],
  ct_pa: [
    { key: "adequacy",        label: "TECHNIQUE" },
    { key: "pe_present",      label: "PULMONARY ARTERIES" },
    { key: "rv_strain",       label: "RV STRAIN" },
    { key: "consolidation",   label: "LUNGS / INFARCT" },
    { key: "pleural_effusion",label: "PLEURA" },
    { key: "aorta",           label: "AORTA" },
  ],
  mri_heart: [
    { key: "indication", label: "INDICATION" },
    { key: "lv_ef",      label: "LVEF" },
    { key: "rwma",       label: "WALL MOTION" },
    { key: "lge",        label: "LGE" },
    { key: "t2_oedema",  label: "T2 OEDEMA" },
    { key: "pericardium",label: "PERICARDIUM" },
  ],
  lipid_profile: [
    { key: "total_chol",  label: "TOTAL CHOLESTEROL",          autoText: "" },
    { key: "ldl",         label: "LDL-C (mg/dL)",              autoText: "" },
    { key: "hdl",         label: "HDL-C (mg/dL)",              autoText: "" },
    { key: "tg",          label: "TRIGLYCERIDES (mg/dL)",      autoText: "" },
    { key: "vldl",        label: "VLDL (mg/dL)",               autoText: "" },
    { key: "non_hdl",     label: "NON-HDL CHOLESTEROL",        autoText: "" },
    { key: "risk",        label: "CARDIAC RISK CATEGORY",      autoText: "" },
  ],
  hba1c: [
    { key: "hba1c_val",   label: "HbA1c (%)",                  autoText: "" },
    { key: "mean_glucose",label: "EST. MEAN GLUCOSE (mg/dL)",  autoText: "" },
    { key: "control",     label: "GLYCAEMIC CONTROL",          autoText: "" },
    { key: "fasting_bg",  label: "FASTING BLOOD GLUCOSE",      autoText: "" },
    { key: "ppbg",        label: "POST-PRANDIAL GLUCOSE",      autoText: "" },
    { key: "interpretation", label: "INTERPRETATION",          autoText: "" },
  ],
};

const FALLBACK_FIELDS = [
  { key: "technique",  label: "TECHNIQUE" },
  { key: "findings",   label: "FINDINGS" },
  { key: "additional", label: "ADDITIONAL" },
];

// ── ICD suggestions ────────────────────────────────────────────────

const TEMPLATE_ICD: Record<string, { code: string; description: string }[]> = {
  chest_xray: [
    { code: "I50.9",  description: "Heart failure, unspecified" },
    { code: "J18.9",  description: "Pneumonia, unspecified" },
    { code: "J90",    description: "Pleural effusion" },
    { code: "I26.99", description: "Pulmonary embolism" },
  ],
  ct_cardiac: [
    { code: "I25.10", description: "Atherosclerotic heart disease, native vessel" },
    { code: "Z13.6",  description: "Screening for cardiovascular disorders" },
    { code: "I25.84", description: "Coronary artery disease" },
  ],
  ct_pa: [
    { code: "I26.99", description: "Pulmonary embolism without acute cor pulmonale" },
    { code: "I26.09", description: "Massive pulmonary embolism" },
    { code: "I27.2",  description: "Secondary pulmonary hypertension" },
  ],
  mri_heart: [
    { code: "I42.9",  description: "Cardiomyopathy, unspecified" },
    { code: "I41",    description: "Myocarditis" },
    { code: "I25.10", description: "Atherosclerotic heart disease — viability" },
    { code: "I42.2",  description: "Hypertrophic obstructive cardiomyopathy" },
  ],
  lipid_profile: [
    { code: "E78.5",  description: "Hyperlipidaemia, unspecified" },
    { code: "E78.0",  description: "Pure hypercholesterolaemia" },
    { code: "E78.1",  description: "Pure hypertriglyceridaemia" },
    { code: "E78.2",  description: "Mixed hyperlipidaemia" },
  ],
  hba1c: [
    { code: "E11.9",  description: "Type 2 diabetes mellitus, without complications" },
    { code: "E10.9",  description: "Type 1 diabetes mellitus, without complications" },
    { code: "R73.09", description: "Pre-diabetes / impaired fasting glucose" },
    { code: "Z79.4",  description: "Long-term use of insulin" },
  ],
};

// ── Mock pending queue ────────────────────────────────────────────

// ── Components ────────────────────────────────────────────────────

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = [3, 6, 11, 5, 14, 8, 4, 12, 7, 3, 10, 13, 6, 4, 9, 12, 5, 8, 7, 11];
  return (
    <div className="flex items-center gap-0.5" style={{ height: 28 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 2,
            background: active ? "#0EA5E9" : "#d4d4d2",
            height: active ? h * 1.8 : 3,
            animation: active ? `pulse-bar ${0.45 + i * 0.055}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`@keyframes pulse-bar{from{transform:scaleY(.3)}to{transform:scaleY(1)}}`}</style>
    </div>
  );
}

function useTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Inline-editable field row ──────────────────────────────────────

function FieldRow({ label, value, onChange, disabled, reportId }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; reportId: string;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const appendTranscript = useCallback((t: string) => {
    onChange(value ? `${value} ${t}` : t);
    setEditing(true);
  }, [value, onChange]);

  return (
    <div
      className="grid py-2.5 gap-3"
      style={{ gridTemplateColumns: "148px 1fr", borderBottom: "1px dashed #d4d4d2" }}
    >
      <div className="flex items-start gap-1 pt-0.5">
        <span className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-widest leading-tight shrink-0">
          {label}
        </span>
        <FieldMicBtn reportId={reportId} onTranscript={appendTranscript} disabled={disabled} />
      </div>
      <div>
        {editing && !disabled ? (
          <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            rows={Math.max(2, Math.ceil(value.length / 60))}
            className="w-full text-xs text-gray-800 leading-relaxed outline-none resize-none bg-transparent"
            style={{ border: "none", padding: 0 }}
          />
        ) : (
          <p
            className={`text-xs leading-relaxed cursor-pointer ${value ? "text-gray-800 hover:text-[#0369a1]" : "text-gray-300 italic"} transition-colors`}
            onClick={() => !disabled && setEditing(true)}
          >
            {value || "Click to edit or tap mic to dictate…"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── DICOM placeholder ─────────────────────────────────────────────

function DicomPlaceholder({ template, patientName }: { template: string; patientName: string | null }) {
  const label = ALL_TEMPLATES.find(t => t.id === template);
  const shortName = label?.short || "IMG";
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden" style={{ border: "1.5px dashed #6b6b6b" }}>
      {/* panel header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-white shrink-0"
        style={{ borderBottom: "1px dashed #d4d4d2" }}
      >
        <span className="font-hand text-sm font-bold text-gray-800">
          Image · {label?.label || template}
        </span>
        {patientName && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ border: "1.25px solid #1a1a1a", background: "#fff" }}
          >
            {patientName}
          </span>
        )}
      </div>

      {/* DICOM viewer area */}
      <div
        className="flex-1 relative flex items-center justify-center"
        style={{
          background: "repeating-linear-gradient(135deg, #e8e8e8 0 8px, #f5f5f5 8px 16px)",
          minHeight: 300,
        }}
      >
        <div
          className="px-4 py-2 rounded-lg font-mono text-xs text-gray-500"
          style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #d4d4d2" }}
        >
          [ DICOM viewer — {shortName} ]
        </div>

        {/* Future DICOM note */}
        <div
          className="absolute bottom-3 left-3 right-3 px-2.5 py-1.5 rounded-lg text-center"
          style={{ background: "rgba(14,165,233,0.08)", border: "1px dashed #bae6fd" }}
        >
          <p className="text-[9px] text-[#0369a1] font-medium">
            DICOM/PACS integration coming — images will load automatically via WADO-RS
          </p>
        </div>
      </div>

      {/* viewer toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-white shrink-0"
        style={{ borderTop: "1px dashed #d4d4d2" }}
      >
        <div className="flex items-center gap-1.5">
          {[
            { icon: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6", label: "zoom" },
            { icon: "M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3", label: "pan" },
            { icon: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3", label: "window" },
          ].map(b => (
            <button
              key={b.label}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              style={{ border: "1.25px solid #1a1a1a" }}
            >
              <Icon d={b.icon} size={10} />
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 cursor-pointer text-xs"
          >‹</button>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ border: "1.25px solid #1a1a1a" }}
          >
            {page}/2
          </span>
          <button
            onClick={() => setPage(p => Math.min(2, p + 1))}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 cursor-pointer text-xs"
          >›</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function RadiologyReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);
  const router = useRouter();

  const [report, setReport] = useState<{
    report_id: string; patient_id: string | null; patient_name: string | null;
    template: string; findings: Record<string, string>; impression: string | null;
    icd_codes: { code: string; description: string }[]; status: string;
  } | null>(null);

  const [findings, setFindings] = useState<Record<string, string>>({});
  const [impression, setImpression] = useState("");
  const [icdCodes, setIcdCodes] = useState<{ code: string; description: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [dictating, setDictating] = useState(false);
  const [dictTranscribing, setDictTranscribing] = useState(false);
  const dictTimer = useTimer(dictating);
  const dictMrRef = useRef<MediaRecorder | null>(null);
  const dictChunksRef = useRef<Blob[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await api.getRadiologyReport(reportId);
      setReport(r);
      const f = r.findings || {};
      // Auto-fill technique default if empty
      const fields = DICTATION_FIELDS[r.template] || FALLBACK_FIELDS;
      const withDefaults: Record<string, string> = { ...f };
      fields.forEach(fl => {
        if (!withDefaults[fl.key] && fl.autoText) withDefaults[fl.key] = fl.autoText;
      });
      setFindings(withDefaults);
      setImpression(r.impression || "");
      setIcdCodes(r.icd_codes || []);
    } catch { /* silent */ }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.saveRadiologyReport(reportId, findings, impression || undefined, icdCodes);
      setSaveMsg("Saved.");
    } catch { setSaveMsg("Save failed."); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 2500); }
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      await api.finalizeRadiologyReport(reportId, findings, impression, icdCodes);
      await load();
    } catch { /* silent */ }
    finally { setFinalizing(false); }
  };

  const generateImpression = async () => {
    setAiLoading(true);
    try {
      const res = await api.generateRadiologyImpression(reportId);
      if (res.impression) setImpression(res.impression);
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  const toggleIcd = (icd: { code: string; description: string }) => {
    setIcdCodes(prev =>
      prev.some(c => c.code === icd.code)
        ? prev.filter(c => c.code !== icd.code)
        : [...prev, icd]
    );
  };

  const setField = (key: string) => (val: string) =>
    setFindings(prev => ({ ...prev, [key]: val }));

  const startGlobalDictation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      dictMrRef.current = mr;
      dictChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) dictChunksRef.current.push(e.data); };
      mr.start();
      setDictating(true);
    } catch { /* mic denied */ }
  };

  const stopGlobalDictation = useCallback(async () => {
    const mr = dictMrRef.current;
    if (!mr) return;
    mr.onstop = async () => {
      mr.stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(dictChunksRef.current, { type: mr.mimeType });
      if (blob.size > 0) {
        setDictTranscribing(true);
        try {
          const res = await api.dictateRadiologyField(reportId, blob);
          if (res.transcript) setImpression(prev => prev ? `${prev}\n${res.transcript}` : res.transcript);
        } catch { /* silent */ }
        finally { setDictTranscribing(false); }
      }
    };
    mr.stop();
    setDictating(false);
  }, [reportId]);

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading report…</div>
    );
  }

  const fields = DICTATION_FIELDS[report.template] || FALLBACK_FIELDS;
  const suggestedIcd = TEMPLATE_ICD[report.template] || [];
  const isFinal = report.status === "final";
  const tmplLabel = ALL_TEMPLATES.find(t => t.id === report.template)?.label || report.template;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 h-[72px] bg-white shrink-0"
        style={{ borderBottom: "1px dashed #d4d4d2" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/radiology")}
            className="text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"
          >
            <Icon d="M19 12H5M12 5l-7 7 7 7" />
          </button>
          <div>
            <h1 className="font-hand text-2xl font-bold text-gray-900 leading-tight">
              Radiology &amp; Pathology Dictation
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {report.patient_name || report.patient_id || "No patient"} · {tmplLabel} · {report.report_id.slice(0, 12)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-[10px] font-medium ${saveMsg === "Saved." ? "text-green-600" : "text-red-500"}`}>
              {saveMsg}
            </span>
          )}
          {!isFinal && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
              style={{ border: "1.5px solid #1a1a1a", boxShadow: "2px 2px 0 #d4d4d2" }}
            >
              <Icon d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" d2="M17 21v-8H7v8M7 3v5h8" size={12} />
              {saving ? "Saving…" : "Save report"}
            </button>
          )}
          <button
            onClick={isFinal ? undefined : finalize}
            disabled={finalizing || (!isFinal && !impression.trim())}
            className="flex items-center gap-2 bg-[#0EA5E9] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#0284c7] transition cursor-pointer disabled:opacity-50"
            style={{ boxShadow: "2px 2px 0 #0369a1" }}
          >
            <Icon d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" size={12} />
            {isFinal ? "Report Final" : finalizing ? "Finalizing…" : "Send to referring doctor"}
          </button>
        </div>
      </div>

      {/* ── Template chip bar ────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 bg-white overflow-x-auto shrink-0"
        style={{ borderBottom: "1px dashed #d4d4d2", scrollbarWidth: "none" }}
      >
        {ALL_TEMPLATES.map(t => {
          const active = t.id === report.template;
          return (
            <button
              key={t.id}
              onClick={() => !active && router.push("/dashboard/radiology")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0"
              style={active
                ? { background: "#0EA5E9", color: "#fff", border: "1.5px solid #0EA5E9" }
                : { background: "#fff", color: "#374151", border: "1.25px solid #1a1a1a" }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── 3-panel body ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Panel 1: Image / DICOM ───────────────────────────── */}
        <div
          className="flex flex-col p-3 shrink-0"
          style={{ width: 360, borderRight: "1px dashed #d4d4d2" }}
        >
          <DicomPlaceholder
            template={report.template}
            patientName={report.patient_name}
          />
        </div>

        {/* ── Panel 2: Structured report + dictation ───────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* sub-header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-white shrink-0"
            style={{ borderBottom: "1px dashed #d4d4d2" }}
          >
            <span className="font-hand text-base font-bold text-gray-900">Structured report</span>
            <div className="flex items-center gap-2">
              {isFinal && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">Final</span>
              )}
              <button
                onClick={dictating ? stopGlobalDictation : startGlobalDictation}
                disabled={dictTranscribing || isFinal}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                  dictating
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-100 text-gray-500 hover:bg-[#E0F2FE] hover:text-[#0369a1]"
                }`}
              >
                {dictTranscribing ? (
                  <><div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" /> transcribing…</>
                ) : dictating ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" /> {dictTimer} · stop</>
                ) : (
                  <><Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={10} /> dictate impression</>
                )}
              </button>
            </div>
          </div>

          {/* findings table */}
          <div className="flex-1 overflow-auto px-4 pt-1 pb-4">
            <div className="flex flex-col">
              {fields.map(f => (
                <FieldRow
                  key={f.key}
                  label={f.label}
                  value={findings[f.key] || ""}
                  onChange={setField(f.key)}
                  disabled={isFinal}
                  reportId={reportId}
                />
              ))}
            </div>

            {/* Impression */}
            <div
              className="mt-3 rounded-xl p-4"
              style={{ background: "#F0F9FF", border: "1.5px dashed #0EA5E9" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#0369a1] uppercase tracking-widest">Impression</span>
                {!isFinal && (
                  <button
                    onClick={generateImpression}
                    disabled={aiLoading}
                    className="flex items-center gap-1 text-[10px] text-[#0369a1] hover:underline cursor-pointer font-semibold"
                  >
                    <Icon d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" size={10} />
                    {aiLoading ? "Generating…" : "AI draft"}
                  </button>
                )}
              </div>
              <textarea
                value={impression}
                onChange={e => setImpression(e.target.value)}
                disabled={isFinal}
                placeholder="Dictate or type the overall impression…"
                rows={3}
                className="w-full text-sm font-semibold text-gray-900 leading-relaxed outline-none resize-none bg-transparent placeholder:font-normal placeholder:text-gray-300 disabled:text-gray-700"
              />
            </div>

            {/* ICD chips */}
            {suggestedIcd.length > 0 && (
              <div className="mt-3">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">ICD-10</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedIcd.map(icd => {
                    const selected = icdCodes.some(c => c.code === icd.code);
                    return (
                      <button
                        key={icd.code}
                        onClick={() => !isFinal && toggleIcd(icd)}
                        disabled={isFinal}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] transition cursor-pointer"
                        style={selected
                          ? { background: "#E0F2FE", border: "1.5px solid #0EA5E9", color: "#0369a1" }
                          : { background: "#fff", border: "1.25px solid #d4d4d2", color: "#374151" }
                        }
                      >
                        <span className="font-mono font-bold">{icd.code}</span>
                        <span className="text-gray-500">{icd.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Dictation bottom bar ─────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-white shrink-0"
            style={{ borderTop: "1px dashed #d4d4d2" }}
          >
            <Waveform active={dictating} />
            <div className="flex items-center gap-2">
              <button
                onClick={dictating ? stopGlobalDictation : startGlobalDictation}
                disabled={dictTranscribing || isFinal}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer disabled:opacity-50 ${
                  dictating ? "bg-red-50 text-red-500" : "hover:bg-gray-100 text-gray-600"
                }`}
                style={{ border: `1.25px solid ${dictating ? "#EF4444" : "#1a1a1a"}` }}
                title={dictating ? "Stop dictating" : "Start dictating impression"}
              >
                {dictTranscribing
                  ? <div className="w-3.5 h-3.5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
                  : dictating
                    ? <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse block" />
                    : <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={14} />
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Panel 3: Pending queue ────────────────────────────── */}
        <div
          className="flex flex-col overflow-hidden shrink-0"
          style={{ width: 252, borderLeft: "1px dashed #d4d4d2" }}
        >
          <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <span className="font-hand text-base font-bold text-gray-900">Pending queue</span>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center">
            <p className="text-xs text-gray-400 px-4 text-center">No reports in the queue</p>
          </div>

          <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px dashed #d4d4d2" }}>
            <p className="font-hand text-[11px] text-[#0EA5E9] leading-snug">
              ✎ Templates auto-fill structure — doctor only dictates findings.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
