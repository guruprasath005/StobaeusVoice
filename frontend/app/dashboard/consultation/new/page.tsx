"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────────

interface SearchResult {
  patient_id: string;
  display: string;
  age: number | null;
  gender_code: string | null;
  conditions: string[];
  medications: { drug: string; dose?: string; freq?: string }[];
  allergies: string[];
  has_recent_consultation: boolean;
  last_visit_date: string | null;
}

interface MedEntry { drug: string; dose: string; freq: string; }

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ d, d2, size = 16 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

// ── Tag input ──────────────────────────────────────────────────────

function TagInput({ label, tags, onChange, placeholder }: {
  label: string; tags: string[]; onChange: (t: string[]) => void; placeholder: string;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setVal("");
  };
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">{label}</label>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 text-[10px] bg-[#ffe4e6] text-[#9f1239] px-2 py-0.5 rounded-full font-medium">
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} className="text-[#9f1239] hover:text-red-500 leading-none cursor-pointer">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48]"
          style={{ border: "1.5px solid #d4d4d2" }}
        />
        <button type="button" onClick={add} className="px-2.5 py-1.5 text-xs bg-[#ffe4e6] text-[#9f1239] rounded-lg hover:bg-[#fecdd3] cursor-pointer font-medium">Add</button>
      </div>
    </div>
  );
}

// ── Med input ──────────────────────────────────────────────────────

