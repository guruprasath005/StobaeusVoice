"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface SearchResult {
  patient_id: string;
  display: string;
  age: number | null;
  gender_code: string | null;
  conditions: string[];
}

/**
 * Reusable patient picker. `onSelect` receives a patient_id, or null when the
 * user chooses "Anonymous". Used by the Echo/Cath flow at template-click and
 * on the report detail page.
 */
export default function PatientSearchModal({
  title = "Find patient",
  allowAnonymous = true,
  onSelect,
  onClose,
}: {
  title?: string;
  allowAnonymous?: boolean;
  onSelect: (patientId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api.searchPatients(q);
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl overflow-hidden mt-[8vh]"
        style={{ border: "1.5px solid #1a1a1a" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <h2 className="font-hand text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Search an existing patient by name, ABHA ID, MRN or PT-ID</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
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
          <div className="max-h-[40vh] overflow-auto" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            {results.length === 0 && !searching ? (
              <div className="px-5 py-4 text-sm text-gray-400">No patients found for &ldquo;{query}&rdquo;</div>
            ) : (
              results.map(r => (
                <button
                  key={r.patient_id}
                  onClick={() => onSelect(r.patient_id)}
                  className="w-full flex items-start gap-3 px-5 py-3 hover:bg-[#fff1f2] transition text-left cursor-pointer"
                  style={{ borderBottom: "1px dashed #ececea" }}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#ffe4e6] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#9f1239]">
                      {r.display.split(" · ")[0].split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{r.display.split(" · ")[0]}</p>
                    <p className="text-[10px] font-mono text-gray-400">
                      {r.patient_id} · {r.age ?? "?"}{r.gender_code ?? ""}
                    </p>
                    {r.conditions.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{r.conditions.slice(0, 3).join(", ")}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#e11d48] font-medium shrink-0 mt-1">Select →</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Anonymous */}
        {allowAnonymous && (
          <div className="px-5 py-4">
            <button
              onClick={() => onSelect(null)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed hover:bg-gray-50 transition cursor-pointer text-left"
              style={{ borderColor: "#d4d4d2" }}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Anonymous report</p>
                <p className="text-[10px] text-gray-400">No patient record — emergency / unidentified</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
