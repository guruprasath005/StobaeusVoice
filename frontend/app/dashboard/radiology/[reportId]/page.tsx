"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLiveAppend } from "@/lib/useLiveDictation";

// ── Per-field live-dictation button (Deepgram streaming) ──────────

function FieldMicBtn({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  const { recording, toggle } = useLiveAppend(value, onChange);
  if (disabled) return null;
  return (
    <button
      onClick={toggle}
      title={recording ? "Stop dictating" : "Dictate this field"}
      className={`w-5 h-5 flex items-center justify-center rounded transition cursor-pointer shrink-0 ${
        recording ? "text-red-500" : "text-gray-300 hover:text-[#e11d48]"
      }`}
    >
      {recording ? (
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
            background: active ? "#e11d48" : "#d4d4d2",
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

function FieldRow({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  return (
    <div
      className="grid py-2.5 gap-3"
      style={{ gridTemplateColumns: "148px 1fr", borderBottom: "1px dashed #d4d4d2" }}
    >
      <div className="flex items-start gap-1 pt-0.5">
        <span className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-widest leading-tight shrink-0">
          {label}
        </span>
        <FieldMicBtn value={value} onChange={onChange} disabled={disabled} />
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
            className={`text-xs leading-relaxed cursor-pointer ${value ? "text-gray-800 hover:text-[#9f1239]" : "text-gray-300 italic"} transition-colors`}
            onClick={() => !disabled && setEditing(true)}
          >
            {value || "Click to edit or tap mic to dictate…"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── DICOM viewer ──────────────────────────────────────────────────

const PACS_BASE    = "http://31.97.63.234:8042";
const PACS_DICOMWEB = `${PACS_BASE}/dicom-web`;

type Instance = { series_uid: string; sop_uid: string; modality: string; instance_number: number };
type Study    = { study_uid: string; study_date: string; study_description: string };

// Fetches a DICOM frame with auth header and returns a blob URL
function useBlobFrame(inst: Instance | null, studyUid: string): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!inst) return;
    let cancelled = false;
    const prev = blobUrl;
    const token = localStorage.getItem("sv_token") || "";
    const params = new URLSearchParams({
      wado_base: PACS_DICOMWEB, study_uid: studyUid,
      series_uid: inst.series_uid, sop_uid: inst.sop_uid,
      username: "orthanc", password: "orthanc",
    });
    fetch(`/api/pacs/frame?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error("frame error"); return r.blob(); })
      .then(blob => { if (!cancelled) setBlobUrl(URL.createObjectURL(blob)); })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (prev) URL.revokeObjectURL(prev);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst?.sop_uid, studyUid]);
  return blobUrl;
}

function DicomImageGrid({ studyUid }: { studyUid: string }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Instance | null>(null);
  const mainBlobUrl = useBlobFrame(selected, studyUid);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("sv_token") || "";
    const params = new URLSearchParams({
      wado_base: PACS_DICOMWEB, study_uid: studyUid,
      username: "orthanc", password: "orthanc",
    });
    fetch(`/api/pacs/instances?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Instance[]) => {
        const sorted = data.sort((a, b) => (a.instance_number as number) - (b.instance_number as number));
        setInstances(sorted);
        setSelected(sorted[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studyUid]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
        Loading images…
      </div>
    </div>
  );

  if (!instances.length) return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <p className="text-gray-500 text-xs">No images found in this study</p>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 bg-black">
      {/* main image */}
      <div className="flex-1 flex items-center justify-center p-2">
        {mainBlobUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={selected?.sop_uid}
            src={mainBlobUrl}
            alt="DICOM"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {/* thumbnail strip — only shown when multiple instances */}
      {instances.length > 1 && (
        <div className="w-16 flex flex-col gap-1 p-1 overflow-y-auto bg-gray-950">
          {instances.map(inst => (
            <button key={inst.sop_uid} onClick={() => setSelected(inst)}
              className="w-full aspect-square rounded overflow-hidden shrink-0 cursor-pointer flex items-center justify-center bg-gray-800"
              style={{ border: selected?.sop_uid === inst.sop_uid ? "2px solid #e11d48" : "2px solid transparent" }}>
              <span className="text-[8px] text-gray-400">{inst.instance_number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DicomViewer({ template, patientName, patientId }: {
  template: string; patientName: string | null; patientId: string | null;
}) {
  const label = ALL_TEMPLATES.find(t => t.id === template);
  const [studies, setStudies]     = useState<Study[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [manualUid, setManualUid] = useState("");
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!patientId || patientId.startsWith("PT-ANON")) return;
    setSearching(true);
    api.pacsSearch({ wado_base: PACS_DICOMWEB, patient_id: patientId, username: "orthanc", password: "orthanc" })
      .then((data) => {
        const list = (Array.isArray(data) ? data : [])
          .map((s: Study) => ({ study_uid: s.study_uid, study_date: s.study_date, study_description: s.study_description || "Study" }))
          .filter((s: Study) => s.study_uid);
        setStudies(list);
        if (list.length >= 1) setSelectedUid(list[0].study_uid);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [patientId]);

  const handleDicomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;
    setUploading(true); setUploadError("");
    try {
      const form = new FormData();
      form.append("patient_id", patientId);
      form.append("file", file);
      const res = await fetch("/api/pacs/push", { method: "POST", body: form,
        headers: { Authorization: `Bearer ${localStorage.getItem("sv_token") || ""}` } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.study_uid) {
        setStudies([{ study_uid: data.study_uid, study_date: "", study_description: "Uploaded" }]);
        setSelectedUid(data.study_uid);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden" style={{ border: "1.5px dashed #6b6b6b" }}>
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <span className="font-hand text-sm font-bold text-gray-800">Image · {label?.label || template}</span>
        <div className="flex items-center gap-2">
          {patientName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ border: "1.25px solid #1a1a1a", background: "#fff" }}>
              {patientName}
            </span>
          )}
          {patientId && (
            <>
              <input ref={fileInputRef} type="file" accept=".dcm,application/dicom" className="hidden" onChange={handleDicomUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer"
                style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "Uploading…" : "+ Upload .dcm"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* study picker */}
      {studies.length > 1 && (
        <div className="px-3 py-2 flex gap-2 flex-wrap bg-gray-50 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          {studies.map(s => (
            <button key={s.study_uid} onClick={() => setSelectedUid(s.study_uid)}
              className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer font-medium"
              style={{
                background: selectedUid === s.study_uid ? "#e11d48" : "#f3f4f6",
                color: selectedUid === s.study_uid ? "white" : "#374151",
                border: "1px solid " + (selectedUid === s.study_uid ? "#be123c" : "#d1d5db"),
              }}>
              {s.study_description || s.study_date}
            </button>
          ))}
        </div>
      )}

      {/* viewer area */}
      {selectedUid ? (
        <DicomImageGrid studyUid={selectedUid} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-black" style={{ minHeight: 300 }}>
          {searching ? (
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              Searching PACS…
            </div>
          ) : patientId ? (
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <p className="text-gray-400 text-xs">No studies found in PACS for this patient</p>
              {uploadError && <p className="text-red-400 text-[9px]">{uploadError}</p>}
              <button onClick={() => setShowManual(v => !v)}
                className="text-[10px] text-gray-500 hover:underline cursor-pointer">
                Enter Study UID manually
              </button>
              {showManual && (
                <div className="flex gap-2 mt-1">
                  <input value={manualUid} onChange={e => setManualUid(e.target.value)}
                    placeholder="1.2.840…"
                    className="text-[10px] px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 w-48 outline-none" />
                  <button onClick={() => { if (manualUid.trim()) setSelectedUid(manualUid.trim()); }}
                    className="text-[10px] px-2 py-1 rounded bg-[#e11d48] text-white cursor-pointer">
                    Load
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              <p className="text-gray-500 text-xs">Assign a patient to load DICOM images from PACS</p>
            </div>
          )}
        </div>
      )}

      {/* toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white shrink-0" style={{ borderTop: "1px dashed #d4d4d2" }}>
        <p className="text-[9px] text-gray-400">
          {selectedUid ? `Study: …${selectedUid.slice(-12)}` : "No study loaded"}
        </p>
        {selectedUid && (
          <a href={`${PACS_BASE}/ui/app/#/study?StudyInstanceUID=${selectedUid}`} target="_blank" rel="noopener noreferrer"
            className="text-[9px] text-[#e11d48] hover:underline cursor-pointer">
            Open in Orthanc Explorer ↗
          </a>
        )}
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
  const [switching, setSwitching] = useState<string | null>(null);
  const { recording: dictating, toggle: toggleGlobalDictation, error: dictError } =
    useLiveAppend(impression, setImpression, "\n");
  const dictTimer = useTimer(dictating);

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

  // Switching templates keeps the same patient. If they already have a report
  // of the target template, open it; otherwise spin up a fresh draft. Anonymous
  // reports (patient_id = null) always get a new draft per template.
  const switchTemplate = async (targetTemplate: string) => {
    if (!report || targetTemplate === report.template || switching) return;
    setSwitching(targetTemplate);
    try {
      // Save any unsaved edits on the current report before navigating away.
      await api.saveRadiologyReport(reportId, findings, impression || undefined, icdCodes).catch(() => {});

      if (report.patient_id) {
        const existing = await api.listRadiologyReports(report.patient_id, targetTemplate);
        if (Array.isArray(existing) && existing.length > 0) {
          router.push(`/dashboard/radiology/${existing[0].report_id}`);
          return;
        }
      }
      const res = await api.createRadiologyReport(targetTemplate, report.patient_id ?? undefined);
      if (res.report_id) router.push(`/dashboard/radiology/${res.report_id}`);
    } finally {
      setSwitching(null);
    }
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
            className="flex items-center gap-2 bg-[#e11d48] text-white px-4 py-2 text-xs font-semibold rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
            style={{ boxShadow: "2px 2px 0 #9f1239" }}
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
          const isSwitching = switching === t.id;
          return (
            <button
              key={t.id}
              onClick={() => !active && switchTemplate(t.id)}
              disabled={!!switching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-60"
              style={active
                ? { background: "#e11d48", color: "#fff", border: "1.5px solid #e11d48" }
                : { background: "#fff", color: "#374151", border: "1.25px solid #1a1a1a" }
              }
              title={
                active
                  ? "Current report"
                  : report.patient_id
                    ? `Switch to ${t.label} for ${report.patient_name || report.patient_id}`
                    : `New ${t.label} (anonymous)`
              }
            >
              {isSwitching && (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
              )}
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
          <DicomViewer
            template={report.template}
            patientName={report.patient_name}
            patientId={report.patient_id}
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
                onClick={toggleGlobalDictation}
                disabled={isFinal}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                  dictating
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-100 text-gray-500 hover:bg-[#ffe4e6] hover:text-[#9f1239]"
                }`}
              >
                {dictating ? (
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
                />
              ))}
            </div>

            {/* Impression */}
            <div
              className="mt-3 rounded-xl p-4"
              style={{ background: "#fff1f2", border: "1.5px dashed #e11d48" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#9f1239] uppercase tracking-widest">Impression</span>
                {!isFinal && (
                  <button
                    onClick={generateImpression}
                    disabled={aiLoading}
                    className="flex items-center gap-1 text-[10px] text-[#9f1239] hover:underline cursor-pointer font-semibold"
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
                          ? { background: "#ffe4e6", border: "1.5px solid #e11d48", color: "#9f1239" }
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
                onClick={toggleGlobalDictation}
                disabled={isFinal}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer disabled:opacity-50 ${
                  dictating ? "bg-red-50 text-red-500" : "hover:bg-gray-100 text-gray-600"
                }`}
                style={{ border: `1.25px solid ${dictating ? "#EF4444" : "#1a1a1a"}` }}
                title={dictating ? "Stop dictating" : "Start dictating impression"}
              >
                {dictating
                  ? <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse block" />
                  : <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={14} />
                }
              </button>
              {dictError && (
                <span className="text-[9px] text-red-500 max-w-[140px] truncate">{dictError}</span>
              )}
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
            <p className="font-hand text-[11px] text-[#e11d48] leading-snug">
              ✎ Templates auto-fill structure — doctor only dictates findings.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
