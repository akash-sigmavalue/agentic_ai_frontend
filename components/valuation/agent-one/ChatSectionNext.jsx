"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "@/lib/api-client";

const QUICK_PROMPTS = [
  "Value a 2BHK flat in Hiranandani Gardens, Powai, Mumbai. 1100 sqft, 5 years old, floor 15/25, West facing",
  "what is the value of a 500 sqft retail shop on the ground floor of MGF Metropolitan Mall, MG Road, Gurgaon? Currently self-used. Market Approach.. Frontage: 18",
  "What is the market value of a 3BHK flat in Godrej Infinity, Keshav Nagar, Pune, 1100 sqft, floor 12/20, East facing",
];

const PLACEHOLDER_MAP = {
  project_name: "e.g. Godrej Infinity, Lodha Altamount, Phoenix Marketcity",
  carpet_area_sqft: "e.g. 850 sqft",
  salable_area_sqft: "e.g. 1100 sqft",
  builtup_area_sqft: "e.g. 1050 sqft",
  plot_area_sqft: "e.g. 1200 sqft",
  age_years: "e.g. 5, or '0' for Under Construction",
  location_name: "City / Locality / Area (e.g. Baner, Pune)",
  country: "e.g. India, USA, UK",
  coordinates: "lat, lng - e.g. 18.559, 73.789",
  land_type: "agricultural / non_agricultural / residential / commercial",
  frontage: "e.g. 30 ft",
  occupancy_status: "vacant / leased / self_use",
  water_availability: "good / moderate / poor",
  clear_height: "e.g. 20 ft",
};

const getCurrencySymbol = (currencyCode) => {
  if (!currencyCode) return "₹";
  try {
    const formatter = new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode.toUpperCase().trim(),
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find((part) => part.type === "currency");
    return symbolPart ? symbolPart.value : currencyCode;
  } catch (e) {
    return currencyCode || "₹";
  }
};

function summarizeEvent(event) {
  if (typeof event.content === "string") return event.content;
  if (event.type === "entities") return "I extracted the structured property details and pushed them into the workflow panel.";
  if (event.type === "clarification_needed") return event.content?.question || "I need a few more details before I can continue.";
  if (event.type === "map_confirmation") return event.content?.message || "I found a probable property location.";
  if (event.type === "approach") return "Agent 2 has recommended a valuation approach based on property intelligence.";
  if (event.type === "approach_choice_needed") return event.content?.question || "Please confirm the optimal valuation approach.";
  if (event.type === "workflow") return "Agent 3 has compiled the execution workflow steps.";
  if (event.type === "comparable_search_progress") {
    const p = event.content;
    return `🔍 Searching radius ${p?.radius_km}km — iteration ${p?.iteration}, ${p?.comps_so_far} comps found so far...`;
  }
  if (event.type === "comparable_results") {
    const c = event.content;
    return `✅ Found ${c?.total_found || 0} comparable projects within ${c?.final_radius_km || "?"}km after ${c?.iterations || "?"} iterations. Select comparables below and proceed to fetch listings.`;
  }
  if (event.type === "listing_start") return event.content?.message || "Starting listing search...";
  if (event.type === "listing_progress") {
    const p = event.content;
    if (p?.status === "scraped") return `📄 ${p?.project}: ${p?.detail?.listings_found || 0} listings found`;
    if (p?.status === "fallback") return `🔄 Running fallback search for ${p?.detail?.projects?.length || 0} projects...`;
    return `📡 Listing pipeline: ${p?.status}`;
  }
  if (event.type === "listing_results") {
    return `📊 Fetched ${event.content?.total_listings || 0} listings across ${event.content?.projects_processed || 0} projects.`;
  }
  if (event.type === "listing_done") return "Listing fetch completed.";
  if (event.type === "extraction_verification") return event.content?.message || "Please verify the extracted attributes.";
  if (event.type === "factorial_start") return event.content?.message || "Analyzing project metrics...";
  if (event.type === "factorial_results") {
    const t = event.content?.table || [];
    return `📈 Project metrics ready — ${t.length} projects, ${event.content?.total_valid || 0} valid listings.`;
  }
  if (event.type === "factorial_done") return "Valuation analytics generated.";
  if (event.type === "done") return "Pipeline execution completed or artificially frozen.";
  if (event.type === "token_usage") return `Token usage updated: ${event.content?.cumulative_total_tokens || 0} tokens so far.`;
  return "Pipeline update received.";
}

function humanizeFieldName(field) {
  return field.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}






