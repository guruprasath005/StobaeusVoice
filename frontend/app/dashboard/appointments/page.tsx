"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Appointment {
  appt_id: string;
  patient_id: string | null;
  patient_name: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  slot_date: string;
  slot_time: string;
  appt_type: string;
  status: string;
  source: string;
  notes: string | null;
  created_at: string | null;
}

interface Slot {
  time: string;
  available: boolean;
}

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: "#E0F2FE", text: "#0369a1" },
  confirmed:  { bg: "#DCFCE7", text: "#15803D" },
  completed:  { bg: "#F3F4F6", text: "#374151" },
  cancelled:  { bg: "#FEF2F2", text: "#991B1B" },
};

const TYPE_COLORS: Record<string, string> = {
  consultation: "#0EA5E9",
  echo: "#8B5CF6",
  cath: "#F59E0B",
  followup: "#10B981",
};

const APPT_TYPES = ["consultation", "echo", "cath", "followup"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formSlotTime, setFormSlotTime] = useState("");
  const [saving, setSaving] = useState(false);

  // New appt form
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [apptType, setApptType] = useState("consultation");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [appts, sl] = await Promise.all([
        api.listAppointments(date),
        api.getAvailableSlots(date),
      ]);
      setAppointments(Array.isArray(appts) ? appts : []);
      setSlots(Array.isArray(sl) ? sl : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(selectedDate); }, [load, selectedDate]);

  const openForm = (time: string) => {
    setFormSlotTime(time);
    setPatientName("");
    setPatientId("");
    setApptType("consultation");
    setNotes("");
    setShowForm(true);
  };

  const book = async () => {
    if (!patientName.trim() && !patientId.trim()) return;
    setSaving(true);
    try {
      await api.createAppointment({
        patient_id: patientId || undefined,
        patient_name: patientName || undefined,
        slot_date: selectedDate,
        slot_time: formSlotTime,
        appt_type: apptType,
        notes: notes || undefined,
      });
      setShowForm(false);
      await load(selectedDate);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const updateStatus = async (apptId: string, status: string) => {
    await api.updateAppointment(apptId, { status });
    await load(selectedDate);
  };

  const cancel = async (apptId: string) => {
    await api.cancelAppointment(apptId);
    await load(selectedDate);
  };

  const dateNav = Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i));
  const apptByTime: Record<string, Appointment | undefined> = {};
  appointments.forEach(a => { apptByTime[a.slot_time] = a; });

  const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white";
  const inputSty = { border: "1.5px solid #d4d4d2" };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        <div className="flex items-center gap-3">
          <h1 className="font-hand text-2xl font-bold text-gray-900">Appointment Bot</h1>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369a1]">Cardiology Scheduling</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{appointments.length} appt{appointments.length !== 1 ? "s" : ""} today</span>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-1.5 px-5 py-3 bg-white shrink-0 overflow-x-auto" style={{ borderBottom: "1px dashed #d4d4d2" }}>
        {dateNav.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
            style={selectedDate === d
              ? { background: "#0EA5E9", color: "#fff", border: "1.5px solid #0EA5E9" }
              : { background: "#fff", color: "#6B7280", border: "1.5px solid #d4d4d2" }
            }
          >
            <div>{new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</div>
            <div className="font-bold">{new Date(d + "T00:00:00").getDate()}</div>
          </button>
        ))}
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="shrink-0 ml-2 px-2 py-1.5 text-xs rounded-lg bg-white outline-none"
          style={inputSty}
        />
      </div>

      {/* Slot grid */}
      <div className="flex-1 overflow-auto p-5">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{fmt(selectedDate)}</p>
          <div className="flex gap-3">
            {APPT_TYPES.map(t => (
              <div key={t} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t] }} />
                <span className="text-[10px] text-gray-500 capitalize">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-gray-400 py-12 text-center">Loading slots…</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {slots.map(slot => {
              const appt = apptByTime[slot.time];
              if (appt) {
                const badge = STATUS_BADGE[appt.status] || STATUS_BADGE.scheduled;
                const typeColor = TYPE_COLORS[appt.appt_type] || "#0EA5E9";
                return (
                  <div key={slot.time} className="bg-white rounded-xl p-3" style={{ border: `1.5px solid ${typeColor}` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold text-gray-900">{slot.time}</span>
                      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: badge.bg, color: badge.text }}>{appt.status}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 truncate">{appt.patient_name || appt.patient_id || "Patient"}</p>
                    <p className="text-[10px] capitalize mt-0.5" style={{ color: typeColor }}>{appt.appt_type}</p>
                    {appt.notes && <p className="text-[10px] text-gray-500 truncate mt-0.5">{appt.notes}</p>}
                    {appt.source === "bot" && (
                      <p className="text-[9px] text-[#8B5CF6] mt-1">🤖 Bot-scheduled</p>
                    )}
                    {appt.status === "scheduled" && (
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => updateStatus(appt.appt_id, "confirmed")} className="flex-1 py-1 text-[10px] font-medium rounded-lg text-[#15803D] bg-[#DCFCE7] hover:opacity-80 cursor-pointer transition">
                          Confirm
                        </button>
                        <button onClick={() => cancel(appt.appt_id)} className="px-2 py-1 text-[10px] font-medium rounded-lg text-[#991B1B] bg-[#FEF2F2] hover:opacity-80 cursor-pointer transition">
                          ×
                        </button>
                      </div>
                    )}
                    {appt.status === "confirmed" && (
                      <button onClick={() => updateStatus(appt.appt_id, "completed")} className="mt-2 w-full py-1 text-[10px] font-medium rounded-lg text-[#374151] bg-[#F3F4F6] hover:opacity-80 cursor-pointer transition">
                        Mark Done
                      </button>
                    )}
                  </div>
                );
              }
              return (
                <button
                  key={slot.time}
                  onClick={() => openForm(slot.time)}
                  className="rounded-xl p-3 text-left hover:bg-[#F0F9FF] transition cursor-pointer group"
                  style={{ border: "1.5px dashed #d4d4d2" }}
                >
                  <span className="text-xs font-mono font-bold text-gray-400 group-hover:text-[#0EA5E9]">{slot.time}</span>
                  <p className="text-[10px] text-gray-300 group-hover:text-[#0EA5E9] mt-1 flex items-center gap-1">
                    <Icon d="M12 5v14M5 12h14" size={10} />
                    Book slot
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Book modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
          <div className="bg-white rounded-2xl p-6 w-80 flex flex-col gap-4" style={{ border: "1.5px solid #1a1a1a", boxShadow: "4px 4px 0 #1a1a1a" }}>
            <div className="flex items-center justify-between">
              <p className="font-hand text-lg font-bold text-gray-900">Book Slot — {formSlotTime}</p>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer text-lg">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Patient Name</label>
                <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" className={inputCls} style={inputSty} />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Patient ID (optional)</label>
                <input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="PT-XXXX" className={inputCls} style={inputSty} />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Type</label>
                <select value={apptType} onChange={e => setApptType(e.target.value)} className={inputCls} style={inputSty}>
                  {APPT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Review Echo report" className={inputCls} style={inputSty} />
              </div>
            </div>
            <button
              onClick={book}
              disabled={saving || (!patientName.trim() && !patientId.trim())}
              className="w-full py-2.5 text-xs font-semibold bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0284c7] transition cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0 #0369a1" }}
            >
              {saving ? "Booking…" : "Book Appointment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
