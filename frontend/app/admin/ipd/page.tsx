"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Ward { ward_id: string; name: string; floor: string | null; color: string | null; description: string | null; is_active: boolean; sort_order: number }
interface Tier { tier_id: string; name: string; daily_charge_inr: number; nurse_ratio: string | null; color: string | null; sort_order: number; is_active: boolean }
interface Bed { bed_id: string; label: string | null; ward_id: string | null; ward_name: string | null; tier_id: string | null; tier_name: string | null; tier_color: string | null; tier_charge_inr: number | null; is_active: boolean; notes: string | null; sort_order: number; occupied: boolean; admission_id: string | null }

type Tab = "beds" | "wards" | "tiers";

const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white";
const inputSty = { border: "1.5px solid #d4d4d2" };

export default function AdminIpdPage() {
  const [tab, setTab] = useState<Tab>("beds");
  const [wards, setWards] = useState<Ward[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [w, t, b] = await Promise.all([api.adminListWards(), api.adminListTiers(), api.adminListBeds()]);
      setWards(Array.isArray(w) ? w : []);
      setTiers(Array.isArray(t) ? t : []);
      setBeds(Array.isArray(b) ? b : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-hand text-2xl font-bold text-gray-900">IPD Setup</h1>
          <p className="text-xs text-gray-400 mt-0.5">Wards, bed tiers, and beds — admin only</p>
        </div>
        {msg && <span className="text-[11px] font-medium text-[#15803D] bg-[#DCFCE7] px-3 py-1.5 rounded-lg">{msg}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 w-fit" style={{ border: "1.5px solid #1a1a1a" }}>
        {(["beds", "wards", "tiers"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize cursor-pointer transition ${tab === t ? "bg-[#e11d48] text-white" : "text-gray-500 hover:text-gray-800"}`}>
            {t} {t === "beds" ? `(${beds.length})` : t === "wards" ? `(${wards.length})` : `(${tiers.length})`}
          </button>
        ))}
      </div>

      {loading ? <p className="text-xs text-gray-400">Loading…</p> : (
        <>
          {tab === "beds" && <BedsTab beds={beds} wards={wards} tiers={tiers} reload={load} flash={flash} />}
          {tab === "wards" && <WardsTab wards={wards} reload={load} flash={flash} />}
          {tab === "tiers" && <TiersTab tiers={tiers} reload={load} flash={flash} />}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Beds ─────────────────────────

function BedsTab({ beds, wards, tiers, reload, flash }: { beds: Bed[]; wards: Ward[]; tiers: Tier[]; reload: () => void; flash: (m: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank = { bed_id: "", label: "", ward_id: "", tier_id: "", notes: "", is_active: true, sort_order: 0 };
  const [form, setForm] = useState<Record<string, unknown>>(blank);

  const openCreate = () => { setEditId(null); setForm(blank); setShowForm(true); };
  const openEdit = (b: Bed) => {
    setEditId(b.bed_id);
    setForm({ bed_id: b.bed_id, label: b.label || "", ward_id: b.ward_id || "", tier_id: b.tier_id || "", notes: b.notes || "", is_active: b.is_active, sort_order: b.sort_order });
    setShowForm(true);
  };
  const save = async () => {
    try {
      if (editId) await api.adminUpdateBed(editId, form);
      else await api.adminCreateBed(form);
      setShowForm(false); flash("Bed saved.");
      reload();
    } catch (e) { flash((e as Error).message); }
  };
  const remove = async (id: string) => {
    if (!confirm(`Delete bed ${id}?`)) return;
    try { await api.adminDeleteBed(id); flash("Bed deleted."); reload(); }
    catch (e) { flash((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-[#e11d48] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#be123c] cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>+ Add Bed</button>
      </div>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {["Bed ID", "Label", "Ward", "Tier", "Charge/day", "Status", "Notes", ""].map(h => (
                <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {beds.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No beds. Add one to start.</td></tr>
            ) : beds.map(b => (
              <tr key={b.bed_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono font-semibold text-gray-800">{b.bed_id}</td>
                <td className="px-4 py-2 text-gray-600">{b.label || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{b.ward_name || "—"}</td>
                <td className="px-4 py-2">
                  {b.tier_name ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: (b.tier_color || "#F3F4F6") + "22", color: b.tier_color || "#374151" }}>{b.tier_name}</span> : "—"}
                </td>
                <td className="px-4 py-2 font-mono text-gray-700">{b.tier_charge_inr != null ? `₹${b.tier_charge_inr.toLocaleString("en-IN")}` : "—"}</td>
                <td className="px-4 py-2">
                  {!b.is_active ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactive</span>
                    : b.occupied ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffe4e6] text-[#9f1239]">Occupied</span>
                    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">Available</span>}
                </td>
                <td className="px-4 py-2 text-gray-500 max-w-[160px] truncate">{b.notes || "—"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => openEdit(b)} className="text-[10px] text-[#e11d48] hover:underline cursor-pointer mr-3">Edit</button>
                  <button onClick={() => remove(b.bed_id)} className="text-[10px] text-gray-400 hover:text-red-600 cursor-pointer">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editId ? `Edit ${editId}` : "Add Bed"}>
          <div className="flex flex-col gap-3">
            <Field label="Bed ID" hint={editId ? "Cannot change after create" : "e.g. CCU-05, B-09"}>
              <input className={inputCls} style={inputSty} value={form.bed_id as string} disabled={!!editId}
                onChange={e => setForm({ ...form, bed_id: e.target.value })} />
            </Field>
            <Field label="Display label (optional)">
              <input className={inputCls} style={inputSty} value={form.label as string}
                onChange={e => setForm({ ...form, label: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ward">
                <select className={inputCls} style={inputSty} value={form.ward_id as string}
                  onChange={e => setForm({ ...form, ward_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {wards.map(w => <option key={w.ward_id} value={w.ward_id}>{w.name}</option>)}
                </select>
              </Field>
              <Field label="Tier">
                <select className={inputCls} style={inputSty} value={form.tier_id as string}
                  onChange={e => setForm({ ...form, tier_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {tiers.map(t => <option key={t.tier_id} value={t.tier_id}>{t.name} (₹{t.daily_charge_inr.toLocaleString("en-IN")}/day)</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes (optional)" hint="e.g. near nurse station, isolation, ventilator-ready">
              <input className={inputCls} style={inputSty} value={form.notes as string}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.is_active as boolean}
                onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active (uncheck to decommission)
            </label>
            <button onClick={save} className="w-full py-2 text-xs font-semibold bg-[#e11d48] text-white rounded-lg hover:bg-[#be123c] cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>
              {editId ? "Save" : "Create"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────── Wards ─────────────────────────

function WardsTab({ wards, reload, flash }: { wards: Ward[]; reload: () => void; flash: (m: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank = { name: "", floor: "", color: "#ffe4e6", description: "", is_active: true, sort_order: 0 };
  const [form, setForm] = useState<Record<string, unknown>>(blank);

  const openCreate = () => { setEditId(null); setForm(blank); setShowForm(true); };
  const openEdit = (w: Ward) => {
    setEditId(w.ward_id);
    setForm({ name: w.name, floor: w.floor || "", color: w.color || "", description: w.description || "", is_active: w.is_active, sort_order: w.sort_order });
    setShowForm(true);
  };
  const save = async () => {
    try {
      if (editId) await api.adminUpdateWard(editId, form);
      else await api.adminCreateWard(form);
      setShowForm(false); flash("Ward saved."); reload();
    } catch (e) { flash((e as Error).message); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete ward?")) return;
    try { await api.adminDeleteWard(id); flash("Ward deleted."); reload(); }
    catch (e) { flash((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-[#e11d48] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#be123c] cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>+ Add Ward</button>
      </div>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {["Name", "Floor", "Description", "Status", ""].map(h => (
                <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wards.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No wards yet.</td></tr> :
              wards.map(w => (
                <tr key={w.ward_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: w.color || "#eee" }} />{w.name}</span></td>
                  <td className="px-4 py-2 text-gray-600">{w.floor || "—"}</td>
                  <td className="px-4 py-2 text-gray-500 max-w-[280px] truncate">{w.description || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${w.is_active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-gray-100 text-gray-400"}`}>{w.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => openEdit(w)} className="text-[10px] text-[#e11d48] hover:underline cursor-pointer mr-3">Edit</button>
                    <button onClick={() => remove(w.ward_id)} className="text-[10px] text-gray-400 hover:text-red-600 cursor-pointer">Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editId ? "Edit Ward" : "Add Ward"}>
          <div className="flex flex-col gap-3">
            <Field label="Name"><input className={inputCls} style={inputSty} value={form.name as string} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Floor"><input className={inputCls} style={inputSty} value={form.floor as string} onChange={e => setForm({ ...form, floor: e.target.value })} /></Field>
              <Field label="Colour (hex)"><input type="color" className="w-full h-[34px] rounded-lg cursor-pointer" style={inputSty} value={(form.color as string) || "#ffe4e6"} onChange={e => setForm({ ...form, color: e.target.value })} /></Field>
            </div>
            <Field label="Description"><input className={inputCls} style={inputSty} value={form.description as string} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.is_active as boolean} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <button onClick={save} className="w-full py-2 text-xs font-semibold bg-[#e11d48] text-white rounded-lg hover:bg-[#be123c] cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>{editId ? "Save" : "Create"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────── Tiers ─────────────────────────

function TiersTab({ tiers, reload, flash }: { tiers: Tier[]; reload: () => void; flash: (m: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const blank = { name: "", daily_charge_inr: 0, nurse_ratio: "", color: "#10B981", sort_order: 0, is_active: true };
  const [form, setForm] = useState<Record<string, unknown>>(blank);

  const openCreate = () => { setEditId(null); setForm(blank); setShowForm(true); };
  const openEdit = (t: Tier) => {
    setEditId(t.tier_id);
    setForm({ name: t.name, daily_charge_inr: t.daily_charge_inr, nurse_ratio: t.nurse_ratio || "", color: t.color || "", sort_order: t.sort_order, is_active: t.is_active });
    setShowForm(true);
  };
  const save = async () => {
    try {
      const payload = { ...form, daily_charge_inr: Number(form.daily_charge_inr) || 0 };
      if (editId) await api.adminUpdateTier(editId, payload);
      else await api.adminCreateTier(payload);
      setShowForm(false); flash("Tier saved."); reload();
    } catch (e) { flash((e as Error).message); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete tier?")) return;
    try { await api.adminDeleteTier(id); flash("Tier deleted."); reload(); }
    catch (e) { flash((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-[#e11d48] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#be123c] cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>+ Add Tier</button>
      </div>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {["Tier", "Daily Charge", "Nurse Ratio", "Sort", "Status", ""].map(h => (
                <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No tiers yet.</td></tr> :
              tiers.map(t => (
                <tr key={t.tier_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: t.color || "#eee" }} />{t.name}</span></td>
                  <td className="px-4 py-2 font-mono">₹{t.daily_charge_inr.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2 text-gray-600">{t.nurse_ratio || "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{t.sort_order}</td>
                  <td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${t.is_active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-gray-100 text-gray-400"}`}>{t.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => openEdit(t)} className="text-[10px] text-[#e11d48] hover:underline cursor-pointer mr-3">Edit</button>
                    <button onClick={() => remove(t.tier_id)} className="text-[10px] text-gray-400 hover:text-red-600 cursor-pointer">Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editId ? "Edit Tier" : "Add Tier"}>
          <div className="flex flex-col gap-3">
            <Field label="Name" hint="e.g. CCU, HDU, Ward, Private, Deluxe"><input className={inputCls} style={inputSty} value={form.name as string} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily charge (₹)"><input type="number" className={inputCls} style={inputSty} value={form.daily_charge_inr as number} onChange={e => setForm({ ...form, daily_charge_inr: e.target.value })} /></Field>
              <Field label="Nurse ratio" hint="e.g. 1:1"><input className={inputCls} style={inputSty} value={form.nurse_ratio as string} onChange={e => setForm({ ...form, nurse_ratio: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Colour"><input type="color" className="w-full h-[34px] rounded-lg cursor-pointer" style={inputSty} value={(form.color as string) || "#10B981"} onChange={e => setForm({ ...form, color: e.target.value })} /></Field>
              <Field label="Sort order"><input type="number" className={inputCls} style={inputSty} value={form.sort_order as number} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.is_active as boolean} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <button onClick={save} className="w-full py-2 text-xs font-semibold bg-[#e11d48] text-white rounded-lg hover:bg-[#be123c] cursor-pointer" style={{ boxShadow: "2px 2px 0 #9f1239" }}>{editId ? "Save" : "Create"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────── Shared bits ─────────────────────────

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden mt-[10vh]" style={{ border: "1.5px solid #1a1a1a" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h2 className="font-hand text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
