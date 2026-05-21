"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface VoiceCall {
  call_id: string;
  patient_id: string | null;
  patient_name: string | null;
  call_type: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  transcript: string | null;
  summary: Record<string, unknown> | null;
  created_at: string | null;
}

interface EligiblePatient {
  patient_id: string;
  patient_name: string;
  discharge_date: string | null;
  summary_id: string;
}

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  completed: { bg: "#DCFCE7", text: "#15803D", label: "Completed" },
  failed:    { bg: "#FEF2F2", text: "#991B1B", label: "Failed" },
  cancelled: { bg: "#F3F4F6", text: "#6B7280", label: "Cancelled" },
};

const TYPE_LABELS: Record<string, string> = {
  post_discharge: "Post-Discharge",
  routine_followup: "Routine Follow-up",
};

function relTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function VoiceBotPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [eligible, setEligible] = useState<EligiblePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VoiceCall | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calls" | "eligible">("calls");

  const load = useCallback(async () => {
    try {
      const [c, e] = await Promise.all([api.listVoiceBotCalls(), api.getEligiblePatients()]);
      setCalls(Array.isArray(c) ? c : []);
      setEligible(Array.isArray(e) ? e : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const triggerCall = async (patientId: string, callType = "post_discharge") => {
    setTriggering(patientId);
    try {
      await api.triggerVoiceBotCall({ patient_id: patientId, call_type: callType });
      await load();
      setActiveTab("calls");
    } catch { /* silent */ }
    finally { setTriggering(null); }
  };

  const cancelCall = async (callId: string) => {
    await api.cancelVoiceBotCall(callId);
    await load();
    if (selected?.call_id === callId) setSelected(null);
  };

  const pending = calls.filter(c => c.status === "pending").length;
  const completed = calls.filter(c => c.status === "completed").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-3">
            <h1 className="font-hand text-2xl font-bold text-gray-900">Patient Voice Bot</h1>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369a1]">Post-Discharge Monitoring</span>
          </div>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5">
            <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" size={12} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 px-5 pt-4 pb-2 shrink-0">
          {[
            { label: "Total Calls", value: calls.length, color: "#0EA5E9" },
            { label: "Pending", value: pending, color: "#F59E0B" },
            { label: "Completed", value: completed, color: "#10B981" },
            { label: "Eligible Patients", value: eligible.length, color: "#8B5CF6" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3" style={{ border: "1.5px solid #1a1a1a" }}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className="font-hand text-3xl font-bold mt-1 leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          {(["calls", "eligible"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
              style={activeTab === t ? { background: "#E0F2FE", color: "#0369a1" } : { color: "#6B7280" }}
            >
              {t === "calls" ? `Call Log (${calls.length})` : `Eligible Patients (${eligible.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="text-xs text-gray-400 py-12 text-center">Loading…</div>
          ) : activeTab === "eligible" ? (
            eligible.length === 0 ? (
              <div className="text-xs text-gray-400 py-12 text-center bg-white rounded-xl" style={{ border: "1.5px solid #d4d4d2" }}>
                No eligible patients. Patients with a finalized discharge summary who haven&apos;t been called yet will appear here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {eligible.map(p => (
                  <div key={p.patient_id} className="bg-white rounded-xl p-4 flex items-center gap-4" style={{ border: "1.5px solid #1a1a1a" }}>
                    <div className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0369a1] flex items-center justify-center font-bold text-xs shrink-0">
                      {p.patient_name?.[0] || "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{p.patient_name}</p>
                      <p className="text-[10px] text-gray-500">{p.patient_id} · Discharged {p.discharge_date ? new Date(p.discharge_date).toLocaleDateString("en-IN") : "—"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => triggerCall(p.patient_id, "post_discharge")}
                        disabled={triggering === p.patient_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0EA5E9] text-white hover:bg-[#0284c7] transition cursor-pointer disabled:opacity-50"
                      >
                        <Icon d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" size={11} />
                        {triggering === p.patient_id ? "Scheduling…" : "Schedule Call"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : calls.length === 0 ? (
            <div className="text-xs text-gray-400 py-12 text-center bg-white rounded-xl" style={{ border: "1.5px solid #d4d4d2" }}>
              No calls scheduled yet. Go to &quot;Eligible Patients&quot; to schedule post-discharge calls.
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
              {calls.map((c, i) => {
                const badge = STATUS_BADGE[c.status] || STATUS_BADGE.pending;
                return (
                  <button
                    key={c.call_id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition cursor-pointer ${i < calls.length - 1 ? "border-b border-gray-50" : ""} ${selected?.call_id === c.call_id ? "bg-[#F0F9FF]" : ""}`}
                  >
                    <div className="shrink-0">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.text }}>{badge.label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.patient_name || c.patient_id || "Unknown"}</p>
                      <p className="text-[10px] text-gray-500">{TYPE_LABELS[c.call_type] || c.call_type} · {relTime(c.scheduled_at)}</p>
                    </div>
                    {c.status === "pending" && (
                      <button
                        onClick={e => { e.stopPropagation(); cancelCall(c.call_id); }}
                        className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden bg-white" style={{ borderLeft: "1.5px solid #1a1a1a" }}>
        {selected ? (
          <>
            <div className="px-4 py-4 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-hand text-base font-bold text-gray-900">{selected.patient_name || selected.patient_id}</p>
                  <p className="text-[11px] text-gray-500">{TYPE_LABELS[selected.call_type]}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Call ID", value: selected.call_id },
                  { label: "Status", value: (STATUS_BADGE[selected.status] || STATUS_BADGE.pending).label },
                  { label: "Scheduled", value: relTime(selected.scheduled_at) },
                  { label: "Completed", value: relTime(selected.completed_at) },
                ].map(f => (
                  <div key={f.label} className="bg-[#f8fafc] rounded-lg p-2.5" style={{ border: "1px dashed #d4d4d2" }}>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                    <p className="text-xs font-medium text-gray-800 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {selected.transcript && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Call Transcript</p>
                  <div className="bg-[#f8fafc] rounded-xl p-3 text-xs text-gray-700 leading-relaxed" style={{ border: "1px dashed #d4d4d2" }}>
                    {selected.transcript}
                  </div>
                </div>
              )}

              {selected.summary && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Summary</p>
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(selected.summary).map(([k, v]) => (
                      <div key={k} className="flex gap-2 items-start">
                        <span className="text-[10px] text-gray-500 capitalize shrink-0">{k.replace(/_/g, " ")}:</span>
                        <span className="text-[10px] text-gray-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selected.transcript && !selected.summary && (
                <div className="bg-[#FFFBEB] rounded-xl p-3" style={{ border: "1px dashed #F59E0B" }}>
                  <p className="text-[11px] text-[#92400E]">
                    {selected.status === "pending"
                      ? "Call is scheduled. Transcript will appear here after the call completes."
                      : "No call data available."}
                  </p>
                </div>
              )}

              {selected.status === "pending" && (
                <button
                  onClick={() => cancelCall(selected.call_id)}
                  className="w-full py-2 text-xs font-semibold text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  style={{ border: "1.5px solid #EF4444" }}
                >
                  Cancel Call
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
              <Icon d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" size={22} />
            </div>
            <p className="text-xs text-gray-400">Select a call to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
