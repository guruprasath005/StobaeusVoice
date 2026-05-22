"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface ClinicalAlert {
  severity: "critical" | "warning" | "info";
  type: string;
  title: string;
  message: string;
  drugs: string[];
}

interface PatientClinicalAlerts {
  rx_id: string;
  patient_id: string;
  patient_display: string;
  alerts: ClinicalAlert[];
}

interface PendingConsultation {
  session_id: string;
  patient_id: string;
  patient_display: string;
  started_at: string | null;
  assessment: string;
}

interface PendingEcho {
  report_id: string;
  template: string;
  patient_id: string;
  patient_display: string;
  created_at: string | null;
}

interface AlertsData {
  pending_consultations: PendingConsultation[];
  pending_echo_reports: PendingEcho[];
  total: number;
}

interface ClinicalAlertsData {
  patients_with_alerts: PatientClinicalAlerts[];
  total_alerts: number;
}

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ d, d2, size = 15 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

// ── Template label ─────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<string, string> = {
  echo: "Echo (TTE)",
  cath: "Cath / Angio",
  stress_test: "Stress Test",
  holter: "Holter",
};

function formatRelTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Section card ───────────────────────────────────────────────────

function SectionCard({ title, count, color, children }: {
  title: string; count: number; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <h2 className="font-hand text-base font-bold text-gray-900">{title}</h2>
        {count > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
            {count} pending
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="px-5 py-8 text-center text-xs text-gray-400">{label}</div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

function ClinicalAlertRow({ alert }: { alert: ClinicalAlert }) {
  const critical = alert.severity === "critical";
  return (
    <div
      className="flex gap-2.5 px-4 py-3"
      style={{ borderBottom: "1px dashed #ececea", background: critical ? "#FEF2F2" : "#FFFBEB" }}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${critical ? "bg-red-500" : "bg-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${critical ? "text-red-800" : "text-amber-800"}`}>{alert.title}</p>
        <p className={`text-[11px] mt-0.5 leading-relaxed ${critical ? "text-red-700" : "text-amber-700"}`}>{alert.message}</p>
        {alert.drugs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {alert.drugs.map((d, i) => (
              <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{d}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const router = useRouter();
  const [data, setData] = useState<AlertsData | null>(null);
  const [clinicalData, setClinicalData] = useState<ClinicalAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getAlerts(),
      api.getActiveClinicalAlerts(),
    ])
      .then(([workflow, clinical]) => {
        setData(workflow);
        setClinicalData(clinical);
      })
      .catch(() => setError("Failed to load alerts — is the backend running?"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <div className="flex items-center gap-3">
          <h1 className="font-hand text-2xl font-bold text-gray-900">Alerts</h1>
          {(data || clinicalData) && (() => {
            const total = (data?.total ?? 0) + (clinicalData?.total_alerts ?? 0);
            const criticals = clinicalData?.patients_with_alerts.reduce(
              (n, p) => n + p.alerts.filter(a => a.severity === "critical").length, 0
            ) ?? 0;
            if (criticals > 0) return (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700" style={{ border: "1px solid #fca5a5" }}>
                {criticals} critical safety {criticals === 1 ? "alert" : "alerts"}
              </span>
            );
            if (total > 0) return (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700" style={{ border: "1px solid #fcd34d" }}>
                {total} items need attention
              </span>
            );
            return (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700" style={{ border: "1px solid #bbf7d0" }}>
                All clear
              </span>
            );
          })()}
        </div>
        <button
          onClick={load}
          className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5"
        >
          <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" size={12} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-5 text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading alerts…</div>
      ) : (
        <div className="p-5 flex flex-col gap-5">

          {/* Pending SOAP approvals */}
          <SectionCard
            title="SOAP Notes Awaiting Approval"
            count={data?.pending_consultations.length ?? 0}
            color="#F59E0B"
          >
            {!data?.pending_consultations.length ? (
              <EmptyRow label="No consultations waiting for approval" />
            ) : (
              <div>
                {data.pending_consultations.map((c, i) => (
                  <button
                    key={c.session_id}
                    onClick={() => router.push(`/dashboard/consultation/${c.session_id}/review`)}
                    className="w-full flex items-start gap-4 px-5 py-3 hover:bg-[#FFFBEB] transition text-left cursor-pointer"
                    style={{ borderBottom: i < data.pending_consultations.length - 1 ? "1px dashed #ececea" : "none" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5" style={{ border: "1px solid #fcd34d" }}>
                      <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-gray-800">{c.patient_display}</p>
                        <span className="text-[10px] font-mono text-gray-400">{c.patient_id}</span>
                      </div>
                      {c.assessment && (
                        <p className="text-[11px] text-gray-500 truncate">{c.assessment}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-amber-600 font-medium">Review →</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatRelTime(c.started_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Clinical Safety Alerts */}
          <SectionCard
            title="Clinical Safety Alerts"
            count={clinicalData?.total_alerts ?? 0}
            color="#EF4444"
          >
            {!clinicalData?.patients_with_alerts.length ? (
              <EmptyRow label="No drug interactions or contraindications detected" />
            ) : (
              <div>
                {clinicalData.patients_with_alerts.map((p, pi) => (
                  <div key={p.rx_id}>
                    <div
                      className="flex items-center gap-3 px-5 py-2"
                      style={{ borderBottom: "1px dashed #ececea", background: "#f9fafb" }}
                    >
                      <div className="w-6 h-6 rounded-md bg-[#ffe4e6] flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{p.patient_display}</p>
                        <p className="text-[10px] font-mono text-gray-400">{p.patient_id} · {p.rx_id}</p>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/prescriptions/${p.rx_id}`)}
                        className="text-[10px] text-[#e11d48] font-medium hover:underline cursor-pointer shrink-0"
                      >
                        View Rx →
                      </button>
                    </div>
                    {p.alerts.map((a, ai) => (
                      <ClinicalAlertRow
                        key={ai}
                        alert={a}
                      />
                    ))}
                    {pi < clinicalData.patients_with_alerts.length - 1 && (
                      <div style={{ height: 1, background: "#d4d4d2" }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Pending echo impressions */}
          <SectionCard
            title="Echo / Cath Reports Needing Impression"
            count={data?.pending_echo_reports.length ?? 0}
            color="#e11d48"
          >
            {!data?.pending_echo_reports.length ? (
              <EmptyRow label="No reports waiting for impression" />
            ) : (
              <div>
                {data.pending_echo_reports.map((r, i) => (
                  <button
                    key={r.report_id}
                    onClick={() => router.push(`/dashboard/echo/${r.report_id}`)}
                    className="w-full flex items-start gap-4 px-5 py-3 hover:bg-[#fff1f2] transition text-left cursor-pointer"
                    style={{ borderBottom: i < data.pending_echo_reports.length - 1 ? "1px dashed #ececea" : "none" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#ffe4e6] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon d="M22 12h-4l-3 9L9 3l-3 9H2" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-gray-800">{r.patient_display || r.patient_id}</p>
                        <span className="text-[10px] bg-[#ffe4e6] text-[#9f1239] px-1.5 py-0.5 rounded font-medium">
                          {TEMPLATE_LABELS[r.template] ?? r.template}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">No impression generated yet</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-[#e11d48] font-medium">Open →</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatRelTime(r.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

        </div>
      )}
    </div>
  );
}
