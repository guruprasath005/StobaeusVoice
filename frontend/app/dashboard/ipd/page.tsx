"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLiveAppend } from "@/lib/useLiveDictation";
import AdmitPatientModal from "@/components/AdmitPatientModal";
import TransferBedModal from "@/components/TransferBedModal";

interface WardPatient {
  admission_id: string;
  bed_id: string;
  bed_label?: string;
  ward_name: string | null;
  tier_name: string | null;
  tier_color: string | null;
  patient_id: string | null;
  patient_name: string;
  full_name: string;
  provisional_dx: string | null;
  mode: "standard" | "stemi_fast_track";
  admitted_at: string | null;
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
  admission_id?: string | null;
  patient_id: string | null;
  patient_name: string | null;
  bed_id: string | null;
  vitals: Record<string, unknown> | null;
  status_text: string | null;
  assessment: string | null;
  plan: string | null;
  created_at: string | null;
}

interface AdmissionDetail {
  admission_id: string;
  bed_id: string | null;
  tier_id: string | null;
  chief_complaint: string | null;
  hopi: string | null;
  examination: string | null;
  provisional_dx: string | null;
  soap: { subjective?: string; objective?: string; assessment?: string; plan?: string } | null;
  admit_orders: {
    drugs?: { drug: string; dose: string; route?: string; freq?: string }[];
    monitoring?: string[];
    diet?: string;
    access?: string;
    special?: string | null;
  } | null;
  icd_codes: { code: string; description: string }[] | null;
  admitted_at: string | null;
  tier_name: string | null;
  ward_name: string | null;
  mode: string;
}

