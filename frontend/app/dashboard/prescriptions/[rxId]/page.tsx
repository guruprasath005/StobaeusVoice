"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useLiveAppend } from "@/lib/useLiveDictation";

// ── Drug database (Indian cardiac drugs) ──────────────────────────

interface DrugEntry {
  name: string;
  category: string;
  defaultDose: string;
  defaultFreq: string;
  drugClass: string;
}

const DRUG_DB: DrugEntry[] = [
  // Antiplatelets
  { name: "Aspirin", category: "Antiplatelet", defaultDose: "75mg", defaultFreq: "OD", drugClass: "aspirin" },
  { name: "Aspirin 150mg", category: "Antiplatelet", defaultDose: "150mg", defaultFreq: "OD", drugClass: "aspirin" },
  { name: "Clopidogrel", category: "Antiplatelet", defaultDose: "75mg", defaultFreq: "OD", drugClass: "clopidogrel" },
  { name: "Ticagrelor", category: "Antiplatelet", defaultDose: "90mg", defaultFreq: "BD", drugClass: "ticagrelor" },
  { name: "Ticagrelor 60mg", category: "Antiplatelet", defaultDose: "60mg", defaultFreq: "BD", drugClass: "ticagrelor" },
  { name: "Prasugrel", category: "Antiplatelet", defaultDose: "10mg", defaultFreq: "OD", drugClass: "prasugrel" },
  // Anticoagulants
  { name: "Warfarin", category: "Anticoagulant", defaultDose: "2mg", defaultFreq: "OD (dose per INR)", drugClass: "warfarin" },
  { name: "Rivaroxaban", category: "Anticoagulant", defaultDose: "20mg", defaultFreq: "OD with dinner", drugClass: "noac" },
  { name: "Rivaroxaban 2.5mg", category: "Anticoagulant", defaultDose: "2.5mg", defaultFreq: "BD", drugClass: "noac" },
  { name: "Apixaban", category: "Anticoagulant", defaultDose: "5mg", defaultFreq: "BD", drugClass: "noac" },
  { name: "Dabigatran", category: "Anticoagulant", defaultDose: "150mg", defaultFreq: "BD", drugClass: "noac" },
  { name: "Enoxaparin", category: "Anticoagulant", defaultDose: "1mg/kg", defaultFreq: "BD (SC)", drugClass: "lmwh" },
  // Statins
  { name: "Atorvastatin", category: "Statin", defaultDose: "40mg", defaultFreq: "HS", drugClass: "statin" },
  { name: "Atorvastatin 80mg", category: "Statin", defaultDose: "80mg", defaultFreq: "HS", drugClass: "statin" },
  { name: "Rosuvastatin", category: "Statin", defaultDose: "10mg", defaultFreq: "OD", drugClass: "statin" },
  { name: "Rosuvastatin 20mg", category: "Statin", defaultDose: "20mg", defaultFreq: "OD", drugClass: "statin" },
  { name: "Pitavastatin", category: "Statin", defaultDose: "2mg", defaultFreq: "OD", drugClass: "statin" },
  { name: "Ezetimibe", category: "Statin", defaultDose: "10mg", defaultFreq: "OD", drugClass: "ezetimibe" },
  // Beta-blockers
  { name: "Metoprolol succinate", category: "Beta-blocker", defaultDose: "25mg", defaultFreq: "OD", drugClass: "metoprolol" },
  { name: "Metoprolol succinate 50mg", category: "Beta-blocker", defaultDose: "50mg", defaultFreq: "OD", drugClass: "metoprolol" },
  { name: "Metoprolol tartrate", category: "Beta-blocker", defaultDose: "25mg", defaultFreq: "BD", drugClass: "metoprolol" },
  { name: "Carvedilol", category: "Beta-blocker", defaultDose: "6.25mg", defaultFreq: "BD", drugClass: "carvedilol" },
  { name: "Carvedilol 12.5mg", category: "Beta-blocker", defaultDose: "12.5mg", defaultFreq: "BD", drugClass: "carvedilol" },
  { name: "Bisoprolol", category: "Beta-blocker", defaultDose: "5mg", defaultFreq: "OD", drugClass: "bisoprolol" },
  { name: "Atenolol", category: "Beta-blocker", defaultDose: "50mg", defaultFreq: "OD", drugClass: "atenolol" },
  // ACE Inhibitors
  { name: "Ramipril", category: "ACE Inhibitor", defaultDose: "5mg", defaultFreq: "OD", drugClass: "acei" },
  { name: "Ramipril 10mg", category: "ACE Inhibitor", defaultDose: "10mg", defaultFreq: "OD", drugClass: "acei" },
  { name: "Enalapril", category: "ACE Inhibitor", defaultDose: "5mg", defaultFreq: "BD", drugClass: "acei" },
  { name: "Lisinopril", category: "ACE Inhibitor", defaultDose: "10mg", defaultFreq: "OD", drugClass: "acei" },
  { name: "Perindopril", category: "ACE Inhibitor", defaultDose: "4mg", defaultFreq: "OD", drugClass: "acei" },
  // ARBs
  { name: "Telmisartan", category: "ARB", defaultDose: "40mg", defaultFreq: "OD", drugClass: "arb" },
  { name: "Telmisartan 80mg", category: "ARB", defaultDose: "80mg", defaultFreq: "OD", drugClass: "arb" },
  { name: "Losartan", category: "ARB", defaultDose: "50mg", defaultFreq: "OD", drugClass: "arb" },
  { name: "Valsartan", category: "ARB", defaultDose: "80mg", defaultFreq: "BD", drugClass: "arb" },
  // Diuretics
  { name: "Furosemide", category: "Diuretic", defaultDose: "40mg", defaultFreq: "OD", drugClass: "loop-diuretic" },
  { name: "Furosemide 80mg", category: "Diuretic", defaultDose: "80mg", defaultFreq: "OD", drugClass: "loop-diuretic" },
  { name: "Torsemide", category: "Diuretic", defaultDose: "10mg", defaultFreq: "OD", drugClass: "loop-diuretic" },
  { name: "Spironolactone", category: "Diuretic", defaultDose: "25mg", defaultFreq: "OD", drugClass: "spironolactone" },
  { name: "Eplerenone", category: "Diuretic", defaultDose: "25mg", defaultFreq: "OD", drugClass: "eplerenone" },
  { name: "Hydrochlorothiazide", category: "Diuretic", defaultDose: "12.5mg", defaultFreq: "OD", drugClass: "thiazide" },
  // Nitrates
  { name: "Isosorbide mononitrate", category: "Nitrate", defaultDose: "30mg SR", defaultFreq: "OD (morning)", drugClass: "nitrate" },
  { name: "Isosorbide mononitrate 60mg", category: "Nitrate", defaultDose: "60mg SR", defaultFreq: "OD (morning)", drugClass: "nitrate" },
  { name: "Isosorbide dinitrate", category: "Nitrate", defaultDose: "10mg", defaultFreq: "TDS", drugClass: "nitrate" },
  { name: "Nitroglycerin sublingual", category: "Nitrate", defaultDose: "0.5mg", defaultFreq: "SOS (chest pain)", drugClass: "nitrate" },
  // Calcium Channel Blockers
  { name: "Amlodipine", category: "CCB", defaultDose: "5mg", defaultFreq: "OD", drugClass: "amlodipine" },
  { name: "Amlodipine 10mg", category: "CCB", defaultDose: "10mg", defaultFreq: "OD", drugClass: "amlodipine" },
  { name: "Diltiazem", category: "CCB", defaultDose: "60mg", defaultFreq: "TDS", drugClass: "diltiazem" },
  { name: "Diltiazem SR", category: "CCB", defaultDose: "90mg SR", defaultFreq: "BD", drugClass: "diltiazem" },
  { name: "Verapamil", category: "CCB", defaultDose: "80mg", defaultFreq: "TDS", drugClass: "verapamil" },
  // Antiarrhythmics
  { name: "Amiodarone", category: "Antiarrhythmic", defaultDose: "200mg", defaultFreq: "OD", drugClass: "amiodarone" },
  { name: "Amiodarone 100mg", category: "Antiarrhythmic", defaultDose: "100mg", defaultFreq: "OD", drugClass: "amiodarone" },
  { name: "Digoxin", category: "Antiarrhythmic", defaultDose: "0.25mg", defaultFreq: "OD", drugClass: "digoxin" },
  { name: "Digoxin 0.125mg", category: "Antiarrhythmic", defaultDose: "0.125mg", defaultFreq: "OD", drugClass: "digoxin" },
  { name: "Ivabradine", category: "Antiarrhythmic", defaultDose: "5mg", defaultFreq: "BD", drugClass: "ivabradine" },
  // Heart Failure specific
  { name: "Sacubitril / Valsartan", category: "HF — ARNi", defaultDose: "49/51mg", defaultFreq: "BD", drugClass: "arb" },
  { name: "Sacubitril / Valsartan 24/26mg", category: "HF — ARNi", defaultDose: "24/26mg", defaultFreq: "BD", drugClass: "arb" },
  { name: "Dapagliflozin", category: "SGLT2i", defaultDose: "10mg", defaultFreq: "OD", drugClass: "sglt2i" },
  { name: "Empagliflozin", category: "SGLT2i", defaultDose: "10mg", defaultFreq: "OD", drugClass: "sglt2i" },
  // Others
  { name: "Ranolazine", category: "Antianginal", defaultDose: "500mg", defaultFreq: "BD", drugClass: "ranolazine" },
  { name: "Colchicine", category: "Anti-inflammatory", defaultDose: "0.5mg", defaultFreq: "BD", drugClass: "colchicine" },
  { name: "Pantoprazole", category: "PPI", defaultDose: "40mg", defaultFreq: "OD (before breakfast)", drugClass: "ppi" },
];

