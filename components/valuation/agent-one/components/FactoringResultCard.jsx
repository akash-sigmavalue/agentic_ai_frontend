import { useState } from "react";
import { createPortal } from "react-dom";
import { getCurrencySymbol } from "../chat-utils";
import ReActReasoningReport from "./ReActReasoningReport";

// Helper components & constants

function AmenityCellChips({ summary, isSubject }) {
  if (!summary || summary === "—") return <span className="text-text-dim text-[9px]">—</span>;
  let parsed = summary;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }

  let counts = parsed?.counts ?? parsed;
  if (typeof counts === "string") {
    try {
      counts = JSON.parse(counts);
    } catch {
      counts = null;
    }
  }

  if (!counts || typeof counts !== "object") {
    const fallbackChips = String(summary)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const parts = s.split(":");
        return { label: parts[0]?.trim(), count: parts[1]?.trim() };
      })
      .filter((c) => c.label && c.count && c.count !== "0");

    if (!fallbackChips.length) return <span className="text-text-dim text-[9px]">{summary}</span>;

    return (
      <div className="flex flex-wrap justify-center gap-1 py-0.5">
        {fallbackChips.map((c, i) => (
          <span key={i} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] font-bold border ${isSubject ? "border-green-500/25 bg-green-500/10 text-green-400" : "border-blue-500/20 bg-blue-500/[0.07] text-blue-300"}`}>
            <span className="opacity-70">{c.label}</span>
            <span className="font-black">{c.count}</span>
          </span>
        ))}
      </div>
    );
  }

  const entries = Object.entries(counts)
    .map(([key, value]) => ({
      label: String(key)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (match) => match.toUpperCase()),
      count: Number(value) || 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!entries.length) return <span className="text-text-dim text-[9px]">—</span>;

  return (
    <div className="mx-auto max-w-[240px] text-left">
      <div className="flex flex-wrap items-center gap-1.5">
        {entries.slice(0, 4).map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-bold tracking-[0.04em] ${isSubject
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400"
              : "border-blue-500/35 bg-blue-500/10 text-blue-300"
              }`}
          >
            <span className="truncate uppercase">{item.label}</span>
            <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-black normal-case tracking-normal ${isSubject
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-blue-500/15 text-blue-200"
              }`}>
              {item.count}
            </span>
          </span>
        ))}
      </div>
      {entries.length > 4 && (
        <p className="mt-1 text-[9px] text-text-dim">
          +{entries.length - 4} more
        </p>
      )}
    </div>
  );
}

function CbdCell({ km, name, isSubject }) {
  if (km == null && !name) return <span className="text-text-dim text-[9px]">—</span>;
  return (
    <div className="flex flex-col items-center gap-0.5">
      {name && (
        <span className={`text-[8px] font-bold leading-tight text-center max-w-[120px] ${isSubject ? "text-green-400/80" : "text-blue-300/80"}`}>
          {name}
        </span>
      )}
      {km != null && (
        <span className="font-mono text-[9px] text-text-dim font-bold">{Number(km).toFixed(1)} km</span>
      )}
    </div>
  );
}

const CONFIDENCE_RANGE_PCT = {
  high: 0.03,
  medium: 0.06,
  low: 0.10,
};

const getConfidenceRangePct = (confidence) => {
  const key = String(confidence || "Medium").trim().toLowerCase();
  return CONFIDENCE_RANGE_PCT[key] || CONFIDENCE_RANGE_PCT.medium;
};

const buildNumberRange = (exactValue, confidence) => {
  const value = Number(exactValue || 0);
  if (!value) return null;
  const pct = getConfidenceRangePct(confidence);
  return {
    low: Math.round(value * (1 - pct)),
    high: Math.round(value * (1 + pct)),
  };
};

const coerceRange = (range, exactValue, confidence) => {
  const low = Number(range?.low || 0);
  const high = Number(range?.high || 0);
  if (low > 0 && high > 0) return { low, high };
  return buildNumberRange(exactValue, confidence);
};

export default function FactoringResultCard({ data, area_unit, subjectData, onUpdateData }) {
  const [showReport, setShowReport] = useState(false);
  const [isSectionMaximized, setIsSectionMaximized] = useState(false);

  // Cache original data for Reset functionality when the card is first mounted
  const [originalData] = useState(() => JSON.parse(JSON.stringify(data)));

  if (!data) return null;

  const {
    comparable_factoring_table = [],
    blending = {},
    subject_final_rate,
    subject_rate_range,
    confidence,
    raw_markdown_report,
    reconciliation_note,
    limited_evidence_note,
    subject_only_mode,
  } = data;

  const currencyCode = subjectData?.currency || "INR";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
  const fmtCurrencyInUnits = (val) => {
    if (val == null || Number.isNaN(Number(val))) return "—";
    const num = Number(val);
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 2)} Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 2)} Lakh`;
    return formatter.format(num);
  };
  const fmtRate = (v) => v != null ? formatter.format(Number(v)) : "—";
  const fmtPct = (v) => {
    if (v == null) return "—";
    const n = Number(v) * 100;
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  };
  const adjColor = (v) => {
    if (v == null) return "text-text-dim";
    const n = Number(v);
    if (n > 0) return "text-green-400";
    if (n < 0) return "text-red-400";
    return "text-text-dim";
  };

  const subjectRow = comparable_factoring_table.find(r => r.role === "SUBJECT");
  const compRows = comparable_factoring_table.filter(r => r.role !== "SUBJECT");
  const finalRate = Number(subject_final_rate || 0);

  const subjectListings = Number(subjectData?.listing_count || blending.subject_listing_count || 0);
  const capLimit = subjectListings >= 10 ? 0.10 : 0.20;

  // Custom helper function to check if a project has custom factor overrides
  const isProjectModified = (projectName) => {
    const origRow = originalData.comparable_factoring_table?.find(r => r.project_name === projectName);
    const currRow = comparable_factoring_table.find(r => r.project_name === projectName);
    if (!origRow || !currRow) return false;
    return (
      origRow.factor_road !== currRow.factor_road ||
      origRow.factor_amenity !== currRow.factor_amenity ||
      origRow.factor_density !== currRow.factor_density ||
      origRow.factor_cbd !== currRow.factor_cbd
    );
  };

  // Custom helper to check if weights have been modified from original
  const isWeightsModified = () => {
    return (
      originalData.blending?.w1 !== blending.w1 ||
      originalData.blending?.w2 !== blending.w2
    );
  };

  // Helper to check if a comparable hit the cap
  const isCapped = (projectName) => {
    const currRow = comparable_factoring_table.find(r => r.project_name === projectName);
    if (!currRow) return false;
    const sum = (currRow.factor_road ?? 0) + (currRow.factor_amenity ?? 0) + (currRow.factor_density ?? 0) + (currRow.factor_cbd ?? 0);
    return Math.abs(sum) > capLimit;
  };

  // Recalculates other dependent fields and triggers parent update handler
  const recalculateAndTrigger = (newTable, w1, w2) => {
    const compRowsOnly = newTable.filter((r) => r.role !== "SUBJECT");
    const compCount = compRowsOnly.length;
    const factoredCompAvg = compCount > 0
      ? Math.round(compRowsOnly.reduce((sum, r) => sum + (r.factored_rate ?? 0), 0) / compCount)
      : 0;

    const sRate = subjectRow ? Number(subjectRow.avg_rate ?? 0) : 0;

    let finalRate = 0;
    if (subjectListings > 0 && sRate > 0) {
      finalRate = Math.round(w1 * sRate + w2 * factoredCompAvg);
    } else {
      finalRate = Math.round(factoredCompAvg);
    }

    // Dynamic reconciliation note updates if edits are capped
    let note = reconciliation_note || "";
    note = note.replace(/\[Client-Side Adjustment Capped\].*?\./g, "").trim();
    const cappedProjects = newTable
      .filter(r => r.role !== "SUBJECT")
      .filter(r => {
        const sum = (r.factor_road ?? 0) + (r.factor_amenity ?? 0) + (r.factor_density ?? 0) + (r.factor_cbd ?? 0);
        return Math.abs(sum) > capLimit;
      })
      .map(r => r.project_name);

    if (cappedProjects.length > 0) {
      note = `[Client-Side Adjustment Capped] Total adjustments capped at ${(capLimit * 100).toFixed(0)}% for projects: ${cappedProjects.join(", ")}. ${note}`;
    }

    const isWeightsMod = (w1 !== originalData.blending?.w1 || w2 !== originalData.blending?.w2);
    const updatedRateRange = buildNumberRange(finalRate, confidence);
    const valuationArea = Number(
      subjectData?.salable_area_sqft ||
      subjectData?.builtup_area_sqft ||
      subjectData?.carpet_area_sqft ||
      subjectData?.plot_area_sqft ||
      0
    );
    const updatedMarketValue = valuationArea > 0 ? Math.round(finalRate * valuationArea) : null;
    const updatedValueRange = updatedMarketValue ? buildNumberRange(updatedMarketValue, confidence) : null;

    const updatedData = {
      ...data,
      comparable_factoring_table: newTable,
      blending: {
        ...blending,
        factored_comp_avg: factoredCompAvg,
        w1,
        w2,
        final_rate: finalRate,
        weight_reasoning: isWeightsMod ? null : (originalData.blending?.weight_reasoning || blending.weight_reasoning),
      },
      subject_final_rate: finalRate,
      confidence_range_pct: getConfidenceRangePct(confidence) * 100,
      subject_rate_range: updatedRateRange,
      subject_market_value: updatedMarketValue,
      subject_value_range: updatedValueRange,
      reconciliation_note: note,
    };

    onUpdateData?.(updatedData);
  };

  const handleFactorChange = (projectName, factorKey, valPct) => {
    const decimalVal = Number((valPct / 100).toFixed(4));
    const updatedTable = comparable_factoring_table.map((row) => {
      if (row.project_name !== projectName) return row;

      const updatedRow = { ...row, [factorKey]: decimalVal };
      const road = updatedRow.factor_road ?? 0;
      const amenity = updatedRow.factor_amenity ?? 0;
      const density = updatedRow.factor_density ?? 0;
      const cbd = updatedRow.factor_cbd ?? 0;

      const rawSum = road + amenity + density + cbd;
      const totalFactor = Math.max(-capLimit, Math.min(capLimit, rawSum));
      const factoredRate = Math.round((updatedRow.avg_rate ?? 0) * (1 + totalFactor));

      return {
        ...updatedRow,
        total_factor: totalFactor,
        factored_rate: factoredRate,
      };
    });

    recalculateAndTrigger(updatedTable, blending.w1, blending.w2);
  };

  const handleResetProject = (projectName) => {
    const origRow = originalData.comparable_factoring_table?.find(r => r.project_name === projectName);
    if (!origRow) return;

    const updatedTable = comparable_factoring_table.map((row) => {
      if (row.project_name !== projectName) return row;
      return JSON.parse(JSON.stringify(origRow));
    });

    recalculateAndTrigger(updatedTable, blending.w1, blending.w2);
  };

  const handleWeightChange = (newW1) => {
    const roundedW1 = Math.round(newW1 * 100) / 100;
    const roundedW2 = Math.round((1.0 - roundedW1) * 100) / 100;
    recalculateAndTrigger(comparable_factoring_table, roundedW1, roundedW2);
  };

  const handleResetWeights = () => {
    const origW1 = originalData.blending?.w1 ?? 0.5;
    const origW2 = originalData.blending?.w2 ?? 0.5;
    recalculateAndTrigger(comparable_factoring_table, origW1, origW2);
  };

  const MainContent = (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border-soft bg-bg-card/90 shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 sm:mt-8 sm:rounded-[2.5rem]">

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border-soft bg-gradient-to-r from-accent/10 to-transparent px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-lg sm:h-10 sm:w-10 sm:text-xl">🛡️</div>
          <div className="min-w-0">
            <h2 className="break-words text-[10px] font-black uppercase tracking-[0.05em] text-text-primary sm:tracking-[0.05em]">Stage 5 - Valuation Synthesis</h2>
            <p className="mt-0.5 break-words text-[8px] leading-relaxed text-text-dim opacity-60 sm:uppercase sm:tracking-widest">Comparable adjustments and confidence-weighted valuation</p>
            <div
              className={`
                flex min-h-7 items-center justify-center
                gap-1 rounded-lg border
                px-1.5 py-1
                text-center text-[7px] font-black uppercase tracking-normal
                whitespace-nowrap

                sm:min-h-9 sm:gap-1.5 sm:rounded-xl
                sm:px-3 sm:py-1.5
                sm:text-[9px] sm:tracking-widest

                ${confidence === "High"
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : confidence === "Low"
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }
              `}
            >
              <span
                className="h-1 w-1 shrink-0 rounded-full animate-pulse sm:h-1.5 sm:w-1.5"
                style={{ background: "currentColor" }}
              />

              <span className="sm:hidden">
                {confidence || "Medium"}
              </span>

              <span className="hidden sm:inline">
                {confidence || "Medium"} Confidence
              </span>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
          <button onClick={() => setIsSectionMaximized(!isSectionMaximized)} className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border-soft bg-bg-input px-2 py-1.5 text-[8px] font-black uppercase tracking-wide transition-all hover:bg-accent/20 hover:text-accent sm:px-3 sm:tracking-widest">
            {isSectionMaximized ? "Collapse" : "⛶ Expand"}
          </button>
        </div>
      </div>

      <div className="space-y-6 p-3 sm:space-y-10 sm:p-8">

        {/* ── Subject-Only Evidence Warning ─────────────────────────── */}
        {subject_only_mode && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-bg-card to-amber-600/5 p-3 sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.12),transparent_60%)]" />
            <div className="relative z-10 flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[18px] font-black">
                ⚠
              </div>
              <div className="flex-1 min-w-0">
                <p className="mb-1.5 break-words text-[9px] font-black uppercase leading-relaxed tracking-[0.04em] text-amber-400 sm:tracking-[0.05em]">
                  Limited Comparable Market Evidence — Subject-Only Valuation
                </p>
                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  {limited_evidence_note ||
                    "Due to limited comparable market evidence, the valuation has been derived using the best available data for the subject property. For a detailed expert review and enhanced valuation assessment, please contact our team."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPARABLE FACTORING TABLE ─────────────────────────────── */}
        <section>
          <div className="mb-4 flex min-w-0 items-start gap-3 sm:items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-sm">⚖️</span>
            <div className="min-w-0">
              <h3 className="break-words text-[10px] font-black uppercase leading-relaxed tracking-[0.04em] text-text-primary sm:text-[11px] sm:tracking-[0.05em]">Per-Comparable Factor Adjustments</h3>
              <p className="mt-0.5 break-words text-[9px] leading-relaxed text-text-dim">Each factor ±5% · Total cap ±{(capLimit * 100).toFixed(0)}% · {subjectListings} subject listings</p>
            </div>
          </div>

          <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-border-soft sm:hidden">
            {comparable_factoring_table.map((row, index) => {
              const totalFactor = row.role === "SUBJECT" ? null : Number(row.total_factor || 0);
              return (
                <div key={`mobile-synthesis-${row.project_name || index}`} className={row.role === "SUBJECT" ? "bg-accent/10" : "bg-bg-input/20"}>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <span className="w-5 shrink-0 font-mono text-[9px] text-text-dim">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-text-primary">{row.project_name || "—"}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {row.role === "SUBJECT" && <span className="rounded bg-accent px-1.5 py-0.5 text-[7px] font-black uppercase text-bg-deep">Subject</span>}
                        <span className="rounded border border-border/50 bg-bg-input px-1.5 py-0.5 text-[8px] text-text-dim">Road: {row.road_type || "—"}</span>
                        {totalFactor != null && <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${adjColor(totalFactor)}`}>{fmtPct(totalFactor)}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-[12px] font-black ${row.role === "SUBJECT" ? "text-green-400" : "text-blue-400"}`}>{fmtRate(row.role === "SUBJECT" ? row.avg_rate : row.factored_rate)}</p>
                      <p className="text-[8px] text-text-dim">{row.role === "SUBJECT" ? "Base rate" : "Factored rate"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-px border-t border-white/[0.04] bg-white/[0.04]">
                    <div className="bg-bg-card/90 px-2 py-2 text-center"><p className="text-[7px] uppercase text-text-dim">Avg Rate</p><p className="mt-0.5 truncate font-mono text-[9px] text-text-secondary">{fmtRate(row.avg_rate)}</p></div>
                    <div className="bg-bg-card/90 px-2 py-2 text-center"><p className="text-[7px] uppercase text-text-dim">Density</p><p className="mt-0.5 font-mono text-[9px] text-text-secondary">{row.builtup_density_score != null ? Number(row.builtup_density_score).toFixed(1) : "—"}</p></div>
                    <div className="bg-bg-card/90 px-2 py-2 text-center"><p className="text-[7px] uppercase text-text-dim">CBD</p><p className="mt-0.5 font-mono text-[9px] text-text-secondary">{row.cbd_nearest_km != null ? `${row.cbd_nearest_km} km` : "—"}</p></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border-soft shadow-xl sm:block">
            <table className="w-full text-left text-[10px] min-w-[900px]">
              <thead>
                <tr className="bg-bg-input border-b border-border-soft text-text-dim uppercase tracking-widest font-black text-[8px]">
                  <th className="px-5 py-3.5 min-w-[180px]">Project Name</th>
                  <th className="px-4 py-3.5 text-center">Road Type</th>
                  <th className="px-4 py-3.5 text-center min-w-[140px]">Amenity</th>
                  <th className="px-4 py-3.5 text-center">Density Score</th>
                  <th className="px-4 py-3.5 text-center">CBD (km)</th>
                  <th className="px-4 py-3.5 text-right">Avg Rate</th>
                  <th className="px-4 py-3.5 text-center">Factor</th>
                  <th className="px-4 py-3.5 text-right min-w-[150px]">Net Factored Rate</th>
                </tr>
              </thead>
              <tbody>
                {/* Subject row */}
                {subjectRow && (
                  <tr className="bg-accent/10 border-b border-accent/20">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-text-primary text-[11px]">{subjectRow.project_name}</span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-accent text-bg-deep font-black uppercase shrink-0">Subject</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-accent">{subjectRow.road_type || "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <AmenityCellChips summary={subjectRow.amenity_summary} isSubject />
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-accent">{subjectRow.builtup_density_score != null ? Number(subjectRow.builtup_density_score).toFixed(1) : "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <CbdCell km={subjectRow.cbd_nearest_km} name={subjectRow.cbd_name} isSubject />
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-green-400">{fmtRate(subjectRow.avg_rate)}</td>
                    <td className="px-4 py-4 text-center text-[8px] font-black text-accent/50 uppercase">Base</td>
                    <td className="px-4 py-4 text-right font-mono font-black text-green-400 text-[13px]">{fmtRate(subjectRow.avg_rate)}</td>
                  </tr>
                )}

                {/* Comparable rows */}
                {compRows.map((row, i) => {
                  const totalF = row.total_factor != null ? Number(row.total_factor) : null;
                  const factoredRate = row.factored_rate;
                  const isModified = isProjectModified(row.project_name);
                  return (
                    <tr key={i} className="border-b border-border-dim hover:bg-bg-input/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-secondary text-[10px]">{row.project_name}</span>
                          {isModified && (
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Modified by appraiser"></span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-text-dim">{row.road_type || "—"}</td>
                      <td className="px-4 py-4 text-center">
                        <AmenityCellChips summary={row.amenity_summary} />
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-text-dim">{row.builtup_density_score != null ? Number(row.builtup_density_score).toFixed(1) : "—"}</td>
                      <td className="px-4 py-4 text-center">
                        <CbdCell km={row.cbd_nearest_km} name={row.cbd_name} />
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-text-secondary">{fmtRate(row.avg_rate)}</td>
                      <td className={`px-4 py-4 text-center font-mono font-black text-[12px] ${adjColor(totalF)}`}>
                        {totalF != null ? (totalF >= 0 ? "+" : "") + (totalF * 100).toFixed(2) + "%" : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-black text-[12px] text-blue-400">
                        {fmtRate(factoredRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Factor breakdown and adjustment sliders */}
          {compRows.some(r => r.factor_reasoning) && (
            <div className="mt-6 space-y-4 ">
              <h4 className="text-[9px] font-black uppercase tracking-[0.05em] text-text-primary sm:tracking-[0.05em] ">Factor Adjustment Controls</h4>
              <div className={`grid min-w-0 grid-cols-1 gap-3 sm:gap-4 ${isSectionMaximized ? "xl:grid-cols-2" : ""}`}>
                {compRows.map((row, i) => {
                  const isModified = isProjectModified(row.project_name);
                  const isRowCapped = isCapped(row.project_name);
                  const roadVal = row.factor_road ?? 0;
                  const amenityVal = row.factor_amenity ?? 0;
                  const densityVal = row.factor_density ?? 0;
                  const cbdVal = row.factor_cbd ?? 0;

                  return (
                    <div key={i} className="min-w-0">
                      <div className={`min-w-0 rounded-lg border border-slate-500/60 p-5 ${isSectionMaximized ? "min-h-[450px]" : "min-h-[180px] w-full"}`}>
                        <div className="mb-3 flex min-w-0 items-center justify-between gap-3  pb-2.5">
                          <div className="flex min-w-0 items-center gap-2 ">
                            <span className="truncate text-[11px] font-bold text-text-secondary" title={row.project_name}>{row.project_name}</span>
                            {isModified && (
                              <span className="px-2 py-0.5 rounded bg-warning/20 border border-warning/30 text-[8px] text-warning font-black uppercase tracking-wider">Edited</span>
                            )}
                          </div>
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleResetProject(row.project_name)}
                              className="text-[9px] font-bold text-warning hover:text-warning-light hover:underline transition uppercase tracking-wider cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Interactive Sliders for 4 Geospatial factors */}
                        <div className="">
                          {/* Road Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wide text-text-dim sm:tracking-widest">
                              <span className="min-w-0">Road Type Adjustment</span>
                              <span className={`shrink-0 font-mono ${adjColor(roadVal)}`}>{fmtPct(roadVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_road", Math.max(-50, Math.round(roadVal * 1000) - 1) / 10)}
                                disabled={Math.round(roadVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(roadVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_road", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_road", Math.min(50, Math.round(roadVal * 1000) + 1) / 10)}
                                disabled={Math.round(roadVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>

                          {/* Amenity Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wide text-text-dim sm:tracking-widest">
                              <span className="min-w-0">Amenity Adjustment</span>
                              <span className={`shrink-0 font-mono ${adjColor(amenityVal)}`}>{fmtPct(amenityVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_amenity", Math.max(-50, Math.round(amenityVal * 1000) - 1) / 10)}
                                disabled={Math.round(amenityVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(amenityVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_amenity", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_amenity", Math.min(50, Math.round(amenityVal * 1000) + 1) / 10)}
                                disabled={Math.round(amenityVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>

                          {/* Density Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wide text-text-dim sm:tracking-widest">
                              <span className="min-w-0">Density Score Adjustment</span>
                              <span className={`shrink-0 font-mono ${adjColor(densityVal)}`}>{fmtPct(densityVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_density", Math.max(-50, Math.round(densityVal * 1000) - 1) / 10)}
                                disabled={Math.round(densityVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(densityVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_density", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_density", Math.min(50, Math.round(densityVal * 1000) + 1) / 10)}
                                disabled={Math.round(densityVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>

                          {/* CBD Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wide text-text-dim sm:tracking-widest">
                              <span className="min-w-0">CBD Distance Adjustment</span>
                              <span className={`shrink-0 font-mono ${adjColor(cbdVal)}`}>{fmtPct(cbdVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_cbd", Math.max(-50, Math.round(cbdVal * 1000) - 1) / 10)}
                                disabled={Math.round(cbdVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(cbdVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_cbd", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_cbd", Math.min(50, Math.round(cbdVal * 1000) + 1) / 10)}
                                disabled={Math.round(cbdVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Net Adjustments capped info */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/30 px-3.5 py-2.5 font-mono text-[10px]">
                          <span className="text-text-dim uppercase tracking-wider text-[8px] font-bold">Net Correction:</span>
                          <div className="flex items-center gap-2">
                            {isRowCapped && (
                              <span className="text-[8px] bg-warning/20 border border-warning/30 text-warning px-1.5 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">Capped at ±{(capLimit * 100).toFixed(0)}%</span>
                            )}
                            <span className={`font-black ${adjColor(row.total_factor)}`}>{fmtPct(row.total_factor)}</span>
                          </div>
                        </div>
                      </div>

                      {isSectionMaximized && (
                        <div className="mt-2 min-h-[180px] w-full rounded-lg border border-slate-500/60 p-5">
                          <span className="text-[8px] font-black text-text-dim uppercase tracking-widest block mb-1.5">Expert Baseline Reasoning:</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">{row.factor_reasoning}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── VALUATION BLENDING & WEIGHTS CONFIGURATION ─────────────────── */}
        <section className="space-y-5 rounded-2xl border border-border-soft bg-bg-card/75 p-3 sm:space-y-6 sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-purple/20 border border-accent-purple/30 text-sm">🧪</span>
              <div className="min-w-0 ">
                <h3 className="break-words text-[10px] font-black uppercase leading-relaxed tracking-[0.04em] text-text-primary sm:text-[11px] sm:tracking-[0.05em]">Appraisal Blending & Weights</h3>
                <p className="mt-0.5 text-[8px] leading-relaxed text-text-dim opacity-60 sm:uppercase sm:tracking-widest">Adjust confidence weight balance for final valuation</p>
              </div>
            </div>
            {isWeightsModified() && (
              <button
                type="button"
                onClick={handleResetWeights}
                className="self-start text-[9px] font-bold text-warning hover:text-warning-light hover:underline transition uppercase tracking-wider cursor-pointer sm:self-auto"
              >
                Reset Weights
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Blending stats */}
            <div className="space-y-4">
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-4 space-y-2 ">
                <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Formula:</p>
                <p className="break-words font-mono text-[9px] text-white/90 font-bold leading-relaxed font-semibold sm:break-normal sm:text-[10px]">
                  Blended Rate = (w₁ × Subject Rate) + (w₂ × Comparables Avg)
                </p>
              </div>
            </div>

            {/* Weight Sliders */}
            <div className="space-y-4 flex flex-col justify-center">
              {subjectListings > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase text-text-dim font-semibold sm:items-stretch sm:gap-0">
                      <span className="min-w-0">Subject Weight (w₁)</span>
                      <span className="shrink-0 text-accent font-mono font-bold">{((blending.w1 ?? 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round((blending.w1 ?? 0.5) * 100)}
                      onChange={(e) => handleWeightChange(Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase text-text-dim font-semibold sm:items-stretch sm:gap-0">
                      <span className="min-w-0">Comparable Weight (w₂)</span>
                      <span className="shrink-0 text-accent-purple font-mono font-bold">{((blending.w2 ?? 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round((blending.w2 ?? 0.5) * 100)}
                      onChange={(e) => handleWeightChange(1 - Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-purple"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Weights Locked</p>
                  <p className="text-[10px] text-text-dim leading-relaxed font-semibold">
                    Subject property has 0 listings. Valuation is weighted 100% (w₂ = 1.0) on the average of the selected market comparables.
                  </p>
                </div>
              )}
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-3 font-mono text-sm sm:w-[650px] sm:grid-cols-2 sm:gap-5">
              <div className="min-w-0 rounded-xl bg-white/5 p-3 ">
                <span className="mb-1 block text-[10px] text-text-dim ">Subject Rate:</span>
                <span className="font-bold text-green-400">{fmtRate(blending.subject_own_rate)}</span>
                <span className="text-[8px] text-text-dim block mt-0.5">({blending.subject_listing_count || 0} listings)</span>
              </div>
              <div className="hidden sm:block"></div>
              <div className="min-w-0 rounded-xl bg-white/5 p-3 ">
                <span className="mb-1 block text-[10px] text-text-dim ">Comparables Avg:</span>
                <span className="font-bold text-blue-400">{fmtRate(blending.factored_comp_avg)}</span>
                <span className="text-[8px] text-text-dim block mt-0.5">(from {compRows.length} comparables)</span>
              </div>
            </div>
          </div>

          {blending.weight_reasoning && (
            <div className="text-[9px] text-text-dim italic leading-relaxed border-t border-white/5 pt-3 font-semibold">
              Note: {blending.weight_reasoning}
            </div>
          )}
        </section>

        {/* ── DERIVED RATE AND VALUE SUMMARY ─────────────────────────────── */}
        {(() => {
          const propType = (subjectData?.property_type || "").toLowerCase().trim();
          let selectedArea = 0;
          let areaLabel = "Area";

          if (["flat", "apartment", "shop", "retail", "office", "commercial_office"].includes(propType)) {
            selectedArea = Number(subjectData?.salable_area_sqft || 0);
            areaLabel = "Salable Area";
          } else if (["villa", "house", "building_land"].includes(propType)) {
            selectedArea = Number(subjectData?.builtup_area_sqft || 0);
            areaLabel = "Built-up Area";
          } else if (["land", "plot"].includes(propType)) {
            selectedArea = Number(subjectData?.plot_area_sqft || 0);
            areaLabel = "Total Area";
          } else {
            selectedArea = Number(subjectData?.salable_area_sqft || subjectData?.builtup_area_sqft || subjectData?.plot_area_sqft || subjectData?.carpet_area_sqft || 0);
            if (subjectData?.salable_area_sqft) areaLabel = "Salable Area";
            else if (subjectData?.builtup_area_sqft) areaLabel = "Built-up Area";
            else if (subjectData?.plot_area_sqft) areaLabel = "Total Area";
            else if (subjectData?.carpet_area_sqft) areaLabel = "Carpet Area";
          }

          const rangePct = Number(data.confidence_range_pct || (getConfidenceRangePct(confidence) * 100));
          const exactValue = selectedArea > 0
            ? Number(data.subject_market_value || Math.round(finalRate * selectedArea))
            : null;
          const rateRange = coerceRange(subject_rate_range, finalRate, confidence);
          const valueRange = exactValue
            ? coerceRange(data.subject_value_range, exactValue, confidence)
            : null;
          const rangeLabel = `±${rangePct.toFixed(rangePct % 1 === 0 ? 0 : 1)}% ${confidence || "Medium"} confidence band`;

          return (
            <section className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-b from-bg-card to-bg-deep p-3 shadow-2xl sm:rounded-[2rem] sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-green-500/[0.03] to-transparent" />

              <div className="w-full min-w-0 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.05em] text-green-400/80">Derived Rate</span>
                <div className="flex items-baseline gap-1">
                  <h2 className="min-w-0 font-mono text-2xl font-black text-text-primary drop-shadow-[0_0_12px_rgba(34,197,94,0.3)] sm:text-4xl">
                    {fmtRate(finalRate)}
                  </h2>
                  <span className="text-xs text-text-dim font-bold">/ {area_unit || "sqft"}</span>
                </div>
                {rateRange && (
                  <div className="w-full max-w-xs mt-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-[0.05em] text-green-400/70">Indicative Rate Band</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-text-dim opacity-60">{rangeLabel}</span>
                    </div>
                    {/* Track */}
                    <div className="relative h-2 rounded-full overflow-visible" style={{ background: "rgba(255,255,255,0.06)" }}>
                      {/* Gradient fill between low–high */}
                      <div
                        className="absolute inset-y-0 rounded-full"
                        style={{
                          left: "0%",
                          right: "0%",
                          background: "linear-gradient(90deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.55) 50%, rgba(34,197,94,0.18) 100%)",
                        }}
                      />
                      {/* Center needle pin (point estimate) */}
                      <div
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: "50%" }}
                      >
                        <div className="w-1 h-5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.9)]" />
                      </div>
                    </div>
                    {/* Labels row */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-[10px] font-black text-green-300/80">{fmtRate(rateRange.low)}</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-text-dim">Low</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-[10px] font-black text-green-400">{fmtRate(finalRate)}</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-green-400/60">Point Est.</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-[10px] font-black text-green-300/80">{fmtRate(rateRange.high)}</span>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-text-dim">High</span>
                      </div>
                    </div>
                  </div>
                )}
                {selectedArea > 0 ? (
                  <p className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">
                    Calculated on <span className="text-accent-light">{selectedArea.toLocaleString()} {area_unit || "sqft"}</span> of {areaLabel}
                  </p>
                ) : (
                  <p className="text-[9px] text-warning/80 font-bold uppercase tracking-wider animate-pulse">
                    Please enter the {areaLabel} in subject details to view final valuation
                  </p>
                )}
              </div>

              {selectedArea > 0 && (
                <div className="w-full min-w-0 space-y-2 border-t border-border-soft pt-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.05em] text-accent/80">Property Value</span>
                  <h2 className="font-mono text-2xl font-black text-text-primary drop-shadow-[0_0_16px_rgba(167,139,250,0.4)] sm:text-4xl">
                    {fmtCurrencyInUnits(exactValue)}
                  </h2>
                  {valueRange && (
                    <div className="w-full space-y-1.5 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-[0.05em] text-accent/70">Indicative Value Band</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-text-dim opacity-60">{rangeLabel}</span>
                      </div>
                      {/* Track */}
                      <div className="relative h-2 rounded-full overflow-visible" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="absolute inset-y-0 rounded-full"
                          style={{
                            left: "0%",
                            right: "0%",
                            background: "linear-gradient(90deg, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0.55) 50%, rgba(167,139,250,0.18) 100%)",
                          }}
                        />
                        <div
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                          style={{ left: "50%" }}
                        >
                          <div className="w-1 h-5 rounded-full bg-accent shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
                        </div>
                      </div>
                      {/* Labels row */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col items-start">
                          <span className="font-mono text-[10px] font-black text-accent/80">{fmtCurrencyInUnits(valueRange.low)}</span>
                          <span className="text-[7px] font-bold uppercase tracking-widest text-text-dim">Low</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-[10px] font-black text-accent">{fmtCurrencyInUnits(exactValue)}</span>
                          <span className="text-[7px] font-bold uppercase tracking-widest text-accent/60">Point Est.</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-[10px] font-black text-accent/80">{fmtCurrencyInUnits(valueRange.high)}</span>
                          <span className="text-[7px] font-bold uppercase tracking-widest text-text-dim">High</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-text-dim font-semibold uppercase tracking-widest">
                    {fmtRate(finalRate)}/{area_unit || "sqft"} × {selectedArea.toLocaleString()} {area_unit || "sqft"} ({areaLabel})
                  </p>
                </div>
              )}
            </section>
          );
        })()}


        {/* REASONING REPORT */}
        {isSectionMaximized && raw_markdown_report && (
          <section>
            <button onClick={() => setShowReport(!showReport)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-soft bg-bg-input px-3 py-3 text-[9px] font-black uppercase tracking-wide text-text-dim transition-all hover:border-accent/40 hover:text-accent sm:px-4 sm:text-[10px] sm:tracking-widest">
              <span className="flex min-w-0 items-center gap-2 text-left">🧾 <span className="break-words">Agent Reasoning Report</span></span>
              <span className="shrink-0">{showReport ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showReport && (
              <div className="mt-3 rounded-xl border border-border-soft bg-bg-dark/40 p-4 overflow-auto max-h-[600px] custom-scrollbar animate-in fade-in duration-200">
                <ReActReasoningReport report={raw_markdown_report} />
              </div>
            )}
          </section>
        )}

        {isSectionMaximized && reconciliation_note && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-400/70 mb-1">Reconciliation Note</p>
            <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">{reconciliation_note}</p>
          </div>
        )}

      </div>
    </div>
  );

  if (isSectionMaximized && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-bg-deep/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col">
        {/* Sticky top bar with close button */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-soft bg-bg-card/80 px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-lg">🛡️</span>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-text-primary sm:text-[10px] sm:tracking-[0.05em]">Valuation Synthesis</p>
              <p className="hidden truncate text-[8px] font-semibold uppercase tracking-widest text-text-dim opacity-50 sm:block">Per-comparable adjustment → Confidence-weighted blend</p>
            </div>
          </div>
          <button
            onClick={() => setIsSectionMaximized(false)}
            className="flex h-9 shrink-0 items-center justify-center rounded-xl border border-border-soft bg-bg-input px-3 text-[9px] font-black uppercase tracking-wide text-text-dim transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 sm:gap-2 sm:px-4 sm:tracking-widest"
          >
            <span>✕</span><span className="hidden sm:inline">Collapse</span>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {MainContent}
        </div>
      </div>,
      document.body
    );
  }

  return MainContent;
}
