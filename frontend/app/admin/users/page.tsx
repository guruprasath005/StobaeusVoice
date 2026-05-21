"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ROLES = [
  { value: "cardiologist",    label: "Cardiologist" },
  { value: "cardiac_surgeon", label: "Cardiac Surgeon" },
  { value: "cardiac_nurse",   label: "Cardiac Nurse" },
  { value: "admin",           label: "Admin" },
];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  cardiologist:    { bg: "#E0F2FE", text: "#0369A1" },
  cardiac_surgeon: { bg: "#EDE9FE", text: "#6D28D9" },
  cardiac_nurse:   { bg: "#FCE7F3", text: "#9D174D" },
  admin:           { bg: "#FEF3C7", text: "#92400E" },
};

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hospital: string;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  full_name: string;
  email: string;
  password: string;
  role: string;
  hospital: string;
}

const EMPTY_FORM: FormState = { full_name: "", email: "", password: "", role: "cardiologist", hospital: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [filter, setFilter] = useState("all");

  const token = () => localStorage.getItem("sv_token");

  const loadUsers = () => {
    setLoading(true);
    fetch(`${BASE}/auth/users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/users/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to create user");
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      loadUsers();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (u: User) => {
    await fetch(`${BASE}/auth/users/${u.id}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}` },
    });
    loadUsers();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (!newPassword || newPassword.length < 6) { setResetError("Minimum 6 characters"); return; }
    const res = await fetch(`${BASE}/auth/users/${resetTarget!.id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) { setResetTarget(null); setNewPassword(""); }
    else { const d = await res.json(); setResetError(d.detail || "Error"); }
  };

  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-hand text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">{users.length} total · {users.filter(u => u.is_active).length} active</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setFormError(""); }}
          className="flex items-center gap-2 bg-[#0EA5E9] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#0284c7] transition cursor-pointer"
          style={{ boxShadow: "2px 2px 0 #0369a1" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add User
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "cardiologist", "cardiac_surgeon", "cardiac_nurse", "admin"].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              filter === r ? "bg-[#0EA5E9] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
            style={{ border: "1.5px solid", borderColor: filter === r ? "#0EA5E9" : "#e5e7eb" }}
          >
            {r === "all" ? "All" : r.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            <span className="ml-1.5 opacity-70">
              {r === "all" ? users.length : users.filter(u => u.role === r).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
        {loading ? (
          <div className="px-5 py-12 text-center text-xs text-gray-400">Loading users…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name", "Email", "Role", "Hospital", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-5 py-2.5 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rc = ROLE_COLORS[u.role] || { bg: "#F3F4F6", text: "#374151" };
                const created = new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: rc.bg, color: rc.text }}>
                          {u.full_name?.replace("Dr. ", "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-800">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: rc.bg, color: rc.text }}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 max-w-32 truncate">{u.hospital}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.is_active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-gray-100 text-gray-400"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{created}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(u)}
                          className={`text-[10px] px-2 py-1 rounded font-medium cursor-pointer transition ${
                            u.is_active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => { setResetTarget(u); setNewPassword(""); setResetError(""); }}
                          className="text-[10px] px-2 py-1 rounded font-medium cursor-pointer bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
                        >
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md" style={{ border: "1.5px solid #1a1a1a", boxShadow: "4px 4px 0 #1a1a1a" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 flex flex-col gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Dr. Priya Sharma"
                  className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="priya@apollochennai.in"
                  className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0EA5E9] bg-white"
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hospital</label>
                <input
                  required
                  value={form.hospital}
                  onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))}
                  placeholder="Apollo Hospitals, Chennai"
                  className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50 cursor-pointer transition">Cancel</button>
                <button type="submit" disabled={formLoading} className="flex-1 bg-[#0EA5E9] text-white text-xs font-semibold rounded-lg py-2.5 hover:bg-[#0284c7] transition disabled:opacity-50 cursor-pointer">
                  {formLoading ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm" style={{ border: "1.5px solid #1a1a1a", boxShadow: "4px 4px 0 #1a1a1a" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Reset Password</h2>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleResetPassword} className="px-6 py-5 flex flex-col gap-3">
              <p className="text-xs text-gray-500">Setting new password for <span className="font-semibold text-gray-800">{resetTarget.full_name}</span></p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
              {resetError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{resetError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setResetTarget(null)} className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50 cursor-pointer transition">Cancel</button>
                <button type="submit" className="flex-1 bg-[#0EA5E9] text-white text-xs font-semibold rounded-lg py-2.5 hover:bg-[#0284c7] transition cursor-pointer">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