// ── Drug interaction rules ─────────────────────────────────────────

interface Interaction {
  match: string[];  // lowercase drug class or name substrings — ALL must be present
  severity: "high" | "moderate";
  title: string;
  message: string;
}

const INTERACTIONS: Interaction[] = [
  {
    match: ["warfarin", "aspirin", "clopidogrel"],
    severity: "high",
    title: "Triple Antithrombotic Therapy",
    message: "Warfarin + Aspirin + Clopidogrel — major GI and systemic bleeding risk. Add PPI cover (Pantoprazole 40mg OD). Minimize duration to ≤1 month post-PCI.",
  },
  {
    match: ["warfarin", "amiodarone"],
    severity: "high",
    title: "Warfarin + Amiodarone",
    message: "Amiodarone inhibits warfarin metabolism — INR rises 30–50%. Reduce warfarin dose by 30–50% on starting amiodarone. Check INR weekly for 4 weeks.",
  },
  {
    match: ["digoxin", "amiodarone"],
    severity: "high",
    title: "Digoxin + Amiodarone",
    message: "Amiodarone doubles digoxin levels — toxicity risk (nausea, bradycardia, AV block). Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels.",
  },
  {
    match: ["digoxin", "verapamil"],
    severity: "high",
    title: "Digoxin + Verapamil",
    message: "Verapamil raises digoxin levels by 50–75% — toxicity risk. Reduce digoxin dose by 30–50% and monitor levels closely.",
  },
  {
    match: ["metoprolol", "verapamil"],
    severity: "high",
    title: "Beta-blocker + Verapamil",
    message: "Severe bradycardia and complete AV block risk. Combination is generally contraindicated. Consider amlodipine instead of verapamil.",
  },
  {
    match: ["carvedilol", "verapamil"],
    severity: "high",
    title: "Beta-blocker + Verapamil",
    message: "Severe bradycardia and complete AV block risk. Avoid this combination.",
  },
  {
    match: ["bisoprolol", "verapamil"],
    severity: "high",
    title: "Beta-blocker + Verapamil",
    message: "Severe bradycardia and complete AV block risk. Avoid this combination.",
  },
  {
    match: ["metoprolol", "diltiazem"],
    severity: "high",
    title: "Beta-blocker + Diltiazem",
    message: "Bradycardia and AV block risk. Use with extreme caution; monitor ECG and PR interval.",
  },
  {
    match: ["warfarin", "aspirin"],
    severity: "moderate",
    title: "Warfarin + Aspirin",
    message: "Increased bleeding risk. Monitor INR closely. Add PPI cover. Use lowest effective aspirin dose (75mg).",
  },
  {
    match: ["warfarin", "clopidogrel"],
    severity: "moderate",
    title: "Warfarin + Clopidogrel",
    message: "Dual antithrombotic therapy — increased bleeding risk. Add PPI. Review indication and duration regularly.",
  },
  {
    match: ["acei", "spironolactone"],
    severity: "moderate",
    title: "ACEi + Spironolactone",
    message: "Hyperkalemia risk. Monitor serum potassium at 1 week and 1 month. Hold if K⁺ >5.5 mEq/L.",
  },
  {
    match: ["acei", "eplerenone"],
    severity: "moderate",
    title: "ACEi + Eplerenone",
    message: "Hyperkalemia risk. Monitor serum potassium at 1 week and 1 month. Hold if K⁺ >5.5 mEq/L.",
  },
  {
    match: ["noac", "aspirin"],
    severity: "moderate",
    title: "NOAC + Aspirin",
    message: "Increased bleeding risk. Use lowest effective aspirin dose (75mg). Avoid unless clear indication (e.g., post-ACS).",
  },
  {
    match: ["noac", "clopidogrel"],
    severity: "moderate",
    title: "NOAC + Antiplatelet",
    message: "Dual antithrombotic therapy — increased bleeding risk. Add PPI. Limit duration.",
  },
  {
    match: ["statin", "amiodarone"],
    severity: "moderate",
    title: "Statin + Amiodarone",
    message: "Myopathy risk. Limit Atorvastatin to ≤40mg/day when co-prescribed with Amiodarone.",
  },
];

