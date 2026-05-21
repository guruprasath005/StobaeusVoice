"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface ClinicalCtx {
  age: number | null;
  gender_code: string | null;
  conditions: string[];
  medications: { drug: string; dose?: string; freq?: string }[];
  allergies: string[];
}

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ d, d2, size = 16 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

// ── Animated waveform ──────────────────────────────────────────────

function Waveform({ active }: { active: boolean }) {
  const bars = [4, 8, 14, 7, 16, 11, 6, 13, 9, 5, 12, 15, 8, 6, 10, 13, 7, 11, 9, 14, 5, 8, 12, 7, 10, 13, 6, 9];
  return (
    <div className="flex items-center gap-0.5" style={{ height: 42 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: 3,
            background: active ? "#e11d48" : "#d4d4d2",
            height: active ? h * 2.2 : 4,
            animation: active ? `pulse-bar ${0.5 + i * 0.06}s ease-in-out infinite alternate` : "none",
            opacity: active ? 0.6 + (i % 3) * 0.2 : 0.4,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse-bar {
          from { transform: scaleY(0.35); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// ── Timer ──────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const hh = Math.floor(secs / 3600);
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return hh > 0 ? `${String(hh).padStart(2,"0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── Pulsing mic circle ─────────────────────────────────────────────

function MicCircle({ recording, onClick, disabled }: {
  recording: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* outer ring — dashed, animated */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -28,
          border: `2px dashed #e11d48`,
          opacity: recording ? 0.4 : 0.15,
          animation: recording ? "spin-slow 8s linear infinite" : "none",
        }}
      />
      {/* middle ring */}
      <div
        className="absolute rounded-full transition-all duration-500"
        style={{
          inset: -14,
          border: `2px solid #e11d48`,
          opacity: recording ? 0.65 : 0.2,
        }}
      />
      {/* glow ring — only when recording */}
      {recording && (
        <div
          className="absolute rounded-full animate-ping"
          style={{
            inset: -8,
            background: "rgba(14,165,233,0.15)",
            borderRadius: "50%",
          }}
        />
      )}
      {/* main circle */}
      <button
        onClick={onClick}
        disabled={disabled}
        className="relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer disabled:opacity-40"
        style={{
          width: 160,
          height: 160,
          background: recording ? "#e11d48" : "#ffe4e6",
          boxShadow: recording
            ? "0 0 60px rgba(14,165,233,0.55), 0 4px 24px rgba(14,165,233,0.35)"
            : "0 4px 20px rgba(14,165,233,0.15)",
          border: "2.5px solid " + (recording ? "#be123c" : "#fecdd3"),
        }}
      >
        <svg width={56} height={56} viewBox="0 0 24 24" fill="none"
          stroke={recording ? "#fff" : "#e11d48"} strokeWidth={1.6}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
        </svg>
      </button>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function ActiveConsultationPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientDisplay, setPatientDisplay] = useState<string | null>(null);
  const [clinical, setClinical] = useState<ClinicalCtx | null>(null);
  const [isFollowup, setIsFollowup] = useState(false);

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptRef = useRef("");

  const timer = useTimer(recording);

  // Load session info
  useEffect(() => {
    api.getConsultation(sessionId).then(data => {
      if (data.is_followup) setIsFollowup(true);
      if (data.patient_id) {
        setPatientId(data.patient_id);
        setPatientDisplay(data.patient_display || data.patient_id);
        if (!data.patient_id.startsWith("PT-ANON")) {
          api.getClinicalContext(data.patient_id)
            .then(c => { if (c) setClinical(c); })
            .catch(() => {});
        }
      }
      if (data.transcript) {
        setTranscript(data.transcript);
        transcriptRef.current = data.transcript;
      }
      if (data.status === "approved") {
        router.replace(`/dashboard/consultation/${sessionId}/review`);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Release the mic and close the live-transcription socket on unmount.
  useEffect(() => {
    return () => {
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
      wsRef.current?.close();
    };
  }, []);

  // Append a finalized transcript segment. transcriptRef is the source of truth.
  const appendFinal = useCallback((text: string) => {
    transcriptRef.current = (transcriptRef.current ? transcriptRef.current + " " : "") + text;
    setTranscript(transcriptRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg;codecs=opus";

      // Open the live-transcription WebSocket. WebSockets can't send headers,
      // so the JWT travels as a query param.
      const token = typeof window !== "undefined" ? localStorage.getItem("sv_token") || "" : "";
      const wsUrl =
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws") +
        `/ws/transcribe?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(sessionId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = ev => {
        let m: { type: string; text?: string; is_final?: boolean; message?: string };
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.type === "error") { setError(m.message || "Live transcription error."); return; }
        if (m.type !== "transcript" || !m.text) return;
        if (m.is_final) { appendFinal(m.text); setInterim(""); }
        else { setInterim(m.text); }
      };
      ws.onerror = () =>
        setError("Live transcription connection failed — check the backend and DEEPGRAM_API_KEY.");

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        setTimeout(() => reject(new Error("ws timeout")), 5000);
      });

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRef.current = mr;
      mr.ondataavailable = e => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      };
      mr.start(250); // 250ms chunks → low-latency streaming
      setRecording(true);
    } catch {
      setError("Could not start recording — allow mic permission and ensure the backend is running.");
      wsRef.current?.close();
      wsRef.current = null;
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    }
  }, [sessionId, appendFinal]);

  const stopRecording = useCallback(async () => {
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    }
    mediaRef.current = null;
    setRecording(false);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
      // give Deepgram a moment to flush trailing final transcripts
      await new Promise(r => setTimeout(r, 1200));
      ws.close();
    }
    wsRef.current = null;

    // fold any still-interim text into the transcript
    setInterim(cur => { if (cur) appendFinal(cur); return ""; });
  }, [appendFinal]);

  const stopAndGenerate = async () => {
    if (recording) await stopRecording();
    if (!transcriptRef.current.trim() && !transcript.trim()) {
      setError("No transcript yet — please record some audio first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      // transcriptRef is authoritative (updated synchronously while streaming).
      await api.updateTranscript(sessionId, transcriptRef.current || transcript);
      await api.generateNote(sessionId);
      router.push(`/dashboard/consultation/${sessionId}/review`);
    } catch {
      setError("Note generation failed — check that the backend is running with a valid OpenAI key.");
      setGenerating(false);
    }
  };

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  // Leaving without recording anything → discard the empty session so it
  // never shows up as a stray "recording" entry on the dashboard.
  const handleCancel = async () => {
    if (!transcript.trim() && !transcriptRef.current.trim()) {
      try { await api.discardConsultation(sessionId); } catch { /* best-effort */ }
    }
    router.push("/dashboard");
  };

  // Patient initials for avatar
  const initials = patientDisplay
    ? patientDisplay.split(" ").filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?";

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Patient strip ────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{ height: 64, borderBottom: "1px dashed #d4d4d2" }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ background: "#ffe4e6", color: "#9f1239", border: "1.25px solid #1a1a1a" }}
        >
          {initials}
        </div>

        {/* Name / session */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-hand text-lg font-bold text-gray-900 leading-tight truncate">
              {patientDisplay || "Anonymous Consultation"}
            </h1>
            {isFollowup && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0" style={{ border: "1px solid #fcd34d" }}>
                Follow-up
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-mono">
            {patientId || "PT-ANON"} · Session {sessionId.slice(0, 8)}
          </p>
        </div>

        {/* Chips */}
        <div className="flex items-center gap-2 shrink-0">
          {recording ? (
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: "#FEE2E2", border: "1.25px solid #EF4444", color: "#7f1d1d" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
              REC
            </span>
          ) : null}
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
            style={{ border: "1.25px solid #1a1a1a", background: "#fff" }}
          >
            <Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={11} />
            Multilingual
          </span>
          {recording && (
            <span className="text-xs font-mono text-gray-500 tabular-nums" style={{ minWidth: 52 }}>
              {timer}
            </span>
          )}
          <button
            onClick={handleCancel}
            className="text-xs text-gray-400 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ── 3-column body ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Col 1: Transcript ────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ borderRight: "1px dashed #d4d4d2" }}>
          <div className="px-4 py-2.5 shrink-0 flex items-center justify-between" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <span className="font-hand text-sm font-bold text-gray-700">Live transcript</span>
            <span className="text-[10px] text-gray-400">
              {(transcript + " " + interim).split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
          <textarea
            value={recording ? transcript + (interim ? (transcript ? " " : "") + interim : "") : transcript}
            onChange={e => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
            }}
            readOnly={recording}
            placeholder={"Your dictation appears here live as you speak…\n\nYou can also type or paste a transcript directly."}
            className="flex-1 p-4 text-xs text-gray-700 leading-relaxed outline-none resize-none bg-white"
          />
          {recording && (
            <div className="px-4 py-2 shrink-0 flex items-center gap-2 text-[10px] text-[#e11d48]" style={{ borderTop: "1px dashed #d4d4d2" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48] animate-pulse" />
              Live transcription active
            </div>
          )}
        </div>

        {/* ── Col 2: Mic center ────────────────────────────────── */}
        <div
          className="flex flex-col items-center justify-center shrink-0"
          style={{
            width: 300,
            borderRight: "1px dashed #d4d4d2",
            padding: "20px 24px",
          }}
        >
          {/* Mic */}
          <MicCircle recording={recording} onClick={toggleRecording} disabled={generating} />

          {/* Status label */}
          <p
            className="font-hand text-xl mt-5 mb-3 transition-colors"
            style={{ color: recording ? "#e11d48" : "#9ca3af" }}
          >
            {generating ? "Generating…" : recording ? "Listening…" : transcript ? "Paused" : "Ready"}
          </p>

          {/* Waveform */}
          <Waveform active={recording} />

          {/* Error */}
          {error && (
            <p className="mt-3 text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center max-w-[220px]">{error}</p>
          )}

          {/* Buttons */}
          <div className="mt-5 flex flex-col gap-2 w-full max-w-[220px]">
            <button
              onClick={toggleRecording}
              disabled={generating}
              className={`w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer disabled:opacity-40 ${
                recording
                  ? "text-[#EF4444] hover:bg-red-50"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={{ border: "1.5px solid " + (recording ? "#EF4444" : "#1a1a1a"), boxShadow: "2px 2px 0 " + (recording ? "#fca5a5" : "#1a1a1a") }}
            >
              {recording ? (
                <><Icon d="M10 9v6m4-6v6" size={13} /> Pause</>
              ) : (
                <><Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={13} />
                  {transcript ? "Continue" : "Start"} Recording</>
              )}
            </button>

            <button
              onClick={stopAndGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 bg-[#e11d48] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#be123c] transition cursor-pointer disabled:opacity-40"
              style={{ boxShadow: "2px 2px 0 #9f1239" }}
            >
              {generating ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
              ) : (
                <><Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={13} /> Stop &amp; Generate →</>
              )}
            </button>
          </div>
        </div>

        {/* ── Col 3: Patient context / entities ───────────────── */}
        <div className="flex flex-col overflow-hidden" style={{ width: 252 }}>
          <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: "1px dashed #d4d4d2" }}>
            <span className="font-hand text-sm font-bold text-gray-700">
              Clinical context{" "}
              <span className="text-[10px] font-normal text-[#e11d48] not-italic">● live</span>
            </span>
          </div>

          <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
            {/* Patient ID chip */}
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: "#fff1f2", border: "1px dashed #fecdd3" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48] shrink-0" />
              <p className="text-[10px] font-mono text-[#9f1239] font-semibold">{patientId || "PT-ANON"}</p>
            </div>

            {patientId?.startsWith("PT-ANON") && (
              <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">
                Anonymous — no clinical context
              </p>
            )}

            {clinical ? (
              <>
                {(clinical.age || clinical.gender_code) && (
                  <div
                    className="rounded-lg p-2.5"
                    style={{ border: "1.5px dashed #6b6b6b" }}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Demographics</p>
                    <p className="text-xs font-semibold text-gray-800">
                      {clinical.age && `${clinical.age} yrs`}{clinical.gender_code && ` · ${clinical.gender_code === "M" ? "Male" : clinical.gender_code === "F" ? "Female" : "Other"}`}
                    </p>
                  </div>
                )}

                {clinical.conditions.length > 0 && (
                  <div
                    className="rounded-lg p-2.5"
                    style={{ border: "1.5px dashed #6b6b6b" }}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Known Conditions</p>
                    <div className="flex flex-wrap gap-1">
                      {clinical.conditions.map(c => (
                        <span
                          key={c}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ border: "1.25px solid #1a1a1a", background: "#fff" }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {clinical.medications.length > 0 && (
                  <div
                    className="rounded-lg p-2.5"
                    style={{ border: "1.5px dashed #6b6b6b" }}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Medications</p>
                    <div className="flex flex-col gap-1">
                      {clinical.medications.map((m, i) => (
                        <p key={i} className="text-[11px] text-gray-700 leading-snug">
                          <span className="font-semibold">{m.drug}</span>
                          {m.dose ? ` ${m.dose}` : ""}{m.freq ? ` · ${m.freq}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {clinical.allergies.length > 0 && (
                  <div
                    className="rounded-lg p-2.5"
                    style={{ border: "1.5px dashed #EF4444", background: "#FEF2F2" }}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-red-400 mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-1">
                      {clinical.allergies.map(a => (
                        <span key={a} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              !patientId?.startsWith("PT-ANON") && (
                <p className="text-[10px] text-gray-400">Loading patient context…</p>
              )
            )}
          </div>

          {/* PII firewall notice */}
          <div className="px-3 py-2.5 shrink-0 bg-gray-50" style={{ borderTop: "1px dashed #d4d4d2" }}>
            <div className="flex items-start gap-1.5">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={10} />
              <p className="text-[9px] text-gray-500 leading-relaxed">
                Name &amp; contact <strong>never</strong> sent to AI — only age, conditions &amp; meds.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