// ── Road Type Badge ──────────────────────────────────────────────
function RoadTypeBadge({ type }) {
  if (!type) return <span className="text-text-dim">—</span>;

  const config = {
    'D': { label: 'Expressway', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'B': { label: 'Primary', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'C': { label: 'Secondary', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'A': { label: 'Residential', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  };

  const c = config[type] || { label: type, color: 'bg-border/20 text-text-secondary border-border/30' };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.color}`} title={`${c.label} Road`}>
      {type}
    </span>
  );
}

// ── Comparison Modal ─────────────────────────────────────────────
function ComparisonModal({ projects, onClose }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/90 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
      <div className="flex h-[80vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-bg-input px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">⚖️</span>
            <h3 className="text-lg font-bold text-text-primary">Project Side-by-Side Comparison</h3>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border hover:bg-danger/10 hover:text-danger text-2xl transition">×</button>
        </div>

        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p, idx) => (
              <div key={idx} className={`flex flex-col rounded-2xl border p-5 ${p.is_subject ? 'border-purple-500/40 bg-purple-500/5' : 'border-border bg-bg-input/30'}`}>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {p.is_subject && <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/30">Subject</span>}
                    <h4 className="text-base font-bold text-text-primary truncate">{p.project_name}</h4>
                  </div>
                  <p className="text-xs text-text-dim">{p.listing_count} listings analyzed</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-border/50 pb-2">
                    <span className="text-xs text-text-dim">Median Rate</span>
                    <span className="text-lg font-bold text-accent-light">{formatPrice(p.median_rate, p.currency || "INR")}</span>
                  </div>

                  <div className="flex justify-between items-center bg-bg-deep/50 rounded-xl p-3">
                    <span className="text-xs text-text-dim">Road Type</span>
                    <RoadTypeBadge type={p.road_type} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comparable Table with Checkboxes ─────────────────────────────
const INITIAL_COMPARABLE_RADIUS_KM = 2;

function getComparableDistanceKm(comp) {
  const rawDistance = comp?.distance_from_subject_km;
  if (rawDistance === null || rawDistance === undefined || rawDistance === "") return null;
  const distance = Number(String(rawDistance).replace(/[^\d.-]/g, ""));
  return Number.isFinite(distance) ? distance : null;
}

function ComparableTable({ comparables, selectedComps, onToggle, selectable }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "Web" | "Internal DB"

  if (!comparables || comparables.length === 0) return null;

  // Detect whether mixed sources exist
  const hasMixedSources = comparables.some(c => c.data_source === "Internal DB") && comparables.some(c => c.data_source === "Web");

  const filteredComparables = sourceFilter === "all"
    ? comparables
    : comparables.filter(c => (c.data_source || "Web") === sourceFilter);

  const indexedComparables = filteredComparables.map((comp, originalIndex) => ({
    comp,
    originalIndex: comparables.indexOf(comp), // keep original indices for selection
    distanceKm: getComparableDistanceKm(comp),
  }));
  const nearbyComparables = indexedComparables.filter(({ distanceKm }) => distanceKm !== null && distanceKm <= INITIAL_COMPARABLE_RADIUS_KM);
  const visibleComparables = showAllComparables ? indexedComparables : nearbyComparables;
  const hiddenComparableCount = Math.max(indexedComparables.length - nearbyComparables.length, 0);
  const hasHiddenComparables = hiddenComparableCount > 0;
  const visibleResultLabel = showAllComparables
    ? `${filteredComparables.length} results`
    : `${nearbyComparables.length} within ${INITIAL_COMPARABLE_RADIUS_KM} km`;
  const allSelected = visibleComparables.length > 0 && visibleComparables.every(({ originalIndex }) => selectedComps?.has(originalIndex));

  const tableContent = (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            {selectable && (
              <th className="px-3 py-2.5 font-semibold">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) {
                      visibleComparables.forEach(({ originalIndex }) => onToggle?.(originalIndex, false));
                    } else {
                      visibleComparables.forEach(({ originalIndex }) => onToggle?.(originalIndex, true));
                    }
                  }}
                  className="h-3.5 w-3.5 cursor-pointer rounded accent-[#fb923c]"
                />
              </th>
            )}
            <th className="px-3 py-2.5 font-semibold">Project Name</th>
            <th className="px-3 py-2.5 font-semibold">Location</th>
            <th className="px-3 py-2.5 font-semibold">Country</th>
            <th className="px-3 py-2.5 font-semibold">Type</th>
            <th className="px-3 py-2.5 font-semibold">Property Category</th>
            <th className="px-3 py-2.5 font-semibold text-right">Distance</th>
            <th className="px-3 py-2.5 font-semibold text-right text-warning">Lat</th>
            <th className="px-3 py-2.5 font-semibold text-right text-warning">Lng</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Reason</th>
            <th className="px-3 py-2.5 font-semibold">Location Certainty</th>
            <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Source URL</th>
            <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Source</th>
          </tr>
        </thead>
        <tbody>
          {visibleComparables.map(({ comp, originalIndex }) => {
            const isChecked = selectedComps?.has(originalIndex);
            return (
              <tr
                key={`${comp.project_name}-${originalIndex}`}
                className={`border-b border-border/50 transition ${isChecked ? "bg-[rgba(251,146,60,0.08)]" : "hover:bg-[rgba(251,146,60,0.04)]"}`}
              >
                {selectable && (
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked || false}
                      onChange={() => onToggle?.(originalIndex, !isChecked)}
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-[#fb923c]"
                    />
                  </td>
                )}
                <td className="px-3 py-2.5 font-medium text-text-primary whitespace-nowrap">{comp.project_name || "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{comp.location || "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary">{comp.country || "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-md border border-border bg-bg-input px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-light">
                    {comp.property_type || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-md border border-border bg-bg-input px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-light">
                    {comp.project_category || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-secondary whitespace-nowrap">{comp.distance_from_subject_km ? `${comp.distance_from_subject_km} km` : "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono text-warning/80">{comp.map_search_lat || "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono text-warning/80">{comp.map_search_lng || "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{comp.possession_status || "—"}</td>
                <td className="px-3 py-2.5 text-text-secondary text-xs truncate max-w-[200px]" title={comp.reason}>{comp.reason || "—"}</td>
                <td className="px-3 py-2.5 text-center">
                  {comp.location_certainty ? (
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${comp.location_certainty === "Sure" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                      }`}>
                      {comp.location_certainty}
                    </span>
                  ) : (comp.location_certainty_score !== undefined && comp.location_certainty_score !== null ? (
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${comp.location_certainty_score >= 0.8 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                      }`}>
                      {comp.location_certainty_score >= 0.8 ? "Sure" : "Not Sure"}
                    </span>
                  ) : "—")}
                </td>
                <td className="px-3 py-2.5 text-text-secondary truncate max-w-[200px]">
                  {comp.source_url ? (
                    <a href={comp.source_url} target="_blank" rel="noreferrer" className="text-accent-light underline underline-offset-2 hover:text-accent font-medium">
                      {comp.source_url}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  {comp.data_source === "Internal DB" ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Internal DB</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">Web</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visibleComparables.length === 0 && (
        <div className="px-4 py-6 text-center text-xs text-text-dim">
          No comparable projects found within {INITIAL_COMPARABLE_RADIUS_KM} km.
          {hasHiddenComparables ? " Use Show more to view farther projects." : ""}
        </div>
      )}
      {hasHiddenComparables && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-input/40 px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            {showAllComparables ? "Showing all comparable projects" : `${hiddenComparableCount} farther project(s) hidden`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllComparables((prev) => !prev)}
            className="rounded-lg border border-[#fb923c]/35 bg-[#fb923c]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fb923c] transition hover:border-[#fb923c] hover:bg-[#fb923c]/15"
          >
            {showAllComparables ? `Show within ${INITIAL_COMPARABLE_RADIUS_KM} km` : "Show more"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-border bg-[rgba(251,146,60,0.06)] px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(251,146,60,0.15)] text-sm">🏘️</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fb923c]">Comparable Projects Found</span>
            {hasMixedSources && (
              <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-deep/50 p-0.5">
                {["all", "Web", "Internal DB"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSourceFilter(opt)}
                    className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${
                      sourceFilter === opt
                        ? "bg-[#fb923c] text-bg-deep shadow"
                        : "text-text-dim hover:text-text-primary"
                    }`}
                  >
                    {opt === "all" ? "All Sources" : opt}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim">{visibleResultLabel}</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-[#fb923c] hover:text-[#fb923c]"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
        {tableContent}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-[rgba(251,146,60,0.06)] px-6 py-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(251,146,60,0.15)] text-lg">🏘️</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#fb923c]">Comparable Projects Detail</h3>
                  <p className="text-[10px] text-text-dim">{visibleResultLabel} found in vicinity</p>
                </div>
              </div>
              {hasMixedSources && (
                <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-deep/50 p-0.5">
                  {["all", "Web", "Internal DB"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSourceFilter(opt)}
                      className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${
                        sourceFilter === opt
                          ? "bg-[#fb923c] text-bg-deep shadow"
                          : "text-text-dim hover:text-text-primary"
                      }`}
                    >
                      {opt === "all" ? "All Sources" : opt}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setIsMaximized(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">
                {tableContent}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Listing Table ────────────────────────────────────────────────
function ListingTable({ listings, dbTransactions }) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Map internal DB transactions into listing row shape
  const dbRows = (dbTransactions || []).map(t => ({
    project_name:     t.project_name,
    property_type:    t.property_type_raw || t.property_type,
    project_category: t.property_type,
    listing_type:     t.transaction_category,
    bhk:              t.unit_configuration,
    currency:         t.currency,
    price:            t.agreement_price,
    price_per_sqft:   t.price_per_sqft,
    area_sqft:        t.area_sqft,
    area_type:        t.area_type || "Carpet Area",
    is_subject:       t.is_subject || false,
    floor:            t.floor_number,
    total_floors:     null,
    location:         t.location_name,
    source_url:       null,
    _is_db:           true,   // flag to render source badge
  }));

  const allEmpty = (!listings || listings.length === 0) && dbRows.length === 0;
  if (allEmpty) return null;

  const subjectListings = (listings || []).filter((l) => l.is_subject);
  const compListings    = (listings || []).filter((l) => !l.is_subject);

  const renderRows = (rows, label) => (
    <>
      {rows.length > 0 && (
        <tr>
          <td colSpan="100" className="bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
            {label} ({rows.length})
          </td>
        </tr>
      )}
      {rows.map((lst, i) => (
        <tr key={`${lst.project_name}-${i}`} className="border-b border-border/50 transition hover:bg-[rgba(34,211,238,0.04)]">
          <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">
            {lst.project_name || "—"}
            {lst.is_fallback && (
              <span
                title="Data found via LLM search fallback (scraping failed)"
                className="ml-2 inline-flex items-center rounded-full bg-orange-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-400 border border-orange-400/20"
              >
                Fallback
              </span>
            )}
          </td>
          <td className="px-3 py-2 text-text-secondary">{lst.property_type || "—"}</td>
          <td className="px-3 py-2 text-text-secondary">{lst.project_category || "—"}</td>
          <td className="px-3 py-2 text-text-secondary">{lst.listing_type || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-secondary">{lst.bhk || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">{lst.currency || "—"}</td>
          <td className="px-3 py-2 text-right font-mono text-text-primary whitespace-nowrap">{lst.price || "—"}</td>
          <td className="px-3 py-2 text-right font-mono text-accent-light whitespace-nowrap">
            {lst.price_per_sqft ? `${lst.price_per_sqft.toLocaleString()}` : "—"}
          </td>
          <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">{lst.area_sqft || "—"} {lst.area_sqft ? 'sqft' : ''}</td>
          <td className="px-3 py-2 text-text-dim">{lst.area_type || "—"}</td>
          <td className="px-3 py-2 text-center">
            {lst.is_subject ? (
              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/20">Subject</span>
            ) : (
              <span className="rounded-md bg-[#fb923c]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#fb923c] border border-[#fb923c]/20">Comparable</span>
            )}
          </td>
          <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.floor || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.total_floors || "—"}</td>
          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{lst.location || "—"}</td>
          <td className="max-w-[200px] truncate px-3 py-2 text-text-dim">
            {lst._is_db ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Internal DB</span>
            ) : lst.source_url ? (
              <a href={lst.source_url} target="_blank" rel="noreferrer" className="text-accent-light underline underline-offset-2 hover:text-accent font-medium">
                {lst.source_url}
              </a>
            ) : "—"}
          </td>
        </tr>
      ))}
    </>
  );

  const tableContent = (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <th className="px-3 py-2.5 font-semibold">Project</th>
            <th className="px-3 py-2.5 font-semibold">Type</th>
            <th className="px-3 py-2.5 font-semibold">Property Category</th>
            <th className="px-3 py-2.5 font-semibold">List Type</th>
            <th className="px-3 py-2.5 font-semibold text-center">BHK</th>
            <th className="px-3 py-2.5 font-semibold text-center">Currency</th>
            <th className="px-3 py-2.5 font-semibold text-right">Price</th>
            <th className="px-3 py-2.5 font-semibold text-right">Price/Sqft</th>
            <th className="px-3 py-2.5 font-semibold text-right">Area</th>
            <th className="px-3 py-2.5 font-semibold">Area Type</th>
            <th className="px-3 py-2.5 font-semibold text-center">Role</th>
            <th className="px-3 py-2.5 font-semibold text-center">Floor</th>
            <th className="px-3 py-2.5 font-semibold text-center">Total Floor</th>
            <th className="px-3 py-2.5 font-semibold">Location</th>
            <th className="px-3 py-2.5 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {renderRows(subjectListings, "Subject Property")}
          {renderRows(compListings, "Comparable Projects")}
          {dbRows.length > 0 && renderRows(dbRows, "Internal DB Transactions")}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-border bg-[rgba(34,211,238,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(34,211,238,0.15)] text-sm">📊</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-400">Listing Data Fetched</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim">{(listings || []).length} web + {dbRows.length} db records</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-cyan-400 hover:text-cyan-400"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
        {tableContent}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(34,211,238,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(34,211,238,0.15)] text-lg">📊</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Listing Data Detail</h3>
                  <p className="text-[10px] text-text-dim">{listings.length} total records found</p>
                </div>
              </div>
              <button
                onClick={() => setIsMaximized(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">
                {tableContent}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Transaction Table (Internal DB) ─────────────────────────────────────────
function TransactionTable({ transactions }) {
  const [isMaximized, setIsMaximized] = useState(false);
  if (!transactions || transactions.length === 0) return null;

  const tableContent = (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <th className="px-3 py-2.5 font-semibold">Project</th>
            <th className="px-3 py-2.5 font-semibold">Type</th>
            <th className="px-3 py-2.5 font-semibold">Property Category</th>
            <th className="px-3 py-2.5 font-semibold">List Type</th>
            <th className="px-3 py-2.5 font-semibold text-center">Currency</th>
            <th className="px-3 py-2.5 font-semibold text-right">Price</th>
            <th className="px-3 py-2.5 font-semibold text-right">Price/Sqft</th>
            <th className="px-3 py-2.5 font-semibold text-right">Area (Sqft)</th>
            <th className="px-3 py-2.5 font-semibold">Area Type</th>
            <th className="px-3 py-2.5 font-semibold text-center">Floor</th>
            <th className="px-3 py-2.5 font-semibold">Location</th>
            <th className="px-3 py-2.5 font-semibold">Source</th>
            <th className="px-3 py-2.5 font-semibold text-right">Net Carpet (SQM)</th>
            <th className="px-3 py-2.5 font-semibold">Country</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i} className="border-b border-border/50 transition hover:bg-[rgba(52,211,153,0.04)]">
              <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">{t.project_name || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.property_type_raw || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.property_type || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.transaction_category || "—"}</td>
              <td className="px-3 py-2 text-center font-mono text-text-secondary">{t.currency || "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary whitespace-nowrap">{t.agreement_price ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-accent-light whitespace-nowrap">{t.price_per_sqft ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">{t.area_sqft ?? "—"}</td>
              <td className="px-3 py-2 text-text-dim">{t.area_type || "Carpet Area"}</td>
              <td className="px-3 py-2 text-center font-mono text-text-dim">{t.floor_number ?? "—"}</td>
              <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{t.location_name || "—"}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  Internal DB
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-dim">{t.net_carpet_area_sq_m ?? "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.country_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-500/25 bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-emerald-500/20 bg-[rgba(52,211,153,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(52,211,153,0.15)] text-sm">🗄️</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400">Internal DB Transactions</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{transactions.length} records</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-emerald-400 hover:text-emerald-400"
                title="Maximize Table"
              >⛶</button>
            </div>
          </div>
        </div>
        {tableContent}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-emerald-500/30 bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-[rgba(52,211,153,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(52,211,153,0.15)] text-lg">🗄️</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Internal DB Transactions</h3>
                  <p className="text-[10px] text-text-dim">{transactions.length} total records</p>
                </div>
              </div>
              <button onClick={() => setIsMaximized(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">{tableContent}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Helper: Format Price based on Currency ───────────────────
function formatPrice(value, currency = "INR") {
  if (!value && value !== 0) return "—";

  const curr = currency === "\u20B9" ? "INR" : (currency || "INR");
  const isIndian = curr === "INR";

  if (isIndian) {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lac`;
    return `₹${Number(value).toLocaleString('en-IN')}`;
  }

  // International formatting
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (e) {
    return `${curr} ${Number(value).toLocaleString()}`;
  }
}

// ── Cleaned Data Table ──────────────────────────────────────────
function CleanedTable({ listings, reviewListings = [], droppedListings = [], onRecalculate, subjectPropertyType }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [fsiGlobal, setFsiGlobal] = useState("");
  const [ccGlobal, setCcGlobal] = useState("");
  const [rowOverrides, setRowOverrides] = useState({}); // { rowIndex: { fsi_low, fsi_high, cc_low, cc_high } }
  const [activeTab, setActiveTab] = useState("valid"); // "valid" | "outliers" | "dropped"

  if (!listings || listings.length === 0) return null;

  // Detect if we have plot data and if the subject itself is a plot
  const hasPlotData = listings.some(lst => lst.plot_derived_rate_per_sqft !== undefined && lst.plot_derived_rate_per_sqft !== null);
  const isPlotSubject = ["plot", "villa"].includes(subjectPropertyType?.toLowerCase());

  // Only show the FSI/CC overrides if we have plot data AND the subject is a plot
  const showPlotControls = hasPlotData && isPlotSubject;

  // Determine which rows to display based on active tab
  const displayedListings = activeTab === "valid" ? listings : activeTab === "outliers" ? reviewListings : droppedListings;
  const showReasonColumn = activeTab === "outliers" || activeTab === "dropped";

  // Helper: extract reason for drop/outlier
  const getRowReason = (lst) => {
    if (activeTab === "outliers") return "Statistical outlier (IQR)";
    if (lst.is_duplicate) return "Duplicate listing";
    return lst.cleaned_irrelevance_reason || lst.irrelevance_reason || "Not relevant for valuation";
  };

  const tableContent = (
    <div className={`overflow-x-auto overflow-y-auto custom-scrollbar ${isMaximized ? '' : 'max-h-[500px]'}`}>
      <table className="w-full text-left text-xs relative">
        <thead className="sticky top-0 z-[11] bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <th className="px-3 py-2.5 font-semibold">Matched Project</th>
            <th className="px-3 py-2.5 font-semibold text-center">Currency</th>
            <th className="px-3 py-2.5 font-semibold">Config</th>
            <th className="px-3 py-2.5 font-semibold text-right">Price</th>
            <th className="px-3 py-2.5 font-semibold text-right">Raw Area</th>
            <th className="px-3 py-2.5 font-semibold text-right">Normalized Area (SBUA)</th>
            <th className="px-3 py-2.5 font-semibold text-right">Rate / Sqft</th>

            {showPlotControls && (
              <>
                <th colSpan="2" className="px-3 py-2.5 font-semibold text-center">FSI & CC Edits</th>
                <th className="px-3 py-2.5 font-semibold text-right text-accent-light font-bold">Plot Derived Rate / Sqft</th>
                <th className="px-3 py-2.5 font-semibold text-right text-accent">Plot Rate Range</th>
                <th className="px-3 py-2.5 font-semibold text-center text-accent-light">Derived By</th>
              </>
            )}

            <th className="px-3 py-2.5 font-semibold text-center">Floor</th>
            <th className="px-3 py-2.5 font-semibold text-center">Total Floor</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold text-center">Source</th>
            <th className="px-3 py-2.5 font-semibold">Flag</th>
            {showReasonColumn && <th className="px-3 py-2.5 font-semibold">Reason</th>}
          </tr>
        </thead>
        <tbody>
          {displayedListings.length === 0 ? (
            <tr>
              <td colSpan={99} className="px-4 py-8 text-center text-sm text-text-dim">
                {activeTab === "outliers" ? "No outlier listings detected." : "No dropped listings."}
              </td>
            </tr>
          ) : displayedListings.map((lst, i) => (
            <tr key={i} className={`border-b border-border/50 transition hover:bg-[rgba(251,146,60,0.04)] ${activeTab === 'dropped' ? 'opacity-60' : activeTab === 'outliers' ? 'bg-[rgba(239,68,68,0.03)]' : ''}`}>
              <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">
                {lst.cleaned_match_project || lst.project_name || "—"}
              </td>
              <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">{lst.cleaned_currency || lst.currency || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{lst.cleaned_config || lst.bhk || "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">
                {formatPrice(lst.cleaned_price_value || lst.price_value, lst.cleaned_currency || lst.currency)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-secondary">
                {lst.cleaned_area_sqft || "—"} <span className="text-[10px] opacity-50">{lst.cleaned_area_type}</span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-accent-light font-bold">
                {lst.final_super_builtup_area ? `${Math.round(lst.final_super_builtup_area)} sqft` : "—"}
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">
                {lst.cleaned_price_value && lst.final_super_builtup_area
                  ? Math.round(lst.cleaned_price_value / lst.final_super_builtup_area).toLocaleString()
                  : "—"}
              </td>

              {showPlotControls && (
                <>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] opacity-40 uppercase">Low</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-12 bg-bg-deep/50 border border-border/50 rounded px-1 py-0.5 text-center text-[10px] text-accent focus:border-accent outline-none"
                          value={rowOverrides[i]?.fsi_low ?? (lst.plot_fsi_range?.low || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRowOverrides(prev => ({
                              ...prev,
                              [i]: { ...prev[i], fsi_low: val }
                            }));
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] opacity-40 uppercase">High</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-12 bg-bg-deep/50 border border-border/50 rounded px-1 py-0.5 text-center text-[10px] text-accent focus:border-accent outline-none"
                          value={rowOverrides[i]?.fsi_high ?? (lst.plot_fsi_range?.high || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRowOverrides(prev => ({
                              ...prev,
                              [i]: { ...prev[i], fsi_high: val }
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] opacity-40 uppercase">Low</span>
                        <input
                          type="number"
                          className="w-16 bg-bg-deep/50 border border-border/50 rounded px-1 py-0.5 text-right text-[10px] text-accent focus:border-accent outline-none"
                          value={rowOverrides[i]?.cc_low ?? (lst.plot_construction_cost_range?.low || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRowOverrides(prev => ({
                              ...prev,
                              [i]: { ...prev[i], cc_low: val }
                            }));
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] opacity-40 uppercase">High</span>
                        <input
                          type="number"
                          className="w-16 bg-bg-deep/50 border border-border/50 rounded px-1 py-0.5 text-right text-[10px] text-accent focus:border-accent outline-none"
                          value={rowOverrides[i]?.cc_high ?? (lst.plot_construction_cost_range?.high || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRowOverrides(prev => ({
                              ...prev,
                              [i]: { ...prev[i], cc_high: val }
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-accent-light font-bold">
                    {lst.plot_derived_rate_per_sqft
                      ? `${lst.plot_construction_cost_range?.currency || ""}${Math.round(lst.plot_derived_rate_per_sqft).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-secondary">
                    {lst.plot_derived_rate_range
                      ? `${lst.plot_derived_rate_range.currency}${lst.plot_derived_rate_range.low.toLocaleString()} - ${lst.plot_derived_rate_range.high.toLocaleString()}`
                      : (lst.plot_negative_value_flag ? <span className="text-danger font-bold text-[10px]">NEG VALUE</span> : "—")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${lst.plot_derived_by === 'user' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-bg-deep/40 text-text-dim border border-border/30'}`}>
                      {lst.plot_derived_by || "llm"}
                    </span>
                  </td>
                </>
              )}

              <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.cleaned_floor || lst.floor || "—"}</td>
              <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.cleaned_total_floors || lst.total_floors || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{lst.cleaned_possession_status || "—"}</td>
              <td className="px-3 py-2 text-center">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${lst.source === 'Internal DB' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                  {lst.source || "Web"}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${lst.stat_flag === 'outlier' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                  {lst.stat_flag || "ok"}
                </span>
              </td>
              {showReasonColumn && (
                <td className="px-3 py-2 text-[10px] text-text-dim max-w-[200px] truncate" title={getRowReason(lst)}>
                  {getRowReason(lst)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-border bg-[rgba(251,146,60,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(251,146,60,0.15)] text-sm">🧹</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fb923c]">
              {hasPlotData ? "Cleaned & Plot Valuation Data" : "Cleaned & Normalized Data"}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim">{listings.length} valid records</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-[#fb923c] hover:text-[#fb923c]"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-border bg-bg-deep/30 px-4 py-2">
          <button
            onClick={() => setActiveTab("valid")}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${activeTab === "valid" ? "bg-success/15 text-success border border-success/30" : "text-text-dim hover:text-text-secondary hover:bg-bg-card/50"}`}
          >
            ✅ Valid ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("outliers")}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${activeTab === "outliers" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "text-text-dim hover:text-text-secondary hover:bg-bg-card/50"}`}
          >
            ⚠️ Outliers ({reviewListings.length})
          </button>
          <button
            onClick={() => setActiveTab("dropped")}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${activeTab === "dropped" ? "bg-danger/15 text-danger border border-danger/30" : "text-text-dim hover:text-text-secondary hover:bg-bg-card/50"}`}
          >
            ❌ Dropped ({droppedListings.length})
          </button>
        </div>

        {showPlotControls && onRecalculate && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-bg-deep/50 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim mr-2">Global Overrides:</span>
            <input
              type="number"
              step="0.1"
              placeholder="FSI"
              value={fsiGlobal}
              onChange={e => setFsiGlobal(e.target.value)}
              className="w-24 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
            />
            <input
              type="number"
              placeholder="CC (₹/sqft)"
              value={ccGlobal}
              onChange={e => setCcGlobal(e.target.value)}
              className="w-32 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
            />
            <div className="h-4 w-px bg-border mx-2" />
            <button
              onClick={() => onRecalculate(fsiGlobal, ccGlobal, rowOverrides)}
              className="rounded-lg bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 hover:bg-[#fb923c]/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
            >
              Apply All & Recalculate
            </button>
            {Object.keys(rowOverrides).length > 0 && (
              <button
                onClick={() => setRowOverrides({})}
                className="text-[10px] text-danger hover:underline font-bold uppercase ml-2"
              >
                Reset Edits
              </button>
            )}
          </div>
        )}

        {tableContent}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(251,146,60,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(251,146,60,0.15)] text-lg">🧹</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#fb923c]">
                    {hasPlotData ? "Normalized Listing & Plot Data" : "Normalized Listing Data"}
                  </h3>
                  {showPlotControls && onRecalculate && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3 shrink-0 mt-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim mr-2">Global Overrides:</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="FSI"
                        value={fsiGlobal}
                        onChange={e => setFsiGlobal(e.target.value)}
                        className="w-24 rounded-lg border border-border bg-bg-input px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
                      />
                      <input
                        type="number"
                        placeholder="CC (₹/sqft)"
                        value={ccGlobal}
                        onChange={e => setCcGlobal(e.target.value)}
                        className="w-32 rounded-lg border border-border bg-bg-input px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
                      />
                      <div className="h-4 w-px bg-border mx-2" />
                      <button
                        onClick={() => onRecalculate(fsiGlobal, ccGlobal, rowOverrides)}
                        className="rounded-lg bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 hover:bg-[#fb923c]/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
                      >
                        Apply All & Recalculate
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-text-dim">{listings.length} cleaned records</p>
                </div>
              </div>
              <button
                onClick={() => setIsMaximized(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* ── Tab Bar (maximized) ────────────────────── */}
              <div className="flex items-center gap-1 border-b border-border bg-bg-deep/30 px-4 py-2 shrink-0">
                <button
                  onClick={() => setActiveTab("valid")}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${activeTab === "valid" ? "bg-success/15 text-success border border-success/30" : "text-text-dim hover:text-text-secondary hover:bg-bg-card/50"}`}
                >
                  ✅ Valid ({listings.length})
                </button>
                <button
                  onClick={() => setActiveTab("outliers")}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${activeTab === "outliers" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "text-text-dim hover:text-text-secondary hover:bg-bg-card/50"}`}
                >
                  ⚠️ Outliers ({reviewListings.length})
                </button>
                <button
                  onClick={() => setActiveTab("dropped")}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${activeTab === "dropped" ? "bg-danger/15 text-danger border border-danger/30" : "text-text-dim hover:text-text-secondary hover:bg-bg-card/50"}`}
                >
                  ❌ Dropped ({droppedListings.length})
                </button>
              </div>

              {/* ── Table (full-width, scrollable) ─────────── */}
              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="w-full border border-border rounded-2xl overflow-hidden bg-bg-card">
                  {tableContent}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Factorial Rate Summary Table ─────────────────────────────────
function FactorialTable({ data, onCalculateRate, isCalculatingRate = false, canCalculateRate = true }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [showComparison, setShowComparison] = useState(false);

  if (!data || !data.table || data.table.length === 0) return null;

  const currency = data.currency || "INR";
  const areaUnit = data.area_unit || "sqft";

  // Truly universal formatter using Intl API
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  const fmt = (v) => (!v && v !== 0) ? "—" : formatter.format(v);

  const tableContent = (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <th className="px-4 py-3 font-semibold">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-4 py-3 font-semibold">Project</th>
            <th className="px-4 py-3 font-semibold text-center">Listings</th>
            <th className="px-4 py-3 font-semibold text-center">Road Type</th>
            <th className="px-4 py-3 font-semibold text-center">Nearby Amenities</th>
            <th className="px-4 py-3 font-semibold text-center">Nearest Commercial Hubs</th>
            <th className="px-4 py-3 font-semibold text-center">Built-up Density</th>
            <th className="px-4 py-3 font-semibold text-right">Avg Rate</th>
            <th className="px-4 py-3 font-semibold text-right">90% CI Lower</th>
            <th className="px-4 py-3 font-semibold text-right">90% CI Upper</th>
            <th className="px-4 py-3 font-semibold text-center">Rate Source</th>
          </tr>
        </thead>
        <tbody>
          {data.table.map((row, i) => {
            console.log("Factorial Row:", row);
            return (
              <Fragment key={`fact-${i}`}>
                <tr className={`border-b border-border/50 transition ${row.is_subject ? "bg-[rgba(167,139,250,0.10)] hover:bg-[rgba(167,139,250,0.16)]" : "hover:bg-[rgba(167,139,250,0.04)]"}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedForComparison.has(i)}
                      onChange={(e) => {
                        const next = new Set(selectedForComparison);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        setSelectedForComparison(next);
                      }}
                      className="h-3.5 w-3.5 rounded border-border accent-accent"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                    {row.project_name || "—"}
                    {row.is_subject && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-[rgba(167,139,250,0.18)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a78bfa] border border-[rgba(167,139,250,0.3)]">Subject</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-[rgba(167,139,250,0.12)] px-1.5 text-[11px] font-bold text-[#c4b5fd]">{row.listing_count}</span>
                  </td>
                  <td className="px-4 py-3 text-center"><RoadTypeBadge type={row.road_type} /></td>
                  <td className="px-4 py-3 text-left">
                    {(() => {
                      try {
                        let summary = row.amenity_summary;
                        if (typeof summary === 'string') summary = JSON.parse(summary);

                        let counts = summary?.counts;
                        if (typeof counts === 'string') counts = JSON.parse(counts);

                        if (!counts || typeof counts !== 'object') {
                          return <span className="text-text-dim block text-center">—</span>;
                        }

                        const dictStr = "{" + Object.entries(counts).map(([k, v]) => `'${k}': ${v}`).join(', ') + "}";

                        return (
                          <div className="group relative">
                            <div className="max-w-[200px] font-mono text-[9px] leading-relaxed text-text-dim bg-bg-deep/30 p-2 rounded-lg border border-border/30 break-words hover:text-accent hover:border-accent/30 transition-colors">
                              {dictStr}
                            </div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-header px-2 py-1 rounded text-[10px] border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                              Categorical Amenity Distribution
                            </div>
                          </div>
                        );
                      } catch (err) {
                        return <span className="text-red-500 text-[8px] block text-center">Err</span>;
                      }
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const cbds = row.cbd_data || [];
                      if (cbds.length === 0) return <span className="text-text-dim">—</span>;

                      return (
                        <div className="flex flex-col items-start gap-1.5 min-w-[140px] max-w-[180px]">
                          {cbds.slice(0, 3).map((cbd, idx) => (
                            <div key={idx} className="flex items-center gap-3 w-full justify-between border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                              <span
                                className="text-[9px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded px-1.5 py-0.5 whitespace-nowrap truncate"
                                title={cbd.name}
                              >
                                🏙 {cbd.short_name || cbd.name.split(',')[0]}
                              </span>
                              <span className="text-[9px] font-mono text-text-dim whitespace-nowrap">
                                {cbd.distance_km != null ? `${cbd.distance_km} km` : "N/A"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold ${row.builtup_density?.congestion?.level === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                      row.builtup_density?.congestion?.level === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                        row.builtup_density?.congestion?.level === 'LOW' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-dim'
                      }`}>
                      {row.builtup_density?.congestion?.score || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">{fmt(row.avg_rate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-dim">{fmt(row.ci_90_lower)}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-dim">{fmt(row.ci_90_upper)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.rate_derived_from === "micromarket" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/20" title="Rate derived from comparable projects average (±5% CI)">
                        Micromarket
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/20" title="Rate derived from actual listing data">
                        Listing
                      </span>
                    )}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-border bg-[rgba(167,139,250,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(167,139,250,0.15)] text-sm">📈</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a78bfa]">Comparable Project Metrics</span>
            <div className="ml-auto flex items-center gap-3">
              {selectedForComparison.size >= 2 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  Compare {selectedForComparison.size}
                </button>
              )}
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim">{data.table.length} projects · {data.total_valid} listings</span>
              <button onClick={() => setIsMaximized(true)} className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-[#a78bfa] hover:text-[#a78bfa]" title="Maximize Table">⛶</button>
            </div>
          </div>
        </div>
        {tableContent}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-light">Ready For Final Rate</p>
          <p className="mt-1 text-xs text-text-dim">Review the Comparable Project Metrics and map factors, then calculate the saleable-area rate.</p>
        </div>
        <button
          type="button"
          onClick={onCalculateRate}
          disabled={!canCalculateRate || isCalculatingRate}
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isCalculatingRate ? "Calculating..." : "Calculate Rate"}
        </button>
      </div>

      {showComparison && (
        <ComparisonModal
          projects={Array.from(selectedForComparison).map(i => data.table[i])}
          onClose={() => setShowComparison(false)}
        />
      )}
      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(167,139,250,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(167,139,250,0.15)] text-lg">📈</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#a78bfa]">Comparable Project Metrics</h3>
                  <p className="text-[10px] text-text-dim">{data.table.length} projects · {data.total_valid} listings · {currency}/{areaUnit}</p>
                </div>
              </div>
              <button onClick={() => setIsMaximized(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">{tableContent}</div>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}

// ── Final Valuation Result ─────────────────────────────────────
function ValuationResult({ data, currency = "INR" }) {
  const [confLevel, setConfLevel] = useState("95");
  const [showCalc, setShowCalc] = useState(false);

  if (!data) return null;

  const { mean_rate, std_dev, sample_size, sem, moe, critical_values } = data;
  const currentMoe = moe[confLevel] || 0;
  const currentCv = critical_values[confLevel] || 0;

  const lower = mean_rate - currentMoe;
  const upper = mean_rate + currentMoe;

  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[rgba(16,185,129,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom-2">
      <div className="border-b border-[rgba(16,185,129,0.16)] bg-[rgba(16,185,129,0.06)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.12)] text-lg text-[#10b981]">
              🎯
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#10b981]">
                Final Valuation
              </p>
              <p className="text-[10px] text-text-dim">
                Based on {sample_size} pooled comparable listings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-text-dim hidden sm:inline">Confidence:</span>
            <select
              value={confLevel}
              onChange={(e) => setConfLevel(e.target.value)}
              className="rounded-lg border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-xs font-bold text-[#10b981] outline-none cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition"
            >
              <option value="90" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>90%</option>
              <option value="95" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>95%</option>
              <option value="99" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>99%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-5 text-center">
        <p className="mb-1 text-xs text-text-secondary uppercase tracking-widest">Estimated Value / Sqft</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span className="text-3xl font-black tracking-tight text-white">{formatter.format(mean_rate)}</span>
          <span className="text-lg font-bold text-text-dim">± {formatter.format(currentMoe)}</span>
        </div>
        <p className="mt-3 text-sm font-bold text-[#10b981]">
          {formatter.format(lower)} <span className="text-text-dim mx-2 font-normal">—</span> {formatter.format(upper)}
        </p>
      </div>

      <div className="border-t border-white/5 bg-bg-deep/50 px-4 py-3">
        <button
          onClick={() => setShowCalc(!showCalc)}
          className="flex w-full items-center justify-between text-xs font-semibold text-text-dim hover:text-[#10b981] transition"
        >
          <span>View Calculation Breakdown</span>
          <span>{showCalc ? "▲" : "▼"}</span>
        </button>
        {showCalc && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-black/20 p-4 text-xs font-mono text-text-secondary animate-in fade-in duration-200">
            <div className="flex justify-between"><span className="text-text-dim">Sample Mean (x̄)</span> <span className="text-white">{formatter.format(mean_rate)}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Standard Deviation (s)</span> <span className="text-white">{formatter.format(std_dev)}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Sample Size (n)</span> <span className="text-white">{sample_size}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Standard Error (s / √n)</span> <span className="text-white">{formatter.format(sem)}</span></div>
            <div className="my-2 border-t border-dashed border-white/10" />
            <div className="flex justify-between"><span className="text-text-dim">{sample_size < 30 ? "T-Score" : "Z-Score"} ({confLevel}%)</span> <span className="text-white">{currentCv}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Margin of Error (CV × SE)</span> <span className="text-white">{formatter.format(currentMoe)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}



function FactoringResultCard({ data, area_unit, subjectData }) {
  const [maximizedFactor, setMaximizedFactor] = useState(null);
  const [isSectionMaximized, setIsSectionMaximized] = useState(false);
  if (!data) return null;

  const {
    methodology,
    subject_final_rate,
    subject_rate_range,
    valuation_details,
    confidence,
    raw_markdown_report,
  } = data;

  const currencyCode = subjectData?.currency || "INR";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });
  const formatterDec = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  });

  const fmtRate = (val) => val ? formatter.format(Number(val)) : "—";
  const fmt = (val) => val ? formatterDec.format(Number(val)) : "—";
  const fmtPct = (val) => val ? (Number(val) > 0 ? "+" : "") + Number(val).toFixed(2) + "%" : "0.00%";

  const rate = Number(subject_final_rate || 0);
  const area = Number(subjectData?.salable_area_sqft || subjectData?.carpet_area_sqft || subjectData?.builtup_area_sqft || subjectData?.plot_area_sqft || 0);
  const calculatedValue = rate * area;
  const rateBasis = "Saleable Area";
  const rateUnitLabel = `${area_unit || "sqft"} ${rateBasis.toLowerCase()}`;
  const adjColor = (val) => {
    const n = Number(val);
    if (n > 0) return "text-green-400";
    if (n < 0) return "text-red-400";
    return "text-text-dim";
  };
  const factorLabel = (factor) => {
    if (factor.toLowerCase().startsWith("cbd")) {
      return factor.replace(/cbd/i, "CBD").replace(/_/g, " ").replace(/\b\w/g, (c, i) => i === 0 && c.toLowerCase() === 'c' ? c.toUpperCase() : c.toUpperCase());
    }
    return factor.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const factorEntries = Object.entries(valuation_details?.factor_breakdown || {});
  const totalAdjustment = Number(valuation_details?.total_net_adjustment || 0);
  const adjustmentMultiplier = 1 + totalAdjustment / 100;
  const baseRateRange = valuation_details?.base_rate_range;
  const derivedRateRange = valuation_details?.derived_rate_range || subject_rate_range;

  const renderFactorTable = (factor, data, isFull = false) => {
    const subjectRow = data.projects?.find(p => p.role === "SUBJECT" || p.name.toLowerCase().includes("subject"));
    const compRows = data.projects?.filter(p => p !== subjectRow) || [];

    return (
      <div className={`overflow-hidden ${isFull ? "rounded-none" : "rounded-2xl border border-white/5 bg-black/40"}`}>
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="bg-white/[0.05] border-b border-white/10 text-text-dim uppercase tracking-widest font-black">
              <th className="px-6 py-4">Project Entity</th>
              <th className="px-6 py-4 text-center">Value</th>
              <th className="px-6 py-4">Interpretation</th>
              <th className="px-6 py-4 text-right">Adj.</th>
            </tr>
          </thead>
          <tbody>
            {subjectRow && (
              <tr className="bg-accent/10 border-b border-accent/20">
                <td className="px-6 py-4 text-white font-black flex items-center gap-3">
                  {subjectRow.name}
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent text-bg-deep font-black uppercase">Subject</span>
                </td>
                <td className="px-6 py-4 text-center text-white font-bold">{subjectRow.value}</td>
                <td className="px-6 py-4 text-text-secondary italic font-medium">{subjectRow.interpretation}</td>
                <td className="px-6 py-4 text-right text-[8px] font-black text-accent-light opacity-50 uppercase">Base</td>
              </tr>
            )}
            {compRows.map((p, i) => (
              <tr key={i} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-text-secondary font-bold">{p.name}</td>
                <td className="px-6 py-4 text-center text-text-dim font-mono">{p.value}</td>
                <td className="px-6 py-4 text-text-dim italic opacity-70 max-w-xs">{p.interpretation}</td>
                <td className={`px-6 py-4 text-right font-mono font-black ${adjColor(p.adjustment)}`}>{fmtPct(p.adjustment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const DashboardContent = (
    <div className={`mt-8 rounded-[2.5rem] border border-white/10 bg-[#0f172a]/90 shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${isSectionMaximized
        ? "fixed inset-0 z-[10000] m-4 md:m-12 rounded-[3rem] h-[calc(100vh-6rem)] overflow-y-auto border-accent/30 custom-scrollbar"
        : "overflow-hidden"
      }`}>
      {/* Detail Modal */}
      {maximizedFactor && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-bg-deep/95 p-4 md:p-12 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[3rem] border border-white/10 bg-[#0f172a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-10 py-8">
              <div className="flex items-center gap-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent text-2xl border border-accent/20">📊</span>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Factor Audit: {maximizedFactor.replace("_", " ")}</h3>
                  <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1">Detailed comparison & adjustment logic</p>
                </div>
              </div>
              <button onClick={() => setMaximizedFactor(null)} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 hover:bg-red-500/20 hover:text-red-400 text-3xl transition-all">×</button>
            </div>
            <div className="flex-1 overflow-auto p-10 custom-scrollbar">
              {renderFactorTable(maximizedFactor, valuation_details.factor_breakdown[maximizedFactor], true)}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-r from-accent/10 to-transparent px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-xl">🛡️</div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Professional Appraisal Summary</h2>
              <p className="text-[8px] text-text-dim mt-1 uppercase tracking-widest font-bold opacity-40">Audit-Ready Market Adjustment Report</p>
            </div>
          </div>
          <button
            onClick={() => setIsSectionMaximized(!isSectionMaximized)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-accent/20 hover:text-accent hover:border-accent/40 transition-all text-[8px] font-black uppercase tracking-widest"
          >
            {isSectionMaximized ? "Collapse Audit" : "Maximize Audit View"} ⛶
          </button>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {/* FACTORING SUMMARY TABLE — Enhanced */}
        <section>
          {/* Section Header */}
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-accent/20 blur-sm"></div>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/15 text-base">⚖️</span>
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-white">Market Adjustment Factors</h3>
                <p className="mt-0.5 text-[9px] font-semibold text-text-dim uppercase tracking-widest">Subject position vs. comparable market evidence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></span>
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-text-dim">Confidence</span>
                <span className={`text-[10px] font-black ${confidence === 'High' ? 'text-green-400' :
                  confidence === 'Low' ? 'text-red-400' : 'text-amber-400'
                  }`}>{confidence || "Medium"}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-text-dim">{factorEntries.length} factors</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-black/30 shadow-xl">
            {/* Column Headers */}
            <div className="grid grid-cols-[2fr_3fr_80px_120px_56px] border-b border-white/[0.06] bg-white/[0.03] px-2">
              {["Factor", "Subject vs Market", "Weight", "Net Impact", ""].map((h, i) => (
                <div key={i} className={`px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] text-white/30 ${i >= 2 ? 'text-right' : ''} ${i === 4 ? 'text-center' : ''}`}>{h}</div>
              ))}
            </div>

            {/* Factor Rows */}
            <div className="divide-y divide-white/[0.04]">
              {factorEntries.map(([factor, breakdown], rowIdx) => {
                const impact = Number(valuation_details?.net_impacts?.[factor] || 0);
                const weight = valuation_details?.attribute_weights?.[factor];
                const isPos = impact > 0;
                const isNeg = impact < 0;
                const barWidth = Math.min(Math.abs(impact) * 6, 100);

                return (
                  <div
                    key={factor}
                    className={`grid grid-cols-[2fr_3fr_80px_120px_56px] items-center px-2 transition-all duration-200 hover:bg-white/[0.025] ${rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.012]'
                      }`}
                  >
                    {/* Factor Name */}
                    <div className="flex items-center gap-2.5 px-3 py-4">
                      <div className={`h-9 w-[3px] rounded-full flex-shrink-0 ${isPos ? 'bg-gradient-to-b from-green-400 to-green-600' :
                        isNeg ? 'bg-gradient-to-b from-red-400 to-red-600' :
                          'bg-gradient-to-b from-white/20 to-white/5'
                        }`}></div>
                      <div>
                        <p className="text-[11px] font-black text-white/90 leading-tight">{factorLabel(factor)}</p>
                        <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/25">
                          {breakdown?.projects?.length || 0} observations
                        </p>
                      </div>
                    </div>

                    {/* Subject vs Avg */}
                    <div className="px-3 py-4">
                      <p className="text-[10px] leading-[1.6] text-white/50 line-clamp-2">
                        {breakdown?.subject_vs_avg || "Comparable evidence reviewed."}
                      </p>
                    </div>

                    {/* Weight */}
                    <div className="px-3 py-4 text-right">
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-bold text-white/50">
                        {weight != null ? Number(weight).toFixed(2) : "—"}
                      </span>
                    </div>

                    {/* Net Impact — bar + value */}
                    <div className="px-3 py-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[13px] font-black font-mono ${isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-white/30'
                          }`}>
                          {fmtPct(impact)}
                        </span>
                        <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isPos ? 'bg-gradient-to-r from-green-600 to-green-400' :
                              isNeg ? 'bg-gradient-to-r from-red-600 to-red-400' :
                                'bg-white/20'
                              }`}
                            style={{ width: `${barWidth}%`, marginLeft: isNeg ? 'auto' : undefined }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Audit Button */}
                    <div className="flex items-center justify-center px-2 py-4">
                      <button
                        onClick={() => setMaximizedFactor(factor)}
                        className="group flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] transition-all duration-200 hover:border-accent/50 hover:bg-accent/15 hover:shadow-[0_0_12px_rgba(167,139,250,0.2)]"
                        title={`Audit ${factorLabel(factor)}`}
                      >
                        <span className="group-hover:scale-110 transition-transform">🔍</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer — Total Correction */}
            <div className={`flex items-center justify-between border-t px-5 py-4 ${totalAdjustment >= 0
              ? 'border-green-500/20 bg-gradient-to-r from-green-500/[0.08] to-transparent'
              : 'border-red-500/20 bg-gradient-to-r from-red-500/[0.08] to-transparent'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/40">Total Correction Factor</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold text-white/30">{factorEntries.length} factors applied</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black font-mono ${totalAdjustment >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>{fmtPct(totalAdjustment)}</span>
                <span className={`rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${totalAdjustment >= 0
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'bg-red-500/15 text-red-400 border border-red-500/20'
                  }`}>{totalAdjustment >= 0 ? 'Premium' : 'Discount'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* EXECUTIVE VALUATION DERIVATION — Enhanced */}
        <section className="pt-4">
          <div className="relative mx-auto">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -inset-3 rounded-[3rem] bg-gradient-to-br from-accent/20 via-[#818cf8]/10 to-transparent blur-3xl opacity-60"></div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-[#13182e] to-[#0c1020] shadow-2xl">

              {/* Section label bar */}
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-8 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-lg bg-accent/30 blur"></div>
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 border border-accent/30 text-sm">🎯</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/40">Executive Valuation Derivation</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"></span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Derived</span>
                </div>
              </div>

              {/* Formula row */}
              <div className="flex flex-wrap items-stretch justify-center gap-0 border-b border-white/[0.05] px-8 py-8">
                {/* Base Rate block */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] px-8 py-5 min-w-[140px]">
                  <p className="mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Base Rate</p>
                  <p className="font-mono text-xl font-black text-white/80">{fmtRate(valuation_details?.base_rate)}</p>
                  <p className="mt-1 text-[8px] text-white/20">/ {rateUnitLabel}</p>
                </div>

                {/* Operator */}
                <div className="flex items-center px-5">
                  <span className="text-3xl font-black text-accent/50">×</span>
                </div>

                {/* Adjustment multiplier block */}
                <div className={`flex flex-col items-center justify-center rounded-2xl border px-8 py-5 min-w-[160px] ${totalAdjustment >= 0
                  ? 'border-green-500/20 bg-green-500/[0.05]'
                  : 'border-red-500/20 bg-red-500/[0.05]'
                  }`}>
                  <p className="mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Multiplier</p>
                  <p className={`font-mono text-xl font-black ${totalAdjustment >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {(1 + totalAdjustment / 100).toFixed(4)}
                  </p>
                  <p className={`mt-1 text-[9px] font-bold ${totalAdjustment >= 0 ? 'text-green-400/50' : 'text-red-400/50'
                    }`}>(1 {totalAdjustment >= 0 ? '+' : ''}{(totalAdjustment / 100).toFixed(4)})</p>
                </div>

                {/* Equals */}
                <div className="flex items-center px-5">
                  <span className="text-3xl font-black text-white/20">=</span>
                </div>

                {/* Final Rate block — hero */}
                <div className="relative flex flex-col items-center justify-center rounded-2xl border border-accent/25 bg-gradient-to-b from-accent/10 to-accent/[0.04] px-10 py-5 min-w-[180px] shadow-[0_0_30px_rgba(167,139,250,0.12)]">
                  <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-accent/20 to-transparent opacity-40"></div>
                  <p className="mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-accent/60">Final Rate</p>
                  <p className="font-mono text-3xl font-black text-white drop-shadow-[0_0_16px_rgba(167,139,250,0.5)]">{fmtRate(subject_final_rate)}</p>
                  <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-accent/40">/ {rateUnitLabel}</p>
                </div>

                {calculatedValue > 0 && (
                  <>
                    {/* Operator */}
                    <div className="flex items-center px-5">
                      <span className="text-3xl font-black text-white/20">×</span>
                    </div>

                    {/* Property Value block */}
                    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-green-500/25 bg-gradient-to-b from-green-500/10 to-green-500/[0.04] px-10 py-5 min-w-[180px] shadow-[0_0_30px_rgba(34,197,94,0.12)]">
                      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-green-500/20 to-transparent opacity-40"></div>
                      <p className="mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-green-400/60">Property Value</p>
                      <p className="font-mono text-3xl font-black text-white drop-shadow-[0_0_16px_rgba(34,197,94,0.5)]">{fmt(calculatedValue)}</p>
                      <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wider text-green-400/40">On Saleable Area</p>
                    </div>
                  </>
                )}
              </div>

              {/* Market Range gauge */}
              {subject_rate_range && (() => {
                const low = Number(subject_rate_range.low || 0);
                const high = Number(subject_rate_range.high || 1);
                const final = Number(subject_final_rate || 0);
                const pct = high > low ? Math.min(100, Math.max(0, ((final - low) / (high - low)) * 100)) : 50;
                return (
                  <div className="px-8 py-6">
                    <p className="mb-4 text-[8px] font-black uppercase tracking-[0.3em] text-white/25">Market Rate Positioning</p>
                    <div className="relative">
                      {/* Track */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500/30 via-amber-400/30 to-green-500/30">
                        {/* Fill */}
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-400/60 via-amber-400/70 to-green-400/80 transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      {/* Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${pct}%` }}
                      >
                        <div className="h-4 w-4 rounded-full border-2 border-accent bg-[#13182e] shadow-[0_0_10px_rgba(167,139,250,0.6)]"></div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[8px] font-black uppercase tracking-widest text-red-400/60">Market Low</p>
                        <p className="font-mono text-xs font-black text-white/50">{fmtRate(low)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-accent/50">Subject Rate</p>
                        <p className="font-mono text-[11px] font-black text-accent">{fmtRate(final)}</p>
                        <p className="text-[7px] text-white/20 mt-0.5">{pct.toFixed(0)}th percentile</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-widest text-green-400/60">Market High</p>
                        <p className="font-mono text-xs font-black text-white/50">{fmtRate(high)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {area > 0 && (
                <div className="relative border-t border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-8 text-center space-y-3">
                  <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-accent/20 to-transparent blur-2xl opacity-40"></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-accent/70">Final Market Approach Property Value</span>

                  <div className="space-y-1">
                    <h1 className="font-mono text-4xl font-black text-white drop-shadow-[0_0_16px_rgba(167,139,250,0.4)]">
                      {fmt(calculatedValue)}
                    </h1>
                    <p className="text-[9px] text-accent/60 font-semibold uppercase tracking-widest">
                      Derived Rate {fmtRate(rate)}/sqft × Subject Area {area.toLocaleString()} sqft
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {raw_markdown_report && (
          <section className="pt-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg">🧾</span>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">ReAct Reasoning Report</h3>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap break-words p-6 text-[11px] leading-6 text-text-secondary custom-scrollbar">{raw_markdown_report}</pre>
            </div>
          </section>
        )}
      </div>
    </div>
  );

  if (isSectionMaximized && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-bg-deep/95 backdrop-blur-2xl p-4 md:p-8 flex items-center justify-center animate-in fade-in duration-300">
        <div className="w-full h-full">
          {DashboardContent}
        </div>
      </div>,
      document.body
    );
  }

  return DashboardContent;
}

// ── Cost Approach Inputs Form ────────────────────────────────────
function CostInputsForm({ schema, values, onChange, onSubmit, isCalculating, subjectData }) {
  if (!schema) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-warning/20 bg-[#0f172a]/95 shadow-2xl backdrop-blur-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/20 text-warning text-xl border border-warning/30">
          🏗️
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Cost Approach Parameters</h3>
          <p className="text-[8px] text-text-dim mt-0.5 uppercase tracking-widest font-bold opacity-50">Please enter cost-specific details for subject project</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {schema.inputs?.map((inp) => {
          let label = inp.label;
          let placeholder = inp.placeholder || inp.default || 0;
          if (inp.field === "construction_rate_per_sqft") {
            const sym = getCurrencySymbol(subjectData?.currency);
            label = `Construction Rate per sqft (${sym})`;
          } else if (inp.field === "total_life_of_building") {
            label = "Economic Life (Years)";
            placeholder = 60;
          } else if (inp.field === "age_of_property") {
            label = "Age of Property (Years)";
          }

          let helpText = inp.help;
          if (inp.field === "construction_rate_per_sqft") {
            const propType = (subjectData?.property_type || "").toLowerCase();
            if (propType === "apartment" || propType === "retail" || propType === "commercial_office") {
              helpText = "Remark: Please enter construction cost per sqft on Salable Area.";
            } else if (propType === "villa") {
              helpText = "Remark: Please enter construction cost per sqft on Built-up Area.";
            }
          }

          return (
            <label key={inp.field} className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                {label}
              </span>
              <input
                type="number"
                value={values[inp.field] !== undefined ? values[inp.field] : ""}
                onChange={(e) => onChange(inp.field, e.target.value)}
                placeholder={`e.g. ${placeholder}`}
                className="rounded-xl border border-border bg-white/[0.03] px-3.5 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/[0.05]"
              />
              {helpText && (
                <span className="pl-1 text-[9px] text-warning/80 font-semibold leading-relaxed">{helpText}</span>
              )}
            </label>
          );
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={isCalculating}
        className="w-full rounded-2xl bg-gradient-to-r from-warning to-amber-500 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-bg-deep shadow-lg shadow-warning/10 transition duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
      >
        {isCalculating ? "Calculating Cost Valuation..." : "Execute Cost Approach Calculation"}
      </button>
    </div>
  );
}

// ── Cost Result Card ─────────────────────────────────────────────
function CostResultCard({ data, subjectData }) {
  const [isSectionMaximized, setIsSectionMaximized] = useState(false);
  if (!data) return null;

  const derived_rate_per_sqft = data.inputs?.derived_rate_per_sqft;
  const area_sqft = data.inputs?.area_sqft;
  const area_label = data.inputs?.area_label || data.area_label || "Area";
  const construction_rate_per_sqft = data.inputs?.construction_rate_per_sqft;
  const age_of_property = data.inputs?.age_of_property;
  const total_life_of_building = data.inputs?.total_life_of_building;

  const property_price = data.calculations?.property_price;
  const construction_cost = data.calculations?.construction_cost;
  const depreciation_rate = (data.calculations?.depreciation_rate_pct || 0) / 100;
  const depreciation_amount = data.calculations?.depreciated_construction_cost;

  const final_property_value = data.result?.cost_value;
  const property_type = data.property_type;

  const audit_trail = {
    property_price_formula: data.formula_audit?.step_1,
    construction_cost_formula: data.formula_audit?.step_2,
    depreciation_formula: data.formula_audit?.step_3,
    depreciated_cost_formula: data.formula_audit?.step_4,
    final_value_formula: data.formula_audit?.step_5,
  };

  const currencyCode = subjectData?.currency || "INR";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });

  const fmt = (val) => val != null ? formatter.format(Number(val)) : "—";
  const fmtRate = (val) => val != null ? formatter.format(Number(val)) : "—";

  const DashboardContent = (
    <div className={`mt-8 rounded-[2.5rem] border border-success/20 bg-[#0f172a]/95 shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${isSectionMaximized
        ? "fixed inset-0 z-[10000] m-4 md:m-12 rounded-[3rem] h-[calc(100vh-6rem)] overflow-y-auto border-success/40 custom-scrollbar"
        : "overflow-hidden"
      }`}>
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-r from-success/10 to-transparent px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20 text-success text-xl border border-success/30">🛡️</div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Cost Approach Valuation Appraisal</h2>
              <p className="text-[8px] text-text-dim mt-1 uppercase tracking-widest font-bold opacity-40">Audit-Backed Cost-Depreciation Method</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSectionMaximized(!isSectionMaximized)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-success/20 hover:text-success hover:border-success/40 transition-all text-[8px] font-black uppercase tracking-widest text-white/70"
            >
              {isSectionMaximized ? "Collapse Audit" : "Maximize Audit View"} ⛶
            </button>
            <div className="flex items-center gap-1.5 rounded-xl border border-success/20 bg-success/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-success">Verified Audit</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <section className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-white">Appraisal Step Calculation Audit</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Step 1 */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 1: Base Property Valuation</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Property Price</p>
                  <p className="text-2xl font-black text-sky-400 font-mono leading-none">{fmt(property_price)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-white/55">Valuation Base:</p>
                <p className="font-mono text-white/80 leading-relaxed">
                  Derived rate: {fmtRate(derived_rate_per_sqft)}/sqft × {area_sqft} sqft salable area
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 2: Replacement Construction Cost</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Construction Cost</p>
                  <p className="text-2xl font-black text-teal-400 font-mono leading-none">{fmt(construction_cost)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-teal-400/55">Formula & Inputs:</p>
                <p className="font-mono text-teal-400/90 leading-relaxed font-bold">
                  {audit_trail?.construction_cost_formula || `Construction Cost = ${fmtRate(construction_rate_per_sqft)}/sqft × ${area_sqft} sqft (${area_label})`}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 3: Straight-Line Depreciation Rate</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Depreciation %</p>
                  <p className="text-2xl font-black text-warning font-mono leading-none">{(depreciation_rate * 100).toFixed(2)}%</p>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-warning/55">Formula:</p>
                <p className="font-mono text-warning/90 leading-relaxed">
                  {audit_trail?.depreciation_formula || `Depreciation = ${age_of_property} yrs / ${total_life_of_building} yrs = ${(depreciation_rate * 100).toFixed(2)}%`}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 4: Depreciated Construction Value</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Amount Deducted</p>
                  <p className="text-2xl font-black text-red-400 font-mono leading-none">−{fmt(depreciation_amount)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3 text-[10px] text-text-secondary space-y-2">
                <div>
                  <p className="font-mono text-red-400/80 leading-relaxed">{audit_trail?.depreciation_formula || `Depreciation = ${age_of_property} yrs / ${total_life_of_building} yrs = ${(depreciation_rate * 100).toFixed(2)}%`}</p>
                </div>
                <div className="border-t border-white/5 pt-1.5">
                  <p className="font-semibold text-red-400/55">Calculation:</p>
                  <p className="font-mono text-red-400/90 font-bold leading-relaxed">
                    {fmt(construction_cost)} × {(depreciation_rate * 100).toFixed(2)}% = {fmt(depreciation_amount)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="relative">
          <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-success/20 to-transparent blur-2xl opacity-40"></div>

          <div className="relative overflow-hidden rounded-[2rem] border border-success/30 bg-gradient-to-b from-[#13241d] to-[#0c1410] p-8 text-center space-y-4 shadow-2xl">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-success/70">Final Cost Approach Property Value</span>

            <div className="space-y-1">
              <h1 className="font-mono text-5xl font-black text-white drop-shadow-[0_0_24px_rgba(34,197,94,0.5)]">
                {fmt(final_property_value)}
              </h1>
              <p className="text-[10px] text-success/60 font-semibold uppercase tracking-widest">
                Market Value − Depreciated Construction Cost
              </p>
            </div>

            <div className="border-t border-success/10 pt-4 max-w-lg mx-auto">
              <p className="text-[9px] font-mono text-white/55 leading-relaxed">
                Appraisal Audit Trail:<br />
                <span className="text-white/80 font-bold">{audit_trail?.final_value_formula || `Cost Value = ${fmt(property_price)} − ${fmt(depreciation_amount)} = ${fmt(final_property_value)}`}</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  if (isSectionMaximized && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-bg-deep/95 backdrop-blur-2xl p-4 md:p-8 flex items-center justify-center animate-in fade-in duration-300">
        <div className="w-full h-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          {DashboardContent}
        </div>
      </div>,
      document.body
    );
  }

  return DashboardContent;
}

export default function ChatSectionNext({ onEvent, onClear, onMarkersUpdate, factorialData: externalFactorialData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingNote, setStreamingNote] = useState("");
  const [tokenStats, setTokenStats] = useState({
    total_tokens: 0,
    cost_usd: 0,
    model_breakdown: {},
    tool_breakdown: {}
  });
  const [showTokenBreakdown, setShowTokenBreakdown] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [clarificationPrompt, setClarificationPrompt] = useState("");
  const [clarificationFields, setClarificationFields] = useState([]);
  const [clarificationValues, setClarificationValues] = useState({});
  const [mapConfirmation, setMapConfirmation] = useState(null);
  const [approachChoiceNeeded, setApproachChoiceNeeded] = useState(null);
  const [extractionVerification, setExtractionVerification] = useState(null);
  const [comparableData, setComparableData] = useState(null);
  const [selectedComps, setSelectedComps] = useState(new Set());
  const [dbNoResults, setDbNoResults] = useState(false);
  const [subjectData, setSubjectData] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [dbTransactions, setDbTransactions] = useState([]); // transactions from Internal DB comparables
  const [isListingStreaming, setIsListingStreaming] = useState(false);
  const [cleanedData, setCleanedData] = useState(null);
  const [isCleaningStreaming, setIsCleaningStreaming] = useState(false);
  const [factorialData, setFactorialData] = useState(null);
  const [isFactorialStreaming, setIsFactorialStreaming] = useState(false);
  const [factorialAnalysisData, setFactorialAnalysisData] = useState(null);
  const [isFactorialAnalysisStreaming, setIsFactorialAnalysisStreaming] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [currentStage, setCurrentStage] = useState("Stage 0: Initialization");

  // Cost Approach States
  const [costInputsSchema, setCostInputsSchema] = useState(null);
  const [costInputsValues, setCostInputsValues] = useState({});
  const [costCalculationData, setCostCalculationData] = useState(null);
  const [isCostCalculating, setIsCostCalculating] = useState(false);

  // Special Factorial Analysis State
  const [showSpecialForm, setShowSpecialForm] = useState(false);
  const [specialSubjectName, setSpecialSubjectName] = useState("Lodha Altamount");
  const [specialSubjectLat, setSpecialSubjectLat] = useState("18.974");
  const [specialSubjectLng, setSpecialSubjectLng] = useState("72.810");
  const [specialCompName, setSpecialCompName] = useState("Rustomjee Crown");
  const [specialCompLat, setSpecialCompLat] = useState("19.018");
  const [specialCompLng, setSpecialCompLng] = useState("72.827");

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const markersRef = useRef([]);
  const subjectDataRef = useRef(null);

  const selectedComparablePayload = () => {
    if (!comparableData) return [];
    return Array.from(selectedComps).map((i) => comparableData[i]).filter(Boolean);
  };

  const handleCalculateRate = (factData) => {
    submitFactorialAnalysis(factData || factorialData, subjectData, selectedComparablePayload());
  };

  const handleCostCalculate = async () => {
    if (isCostCalculating || !subjectData || !factorialAnalysisData) return;

    setIsCostCalculating(true);
    setStreamingNote("Sending inputs to Cost Approach Engine...");

    const derivedRate = factorialAnalysisData.subject_final_rate || 0;
    const areaSqft = subjectData?.salable_area_sqft || subjectData?.carpet_area_sqft || subjectData?.builtup_area_sqft || subjectData?.plot_area_sqft || 1000;

    const payload = {
      derived_rate_per_sqft: Number(derivedRate),
      area_sqft: Number(areaSqft),
      property_type: subjectData.property_type || "apartment",
      construction_rate_per_sqft: Number(costInputsValues.construction_rate_per_sqft || 0),
      total_life_of_building: Number(costInputsValues.total_life_of_building || 60),
      age_of_property: Number(costInputsValues.age_of_property || 0),
    };

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Run Cost Approach calculation. Construction Rate: ₹${payload.construction_rate_per_sqft}/sqft, Age: ${payload.age_of_property} yrs, Economic Life: ${payload.total_life_of_building} yrs.`, meta: "Now" },
      { role: "assistant", content: "Calculating depreciated property value...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/cost_calculation_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Cost calculation failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "cost_calculation_start") summary = event.content?.message || "Running Cost Approach calculations...";
          else if (event.type === "cost_calculation_result") summary = `🛡️ Cost Approach calculated.`;
          else if (event.type === "cost_calculation_done") summary = "Cost Approach calculation complete.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "cost_calculation_result") {
            setCostCalculationData(event.content);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cost calculation results",
                  cost_calculation_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "cost_calculation_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "cost calculation done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Cost calculation error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCostCalculating(false);
      setStreamingNote("");
    }
  };

  useEffect(() => {
    setFactorialData(externalFactorialData);
    if (externalFactorialData) {
      setMessages(prev => prev.map(msg => {
        if (msg.meta === "factorial results" || (msg.factorial_data && msg.factorial_data.table)) {
          return { ...msg, factorial_data: externalFactorialData };
        }
        return msg;
      }));
    }
  }, [externalFactorialData]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingNote]);

  const clearInteractiveState = () => {
    setClarificationPrompt("");
    setClarificationFields([]);
    setClarificationValues({});
    setMapConfirmation(null);
    setApproachChoiceNeeded(null);
    setExtractionVerification(null);
    setComparableData(null);
    setSelectedComps(new Set());
    setDbNoResults(false);
    setSubjectData(null);
    setListingData(null);
    setDbTransactions([]);
    setCleanedData(null);
    setFactorialData(null);
    setFactorialAnalysisData(null);
    setCostInputsSchema(null);
    setCostInputsValues({});
    setCostCalculationData(null);
    setIsCostCalculating(false);
    setPipelineDone(false);
    setCurrentStage("Stage 0: Initialization");
    markersRef.current = [];
    onMarkersUpdate?.([]);
  };

  // ── Toggle comparable selection ────────────────────────────────
  const handleCompToggle = (index, checked) => {
    setSelectedComps((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  // ── Synchronize markers when state changes ────────────────────
  useEffect(() => {
    let allMarkers = [];

    // 1. Subject from subjectData
    if (subjectData?.lat && subjectData?.lng) {
      allMarkers.push({
        lat: subjectData.lat,
        lng: subjectData.lng,
        label: subjectData.project_name || "Subject",
        source: "subject"
      });
    }

    // 2. Comparables from comparableData
    if (comparableData) {
      const toolMarkers = comparableData
        .filter((c, index) => selectedComps.has(index))
        .filter(c => c.map_search_lat && c.map_search_lng && !isNaN(Number(c.map_search_lat)))
        .map(c => ({
          lat: Number(c.map_search_lat),
          lng: Number(c.map_search_lng),
          label: c.project_name || "Comparable",
          source: "comparable"
        }));
      allMarkers = [...allMarkers, ...toolMarkers];
    }


    markersRef.current = allMarkers;
    onMarkersUpdate?.(allMarkers);
  }, [subjectData, comparableData, selectedComps, factorialData]);

  // ── Proceed to Listing Fetch (Step 2) ──────────────────────────
  const submitListingFetch = async () => {
    if (!comparableData || selectedComps.size === 0 || !subjectData || isListingStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);

    // Split by source
    const dbComps  = selected.filter(c => (c.data_source || "Web") === "Internal DB");
    const webComps = selected.filter(c => (c.data_source || "Web") !== "Internal DB");

    // If subject project exists in internal DB, also fetch its transactions
    const subjectDbProject = subjectData?.subject_db_project || null;

    setIsListingStreaming(true);
    setStreamingNote("Starting listing fetch pipeline...");
    setCurrentStage("Stage 3: Market Approach (Listing Fetch)");

    const totalDbFetches = dbComps.length + (subjectDbProject ? 1 : 0);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Proceed with ${selected.length} selected comparable(s) — ${totalDbFetches} from Internal DB, ${webComps.length} from Web.`, meta: "Now" },
      { role: "assistant", content: "Running listing pipeline...", meta: "Live" },
    ]);

    try {
      // ── 1. Fetch transactions for each Internal DB comparable ──────────
      const allDbTransactions = [];
      for (const comp of dbComps) {
        const projId = comp.project_id || comp.id || comp.project_name;
        const propType = comp.property_type || subjectData.property_type || "apartment";
        if (!projId) continue;

        setStreamingNote(`🗄️ Fetching DB transactions for "${comp.project_name}"...`);
        try {
          const res = await fetch(apiUrl("/transaction_stream"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: String(projId),
              property_type: propType,
              project_name: comp.project_name || "",
            }),
          });
          if (!res.ok || !res.body) continue;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const chunks = buf.split("\n\n");
            buf = chunks.pop() || "";
            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const ev = JSON.parse(chunk.slice(6));
              onEvent?.(ev);
              if (ev.type === "transaction_results") {
                allDbTransactions.push(...(ev.content?.transactions || []));
                setStreamingNote(`✅ Got ${ev.content?.total || 0} transactions for "${comp.project_name}"`);
              }
            }
          }
        } catch (e) {
          console.warn("DB transaction fetch failed for", comp.project_name, e);
        }
      }

      // Also fetch subject's own DB transactions if it was found in the internal DB
      if (subjectDbProject) {
        const projId = subjectDbProject.project_id || subjectDbProject.id || subjectDbProject.project_name;
        const propType = subjectDbProject.property_type || subjectData.property_type || "apartment";
        if (projId) {
          setStreamingNote(`🗄️ Fetching DB transactions for subject "${subjectDbProject.project_name}"...`);
          try {
            const res = await fetch(apiUrl("/transaction_stream"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: String(projId),
                property_type: propType,
                project_name: subjectDbProject.project_name || "",
              }),
            });
            if (res.ok && res.body) {
              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buf = "";
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const chunks = buf.split("\n\n");
                buf = chunks.pop() || "";
                for (const chunk of chunks) {
                  if (!chunk.startsWith("data: ")) continue;
                  const ev = JSON.parse(chunk.slice(6));
                  onEvent?.(ev);
                  if (ev.type === "transaction_results") {
                    // Mark subject transactions with is_subject flag
                    const subjectTx = (ev.content?.transactions || []).map(t => ({ ...t, is_subject: true }));
                    allDbTransactions.push(...subjectTx);
                    setStreamingNote(`✅ Got ${ev.content?.total || 0} subject transactions from Internal DB`);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("DB transaction fetch failed for subject", subjectDbProject.project_name, e);
          }
        }
      }

      // Store DB transactions and stamp on the message
      if (allDbTransactions.length > 0) {
        setDbTransactions(allDbTransactions);
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = {
              ...next[lastIndex],
              db_transactions: allDbTransactions,
            };
          }
          return next;
        });
      }

      // ── 2. Fetch web listings for Web comparables ──────────────────────
      if (webComps.length > 0) {
        setStreamingNote(`🌐 Fetching web listings for ${webComps.length} web comparable(s)...`);
        const response = await fetch(apiUrl("/listing_stream"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subjectData,
            selected_comparables: webComps,
            property_type: subjectData.property_type || "apartment",
          }),
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const event = JSON.parse(chunk.slice(6));
              onEvent?.(event);
              const summary = summarizeEvent(event);
              setStreamingNote(summary);

              if (event.type === "listing_results") {
                const listings = event.content?.listings || [];
                const newUsage = event.content?.token_usage || {};
                const total = newUsage.total_tokens || 0;
                const model = newUsage.model || "gpt-4o-mini";
                setListingData(listings);
                setTokenStats((prev) => {
                  const next = { ...prev };
                  next.total_tokens += total;
                  if (!next.model_breakdown[model]) next.model_breakdown[model] = { prompt: 0, completion: 0, total: 0 };
                  next.model_breakdown[model].prompt += (newUsage.prompt_tokens || 0);
                  next.model_breakdown[model].completion += (newUsage.completion_tokens || 0);
                  next.model_breakdown[model].total += total;
                  next.cost_usd = (next.cost_usd || 0) + ((newUsage.prompt_tokens || 0) / 1000000 * 0.15) + ((newUsage.completion_tokens || 0) / 1000000 * 0.60);
                  return next;
                });
                setMessages((prev) => {
                  const next = [...prev];
                  const lastIndex = next.length - 1;
                  if (lastIndex >= 0) {
                    next[lastIndex] = {
                      ...next[lastIndex],
                      role: "assistant",
                      content: summary,
                      meta: "listing results",
                      listings,
                      // Preserve any DB transactions stamped in the same message
                      db_transactions: next[lastIndex].db_transactions || [],
                    };
                  }
                  return next;
                });
              }

              if (event.type === "listing_done" || event.type === "error") {
                setMessages((prev) => {
                  const next = [...prev];
                  const lastIndex = next.length - 1;
                  if (lastIndex >= 0 && !next[lastIndex].listings) {
                    next[lastIndex] = { ...next[lastIndex], role: "assistant", content: summary, meta: event.type === "error" ? "error" : "listing done" };
                  }
                  return next;
                });
              }
            }
          }
        }
      } else if (allDbTransactions.length > 0) {
        // Only DB comparables were selected — update meta
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = { ...next[lastIndex], role: "assistant", content: `✅ Fetched ${allDbTransactions.length} transaction(s) from Internal DB.`, meta: "listing results" };
          }
          return next;
        });
        // Set listingData to empty array so the "Proceed to Cleaning" CTA appears
        setListingData([]);
      }

    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], role: "assistant", content: `Listing fetch error: ${error.message}`, meta: "Error" };
        }
        return next;
      });
    } finally {
      setIsListingStreaming(false);
      setStreamingNote("");
    }
  };

  // ── Proceed to Data Cleaning (Step 3) ──────────────────────────
  const submitCleaning = async () => {
    // Trigger if we have web listings OR db transactions (or both)
    const hasWebListings = listingData && listingData.length > 0;
    const hasDbTx = dbTransactions && dbTransactions.length > 0;
    if ((!hasWebListings && !hasDbTx) || !subjectData || isCleaningStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);
    const webCount = (listingData || []).length;
    const dbCount  = dbTransactions.length;

    setIsCleaningStreaming(true);
    setStreamingNote("Starting data cleaning pipeline...");
    setCurrentStage("Stage 3: Market Approach (Data Cleaning)");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Proceed to clean ${webCount} web listing(s) and merge with ${dbCount} Internal DB transaction(s).`,
        meta: "Now",
      },
      { role: "assistant", content: "Running smart data cleaning pipeline...", meta: "Live" },
    ]);


    try {
      const response = await fetch(apiUrl("/cleaning_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings: listingData || [],          // web listings only — cleaning applies here
          subject: subjectData,
          comparables: selected,
          property_type: subjectData.property_type || "apartment",
          db_transactions: dbTransactions,      // passed through as-is, merged after cleaning
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Cleaning request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "cleaning_start") summary = event.content?.message || "Starting data cleaning...";
          else if (event.type === "cleaning_progress") summary = `🧹 Cleaning: ${event.content?.detail || event.content?.stage}`;
          else if (event.type === "cleaning_results") {
            const webCnt = event.content?.web_count ?? (event.content?.cleaned_listings?.length || 0);
            const dbCnt  = event.content?.db_count  ?? 0;
            summary = `✅ Cleaning complete: ${webCnt} web listing(s) + ${dbCnt} Internal DB transaction(s) merged.`;
          }
          else if (event.type === "cleaning_done") summary = "Data cleaning pipeline finished.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "cleaning_results") {
            const cleanedListings = event.content?.cleaned_listings || [];
            const reviewListings = event.content?.review_listings || [];
            const droppedListings = event.content?.dropped_listings || [];
            const auditStats = event.content?.audit_stats || {};
            const newUsage = auditStats.token_usage || {};
            const total = newUsage.total_tokens || 0;
            const model = "gpt-4o-mini";

            setCleanedData(cleanedListings);
            setTokenStats((prev) => {
              const next = { ...prev };
              next.total_tokens += total;
              if (!next.model_breakdown[model]) {
                next.model_breakdown[model] = { prompt: 0, completion: 0, total: 0 };
              }
              next.model_breakdown[model].prompt += (newUsage.prompt_tokens || 0);
              next.model_breakdown[model].completion += (newUsage.completion_tokens || 0);
              next.model_breakdown[model].total += total;

              const addedCost = ((newUsage.prompt_tokens || 0) / 1000000 * 0.15) + ((newUsage.completion_tokens || 0) / 1000000 * 0.60);
              next.cost_usd = (next.cost_usd || 0) + addedCost;
              return next;
            });

            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cleaning results",
                  cleaned_listings: cleanedListings,
                  review_listings: reviewListings,
                  dropped_listings: droppedListings,
                };
              }
              return next;
            });
          }

          if (event.type === "cleaning_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "cleaning done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Cleaning fetch error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCleaningStreaming(false);
      setStreamingNote("");
    }
  };


  // ── Handle Plot Rate Recalculation (Overrides) ─────────────────
  const handleRecalculatePlotRates = async (fsiGlobal, ccGlobal, rowOverrides = {}) => {
    if (!cleanedData || cleanedData.length === 0 || !subjectData || isCleaningStreaming) return;

    setIsCleaningStreaming(true);
    setStreamingNote("Recalculating plot rates with overrides...");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Recalculate plot rates with manual adjustments.`, meta: "Now" },
      { role: "assistant", content: "Applying user overrides and recalculating...", meta: "Live" },
    ]);

    try {
      const payload = {
        cleaned_listings: cleanedData,
        subject: subjectData,
        property_type: subjectData.property_type || "plot",
        overrides: rowOverrides,
      };
      if (fsiGlobal && !isNaN(parseFloat(fsiGlobal))) payload.fsi_override = parseFloat(fsiGlobal);
      if (ccGlobal && !isNaN(parseFloat(ccGlobal))) payload.cc_override = parseFloat(ccGlobal);

      const response = await fetch(apiUrl("/recalculate_plot_rates_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Recalculate request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newCleanedListings = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "recalculate_start") summary = event.content || "Recalculating plot rates...";
          else if (event.type === "recalculate_results") {
            summary = `Recalculation ready — ${event.content?.listings?.length || 0} listings.`;
            newCleanedListings = event.content.listings;
          }
          else if (event.type === "recalculate_done") summary = "Plot rate recalculation complete.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "recalculate_results" && event.content?.listings) {
            setCleanedData(event.content.listings);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cleaning results",
                  cleaned_listings: event.content.listings,
                };
              }
              return next;
            });
          }

          if (event.type === "recalculate_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "recalculation done",
                };
              }
              return next;
            });
          }
        }
      }

      if (newCleanedListings) {
        setFactorialData(null);
        setFactorialAnalysisData(null);
      }

    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Recalculate error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCleaningStreaming(false);
      setStreamingNote("");
    }
  };


  // ── Proceed to Factorial Table (Step 4) ────────────────────────
  const submitFactorial = async () => {
    if (!cleanedData || cleanedData.length === 0 || !subjectData || isFactorialStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);

    setIsFactorialStreaming(true);
    setStreamingNote("Computing factorial rate table...");
    setCurrentStage("Stage 4: Factorial Rate Table");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Generate factorial rate table from ${cleanedData.length} cleaned listings.`, meta: "Now" },
      { role: "assistant", content: "Computing rate statistics...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaned_listings: cleanedData,
          subject: subjectData,
          comparables: selected,
          currency: subjectData.currency,
          area_unit: subjectData.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Factorial request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          console.log("SSE EVENT:", event);
          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_start") summary = event.content?.message || "Computing factorial table...";
          else if (event.type === "factorial_results") summary = `📈 Factorial table ready — ${event.content?.table?.length || 0} projects.`;
          else if (event.type === "factorial_done") summary = "Factorial rate table generated.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_results") {
            setFactorialData(event.content);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial results",
                  factorial_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Factorial table error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialStreaming(false);
      setStreamingNote("");
    }
  };

  const submitFactorialAnalysis = async (factData, subject, comps) => {
    if (!factData || !subject || isFactorialAnalysisStreaming) return;

    setIsFactorialAnalysisStreaming(true);
    setStreamingNote("Sending factorial data to LLM for adjustment analysis...");
    setCurrentStage("Stage 5: LLM Factorial Analysis");

    setMessages((prev) => {
      const existingIndex = prev.findIndex(m =>
        m.meta === "factorial analysis results" ||
        m.meta === "factorial analysis done" ||
        m.meta === "factorial analysis start" ||
        m.content === "Running LLM Factoring..."
      );

      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { role: "assistant", content: "Running LLM Factoring...", meta: "Live" };
        return next;
      }
      return [
        ...prev,
        { role: "assistant", content: "Running LLM Factoring...", meta: "Live" }
      ];
    });

    try {
      const response = await fetch(apiUrl("/factorial_analysis_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorial_data: factData,
          subject: subject,
          comparables: comps,
          radii: { road_m: 200, amenity_m: 2000, density_m: 500 }
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`LLM Factoring request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_analysis_start") summary = event.content?.message || "Running LLM factoring analysis...";
          else if (event.type === "factorial_analysis_result") summary = `🤖 LLM Factoring ready.`;
          else if (event.type === "factorial_analysis_done") summary = "LLM Factoring completed.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_analysis_result") {
            setFactorialAnalysisData(event.content);

            // Handle audit stats
            const usage = event.content?._token_usage;
            if (usage) {
              const total = usage.total_tokens || 0;
              const model = usage.model || "gpt-4o";
              setTokenStats((prev) => {
                const next = { ...prev };
                next.total_tokens += total;
                if (!next.model_breakdown[model]) {
                  next.model_breakdown[model] = { prompt: 0, completion: 0, total: 0 };
                }
                next.model_breakdown[model].prompt += (usage.prompt_tokens || 0);
                next.model_breakdown[model].completion += (usage.completion_tokens || 0);
                next.model_breakdown[model].total += total;

                // Stage 5 cost (GPT-4o) - $5/1M input, $15/1M output
                const addedCost = ((usage.prompt_tokens || 0) / 1000000 * 5.00) + ((usage.completion_tokens || 0) / 1000000 * 15.00);
                next.cost_usd = (next.cost_usd || 0) + addedCost;

                // Track current stage
                next.last_stage_tokens = total;
                next.last_stage_name = "LLM Factoring (Stage 5)";

                return next;
              });
            }

            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = next.findIndex(m => m.meta === "Live" || m.meta === "factorial analysis results");
              if (targetIndex !== -1) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial analysis results",
                  factorial_analysis_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_analysis_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = next.findIndex(m => m.meta === "Live" || m.meta === "factorial analysis results");
              if (targetIndex !== -1 && !next[targetIndex].meta?.includes("results")) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial analysis done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const targetIndex = next.findIndex(m => m.meta === "Live" || m.meta === "factorial analysis results");
        if (targetIndex !== -1) {
          next[targetIndex] = {
            ...next[targetIndex],
            role: "assistant",
            content: `LLM Factoring error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialAnalysisStreaming(false);
      setStreamingNote("");
    }
  };


  const submitQuestion = async (question, isContinuation = false, uiDisplayOverride = null) => {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    abortRef.current?.abort?.();
    abortRef.current = new AbortController();
    setCurrentQuestion(trimmed);
    clearInteractiveState();

    if (!isContinuation) {
      onClear?.();
      setMessages([]);
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: uiDisplayOverride || trimmed, meta: "Now" },
      { role: "assistant", content: "Running the valuation pipeline...", meta: "Live" },
    ]);
    setInput("");
    setStreamingNote("Connecting to backend stream...");
    setIsStreaming(true);

    try {
      const response = await fetch(apiUrl(`/ask_stream_valuation?question=${encodeURIComponent(trimmed)}&comparable_source=both`), {
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;

          const event = JSON.parse(chunk.slice(6));
          onEvent?.(event);

          if (event.type === "token_usage") {
            const content = event.content || {};
            setTokenStats({
              total_tokens: content.cumulative_total_tokens || 0,
              cost_usd: content.cumulative_cost_usd || 0,
              model_breakdown: content.model_breakdown || {},
              tool_breakdown: content.tool_breakdown || {}
            });
          }


          if (event.type === "stage") {
            setCurrentStage(event.content || "Processing...");
          }

          if (event.type === "entities") {
            const ents = event.content;
            const coords = ents?.coordinates;

            // Store subject data for later use in listing fetch
            const subjectObj = {
              ...ents,
              project_name: ents?.project_name || "Subject Property",
              location_name: ents?.location_name || "",
              country: ents?.country || "India",
              currency: ents?.currency || "INR",
              property_type: ents?.property_type || "apartment",
              recommended_approach: ents?.recommended_approach || "market",
              lat: coords?.lat || 0,
              lng: coords?.lng || 0,
            };
            setSubjectData(subjectObj);
            subjectDataRef.current = subjectObj;

            if (coords?.lat && coords?.lng && !isNaN(Number(coords.lat)) && !isNaN(Number(coords.lng)) && Number(coords.lat) !== 0 && Number(coords.lng) !== 0) {
              // useEffect will handle marker update
            }
          }

          if (event.type === "cost_inputs_required") {
            setCostInputsSchema(event.content);
            const defaults = {};
            event.content.inputs?.forEach(inp => {
              let val = inp.default !== undefined && inp.default !== null ? inp.default : "";
              if (inp.field === "total_life_of_building") {
                val = 60;
              }
              const sData = subjectDataRef.current;
              if (sData) {
                if (inp.field === "age_of_property") {
                  const extractedAge = sData.age_of_property ?? sData.age_years ?? sData.age ?? sData.age_of_building;
                  if (extractedAge != null && extractedAge !== "") val = Number(extractedAge);
                } else if (inp.field === "construction_rate_per_sqft") {
                  const extractedUds = sData.construction_rate_per_sqft ?? sData.construction_rate ?? sData.build_rate;
                  if (extractedUds != null && extractedUds !== "") val = Number(extractedUds);
                } else if (inp.field === "age_of_property") {
                  const extractedPlot = sData.age_of_property ?? sData.age ?? sData.building_age;
                  if (extractedPlot != null && extractedPlot !== "") val = Number(extractedPlot);
                } else if (inp.field === "total_life_of_building") {
                  const extractedLife = sData.total_life_of_building ?? sData.economic_life ?? sData.building_life;
                  if (extractedLife != null && extractedLife !== "") val = Number(extractedLife);
                }
              }
              defaults[inp.field] = val;
            });
            setCostInputsValues(defaults);
          }

          if (event.type === "clarification_needed") {
            const inputs = event.content?.user_inputs_required || [];
            const fields = event.content?.missing_fields || [];

            const schemas = inputs.length > 0 ? inputs : fields.map(f => ({
              field: f, label: f.replaceAll("_", " "), type: "text"
            }));

            setClarificationPrompt(event.content?.question || event.content?.message || "");
            setClarificationFields(schemas);
            setClarificationValues(Object.fromEntries(schemas.map((s) => {
              let val = s.default || "";
              if (s.field === "property_type" && val) {
                const hasOpt = s.options?.some(o => (typeof o === 'object' ? o.value : o) === val);
                if (!hasOpt) val = "";
              }
              return [s.field, val];
            })));
          }

          if (event.type === "map_confirmation") {
            const lat = Number(event.content?.lat);
            const lng = Number(event.content?.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
              setMapConfirmation({
                lat,
                lng,
                label: event.content?.location_name || "Subject Property",
                source: "map_confirmation",
                message: event.content?.message || "Please confirm this location.",
              });
              setClarificationValues(prev => ({
                ...prev,
                coordinates: `${lat}, ${lng}`
              }));
            }
          }

          if (event.type === "approach_choice_needed") {
            setApproachChoiceNeeded(event.content);
          }

          if (event.type === "extraction_verification") {
            setExtractionVerification(event.content);
            const ents = event.content?.entities || {};
            const ignoreKeys = [
              "intent", "extraction_verified", "coordinates_confirmed",
              "user_requested_approach", "_original_query", "missing_mandatory",
              "clarification_needed", "recommended_approach", "coordinates",
              "property_type_missing", "pt_clarification", "others_clarification"
            ];

            // Determine property type to decide if project_name should be shown
            const propType = ents?.property_type;
            const projectNameTypes = ["apartment", "villa", "retail", "commercial_office"];

            const fields = Object.entries(ents)
              .filter(([k, v]) => {
                if (ignoreKeys.includes(k) || k.startsWith("_")) return false;
                if (v === null || v === "" || typeof v === 'object') return false;
                // Hide project_name for plot types (not applicable)
                if (k === "project_name" && propType && !projectNameTypes.includes(propType)) return false;
                return true;
              })
              .map(([k, v]) => ({ field: k, label: k.replaceAll("_", " "), type: typeof v === "number" ? "number" : "text", default: v }));

            if (ents.coordinates && typeof ents.coordinates === 'object') {
              if (ents.coordinates.lat) {
                fields.push({ field: "lat", label: "Latitude", type: "number", default: ents.coordinates.lat });
              }
              if (ents.coordinates.lng) {
                fields.push({ field: "lng", label: "Longitude", type: "number", default: ents.coordinates.lng });
              }
            }

            setClarificationFields(fields);
            setClarificationValues(Object.fromEntries(fields.map(f => [f.field, f.default])));
            setClarificationPrompt(event.content?.message || "Please review and confirm the extracted property details.");
          }

          if (event.type === "comparable_results") {
            const comps = event.content?.comparables || [];
            setComparableData(comps);
            // Store subject's DB entry (if found) for listing fetch
            const subjectDbProject = event.content?.subject_db_project || null;
            if (subjectDbProject) {
              setSubjectData(prev => prev ? { ...prev, subject_db_project: subjectDbProject } : prev);
              subjectDataRef.current = subjectDataRef.current
                ? { ...subjectDataRef.current, subject_db_project: subjectDbProject }
                : subjectDataRef.current;
            }
            // Pre-select only comparables within the initial radius by default
            const initialSelected = comps
              .map((comp, i) => {
                const dist = getComparableDistanceKm(comp);
                if (dist === null || dist <= INITIAL_COMPARABLE_RADIUS_KM) {
                  return i;
                }
                return -1;
              })
              .filter((i) => i !== -1);
            setSelectedComps(new Set(initialSelected));
          }

          if (event.type === "db_comparable_status") {
            if (event.content?.status === "no_results" || event.content?.status === "error") {
              setDbNoResults(true);
              // Also stamp it onto the current last message so the flag survives the 'done' meta overwrite
              setMessages((prev) => {
                const next = [...prev];
                const lastIndex = next.length - 1;
                if (lastIndex >= 0) {
                  next[lastIndex] = { ...next[lastIndex], db_no_results: true };
                }
                return next;
              });
            }
          }

          if (event.type === "done") {
            setPipelineDone(true);
          }

          const summary = summarizeEvent(event);
          setStreamingNote(summary);

          if (["entities", "clarification_needed", "map_confirmation", "approach", "approach_choice_needed", "workflow", "comparable_results", "extraction_verification", "done", "error"].includes(event.type)) {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
              next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type.replaceAll("_", " "),
                  ...(event.type === "comparable_results" ? { comparables: event.content?.comparables || null } : {}),
                  // Preserve db_no_results flag across meta overwrites
                  db_no_results: next[lastIndex]?.db_no_results || false,
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `Connection error: ${error.message}`,
            meta: "Error",
          };
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
      setStreamingNote("");
      abortRef.current = null;
    }
  };

  const submitClarification = () => {
    const entries = Object.entries(clarificationValues).filter(([, value]) => value.trim());
    if (entries.length === 0) return;

    const response = entries
      .map(([field, value]) => `${humanizeFieldName(field)}: ${value.trim()}`)
      .join(", ");

    setClarificationPrompt("");
    setClarificationFields([]);
    setClarificationValues({});
    submitQuestion(`${currentQuestion}. ${response}`, true, response);
  };

  const submitExtractionVerification = () => {
    if (!extractionVerification) return;

    const entries = Object.entries(clarificationValues).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
    const changes = [];
    const ents = extractionVerification.entities || {};
    const entsCoords = ents.coordinates || {};

    entries.forEach(([field, value]) => {
      let isChanged = false;
      if (field === "lat" || field === "lng") {
        isChanged = String(value).trim() !== String(entsCoords[field]);
      } else {
        isChanged = String(value).trim() !== String(ents[field]);
      }

      if (isChanged) {
        changes.push(`${humanizeFieldName(field)}: ${value}`);
      }
    });

    let response = "The extracted details are confirmed to be correct.";
    if (changes.length > 0) {
      response = `The extracted details are confirmed with the following corrections: ${changes.join(", ")}. Please use these values.`;
      if (changes.some(c => c.startsWith("Lat") || c.startsWith("Lng"))) {
        response += " Also update the coordinates to the new latitude and longitude.";
      }
    }

    setExtractionVerification(null);
    setClarificationFields([]);
    setClarificationValues({});
    setClarificationPrompt("");
    submitQuestion(`${currentQuestion}. ${response}`, true, changes.length > 0 ? `Confirmed with corrections: ${changes.join(", ")}` : "Details confirmed");
  };

  const submitMapConfirmation = (confirmed) => {
    if (!mapConfirmation) return;

    if (confirmed) {
      setMapConfirmation(null);
      submitQuestion(`${currentQuestion}. The map location is confirmed to be correct.`, true, "Location confirmed");
      return;
    }

    const corrected = clarificationValues.coordinates?.trim();
    if (!corrected) return;

    setMapConfirmation(null);
    setClarificationValues((prev) => ({ ...prev, coordinates: "" }));
    submitQuestion(`${currentQuestion}. The correct coordinates are ${corrected}.`, true, `Updated coordinates to ${corrected}`);
  };

  const submitApproachChoice = (confirmed, alternative) => {
    if (!approachChoiceNeeded) return;
    const approach = confirmed ? approachChoiceNeeded.recommended_approach : alternative;
    setApproachChoiceNeeded(null);
    setSubjectData(prev => prev ? { ...prev, recommended_approach: approach } : { recommended_approach: approach });
    submitQuestion(`${currentQuestion}. Proceed with the ${approach} approach.`, true, `Proceeding with ${approach} approach`);
  };

  const runSpecialAnalysis = async () => {
    if (isFactorialStreaming) return;

    onClear?.();
    setMessages([]);
    clearInteractiveState();

    // Create the subject and comparables data
    const subj = {
      project_name: specialSubjectName,
      lat: Number(specialSubjectLat),
      lng: Number(specialSubjectLng),
      location_name: "Mumbai",
      currency: "INR"
    };

    const comps = [
      {
        project_name: specialCompName,
        lat: Number(specialCompLat),
        lng: Number(specialCompLng),
        location: "Mumbai"
      }
    ];

    // Set state so map updates
    setSubjectData(subj);
    setComparableData(comps.map(c => ({
      ...c,
      map_search_lat: String(c.lat),
      map_search_lng: String(c.lng)
    })));
    setSelectedComps(new Set([0]));

    // Create mock cleaned data
    const mockCleaned = [];

    // Subject mock listings
    for (let i = 0; i < 5; i++) {
      mockCleaned.push({
        cleaned_match_project: subj.project_name,
        cleaned_relevant_for_valuation: true,
        cleaned_price_value: 12000000 + (i * 500000),
        final_super_builtup_area: 1000 + (i * 10),
        cleaned_area_type: "super_built_up",
        stat_flag: "ok"
      });
    }

    // Comp mock listings
    for (let i = 0; i < 5; i++) {
      mockCleaned.push({
        cleaned_match_project: comps[0].project_name,
        cleaned_relevant_for_valuation: true,
        cleaned_price_value: 10000000 + (i * 300000),
        final_super_builtup_area: 1000 + (i * 20),
        cleaned_area_type: "super_built_up",
        stat_flag: "ok"
      });
    }

    setCleanedData(mockCleaned);
    setPipelineDone(true);

    // Run factorial stream directly
    setIsFactorialStreaming(true);
    setStreamingNote("Computing factorial rate table with custom coordinates...");
    setCurrentStage("Stage 4: Factorial Rate Table (Special Analysis)");

    setMessages([
      { role: "user", content: `Run Special Factorial Analysis for Subject: ${subj.project_name} and Comp: ${comps[0].project_name}.`, meta: "Now" },
      { role: "assistant", content: "Computing rate statistics and mapping amenities based on coordinates...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaned_listings: mockCleaned,
          subject: subj,
          comparables: comps,
          currency: subj.currency,
          area_unit: subj.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Factorial request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_start") summary = event.content?.message || "Computing factorial table...";
          else if (event.type === "factorial_results") summary = `📈 Factorial table ready — ${event.content?.table?.length || 0} projects.`;
          else if (event.type === "factorial_done") summary = "Factorial rate table generated.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_results") {
            setFactorialData(event.content);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial results",
                  factorial_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Factorial table error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialStreaming(false);
      setStreamingNote("");
    }
  };

  const anyStreaming = isStreaming || isListingStreaming || isCleaningStreaming || isFactorialStreaming || isFactorialAnalysisStreaming;

  return (
    <section className="panel-shell">
      <div className="panel-header-shell">
        <div className="panel-title-shell">
          <div className="icon-chip">💬</div>
          <div>
            <p className="panel-kicker">AI Assistant</p>
            <h2 className="panel-heading">Chat With The LLM</h2>
          </div>
        </div>
        <div className="panel-pill">{anyStreaming ? "LIVE" : "READY"}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-bg-card text-3xl shadow-panel">
              🤖
            </div>
            <h3 className="font-display text-base uppercase tracking-[0.14em] text-text-primary">
              Start A Valuation Conversation
            </h3>
            <p className="mt-2 max-w-xs text-sm text-text-secondary">
              Ask about a property and the pipeline will stream entity extraction updates into the workflow view.
            </p>
            <div className="mt-6 grid gap-3 w-full max-w-lg">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitQuestion(prompt)}
                  className="rounded-2xl border border-border bg-bg-card px-4 py-3 text-left text-xs text-text-secondary transition hover:-translate-y-0.5 hover:border-border-glow hover:bg-bg-input hover:text-text-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6 w-full max-w-lg text-left animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest">⚡ Special Factorial Analysis</h4>
                <button onClick={() => setShowSpecialForm(!showSpecialForm)} className="text-[10px] font-bold uppercase tracking-wider text-text-dim hover:text-white transition">
                  {showSpecialForm ? "Close" : "Setup Coordinates"}
                </button>
              </div>

              {showSpecialForm && (
                <div className="space-y-4 rounded-2xl border border-border bg-bg-input/50 p-5 shadow-inner">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Subject Project</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Name" value={specialSubjectName} onChange={e => setSpecialSubjectName(e.target.value)} className="flex-1 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-white outline-none focus:border-accent" />
                      <input type="text" placeholder="Lat" value={specialSubjectLat} onChange={e => setSpecialSubjectLat(e.target.value)} className="w-24 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-white outline-none focus:border-accent" />
                      <input type="text" placeholder="Lng" value={specialSubjectLng} onChange={e => setSpecialSubjectLng(e.target.value)} className="w-24 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-white outline-none focus:border-accent" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Comparable Project</p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Name" value={specialCompName} onChange={e => setSpecialCompName(e.target.value)} className="flex-1 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-white outline-none focus:border-accent" />
                      <input type="text" placeholder="Lat" value={specialCompLat} onChange={e => setSpecialCompLat(e.target.value)} className="w-24 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-white outline-none focus:border-accent" />
                      <input type="text" placeholder="Lng" value={specialCompLng} onChange={e => setSpecialCompLng(e.target.value)} className="w-24 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-white outline-none focus:border-accent" />
                    </div>
                  </div>
                  <button onClick={runSpecialAnalysis} className="w-full rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]">
                    Run Direct Factorial Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`animate-slide-in ${message.role === "user" ? "ml-8" : "mr-8"}`}
              >
                <p className="mb-1 px-1 text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  {message.role === "user" ? "You" : `Assistant · ${message.meta}`}
                </p>
                <div
                  className={
                    message.role === "user"
                      ? "rounded-[18px] rounded-br-md bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] px-4 py-3 text-sm text-white shadow-panel"
                      : "rounded-[18px] rounded-bl-md border border-border bg-bg-card px-4 py-3 text-sm text-text-primary shadow-panel"
                  }
                >
                  {message.content}
                  {message.comparables && (
                    <ComparableTable
                      comparables={message.comparables}
                      selectedComps={selectedComps}
                      onToggle={handleCompToggle}
                      selectable={pipelineDone && !isListingStreaming && !listingData}
                    />
                  )}
                  {/* DB found nothing but web results exist — amber warning */}
                  {message.db_no_results && message.comparables && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                      <span className="text-lg">🗄️</span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">No Project Found in Internal DB</p>
                        <p className="text-[10px] text-text-dim mt-0.5">The internal database returned no matching projects for this location and property type. Results above are from web search only.</p>
                      </div>
                    </div>
                  )}
                  {/* DB found nothing AND no web comparables either */}
                  {message.db_no_results && !message.comparables && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                      <span className="text-xl">🗄️</span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">No Project Found in DB</p>
                        <p className="text-[10px] text-text-dim mt-0.5">The internal database returned no matching projects for this location and property type.</p>
                      </div>
                    </div>
                  )}
                  {(message.listings || message.db_transactions) && (
                    <ListingTable
                      listings={message.listings || []}
                      dbTransactions={message.db_transactions || []}
                    />
                  )}
                  {message.cleaned_listings && <CleanedTable listings={message.cleaned_listings} reviewListings={message.review_listings || []} droppedListings={message.dropped_listings || []} onRecalculate={handleRecalculatePlotRates} subjectPropertyType={subjectData?.property_type} />}
                  {message.factorial_data && (
                    <div className="flex flex-col gap-3">
                      <FactorialTable
                        data={message.factorial_data}
                        onCalculateRate={() => handleCalculateRate(message.factorial_data)}
                        isCalculatingRate={isFactorialAnalysisStreaming}
                        canCalculateRate={Boolean(subjectData && selectedComparablePayload().length > 0)}
                      />
                    </div>
                  )}
                  {message.factorial_analysis_data && <FactoringResultCard data={message.factorial_analysis_data} area_unit={subjectData?.area_unit || "sqft"} subjectData={subjectData} />}
                  {message.cost_calculation_data && <CostResultCard data={message.cost_calculation_data} subjectData={subjectData} />}

                  {message.factorial_analysis_data && subjectData?.recommended_approach === "cost" && (
                    <>
                      {costCalculationData ? (
                        <div className="mt-8 rounded-2xl border border-success/20 bg-[#0f172a]/95 p-5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20 text-success border border-success/30 text-sm">
                            ✅
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white">Cost Approach Calculated</p>
                            <p className="text-[9px] text-text-dim mt-0.5">Please review the complete step-by-step appraisal report card appended below.</p>
                          </div>
                        </div>
                      ) : (
                        costInputsSchema && (
                          <CostInputsForm
                            schema={costInputsSchema}
                            values={costInputsValues}
                            onChange={(field, val) => setCostInputsValues(prev => ({ ...prev, [field]: val }))}
                            onSubmit={handleCostCalculate}
                            isCalculating={isCostCalculating}
                            subjectData={subjectData}
                          />
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {streamingNote ? (
              <div className="mr-8 animate-slide-in">
                <p className="mb-1 px-1 text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  Assistant · Streaming
                </p>
                <div className="rounded-[18px] rounded-bl-md border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary shadow-panel">
                  {streamingNote}
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-bg-card px-4 py-3 backdrop-blur">
        {/* ── Proceed to Listing Fetch CTA ────────────────── */}
        {pipelineDone && comparableData && comparableData.length > 0 && !listingData && dbTransactions.length === 0 && !cleanedData && !factorialData && !isListingStreaming && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-[rgba(34,211,238,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-[rgba(34,211,238,0.16)] bg-[rgba(34,211,238,0.06)] px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(34,211,238,0.24)] bg-[rgba(34,211,238,0.12)] text-base font-semibold text-accent-light">
                  📄
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-light">
                    Step 2 — Fetch Listings
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {selectedComps.size > 0
                      ? `${selectedComps.size} of ${comparableData.length} comparable(s) selected. Click below to fetch real sale/rent listings.`
                      : "Select at least one comparable from the table above to proceed."}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-text-dim">
                The listing pipeline will search for real listings for the subject property + your selected comparables.
              </p>
              <button
                type="button"
                onClick={submitListingFetch}
                disabled={selectedComps.size === 0}
                className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to Next Step →
              </button>
            </div>
          </div>
        )}

        {/* ── Proceed to Data Cleaning CTA ────────────────── */}
        {(listingData !== null || dbTransactions.length > 0) && !cleanedData && !isCleaningStreaming && (listingData?.length > 0 || dbTransactions.length > 0) && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-[rgba(251,146,60,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-[rgba(251,146,60,0.16)] bg-[rgba(251,146,60,0.06)] px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(251,146,60,0.24)] bg-[rgba(251,146,60,0.12)] text-base font-semibold text-[#fb923c]">
                  🧹
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fb923c]">
                    Step 3 — Clean Raw Listings
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {(listingData || []).length} web listing(s) and {dbTransactions?.length || 0} DB transaction(s) found. Proceed to intelligently clean, deduct duplicates, and normalize prices/areas.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-text-dim">
                The smart cleaning engine will apply area-type multipliers and statistical outlier flagging.
              </p>
              <button
                type="button"
                onClick={submitCleaning}
                className="shrink-0 rounded-xl bg-[#fb923c] px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:brightness-110"
              >
                Start Data Cleaning →
              </button>
            </div>
          </div>
        )}

        {/* ── Proceed to Factorial Table CTA ────────────────── */}
        {cleanedData && cleanedData.length > 0 && !factorialData && !isFactorialStreaming && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-[rgba(167,139,250,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-[rgba(167,139,250,0.16)] bg-[rgba(167,139,250,0.06)] px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(167,139,250,0.24)] bg-[rgba(167,139,250,0.12)] text-base font-semibold text-[#a78bfa]">
                  📈
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a78bfa]">
                    Step 4 — Generate Factorial Table
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {cleanedData.length} cleaned listings ready. Generate the factorial summary table (Avg/Median/P90) per project.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-text-dim">
                This will group data by project and calculate key rate statistics for valuation.
              </p>
              <button
                type="button"
                onClick={submitFactorial}
                className="shrink-0 rounded-xl bg-[#a78bfa] px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:brightness-110"
              >
                Generate Factorial Table →
              </button>
            </div>
          </div>
        )}

        {(clarificationFields.length > 0 || mapConfirmation || approachChoiceNeeded || extractionVerification) && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-[rgba(251,191,36,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-[rgba(251,191,36,0.16)] bg-[rgba(251,191,36,0.06)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.12)] text-base font-semibold text-warning">
                    {mapConfirmation ? "◎" : approachChoiceNeeded ? "⚙️" : extractionVerification ? "✓" : "!"}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-warning">
                      {mapConfirmation ? "Map Confirmation" : approachChoiceNeeded ? "Approach Selection" : extractionVerification ? "Extraction Verification" : "Clarification Required"}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {mapConfirmation ? mapConfirmation.message : approachChoiceNeeded ? approachChoiceNeeded.question : clarificationPrompt}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClarificationPrompt("");
                    setClarificationFields([]);
                    setClarificationValues({});
                    setMapConfirmation(null);
                    setApproachChoiceNeeded(null);
                  }}
                  className="text-sm text-text-dim transition hover:text-danger"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {clarificationFields.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {clarificationFields.map((schema) => (
                    <label key={schema.field} className="flex min-w-[170px] flex-1 flex-col gap-1.5">
                      <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                        {schema.label || humanizeFieldName(schema.field)}
                      </span>
                      {schema.type === "select" ? (
                        <select
                          value={clarificationValues[schema.field] || ""}
                          onChange={(event) =>
                            setClarificationValues((prev) => ({
                              ...prev,
                              [schema.field]: event.target.value,
                            }))
                          }
                          className="rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-[rgba(251,191,36,0.06)]"
                        >
                          <option value="" disabled style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Select {schema.label}...</option>
                          {schema.options?.map(opt => {
                            const isObj = typeof opt === 'object';
                            const optValue = isObj ? opt.value : opt;
                            const optLabel = isObj ? opt.label : humanizeFieldName(opt);
                            return (
                              <option key={optValue} value={optValue} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>{optLabel}</option>
                            );
                          })}
                        </select>
                      ) : (
                        <>
                          <input
                            type={schema.type === "number" ? "number" : "text"}
                            value={clarificationValues[schema.field] || ""}
                            onChange={(event) =>
                              setClarificationValues((prev) => ({
                                ...prev,
                                [schema.field]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                submitClarification();
                              }
                            }}
                            placeholder={PLACEHOLDER_MAP[schema.field] || `Enter ${schema.label || humanizeFieldName(schema.field)}`}
                            className="rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-[rgba(251,191,36,0.06)]"
                          />
                          {schema.field === "age_years" && String(clarificationValues[schema.field]) === "0" && (
                            <span className="mt-1 px-1 text-[10px] font-medium text-warning tracking-wide">
                              * Property marked as Under Construction
                            </span>
                          )}
                        </>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {mapConfirmation && (
                <div className="flex flex-wrap items-end gap-3">
                  <button
                    type="button"
                    onClick={() => submitMapConfirmation(true)}
                    className="rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-110"
                  >
                    Location Is Correct
                  </button>
                  <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
                    <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                      Correct Lat, Lng
                    </span>
                    <input
                      type="text"
                      value={clarificationValues.coordinates || ""}
                      onChange={(event) =>
                        setClarificationValues((prev) => ({
                          ...prev,
                          coordinates: event.target.value,
                        }))
                      }
                      placeholder={PLACEHOLDER_MAP.coordinates}
                      className="rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-[rgba(251,191,36,0.06)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => submitMapConfirmation(false)}
                    className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105"
                  >
                    Apply Fix
                  </button>
                </div>
              )}
              {approachChoiceNeeded && (
                <div className="flex flex-wrap items-end gap-3">
                  <button
                    type="button"
                    onClick={() => submitApproachChoice(true)}
                    className="rounded-xl border border-warning bg-[rgba(251,191,36,0.1)] px-4 py-2.5 text-sm font-semibold text-warning transition hover:bg-[rgba(251,191,36,0.2)]"
                  >
                    Proceed with {humanizeFieldName(approachChoiceNeeded.recommended_approach)} Approach
                  </button>
                  <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                    <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                      Or Override Approach
                    </span>
                    <select
                      value={clarificationValues.override_approach || ""}
                      onChange={(e) =>
                        setClarificationValues({ ...clarificationValues, override_approach: e.target.value })
                      }
                      className="rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-text-primary outline-none transition focus:border-warning"
                    >
                      <option value="" disabled style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Select approach...</option>
                      <option key="market" value="market" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>Market Approach</option>
                      <option
                        key="cost"
                        value="cost"
                        style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                        disabled={subjectData?.property_type === "plot"}
                      >
                        Cost Approach {subjectData?.property_type === "plot" ? " (Locked for Plots)" : ""}
                      </option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!clarificationValues.override_approach}
                    onClick={() => submitApproachChoice(false, clarificationValues.override_approach)}
                    className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105 disabled:opacity-50"
                  >
                    Apply Override
                  </button>
                </div>
              )}

              {clarificationFields.length > 0 && extractionVerification && (
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <p className="text-xs text-text-dim">
                    Review and edit the extracted details before proceeding.
                  </p>
                  <button
                    type="button"
                    onClick={submitExtractionVerification}
                    className="rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-110"
                  >
                    Confirm & Proceed
                  </button>
                </div>
              )}

              {clarificationFields.length > 0 && !extractionVerification && (
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <p className="text-xs text-text-dim">
                    Add the missing details and continue the same valuation request.
                  </p>
                  <button
                    type="button"
                    onClick={submitClarification}
                    className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105"
                  >
                    Apply Details
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-text-dim">
          <span className="truncate pr-4">{currentStage}</span>
          <button
            type="button"
            onClick={() => setShowTokenBreakdown(!showTokenBreakdown)}
            className={`flex items-center gap-1.5 transition hover:text-accent-light ${showTokenBreakdown ? "text-accent-light" : ""}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)] animate-pulse" />
            {tokenStats.total_tokens > 0 ? `${tokenStats.total_tokens.toLocaleString()} tokens` : "No usage yet"}
            <span className="ml-1 opacity-50">{showTokenBreakdown ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* ── Token Breakdown UI ────────────────── */}
        {showTokenBreakdown && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-[rgba(15,23,42,0.8)] p-4 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💎</span>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-primary">Token Intelligence</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-text-dim">Estimated Cost</p>
                <p className="text-sm font-mono font-bold text-success">${tokenStats.cost_usd.toFixed(4)}</p>
                {tokenStats.last_stage_tokens && (
                  <p className="text-[8px] text-accent-light font-bold mt-0.5">
                    +{tokenStats.last_stage_tokens.toLocaleString()} ({tokenStats.last_stage_name})
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim opacity-70">Model Breakdown</p>
                {Object.entries(tokenStats.model_breakdown).length === 0 ? (
                  <p className="text-[11px] text-text-dim italic">No model data yet...</p>
                ) : (
                  Object.entries(tokenStats.model_breakdown).map(([model, usage]) => (
                    <div key={model} className="rounded-xl bg-white/5 p-2.5 border border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-accent-light">{model}</span>
                        <span className="text-[10px] font-mono text-text-primary">{usage.total?.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${(usage.prompt / (usage.total || 1)) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[8px] uppercase text-text-dim">Input</span>
                            <span className="text-[8px] font-mono text-text-dim">{usage.prompt?.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-purple"
                              style={{ width: `${(usage.completion / (usage.total || 1)) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[8px] uppercase text-text-dim">Output</span>
                            <span className="text-[8px] font-mono text-text-dim">{usage.completion?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim opacity-70">Tool Intelligence</p>
                {Object.entries(tokenStats.tool_breakdown).length === 0 ? (
                  <div className="rounded-xl bg-white/5 p-3 text-center border border-dashed border-white/10">
                    <p className="text-[10px] text-text-dim">No tools called in this run.</p>
                  </div>
                ) : (
                  Object.entries(tokenStats.tool_breakdown).map(([tool, data]) => (
                    <div key={tool} className="rounded-xl border border-border-glow bg-accent-glow p-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">🌐</span>
                          <div>
                            <p className="text-[10px] font-bold text-text-primary">{tool}</p>
                            <p className="text-[9px] text-text-dim">{data.calls} {data.calls === 1 ? 'call' : 'calls'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono font-bold text-accent-light">${data.cost_usd.toFixed(3)}</p>
                          <p className="text-[8px] uppercase tracking-tighter text-text-dim">Direct Cost</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="mt-4 rounded-xl bg-bg-deep p-3 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-text-dim">Efficiency</span>
                    <span className="text-[10px] font-bold text-success">Optimal</span>
                  </div>
                  <div className="mt-2 text-[10px] text-text-secondary leading-relaxed">
                    Agent 1 & 2 are using <span className="text-accent-light">gpt-4o-mini</span> to minimize costs, while Stage 3 utilizes <span className="text-warning">web_search</span> for real-time market accuracy.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !(extractionVerification || mapConfirmation || approachChoiceNeeded || (clarificationFields.length > 0)) && (
          <div className="relative">
            <div className="absolute inset-[-1px] rounded-2xl bg-[linear-gradient(90deg,var(--accent),var(--accent-purple),var(--accent))] bg-[length:200%_100%] opacity-30 blur-sm animate-flow-bg" />
            <div className="relative flex items-end gap-3 rounded-2xl border border-border bg-bg-dark px-4 py-3">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitQuestion(input);
                  }
                }}
                disabled={anyStreaming}
                placeholder="Describe the property to value..."
                className="max-h-28 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-dim"
              />
              <button
                type="button"
                onClick={() => (anyStreaming ? abortRef.current?.abort?.() : submitQuestion(input))}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-bg-deep transition hover:scale-[1.03] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!anyStreaming && !input.trim()}
              >
                {anyStreaming ? "■" : "➜"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