interface Transfer {
  transfer_id: string;
  from_bed_id: string | null;
  from_tier_name: string | null;
  to_bed_id: string;
  to_tier_name: string | null;
  direction: "step_up" | "step_down" | "lateral" | null;
  reason: string | null;
  transferred_at: string | null;
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

function VoiceBtn({ value, onValue }: { value: string; onValue: (v: string) => void }) {
  const { recording, toggle } = useLiveAppend(value, onValue);
  return (
    <button
      onClick={toggle}
      title={recording ? "Stop dictating" : "Dictate"}
      className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-lg transition cursor-pointer ${
        recording
          ? "bg-red-50 text-red-500 border border-red-200"
          : "text-gray-400 hover:text-[#9f1239] hover:bg-[#ffe4e6]"
      }`}
    >
      {recording ? (
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
  const [admitOpen, setAdmitOpen] = useState<null | "standard" | "stemi_fast_track">(null);

  // Note form
  const [statusText, setStatusText] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Selected admission detail + prior notes
  const [admDetail, setAdmDetail] = useState<AdmissionDetail | null>(null);
  const [priorNotes, setPriorNotes] = useState<IpdNote[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [admLoading, setAdmLoading] = useState(false);
  const [showAdmSummary, setShowAdmSummary] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [dischargeBusy, setDischargeBusy] = useState(false);
  const [dischargeConfirm, setDischargeConfirm] = useState(false);
  const router = useRouter();

  const dischargeAndSummarise = async () => {
    if (!selected) return;
    setDischargeBusy(true);
    try {
      const res = await api.generateDischargeFromAdmission(selected.admission_id);
      setDischargeConfirm(false);
      router.push(`/dashboard/discharge/${res.summary_id}`);
    } catch (e) {
      alert((e as Error).message);
    } finally { setDischargeBusy(false); }
  };

  const load = useCallback(async () => {
    try {
      const [pts, notes] = await Promise.all([api.getWardPatients(), api.listIpdNotes()]);
      setPatients(Array.isArray(pts) ? pts : []);
      setRecentNotes(Array.isArray(notes) ? notes : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectPatient = async (p: WardPatient) => {
    setSelected(p);
    setStatusText(""); setAssessment(""); setPlan(""); setSaveMsg("");
    setAdmDetail(null); setPriorNotes([]); setTransfers([]); setAdmLoading(true);
    try {
      const [adm, notes, trs] = await Promise.all([
        api.getAdmission(p.admission_id),
        api.listIpdNotes({ admission_id: p.admission_id }),
        api.listTransfers(p.admission_id),
      ]);
      setAdmDetail(adm); setPriorNotes(Array.isArray(notes) ? notes : []); setTransfers(Array.isArray(trs) ? trs : []);
    } catch { /* silent */ }
    finally { setAdmLoading(false); }
  };

  const generateDraft = async () => {
    if (!selected) return;
    setGenerating(true); setSaveMsg("");
    try {
      const d = await api.generateProgressNote(selected.admission_id);
      if (d.status_text) setStatusText(d.status_text);
      if (d.assessment) setAssessment(d.assessment);
      if (d.plan) setPlan(d.plan);
      setSaveMsg(`Drafted from ${d.prior_note_count} prior note${d.prior_note_count === 1 ? "" : "s"}.`);
    } catch (e) { setSaveMsg((e as Error).message); }
    finally { setGenerating(false); setTimeout(() => setSaveMsg(""), 4000); }
  };

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true); setSaveMsg("");
    try {
      await api.createIpdNote({
        patient_id: selected.patient_id || undefined,
        admission_id: selected.admission_id,
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
      if (selected) {
        try {
          const refreshed = await api.listIpdNotes({ admission_id: selected.admission_id });
          setPriorNotes(Array.isArray(refreshed) ? refreshed : []);
        } catch { /* silent */ }
      }
    } catch { setSaveMsg("Failed to save."); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 2500); }
  };

  const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white";
  const inputSty = { border: "1.5px solid #d4d4d2" };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: ward round list */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-3">
            <h1 className="font-hand text-2xl font-bold text-gray-900">IPD Ward Round</h1>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ffe4e6] text-[#9f1239]">Progress Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAdmitOpen("stemi_fast_track")} className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 bg-amber-50 text-[#92400E] hover:bg-amber-100 transition" style={{ border: "1.5px solid #F59E0B" }}>
              ⚡ STEMI Admit
            </button>
            <button onClick={() => setAdmitOpen("standard")} className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 bg-[#e11d48] text-white hover:bg-[#be123c]" style={{ boxShadow: "2px 2px 0 #9f1239" }}>
              <Icon d="M12 5v14M5 12h14" size={12} /> Admit Patient
            </button>
            <button onClick={load} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5">
              <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" size={12} />
              Refresh
            </button>
          </div>
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
                No active admissions. Tap <span className="font-semibold text-[#9f1239]">Admit Patient</span> to start an IPD episode, or <span className="font-semibold text-[#92400E]">⚡ STEMI Admit</span> for emergency cath lab activation.
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
                        border: `1.5px solid ${isSelected ? "#e11d48" : color}`,
                        background: isSelected ? "#ffe4e6" : "#fff",
                        boxShadow: isSelected ? "2px 2px 0 #e11d48" : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-900">{p.bed_label || p.bed_id}</span>
                        <div className="flex items-center gap-1.5">
                          {p.mode === "stemi_fast_track" && <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">⚡STEMI</span>}
                          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-800 truncate">{p.full_name || p.patient_name}</p>
                      {p.tier_name && <p className="text-[9px] text-gray-500 mb-1.5">{p.tier_name}{p.ward_name ? ` · ${p.ward_name}` : ""}</p>}
                      {p.provisional_dx && <p className="text-[10px] text-[#9f1239] mb-1.5 truncate" title={p.provisional_dx}>Dx: {p.provisional_dx}</p>}
                      <div className="flex gap-2 flex-wrap">
                        {p.bp && <span className="text-[10px] font-mono text-gray-600">BP {p.bp}</span>}
                        {p.hr != null && <span className="text-[10px] font-mono text-gray-600">HR {p.hr}</span>}
                        {p.spo2 != null && <span className="text-[10px] font-mono" style={{ color: p.spo2 < 92 ? "#EF4444" : "#10B981" }}>SpO₂ {p.spo2}%</span>}
                        {p.drips.length > 0 && <span className="text-[10px] text-[#9f1239]">{p.drips.length} drip{p.drips.length > 1 ? "s" : ""}</span>}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">{p.recorded_at ? `Vitals ${relTime(p.recorded_at)}` : `Admitted ${relTime(p.admitted_at)}`}</p>
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
                      <p className="text-[10px] font-mono font-bold text-[#9f1239]">{n.bed_id || "—"}</p>
                      <p className="text-[9px] text-gray-400">{relTime(n.created_at)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{n.patient_name || n.patient_id || "Unknown"}</p>
                      {n.status_text && <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.status_text}</p>}
                      {n.plan && <p className="text-[10px] text-[#9f1239] truncate mt-0.5">Plan: {n.plan}</p>}
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
                  <p className="text-[11px] text-gray-500">{selected.bed_label || selected.bed_id} · {selected.tier_name || "—"} · {selected.patient_id || "No ID"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTransferOpen(true)} title="Transfer bed"
                    className="text-[10px] font-semibold text-[#9f1239] bg-[#ffe4e6] px-2 py-1 rounded-lg hover:bg-[#fecdd3] cursor-pointer">
                    ⇄ Transfer
                  </button>
                  <button onClick={() => setDischargeConfirm(true)} title="Discharge patient"
                    className="text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-1 rounded-lg hover:bg-[#BBF7D0] cursor-pointer">
                    🏥 Discharge
                  </button>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg ml-1">×</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              {/* Admission summary */}
              {admLoading ? (
                <p className="text-[10px] text-gray-400">Loading admission…</p>
              ) : admDetail && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
                  <button onClick={() => setShowAdmSummary(s => !s)} className="w-full flex items-center justify-between px-3 py-2 bg-[#fff1f2] cursor-pointer">
                    <span className="text-[10px] font-semibold text-[#9f1239] uppercase tracking-wide">
                      Admission · {admDetail.tier_name || "—"} · Day {Math.max(1, Math.floor(((Date.now() - new Date(admDetail.admitted_at || Date.now()).getTime()) / 86400000)) + 1)}
                    </span>
                    <span className="text-[10px] text-[#9f1239]">{showAdmSummary ? "Hide" : "Show"}</span>
                  </button>
                  {showAdmSummary && (
                    <div className="px-3 py-2 flex flex-col gap-1.5 bg-white">
                      {admDetail.provisional_dx && <p className="text-[11px]"><span className="text-gray-400">Dx:</span> <span className="text-[#9f1239] font-medium">{admDetail.provisional_dx}</span></p>}
                      {admDetail.chief_complaint && <p className="text-[11px] text-gray-700"><span className="text-gray-400">CC:</span> {admDetail.chief_complaint}</p>}
                      {admDetail.icd_codes && admDetail.icd_codes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {admDetail.icd_codes.map((c, i) => (
                            <span key={i} className="text-[9px] font-mono bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded">{c.code}</span>
                          ))}
                        </div>
                      )}
                      {admDetail.admit_orders?.drugs && admDetail.admit_orders.drugs.length > 0 && (
                        <div className="mt-1 pt-1.5" style={{ borderTop: "1px dashed #ececea" }}>
                          <p className="text-[9px] text-gray-400 mb-0.5">Active orders</p>
                          {admDetail.admit_orders.drugs.slice(0, 5).map((d, i) => (
                            <p key={i} className="text-[10px] font-mono text-gray-700">• {d.drug} {d.dose} {d.freq || ""}</p>
                          ))}
                        </div>
                      )}
                      {transfers.length > 0 && (
                        <div className="mt-1 pt-1.5" style={{ borderTop: "1px dashed #ececea" }}>
                          <p className="text-[9px] text-gray-400 mb-0.5">Bed timeline · {transfers.length} move{transfers.length === 1 ? "" : "s"}</p>
                          {transfers.slice(0, 4).map(t => {
                            const arrow = t.direction === "step_down" ? "⬇" : t.direction === "step_up" ? "⬆" : "→";
                            const color = t.direction === "step_down" ? "#15803D" : t.direction === "step_up" ? "#9f1239" : "#6B7280";
                            return (
                              <div key={t.transfer_id} className="text-[10px] mb-0.5">
                                <span className="font-mono" style={{ color }}>{arrow} {t.from_bed_id || "—"} ({t.from_tier_name || "—"}) → {t.to_bed_id} ({t.to_tier_name || "—"})</span>
                                <span className="text-gray-400 ml-1">· {relTime(t.transferred_at)}</span>
                                {t.reason && <p className="text-[9px] text-gray-500 italic ml-3">{t.reason}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Prior progress notes — compact timeline */}
              {priorNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Prior Notes · {priorNotes.length}</p>
                  <div className="flex flex-col gap-1.5 max-h-[140px] overflow-auto pr-1">
                    {priorNotes.slice(0, 6).map(n => (
                      <div key={n.note_id} className="bg-white rounded-lg px-2.5 py-1.5" style={{ border: "1px dashed #d4d4d2" }}>
                        <p className="text-[9px] text-gray-400">{relTime(n.created_at)}</p>
                        {n.status_text && <p className="text-[10px] text-gray-700 line-clamp-2">{n.status_text}</p>}
                        {n.plan && <p className="text-[10px] text-[#9f1239] truncate mt-0.5">P: {n.plan}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                      <p key={i} className="text-[10px] font-medium text-[#9f1239]">{d.name} {d.rate} {d.unit}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* AI generate today's note */}
              <button onClick={generateDraft} disabled={generating}
                className="w-full py-2 text-[11px] font-semibold bg-white text-[#9f1239] rounded-lg cursor-pointer disabled:opacity-50 hover:bg-[#fff1f2] transition flex items-center justify-center gap-1.5"
                style={{ border: "1.5px dashed #e11d48" }}>
                {generating ? "Drafting…" : "✨ Generate today's note from prior notes + vitals"}
              </button>

              {/* Note fields */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Clinical Status</label>
                  <VoiceBtn value={statusText} onValue={setStatusText} />
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
                  <VoiceBtn value={assessment} onValue={setAssessment} />
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
                  <VoiceBtn value={plan} onValue={setPlan} />
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
                className="w-full py-2.5 text-xs font-semibold bg-[#e11d48] text-white rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 #9f1239" }}
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

      {admitOpen && (
        <AdmitPatientModal
          initialMode={admitOpen}
          onClose={() => setAdmitOpen(null)}
          onAdmitted={() => { setAdmitOpen(null); load(); }}
        />
      )}

      {dischargeConfirm && selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => !dischargeBusy && setDischargeConfirm(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden mt-[18vh]" style={{ border: "1.5px solid #1a1a1a" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <h2 className="font-hand text-xl font-bold">Discharge patient?</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{selected.full_name || selected.patient_name} · {selected.bed_label || selected.bed_id}</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-xs text-gray-700">This will:</p>
              <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                <li>Generate a draft discharge summary from the admission note + {priorNotes.length} progress note{priorNotes.length === 1 ? "" : "s"} + bed timeline</li>
                <li>Mark the admission as <span className="font-semibold text-[#15803D]">discharged</span> and free bed {selected.bed_label || selected.bed_id}</li>
                <li>Open the summary for review, edit and WhatsApp send</li>
              </ul>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDischargeConfirm(false)} disabled={dischargeBusy} className="text-xs text-gray-500 px-3 py-2 hover:underline cursor-pointer disabled:opacity-50">Cancel</button>
                <button onClick={dischargeAndSummarise} disabled={dischargeBusy}
                  className="bg-[#15803D] text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer" style={{ boxShadow: "2px 2px 0 #166534" }}>
                  {dischargeBusy ? "Generating…" : "Discharge & Open Summary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {transferOpen && selected && admDetail && (
        <TransferBedModal
          admissionId={selected.admission_id}
          currentBedId={admDetail.bed_id || selected.bed_id}
          currentTierId={admDetail.tier_id}
          onClose={() => setTransferOpen(false)}
          onTransferred={async () => {
            setTransferOpen(false);
            await load();
            try {
              const [adm, trs] = await Promise.all([
                api.getAdmission(selected.admission_id),
                api.listTransfers(selected.admission_id),
              ]);
              setAdmDetail(adm);
              setTransfers(Array.isArray(trs) ? trs : []);
              // Update the `selected` pointer with the refreshed bed/tier from ward-patients
              const fresh = await api.getWardPatients();
              const match = (fresh as WardPatient[]).find(w => w.admission_id === selected.admission_id);
              if (match) setSelected(match);
            } catch { /* silent */ }
          }}
        />
      )}
    </div>
  );
}
