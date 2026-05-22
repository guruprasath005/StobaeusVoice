"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const BASE = "/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hospital: string;
  is_active: boolean;
  created_at: string;
}

interface AdminStats {
  month: string;
  total_consultations: number;
  approved_consultations: number;
  total_prescriptions: number;
  total_echo_reports: number;
  total_discharge_summaries: number;
  cost_saved_inr: number;
  by_doctor: { doctor_id: string; full_name: string; role: string; hospital: string; consultations_this_month: number }[];
  abdm: { m1_registered: boolean; m2_linked: boolean; m3_fhir: boolean; m4_share: boolean };
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  cardiologist:    { bg: "#ffe4e6", text: "#9f1239" },
  cardiac_surgeon: { bg: "#EDE9FE", text: "#6D28D9" },
  cardiac_nurse:   { bg: "#FCE7F3", text: "#9D174D" },
  admin:           { bg: "#FEF3C7", text: "#92400E" },
};

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function AdminOverviewPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sv_token");
    Promise.all([
      fetch(`${BASE}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      api.getAdminStats(),
    ]).then(([u, s]) => {
      setUsers(Array.isArray(u) ? u : []);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  const active = users.filter(u => u.is_active);

  const STATS_TOP = [
    { label: "Total Users", value: loading ? "—" : String(users.length), sub: `${active.length} active` },
    { label: "Consultations", value: loading || !stats ? "—" : String(stats.total_consultations), sub: stats ? `${stats.month}` : "" },
    { label: "Approved Notes", value: loading || !stats ? "—" : String(stats.approved_consultations), sub: "This month" },
    { label: "Cost Savings", value: loading || !stats ? "—" : `₹${(stats.cost_saved_inr / 1000).toFixed(0)}k`, sub: "Est. transcription saved" },
  ];

  const ABDM_MILESTONES = stats ? [
    { key: "m1_registered", label: "M1 — Health Facility Registry", done: stats.abdm.m1_registered },
    { key: "m2_linked", label: "M2 — ABHA Linking", done: stats.abdm.m2_linked },
    { key: "m3_fhir", label: "M3 — FHIR Document Sharing", done: stats.abdm.m3_fhir },
    { key: "m4_share", label: "M4 — Discharge Summary ABDM", done: stats.abdm.m4_share },
  ] : [];

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-hand text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">{stats?.month || "Loading…"}</p>
        </div>
        <Link
          href="/admin/users"
          className="flex items-center gap-2 bg-[#e11d48] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#be123c] transition"
          style={{ boxShadow: "2px 2px 0 #9f1239" }}
        >
          <Icon d="M12 5v14M5 12h14" size={13} />
          Add User
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {STATS_TOP.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4" style={{ border: "1.5px solid #1a1a1a" }}>
            <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide">{s.label}</p>
            <p className="font-hand text-3xl font-bold leading-none" style={{ color: "#1a1a1a" }}>{s.value}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Activity + ABDM */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity breakdown */}
        <div className="col-span-2 bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <h2 className="font-hand text-base font-bold text-gray-900">Activity This Month</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-dashed divide-gray-100">
            {[
              { label: "Prescriptions", value: stats?.total_prescriptions ?? "—", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { label: "Echo / Cath Reports", value: stats?.total_echo_reports ?? "—", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
              { label: "Discharge Summaries", value: stats?.total_discharge_summaries ?? "—", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" },
            ].map(m => (
              <div key={m.label} className="p-5 flex flex-col items-center text-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#ffe4e6] flex items-center justify-center text-[#9f1239]">
                  <Icon d={m.icon} size={16} />
                </div>
                <p className="font-hand text-2xl font-bold text-gray-900">{loading ? "—" : String(m.value)}</p>
                <p className="text-[10px] text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ABDM milestones */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <h2 className="font-hand text-base font-bold text-gray-900">ABDM Milestones</h2>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {loading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : (
              ABDM_MILESTONES.map(m => (
                <div key={m.key} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: m.done ? "#DCFCE7" : "#F3F4F6" }}>
                    {m.done ? (
                      <Icon d="M20 6L9 17l-5-5" size={10} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-700" style={{ color: m.done ? "#15803D" : "#6B7280" }}>{m.label}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Per-doctor table */}
      {stats && stats.by_doctor.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <h2 className="font-hand text-base font-bold text-gray-900">Consultations by Doctor</h2>
            <span className="text-[10px] text-gray-400">{stats.month}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Doctor", "Role", "Hospital", "Consultations"].map(h => (
                  <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-5 py-2 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.by_doctor.map(doc => {
                const rc = ROLE_COLORS[doc.role] || { bg: "#F3F4F6", text: "#374151" };
                const max = Math.max(...stats.by_doctor.map(d => d.consultations_this_month), 1);
                return (
                  <tr key={doc.doctor_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium text-gray-800">{doc.full_name}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: rc.bg, color: rc.text }}>
                        {doc.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{doc.hospital}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div className="h-1.5 rounded-full bg-[#e11d48]" style={{ width: `${(doc.consultations_this_month / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono font-bold text-gray-800 w-8 text-right">{doc.consultations_this_month}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent users */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h2 className="font-hand text-base font-bold text-gray-900">All Users</h2>
          <Link href="/admin/users" className="text-[10px] text-[#e11d48] hover:underline">Manage →</Link>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-xs text-gray-400">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name", "Email", "Role", "Hospital", "Status"].map(h => (
                  <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-5 py-2 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] || { bg: "#F3F4F6", text: "#374151" };
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-medium text-gray-800">{u.full_name}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: rc.bg, color: rc.text }}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{u.hospital}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.is_active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-gray-100 text-gray-400"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
