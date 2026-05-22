"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import PatientSearchModal from "./PatientSearchModal";
import { useLiveAppend } from "@/lib/useLiveDictation";

type Mode = "standard" | "stemi_fast_track";
type Step = "patient" | "bed" | "dictate" | "review";

interface CatalogueBed { bed_id: string; label: string; ward_id: string | null; tier_id: string | null; occupied: boolean }
interface CatalogueWard { ward_id: string; name: string; floor: string | null; color: string | null }
interface CatalogueTier { tier_id: string; name: string; color: string | null; daily_charge_inr: number; nurse_ratio: string | null }
interface Catalogue { wards: CatalogueWard[]; tiers: CatalogueTier[]; beds: CatalogueBed[] }

interface AdmissionDraft {
  admission_id: string;
  patient_id: string | null;
  patient_name: string | null;
  bed_id: string;
  bed_label: string;
  ward_name: string | null;
  tier_name: string | null;
  mode: Mode;
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
}

const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white";
const inputSty = { border: "1.5px solid #d4d4d2" };

export default function AdmitPatientModal({
  initialMode = "standard",
  onClose,
  onAdmitted,
}: {
  initialMode?: Mode;
  onClose: () => void;
  onAdmitted: () => void;
}) {
  const [step, setStep] = useState<Step>("patient");
  const [mode, setMode] = useState<Mode>(initialMode);

  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState<string>("");
  const [showSearch, setShowSearch] = useState(true);

  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [bedId, setBedId] = useState<string | null>(null);

  const [adm, setAdm] = useState<AdmissionDraft | null>(null);
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api.getIpdCatalogue().then(setCatalogue).catch(() => {}); }, []);

  // ── step: patient ───────────────────────────────────────
  const onSelectPatient = (pid: string | null) => {
    setPatientId(pid);
    setPatientLabel(pid ? pid : "Anonymous");
    setShowSearch(false);
    setStep("bed");
  };

  // ── step: bed → create admission ────────────────────────
  const confirmBed = async () => {
    if (!bedId) return;
    setBusy(true); setErr("");
    try {
      const created = await api.createAdmission({ patient_id: patientId, bed_id: bedId, mode });
      setAdm(created);
      setStep("dictate");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  // ── step: dictate → generate ────────────────────────────
  const generate = async () => {
    if (!adm) return;
    if (!transcript.trim() && mode !== "stemi_fast_track") {
      setErr("Dictate the admission note first.");
      return;
    }
    setBusy(true); setErr("");
    try {
      const generated = await api.generateAdmissionNote(adm.admission_id, transcript || "STEMI fast-track admission. Use protocol pre-fills.");
      setAdm(generated);
      setStep("review");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  // ── step: review → approve (just patches edits + close) ─
  const approve = async () => {
    if (!adm) return;
    setBusy(true); setErr("");
    try {
      await api.updateAdmission(adm.admission_id, {
        chief_complaint: adm.chief_complaint,
        hopi: adm.hopi,
        examination: adm.examination,
        provisional_dx: adm.provisional_dx,
        soap: adm.soap,
        admit_orders: adm.admit_orders,
        icd_codes: adm.icd_codes,
      });
      onAdmitted();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  // ── cancel admission if abandoning before approve ───────
  const cancelAndClose = useCallback(async () => {
    if (adm && (step === "dictate" || step === "review")) {
      try { await api.dischargeAdmission(adm.admission_id); } catch { /* silent — also abandon */ }
    }
    onClose();
  }, [adm, step, onClose]);

  // ── render ──────────────────────────────────────────────

  if (step === "patient" && showSearch) {
    return <PatientSearchModal title="Admit — find patient" allowAnonymous={mode === "stemi_fast_track"} onSelect={onSelectPatient} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={cancelAndClose}>
      <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden mt-[6vh]" style={{ border: "1.5px solid #1a1a1a" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-3">
            <h2 className="font-hand text-xl font-bold">
              {mode === "stemi_fast_track" ? "STEMI Fast-Track Admit" : "Admit Patient"}
            </h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ffe4e6] text-[#9f1239]">
              {step.toUpperCase()}
            </span>
            {patientLabel && <span className="text-[11px] text-gray-500">· {patientLabel}</span>}
            {bedId && <span className="text-[11px] text-gray-500">· {bedId}</span>}
          </div>
          <button onClick={cancelAndClose} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
        </div>

        {/* Mode toggle (only on first step) */}
        {step === "bed" && (
          <div className="px-5 pt-3">
            <div className="inline-flex gap-1 bg-gray-50 rounded-lg p-1" style={{ border: "1px dashed #d4d4d2" }}>
              {(["standard", "stemi_fast_track"] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${mode === m ? "bg-[#e11d48] text-white" : "text-gray-500"}`}>
                  {m === "standard" ? "Standard" : "STEMI Fast-Track"}
                </button>
              ))}
            </div>
            {mode === "stemi_fast_track" && (
              <p className="text-[11px] text-[#9f1239] mt-2">⚡ STEMI protocol pre-fills (Aspirin 325mg, Clopidogrel 600mg, Heparin, NPO, cath lab activation) will be auto-loaded.</p>
            )}
          </div>
        )}

        <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-auto">
          {err && <div className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg">{err}</div>}

          {/* BED PICKER */}
          {step === "bed" && catalogue && (
            <>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setTierFilter(null)} className={`text-[11px] px-3 py-1 rounded-full cursor-pointer ${tierFilter === null ? "bg-[#e11d48] text-white" : "bg-gray-100 text-gray-600"}`}>All</button>
                {catalogue.tiers.map(t => (
                  <button key={t.tier_id} onClick={() => setTierFilter(t.tier_id)}
                    className={`text-[11px] px-3 py-1 rounded-full cursor-pointer ${tierFilter === t.tier_id ? "bg-[#e11d48] text-white" : "bg-gray-100 text-gray-600"}`}>
                    {t.name} · ₹{t.daily_charge_inr.toLocaleString("en-IN")}/day
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {catalogue.beds.filter(b => !tierFilter || b.tier_id === tierFilter).map(b => {
                  const tier = catalogue.tiers.find(t => t.tier_id === b.tier_id);
                  const ward = catalogue.wards.find(w => w.ward_id === b.ward_id);
                  const disabled = b.occupied;
                  const selected = bedId === b.bed_id;
                  return (
                    <button key={b.bed_id} disabled={disabled}
                      onClick={() => setBedId(b.bed_id)}
                      className="text-left p-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        border: `1.5px solid ${selected ? "#e11d48" : disabled ? "#e5e7eb" : (tier?.color || "#d4d4d2")}`,
                        background: selected ? "#ffe4e6" : disabled ? "#f9fafb" : "#fff",
                        opacity: disabled ? 0.45 : 1,
                        boxShadow: selected ? "2px 2px 0 #e11d48" : undefined,
                      }}>
                      <p className="text-xs font-bold font-mono text-gray-900">{b.label}</p>
                      <p className="text-[10px] text-gray-500">{tier?.name || "—"}</p>
                      <p className="text-[9px] text-gray-400">{ward?.name || "—"}</p>
                      {disabled && <p className="text-[9px] text-gray-400 mt-0.5">Occupied</p>}
                    </button>
                  );
                })}
              </div>
              {catalogue.beds.length === 0 && (
                <p className="text-xs text-gray-400 py-6 text-center">No beds configured. Ask the admin to add beds in Admin → IPD Setup.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={cancelAndClose} className="text-xs text-gray-500 px-3 py-2 hover:underline cursor-pointer">Cancel</button>
                <button onClick={confirmBed} disabled={!bedId || busy}
                  className="bg-[#e11d48] text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>
                  {busy ? "Admitting…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {/* DICTATE */}
          {step === "dictate" && (
            <>
              <p className="text-[11px] text-gray-500">Dictate the admission: chief complaint, history, exam findings, provisional diagnosis, and admit orders. AI will structure it into a full SOAP note.</p>
              <DictateField value={transcript} onValue={setTranscript} placeholder={mode === "stemi_fast_track"
                ? "Optional — STEMI protocol will pre-fill. Add any patient-specific findings (chest pain duration, prior MI, contraindications, ECG findings)."
                : "Patient is a 58-year-old male presenting with 2 days of progressive exertional chest pain. PMH significant for hypertension on amlodipine. Exam shows BP 150/90, HR 92, regular. S1 S2 normal, no murmurs. ECG shows T-wave inversion in V4-V6. Troponin pending. Admit to CCU. Start aspirin, clopidogrel, atorvastatin, IV heparin per ACS protocol. NPO. Cardiac monitoring. Echo in morning."} />
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setStep("bed")} className="text-xs text-gray-500 hover:underline cursor-pointer">← Back</button>
                <button onClick={generate} disabled={busy} className="bg-[#e11d48] text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>
                  {busy ? "Extracting…" : "Generate Note →"}
                </button>
              </div>
            </>
          )}

          {/* REVIEW */}
          {step === "review" && adm && (
            <>
              <Field label="Chief Complaint">
                <input className={inputCls} style={inputSty} value={adm.chief_complaint || ""} onChange={e => setAdm({ ...adm, chief_complaint: e.target.value })} />
              </Field>
              <Field label="HOPI">
                <textarea className={inputCls + " resize-none"} style={inputSty} rows={3} value={adm.hopi || ""} onChange={e => setAdm({ ...adm, hopi: e.target.value })} />
              </Field>
              <Field label="Examination">
                <textarea className={inputCls + " resize-none"} style={inputSty} rows={3} value={adm.examination || ""} onChange={e => setAdm({ ...adm, examination: e.target.value })} />
              </Field>
              <Field label="Provisional Diagnosis">
                <input className={inputCls} style={inputSty} value={adm.provisional_dx || ""} onChange={e => setAdm({ ...adm, provisional_dx: e.target.value })} />
              </Field>

              <div className="bg-[#f8fafc] rounded-xl p-3" style={{ border: "1px dashed #d4d4d2" }}>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">SOAP</p>
                {(["subjective", "objective", "assessment", "plan"] as const).map(k => (
                  <div key={k} className="mb-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase">{k}</label>
                    <textarea rows={2} className={inputCls + " resize-none mt-0.5"} style={inputSty}
                      value={adm.soap?.[k] || ""} onChange={e => setAdm({ ...adm, soap: { ...(adm.soap || {}), [k]: e.target.value } })} />
                  </div>
                ))}
              </div>

              <div className="bg-[#ffe4e6] rounded-xl p-3" style={{ border: "1px dashed #fda4af" }}>
                <p className="text-[10px] font-semibold text-[#9f1239] uppercase tracking-wide mb-2">Admit Orders</p>
                {adm.admit_orders?.drugs?.map((d, i) => (
                  <p key={i} className="text-[11px] text-gray-700 font-mono">• {d.drug} {d.dose} {d.route || ""} {d.freq || ""}</p>
                ))}
                {adm.admit_orders?.monitoring?.map((m, i) => (
                  <p key={i} className="text-[11px] text-gray-700">📊 {m}</p>
                ))}
                {adm.admit_orders?.diet && <p className="text-[11px] text-gray-700">🍽 {adm.admit_orders.diet}</p>}
                {adm.admit_orders?.access && <p className="text-[11px] text-gray-700">💉 {adm.admit_orders.access}</p>}
                {adm.admit_orders?.special && <p className="text-[11px] text-[#9f1239] font-semibold mt-1">⚠ {adm.admit_orders.special}</p>}
              </div>

              {adm.icd_codes && adm.icd_codes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {adm.icd_codes.map((c, i) => (
                    <span key={i} className="text-[10px] font-mono bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full">{c.code} · {c.description}</span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 sticky bottom-0 bg-white py-2">
                <button onClick={() => setStep("dictate")} className="text-xs text-gray-500 hover:underline cursor-pointer">← Edit dictation</button>
                <button onClick={approve} disabled={busy} className="bg-[#e11d48] text-white text-xs font-semibold px-5 py-2 rounded-lg disabled:opacity-50 cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>
                  {busy ? "Saving…" : "Approve & Admit ✓"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DictateField({ value, onValue, placeholder }: { value: string; onValue: (v: string) => void; placeholder: string }) {
  const { recording, toggle } = useLiveAppend(value, onValue);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Admission Dictation</label>
        <button onClick={toggle} className={`text-[10px] font-medium px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${recording ? "bg-red-50 text-red-500 border border-red-200" : "bg-[#ffe4e6] text-[#9f1239]"}`}>
          {recording ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Stop</> : "🎤 Dictate"}
        </button>
      </div>
      <textarea value={value} onChange={e => onValue(e.target.value)} placeholder={placeholder}
        rows={10} className="w-full px-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white resize-none" style={inputSty} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}