function checkInteractions(drugs: DrugItem[]): Interaction[] {
  const names = drugs.map(d => d.drug.toLowerCase());
  const classes = drugs.map(d => {
    const entry = DRUG_DB.find(e => e.name.toLowerCase() === d.drug.toLowerCase());
    return entry?.drugClass ?? d.drug.toLowerCase();
  });
  const all = [...names, ...classes];

  const found: Interaction[] = [];
  for (const rule of INTERACTIONS) {
    if (rule.match.every(token => all.some(s => s.includes(token)))) {
      // Avoid duplicating triple-therapy when 2-drug subsets also match
      const alreadyCovered = found.some(f => f.title === rule.title);
      if (!alreadyCovered) found.push(rule);
    }
  }
  // Deduplicate: if triple-therapy fires, suppress the 2-drug subset warnings for same drugs
  const tripleTitle = "Triple Antithrombotic Therapy";
  if (found.some(f => f.title === tripleTitle)) {
    return found.filter(f => !["Warfarin + Aspirin", "Warfarin + Clopidogrel"].includes(f.title));
  }
  return found;
}

// ── Types ──────────────────────────────────────────────────────────

interface ClinicalAlert {
  severity: "critical" | "warning" | "info";
  type: string;
  title: string;
  message: string;
  drugs: string[];
}

