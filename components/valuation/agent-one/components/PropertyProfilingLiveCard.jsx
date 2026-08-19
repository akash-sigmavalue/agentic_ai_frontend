import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function PropertyProfilingLiveCard({ streamingNote, isStreaming }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-slate-950/90 shadow-xl overflow-hidden backdrop-blur-md my-1 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.05em] text-slate-400 ml-1">
            Stage 1 • Property Profiling Status
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          {isStreaming ? "Processing" : "Complete"}
        </span>
      </div>
      <div className="p-4 font-mono text-[11px] leading-relaxed">
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-bold text-cyan-400">›</span>
          <span className="text-slate-300 font-semibold break-words">
            {streamingNote || "Running property profiling..."}
          </span>
          <span className="animate-pulse text-emerald-400">█</span>
        </div>
      </div>
    </div>
  );
}

export const STAGE_PROFILING_TITLE = "Stage 1 - Property Profiling";
export const STAGE_DETAIL_FIELDS = [
  { key: "project_name", label: "Project Name" },
  { key: "location_name", label: "Location Name" },
  { key: "city_name", label: "City Name" },
  { key: "country", label: "Country" },
  { key: "property_type", label: "Property Type" },
  { key: "approach", label: "Approach" },
  { key: "lat", label: "Lat" },
  { key: "lng", label: "Lng" },
  { key: "coordinates", label: "Coordinates" },
  { key: "subject_floor", label: "Subject Floor" },
  { key: "total_floors", label: "Total Floors" },
  { key: "facing", label: "Facing" },
  { key: "salable_area_sqft", label: "Salable Area Sqft" },
  { key: "age_years", label: "Age Years" },
  { key: "extraction_verified", label: "Extraction Verified" },
  { key: "coordinates_confirmed", label: "Coordinates Confirmed" },
];

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseStageDetailMessage = (content) => {
  if (typeof content !== "string") return null;

  const text = content.trim();
  if (!text.includes(":")) return null;

  const rawApproach = text.match(/\bUse\s+(market|cost|income|residual)\s+approach\b/i)?.[0] || "";
  const values = {};
  const markers = STAGE_DETAIL_FIELDS
    .filter(({ label }) => text.toLowerCase().includes(`${label.toLowerCase()}:`))
    .map(({ key, label }) => {
      const match = text.match(new RegExp(`${escapeRegExp(label)}:\\s*`, "i"));
      return match ? { key, label, index: match.index, start: match.index + match[0].length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  if (markers.length < 4) return null;

  markers.forEach((marker, idx) => {
    const next = markers[idx + 1];
    let raw = text.slice(marker.start, next ? next.index : text.length).trim();
    raw = raw.replace(/,\s*$/, "").replace(/^,\s*/, "");
    if (rawApproach && raw.includes(rawApproach)) {
      raw = raw.replace(new RegExp(`,?\\s*${escapeRegExp(rawApproach)}`, "i"), "").trim();
    }
    values[marker.key] = raw;
  });

  if (rawApproach) {
    values.approach = rawApproach.replace(/^Use\s+/i, "").replace(/\s+approach$/i, "").trim();
  }

  const cleanField = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const summaryParts = [
    cleanField(values.project_name),
    cleanField(values.location_name || values.city_name),
    cleanField(values.property_type),
  ].filter(Boolean);

  const fieldEntries = STAGE_DETAIL_FIELDS
    .map(({ key, label }) => {
      const value = cleanField(values[key]);
      if (!value) return null;
      return { key, label, value };
    })
    .filter(Boolean);

  return {
    title: STAGE_PROFILING_TITLE,
    summary: summaryParts.join(" • ") || "Property profiling details",
    fieldEntries,
  };
};

export function StageDetailCard({ content, forceCollapsed = false }) {
  const parsed = useMemo(() => parseStageDetailMessage(content), [content]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (forceCollapsed) {
      setCollapsed(true);
    }
  }, [forceCollapsed]);

  if (!parsed) {
    return <>{content}</>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-warning/20 bg-bg-card/95 shadow-panel">
      <div className="flex items-start justify-between gap-3 border-b border-warning/15 bg-warning/5 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.05em] text-warning">
              {parsed.title}
            </span>
            <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] text-success">
              Verified
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-text-primary leading-snug">
            {parsed.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-warning/25 bg-bg-deep/40 text-warning transition hover:bg-warning/10"
          aria-label={collapsed ? "Expand stage details" : "Collapse stage details"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {parsed.fieldEntries.map((field) => {
              const isBoolean = /^(true|false)$/i.test(field.value);
              const isCoordinateField = field.key === "coordinates" || field.key === "lat" || field.key === "lng";
              return (
                <div
                  key={`${field.key}-${field.value}`}
                  className="rounded-xl border border-border/60 bg-bg-deep/40 px-3 py-2.5"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.05em] text-text-dim">
                    {field.label}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold leading-snug ${isBoolean
                      ? field.value.toLowerCase() === "true"
                        ? "text-success"
                        : "text-warning"
                      : "text-text-primary"
                      } ${isCoordinateField ? "font-mono text-[12px]" : ""}`}
                  >
                    {isBoolean ? (field.value.toLowerCase() === "true" ? "Yes" : "No") : field.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
