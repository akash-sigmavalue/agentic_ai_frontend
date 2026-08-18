import { useState, useEffect } from "react";
import {
  Zap,
  MapPin,
  Search,
  FileSearch,
  Database,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  SlidersHorizontal,
  CheckCircle,
  Loader2
} from "lucide-react";
import {
  QUICK_FIELD_CONFIG,
  QUICK_REQUIRED_FIELDS,
  QUICK_OPTIONAL_FIELDS
} from "../chat-utils";

const QUICK_ESTIMATE_PIPELINE_STAGES = [
  { id: "geocoding", label: "Location", desc: "Resolve coordinates for the subject property", icon: MapPin, events: ["geocoding", "geocoding_done"] },
  { id: "comparables", label: "Comparables", desc: "Search internal database and the web", icon: Search, events: ["comparables", "comparables_web", "comparables_done"] },
  { id: "listings", label: "Listings", desc: "Fetch live sale listings", icon: FileSearch, events: ["listings"] },
  { id: "transactions", label: "Transactions", desc: "Pull internal transaction evidence", icon: Database, events: ["transactions"] },
  { id: "cleaning", label: "Cleaning", desc: "Normalize prices, areas, and duplicates", icon: Sparkles, events: ["cleaning"] },
  { id: "factorial", label: "Rate Table", desc: "Build statistical rate baseline", icon: TrendingUp, events: ["factorial"] },
  { id: "factoring", label: "Valuation", desc: "Reconcile final subject rate", icon: ShieldCheck, events: ["factoring"] },
  { id: "cost", label: "Cost Approach", desc: "Apply depreciated replacement cost", icon: SlidersHorizontal, events: ["cost"], optional: true },
  { id: "complete", label: "Complete", desc: "Prepare valuation report", icon: CheckCircle, events: ["complete"] },
];

const QUICK_ESTIMATE_STAGE_EVENT_MAP = QUICK_ESTIMATE_PIPELINE_STAGES.reduce((acc, stage, index) => {
  stage.events.forEach((eventName) => {
    acc[eventName] = index;
  });
  return acc;
}, {});

export function getQuickEstimateStages(includeCost) {
  return QUICK_ESTIMATE_PIPELINE_STAGES.filter((stage) => !stage.optional || includeCost);
}

export function resolveQuickEstimateStageIndex(stageName, includeCost) {
  const stages = getQuickEstimateStages(includeCost);
  const globalIndex = QUICK_ESTIMATE_STAGE_EVENT_MAP[stageName];
  if (globalIndex === undefined) return 0;
  const stageId = QUICK_ESTIMATE_PIPELINE_STAGES[globalIndex]?.id;
  const localIndex = stages.findIndex((stage) => stage.id === stageId);
  return localIndex >= 0 ? localIndex : 0;
}

