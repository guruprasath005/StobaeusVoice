"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import PatientSearchModal from "@/components/PatientSearchModal";

// ── Types ──────────────────────────────────────────────────────────

interface EchoReport {
  report_id: string;
  template: string;
  patient_id: string | null;
  patient_display: string | null;
  impression: string | null;
  icd_codes: { code: string; description: string }[] | null;
  status: string;
  created_at: string | null;
}

// ── Template definitions ──────────────────────────────────────────

const TEMPLATES = [
  {
    key: "echo",
    label: "Echocardiogram",
    short: "Echo",
    desc: "TTE — EF%, wall motion, valves, pericardium",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: "#e11d48",
    bg: "#ffe4e6",
  },
  {
    key: "cath",
    label: "Coronary Angiogram",
    short: "Cath",
    desc: "LMCA / LAD / LCX / RCA stenosis, TIMI flow, LVEDP",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    color: "#EF4444",
    bg: "#FEE2E2",
  },
  {
    key: "stress_test",
    label: "Stress Test",
    short: "TMT",
    desc: "Bruce / Modified Bruce — ST changes, Duke score",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    key: "holter",
    label: "Holter Monitor",
    short: "Holter",
    desc: "24 hr / 48 hr / 7-day — arrhythmia burden, HR range",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 12h2l2-5 2 10 2-5h2" />
      </svg>
    ),
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
];

const TEMPLATE_LABELS: Record<string, string> = {
  echo: "Echocardiogram",
  cath: "Coronary Angiogram",
  stress_test: "Stress Test",
  holter: "Holter Monitor",
};

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function TemplateBadge({ template }: { template: string }) {
  const t = TEMPLATES.find(t => t.key === template);
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
      style={{ background: t?.bg || "#f3f4f6", color: t?.color || "#6b7280" }}
    >
      {t?.short || template}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function EchoPage() {
  const router = useRouter();
  const [reports, setReports] = useState<EchoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  // template chosen, waiting for the user to pick a patient in the modal
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);

  useEffect(() => {
    api.listEchoReports()
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  // Picking a template opens the patient search; the report is only created
  // once a patient (or "Anonymous") is chosen.
  const startReport = (templateKey: string) => setPendingTemplate(templateKey);

  const createWithPatient = async (patientId: string | null) => {
    if (!pendingTemplate) return;
    const templateKey = pendingTemplate;
    setPendingTemplate(null);
    setStarting(templateKey);
    try {
      const res = await api.createEchoReport(templateKey, patientId ?? undefined);
      if (res.report_id) router.push(`/dashboard/echo/${res.report_id}`);
      else setStarting(null);
    } catch { setStarting(null); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex flex-col justify-center px-5 h-[72px]" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h1 className="font-hand text-2xl font-bold text-gray-900">Echo / Cath Lab</h1>
          <p className="text-xs text-gray-400 mt-0.5">Structured cardiac investigation reports</p>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Template selector */}
          <div>
            <h2 className="font-hand text-base font-bold text-gray-800 mb-3">New Report</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => startReport(t.key)}
                  disabled={starting !== null}
                  className="bg-white rounded-xl p-4 text-left hover:shadow-md transition cursor-pointer disabled:opacity-60 group"
                  style={{ border: "1.5px solid #1a1a1a" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors group-hover:scale-105"
                    style={{ background: t.bg, color: t.color }}
                  >
                    {starting === t.key ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : t.icon}
                  </div>
                  <p className="font-hand text-sm font-bold text-gray-900 leading-tight">{t.label}</p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent reports */}
          <div>
            <h2 className="font-hand text-base font-bold text-gray-800 mb-3">Recent Reports</h2>
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">Loading reports…</div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-sm text-gray-400">No reports yet</p>
                  <p className="text-[10px] text-gray-400">Select a template above to create your first report</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px dashed #d4d4d2" }}>
                      {["Patient", "Type", "Impression", "Date", "Status", ""].map(h => (
                        <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2.5 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr
                        key={r.report_id}
                        onClick={() => router.push(`/dashboard/echo/${r.report_id}`)}
                        className="hover:bg-gray-50 transition cursor-pointer"
                        style={{ borderBottom: "1px dashed #ececea" }}
                      >
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-gray-800">
                            {r.patient_display || r.patient_id || "Anonymous"}
                          </p>
                          {r.patient_id && (
                            <p className="text-[10px] font-mono text-gray-400">{r.patient_id}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <TemplateBadge template={r.template} />
                        </td>
                        <td className="px-4 py-2.5 max-w-xs">
                          <p className="text-[11px] text-gray-600 truncate">
                            {r.impression || <span className="text-gray-300 italic">Not generated</span>}
                          </p>
                          {r.icd_codes && r.icd_codes.length > 0 && (
                            <p className="text-[10px] font-mono text-[#e11d48] mt-0.5">
                              {r.icd_codes.slice(0, 2).map(c => c.code).join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <p className="text-[10px] text-gray-600">{formatDate(r.created_at)}</p>
                          <p className="text-[10px] font-mono text-gray-400">{formatTime(r.created_at)}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              r.status === "final"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : "bg-[#FEF9C3] text-[#A16207]"
                            }`}
                          >
                            {r.status === "final" ? "Final" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] text-[#e11d48] font-medium">Open →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {pendingTemplate && (
        <PatientSearchModal
          title="Find patient for this report"
          onSelect={createWithPatient}
          onClose={() => setPendingTemplate(null)}
        />
      )}
    </div>
  );
}
