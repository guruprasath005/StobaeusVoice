"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

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

function DrugRow({ drug, index, onChange, onRemove }: {
  drug: DrugItem;
  index: number;
  onChange: (i: number, field: keyof DrugItem, val: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="py-2.5" style={{ borderBottom: "1px dashed #ececea" }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-400 w-5 shrink-0">{index + 1}.</span>
        <p className="text-xs font-semibold text-gray-900 flex-1 min-w-0 truncate">{drug.drug}</p>
        <input
          value={drug.dose}
          onChange={e => onChange(index, "dose", e.target.value)}
          placeholder="Dose"
          className="w-20 px-2 py-1 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] text-center"
          style={{ border: "1px solid #d4d4d2" }}
        />
        <select
          value={drug.freq}
          onChange={e => onChange(index, "freq", e.target.value)}
          className="px-2 py-1 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white"
          style={{ border: "1px solid #d4d4d2" }}
        >
          {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={drug.duration}
          onChange={e => onChange(index, "duration", e.target.value)}
          className="px-2 py-1 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white"
          style={{ border: "1px solid #d4d4d2" }}
        >
          <option value="">Duration…</option>
          {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-400 transition cursor-pointer shrink-0 text-base leading-none">×</button>
      </div>
      <div className="flex items-center gap-2 mt-1.5 pl-7">
        <input
          value={drug.instructions}
          onChange={e => onChange(index, "instructions", e.target.value)}
          placeholder="Special instructions (e.g., take after food)"
          className="flex-1 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] text-gray-500"
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
          className="flex-1 px-3 py-1.5 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          style={{ border: "1.5px solid #d4d4d2" }}
          onKeyDown={e => { if (e.key === "Enter" && filtered.length > 0) select(filtered[0]); }}
        />
        {query.trim() && (
          <button
            onClick={addCustom}
            className="px-3 py-1.5 text-xs bg-[#E0F2FE] text-[#0369A1] rounded-xl hover:bg-[#bae6fd] cursor-pointer font-medium"
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
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#E0F2FE] text-left transition cursor-pointer"
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
    <div id="print-rx" className="hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-rx, #print-rx * { visibility: visible !important; }
          #print-rx { position: fixed; inset: 0; padding: 32px 40px; background: white; font-family: Inter, sans-serif; }
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
    }).catch(() => setError("Failed to load prescription"))
      .finally(() => setLoading(false));
  }, [rxId]);

  const autosave = useCallback(() => {
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
  }, [rxId, diagnosis, drugs, notes]);

  useEffect(() => { autosave(); }, [drugs, diagnosis, notes, autosave]);

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
        window.open(res.whatsapp_url, "_blank");
        setWaSent(true);
        setRx(r => r ? { ...r, status: "sent", whatsapp_sent_at: new Date().toISOString() } : r);
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
        <button onClick={() => router.push("/dashboard/prescriptions")} className="text-xs text-[#0EA5E9] hover:underline cursor-pointer">← Back</button>
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
            <h1 className="font-hand text-xl font-bold text-gray-900">{rx.rx_id}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {rx.patient_display || rx.patient_id || "Anonymous"} · {rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
              {saving && <span className="ml-2 text-gray-300">Saving…</span>}
              {saved && <span className="ml-2 text-[#10B981]">Saved</span>}
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
              <span className="w-2 h-2 rounded-sm bg-[#0EA5E9] shrink-0" />
              <h3 className="font-hand text-sm font-bold text-gray-900">Diagnosis / Indication</h3>
            </div>
            <input
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute STEMI post-PCI, Atrial Fibrillation with RVR, DCM with HFrEF…"
              className="w-full px-4 py-3 text-xs text-gray-700 outline-none bg-white"
            />
          </div>

          {/* Medications */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-[#0EA5E9] shrink-0" />
                <h3 className="font-hand text-sm font-bold text-gray-900">Medications</h3>
              </div>
              <span className="text-[10px] text-gray-400">{drugs.length} drugs</span>
            </div>

            <div className="px-4">
              {drugs.length === 0 && (
                <p className="text-[11px] text-gray-400 py-4 text-center">No medications added — search below to add</p>
              )}
              {drugs.map((d, i) => (
                <DrugRow key={i} drug={d} index={i} onChange={handleDrugChange} onRemove={handleDrugRemove} />
              ))}
            </div>

            {/* Interaction warnings */}
            {interactions.length > 0 && (
              <div className="px-4 pb-3 flex flex-col gap-2" style={{ borderTop: "1px dashed #d4d4d2", paddingTop: 12 }}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Drug Interactions</p>
                {interactions.map((ia, i) => <InteractionAlert key={i} interaction={ia} />)}
              </div>
            )}

            <DrugSearch onAdd={handleAddDrug} />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <span className="w-2 h-2 rounded-sm bg-[#0EA5E9] shrink-0" />
              <h3 className="font-hand text-sm font-bold text-gray-900">Clinical Notes</h3>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Special instructions, dietary advice, follow-up guidance, monitoring parameters…"
              className="w-full px-4 py-3 text-xs text-gray-700 outline-none resize-none bg-white leading-relaxed"
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
          {/* Patient card */}
          <div className="rounded-xl p-3 bg-[#F0F9FF]" style={{ border: "1px solid #BAE6FD" }}>
            <p className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wide mb-1.5">Patient</p>
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
