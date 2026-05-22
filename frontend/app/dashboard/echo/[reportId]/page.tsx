"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useLiveAppend } from "@/lib/useLiveDictation";
import PatientSearchModal from "@/components/PatientSearchModal";

// ── Types ──────────────────────────────────────────────────────────

type Template = "echo" | "cath" | "stress_test" | "holter";

interface ReportData {
  report_id: string;
  template: Template;
  patient_id: string | null;
  patient_display: string | null;
  findings: Record<string, unknown>;
  impression: string | null;
  icd_codes: { code: string; description: string }[] | null;
  status: string;
  created_at: string | null;
}

// ── Small helpers ──────────────────────────────────────────────────

function Icon({ d, d2, size = 14 }: { d: string; d2?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2 mb-2" style={{ borderBottom: "1px dashed #d4d4d2" }}>
      <span className="w-2 h-2 rounded-sm bg-[#e11d48] shrink-0" />
      <h3 className="font-hand text-sm font-bold text-gray-900">{label}</h3>
    </div>
  );
}

const inputCls = "w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white";
const inputSty = { border: "1.5px solid #d4d4d2" };
const labelCls = "block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls + " bg-white"} style={inputSty}>
      <option value="">—</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextInput({ value, onChange, placeholder, unit }: {
  value: string; onChange: (v: string) => void; placeholder?: string; unit?: string;
}) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
        style={inputSty}
      />
      {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{unit}</span>}
    </div>
  );
}

// ── Echo template ──────────────────────────────────────────────────

