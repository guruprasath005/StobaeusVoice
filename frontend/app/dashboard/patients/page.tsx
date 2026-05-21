"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface Medication { drug: string; dose?: string; freq?: string; }

interface Patient {
  patient_id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  gender_code: string | null;
  conditions: string[];
  medications: Medication[];
  allergies: string[];
  blood_group: string | null;
  abha_id: string | null;
  mrn: string | null;
  created_at: string | null;
}

interface PastConsultation {
  session_id: string;
  started_at: string | null;
  status: string;
  assessment: string;
  icd_codes: { code: string; description: string }[];
  is_followup: boolean;
  discharge_summary_id: string | null;
}

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Tag editor ─────────────────────────────────────────────────────

function TagEditor({ label, tags, onChange, color = "#0EA5E9" }: {
  label: string; tags: string[]; onChange: (t: string[]) => void; color?: string;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setVal("");
  };
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-[20px]">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: color + "18", color }}>
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} className="opacity-60 hover:opacity-100 cursor-pointer leading-none">×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-[10px] text-gray-300">None</span>}
      </div>
      <div className="flex gap-1">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add and press Enter"
          className="flex-1 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white"
          style={{ border: "1.5px solid #d4d4d2" }}
        />
        <button onClick={add} className="px-2 py-1 text-[10px] rounded-lg cursor-pointer font-medium hover:opacity-80" style={{ background: color + "18", color }}>Add</button>
      </div>
    </div>
  );
}

// ── Med editor ─────────────────────────────────────────────────────

