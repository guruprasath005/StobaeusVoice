"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@/components/Icon";

const NAV_ALL = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: null,
    icon: <Icon path="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" path2="M9 22V12h6v10" />,
  },
  {
    label: "Patients",
    href: "/dashboard/patients",
    roles: null,
    icon: <Icon path="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" path2="M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    label: "Echo / Cath Lab",
    href: "/dashboard/echo",
    roles: ["cardiologist", "cardiac_surgeon"],
    icon: <Icon path="M22 12h-4l-3 9L9 3l-3 9H2" />,
  },
  {
    label: "Radiology",
    href: "/dashboard/radiology",
    roles: ["cardiologist", "cardiac_surgeon"],
    icon: <Icon path="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />,
  },
  {
    label: "Prescriptions",
    href: "/dashboard/prescriptions",
    roles: null,
    icon: <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  },
  {
    label: "IPD Ward Round",
    href: "/dashboard/ipd",
    roles: ["cardiologist", "cardiac_surgeon"],
    icon: <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  },
  {
    label: "Nurse Station",
    href: "/dashboard/nurse",
    roles: ["cardiac_nurse"],
    icon: <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    label: "Appointments",
    href: "/dashboard/appointments",
    roles: null,
    icon: <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    label: "Voice Bot",
    href: "/dashboard/voice-bot",
    roles: ["cardiologist", "cardiac_surgeon"],
    icon: <Icon path="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />,
  },
  {
    label: "Alerts",
    href: "/dashboard/alerts",
    roles: null,
    icon: <Icon path="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    roles: null,
    icon: <Icon path="M12 15a3 3 0 100-6 3 3 0 000 6z" path2="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    if (user.role === "admin") router.push("/admin");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  const initials = user.full_name
    ? user.full_name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-white flex flex-col shrink-0" style={{ borderRight: "1.5px solid #1a1a1a" }}>
        {/* Branding */}
        <div className="px-3 pt-4 pb-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#e11d48] text-white flex items-center justify-center font-bold text-sm shrink-0">
              S
            </div>
            <span className="font-hand font-bold text-base leading-tight">
              Stobaeus<span className="text-[#e11d48]">Voice</span>
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 ml-9 tracking-wide uppercase">Cardiology</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ALL.filter(item => !item.roles || item.roles.includes(user.role)).map((item) => {
            const active = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#ffe4e6] text-[#e11d48]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade card */}
        <div className="px-3 pb-2">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#ffe4e6", border: "1.5px dashed #e11d48" }}
          >
            <p className="font-hand font-bold text-[#881337] text-sm mb-1">Upgrade to Pro</p>
            <p className="text-[10px] text-[#881337] leading-tight mb-2">
              Multi-doctor + ABDM full + ICD at point of care
            </p>
            <button
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white"
              style={{ background: "#e11d48" }}
            >
              Upgrade →
            </button>
          </div>
        </div>

        {/* User */}
        <div className="px-3 py-3" style={{ borderTop: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#e11d48] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {user.full_name || user.email}
              </p>
              <p className="text-[10px] text-gray-400 capitalize truncate">
                {user.role?.replace("_", " ")} · {user.hospital}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
