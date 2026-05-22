"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Live dictation over the /ws/transcribe WebSocket (Deepgram streaming STT).
 *
 * `onText` is called with the full accumulated transcript on every interim /
 * final update while recording, and once more with the final text on stop.
 * Shared by every "Dictate" control in the app.
 */
export function useLiveDictation(onText: (liveText: string) => void) {
  // keep the latest callback without re-creating start/stop
  const cbRef = useRef(onText);
  cbRef.current = onText;

  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");

  const emit = useCallback(() => {
    const live =
      finalRef.current +
      (interimRef.current ? (finalRef.current ? " " : "") + interimRef.current : "");
    cbRef.current(live);
  }, []);

  const start = useCallback(async () => {
    setError("");
    finalRef.current = "";
    interimRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg;codecs=opus";

      const token = typeof window !== "undefined" ? localStorage.getItem("sv_token") || "" : "";
      const wsPort = process.env.NEXT_PUBLIC_WS_PORT || "8000";
      const wsBase = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:${wsPort}`;
      const wsUrl = `${wsBase}/ws/transcribe?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = ev => {
        let m: { type: string; text?: string; is_final?: boolean; message?: string };
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.type === "error") { setError(m.message || "Live transcription error."); return; }
        if (m.type !== "transcript" || !m.text) return;
        if (m.is_final) {
          finalRef.current = (finalRef.current ? finalRef.current + " " : "") + m.text;
          interimRef.current = "";
        } else {
          interimRef.current = m.text;
        }
        emit();
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
      setError("Could not start recording — allow mic access and ensure the backend is running.");
      wsRef.current?.close();
      wsRef.current = null;
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    }
  }, [emit]);

  const stop = useCallback(async () => {
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
      await new Promise(r => setTimeout(r, 1200)); // let Deepgram flush trailing finals
      ws.close();
    }
    wsRef.current = null;

    if (interimRef.current) {
      finalRef.current = (finalRef.current ? finalRef.current + " " : "") + interimRef.current;
      interimRef.current = "";
    }
    emit();
  }, [emit]);

  return { recording, error, start, stop };
}

/**
 * Live-append helper: snapshots the field's current text on Start and then,
 * on every interim/final transcript update, writes back
 * `snapshot + separator + liveTranscript`. The doctor sees their words appear
 * in the field as they speak. Each call site keeps its own button styling.
 */
export function useLiveAppend(
  value: string,
  setValue: (v: string) => void,
  separator: string = " ",
) {
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const prefixRef = useRef("");
  const { recording, error, start, stop } = useLiveDictation((live) => {
    const p = prefixRef.current;
    setValue(p ? `${p}${separator}${live}` : live);
  });

  const toggle = useCallback(() => {
    if (recording) { stop(); return; }
    prefixRef.current = valueRef.current || "";
    start();
  }, [recording, start, stop]);

  return { recording, error, toggle };
}