function MedEditor({ meds, onChange }: { meds: Medication[]; onChange: (m: Medication[]) => void }) {
  const [draft, setDraft] = useState<Medication>({ drug: "", dose: "", freq: "" });
  const FREQ = ["OD", "BD", "TDS", "QID", "HS", "SOS"];
  const add = () => {
    if (!draft.drug.trim()) return;
    onChange([...meds, { ...draft }]);
    setDraft({ drug: "", dose: "", freq: "" });
  };
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Medications</p>
      {meds.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {meds.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 bg-gray-50 rounded-lg">
              <span><strong>{m.drug}</strong>{m.dose ? ` ${m.dose}` : ""}{m.freq ? ` · ${m.freq}` : ""}</span>
              <button onClick={() => onChange(meds.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 cursor-pointer ml-2">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input value={draft.drug} onChange={e => setDraft(d => ({ ...d, drug: e.target.value }))} placeholder="Drug" className="flex-1 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white" style={{ border: "1.5px solid #d4d4d2" }} />
        <input value={draft.dose ?? ""} onChange={e => setDraft(d => ({ ...d, dose: e.target.value }))} placeholder="Dose" className="w-16 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white" style={{ border: "1.5px solid #d4d4d2" }} />
        <select value={draft.freq ?? ""} onChange={e => setDraft(d => ({ ...d, freq: e.target.value }))} className="w-14 px-1 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white" style={{ border: "1.5px solid #d4d4d2" }}>
          <option value="">Freq</option>
          {FREQ.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={add} className="px-2 py-1 text-[10px] rounded-lg cursor-pointer font-medium hover:opacity-80 bg-[#E0F2FE] text-[#0369a1]">Add</button>
      </div>
    </div>
  );
}

const PAGE_SIZE = 30;

// ── Main ──────────────────────────────────────────────────────────

export default function PatientsPage() {
  const router = useRouter();

  // List state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail panel state
  const [selected, setSelected] = useState<Patient | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "history">("profile");
  const [editing, setEditing] = useState(false);
  const [editConditions, setEditConditions] = useState<string[]>([]);
  const [editMeds, setEditMeds] = useState<Medication[]>([]);
  const [editAllergies, setEditAllergies] = useState<string[]>([]);
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // History state
  const [history, setHistory] = useState<PastConsultation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async (q?: string, skip = 0) => {
    setLoading(true);
    try {
      const data = await api.listPatients(q, skip, PAGE_SIZE);
      setPatients(data.patients ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(0);
    const t = setTimeout(() => load(query || undefined, 0), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  const goToPage = (p: number) => {
    setPage(p);
    load(query || undefined, p * PAGE_SIZE);
  };

  const selectPatient = (p: Patient) => {
    setSelected(p);
    setDetailTab("profile");
    setEditing(false);
    setEditMsg("");
  };

  const startEditing = () => {
    if (!selected) return;
    setEditConditions([...selected.conditions]);
    setEditMeds([...selected.medications]);
    setEditAllergies([...selected.allergies]);
    setEditBloodGroup(selected.blood_group ?? "");
    setEditing(true);
    setEditMsg("");
  };

  const saveEdit = async () => {
    if (!selected) return;
    setEditSaving(true);
    try {
      await api.updatePatientClinical(selected.patient_id, {
        conditions: editConditions,
        medications: editMeds,
        allergies: editAllergies,
        blood_group: editBloodGroup || undefined,
      });
      const updated = { ...selected, conditions: editConditions, medications: editMeds, allergies: editAllergies, blood_group: editBloodGroup || null };
      setSelected(updated);
      setPatients(ps => ps.map(p => p.patient_id === updated.patient_id ? updated : p));
      setEditing(false);
      setEditMsg("Saved.");
      setTimeout(() => setEditMsg(""), 2500);
    } catch {
      setEditMsg("Failed to save.");
    } finally {
      setEditSaving(false);
    }
  };

  const loadHistory = useCallback(async (patientId: string) => {
    setHistoryLoading(true);
    try {
      const data = await api.getPatientConsultations(patientId);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailTab === "history" && selected) loadHistory(selected.patient_id);
  }, [detailTab, selected, loadHistory]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex h-full">
      {/* ── Main list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-w-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <h1 className="font-hand text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-xs text-gray-400 mt-0.5">{loading ? "Loading…" : `${total} patients`}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/consultation/new")}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#E0F2FE] transition cursor-pointer"
            >
              <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={11} /> Start Consultation
            </button>
            <button
              onClick={() => router.push("/dashboard/consultation/new")}
              className="flex items-center gap-2 bg-[#0EA5E9] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#0284c7] transition cursor-pointer"
              style={{ boxShadow: "2px 2px 0 #0369a1" }}
            >
              <Icon d="M12 5v14M5 12h14" size={12} /> Register Patient
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="relative max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, ABHA ID, MRN or PT-ID…"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white"
              style={{ border: "1.5px solid #d4d4d2" }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading patients…</div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-gray-500">{query ? "No patients match your search" : "No patients registered yet"}</p>
              {!query && <button onClick={() => router.push("/dashboard/consultation/new")} className="text-xs text-[#0EA5E9] hover:underline cursor-pointer">Start a consultation to register your first patient →</button>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px dashed #d4d4d2" }}>
                  {["Patient", "Age / Gender", "Conditions", "Medications", "Registered", ""].map(h => (
                    <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2.5 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr
                    key={p.patient_id}
                    onClick={() => selectPatient(p)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected?.patient_id === p.patient_id ? "bg-[#F0FAFB]" : ""}`}
                    style={{ borderBottom: "1px dashed #ececea" }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: selected?.patient_id === p.patient_id ? "#bae6fd" : "#f3f3f1",
                            color: "#0c4a6e",
                            border: "1.25px solid #1a1a1a",
                          }}
                        >
                          {p.full_name.split(" ").filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || p.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{p.full_name}</p>
                          <p className="text-[10px] font-mono text-gray-400">
                            {p.patient_id}{p.abha_id && <span className="text-[#0EA5E9] ml-1">● ABHA</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{p.age ? `${p.age}${p.gender_code || ""}` : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.conditions.slice(0, 3).map(c => (
                          <span key={c} className="text-[9px] bg-[#E0F2FE] text-[#0369a1] px-1.5 py-0.5 rounded-full font-medium">{c}</span>
                        ))}
                        {p.conditions.length > 3 && <span className="text-[9px] text-gray-400">+{p.conditions.length - 3}</span>}
                        {p.conditions.length === 0 && <span className="text-[10px] text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-gray-500">
                      {p.medications.length > 0 ? `${p.medications.length} drug${p.medications.length > 1 ? "s" : ""}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[10px] font-mono text-gray-400 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/consultation/new?patient=${p.patient_id}`); }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#0EA5E9] hover:bg-[#E0F2FE] px-2 py-1 rounded-md transition cursor-pointer whitespace-nowrap"
                      >
                        <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={10} /> Consult
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-white" style={{ borderTop: "1px dashed #d4d4d2" }}>
            <p className="text-[11px] text-gray-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs rounded-lg border transition cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-gray-50"
                style={{ borderColor: "#d4d4d2" }}
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500 px-2">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs rounded-lg border transition cursor-pointer disabled:opacity-40 disabled:cursor-default hover:bg-gray-50"
                style={{ borderColor: "#d4d4d2" }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Patient detail panel ──────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden bg-white" style={{ borderLeft: "1.5px solid #1a1a1a" }}>
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-hand text-base font-bold text-gray-900 truncate">{selected.full_name}</h3>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">{selected.patient_id}</p>
                  {selected.age && <p className="text-xs text-gray-500 mt-0.5">{selected.age} yrs · {selected.gender || "—"}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none ml-2 shrink-0">×</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              {(["profile", "history"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition cursor-pointer ${detailTab === tab ? "text-[#0EA5E9] border-b-2 border-[#0EA5E9] bg-white" : "text-gray-400 hover:text-gray-600 bg-gray-50"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Profile tab */}
            {detailTab === "profile" && (
              <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
                {editing ? (
                  <>
                    <TagEditor label="Known Conditions" tags={editConditions} onChange={setEditConditions} />
                    <MedEditor meds={editMeds} onChange={setEditMeds} />
                    <TagEditor label="Allergies" tags={editAllergies} onChange={setEditAllergies} color="#EF4444" />
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Blood Group</p>
                      <select value={editBloodGroup} onChange={e => setEditBloodGroup(e.target.value)} className="w-full px-2 py-1.5 text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#0EA5E9] bg-white" style={{ border: "1.5px solid #d4d4d2" }}>
                        <option value="">Unknown</option>
                        {["A+","A−","B+","B−","O+","O−","AB+","AB−"].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    {editMsg && <p className={`text-xs ${editMsg === "Saved." ? "text-green-600" : "text-red-600"}`}>{editMsg}</p>}
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={editSaving} className="flex-1 py-2 text-xs font-semibold bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition cursor-pointer disabled:opacity-50">
                        {editSaving ? "Saving…" : "Save Changes"}
                      </button>
                      <button onClick={() => setEditing(false)} className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 cursor-pointer rounded-lg hover:bg-gray-100 transition">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    {selected.conditions.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 font-medium">Known Conditions</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.conditions.map(c => <span key={c} className="text-[10px] bg-[#E0F2FE] text-[#0369a1] px-2 py-0.5 rounded-full font-medium">{c}</span>)}
                        </div>
                      </div>
                    )}
                    {selected.medications.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 font-medium">Current Medications</p>
                        <div className="flex flex-col gap-1">
                          {selected.medications.map((m, i) => (
                            <div key={i} className="text-[11px] py-1.5" style={{ borderBottom: "1px dashed #ececea" }}>
                              <span className="font-semibold text-gray-800">{m.drug}</span>
                              {m.dose && <span className="text-gray-500"> {m.dose}</span>}
                              {m.freq && <span className="text-gray-400"> · {m.freq}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.allergies.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 font-medium">Allergies</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.allergies.map(a => <span key={a} className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">{a}</span>)}
                        </div>
                      </div>
                    )}
                    {selected.abha_id && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">ABHA ID</p>
                        <p className="text-[11px] font-mono text-gray-700">{selected.abha_id}</p>
                      </div>
                    )}
                    {selected.blood_group && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">Blood Group</p>
                        <p className="text-[11px] font-semibold text-gray-700">{selected.blood_group}</p>
                      </div>
                    )}
                    {editMsg && <p className="text-xs text-green-600">{editMsg}</p>}
                    {selected.conditions.length === 0 && selected.medications.length === 0 && selected.allergies.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No clinical data recorded yet.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* History tab */}
            {detailTab === "history" && (
              <div className="flex-1 overflow-auto">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10 text-xs text-gray-400">Loading history…</div>
                ) : history.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-xs text-gray-400">No consultations on record.</div>
                ) : (
                  history.map(c => (
                    <div
                      key={c.session_id}
                      className="px-4 py-3"
                      style={{ borderBottom: "1px dashed #ececea" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-gray-400">{formatDate(c.started_at)}</span>
                        <div className="flex items-center gap-1">
                          {c.is_followup && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">Follow-up</span>}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.status === "approved" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                      {c.assessment && <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-2">{c.assessment}</p>}
                      {c.icd_codes.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.icd_codes.map(ic => (
                            <span key={ic.code} className="text-[9px] font-mono bg-[#E0F2FE] text-[#0369a1] px-1 py-0.5 rounded">{ic.code}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => router.push(`/dashboard/consultation/${c.session_id}/review`)}
                          className="text-[10px] text-[#0EA5E9] hover:underline cursor-pointer font-medium"
                        >
                          View SOAP →
                        </button>
                        {c.discharge_summary_id && (
                          <button
                            onClick={() => router.push(`/dashboard/discharge/${c.discharge_summary_id}`)}
                            className="text-[10px] text-[#10B981] hover:underline cursor-pointer font-medium"
                          >
                            Discharge Summary →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="p-3 shrink-0 flex gap-2" style={{ borderTop: "1px dashed #d4d4d2" }}>
              <button
                onClick={() => router.push(`/dashboard/consultation/new?patient=${selected.patient_id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#0EA5E9] text-white text-xs font-semibold py-2 rounded-lg hover:bg-[#0284c7] transition cursor-pointer"
                style={{ boxShadow: "2px 2px 0 #0369a1" }}
              >
                <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={11} /> Consult
              </button>
              {!editing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: "#d4d4d2" }}
                >
                  <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={11} /> Edit
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
              <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" d2="M12 11a4 4 0 100-8 4 4 0 000 8" size={20} />
            </div>
            <p className="text-xs text-gray-400">Select a patient to view their cardiac profile</p>
          </div>
        )}
      </div>
    </div>
  );
}
