"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import PatientSearchModal from "@/components/PatientSearchModal";

interface RadiologyReport {
  report_id: string;
  patient_id: string | null;
  patient_name: string | null;
  template: string;
  status: string;
  impression: string | null;
  created_at: string | null;
  finalized_at: string | null;
}

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

const TEMPLATES = [
  {
    id: "chest_xray",
    label: "Chest X-Ray",
    short: "CXR",
    desc: "PA/AP — cardiac silhouette, pulmonary vascularity, pleural effusion, mediastinal widening",
    color: "#e11d48",
    bg: "#ffe4e6",
    icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  },
  {
    id: "ct_cardiac",
    label: "CT Cardiac",
    short: "CTCA",
    desc: "CTCA / Calcium scoring — coronary anatomy, stenosis grading, Agatston score",
    color: "#7C3AED",
    bg: "#EDE9FE",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
  },
  {
    id: "ct_pa",
    label: "CT Pulmonary Angiography",
    short: "CTPA",
    desc: "CTPA — pulmonary embolism, filling defects, saddle PE, RV strain assessment",
    color: "#9f1239",
    bg: "#DBEAFE",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    id: "mri_heart",
    label: "Cardiac MRI",
    short: "CMR",
    desc: "CMR — LGE, myocardial viability, myocarditis, cardiomyopathy, pericardial disease",
    color: "#0F766E",
    bg: "#CCFBF1",
    icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  },
  {
    id: "lipid_profile",
    label: "Lipid Profile",
    short: "LIP",
    desc: "Total cholesterol, LDL, HDL, TG — cardiac risk stratification",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    id: "hba1c",
    label: "HbA1c",
    short: "A1C",
    desc: "Glycated haemoglobin — diabetes control, cardiac risk in CAD / post-ACS patients",
    color: "#6D28D9",
    bg: "#EDE9FE",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
];

const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

function relTime(iso: string | null) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 10080) return `${Math.floor(m / 1440)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function PatientInitials({ name }: { name: string | null }) {
  const letters = (name || "?")
    .split(" ")
    .filter(w => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase() || "?";
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
      style={{ background: "#f3f3f1", color: "#881337", border: "1.25px solid #1a1a1a" }}
    >
      {letters}
    </div>
  );
}

export default function RadiologyPage() {
  const router = useRouter();
  const [reports, setReports] = useState<RadiologyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [filterTemplate, setFilterTemplate] = useState<string>("all");
  // Template clicked, awaiting patient selection in the modal.
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listRadiologyReports();
      setReports(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Picking a template only opens the patient picker. The report is created
  // once a patient (or "Anonymous") is chosen — the same pattern as Echo.
  const startReport = (templateId: string) => setPendingTemplate(templateId);

  const createWithPatient = async (patientId: string | null) => {
    if (!pendingTemplate) return;
    const template = pendingTemplate;
    setPendingTemplate(null);
    setCreating(template);
    try {
      // If this patient already has a report of the chosen template, open it
      // instead of creating a duplicate draft. Anonymous always gets a new one.
      if (patientId) {
        const existing = await api.listRadiologyReports(patientId, template);
        if (Array.isArray(existing) && existing.length > 0) {
          router.push(`/dashboard/radiology/${existing[0].report_id}`);
          return;
        }
      }
      const res = await api.createRadiologyReport(template, patientId ?? undefined);
      if (res.report_id) router.push(`/dashboard/radiology/${res.report_id}`);
    } catch { /* silent */ }
    finally { setCreating(null); }
  };

  const filtered = filterTemplate === "all" ? reports : reports.filter(r => r.template === filterTemplate);
  const draftCount = reports.filter(r => r.status !== "final").length;
  const finalCount = reports.filter(r => r.status === "final").length;

  return (
    <div className="flex flex-col h-full overflow-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10 shrink-0"
        style={{ borderBottom: "1px dashed #d4d4d2" }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-hand text-2xl font-bold text-gray-900">Radiology</h1>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "#ffe4e6", color: "#9f1239" }}
            >
              Cardiac Imaging
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? "Loading…" : `${reports.length} report${reports.length !== 1 ? "s" : ""} · ${draftCount} draft · ${finalCount} final`}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" size={12} />
          Refresh
        </button>
      </div>

      <div className="p-5 flex gap-5">

        {/* ── Left: template picker ──────────────────────────────── */}
        <div className="flex flex-col gap-3" style={{ width: 340, flexShrink: 0 }}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">New Report</p>

          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => startReport(t.id)}
              disabled={!!creating}
              className="text-left bg-white rounded-xl p-4 transition cursor-pointer disabled:opacity-60 group"
              style={{
                border: "1.5px solid #1a1a1a",
                boxShadow: creating === t.id ? "none" : "3px 3px 0 #1a1a1a",
                transform: creating === t.id ? "translate(2px,2px)" : "none",
              }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: t.bg, color: t.color }}
                >
                  {creating === t.id ? (
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: t.color, borderTopColor: "transparent" }}
                    />
                  ) : (
                    <Icon d={t.icon} size={16} />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-bold text-gray-900 group-hover:text-[#e11d48] transition">
                      {t.label}
                    </p>
                    <span
                      className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: t.bg, color: t.color }}
                    >
                      {t.short}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{t.desc}</p>
                  {creating === t.id && (
                    <p className="text-[10px] mt-1" style={{ color: t.color }}>Creating report…</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Right: reports list ────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Filter tabs + count */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Recent Reports</p>
            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: "1.5px solid #d4d4d2" }}
            >
              {[{ id: "all", label: "All" }, ...TEMPLATES.map(t => ({ id: t.id, label: t.short }))].map((f, i, arr) => (
                <button
                  key={f.id}
                  onClick={() => setFilterTemplate(f.id)}
                  className="px-3 py-1.5 text-[10px] font-medium transition cursor-pointer"
                  style={{
                    background: filterTemplate === f.id ? "#e11d48" : "#fff",
                    color: filterTemplate === f.id ? "#fff" : "#9CA3AF",
                    borderRight: i < arr.length - 1 ? "1px solid #d4d4d2" : "none",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl h-16 animate-pulse" style={{ border: "1.5px solid #ececea" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 bg-white rounded-xl"
              style={{ border: "1.5px dashed #d4d4d2" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "#ffe4e6" }}
              >
                <Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={22} />
              </div>
              <p className="text-sm font-semibold text-gray-600">No reports yet</p>
              <p className="text-xs text-gray-400 mt-1">
                {filterTemplate !== "all"
                  ? `No ${TEMPLATE_MAP[filterTemplate]?.label} reports — try another filter`
                  : "Select a report type on the left to get started"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
              {/* Table header */}
              <div
                className="grid text-[10px] font-medium text-gray-400 uppercase tracking-wide px-4 py-2.5"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                  borderBottom: "1px dashed #d4d4d2",
                }}
              >
                <span>Patient</span>
                <span>Type</span>
                <span>Impression</span>
                <span>Time</span>
                <span></span>
              </div>

              {filtered.map((r, i) => {
                const tmpl = TEMPLATE_MAP[r.template];
                return (
                  <button
                    key={r.report_id}
                    onClick={() => router.push(`/dashboard/radiology/${r.report_id}`)}
                    className="w-full text-left hover:bg-[#fff1f2] transition cursor-pointer"
                    style={{ borderBottom: i < filtered.length - 1 ? "1px dashed #ececea" : "none" }}
                  >
                    <div
                      className="grid items-center px-4 py-3 gap-3"
                      style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 80px" }}
                    >
                      {/* Patient */}
                      <div className="flex items-center gap-2 min-w-0">
                        <PatientInitials name={r.patient_name} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {r.patient_name || "No patient linked"}
                          </p>
                          <p className="text-[10px] font-mono text-gray-400 truncate">
                            {r.patient_id || r.report_id.slice(0, 12)}
                          </p>
                        </div>
                      </div>

                      {/* Type badge */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: tmpl?.bg || "#f3f3f1", color: tmpl?.color || "#555" }}
                        >
                          <Icon d={tmpl?.icon || "M9 3H5a2 2 0 00-2 2v4"} size={11} />
                        </div>
                        <span
                          className="text-[10px] font-mono font-semibold"
                          style={{ color: tmpl?.color || "#555" }}
                        >
                          {tmpl?.short || r.template}
                        </span>
                      </div>

                      {/* Impression */}
                      <p className="text-[10px] text-gray-500 truncate">
                        {r.impression || <span className="text-gray-300 italic">No impression yet</span>}
                      </p>

                      {/* Time + status */}
                      <div>
                        <p className="text-[10px] text-gray-500">{relTime(r.finalized_at || r.created_at)}</p>
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                          style={
                            r.status === "final"
                              ? { background: "#DCFCE7", color: "#15803D" }
                              : { background: "#FEF9C3", color: "#92400E" }
                          }
                        >
                          {r.status === "final" ? "Final" : "Draft"}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-[#e11d48]">Open →</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {pendingTemplate && (
        <PatientSearchModal
          title={`Find patient for ${TEMPLATE_MAP[pendingTemplate]?.label || "report"}`}
          onSelect={createWithPatient}
          onClose={() => setPendingTemplate(null)}
        />
      )}
    </div>
  );
}