function formatElapsedTime(startedAt) {
  if (!startedAt) return "0s";
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

export function QuickEstimateProgressPanel({ progress, includeCost, propertyLabel, locationLabel }) {
  const stages = getQuickEstimateStages(includeCost);
  const activeIndex = Math.min(progress.activeIndex ?? 0, stages.length - 1);
  const progressPct = stages.length > 1
    ? Math.round((Math.max(0, activeIndex) / (stages.length - 1)) * 100)
    : 0;
  const [elapsed, setElapsed] = useState(() => formatElapsedTime(progress.startedAt));

  useEffect(() => {
    if (!progress.startedAt) return undefined;
    setElapsed(formatElapsedTime(progress.startedAt));
    const timer = setInterval(() => {
      setElapsed(formatElapsedTime(progress.startedAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [progress.startedAt]);

  const detailChips = [];
  if (progress.detail?.lat && progress.detail?.lng) {
    detailChips.push(`Coords ${Number(progress.detail.lat).toFixed(4)}, ${Number(progress.detail.lng).toFixed(4)}`);
  }

  const selectedComparables = Array.isArray(progress.detail?.comparables) ? progress.detail.comparables : [];

  return (
    <div className="mr-8 overflow-hidden rounded-2xl border border-accent/25 bg-bg-card/95 shadow-panel animate-in slide-in-from-bottom-2 duration-300">
      <div className="border-b border-accent/15 bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(168,85,247,0.08))] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
              <Zap className="h-5 w-5 text-accent" />
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
                AI Quick Estimate Running
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {propertyLabel} · {locationLabel}
              </p>
            </div>
          </div>
          <div className="rounded-full border border-accent/20 bg-bg-input/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-accent">
            {elapsed}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-text-dim">
            <span>Valuation Pipeline progress</span>
            <span className="text-accent">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/30">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-purple))] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(56,189,248,0.35)]"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid gap-2">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isComplete = index < activeIndex || (stage.id === "complete" && progress.done);
            const isActive = index === activeIndex && !progress.done;

            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${isActive
                  ? "border-accent/35 bg-accent/10 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]"
                  : isComplete
                    ? "border-success/20 bg-success/5"
                    : "border-border/40 bg-bg-input/40 opacity-70"
                  }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isActive
                    ? "border-accent/30 bg-accent/15 text-accent"
                    : isComplete
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border/50 bg-bg-card text-text-dim"
                    }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <p className={`text-[11px] font-bold uppercase tracking-[0.04em] ${isActive ? "text-accent" : isComplete ? "text-success" : "text-text-dim"
                        }`}>
                        {stage.label}
                      </p>
                      {isActive && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent animate-pulse">
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                    {isActive && progress.message ? progress.message : stage.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Selected Comparables Card List ───────────────────────── */}
        {selectedComparables.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-accent/20 bg-bg-input/40 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="flex items-center gap-2 border-b border-accent/15 bg-accent/5 px-3.5 py-2">
              <span className="text-accent text-[10px]">◈</span>
              <p className="text-[9px] font-black uppercase tracking-[0.05em] text-accent">
                Selected Comparables
              </p>
              <span className="ml-auto rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[8px] font-bold text-accent">
                {selectedComparables.length} found
              </span>
            </div>
            <div className="divide-y divide-border/30">
              {selectedComparables.map((comp, idx) => {
                const src = (comp.data_source || "").trim();
                const isWeb = src.toLowerCase() === "web";
                const isDb = src.toLowerCase().includes("internal") || src.toLowerCase() === "transaction";
                const sourceBadgeClass = isWeb
                  ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                  : isDb
                    ? "border-violet-400/30 bg-violet-400/10 text-violet-300"
                    : "border-border/40 bg-bg-card/60 text-text-dim";
                const sourceIcon = isWeb ? "🌐" : isDb ? "🗄️" : "📁";
                const sourceLabel = isWeb ? "Agent Web Search" : isDb ? "Transaction DB" : (src || "Unknown");
                const reason = comp.confidence_reasoning || comp.reason || "";
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-1.5 px-3.5 py-2.5 hover:bg-accent/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-1 truncate text-[11px] font-semibold text-text-primary leading-tight">
                        {comp.project_name || "—"}
                      </span>
                      <span className={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${sourceBadgeClass}`}>
                        {sourceIcon} {sourceLabel}
                      </span>
                    </div>
                    {reason && (
                      <p className="text-[10px] leading-relaxed text-text-dim line-clamp-2">
                        {reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(progress.message || detailChips.length > 0) && (
          <div className="rounded-xl border border-border/50 bg-bg-input/60 px-3.5 py-3">
            {progress.message && (
              <p className="text-xs leading-relaxed text-text-primary">{progress.message}</p>
            )}
            {detailChips.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${progress.message ? "mt-2.5" : ""}`}>
                {detailChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-text-dim">
          This usually takes 1–3 minutes depending on listing availability and comparable coverage.
        </p>
      </div>
    </div>
  );
}

export default function QuickEstimatePanel({ values, onChange, onSubmit, disabled }) {
  const propertyType = values.property_type || "apartment";
  const requiredFields = QUICK_REQUIRED_FIELDS[propertyType] || QUICK_REQUIRED_FIELDS.apartment;
  const optionalFields = QUICK_OPTIONAL_FIELDS[propertyType] || [];
  const fields = [...requiredFields, ...optionalFields].filter((field, index, arr) => arr.indexOf(field) === index);
  const isCostCapable = propertyType === "villa" || propertyType === "building_land";

  const updateField = (field, value) => {
    const next = { ...values, [field]: value };
    if (field === "property_type") {
      next.recommended_approach = value === "building_land" ? "cost" : "market";
    }
    onChange(next);
  };

  const missingRequired = requiredFields.filter((field) => {
    const value = values[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  const renderField = (field) => {
    const config = QUICK_FIELD_CONFIG[field];
    if (!config) return null;
    const isRequired = requiredFields.includes(field);

    return (
      <label key={field} className="flex min-w-[145px] flex-1 flex-col gap-1.5">
        <span className="pl-1 text-[9px] font-bold uppercase tracking-[0.05em] text-text-dim">
          {config.label}{isRequired ? " *" : ""}
        </span>
        {config.type === "select" ? (
          <select
            value={values[field] ?? ""}
            onChange={(event) => updateField(field, event.target.value)}
            className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs text-text-primary outline-none transition focus:border-accent focus:bg-accent/5"
          >
            {(config.options || []).map((option) => (
              <option key={option} value={option} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={config.type}
            value={values[field] ?? ""}
            onChange={(event) => updateField(field, event.target.value)}
            placeholder={config.placeholder}
            className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs text-text-primary outline-none transition placeholder:text-text-dim focus:border-accent focus:bg-accent/5"
          />
        )}
      </label>
    );
  };

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-accent/25 bg-bg-card/95 text-left shadow-panel md:max-h-[calc(100dvh-4rem)]">
      <div className="shrink-0 border-b border-accent/15 bg-accent/5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">AI Quick Estimate</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Enter the subject details once and get a direct valuation result.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-accent">
            Research Mode
          </div>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        <div className="rounded-2xl border border-border/70 bg-bg-deep/30 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.05em] text-accent">Property Information</p>
              <p className="mt-1 text-[11px] text-text-dim">Start with the identity fields, then add the remaining details.</p>
            </div>
            <div className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-accent">
              Step 1 First
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['project_name', 'location_name', 'city_name', 'country'].map(renderField)}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="pl-1 text-[9px] font-bold uppercase tracking-[0.05em] text-text-dim">Property Type</span>
            <select
              value={propertyType}
              onChange={(event) => updateField("property_type", event.target.value)}
              className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs text-text-primary outline-none transition focus:border-accent focus:bg-accent/5"
            >
              <option value="apartment" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Apartment</option>
              <option value="villa" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Villa</option>
              <option value="plot" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Plot</option>
              <option value="retail" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Retail</option>
              <option value="commercial_office" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Commercial Office</option>
              <option value="building_land" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Building + Land</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="pl-1 text-[9px] font-bold uppercase tracking-[0.05em] text-text-dim">Approach</span>
            <select
              value={values.recommended_approach}
              onChange={(event) => updateField("recommended_approach", event.target.value)}
              disabled={!isCostCapable && values.recommended_approach === "market"}
              className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs text-text-primary outline-none transition focus:border-accent focus:bg-accent/5 disabled:opacity-70"
            >
              <option value="market" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Market Approach</option>
              {isCostCapable && <option value="cost" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>Cost Approach</option>}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          {fields.filter((field) => !['project_name', 'location_name', 'city_name', 'country'].includes(field)).map(renderField)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
          <p className="text-[10px] leading-relaxed text-text-dim">
            Uses comparables, listings, transactions, cleaning, and factoring.
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || missingRequired.length > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Zap className="h-4 w-4" />
            Get Valuation
          </button>
        </div>
      </div>
    </div>
  );
}
