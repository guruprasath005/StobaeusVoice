"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface RxSummary {
  rx_id: string;
  patient_id: string | null;
  patient_display: string | null;
  diagnosis: string | null;
  drugs: { drug: string; dose?: string; freq?: string }[];
  status: string;
  whatsapp_sent_at: string | null;
  created_at: string | null;
}

interface PatientResult {
  patient_id: string;
  display: string;
  age?: number;
  gender?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status, waSent }: { status: string; waSent: string | null }) {
  if (waSent) return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">Sent</span>
  );
  if (status === "printed") return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#6D28D9]">Printed</span>
  );
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#A16207]">Active</span>
  );
}

// ── Patient search modal ───────────────────────────────────────────

function PatientSearchModal({ onSelect, onClose }: {
  onSelect: (patientId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchPatients(query);
        setResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 280);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ border: "1.5px solid #1a1a1a", boxShadow: "4px 4px 0 #1a1a1a" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h2 className="font-hand text-base font-bold text-gray-900">New Prescription</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Search patient or start anonymous</p>
        </div>

        <div className="p-4">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, ABHA ID, or patient ID…"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none focus:ring-2 focus:ring-[#0EA5E9]"
            style={{ border: "1.5px solid #d4d4d2" }}
          />

          {searching && (
            <p className="text-[11px] text-gray-400 mt-3 text-center">Searching…</p>
          )}

          {results.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 max-h-52 overflow-auto">
              {results.map(p => (
                <button
                  key={p.patient_id}
                  onClick={() => onSelect(p.patient_id)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#E0F2FE] text-left transition cursor-pointer"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.display}</p>
                    <p className="text-[10px] font-mono text-gray-400">{p.patient_id}{p.age ? ` · ${p.age}Y` : ""}{p.gender ? ` ${p.gender}` : ""}</p>
                  </div>
                  <span className="text-[11px] text-[#0EA5E9] font-medium">Select →</span>
                </button>
              ))}
            </div>
          )}

          {query && !searching && results.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-3 text-center">No patients found</p>
          )}
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => onSelect(null)}
            className="flex-1 py-2 text-xs rounded-xl text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            style={{ border: "1.5px dashed #d4d4d2" }}
          >
            Anonymous / Walk-in
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl text-gray-500 hover:bg-gray-50 transition cursor-pointer"
            style={{ border: "1.5px solid #d4d4d2" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<RxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listPrescriptions()
      .then(data => setPrescriptions(Array.isArray(data) ? data : []))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (patientId: string | null) => {
    setCreating(true);
    setShowModal(false);
    try {
      const res = await api.createPrescription({ patient_id: patientId ?? undefined });
      if (res.rx_id) router.push(`/dashboard/prescriptions/${res.rx_id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 overflow-auto min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-[72px]" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <div>
              <h1 className="font-hand text-2xl font-bold text-gray-900">Prescriptions</h1>
              <p className="text-xs text-gray-400 mt-0.5">Cardiac medication prescriptions with WhatsApp delivery</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              disabled={creating}
              className="flex items-center gap-2 bg-[#0EA5E9] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#0284C7] transition cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0 #0369A1" }}
            >
              {creating ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  New Prescription
                </>
              )}
            </button>
          </div>

          <div className="p-5">
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
              ) : prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No prescriptions yet</p>
                  <p className="text-xs text-gray-400">Click New Prescription to create your first one</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px dashed #d4d4d2" }}>
                      {["Patient", "Diagnosis", "Medications", "Date", "Status", ""].map(h => (
                        <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2.5 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map(rx => (
                      <tr
                        key={rx.rx_id}
                        onClick={() => router.push(`/dashboard/prescriptions/${rx.rx_id}`)}
                        className="hover:bg-gray-50 transition cursor-pointer"
                        style={{ borderBottom: "1px dashed #ececea" }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
                              style={{ background: "#f3f3f1", color: "#0c4a6e", border: "1.25px solid #1a1a1a" }}
                            >
                              {(rx.patient_display || "A").split(" ").filter((w: string) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "A"}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{rx.patient_display || "Anonymous"}</p>
                              {rx.patient_id && <p className="text-[10px] font-mono text-gray-400">{rx.patient_id}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <p className="text-[11px] text-gray-600 truncate">{rx.diagnosis || <span className="text-gray-300 italic">No diagnosis</span>}</p>
                        </td>
                        <td className="px-4 py-3">
                          {rx.drugs.length === 0 ? (
                            <span className="text-[10px] text-gray-300 italic">No drugs</span>
                          ) : (
                            <p className="text-[11px] text-gray-700">
                              {rx.drugs.slice(0, 2).map(d => `${d.drug}${d.dose ? ` ${d.dose}` : ""}`).join(", ")}
                              {rx.drugs.length > 2 && <span className="text-gray-400"> +{rx.drugs.length - 2} more</span>}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-[11px] text-gray-600">{formatDate(rx.created_at)}</p>
                          <p className="text-[10px] font-mono text-gray-400">{rx.rx_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={rx.status} waSent={rx.whatsapp_sent_at} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] text-[#0EA5E9] font-medium">Open →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <PatientSearchModal
          onSelect={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
