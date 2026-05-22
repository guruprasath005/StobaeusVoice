"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PACS_DICOMWEB = "http://31.97.63.234:8042/dicom-web";

type Instance = {
  series_uid: string;
  sop_uid: string;
  modality: string;
  instance_number: number;
};

function PacsViewerInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const studyUid     = searchParams.get("study") || "";
  const modality     = searchParams.get("modality") || "";

  const [instances, setInstances] = useState<Instance[]>([]);
  const [idx, setIdx]             = useState(0);
  const [loading, setLoading]     = useState(true);
  const [imgSrc, setImgSrc]       = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [zoom, setZoom]           = useState(1);
  const [inverted, setInverted]   = useState(false);
  const blobRef = useRef<string | null>(null);

  // Load instance list
  useEffect(() => {
    if (!studyUid) return;
    setLoading(true);
    const token = localStorage.getItem("sv_token") || "";
    const params = new URLSearchParams({
      wado_base: PACS_DICOMWEB, study_uid: studyUid,
      username: "orthanc", password: "orthanc",
    });
    fetch(`/api/pacs/instances?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Instance[]) => {
        const sorted = data.sort((a, b) => a.instance_number - b.instance_number);
        setInstances(sorted);
        setIdx(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studyUid]);

  // Load frame whenever instance changes
  useEffect(() => {
    if (!instances.length) return;
    const inst = instances[idx];
    if (!inst) return;

    setImgLoading(true);
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }

    const token = localStorage.getItem("sv_token") || "";
    const params = new URLSearchParams({
      wado_base: PACS_DICOMWEB, study_uid: studyUid,
      series_uid: inst.series_uid, sop_uid: inst.sop_uid,
      username: "orthanc", password: "orthanc",
    });
    fetch(`/api/pacs/frame?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setImgSrc(url);
      })
      .catch(() => setImgSrc(null))
      .finally(() => setImgLoading(false));
  }, [instances, idx, studyUid]);

  const goTo = useCallback((i: number) => {
    setIdx(Math.max(0, Math.min(instances.length - 1, i)));
  }, [instances.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(idx + 1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goTo(idx - 1);
      if (e.key === "Escape") router.back();
      if (e.key === "i") setInverted(v => !v);
      if (e.key === "+") setZoom(z => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom(z => Math.max(0.25, z - 0.25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, goTo, router]);

  const current = instances[idx];

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
      {/* top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-gray-400 hover:text-white text-sm cursor-pointer transition">
            ← Back
          </button>
          <span className="text-white text-sm font-semibold">
            {modality || "DICOM"} Viewer
          </span>
          {current && (
            <span className="text-gray-400 text-xs font-mono">
              {current.modality} · Series {current.series_uid.slice(-6)} · Instance {current.instance_number}
            </span>
          )}
        </div>

        {/* tools */}
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="w-7 h-7 rounded bg-gray-800 text-white text-sm cursor-pointer hover:bg-gray-700">−</button>
          <span className="text-gray-400 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="w-7 h-7 rounded bg-gray-800 text-white text-sm cursor-pointer hover:bg-gray-700">+</button>
          <button onClick={() => setZoom(1)}
            className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-300 cursor-pointer hover:bg-gray-700">Fit</button>
          <button onClick={() => setInverted(v => !v)}
            className="text-[10px] px-2 py-1 rounded cursor-pointer transition"
            style={{ background: inverted ? "#e11d48" : "#374151", color: "white" }}>
            Invert
          </button>
          <span className="text-gray-600 text-[9px] font-mono ml-2">{studyUid.slice(-20)}</span>
        </div>
      </div>

      {/* main viewer */}
      <div className="flex flex-1 min-h-0">
        {/* image area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative bg-black">
          {(loading || imgLoading) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {imgSrc && !imgLoading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt="DICOM"
              style={{
                transform: `scale(${zoom})`,
                filter: inverted ? "invert(1)" : "none",
                transition: "transform 0.15s ease",
                imageRendering: "auto",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          )}
          {!loading && !imgLoading && !imgSrc && (
            <p className="text-gray-500 text-sm">Failed to load image</p>
          )}

          {/* prev/next overlay */}
          {instances.length > 1 && (
            <>
              <button onClick={() => goTo(idx - 1)} disabled={idx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-14 rounded bg-black/50 text-white text-xl cursor-pointer hover:bg-black/80 disabled:opacity-20">‹</button>
              <button onClick={() => goTo(idx + 1)} disabled={idx === instances.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-14 rounded bg-black/50 text-white text-xl cursor-pointer hover:bg-black/80 disabled:opacity-20">›</button>
            </>
          )}
        </div>

        {/* filmstrip — only when multiple instances */}
        {instances.length > 1 && (
          <div className="w-20 bg-gray-950 border-l border-gray-800 overflow-y-auto flex flex-col gap-1 p-1">
            {instances.map((inst, i) => (
              <button key={inst.sop_uid} onClick={() => goTo(i)}
                className="w-full aspect-square rounded shrink-0 cursor-pointer flex items-center justify-center text-[9px] font-mono transition"
                style={{
                  background: i === idx ? "#e11d48" : "#1f2937",
                  color: i === idx ? "white" : "#9ca3af",
                  border: "1px solid " + (i === idx ? "#be123c" : "#374151"),
                }}>
                {inst.instance_number}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* bottom bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-gray-950 border-t border-gray-800">
        <span className="text-[9px] text-gray-500 font-mono">
          {instances.length > 0 ? `${idx + 1} / ${instances.length} instances` : "No instances"}
        </span>
        <span className="text-[9px] text-gray-600">
          ← → navigate · + − zoom · I invert · Esc close
        </span>
      </div>
    </div>
  );
}

export default function PacsViewerPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <PacsViewerInner />
    </Suspense>
  );
}