function EchoForm({ findings, onChange }: {
  findings: Record<string, string>; onChange: (k: string, v: string) => void;
}) {
  const f = (k: string) => findings[k] || "";
  const chg = (k: string) => (v: string) => onChange(k, v);

  return (
    <div className="flex flex-col gap-5">
      {/* LV */}
      <div>
        <SectionHead label="Left Ventricle" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="EF (%)">
            <TextInput value={f("lv_ef")} onChange={chg("lv_ef")} placeholder="e.g. 55" unit="%" />
          </Field>
          <Field label="LV Hypertrophy">
            <Select value={f("lv_hypertrophy")} onChange={chg("lv_hypertrophy")} options={["None", "Mild", "Moderate", "Severe"]} />
          </Field>
          <Field label="LVEDD">
            <TextInput value={f("lvedd")} onChange={chg("lvedd")} placeholder="e.g. 48" unit="mm" />
          </Field>
          <Field label="LVESD">
            <TextInput value={f("lvesd")} onChange={chg("lvesd")} placeholder="e.g. 32" unit="mm" />
          </Field>
          <Field label="IVSd">
            <TextInput value={f("ivsd")} onChange={chg("ivsd")} placeholder="e.g. 10" unit="mm" />
          </Field>
          <Field label="Posterior Wall">
            <TextInput value={f("pw")} onChange={chg("pw")} placeholder="e.g. 10" unit="mm" />
          </Field>
          <div className="col-span-2">
            <Field label="Wall Motion Abnormality (RWMA)">
              <textarea
                value={f("rwma")}
                onChange={e => onChange("rwma", e.target.value)}
                placeholder="e.g. Hypokinesia of anterior wall and apex consistent with LAD territory..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none focus:ring-2 focus:ring-[#e11d48] bg-white resize-none"
                style={{ ...inputSty, minHeight: 60 }}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* RV */}
      <div>
        <SectionHead label="Right Ventricle" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="RV Dimensions">
            <Select value={f("rv_size")} onChange={chg("rv_size")} options={["Normal", "Mildly dilated", "Moderately dilated", "Severely dilated"]} />
          </Field>
          <Field label="RV Function">
            <Select value={f("rv_function")} onChange={chg("rv_function")} options={["Normal", "Mildly reduced", "Moderately reduced", "Severely reduced"]} />
          </Field>
        </div>
      </div>

      {/* Valves */}
      <div>
        <SectionHead label="Valves" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mitral Regurgitation (MR)">
            <Select value={f("mr_grade")} onChange={chg("mr_grade")} options={["None", "Trivial (1+)", "Mild (2+)", "Moderate (3+)", "Severe (4+)"]} />
          </Field>
          <Field label="Mitral Stenosis">
            <Select value={f("ms")} onChange={chg("ms")} options={["No", "Yes — mild", "Yes — moderate", "Yes — severe"]} />
          </Field>
          {f("ms") !== "No" && f("ms") !== "" && (
            <Field label="MVA">
              <TextInput value={f("mva")} onChange={chg("mva")} placeholder="e.g. 1.2" unit="cm²" />
            </Field>
          )}
          <Field label="Aortic Regurgitation (AR)">
            <Select value={f("ar_grade")} onChange={chg("ar_grade")} options={["None", "Trivial (1+)", "Mild (2+)", "Moderate (3+)", "Severe (4+)"]} />
          </Field>
          <Field label="Aortic Stenosis">
            <Select value={f("as")} onChange={chg("as")} options={["No", "Yes — mild", "Yes — moderate", "Yes — severe"]} />
          </Field>
          {f("as") !== "No" && f("as") !== "" && (
            <Field label="Mean AV Gradient">
              <TextInput value={f("av_gradient")} onChange={chg("av_gradient")} placeholder="e.g. 40" unit="mmHg" />
            </Field>
          )}
          <Field label="Tricuspid Regurgitation (TR)">
            <Select value={f("tr_grade")} onChange={chg("tr_grade")} options={["None", "Trivial (1+)", "Mild (2+)", "Moderate (3+)", "Severe (4+)"]} />
          </Field>
          <Field label="RVSP (estimated)">
            <TextInput value={f("rvsp")} onChange={chg("rvsp")} placeholder="e.g. 45" unit="mmHg" />
          </Field>
        </div>
      </div>

      {/* Aorta */}
      <div>
        <SectionHead label="Aorta" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Aortic Root">
            <TextInput value={f("ao_root")} onChange={chg("ao_root")} placeholder="e.g. 34" unit="mm" />
          </Field>
          <Field label="Ascending Aorta">
            <TextInput value={f("asc_aorta")} onChange={chg("asc_aorta")} placeholder="e.g. 36" unit="mm" />
          </Field>
        </div>
      </div>

      {/* Atria + Pericardium */}
      <div>
        <SectionHead label="Atria & Pericardium" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Left Atrium (size)">
            <Select value={f("la_size")} onChange={chg("la_size")} options={["Normal", "Mildly dilated", "Moderately dilated", "Severely dilated"]} />
          </Field>
          <Field label="LA Diameter">
            <TextInput value={f("la_diam")} onChange={chg("la_diam")} placeholder="e.g. 38" unit="mm" />
          </Field>
          <Field label="Right Atrium">
            <Select value={f("ra_size")} onChange={chg("ra_size")} options={["Normal", "Mildly dilated", "Moderately dilated", "Severely dilated"]} />
          </Field>
          <Field label="Pericardium">
            <Select value={f("pericardium")} onChange={chg("pericardium")} options={["Normal", "Trivial effusion", "Small effusion", "Moderate effusion", "Large effusion", "Constrictive features"]} />
          </Field>
          <Field label="IVC">
            <Select value={f("ivc")} onChange={chg("ivc")} options={["Normal", "Dilated (no collapse)", "Dilated (partial collapse)"]} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Cath template ──────────────────────────────────────────────────

const COMPLICATION_OPTIONS = [
  "Nil", "Coronary dissection", "No-reflow / slow-flow", "Perforation",
  "Access site haematoma", "Contrast reaction", "Hypotension requiring support",
  "Arrhythmia", "Cardiac arrest", "Stroke",
];

const STENT_BRANDS = ["Xience (Abbott)", "Resolute Onyx (Medtronic)", "Synergy (BSci)", "BioFreedom (Biosensors)", "Ultimaster (Terumo)", "Supraflex (Sahajanand)", "Coroflex ISAR (B.Braun)", "Other"];
const STENT_DIAS   = ["2.25 mm", "2.5 mm", "2.75 mm", "3.0 mm", "3.25 mm", "3.5 mm", "3.75 mm", "4.0 mm"];
const STENT_LENS   = ["8 mm", "12 mm", "14 mm", "16 mm", "18 mm", "20 mm", "23 mm", "24 mm", "28 mm", "32 mm", "38 mm"];
const STENT_POSTDIL = ["No", "Yes — NC balloon", "Yes — cutting balloon"];

interface StentEntry {
  vessel: string;
  brand: string;
  dia: string;
  len: string;
  post_dilation: string;
}

function parseStents(raw: string | undefined): StentEntry[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function StentsWidget({ raw, onChange }: { raw: string; onChange: (v: string) => void }) {
  const stents = parseStents(raw);

  const update = (idx: number, field: keyof StentEntry, val: string) => {
    const next = stents.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    onChange(JSON.stringify(next));
  };
  const add = () => onChange(JSON.stringify([...stents, { vessel: "", brand: "", dia: "", len: "", post_dilation: "" }]));
  const remove = (idx: number) => onChange(JSON.stringify(stents.filter((_, i) => i !== idx)));

  return (
    <div className="flex flex-col gap-3">
      {stents.length === 0 && (
        <p className="text-[11px] text-gray-400">No stents added — click below to add</p>
      )}
      {stents.map((s, idx) => (
        <div key={idx} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: "1.5px dashed #d4d4d2", background: "#fafafa" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#e11d48]">Stent {idx + 1}</span>
            <button type="button" onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 cursor-pointer text-base leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className={labelCls}>Target Vessel</label>
              <input
                value={s.vessel}
                onChange={e => update(idx, "vessel", e.target.value)}
                placeholder="e.g. LAD proximal, RCA mid"
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <select value={s.brand} onChange={e => update(idx, "brand", e.target.value)} className={inputCls + " bg-white"} style={inputSty}>
                <option value="">—</option>
                {STENT_BRANDS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Post-Dilation</label>
              <select value={s.post_dilation} onChange={e => update(idx, "post_dilation", e.target.value)} className={inputCls + " bg-white"} style={inputSty}>
                <option value="">—</option>
                {STENT_POSTDIL.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Diameter</label>
              <select value={s.dia} onChange={e => update(idx, "dia", e.target.value)} className={inputCls + " bg-white"} style={inputSty}>
                <option value="">—</option>
                {STENT_DIAS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Length</label>
              <select value={s.len} onChange={e => update(idx, "len", e.target.value)} className={inputCls + " bg-white"} style={inputSty}>
                <option value="">—</option>
                {STENT_LENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
      {stents.length < 4 && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs font-medium text-[#e11d48] hover:text-[#be123c] cursor-pointer w-fit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add stent
        </button>
      )}
    </div>
  );
}

function CompMultiSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];
  const toggle = (opt: string) => {
    let next: string[];
    if (opt === "Nil") {
      next = selected.includes("Nil") ? [] : ["Nil"];
    } else {
      const without = selected.filter(s => s !== "Nil");
      next = without.includes(opt) ? without.filter(s => s !== opt) : [...without, opt];
    }
    onChange(next.join(", "));
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {COMPLICATION_OPTIONS.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition font-medium ${
              active ? "bg-red-100 text-red-700 border border-red-300" : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-400"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CathForm({ findings, onChange }: {
  findings: Record<string, string>; onChange: (k: string, v: string) => void;
}) {
  const f = (k: string) => findings[k] || "";
  const chg = (k: string) => (v: string) => onChange(k, v);
  const TIMI = ["0", "1", "2", "3"];
  const STENOSIS = ["Normal", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "95%", "99%", "100% (total occlusion)"];
  const isPCI = f("recommendation")?.startsWith("PCI");

  return (
    <div className="flex flex-col gap-5">
      {/* Procedure */}
      <div>
        <SectionHead label="Procedure Details" />
        <div className="grid grid-cols-4 gap-3">
          <Field label="Access">
            <Select value={f("access")} onChange={chg("access")} options={["Radial (right)", "Radial (left)", "Femoral (right)", "Femoral (left)"]} />
          </Field>
          <Field label="Catheter Size">
            <Select value={f("catheter_fr")} onChange={chg("catheter_fr")} options={["5F", "6F", "7F", "8F"]} />
          </Field>
          <Field label="Fluoroscopy Time">
            <TextInput value={f("fluoro_time")} onChange={chg("fluoro_time")} placeholder="e.g. 12.5" unit="min" />
          </Field>
          <Field label="Contrast Volume">
            <TextInput value={f("contrast_vol")} onChange={chg("contrast_vol")} placeholder="e.g. 120" unit="mL" />
          </Field>
          <Field label="Coronary Dominance">
            <Select value={f("dominance")} onChange={chg("dominance")} options={["Right dominant", "Left dominant", "Co-dominant"]} />
          </Field>
        </div>
      </div>

      {/* Coronary anatomy */}
      <div>
        <SectionHead label="Coronary Anatomy" />
        <div className="grid grid-cols-4 gap-3">
          <Field label="LMCA">
            <Select value={f("lmca")} onChange={chg("lmca")} options={["Normal", ...STENOSIS.slice(3)]} />
          </Field>
          <div />

          {/* LAD */}
          <Field label="LAD — Proximal"><Select value={f("lad_prox")} onChange={chg("lad_prox")} options={STENOSIS} /></Field>
          <Field label="LAD — Mid"><Select value={f("lad_mid")} onChange={chg("lad_mid")} options={STENOSIS} /></Field>
          <Field label="LAD — Distal"><Select value={f("lad_dist")} onChange={chg("lad_dist")} options={STENOSIS} /></Field>
          <div />
          <Field label="LAD TIMI — Pre"><Select value={f("lad_timi")} onChange={chg("lad_timi")} options={TIMI} /></Field>
          <Field label="LAD TIMI — Post"><Select value={f("lad_timi_post")} onChange={chg("lad_timi_post")} options={TIMI} /></Field>
          <div /><div />

          {/* LCX */}
          <Field label="LCX — Proximal"><Select value={f("lcx_prox")} onChange={chg("lcx_prox")} options={STENOSIS} /></Field>
          <Field label="LCX — OM1"><Select value={f("lcx_om1")} onChange={chg("lcx_om1")} options={STENOSIS} /></Field>
          <Field label="LCX — OM2"><Select value={f("lcx_om2")} onChange={chg("lcx_om2")} options={STENOSIS} /></Field>
          <div />
          <Field label="LCX TIMI — Pre"><Select value={f("lcx_timi")} onChange={chg("lcx_timi")} options={TIMI} /></Field>
          <Field label="LCX TIMI — Post"><Select value={f("lcx_timi_post")} onChange={chg("lcx_timi_post")} options={TIMI} /></Field>
          <div /><div />

          {/* RCA */}
          <Field label="RCA — Proximal"><Select value={f("rca_prox")} onChange={chg("rca_prox")} options={STENOSIS} /></Field>
          <Field label="RCA — Mid"><Select value={f("rca_mid")} onChange={chg("rca_mid")} options={STENOSIS} /></Field>
          <Field label="RCA — Distal"><Select value={f("rca_dist")} onChange={chg("rca_dist")} options={STENOSIS} /></Field>
          <div />
          <Field label="RCA TIMI — Pre"><Select value={f("rca_timi")} onChange={chg("rca_timi")} options={TIMI} /></Field>
          <Field label="RCA TIMI — Post"><Select value={f("rca_timi_post")} onChange={chg("rca_timi_post")} options={TIMI} /></Field>
        </div>
      </div>

      {/* Hemodynamics */}
      <div>
        <SectionHead label="Hemodynamics" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="LVEDP"><TextInput value={f("lvedp")} onChange={chg("lvedp")} placeholder="e.g. 18" unit="mmHg" /></Field>
          <Field label="Aortic Pressure"><TextInput value={f("aortic_bp")} onChange={chg("aortic_bp")} placeholder="e.g. 130/80" unit="mmHg" /></Field>
          <Field label="LV EF (ventriculogram)"><TextInput value={f("lv_ef")} onChange={chg("lv_ef")} placeholder="e.g. 45" unit="%" /></Field>
        </div>
      </div>

      {/* Recommendation */}
      <div>
        <SectionHead label="Recommendation" />
        <div className="grid grid-cols-1 gap-3">
          <Field label="Plan">
            <Select value={f("recommendation")} onChange={chg("recommendation")} options={["Medical management", "PCI — single vessel", "PCI — multi vessel", "CABG", "CABG + valve surgery", "Palliative"]} />
          </Field>
        </div>
      </div>

      {/* Stent Details — shown when PCI selected */}
      {isPCI && (
        <div>
          <SectionHead label={`Stent Details${parseStents(f("stents")).length > 0 ? ` (${parseStents(f("stents")).length})` : ""}`} />
          <StentsWidget raw={f("stents")} onChange={chg("stents")} />
        </div>
      )}

      {/* Complications */}
      <div>
        <SectionHead label="Complications" />
        <CompMultiSelect value={f("complications")} onChange={chg("complications")} />
      </div>
    </div>
  );
}

// ── Stress Test template ───────────────────────────────────────────

function StressTestForm({ findings, onChange }: {
  findings: Record<string, string>; onChange: (k: string, v: string) => void;
}) {
  const f = (k: string) => findings[k] || "";
  const chg = (k: string) => (v: string) => onChange(k, v);

  const mphrAchieved = (() => {
    const age = parseFloat(f("patient_age") || "0");
    const peakHR = parseFloat(f("peak_hr") || "0");
    if (!age || !peakHR) return null;
    const mphr = 220 - age;
    return Math.round((peakHR / mphr) * 100);
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* Protocol */}
      <div>
        <SectionHead label="Protocol" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Protocol">
            <Select value={f("protocol")} onChange={chg("protocol")} options={["Bruce", "Modified Bruce", "Naughton", "Pharmacological (Dobutamine)", "Pharmacological (Adenosine)"]} />
          </Field>
          <Field label="Duration Completed">
            <TextInput value={f("duration")} onChange={chg("duration")} placeholder="e.g. 8:30" unit="min" />
          </Field>
          <Field label="Reason Stopped">
            <Select value={f("stop_reason")} onChange={chg("stop_reason")} options={["Target HR achieved", "Fatigue", "Angina", "Dyspnoea", "ST changes", "BP drop", "Arrhythmia", "Patient request"]} />
          </Field>
        </div>
      </div>

      {/* HR & BP */}
      <div>
        <SectionHead label="Haemodynamic Response" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Baseline HR"><TextInput value={f("baseline_hr")} onChange={chg("baseline_hr")} placeholder="e.g. 72" unit="bpm" /></Field>
          <Field label="Peak HR"><TextInput value={f("peak_hr")} onChange={chg("peak_hr")} placeholder="e.g. 148" unit="bpm" /></Field>
          <Field label="% MPHR">
            <div className={inputCls + " bg-gray-50 text-gray-600"} style={inputSty}>
              {mphrAchieved !== null ? `${mphrAchieved}%` : "—"}
            </div>
          </Field>
          <Field label="Baseline BP"><TextInput value={f("baseline_bp")} onChange={chg("baseline_bp")} placeholder="e.g. 130/80" unit="mmHg" /></Field>
          <Field label="Peak BP"><TextInput value={f("peak_bp")} onChange={chg("peak_bp")} placeholder="e.g. 180/90" unit="mmHg" /></Field>
        </div>
      </div>

      {/* ECG */}
      <div>
        <SectionHead label="ECG Changes" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="ST Changes">
            <Select value={f("st_changes")} onChange={chg("st_changes")} options={["No ST changes", "ST depression", "ST elevation", "LBBB", "RBBB", "Non-specific"]} />
          </Field>
          {(f("st_changes") === "ST depression" || f("st_changes") === "ST elevation") && (
            <>
              <Field label="Depth / Elevation"><TextInput value={f("st_depth")} onChange={chg("st_depth")} placeholder="e.g. 2" unit="mm" /></Field>
              <Field label="Leads affected"><TextInput value={f("st_leads")} onChange={chg("st_leads")} placeholder="e.g. V4–V6, II, aVF" /></Field>
            </>
          )}
          <Field label="Symptoms during test">
            <Select value={f("symptoms")} onChange={chg("symptoms")} options={["None", "Chest pain (typical)", "Chest pain (atypical)", "Dyspnoea", "Palpitations", "Presyncope"]} />
          </Field>
        </div>
      </div>

      {/* Result */}
      <div>
        <SectionHead label="Result" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test Result">
            <Select value={f("result")} onChange={chg("result")} options={["Negative — no evidence of ischaemia", "Positive — evidence of ischaemia", "Non-diagnostic — inadequate HR", "Non-diagnostic — arrhythmia", "Indeterminate"]} />
          </Field>
          <Field label="Duke Treadmill Score"><TextInput value={f("duke_score")} onChange={chg("duke_score")} placeholder="e.g. +5" /></Field>
        </div>
      </div>
    </div>
  );
}

// ── Holter template ────────────────────────────────────────────────

function HolterForm({ findings, onChange }: {
  findings: Record<string, string>; onChange: (k: string, v: string) => void;
}) {
  const f = (k: string) => findings[k] || "";
  const chg = (k: string) => (v: string) => onChange(k, v);

  return (
    <div className="flex flex-col gap-5">
      {/* Setup */}
      <div>
        <SectionHead label="Monitor Details" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration">
            <Select value={f("duration")} onChange={chg("duration")} options={["24 hours", "48 hours", "7 days", "14 days"]} />
          </Field>
          <Field label="Quality">
            <Select value={f("quality")} onChange={chg("quality")} options={["Good — full recording", "Adequate — minor artefact", "Poor — significant artefact"]} />
          </Field>
        </div>
      </div>

      {/* Rhythm */}
      <div>
        <SectionHead label="Rhythm" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dominant Rhythm">
            <Select value={f("dominant_rhythm")} onChange={chg("dominant_rhythm")} options={["Sinus rhythm", "Atrial fibrillation", "Atrial flutter", "Ectopic atrial rhythm", "Paced rhythm"]} />
          </Field>
          {f("dominant_rhythm") === "Atrial fibrillation" && (
            <Field label="AF Burden"><TextInput value={f("af_burden")} onChange={chg("af_burden")} placeholder="e.g. 78" unit="%" /></Field>
          )}
          <Field label="Min HR"><TextInput value={f("hr_min")} onChange={chg("hr_min")} placeholder="e.g. 48" unit="bpm" /></Field>
          <Field label="Max HR"><TextInput value={f("hr_max")} onChange={chg("hr_max")} placeholder="e.g. 138" unit="bpm" /></Field>
          <Field label="Mean HR"><TextInput value={f("hr_mean")} onChange={chg("hr_mean")} placeholder="e.g. 74" unit="bpm" /></Field>
        </div>
      </div>

      {/* Ectopics */}
      <div>
        <SectionHead label="Ectopics & Arrhythmias" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="VPCs (total)"><TextInput value={f("vpc_total")} onChange={chg("vpc_total")} placeholder="e.g. 1240" /></Field>
          <Field label="VPC burden"><TextInput value={f("vpc_burden")} onChange={chg("vpc_burden")} placeholder="e.g. 2.1" unit="%" /></Field>
          <Field label="Couplets"><TextInput value={f("couplets")} onChange={chg("couplets")} placeholder="e.g. 12" /></Field>
          <Field label="VT runs">
            <Select value={f("vt_runs")} onChange={chg("vt_runs")} options={["None", "NSVT (< 30s)", "Sustained VT (≥ 30s)"]} />
          </Field>
          <Field label="SVT episodes">
            <Select value={f("svt")} onChange={chg("svt")} options={["None", "Isolated SVPCs", "SVT runs"]} />
          </Field>
          <Field label="Longest Pause"><TextInput value={f("longest_pause")} onChange={chg("longest_pause")} placeholder="e.g. 2.1" unit="sec" /></Field>
        </div>
      </div>

      {/* Conduction */}
      <div>
        <SectionHead label="Conduction" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="AV Block">
            <Select value={f("av_block")} onChange={chg("av_block")} options={["None", "1st degree AV block", "2nd degree — Mobitz I (Wenckebach)", "2nd degree — Mobitz II", "3rd degree (complete heart block)"]} />
          </Field>
          <Field label="Bundle Branch Block">
            <Select value={f("bbb")} onChange={chg("bbb")} options={["None", "LBBB (persistent)", "RBBB (persistent)", "LBBB (rate-related)", "RBBB (rate-related)"]} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── ICD row ────────────────────────────────────────────────────────

function IcdRow({ code, description, onRemove }: { code: string; description: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px dashed #ececea" }}>
      <span className="text-[11px] font-mono font-bold text-[#e11d48] w-16 shrink-0">{code}</span>
      <span className="flex-1 text-[11px] text-gray-700 truncate">{description}</span>
      <button onClick={onRemove} className="text-gray-300 hover:text-red-400 cursor-pointer shrink-0 text-base leading-none">×</button>
    </div>
  );
}

// ── Dictation widget (live Deepgram) ───────────────────────────────

function DictationWidget({ value, onValue }: { value: string; onValue: (next: string) => void }) {
  const { recording, error, toggle } = useLiveAppend(value, onValue, "\n");
  return (
    <div className="flex flex-col items-end">
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
          recording
            ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-[#ffe4e6] text-[#9f1239] hover:bg-[#fecdd3]"
        }`}
      >
        {recording ? (
          <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" /> Stop</>
        ) : (
          <><Icon d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" d2="M19 10v2a7 7 0 01-14 0v-2" size={11} /> Dictate</>
        )}
      </button>
      {error && <p className="text-[9px] text-red-500 mt-1 max-w-[180px] text-right">{error}</p>}
    </div>
  );
}

// ── Echo US Image Viewer ───────────────────────────────────────────

function EchoImageViewer({ dicomWebBase, studyUid }: { dicomWebBase: string; studyUid: string }) {
  const [frames, setFrames] = useState<{ seriesDesc: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dicomWebBase || !studyUid) return;
    const auth = "Basic " + btoa("orthanc:orthanc");

    fetch(`${dicomWebBase}/studies/${studyUid}/series`, {
      headers: { Authorization: auth, Accept: "application/dicom+json" },
    })
      .then(r => r.ok ? r.json() : [])
      .then(async (seriesList: Record<string, { Value: unknown[] }>[]) => {
        const collected: { seriesDesc: string; url: string }[] = [];
        for (const s of seriesList) {
          const modality = String((s["00080060"]?.Value ?? [""])[0] ?? "");
          if (modality !== "US") continue;
          const seriesUid = String((s["0020000E"]?.Value ?? [""])[0] ?? "");
          const desc = String((s["0008103E"]?.Value ?? ["Echo sequence"])[0] ?? "Echo sequence");
          if (!seriesUid) continue;

          const instResp = await fetch(
            `${dicomWebBase}/studies/${studyUid}/series/${seriesUid}/instances`,
            { headers: { Authorization: auth, Accept: "application/dicom+json" } },
          );
          if (!instResp.ok) continue;
          const instances: Record<string, { Value: unknown[] }>[] = await instResp.json();
          if (!instances.length) continue;
          const sopUid = String((instances[0]["00080018"]?.Value ?? [""])[0] ?? "");
          if (!sopUid) continue;

          collected.push({
            seriesDesc: desc,
            url: `${dicomWebBase}/studies/${studyUid}/series/${seriesUid}/instances/${sopUid}/rendered`,
          });
          if (collected.length >= 4) break;
        }
        setFrames(collected);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dicomWebBase, studyUid]);

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
      <div className="w-3 h-3 border-2 border-gray-300 border-t-[#e11d48] rounded-full animate-spin" />
      Loading echo images from PACS…
    </div>
  );
  if (!frames.length) return null;

  return (
    <div className="mt-4">
      <SectionHead label="Echo Images (from PACS)" />
      <div className="flex gap-3 flex-wrap mt-2">
        {frames.map((f, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-medium">{f.seriesDesc}</span>
            <img
              src={f.url + "?accept=image/jpeg"}
              alt={f.seriesDesc}
              className="rounded-lg object-cover"
              style={{ width: 180, height: 140, border: "1.5px solid #d4d4d2", background: "#111" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PACS Import Modal ──────────────────────────────────────────────

const DEFAULT_PACS = "http://31.97.63.234:8042/dicom-web";

interface PACSStudy {
  study_uid: string;
  patient_id: string;
  patient_name: string;
  study_date: string;
  study_description: string;
  accession_number: string;
  modalities: string;
  num_series: string;
}

function PACSImportModal({
  template,
  onImport,
  onClose,
}: {
  template: string;
  onImport: (findings: Record<string, string>, fieldsFound: string[], pacsUrl: string, studyUid: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"pacs" | "upload">("pacs");
  const [pacsUrl, setPacsUrl] = useState(DEFAULT_PACS);
  const [username, setUsername] = useState("orthanc");
  const [password, setPassword] = useState("orthanc");
  const [patientId, setPatientId] = useState("");
  const [accession, setAccession] = useState("");
  const [studies, setStudies] = useState<PACSStudy[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const search = async () => {
    if (!patientId.trim() && !accession.trim()) {
      setError("Enter a Patient ID or Accession Number to search");
      return;
    }
    setSearching(true); setError(""); setStudies([]);
    try {
      const res = await api.pacsSearch({
        wado_base: pacsUrl,
        patient_id: patientId.trim() || undefined,
        accession_number: accession.trim() || undefined,
        username,
        password,
      });
      if (!Array.isArray(res)) throw new Error("Unexpected response from PACS");
      setStudies(res);
      if (res.length === 0) setError("No studies found — try a different Patient ID or Accession Number");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PACS search failed");
    } finally {
      setSearching(false);
    }
  };

  const importStudy = async (studyUid: string) => {
    setImporting(true); setError("");
    try {
      const res = await api.pacsImport({ wado_base: pacsUrl, study_uid: studyUid, template, username, password });
      if (!res.ok) throw new Error("Import failed");
      if (res.fields_found.length === 0) {
        setError("Study found but no structured measurements extracted. The DICOM SR may use a different format.");
        return;
      }
      onImport(res.findings, res.fields_found, pacsUrl, studyUid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const uploadDicom = async () => {
    if (!uploadFile) { setError("Select a DICOM file first"); return; }
    setImporting(true); setError("");
    try {
      const res = await api.pacsUpload(uploadFile, template);
      if (res.fields_found.length === 0) {
        setError("File parsed but no structured measurements found. Ensure this is a DICOM SR file.");
        return;
      }
      onImport(res.findings, res.fields_found, "", "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setImporting(false);
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    lv_ef: "EF (%)", lvedd: "LVIDd (mm)", lvesd: "LVIDs (mm)",
    ivsd: "IVSd (mm)", rvsp: "RVSP (mmHg)", la_diam: "LA Diameter (mm)",
    ao_root: "Aortic Root (mm)", lvedp: "LVEDP (mmHg)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ border: "1.5px solid #1a1a1a", maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div>
            <h2 className="font-semibold text-sm text-gray-900">Import from PACS</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Auto-fill {template === "echo" ? "echo" : "cath"} measurements from DICOM SR</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none cursor-pointer">×</button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          {(["pacs", "upload"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setStudies([]); }}
              className="flex-1 py-2.5 text-xs font-medium cursor-pointer transition"
              style={{
                color: tab === t ? "#e11d48" : "#6b7280",
                borderBottom: tab === t ? "2px solid #e11d48" : "2px solid transparent",
              }}
            >
              {t === "pacs" ? "Search PACS" : "Upload DICOM File"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 flex flex-col gap-4">
          {tab === "pacs" ? (
            <>
              {/* PACS URL */}
              <div>
                <label className={labelCls}>PACS DICOMweb URL</label>
                <input value={pacsUrl} onChange={e => setPacsUrl(e.target.value)} className={inputCls} style={inputSty} placeholder="http://pacs.hospital.local:8042/dicom-web" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} style={inputSty} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Patient ID</label>
                  <input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="e.g. PT-0042" className={inputCls} style={inputSty} onKeyDown={e => e.key === "Enter" && search()} />
                </div>
                <div>
                  <label className={labelCls}>Accession Number</label>
                  <input value={accession} onChange={e => setAccession(e.target.value)} placeholder="e.g. ACC-2024-001" className={inputCls} style={inputSty} onKeyDown={e => e.key === "Enter" && search()} />
                </div>
              </div>
              <button
                onClick={search}
                disabled={searching}
                className="w-full py-2 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition"
                style={{ background: "#e11d48", color: "white" }}
              >
                {searching ? "Searching PACS…" : "Search"}
              </button>

              {/* Results */}
              {studies.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{studies.length} stud{studies.length === 1 ? "y" : "ies"} found</p>
                  {studies.map(s => (
                    <div key={s.study_uid} className="rounded-xl p-3 flex items-start justify-between gap-3" style={{ border: "1.5px solid #d4d4d2" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{s.study_description || "No description"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {s.patient_name && <span className="mr-2">{s.patient_name}</span>}
                          {s.study_date && <span className="mr-2">{s.study_date}</span>}
                          {s.modalities && <span className="uppercase">{s.modalities}</span>}
                        </p>
                        <p className="text-[9px] text-gray-300 font-mono mt-0.5 truncate">{s.study_uid}</p>
                      </div>
                      <button
                        onClick={() => importStudy(s.study_uid)}
                        disabled={importing}
                        className="shrink-0 px-3 py-1.5 text-[11px] font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition"
                        style={{ background: "#ffe4e6", color: "#9f1239" }}
                      >
                        {importing ? "…" : "Import"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer"
                style={{ border: "2px dashed #d4d4d2", minHeight: 140 }}
                onClick={() => document.getElementById("dicom-file-input")?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4d4d2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                {uploadFile ? (
                  <p className="text-xs font-semibold text-gray-700">{uploadFile.name}</p>
                ) : (
                  <p className="text-xs text-gray-400">Drop DICOM SR file here or click to browse</p>
                )}
                <input id="dicom-file-input" type="file" accept=".dcm,.dicom" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
              </div>
              <p className="text-[10px] text-gray-400">Accepts .dcm DICOM Structured Report files exported from the echo machine or PACS</p>
              <button
                onClick={uploadDicom}
                disabled={!uploadFile || importing}
                className="w-full py-2 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition"
                style={{ background: "#e11d48", color: "white" }}
              >
                {importing ? "Parsing DICOM…" : "Extract & Import"}
              </button>
            </>
          )}

          {error && <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ── TEMPLATE_LABELS ────────────────────────────────────────────────

const TEMPLATE_META: Record<string, { label: string; color: string; bg: string }> = {
  echo:        { label: "Echocardiogram", color: "#e11d48", bg: "#ffe4e6" },
  cath:        { label: "Coronary Angiogram", color: "#EF4444", bg: "#FEE2E2" },
  stress_test: { label: "Stress Test (TMT)", color: "#F59E0B", bg: "#FEF3C7" },
  holter:      { label: "Holter Monitor", color: "#8B5CF6", bg: "#EDE9FE" },
};

// ── Main ──────────────────────────────────────────────────────────

export default function EchoReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;

  const [data, setData] = useState<ReportData | null>(null);
  const [findings, setFindings] = useState<Record<string, string>>({});
  const [impression, setImpression] = useState("");
  const [icdCodes, setIcdCodes] = useState<{ code: string; description: string }[]>([]);
  const [newIcd, setNewIcd] = useState({ code: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [error, setError] = useState("");
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showPACSModal, setShowPACSModal] = useState(false);
  const [pacsStudyUrl, setPacsStudyUrl] = useState<string | null>(null);
  const [pacsImportMeta, setPacsImportMeta] = useState<{ base: string; studyUid: string } | null>(null);

  // Autosave timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignPatient = async (patientId: string | null) => {
    setShowPatientModal(false);
    try {
      const res = await api.setEchoReportPatient(reportId, patientId);
      setData(d => d ? { ...d, patient_id: res.patient_id, patient_display: res.patient_display } : d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign patient");
    }
  };

  useEffect(() => {
    api.getEchoReport(reportId).then(async d => {
      setData(d);
      const f = d.findings || {};
      setFindings(f);
      setImpression(d.impression || "");
      setIcdCodes(d.icd_codes || []);
      if (d.status === "final") setFinalized(true);

      // Restore persisted PACS link
      if (f._pacs_study_url) {
        setPacsStudyUrl(f._pacs_study_url as string);
        if (f._pacs_dicomweb_base && f._pacs_study_uid) {
          setPacsImportMeta({ base: f._pacs_dicomweb_base as string, studyUid: f._pacs_study_uid as string });
        }
      } else if (d.patient_id) {
        // Auto-search PACS via backend proxy to build View in PACS link
        try {
          const pacsBase = DEFAULT_PACS;
          const studies = await api.pacsSearch({
            wado_base: pacsBase,
            patient_id: d.patient_id,
            username: "orthanc",
            password: "orthanc",
          });
          if (Array.isArray(studies) && studies.length > 0 && studies[0].study_uid) {
            const uid = studies[0].study_uid;
            const base = pacsBase.replace("/dicom-web", "");
            setPacsStudyUrl(`${base}/ui/app/#/viewer?StudyInstanceUIDs=${uid}`);
            setPacsImportMeta({ base: pacsBase, studyUid: uid });
          }
        } catch { /* PACS not reachable — silently skip */ }
      }
    }).catch(() => setError("Report not found"))
      .finally(() => setLoading(false));
  }, [reportId]);

  const updateFinding = useCallback((key: string, val: string) => {
    setFindings(f => {
      const next = { ...f, [key]: val };
      // Debounced autosave
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.saveEchoReport(reportId, next as Record<string, unknown>).catch(() => {});
      }, 1500);
      return next;
    });
  }, [reportId]);

  const save = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    try {
      await api.saveEchoReport(reportId, findings as Record<string, unknown>, impression, icdCodes);
    } catch { setError("Save failed"); }
    finally { setSaving(false); }
  };

  const generateImpression = async () => {
    await save();
    setGenerating(true); setError("");
    try {
      const res = await api.generateEchoImpression(reportId);
      // Backend returns the full merged findings — replace local state so any
      // dropdowns/numbers the AI extracted from the dictation appear in the form.
      if (res.findings && typeof res.findings === "object") {
        setFindings(res.findings as Record<string, string>);
      }
      if (res.impression) setImpression(res.impression);
      if (res.icd_codes) setIcdCodes(res.icd_codes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed — check the backend logs.");
    }
    finally { setGenerating(false); }
  };

  const finalize = async () => {
    if (!impression.trim()) { setError("Add an impression before finalizing"); return; }
    setFinalizing(true); setError("");
    try {
      await api.finalizeEchoReport(reportId, findings as Record<string, unknown>, impression, icdCodes);
      setFinalized(true);
      setTimeout(() => router.push("/dashboard/echo"), 1200);
    } catch { setError("Finalize failed"); setFinalizing(false); }
  };

  const meta = data ? (TEMPLATE_META[data.template] || TEMPLATE_META.echo) : TEMPLATE_META.echo;

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading report…</div>;
  }
  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">Report not found</p>
        <button onClick={() => router.push("/dashboard/echo")} className="text-xs text-[#e11d48] hover:underline cursor-pointer">← Back</button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: structured findings */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-[72px] bg-white sticky top-0 z-10" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard/echo")} className="text-gray-400 hover:text-gray-700 cursor-pointer">
              <Icon d="M15 18l-6-6 6-6" size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
                {finalized && (
                  <span className="text-[10px] font-medium bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full">Final</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {finalized ? (
                  <span>{data.patient_display || data.patient_id || "Anonymous"}</span>
                ) : (
                  <button
                    onClick={() => setShowPatientModal(true)}
                    className="text-[#e11d48] font-medium hover:underline cursor-pointer"
                  >
                    {data.patient_display || data.patient_id || "+ Assign patient"}
                  </button>
                )}
                {" · "}{reportId.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(data.template === "echo" || data.template === "cath") && !finalized && (
              <button
                onClick={() => setShowPACSModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition"
                style={{ border: "1.5px solid #e11d48", color: "#e11d48" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                Import from PACS
              </button>
            )}
            {pacsStudyUrl && (
              <a
                href={pacsStudyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                style={{ border: "1.5px solid #10B981", color: "#10B981" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                View in PACS
              </a>
            )}
            {!finalized && (
              <button
                onClick={save}
                disabled={saving}
                className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>
            )}
            <button
              onClick={finalize}
              disabled={finalizing || finalized}
              className="flex items-center gap-2 bg-[#10B981] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#059669] transition cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0 #047857" }}
            >
              {finalized ? "Finalized ✓" : finalizing ? "Finalizing…" : (
                <><Icon d="M20 6L9 17l-5-5" size={12} /> Finalize Report</>
              )}
            </button>
          </div>
        </div>

        {error && <div className="mx-5 mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>}

        <div className="p-5">
          {data.template === "echo" && (
            <>
              <EchoForm findings={findings} onChange={updateFinding} />
              {pacsImportMeta && (
                <EchoImageViewer dicomWebBase={pacsImportMeta.base} studyUid={pacsImportMeta.studyUid} />
              )}
            </>
          )}
          {data.template === "cath" && <CathForm findings={findings} onChange={updateFinding} />}
          {data.template === "stress_test" && <StressTestForm findings={findings} onChange={updateFinding} />}
          {data.template === "holter" && <HolterForm findings={findings} onChange={updateFinding} />}
        </div>
      </div>

      {/* Right: impression + ICD */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden bg-white" style={{ borderLeft: "1.5px solid #1a1a1a" }}>
        {/* Impression */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px dashed #d4d4d2" }}>
          <h3 className="font-hand text-base font-bold text-gray-900">Impression</h3>
          <DictationWidget value={impression} onValue={setImpression} />
        </div>

        <div className="px-4 py-3 flex-1 flex flex-col gap-3 overflow-auto">
          <textarea
            value={impression}
            onChange={e => setImpression(e.target.value)}
            placeholder="Type impression here, or dictate it using the mic button above, or click Generate below…"
            className="w-full text-xs text-gray-700 leading-relaxed outline-none resize-none bg-white flex-1"
            style={{ minHeight: 160 }}
          />

          <button
            onClick={generateImpression}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg border transition cursor-pointer disabled:opacity-50"
            style={{ border: "1.5px solid #e11d48", color: "#e11d48" }}
          >
            {generating ? (
              <><div className="w-3 h-3 border-2 border-[#e11d48] border-t-transparent rounded-full animate-spin shrink-0" /> Generating…</>
            ) : (
              <><Icon d="M12 2L2 7l10 5 10-5-10-5z" d2="M2 17l10 5 10-5M2 12l10 5 10-5" size={12} /> Generate via AI</>
            )}
          </button>
        </div>

        {/* ICD-10 */}
        <div style={{ borderTop: "1px dashed #d4d4d2" }}>
          <div className="px-4 py-2.5 flex items-center justify-between">
            <h3 className="font-hand text-sm font-bold text-gray-900">ICD-10 Codes</h3>
            <span className="text-[10px] text-gray-400">{icdCodes.length}</span>
          </div>
          <div className="px-4 pb-1">
            {icdCodes.length === 0 && (
              <p className="text-[10px] text-gray-400 pb-2">Generated with impression</p>
            )}
            {icdCodes.map((ic, i) => (
              <IcdRow
                key={i}
                code={ic.code}
                description={ic.description}
                onRemove={() => setIcdCodes(arr => arr.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <div className="px-4 py-2 flex gap-1.5" style={{ borderTop: "1px dashed #d4d4d2" }}>
            <input
              value={newIcd.code}
              onChange={e => setNewIcd(n => ({ ...n, code: e.target.value }))}
              placeholder="I25.10"
              className="w-20 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#e11d48] font-mono"
              style={{ border: "1.5px solid #d4d4d2" }}
            />
            <input
              value={newIcd.description}
              onChange={e => setNewIcd(n => ({ ...n, description: e.target.value }))}
              placeholder="Description"
              className="flex-1 px-2 py-1 text-[11px] rounded-lg outline-none focus:ring-1 focus:ring-[#e11d48]"
              style={{ border: "1.5px solid #d4d4d2" }}
            />
            <button
              onClick={() => {
                if (!newIcd.code.trim()) return;
                setIcdCodes(arr => [...arr, newIcd]);
                setNewIcd({ code: "", description: "" });
              }}
              className="px-2 py-1 text-[11px] bg-[#ffe4e6] text-[#9f1239] rounded-lg hover:bg-[#fecdd3] cursor-pointer font-medium"
            >+</button>
          </div>
        </div>
      </div>

      {showPatientModal && (
        <PatientSearchModal
          title="Assign patient to this report"
          onSelect={assignPatient}
          onClose={() => setShowPatientModal(false)}
        />
      )}

      {showPACSModal && data && (
        <PACSImportModal
          template={data.template}
          onImport={(pacsFindings, fieldsFound, pacsUrl, studyUid) => {
            setShowPACSModal(false);
            const base = pacsUrl.replace("/dicom-web", "");
            const viewerUrl = `${base}/ui/app/#/viewer?StudyInstanceUIDs=${studyUid}`;
            setPacsStudyUrl(viewerUrl);
            if (pacsUrl && studyUid) setPacsImportMeta({ base: pacsUrl, studyUid });
            setFindings(prev => {
              const merged = { ...prev };
              for (const [k, v] of Object.entries(pacsFindings)) {
                if (!merged[k]) merged[k] = v as string;
              }
              // Persist PACS link so it survives reload
              merged._pacs_study_url = viewerUrl;
              merged._pacs_dicomweb_base = pacsUrl;
              merged._pacs_study_uid = studyUid;
              api.saveEchoReport(reportId, merged as Record<string, unknown>).catch(() => {});
              return merged;
            });
          }}
          onClose={() => setShowPACSModal(false)}
        />
      )}
    </div>
  );
}