function MedInput({ meds, onChange }: {
  meds: MedEntry[]; onChange: (m: MedEntry[]) => void;
}) {
  const [draft, setDraft] = useState<MedEntry>({ drug: "", dose: "", freq: "" });
  const add = () => {
    if (!draft.drug.trim()) return;
    onChange([...meds, { ...draft }]);
    setDraft({ drug: "", dose: "", freq: "" });
  };
  const FREQ = ["OD", "BD", "TDS", "QID", "HS", "SOS", "PRN"];
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">Medications</label>
      {meds.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {meds.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 bg-gray-50 rounded-lg">
              <span><strong>{m.drug}</strong>{m.dose ? ` ${m.dose}` : ""}{m.freq ? ` · ${m.freq}` : ""}</span>
              <button onClick={() => onChange(meds.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 cursor-pointer ml-2">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          value={draft.drug}
          onChange={e => setDraft(d => ({ ...d, drug: e.target.value }))}
          placeholder="Drug name"
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48]"
          style={{ border: "1.5px solid #d4d4d2" }}
        />
        <input
          value={draft.dose}
          onChange={e => setDraft(d => ({ ...d, dose: e.target.value }))}
          placeholder="Dose"
          className="w-20 px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48]"
          style={{ border: "1.5px solid #d4d4d2" }}
        />
        <select
          value={draft.freq}
          onChange={e => setDraft(d => ({ ...d, freq: e.target.value }))}
          className="w-16 px-1.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white"
          style={{ border: "1.5px solid #d4d4d2" }}
        >
          <option value="">Freq</option>
          {FREQ.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button type="button" onClick={add} className="px-2.5 py-1.5 text-xs bg-[#ffe4e6] text-[#9f1239] rounded-lg hover:bg-[#fecdd3] cursor-pointer font-medium">Add</button>
      </div>
    </div>
  );
}

// ── New Patient Form ───────────────────────────────────────────────

function NewPatientForm({ onSaved, onCancel }: {
  onSaved: (patientId: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "", dob: "", gender: "", phone: "", abha_id: "", insurance: "", address: "", mrn: "",
  });
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<MedEntry[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [blood_group, setBloodGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const BLOOD = ["A+", "A−", "B+", "B−", "O+", "O−", "AB+", "AB−"];
  const field = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.full_name.trim()) { setError("Patient name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await api.registerPatient({ ...form, conditions, medications, allergies, blood_group });
      if (res.patient_id) onSaved(res.patient_id);
      else setError(res.detail || "Registration failed");
    } catch { setError("Network error — is the backend running?"); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white";
  const inputSty = { border: "1.5px solid #d4d4d2" };
  const labelCls = "block text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1";

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Section: Identity */}
      <div className="px-5 py-3 bg-gray-50 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Identity — stored in DB only, never sent to AI</p>
        </div>
      </div>
      <div className="px-5 py-4 overflow-auto flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Full Name *</label>
            <input value={form.full_name} onChange={field("full_name")} placeholder="e.g. Ravi Kumar" className={inputCls} style={inputSty} />
          </div>
          <div>
            <label className={labelCls}>Date of Birth</label>
            <input type="date" value={form.dob} onChange={field("dob")} className={inputCls} style={inputSty} />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select value={form.gender} onChange={field("gender")} className={inputCls + " bg-white"} style={inputSty}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.phone} onChange={field("phone")} placeholder="+91 98765 43210" className={inputCls} style={inputSty} />
          </div>
          <div>
            <label className={labelCls}>ABHA ID</label>
            <input value={form.abha_id} onChange={field("abha_id")} placeholder="14-XXXX-XXXX-XXXX" className={inputCls} style={inputSty} />
          </div>
          <div>
            <label className={labelCls}>MRN (Hospital ID)</label>
            <input value={form.mrn} onChange={field("mrn")} placeholder="Hospital MRN" className={inputCls} style={inputSty} />
          </div>
          <div>
            <label className={labelCls}>Insurance</label>
            <input value={form.insurance} onChange={field("insurance")} placeholder="Insurer / policy" className={inputCls} style={inputSty} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Address</label>
            <textarea value={form.address} onChange={field("address")} placeholder="City / locality" rows={2} className={inputCls + " resize-none"} style={inputSty} />
          </div>
        </div>

        {/* Section: Clinical context */}
        <div className="-mx-5 px-5 py-3 bg-gray-50" style={{ borderTop: "1px dashed #d4d4d2", borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48] shrink-0" />
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Clinical Context — safe to send to AI for SOAP note generation</p>
          </div>
        </div>

        <TagInput label="Known Conditions" tags={conditions} onChange={setConditions} placeholder="e.g. CAD, Hypertension, AF" />
        <MedInput meds={medications} onChange={setMedications} />
        <TagInput label="Allergies" tags={allergies} onChange={setAllergies} placeholder="e.g. Penicillin, Aspirin" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Blood Group</label>
            <select value={blood_group} onChange={e => setBloodGroup(e.target.value)} className={inputCls + " bg-white"} style={inputSty}>
              <option value="">Unknown</option>
              {BLOOD.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-end gap-2 shrink-0" style={{ borderTop: "1px dashed #d4d4d2" }}>
        <button onClick={onCancel} className="px-4 py-2 text-xs text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-[#e11d48] text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
          style={{ boxShadow: "2px 2px 0 #9f1239" }}
        >
          {saving ? "Saving…" : "Register & Start Consultation →"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

function StartConsultationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState<"search" | "register">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill patient if navigated from patients page
  useEffect(() => {
    const pid = searchParams.get("patient");
    if (pid) beginConsultation(pid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api.searchPatients(q);
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const beginConsultation = async (patientId?: string) => {
    setStarting(true);
    try {
      const res = await api.startConsultation(patientId);
      if (res.session_id) router.push(`/dashboard/consultation/${res.session_id}`);
    } catch { setStarting(false); }
  };

  if (step === "register") {
    return (
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        <div
          className="w-full max-w-2xl bg-white rounded-2xl flex flex-col"
          style={{ border: "1.5px solid #1a1a1a", maxHeight: "calc(100vh - 3rem)" }}
        >
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <div>
              <h2 className="font-hand text-xl font-bold text-gray-900">Register New Patient</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Identity is stored securely — never shared with AI</p>
            </div>
            <button onClick={() => setStep("search")} className="text-gray-400 hover:text-gray-700 cursor-pointer">
              <Icon d="M18 6L6 18M6 6l12 12" size={18} />
            </button>
          </div>
          <NewPatientForm
            onSaved={(pid) => beginConsultation(pid)}
            onCancel={() => setStep("search")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
      <div className="w-full max-w-lg">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-5 cursor-pointer transition"
        >
          <Icon d="M15 18l-6-6 6-6" size={14} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
          {/* Header */}
          <div className="px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <h1 className="font-hand text-2xl font-bold text-gray-900">Start Consultation</h1>
            <p className="text-xs text-gray-400 mt-0.5">Search for an existing patient or register a new one</p>
          </div>

          {/* Search */}
          <div className="px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" size={14} />
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, ABHA ID, MRN, or PT-ID…"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none focus:ring-2 focus:ring-[#e11d48]"
                style={{ border: "1.5px solid #d4d4d2" }}
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs">searching…</span>
              )}
            </div>
          </div>

          {/* Results */}
          {query.trim() && (
            <div style={{ borderBottom: "1px dashed #d4d4d2" }}>
              {results.length === 0 && !searching ? (
                <div className="px-5 py-4 text-sm text-gray-400">No patients found for &ldquo;{query}&rdquo;</div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.patient_id}
                    onClick={() => beginConsultation(r.patient_id)}
                    disabled={starting}
                    className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[#fff1f2] transition text-left cursor-pointer disabled:opacity-50"
                    style={{ borderBottom: "1px dashed #ececea" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#ffe4e6] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#9f1239]">
                        {r.display.split(" · ")[0].split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{r.display.split(" · ")[0]}</p>
                        {r.has_recent_consultation && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0" style={{ border: "1px solid #fcd34d" }}>
                            Return visit
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-gray-400">
                        {r.patient_id} · {r.age}{r.gender_code}
                        {r.last_visit_date && (
                          <span className="ml-1 text-amber-600"> · Last visit {new Date(r.last_visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                        )}
                      </p>
                      {r.conditions.length > 0 && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{r.conditions.slice(0, 3).join(", ")}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#e11d48] font-medium shrink-0 mt-1">
                      {r.has_recent_consultation ? "Follow-up →" : "Select →"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <button
              onClick={() => setStep("register")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-gray-50 transition cursor-pointer text-left"
              style={{ border: "1.5px solid #1a1a1a" }}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8M19 8v6M22 11h-6" size={15} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Register New Patient</p>
                <p className="text-[10px] text-gray-400">Add identity + cardiac history, then start</p>
              </div>
            </button>

            <button
              onClick={() => beginConsultation()}
              disabled={starting}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed hover:bg-gray-50 transition cursor-pointer text-left disabled:opacity-50"
              style={{ borderColor: "#d4d4d2" }}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={15} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Anonymous Consultation</p>
                <p className="text-[10px] text-gray-400">Emergency / walk-in — no patient record needed</p>
              </div>
            </button>
          </div>

          {starting && (
            <div className="px-5 pb-4 text-center text-xs text-[#e11d48]">Starting session…</div>
          )}
        </div>

        {user && (
          <p className="text-center text-[10px] text-gray-400 mt-4">
            Recording as {user.full_name || user.email} · {user.hospital}
          </p>
        )}
      </div>
    </div>
  );
}

export default function StartConsultationPage() {
  return (
    <div className="flex h-full overflow-hidden">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>}>
        <StartConsultationContent />
      </Suspense>
    </div>
  );
}