interface DrugItem {
  drug: string;
  dose: string;
  freq: string;
  duration: string;
  instructions: string;
}

interface RxData {
  rx_id: string;
  patient_id: string | null;
  patient_display: string | null;
  patient_phone: string | null;
  session_id: string | null;
  diagnosis: string;
  drugs: DrugItem[];
  notes: string;
  status: string;
  whatsapp_sent_at: string | null;
  created_at: string | null;
}

// ── Drug row ──────────────────────────────────────────────────────

const FREQS = ["OD", "BD", "TDS", "QID", "HS", "SOS", "Weekly", "OD (morning)", "BD (SC)", "OD with dinner", "OD (dose per INR)"];
const DURATIONS = ["7 days", "14 days", "1 month", "2 months", "3 months", "6 months", "1 year", "Lifelong"];

function DrugRow({ drug, index, onChange, onRemove, locked }: {
  drug: DrugItem;
  index: number;
  onChange: (i: number, field: keyof DrugItem, val: string) => void;
  onRemove: (i: number) => void;
  locked: boolean;
}) {
  return (
    <div className="py-2.5" style={{ borderBottom: "1px dashed #ececea" }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-400 w-5 shrink-0">{index + 1}.</span>
        <p className="text-xs font-semibold text-gray-900 flex-1 min-w-0 truncate">{drug.drug}</p>
        <input
          value={drug.dose}
          onChange={e => onChange(index, "dose", e.target.value)}
          disabled={locked}
          placeholder="Dose"
          className="w-20 px-2 py-1 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#e11d48] text-center disabled:bg-gray-50 disabled:text-gray-500"
          style={{ border: "1px solid #d4d4d2" }}
        />
        <select
          value={drug.freq}
          onChange={e => onChange(index, "freq", e.target.value)}
          disabled={locked}
          className="px-2 py-1 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#e11d48] bg-white disabled:bg-gray-50 disabled:text-gray-500"
          style={{ border: "1px solid #d4d4d2" }}
        >
          {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={drug.duration}
          onChange={e => onChange(index, "duration", e.target.value)}
          disabled={locked}
          className="px-2 py-1 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#e11d48] bg-white disabled:bg-gray-50 disabled:text-gray-500"
          style={{ border: "1px solid #d4d4d2" }}
        >
          <option value="">Duration…</option>
          {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {!locked && (
          <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-400 transition cursor-pointer shrink-0 text-base leading-none">×</button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5 pl-7">
        <input
          value={drug.instructions}
          onChange={e => onChange(index, "instructions", e.target.value)}
          disabled={locked}
          placeholder="Special instructions (e.g., take after food)"
          className="flex-1 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#e11d48] text-gray-500 disabled:bg-gray-50"
          style={{ border: "1px solid #ececea" }}
        />
      </div>
    </div>
  );
}

// ── Drug search / add ──────────────────────────────────────────────

function DrugSearch({ onAdd }: { onAdd: (d: DrugItem) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length > 0
    ? DRUG_DB.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (entry: DrugEntry) => {
    onAdd({ drug: entry.name, dose: entry.defaultDose, freq: entry.defaultFreq, duration: "Lifelong", instructions: "" });
    setQuery("");
    setOpen(false);
  };

  const addCustom = () => {
    if (!query.trim()) return;
    onAdd({ drug: query.trim(), dose: "", freq: "OD", duration: "", instructions: "" });
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-4 py-3" style={{ borderTop: "1px dashed #d4d4d2" }}>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search drug to add… (e.g. Aspirin, Atorvastatin)"
          className="flex-1 px-3 py-1.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#e11d48]"
          style={{ border: "1.5px solid #d4d4d2" }}
          onKeyDown={e => { if (e.key === "Enter" && filtered.length > 0) select(filtered[0]); }}
        />
        {query.trim() && (
          <button
            onClick={addCustom}
            className="px-3 py-1.5 text-xs bg-[#ffe4e6] text-[#9f1239] rounded-xl hover:bg-[#fecdd3] cursor-pointer font-medium"
          >
            Add custom
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl overflow-hidden z-20 shadow-lg"
          style={{ border: "1.5px solid #1a1a1a" }}
        >
          {filtered.map(entry => (
            <button
              key={entry.name}
              onClick={() => select(entry)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#ffe4e6] text-left transition cursor-pointer"
              style={{ borderBottom: "1px dashed #ececea" }}
            >
              <div>
                <p className="text-xs font-semibold text-gray-800">{entry.name}</p>
                <p className="text-[10px] text-gray-400">{entry.category} · {entry.defaultDose} {entry.defaultFreq}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Interaction warning ────────────────────────────────────────────

function InteractionAlert({ interaction }: { interaction: Interaction }) {
  const high = interaction.severity === "high";
  return (
    <div
      className="flex gap-2.5 px-3 py-2.5 rounded-xl"
      style={{ background: high ? "#FEF2F2" : "#FFFBEB", border: `1px solid ${high ? "#FECACA" : "#FDE68A"}` }}
    >
      <span className="text-base leading-none mt-0.5 shrink-0">{high ? "⚠️" : "⚡"}</span>
      <div>
        <p className="text-xs font-bold" style={{ color: high ? "#991B1B" : "#92400E" }}>{interaction.title}</p>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: high ? "#7F1D1D" : "#78350F" }}>{interaction.message}</p>
      </div>
    </div>
  );
}

// ── Print layout ───────────────────────────────────────────────────

function PrintLayout({ rx, doctorName }: { rx: RxData; doctorName?: string }) {
  return (
    // Off-screen on screen; in print media we flip to display:block (visibility
    // alone can't beat display:none, which is why printing was previously blank).
    <div id="print-rx" style={{ display: "none" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: white !important; }
          body * { visibility: hidden !important; }
          #print-rx { display: block !important; }
          #print-rx, #print-rx * { visibility: visible !important; }
          #print-rx { position: fixed; inset: 0; padding: 18px 28px; background: white; font-family: Inter, sans-serif; color: #1a1a1a; }
        }
      `}</style>
      <div style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{doctorName ? `Dr. ${doctorName}` : "Cardiologist"}</p>
        <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>StobaeusVoice — Cardiac Documentation Platform</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 11 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Patient: {rx.patient_display || rx.patient_id || "Anonymous"}</p>
          {rx.diagnosis && <p style={{ margin: "2px 0 0", color: "#374151" }}>Diagnosis: {rx.diagnosis}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, color: "#6b7280" }}>Rx ID: {rx.rx_id}</p>
          <p style={{ margin: "2px 0 0", color: "#6b7280" }}>{rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""}</p>
        </div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, borderBottom: "1px dashed #d4d4d2", paddingBottom: 4 }}>℞ Medications</p>
      {(rx.drugs || []).map((d, i) => (
        <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed #ececea" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>
            {i + 1}. {d.drug} {d.dose} — {d.freq}{d.duration ? ` × ${d.duration}` : ""}
          </p>
          {d.instructions && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6b7280" }}>{d.instructions}</p>}
        </div>
      ))}
      {rx.notes && (
        <div style={{ marginTop: 16, padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>Notes</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#374151" }}>{rx.notes}</p>
        </div>
      )}
      <p style={{ marginTop: 24, fontSize: 10, color: "#9ca3af" }}>Please take medications as prescribed. Contact your doctor if you experience any side effects.</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function PrescriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rxId = params.rxId as string;

  const [rx, setRx] = useState<RxData | null>(null);
  const [drugs, setDrugs] = useState<DrugItem[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);
  const [waSent, setWaSent] = useState(false);
  const [error, setError] = useState("");

  const [patientConditions, setPatientConditions] = useState<string[]>([]);
  const [conditionAlerts, setConditionAlerts] = useState<ClinicalAlert[]>([]);

  // Dictation state — lives on the right panel.
  const [transcript, setTranscript] = useState("");
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { recording: dictating, error: dictError, toggle: toggleDictation } =
    useLiveAppend(transcript, setTranscript);

  // Once confirmed/sent, every editable control on the page is read-only.
  const locked = rx?.status === "confirmed" || rx?.status === "sent";

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.getPrescription(rxId).then((data: RxData) => {
      setRx(data);
      setDrugs(Array.isArray(data.drugs) ? data.drugs.map(d => ({
        drug: d.drug || "",
        dose: d.dose || "",
        freq: d.freq || "OD",
        duration: d.duration || "",
        instructions: d.instructions || "",
      })) : []);
      setDiagnosis(data.diagnosis || "");
      setNotes(data.notes || "");
      // Fetch patient conditions for condition-aware alert checking
      if (data.patient_id && !data.patient_id.startsWith("PT-ANON")) {
        api.getClinicalContext(data.patient_id).then((ctx: { conditions?: string[] } | null) => {
          setPatientConditions(ctx?.conditions || []);
        }).catch(() => {});
      }
    }).catch(() => setError("Failed to load prescription"))
      .finally(() => setLoading(false));
  }, [rxId]);

  const autosave = useCallback(() => {
    if (locked) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaved(false);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.updatePrescription(rxId, { diagnosis, drugs, notes });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [rxId, diagnosis, drugs, notes, locked]);

  useEffect(() => { autosave(); }, [drugs, diagnosis, notes, autosave]);

  // Condition-aware alert check (backend only — condition_only=true avoids duplicating frontend drug-drug checks)
  useEffect(() => {
    if (drugs.length === 0 || patientConditions.length === 0) {
      setConditionAlerts([]);
      return;
    }
    const timer = setTimeout(() => {
      api.checkClinicalAlerts(drugs, patientConditions, true)
        .then((res: { alerts: ClinicalAlert[] }) => setConditionAlerts(res.alerts || []))
        .catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [drugs, patientConditions]);

  // ── Dictation → AI extraction → fill form ──────────────────────
  const generateFromDictation = async () => {
    if (!transcript.trim()) {
      setError("Dictate the prescription first.");
      return;
    }
    setGenerating(true); setError("");
    try {
      const result = await api.generatePrescriptionFromDictation(rxId, transcript);
      if (result.diagnosis) setDiagnosis(result.diagnosis);
      if (Array.isArray(result.drugs) && result.drugs.length > 0) {
        // Merge — append new drugs, keep any the doctor already added manually.
        const existingNames = new Set(drugs.map(d => d.drug.toLowerCase()));
        const additions = result.drugs.filter(d => !existingNames.has(d.drug.toLowerCase()));
        setDrugs(arr => [...arr, ...additions]);
      }
      if (result.notes) setNotes(prev => prev ? `${prev}\n${result.notes}` : result.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not extract prescription from dictation.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Confirm — lock the prescription ────────────────────────────
  const confirmRx = async () => {
    if (drugs.length === 0) { setError("Add at least one medication before confirming."); return; }
    // Flush any pending autosave first so the latest edits are persisted.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setConfirming(true); setError("");
    try {
      await api.updatePrescription(rxId, { diagnosis, drugs, notes });
      const res = await api.confirmPrescription(rxId);
      setRx(r => r ? { ...r, status: res.status } : r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm prescription.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDrugChange = (i: number, field: keyof DrugItem, val: string) => {
    setDrugs(arr => arr.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  };

  const handleDrugRemove = (i: number) => {
    setDrugs(arr => arr.filter((_, idx) => idx !== i));
  };

  const handleAddDrug = (d: DrugItem) => {
    setDrugs(arr => [...arr, d]);
  };

  const handleWhatsApp = async () => {
    setSendingWA(true);
    setError("");
    try {
      const res = await api.sendWhatsApp(rxId);
      if (res.whatsapp_url) {
        // Backend returns a wa.me web link. Rewrite to the whatsapp:// scheme so
        // the user's installed WhatsApp Desktop app handles it directly (Mac /
        // Windows). Browser falls back to wa.me automatically if the protocol
        // isn't registered.
        const desktopUrl = res.whatsapp_url.replace(
          /^https?:\/\/wa\.me\//,
          "whatsapp://send?phone="
        ).replace("?text=", "&text=");
        window.location.href = desktopUrl;

        // Open the print-to-PDF dialog so the doctor can save the PDF and drag
        // it into the WhatsApp chat. WhatsApp does NOT allow auto-attaching
        // files via URL — this is the standard manual handoff.
        setTimeout(() => window.print(), 600);

        setWaSent(true);
        setRx(r => r ? { ...r, whatsapp_sent_at: new Date().toISOString() } : r);
      }
    } catch {
      setError("Failed to generate WhatsApp link.");
    } finally {
      setSendingWA(false);
    }
  };

  const interactions = checkInteractions(drugs);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading prescription…</div>;
  }

  if (!rx) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">{error || "Prescription not found"}</p>
        <button onClick={() => router.push("/dashboard/prescriptions")} className="text-xs text-[#e11d48] hover:underline cursor-pointer">← Back</button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Print layout (hidden until print) */}
      <PrintLayout rx={{ ...rx, drugs, diagnosis, notes }} />

      {/* Main editor */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hand text-xl font-bold text-gray-900">{rx.rx_id}</h1>
              {locked && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]" style={{ border: "1px solid #86EFAC" }}>
                  ✓ Confirmed
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {rx.patient_display || rx.patient_id || "Anonymous"} · {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
              {!locked && saving && <span className="ml-2 text-gray-300">Saving…</span>}
              {!locked && saved && <span className="ml-2 text-[#10B981]">Saved</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/prescriptions")}
              className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              ← Back
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              style={{ border: "1.5px solid #d4d4d2" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
              Print
            </button>
          </div>
        </div>

        {error && <div className="mx-5 mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>}

        <div className="p-5 flex flex-col gap-4">
          {/* Diagnosis */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <span className="w-2 h-2 rounded-sm bg-[#e11d48] shrink-0" />
              <h3 className="font-hand text-sm font-bold text-gray-900">Diagnosis / Indication</h3>
            </div>
            <input
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              disabled={locked}
              placeholder="e.g. Acute STEMI post-PCI, Atrial Fibrillation with RVR, DCM with HFrEF…"
              className="w-full px-4 py-3 text-xs text-gray-700 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Medications */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-[#e11d48] shrink-0" />
                <h3 className="font-hand text-sm font-bold text-gray-900">Medications</h3>
              </div>
              <span className="text-[10px] text-gray-400">{drugs.length} drugs</span>
            </div>

            <div className="px-4">
              {drugs.length === 0 && (
                <p className="text-[11px] text-gray-400 py-4 text-center">No medications added — search below to add</p>
              )}
              {drugs.map((d, i) => (
                <DrugRow key={i} drug={d} index={i} onChange={handleDrugChange} onRemove={handleDrugRemove} locked={locked} />
              ))}
            </div>

            {/* Condition-aware patient safety alerts (backend) */}
            {conditionAlerts.length > 0 && (
              <div className="px-4 pb-3 flex flex-col gap-2" style={{ borderTop: "1px solid #fca5a5", paddingTop: 12, background: "#FEF2F2" }}>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Patient-specific Safety Alerts</p>
                </div>
                {conditionAlerts.map((a, i) => (
                  <div key={i} className="flex gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                    <div>
                      <p className="text-xs font-bold text-red-800">{a.title}</p>
                      <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drug interaction warnings (frontend, instant) */}
            {interactions.length > 0 && (
              <div className="px-4 pb-3 flex flex-col gap-2" style={{ borderTop: "1px dashed #d4d4d2", paddingTop: 12 }}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Drug Interactions</p>
                {interactions.map((ia, i) => <InteractionAlert key={i} interaction={ia} />)}
              </div>
            )}

            {!locked && <DrugSearch onAdd={handleAddDrug} />}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <span className="w-2 h-2 rounded-sm bg-[#e11d48] shrink-0" />
              <h3 className="font-hand text-sm font-bold text-gray-900">Clinical Notes</h3>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={locked}
              rows={3}
              placeholder="Special instructions, dietary advice, follow-up guidance, monitoring parameters…"
              className="w-full px-4 py-3 text-xs text-gray-700 outline-none resize-none bg-white leading-relaxed disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Right panel: patient info + send */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: "1px dashed #d4d4d2" }}>
        {/* Header matches main */}
        <div className="flex items-center px-4 h-[72px] shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h3 className="font-hand text-base font-bold text-gray-900">Send & Actions</h3>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Dictation — only shown while the prescription is editable */}
          {!locked && (
            <div className="rounded-xl p-3 bg-white" style={{ border: "1.5px solid #1a1a1a" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#ffe4e6] flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-gray-800">Dictate prescription</p>
                </div>
                <button
                  onClick={toggleDictation}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition cursor-pointer ${
                    dictating
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-[#ffe4e6] text-[#9f1239] hover:bg-[#fecdd3]"
                  }`}
                >
                  {dictating ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" /> Stop</>
                  ) : (
                    <>● Dictate</>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                Speak the diagnosis, drugs, doses, and any notes. Review the live transcript below, then Generate to fill the prescription.
              </p>

              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder='e.g. "Post-PCI follow-up. Aspirin 75mg OD, Atorvastatin 40mg HS, Metoprolol 50mg OD, Ramipril 5mg OD. Continue lifelong. Take after food. Follow up in two weeks."'
                rows={5}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white resize-none leading-relaxed"
                style={{ border: "1.5px solid #d4d4d2" }}
              />

              {dictError && (
                <p className="text-[10px] text-red-600 mt-1.5">{dictError}</p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={generateFromDictation}
                  disabled={generating || dictating || !transcript.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#e11d48] text-white text-[11px] font-semibold py-2 rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
                  style={{ boxShadow: "2px 2px 0 #9f1239" }}
                >
                  {generating ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> Generating…</>
                  ) : (
                    <>✦ Generate from Dictation</>
                  )}
                </button>
                {transcript && !dictating && (
                  <button
                    onClick={() => setTranscript("")}
                    className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-2 cursor-pointer"
                    title="Clear transcript"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Confirm prescription — locks the record */}
          {!locked && (
            <div className="rounded-xl p-3" style={{ border: "1.5px solid #15803D", background: "#F0FDF4" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <p className="text-xs font-bold text-[#14532D]">Confirm Prescription</p>
              </div>
              <p className="text-[10px] text-[#15803D] mb-2.5 leading-relaxed">
                Locks the prescription. After confirming, the diagnosis, medications and notes cannot be edited.
              </p>
              <button
                onClick={confirmRx}
                disabled={confirming || drugs.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#15803D] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#166534] transition cursor-pointer disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0 #14532D" }}
              >
                {confirming ? (
                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming…</>
                ) : (
                  <>✓ Confirm &amp; Lock</>
                )}
              </button>
            </div>
          )}

          {/* Patient card */}
          <div className="rounded-xl p-3 bg-[#fff1f2]" style={{ border: "1px solid #fecdd3" }}>
            <p className="text-[10px] font-bold text-[#9f1239] uppercase tracking-wide mb-1.5">Patient</p>
            <p className="text-sm font-semibold text-gray-800">{rx.patient_display || "Anonymous"}</p>
            {rx.patient_id && <p className="text-[10px] font-mono text-gray-500 mt-0.5">{rx.patient_id}</p>}
            {rx.patient_phone && (
              <p className="text-[11px] text-gray-600 mt-1">
                <span className="font-mono">📱 {rx.patient_phone}</span>
              </p>
            )}
            {!rx.patient_phone && (
              <p className="text-[10px] text-gray-400 mt-1 italic">No phone number on file</p>
            )}
          </div>

          {/* WhatsApp send */}
          <div className="rounded-xl p-3" style={{ border: "1.5px solid #1a1a1a", background: "white" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.998 0C5.372 0 0 5.373 0 12.002c0 2.117.554 4.104 1.522 5.825L.057 23.997l6.304-1.652A11.954 11.954 0 0011.998 24C18.627 24 24 18.628 24 12.002 24 5.373 18.627 0 11.998 0zm0 21.818a9.817 9.817 0 01-5.007-1.371l-.359-.214-3.722.976.993-3.63-.234-.374a9.808 9.808 0 01-1.503-5.203c0-5.414 4.406-9.818 9.832-9.818 5.427 0 9.832 4.404 9.832 9.818 0 5.415-4.405 9.816-9.832 9.816z"/></svg>
              </div>
              <p className="text-xs font-bold text-gray-800">Send via WhatsApp</p>
            </div>
            <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
              Opens WhatsApp with the prescription pre-formatted as a message. Patient receives it instantly.
            </p>
            {!rx.patient_phone && (
              <p className="text-[10px] text-amber-600 mb-2 bg-amber-50 px-2 py-1.5 rounded-lg">
                No phone number — will open WhatsApp without recipient pre-filled.
              </p>
            )}
            <button
              onClick={handleWhatsApp}
              disabled={sendingWA || drugs.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-[#16A34A] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#15803D] transition cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0 #14532D" }}
            >
              {sendingWA ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing…</>
              ) : waSent ? (
                <>✓ Sent — Send again</>
              ) : (
                <>Send Prescription on WhatsApp</>
              )}
            </button>
            {waSent && rx.whatsapp_sent_at && (
              <p className="text-[10px] text-[#15803D] mt-1.5 text-center">
                Last sent {new Date(rx.whatsapp_sent_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          {/* Print */}
          <div className="rounded-xl p-3" style={{ border: "1.5px solid #1a1a1a", background: "white" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
              </div>
              <p className="text-xs font-bold text-gray-800">Print Prescription</p>
            </div>
            <p className="text-[10px] text-gray-500 mb-3">Prints a clean A4 prescription with doctor letterhead layout.</p>
            <button
              onClick={() => window.print()}
              disabled={drugs.length === 0}
              className="w-full py-2.5 text-xs font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
              style={{ border: "1.5px solid #d4d4d2" }}
            >
              Print Prescription
            </button>
          </div>

          {/* Interaction count summary */}
          {interactions.length > 0 && (
            <div className="rounded-xl p-3" style={{ border: "1px solid #FDE68A", background: "#FFFBEB" }}>
              <p className="text-[11px] font-bold text-amber-800">
                {interactions.filter(i => i.severity === "high").length > 0
                  ? `⚠️ ${interactions.filter(i => i.severity === "high").length} high-severity interaction${interactions.filter(i => i.severity === "high").length > 1 ? "s" : ""}`
                  : `⚡ ${interactions.length} interaction${interactions.length > 1 ? "s" : ""} flagged`}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">Review warnings in the medications panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
