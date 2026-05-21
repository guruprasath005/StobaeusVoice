"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface RecentConsultation {
  session_id: string;
  patient_id: string;
  patient_display: string;
  time: string;
  diagnosis: string;
  icd: string | null;
  status: string;
}

interface DashboardStats {
  today_count: number;
  week_total: number;
  week_days: number[];   // [Mon … Sun]
  approved_today: number;
  doc_pct: number;
  recent: RecentConsultation[];
}

// ── Helpers ────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function today() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ── Chart ──────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function bezierSegments(pts: { x: number; y: number }[], alpha = 0.35): string {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = (p1.x + (p2.x - p0.x) * alpha).toFixed(1);
    const cp1y = (p1.y + (p2.y - p0.y) * alpha).toFixed(1);
    const cp2x = (p2.x - (p3.x - p1.x) * alpha).toFixed(1);
    const cp2y = (p2.y - (p3.y - p1.y) * alpha).toFixed(1);
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function WeekChart({ days }: { days: number[] }) {
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const max = Math.max(...days, 1);

  const W = 560, H = 80, PAD_X = 20, PAD_Y = 18;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const pts = days.map((n, i) => ({
    x: PAD_X + (i / 6) * innerW,
    y: PAD_Y + innerH - (n / max) * innerH,
  }));

  const segs = bezierSegments(pts);
  const linePath = `M${pts[0].x},${pts[0].y}${segs}`;
  const areaPath = `M${pts[0].x},${H} L${pts[0].x},${pts[0].y}${segs} L${pts[pts.length - 1].x},${H} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 100 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line
            key={f}
            x1={PAD_X} y1={PAD_Y + innerH * (1 - f)}
            x2={W - PAD_X} y2={PAD_Y + innerH * (1 - f)}
            stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="4 4"
          />
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="#ffe4e6" opacity="0.55" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r={i === todayIdx ? 4 : 3}
            fill={i === todayIdx ? "#e11d48" : "#fff"}
            stroke="#e11d48"
            strokeWidth="2"
          />
        ))}
        {/* Today value label */}
        <text
          x={pts[todayIdx].x}
          y={pts[todayIdx].y - 8}
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="#e11d48"
        >
          {days[todayIdx]}
        </text>
      </svg>

      {/* Day labels */}
      <div className="flex mt-1" style={{ paddingLeft: PAD_X, paddingRight: PAD_X }}>
        {DAY_LABELS.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div className={`text-[10px] font-medium ${i === todayIdx ? "text-[#e11d48]" : "text-gray-400"}`}>
              {label}
            </div>
            <div className={`text-[10px] font-mono ${i === todayIdx ? "text-[#e11d48]" : "text-gray-500"}`}>
              {days[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────

const STATUS_MAP: Record<string, { dot: string; text: string; label: string }> = {
  approved:  { dot: "#10B981", text: "#15803D", label: "Approved" },
  reviewing: { dot: "#F59E0B", text: "#A16207", label: "Reviewing" },
  recording: { dot: "#e11d48", text: "#9f1239", label: "Recording" },
};

function StatusDot({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.reviewing;
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      <span className="text-[10px] font-medium" style={{ color: s.text }}>{s.label}</span>
    </span>
  );
}

// ── Skeleton row ───────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px dashed #ececea" }}>
      {[120, 60, 140, 50, 60].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-gray-100 animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.full_name?.replace("Dr. ", "").split(" ")[0] || "Doctor";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboardStats()
      .then(data => setStats(data))
      .catch(() => setError("Could not load dashboard — is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const weekDays    = stats?.week_days    ?? [0, 0, 0, 0, 0, 0, 0];
  const todayCount  = stats?.today_count  ?? 0;
  const weekTotal   = stats?.week_total   ?? 0;
  const docPct      = stats?.doc_pct      ?? 0;
  const recent      = stats?.recent       ?? [];

  const STATS = [
    {
      label: "Consultations Today",
      value: loading ? "—" : String(todayCount),
      sub: loading ? "" : weekTotal > 0 ? `${weekTotal} this week` : "No consultations yet",
      color: "#e11d48",
    },
    {
      label: "Notes Generated",
      value: loading ? "—" : String(stats?.approved_today ?? 0),
      sub: loading ? "" : stats?.approved_today ? "All approved" : "None yet today",
      color: stats?.approved_today ? "#10B981" : "#9ca3af",
    },
    {
      label: "Documentation %",
      value: loading ? "—" : `${docPct}%`,
      sub: loading ? "" : docPct >= 80 ? "On track" : docPct > 0 ? "Pending approvals" : "Start a consultation",
      color: docPct >= 80 ? "#10B981" : docPct > 0 ? "#F59E0B" : "#9ca3af",
    },
    {
      label: "This Week",
      value: loading ? "—" : String(weekTotal),
      sub: loading ? "" : weekTotal > 0 ? `Avg ${(weekTotal / 7).toFixed(1)}/day` : "No activity yet",
      color: weekTotal > 0 ? "#10B981" : "#9ca3af",
    },
  ];

  return (
    <div className="flex h-full">
      {/* Main */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Page header */}
        <div className="flex items-center justify-between px-5 h-[72px]" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <h1 className="font-hand text-2xl font-bold text-gray-900">{greeting()}, Dr. {firstName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{today()} · {user?.hospital}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/consultation/new")}
            className="flex items-center gap-2 bg-[#e11d48] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#be123c] transition cursor-pointer shrink-0"
            style={{ boxShadow: "2px 2px 0 #9f1239" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Start Consultation
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-5 text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-3" style={{ border: "1.5px solid #1a1a1a" }}>
                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide">{s.label}</p>
                <p className="font-hand text-3xl font-bold text-gray-900 leading-none">
                  {loading ? (
                    <span className="inline-block h-7 w-10 rounded bg-gray-100 animate-pulse align-middle" />
                  ) : s.value}
                </p>
                <p className="text-[10px] mt-1 font-medium" style={{ color: s.color }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl p-4" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-hand text-base font-bold text-gray-900">Consultations this week</h2>
                <p className="text-[10px] text-gray-400">
                  {weekTotal} total · {(weekTotal / 7).toFixed(1)} avg/day
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="inline-block w-4 h-0.5 rounded bg-[#e11d48]" />
                This week
              </div>
            </div>
            <WeekChart days={weekDays} />
          </div>

          {/* Recent consultations */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1.5px solid #1a1a1a" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px dashed #d4d4d2" }}>
              <h2 className="font-hand text-base font-bold text-gray-900">Recent Consultations</h2>
              <button
                onClick={() => router.push("/dashboard/patients")}
                className="text-[10px] text-[#e11d48] cursor-pointer hover:underline"
              >
                View patients →
              </button>
            </div>

            {loading ? (
              <table className="w-full">
                <tbody>{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</tbody>
              </table>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-sm text-gray-400">No consultations yet</p>
                <button
                  onClick={() => router.push("/dashboard/consultation/new")}
                  className="text-xs text-[#e11d48] hover:underline cursor-pointer"
                >
                  Start your first consultation →
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px dashed #d4d4d2" }}>
                    {["Patient", "Time", "Diagnosis", "ICD-10", "Status"].map(h => (
                      <th key={h} className="text-left text-[10px] text-gray-400 font-medium px-4 py-2 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr
                      key={c.session_id}
                      onClick={() => router.push(
                        c.status === "approved"
                          ? `/dashboard/consultation/${c.session_id}/review`
                          : `/dashboard/consultation/${c.session_id}`
                      )}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      style={{ borderBottom: "1px dashed #ececea" }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
                            style={{ background: "#ffe4e6", color: "#9f1239", border: "1.25px solid #1a1a1a" }}
                          >
                            {(c.patient_display || c.patient_id).replace(/^PT-/, "").split(" ").filter((w: string) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || (c.patient_display || c.patient_id).slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-gray-800">{c.patient_display || c.patient_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500 whitespace-nowrap">{c.time}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 max-w-xs truncate">
                        {c.diagnosis || <span className="text-gray-300 italic">No note yet</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.icd
                          ? <span className="text-[10px] font-mono font-semibold text-[#e11d48]">{c.icd}</span>
                          : <span className="text-[10px] text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusDot status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-64 shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: "1.5px dashed #d4d4d2" }}>
        {/* Right panel header — matches main header h-[72px] so border runs full-width */}
        <div className="flex items-center px-4 h-[72px] shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h3 className="font-hand text-base font-bold text-gray-900">Today&apos;s Queue</h3>
        </div>
        {/* Queue */}
        <div className="px-4 py-3 flex-1 overflow-auto" style={{ borderBottom: "1.5px dashed #d4d4d2" }}>
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
            <p className="text-xs text-gray-400">Queue not set up yet</p>
            <button
              onClick={() => router.push("/dashboard/consultation/new")}
              className="text-[10px] text-[#e11d48] hover:underline cursor-pointer"
            >
              Start a consultation →
            </button>
          </div>
        </div>

        {/* Activity */}
        <div className="p-4 overflow-auto">
          <h3 className="font-hand text-base font-bold text-gray-900 mb-3">Activity</h3>
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400">No activity yet</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {recent.slice(0, 5).map((c) => (
                <div key={c.session_id} className="flex items-start gap-2.5 py-2" style={{ borderBottom: "1px dashed #ececea" }}>
                  <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5" style={{ border: "1.25px solid #1a1a1a" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_MAP[c.status]?.dot ?? "#9ca3af" }} />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-700 leading-snug">
                      {c.status === "approved" ? "Note approved" : c.status === "reviewing" ? "Note pending" : "Recording"} · {c.patient_id}
                    </p>
                    <p className="text-[10px] text-gray-400">{c.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
