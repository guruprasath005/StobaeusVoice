"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useLiveAppend } from "@/lib/useLiveDictation";

// ── Types ──────────────────────────────────────────────────────────

interface Drip { name: string; rate: string; unit: string; }

interface BedState {
  bed_id: string;
  patient_id: string | null;
  patient_name: string | null;
  bp: string | null;
  hr: number | null;
  spo2: number | null;
  temp: string | null;
  rr: number | null;
  drips: Drip[];
  notes: string | null;
  recorded_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────

function vitalStatus(bed: BedState): "critical" | "warning" | "normal" | "empty" {
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

const STATUS_STYLE = {
  critical: { border: "#EF4444", bg: "#FEF2F2", dot: "#EF4444", label: "Critical" },
  warning:  { border: "#F59E0B", bg: "#FFFBEB", dot: "#F59E0B", label: "Review" },
  normal:   { border: "#10B981", bg: "#F0FDF4", dot: "#10B981", label: "Stable" },
  empty:    { border: "#d4d4d2", bg: "#f8fafc",  dot: "#9ca3af", label: "Empty" },
};

function relTime(iso: string | null) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const DRIP_NAMES = [
  "dopamine","dobutamine","noradrenaline","adrenaline","heparin","insulin",
  "nitroglycerine","morphine","fentanyl","midazolam","propofol","vasopressin","amiodarone",
];
const DRIP_UNITS = ["mcg/kg/min","mcg/min","mg/hr","units/hr","ml/hr","IU/hr"];

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

// ── Bed Card ───────────────────────────────────────────────────────

function BedCard({ bed, selected, onClick }: { bed: BedState; selected: boolean; onClick: () => void }) {
  const st = vitalStatus(bed);
  const s = STATUS_STYLE[st];
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition cursor-pointer"
      style={{
        border: `1.5px solid ${selected ? "#e11d48" : s.border}`,
        background: selected ? "#ffe4e6" : s.bg,
        boxShadow: selected ? "2px 2px 0 #e11d48" : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-900">{bed.bed_id}</span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
        </div>
        <span className="text-[9px] font-medium text-gray-400">{relTime(bed.recorded_at)}</span>
      </div>
      <p className="text-[11px] font-medium text-gray-700 truncate mb-1.5">
        {bed.patient_name || <span className="text-gray-400 italic">Unoccupied</span>}
      </p>
      {st !== "empty" ? (
        <div className="grid grid-cols-3 gap-1">
          {bed.bp && <div><p className="text-[9px] text-gray-400">BP</p><p className="text-[10px] font-mono font-semibold text-gray-800">{bed.bp}</p></div>}
          {bed.hr != null && <div><p className="text-[9px] text-gray-400">HR</p><p className="text-[10px] font-mono font-semibold text-gray-800">{bed.hr}</p></div>}
          {bed.spo2 != null && <div><p className="text-[9px] text-gray-400">SpO₂</p><p className="text-[10px] font-mono font-semibold" style={{ color: bed.spo2 < 92 ? "#EF4444" : "#10B981" }}>{bed.spo2}%</p></div>}
        </div>
      ) : (
        <p className="text-[9px] text-gray-400">No vitals recorded</p>
      )}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function NursePage() {
  const [beds, setBeds] = useState<BedState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Log form
  const [patientName, setPatientName] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temp, setTemp] = useState("");
  const [rr, setRr] = useState("");
  const [drips, setDrips] = useState<Drip[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Voice
  const [voiceText, setVoiceText] = useState("");
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceResult, setVoiceResult] = useState<Record<string, unknown> | null>(null);

  // Live Deepgram dictation — voice text fills as the nurse speaks
  const { recording, error: dictError, toggle: toggleRecording } =
    useLiveAppend(voiceText, setVoiceText);

  const loadBeds = useCallback(async () => {
    try {
      const data = await api.listBeds();
      setBeds(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBeds(); }, [loadBeds]);

  const selected = beds.find(b => b.bed_id === selectedId) ?? null;

  const selectBed = (bed: BedState) => {
    setSelectedId(bed.bed_id);
    // Pre-fill form from latest entry
    setPatientName(bed.patient_name || "");
    setBp(bed.bp || "");
    setHr(bed.hr != null ? String(bed.hr) : "");
    setSpo2(bed.spo2 != null ? String(bed.spo2) : "");
    setTemp(bed.temp || "");
    setRr(bed.rr != null ? String(bed.rr) : "");
    setDrips(bed.drips || []);
    setNotes("");
    setSaveMsg("");
    setVoiceText("");
    setVoiceResult(null);
  };

  const submitVitals = async () => {
    if (!selectedId) return;
    setSaving(true); setSaveMsg("");
    try {
      await api.logBedVitals(selectedId, {
        patient_name: patientName || undefined,
        bp: bp || undefined,
        hr: hr ? parseInt(hr) : undefined,
        spo2: spo2 ? parseInt(spo2) : undefined,
        temp: temp || undefined,
        rr: rr ? parseInt(rr) : undefined,
        drips: drips.length ? drips : undefined,
        notes: notes || undefined,
      });
      setSaveMsg("Saved.");
      await loadBeds();
    } catch { setSaveMsg("Failed to save."); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 2500); }
  };

  const onMicClick = () => {
    if (!selectedId) return;
    setVoiceResult(null);
    toggleRecording();
  };

  const submitVoice = async () => {
    if (!selectedId || !voiceText.trim()) return;
    setVoiceParsing(true); setVoiceResult(null);
    try {
      const res = await api.voiceBedLog(selectedId, voiceText.trim());
      setVoiceResult(res.parsed || {});
      // Reflect parsed values in form
      if (res.parsed?.bp) setBp(res.parsed.bp as string);
      if (res.parsed?.hr) setHr(String(res.parsed.hr));
      if (res.parsed?.spo2) setSpo2(String(res.parsed.spo2));
      if (res.parsed?.temp) setTemp(res.parsed.temp as string);
      if (res.parsed?.rr) setRr(String(res.parsed.rr));
      if (res.parsed?.drips) setDrips(res.parsed.drips as Drip[]);
      setVoiceText("");
      await loadBeds();
    } catch { setVoiceResult({ error: "Could not parse vitals" }); }
    finally { setVoiceParsing(false); }
  };

  const addDrip = () => setDrips(d => [...d, { name: "", rate: "", unit: "mcg/kg/min" }]);
  const updateDrip = (i: number, k: keyof Drip, v: string) =>
    setDrips(d => d.map((dr, j) => j === i ? { ...dr, [k]: v } : dr));
  const removeDrip = (i: number) => setDrips(d => d.filter((_, j) => j !== i));

  const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white";
  const inputSty = { border: "1.5px solid #d4d4d2" };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: bed grid */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-3">
            <h1 className="font-hand text-2xl font-bold text-gray-900">Nurse Station</h1>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ffe4e6] text-[#9f1239]">CCU / ICU</span>
          </div>
          <button
            onClick={loadBeds}
            className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5"
          >
            <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" size={12} />
            Refresh
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          {(["critical","warning","normal","empty"] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_STYLE[s].dot }} />
              <span className="text-[10px] text-gray-500 capitalize">{STATUS_STYLE[s].label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading beds…</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {beds.map(bed => (
                <BedCard key={bed.bed_id} bed={bed} selected={selectedId === bed.bed_id} onClick={() => selectBed(bed)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: selected bed panel */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden bg-white" style={{ borderLeft: "1.5px solid #1a1a1a" }}>
        {selected ? (
          <>
            {/* Panel header */}
            <div className="px-4 py-4 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-hand text-base font-bold text-gray-900">{selected.bed_id}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{selected.patient_name || "Unoccupied"}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">

              {/* Voice log */}
              <div className="bg-[#fff1f2] rounded-xl p-3" style={{ border: "1.5px solid #fecdd3" }}>
                <p className="text-[10px] font-semibold text-[#9f1239] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={11} />
                  Voice Log
                </p>

                {/* Mic button */}
                <div className="flex items-center justify-center mb-2">
                  <button
                    onClick={onMicClick}
                    disabled={voiceParsing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    style={recording
                      ? { background: "#FEF2F2", border: "1.5px solid #EF4444", color: "#EF4444" }
                      : { background: "#ffe4e6", border: "1.5px solid #e11d48", color: "#9f1239" }
                    }
                  >
                    {recording ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={13} />
                        Record Vitals (live)
                      </>
                    )}
                  </button>
                </div>
                {dictError && (
                  <p className="text-[10px] text-red-600 text-center mb-1.5">{dictError}</p>
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-px bg-[#fecdd3]" />
                  <span className="text-[9px] text-[#9f1239] font-medium">or type</span>
                  <div className="flex-1 h-px bg-[#fecdd3]" />
                </div>

                <textarea
                  value={voiceText}
                  onChange={e => setVoiceText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitVoice(); } }}
                  placeholder={"e.g. BP 100/70 HR 88 SpO2 96 dopamine 8 mcg/kg/min"}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none bg-white resize-none focus:ring-2 focus:ring-[#e11d48]"
                  style={inputSty}
                />
                <button
                  onClick={submitVoice}
                  disabled={voiceParsing || !voiceText.trim()}
                  className="mt-1.5 w-full py-1.5 text-xs font-semibold bg-[#e11d48] text-white rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
                >
                  {voiceParsing ? "Parsing…" : "Parse & Log"}
                </button>
                {voiceResult && !("error" in voiceResult) && (
                  <p className="text-[10px] text-[#9f1239] mt-1.5">
                    Parsed: {Object.entries(voiceResult).filter(([k]) => k !== "drips").map(([k, v]) => `${k.toUpperCase()} ${v}`).join(" · ")}
                    {(voiceResult.drips as Drip[])?.length ? ` · ${(voiceResult.drips as Drip[]).map(d => `${d.name} ${d.rate} ${d.unit}`).join(", ")}` : ""}
                  </p>
                )}
                {"error" in (voiceResult || {}) && (
                  <p className="text-[10px] text-red-600 mt-1.5">{String((voiceResult as Record<string, unknown>).error)}</p>
                )}
              </div>

              {/* Manual form */}
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Manual Entry</p>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Patient Name</label>
                    <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Name if occupied" className={inputCls} style={inputSty} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">BP (sys/dia)</label>
                      <input value={bp} onChange={e => setBp(e.target.value)} placeholder="120/80" className={inputCls} style={inputSty} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">HR (bpm)</label>
                      <input value={hr} onChange={e => setHr(e.target.value)} placeholder="72" type="number" className={inputCls} style={inputSty} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">SpO₂ (%)</label>
                      <input value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="98" type="number" className={inputCls} style={inputSty} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Temp (°C)</label>
                      <input value={temp} onChange={e => setTemp(e.target.value)} placeholder="37.2" className={inputCls} style={inputSty} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">RR (/min)</label>
                      <input value={rr} onChange={e => setRr(e.target.value)} placeholder="18" type="number" className={inputCls} style={inputSty} />
                    </div>
                  </div>

                  {/* Drips */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-500">IV Drips</label>
                      <button onClick={addDrip} className="text-[10px] text-[#e11d48] hover:underline cursor-pointer font-medium">+ Add</button>
                    </div>
                    {drips.map((d, i) => (
                      <div key={i} className="flex gap-1 mb-1.5 items-center">
                        <select value={d.name} onChange={e => updateDrip(i, "name", e.target.value)} className="flex-1 px-2 py-1 text-[11px] rounded-lg bg-white outline-none" style={inputSty}>
                          <option value="">Drug</option>
                          {DRIP_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <input value={d.rate} onChange={e => updateDrip(i, "rate", e.target.value)} placeholder="Rate" className="w-14 px-2 py-1 text-[11px] rounded-lg bg-white outline-none" style={inputSty} />
                        <select value={d.unit} onChange={e => updateDrip(i, "unit", e.target.value)} className="w-24 px-1 py-1 text-[11px] rounded-lg bg-white outline-none" style={inputSty}>
                          {DRIP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button onClick={() => removeDrip(i)} className="text-gray-400 hover:text-red-500 cursor-pointer text-base leading-none">×</button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any observations..." rows={2} className={inputCls + " resize-none"} style={inputSty} />
                  </div>

                  <button
                    onClick={submitVitals}
                    disabled={saving}
                    className="w-full py-2 text-xs font-semibold bg-[#e11d48] text-white rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
                    style={{ boxShadow: "2px 2px 0 #9f1239" }}
                  >
                    {saving ? "Saving…" : "Log Vitals"}
                  </button>
                  {saveMsg && <p className={`text-xs text-center font-medium ${saveMsg === "Saved." ? "text-green-600" : "text-red-600"}`}>{saveMsg}</p>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
              <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" size={22} />
            </div>
            <p className="text-xs text-gray-400">Select a bed to log vitals or drips</p>
          </div>
        )}
      </div>
    </div>
  );
}
