"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@/components/Icon";

const NAV = [
  {
    label: "Overview",
    href: "/admin",
    icon: <Icon path="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" path2="M9 22V12h6v10" />,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: <Icon path="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" path2="M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: <Icon path="M12 15a3 3 0 100-6 3 3 0 000 6z" path2="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") router.push("/dashboard");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-white flex flex-col shrink-0" style={{ borderRight: "1.5px solid #1a1a1a" }}>
        {/* Branding */}
        <div className="px-3 pt-4 pb-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0EA5E9] text-white flex items-center justify-center font-bold text-sm shrink-0">S</div>
            <span className="font-hand font-bold text-base">Stobaeus<span className="text-[#0EA5E9]">Voice</span></span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 ml-9 tracking-wide uppercase">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active ? "bg-[#E0F2FE] text-[#0EA5E9]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3" style={{ borderTop: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user.full_name}</p>
              <p className="text-[10px] text-gray-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
