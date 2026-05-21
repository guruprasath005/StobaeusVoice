"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface WardPatient {
  bed_id: string;
  patient_id: string | null;
  patient_name: string;
  full_name: string;
  bp: string | null;
  hr: number | null;
  spo2: number | null;
  temp: string | null;
  rr: number | null;
  drips: { name: string; rate: string; unit: string }[];
  recorded_at: string | null;
}

interface IpdNote {
  note_id: string;
  patient_id: string | null;
  patient_name: string | null;
  bed_id: string | null;
  vitals: Record<string, unknown> | null;
  status_text: string | null;
  assessment: string | null;
  plan: string | null;
  created_at: string | null;
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

function VoiceBtn({ onTranscript }: { onTranscript: (t: string) => void }) {
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
          const res = await api.dictateIpdNote(blob);
          if (res.transcript) onTranscript(res.transcript);
        } catch { /* silent */ }
        finally { setWorking(false); }
      }
    };
    mr.stop();
    setRec(false);
  }, [onTranscript]);

  return (
    <button
      onClick={rec ? stop : start}
      disabled={working}
      title={rec ? "Stop dictating" : "Dictate"}
      className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-lg transition cursor-pointer disabled:opacity-50 ${
        rec
          ? "bg-red-50 text-red-500 border border-red-200"
          : "text-gray-400 hover:text-[#0369a1] hover:bg-[#E0F2FE]"
      }`}
    >
      {working ? (
        <div className="w-2.5 h-2.5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
      ) : rec ? (
        <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0 block" /> Stop</>
      ) : (
        <><Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={10} /> Mic</>
      )}
    </button>
  );
}

const APPT_TYPE_COLORS: Record<string, string> = {
  normal: "#10B981", warning: "#F59E0B", critical: "#EF4444", empty: "#9ca3af"
};

function vitalColor(bed: WardPatient): string {
  if (!bed.bp && !bed.hr && !bed.spo2) return "empty";
  if (bed.spo2 !== null && bed.spo2 < 90) return "critical";
  if (bed.hr !== null && (bed.hr > 130 || bed.hr < 50)) return "critical";
  const sys = bed.bp ? parseInt(bed.bp.split("/")[0]) : null;
  if (sys !== null && (sys > 180 || sys < 80)) return "critical";
  if (bed.spo2 !== null && bed.spo2 < 95) return "warning";
  if (bed.hr !== null && (bed.hr > 100 || bed.hr < 60)) return "warning";
  if (sys !== null && (sys > 160 || sys < 90)) return "warning";
  return "normal";
}

export default function IpdPage() {
  const [patients, setPatients] = useState<WardPatient[]>([]);
  const [recentNotes, setRecentNotes] = useState<IpdNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WardPatient | null>(null);

  // Note form
  const [statusText, setStatusText] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [pts, notes] = await Promise.all([api.getWardPatients(), api.listIpdNotes()]);
      setPatients(Array.isArray(pts) ? pts : []);
      setRecentNotes(Array.isArray(notes) ? notes : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectPatient = (p: WardPatient) => {
    setSelected(p);
    setStatusText("");
    setAssessment("");
    setPlan("");
    setSaveMsg("");
  };

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true); setSaveMsg("");
    try {
      await api.createIpdNote({
        patient_id: selected.patient_id || undefined,
        bed_id: selected.bed_id,
        vitals: {
          bp: selected.bp, hr: selected.hr, spo2: selected.spo2,
          temp: selected.temp, rr: selected.rr,
        },
        status_text: statusText,
        assessment,
        plan,
      });
      setSaveMsg("Saved.");
      setStatusText(""); setAssessment(""); setPlan("");
      await load();
    } catch { setSaveMsg("Failed to save."); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 2500); }
  };

  const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white";
  const inputSty = { border: "1.5px solid #d4d4d2" };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: ward round list */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-3">
            <h1 className="font-hand text-2xl font-bold text-gray-900">IPD Ward Round</h1>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369a1]">Progress Notes</span>
          </div>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5">
            <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" size={12} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 flex flex-col gap-5">
          {/* Occupied beds */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Occupied Beds — {patients.length} patients
            </p>
            {loading ? (
              <div className="text-xs text-gray-400 py-8 text-center">Loading ward…</div>
            ) : patients.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center bg-white rounded-xl" style={{ border: "1.5px solid #d4d4d2" }}>
                No occupied beds. Log a patient name in the Nurse Station to see them here.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {patients.map(p => {
                  const vc = vitalColor(p);
                  const color = APPT_TYPE_COLORS[vc];
                  const isSelected = selected?.bed_id === p.bed_id;
                  return (
                    <button
                      key={p.bed_id}
                      onClick={() => selectPatient(p)}
                      className="text-left p-3 rounded-xl transition cursor-pointer"
                      style={{
                        border: `1.5px solid ${isSelected ? "#0EA5E9" : color}`,
                        background: isSelected ? "#E0F2FE" : "#fff",
                        boxShadow: isSelected ? "2px 2px 0 #0EA5E9" : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-900">{p.bed_id}</span>
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      </div>
                      <p className="text-xs font-medium text-gray-800 truncate mb-2">{p.full_name || p.patient_name}</p>
                      <div className="flex gap-2 flex-wrap">
                        {p.bp && <span className="text-[10px] font-mono text-gray-600">BP {p.bp}</span>}
                        {p.hr != null && <span className="text-[10px] font-mono text-gray-600">HR {p.hr}</span>}
                        {p.spo2 != null && <span className="text-[10px] font-mono" style={{ color: p.spo2 < 92 ? "#EF4444" : "#10B981" }}>SpO₂ {p.spo2}%</span>}
                        {p.drips.length > 0 && <span className="text-[10px] text-[#0369a1]">{p.drips.length} drip{p.drips.length > 1 ? "s" : ""}</span>}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">Vitals {relTime(p.recorded_at)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent notes */}
          {recentNotes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Progress Notes</p>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
                {recentNotes.slice(0, 8).map((n, i) => (
                  <div key={n.note_id} className={`px-4 py-3 flex gap-4 ${i < recentNotes.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div className="w-12 shrink-0">
                      <p className="text-[10px] font-mono font-bold text-[#0369a1]">{n.bed_id || "—"}</p>
                      <p className="text-[9px] text-gray-400">{relTime(n.created_at)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{n.patient_name || n.patient_id || "Unknown"}</p>
                      {n.status_text && <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.status_text}</p>}
                      {n.plan && <p className="text-[10px] text-[#0369a1] truncate mt-0.5">Plan: {n.plan}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: progress note form */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden bg-white" style={{ borderLeft: "1.5px solid #1a1a1a" }}>
        {selected ? (
          <>
            <div className="px-4 py-4 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-hand text-base font-bold text-gray-900">{selected.full_name || selected.patient_name}</p>
                  <p className="text-[11px] text-gray-500">{selected.bed_id} · {selected.patient_id || "No ID"}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              {/* Latest vitals — read only */}
              <div className="bg-[#f8fafc] rounded-xl p-3" style={{ border: "1px dashed #d4d4d2" }}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Latest Vitals</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "BP", val: selected.bp || "—" },
                    { label: "HR", val: selected.hr != null ? String(selected.hr) : "—" },
                    { label: "SpO₂", val: selected.spo2 != null ? `${selected.spo2}%` : "—" },
                    { label: "Temp", val: selected.temp || "—" },
                    { label: "RR", val: selected.rr != null ? String(selected.rr) : "—" },
                  ].map(v => (
                    <div key={v.label}>
                      <p className="text-[9px] text-gray-400">{v.label}</p>
                      <p className="text-[11px] font-mono font-semibold text-gray-800">{v.val}</p>
                    </div>
                  ))}
                </div>
                {selected.drips.length > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px dashed #d4d4d2" }}>
                    <p className="text-[9px] text-gray-400 mb-1">Active Drips</p>
                    {selected.drips.map((d, i) => (
                      <p key={i} className="text-[10px] font-medium text-[#0369a1]">{d.name} {d.rate} {d.unit}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Note fields */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Clinical Status</label>
                  <VoiceBtn onTranscript={t => setStatusText(s => s ? `${s} ${t}` : t)} />
                </div>
                <textarea
                  value={statusText}
                  onChange={e => setStatusText(e.target.value)}
                  placeholder="e.g. Patient is conscious, cooperative. Haemodynamically stable. Tolerating oral feeds."
                  rows={3}
                  className={inputCls + " resize-none"}
                  style={inputSty}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Assessment</label>
                  <VoiceBtn onTranscript={t => setAssessment(s => s ? `${s} ${t}` : t)} />
                </div>
                <textarea
                  value={assessment}
                  onChange={e => setAssessment(e.target.value)}
                  placeholder="e.g. Post-STEMI Day 2. EF recovering. No new ischaemia."
                  rows={3}
                  className={inputCls + " resize-none"}
                  style={inputSty}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Plan</label>
                  <VoiceBtn onTranscript={t => setPlan(s => s ? `${s} ${t}` : t)} />
                </div>
                <textarea
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  placeholder="e.g. Continue DAPT. Wean dobutamine to 5 mcg/kg/min. Echo tomorrow. OT review if EF < 30%."
                  rows={3}
                  className={inputCls + " resize-none"}
                  style={inputSty}
                />
              </div>

              <button
                onClick={saveNote}
                disabled={saving || (!statusText.trim() && !assessment.trim() && !plan.trim())}
                className="w-full py-2.5 text-xs font-semibold bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition cursor-pointer disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 #0369a1" }}
              >
                {saving ? "Saving…" : "Save Progress Note"}
              </button>
              {saveMsg && <p className={`text-xs text-center font-medium ${saveMsg === "Saved." ? "text-green-600" : "text-red-600"}`}>{saveMsg}</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
              <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" size={22} />
            </div>
            <p className="text-xs text-gray-400">Select an IPD patient to write today&apos;s progress note</p>
          </div>
        )}
      </div>
    </div>
  );
}
