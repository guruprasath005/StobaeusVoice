"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface CatBed { bed_id: string; label: string; ward_id: string | null; tier_id: string | null; occupied: boolean }
interface CatWard { ward_id: string; name: string }
interface CatTier { tier_id: string; name: string; color: string | null; daily_charge_inr: number; sort_order: number }
interface Catalogue { wards: CatWard[]; tiers: CatTier[]; beds: CatBed[] }

export default function TransferBedModal({
  admissionId,
  currentBedId,
  currentTierId,
  onClose,
  onTransferred,
}: {
  admissionId: string;
  currentBedId: string | null;
  currentTierId: string | null;
  onClose: () => void;
  onTransferred: (direction: "step_up" | "step_down" | "lateral") => void;
}) {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [targetBed, setTargetBed] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api.getIpdCatalogue().then(setCat).catch(() => {}); }, []);

  const tierSortOf = (tid: string | null) => cat?.tiers.find(t => t.tier_id === tid)?.sort_order ?? 999;
  const currentSort = tierSortOf(currentTierId);

  const submit = async () => {
    if (!targetBed) return;
    setBusy(true); setErr("");
    try {
      const res = await api.transferAdmission(admissionId, { to_bed_id: targetBed, reason: reason.trim() || undefined });
      onTransferred(res.direction);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const reasonChips = ["Clinically stable — step down", "Worsening — escalate", "Bed reallocation", "Patient request"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden mt-[8vh]" style={{ border: "1.5px solid #1a1a1a" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <h2 className="font-hand text-xl font-bold">Transfer bed</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Current: <span className="font-mono">{currentBedId || "—"}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-auto">
          {err && <div className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg">{err}</div>}

          {!cat ? <p className="text-xs text-gray-400">Loading beds…</p> : (
            <>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setTierFilter(null)}
                  className={`text-[11px] px-3 py-1 rounded-full cursor-pointer ${tierFilter === null ? "bg-[#e11d48] text-white" : "bg-gray-100 text-gray-600"}`}>All</button>
                {cat.tiers.map(t => (
                  <button key={t.tier_id} onClick={() => setTierFilter(t.tier_id)}
                    className={`text-[11px] px-3 py-1 rounded-full cursor-pointer ${tierFilter === t.tier_id ? "bg-[#e11d48] text-white" : "bg-gray-100 text-gray-600"}`}>
                    {t.name} · ₹{t.daily_charge_inr.toLocaleString("en-IN")}/day
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {cat.beds.filter(b => !tierFilter || b.tier_id === tierFilter).map(b => {
                  const isCurrent = b.bed_id === currentBedId;
                  const tier = cat.tiers.find(t => t.tier_id === b.tier_id);
                  const ward = cat.wards.find(w => w.ward_id === b.ward_id);
                  const disabled = b.occupied || isCurrent;
                  const selected = targetBed === b.bed_id;
                  let direction: "step_up" | "step_down" | "lateral" = "lateral";
                  if (tier && currentSort !== 999) direction = tier.sort_order > currentSort ? "step_down" : tier.sort_order < currentSort ? "step_up" : "lateral";
                  return (
                    <button key={b.bed_id} disabled={disabled} onClick={() => setTargetBed(b.bed_id)}
                      className="text-left p-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        border: `1.5px solid ${selected ? "#e11d48" : disabled ? "#e5e7eb" : (tier?.color || "#d4d4d2")}`,
                        background: selected ? "#ffe4e6" : disabled ? "#f9fafb" : "#fff",
                        opacity: disabled ? 0.45 : 1,
                        boxShadow: selected ? "2px 2px 0 #e11d48" : undefined,
                      }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-bold font-mono text-gray-900">{b.label}</p>
                        {!disabled && (
                          <span className="text-[9px]">{direction === "step_down" ? "⬇" : direction === "step_up" ? "⬆" : "→"}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">{tier?.name || "—"}</p>
                      <p className="text-[9px] text-gray-400">{ward?.name || "—"}</p>
                      {isCurrent && <p className="text-[9px] text-[#9f1239] mt-0.5">Current</p>}
                      {b.occupied && !isCurrent && <p className="text-[9px] text-gray-400 mt-0.5">Occupied</p>}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Reason (one line)</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Stable post-PCI, weaned off pressors — step down to ward"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white" style={{ border: "1.5px solid #d4d4d2" }} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {reasonChips.map(c => (
                    <button key={c} onClick={() => setReason(c)} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer">{c}</button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button onClick={onClose} className="text-xs text-gray-500 px-3 py-2 hover:underline cursor-pointer">Cancel</button>
                <button onClick={submit} disabled={!targetBed || busy}
                  className="bg-[#e11d48] text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>
                  {busy ? "Transferring…" : "Confirm transfer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
