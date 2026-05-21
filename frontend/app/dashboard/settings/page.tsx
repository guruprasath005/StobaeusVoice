"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

// ── Input field ────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", readOnly = false, hint }: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm rounded-lg outline-none transition ${
          readOnly
            ? "bg-gray-50 text-gray-500 cursor-default"
            : "bg-white focus:ring-2 focus:ring-[#e11d48]"
        }`}
        style={{ border: `1.5px solid ${readOnly ? "#ececea" : "#d4d4d2"}` }}
      />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
      <div className="px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <h2 className="font-hand text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Role badge ─────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  cardiologist: "#e11d48",
  cardiac_surgeon: "#8B5CF6",
  cardiac_nurse: "#10B981",
  admin: "#F59E0B",
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || "#6B7280";
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ background: color + "18", color, border: `1px solid ${color}40` }}
    >
      {role.replace("_", " ")}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, setUser } = useAuth();

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [hospital, setHospital] = useState(user?.hospital ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");

  const saveProfile = async () => {
    if (!fullName.trim()) return;
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const res = await api.updateProfile({ full_name: fullName.trim(), hospital: hospital.trim() });
      if (user) setUser({ ...user, full_name: res.full_name, hospital: res.hospital });
      setProfileMsg("Profile updated.");
    } catch {
      setProfileMsg("Failed to save — try again.");
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(""), 3000);
    }
  };

  const changePassword = async () => {
    setPwdError(""); setPwdMsg("");
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError("All fields are required."); return; }
    if (newPwd !== confirmPwd) { setPwdError("New passwords do not match."); return; }
    if (newPwd.length < 8) { setPwdError("New password must be at least 8 characters."); return; }
    setPwdSaving(true);
    try {
      await api.changePassword({ current_password: currentPwd, new_password: newPwd });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setPwdMsg("Password changed successfully.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setPwdError(msg.includes("incorrect") ? "Current password is incorrect." : "Failed to change password — try again.");
    } finally {
      setPwdSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="flex items-center px-5 h-[72px] bg-white sticky top-0 z-10" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <h1 className="font-hand text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Top row: Profile + Change Password side by side */}
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* Profile */}
          <Section title="Profile" subtitle="Your name and hospital are shown on generated documents.">
            <div className="flex flex-col gap-3">
              <Field label="Full Name" value={fullName} onChange={setFullName} />
              <Field label="Hospital" value={hospital} onChange={setHospital} />
              <Field label="Email" value={user.email} readOnly hint="Email cannot be changed — contact your admin." />
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Role</p>
                <div className="flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <p className="text-[10px] text-gray-400">Assigned by admin — cannot be self-changed.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={saveProfile}
                  disabled={profileSaving || !fullName.trim()}
                  className="flex items-center gap-2 bg-[#e11d48] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-50"
                  style={{ boxShadow: "2px 2px 0 #9f1239" }}
                >
                  {profileSaving ? "Saving…" : "Save Profile"}
                </button>
                {profileMsg && (
                  <span className="text-xs text-green-600 font-medium">{profileMsg}</span>
                )}
              </div>
            </div>
          </Section>

          {/* Change Password */}
          <Section title="Change Password" subtitle="Use at least 8 characters. You must know your current password.">
            <div className="flex flex-col gap-3">
              <Field label="Current Password" type="password" value={currentPwd} onChange={setCurrentPwd} />
              <Field label="New Password" type="password" value={newPwd} onChange={setNewPwd} hint="Minimum 8 characters." />
              <Field label="Confirm New Password" type="password" value={confirmPwd} onChange={setConfirmPwd} />
              {pwdError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwdError}</p>}
              {pwdMsg && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">{pwdMsg}</p>}
              <div className="pt-1">
                <button
                  onClick={changePassword}
                  disabled={pwdSaving}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
                  style={{ border: "1.5px solid #1a1a1a", background: "white", boxShadow: "2px 2px 0 #d4d4d2" }}
                >
                  {pwdSaving ? "Changing…" : "Change Password"}
                </button>
              </div>
            </div>
          </Section>

        </div>

        {/* Account info — full width */}
        <Section title="Account Info">
          <div className="grid grid-cols-3 gap-4">
            {[
              ["User ID", user.id],
              ["Account Status", "Active"],
              ["Session", "JWT · 8 hours"],
            ].map(([label, val]) => (
              <div key={label} className="flex flex-col gap-0.5 py-1.5" style={{ borderBottom: "1px dashed #ececea" }}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-[11px] font-mono text-gray-700 truncate">{val}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}
