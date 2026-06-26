"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { buildWorkflowFromEvents } from "@/lib/valuation/workflow";
import { 
  Box, 
  HelpCircle, 
  GitBranch, 
  MapPin, 
  CheckCircle2, 
  ClipboardList, 
  Building2, 
  Search, 
  Database, 
  Sparkles, 
  Table, 
  Brain, 
  Flag, 
  AlertTriangle, 
  Bot, 
  Zap, 
  Hourglass,
  ShieldCheck,
  ChevronDown,
  SlidersHorizontal,
  FileText,
  FastForward
} from "lucide-react";

// ── Stage metadata matching ACTUAL backend pipeline ───────────────────────────
const STAGE_META = {
  "Stage 1": {
    label: "Stage 1 — Property Profiling",
    icon: Box,
    accent: "#22d3ee",
    accentGlow: "rgba(34,211,238,0.18)",
    description: "3-step profiling (Extraction → Geocoding → Verification) · 5-gate sequential validation (identification → type → approach → details → verify)",
  },
  "Stage 1 Halt": {
    label: "Stage 1 — Approach Selection",
    icon: GitBranch,
    accent: "#fbbf24",
    accentGlow: "rgba(251,191,36,0.18)",
    description: "Pipeline paused — villa detected, awaiting market vs cost approach decision",
  },
  "Stage 2": {
    label: "Stage 2 — Workflow Planning",
    icon: ClipboardList,
    accent: "#a78bfa",
    accentGlow: "rgba(167,139,250,0.18)",
    description: "Deterministic execution plan generated (market: 6 steps · cost: 8 steps)",
  },
  "Stage 3A": {
    label: "Stage 3A — Comparable Identification",
    icon: Search,
    accent: "#fb923c",
    accentGlow: "rgba(251,146,60,0.18)",
    description: "Agent web search × 2 passes → geocode → confidence scoring → 15km filter",
  },
  "Stage 3B": {
    label: "Stage 3B — Listing & Transaction Fetch",
    icon: Database,
    accent: "#f97316",
    accentGlow: "rgba(249,115,22,0.18)",
    description: "Fetch web listing data (asking prices) & government registered transactions (historical agreements)",
  },
  "Stage 3C": {
    label: "Stage 3C — Data Cleaning & Normalization",
    icon: Sparkles,
    accent: "#60a5fa",
    accentGlow: "rgba(96,165,250,0.15)",
    description: "Dedup → Agent clean (batches of 10) → area conversion → IQR outlier detection",
  },
  "Stage 4": {
    label: "Stage 4 — Factorial Rate Table",
    icon: Table,
    accent: "#34d399",
    accentGlow: "rgba(52,211,153,0.18)",
    description: "Compute avg rate per comparable project for Agent spatial adjustment",
  },
  "Stage 5": {
    label: "Stage 5 — Agent Factoring & Final Valuation",
    icon: Brain,
    accent: "#f472b6",
    accentGlow: "rgba(244,114,182,0.18)",
    description: "Agent spatial adjustments (amenity · road · density · CBD) → subject final rate",
  },
  "Complete": {
    label: "Pipeline Complete",
    icon: Flag,
    accent: "#34d399",
    accentGlow: "rgba(52,211,153,0.18)",
    description: "All stages finished — valuation output ready",
  },
  "Attention": {
    label: "Pipeline Error",
    icon: AlertTriangle,
    accent: "#f87171",
    accentGlow: "rgba(248,113,113,0.18)",
    description: "An error occurred in the pipeline",
  },
};

// Progress bar stages in order (shown at top)
const PROGRESS_STAGES = [
  { key: "Stage 1", label: "S1", matchKeys: ["Stage 1", "Stage 1 Halt"] },
  { key: "Stage 2", label: "S2", matchKeys: ["Stage 2"] },
  { key: "Stage 3A", label: "S3A", matchKeys: ["Stage 3A"] },
  { key: "Stage 3B", label: "S3B", matchKeys: ["Stage 3B"] },
  { key: "Stage 3C", label: "S3C", matchKeys: ["Stage 3C"] },
  { key: "Stage 4", label: "S4", matchKeys: ["Stage 4"] },
  { key: "Stage 5", label: "S5", matchKeys: ["Stage 5", "Complete"] },
];

// Stage ordering for accordion display
const STAGE_ORDER = [
  "Stage 1", "Stage 1 Halt", "Stage 2",
  "Stage 3A", "Stage 3B", "Stage 3C",
  "Stage 4", "Stage 5",
  "Complete", "Attention",
];

function groupByStage(nodes) {
  const map = {};
  for (const node of nodes) {
    const key = node.data.status;
    if (!map[key]) map[key] = [];
    map[key].push(node);
  }
  return STAGE_ORDER
    .filter((k) => map[k])
    .map((k) => ({
      key: k,
      meta: STAGE_META[k] || { label: k, icon: HelpCircle, accent: "#94a3b8", accentGlow: "rgba(148,163,184,0.12)", description: "" },
      steps: map[k],
    }));
}

function toTitleCase(val) {
  if (!val || typeof val !== "string") return val;
  return val.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRateBasis(basis) {
  if (!basis) return null;
  const b = String(basis).toLowerCase();
  if (b === "built_up" || b === "builtup" || b === "super_built_up" || b === "super_builtup") {
    return "Super Built-Up Area Rate (Valued on super built-up space)";
  }
  if (b === "plot_land" || b === "plot") return "Plot / Land Area Rate (Valued on land area)";
  return basis;
}

function getSubjectFloor(content) {
  return content?.subject_floor ?? content?.floor ?? null;
}

// ── Detail row component ───────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  const isExcluded = ["Notes", "Remarks", "Question", "Message", "Methodology"].includes(label);
  const displayVal = typeof value === "string" && !isExcluded
    ? toTitleCase(value)
    : value;
  return (
    <div className="flex items-baseline gap-2 mt-1.5">
      <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] font-bold text-text-dim w-28">{label}</span>
      <span className="text-[10px] leading-5 text-text-secondary break-words flex-1">{String(displayVal)}</span>
    </div>
  );
}

// ── Per-event structured detail panels ────────────────────────────────────────
function StepDetails({ step }) {
  const { data } = step;
  const type = data.eventType;

  let content = null;
  try { content = JSON.parse(data.payload); } catch (_) {}

  const boxClass = "mt-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5";

  if (type === "entities" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Property Type" value={content.property_type} />
        <DetailRow label="Location" value={content.location_name} />
        <DetailRow label="City" value={content.city_name || content.city} />
        <DetailRow label="Country" value={content.country} />
        <DetailRow label="Project" value={content.project_name} />
        <DetailRow label="Latitude" value={content.coordinates?.lat !== undefined ? content.coordinates.lat : (content.lat !== undefined ? content.lat : null)} />
        <DetailRow label="Longitude" value={content.coordinates?.lng !== undefined ? content.coordinates.lng : (content.lng !== undefined ? content.lng : null)} />
        <DetailRow label="Salable Area" value={content.salable_area_sqft ? `${content.salable_area_sqft} sqft` : null} />
        <DetailRow label="Built-up Area" value={content.builtup_area_sqft ? `${content.builtup_area_sqft} sqft` : null} />
        <DetailRow label="Plot Area" value={content.plot_area_sqft ? `${content.plot_area_sqft} sqft` : null} />
        <DetailRow label="Age" value={content.age_years !== undefined ? `${content.age_years} years` : null} />
        <DetailRow label="Floor" value={getSubjectFloor(content)} />
        <DetailRow label="Total Floors" value={content.total_floors} />
        <DetailRow label="Facing" value={content.facing} />
        <DetailRow label="Approach" value={content.recommended_approach} />
        {content._token_usage && <DetailRow label="Tokens Used" value={`${content._token_usage.total_tokens || 0} total`} />}
      </div>
    );
  }

  if (type === "clarification_needed" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Missing Fields" value={Array.isArray(content.missing_fields) ? content.missing_fields.join(", ") : null} />
        <DetailRow label="Question" value={content.question} />
      </div>
    );
  }

  if (type === "approach_choice_needed" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Recommended" value={content.recommended_approach} />
        <DetailRow label="Alternative" value={content.alternative_approach} />
        <DetailRow label="Question" value={content.question} />
      </div>
    );
  }

  if (type === "map_confirmation" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Latitude" value={content.lat} />
        <DetailRow label="Longitude" value={content.lng} />
        <DetailRow label="Location" value={content.location_name} />
      </div>
    );
  }

  if (type === "extraction_verification" && content) {
    const ent = content.entities || {};
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Property Type" value={ent.property_type} />
        <DetailRow label="Location" value={ent.location_name} />
        <DetailRow label="City" value={ent.city_name || ent.city} />
        <DetailRow label="Country" value={ent.country} />
        <DetailRow label="Project" value={ent.project_name} />
        <DetailRow label="Latitude" value={ent.coordinates?.lat !== undefined ? ent.coordinates.lat : (ent.lat !== undefined ? ent.lat : null)} />
        <DetailRow label="Longitude" value={ent.coordinates?.lng !== undefined ? ent.coordinates.lng : (ent.lng !== undefined ? ent.lng : null)} />
        <DetailRow label="Salable Area" value={ent.salable_area_sqft ? `${ent.salable_area_sqft} sqft` : null} />
        <DetailRow label="Built-up Area" value={ent.builtup_area_sqft ? `${ent.builtup_area_sqft} sqft` : null} />
        <DetailRow label="Plot Area" value={ent.plot_area_sqft ? `${ent.plot_area_sqft} sqft` : null} />
        <DetailRow label="Age" value={ent.age_years !== undefined ? `${ent.age_years} years` : null} />
        <DetailRow label="Floor" value={getSubjectFloor(ent)} />
        <DetailRow label="Total Floors" value={ent.total_floors} />
        <DetailRow label="Facing" value={ent.facing} />
        <DetailRow label="Approach" value={ent.recommended_approach} />
      </div>
    );
  }

  if (type === "workflow" && content) {
    const allSteps = Array.isArray(content.steps) ? content.steps : [];
    // Filter out "radius_filter" — this is NOT a real execution step.
    // The comparable_selection_agent handles proximity internally (15km filter + confidence scoring).
    const steps = allSteps.filter(s => s?.step_id !== "radius_filter");
    const approach = content.approach || content.valuation_approach;
    // Map planned step_ids to their actual execution stage
    const STEP_STAGE_MAP = {
      comparable_identification: "→ Stage 3A",
      rate_data_fetch:           "→ Stage 3B",
      outlier_removal:           "→ Stage 3C",
      Factorial_table:           "→ Stage 4",
      factorial_table:           "→ Stage 4",
      rate_derivation:           "→ Stage 5",
      cost_inputs_collection:    "→ User Action",
      cost_formula_calculation:  "→ Stage 5",
    };
    return (
      <div className={boxClass}>
        {approach && <DetailRow label="Approach" value={approach.charAt(0).toUpperCase() + approach.slice(1)} />}
        <DetailRow label="Total Steps" value={steps.length} />
        {steps.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {steps.map((s, i) => {
              const stageHint = STEP_STAGE_MAP[s.step_id] || "";
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[8px] font-bold text-text-dim">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] leading-5 text-text-secondary">{s.title || s.step_id || `Step ${i + 1}`}</span>
                    {stageHint && <span className="ml-1.5 text-[8px] text-text-dim">{stageHint}</span>}
                    {s.user_action_needed && (
                      <span className="ml-1.5 rounded-sm bg-warning/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-warning">User Input</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (type === "comparable_results" && content) {
    // Note: final_radius_km and iterations are always null in current backend
    // (s3_market_execution.py sets them to None). Only show total_found and source.
    const sourceLabel = {
      web: "Agent Web Search (gpt-4o-mini + web_search_preview × 2 passes)",
      db: "Internal Database",
      both: "Agent Web Search + Internal Database",
    }[content.comparable_source] || content.comparable_source || "Agent Web Search";
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Total Found" value={content.total_found} />
        <DetailRow label="Source" value={sourceLabel} />
        <DetailRow label="Ranking" value="Confidence score (location 50% + category 30% + amenities 20%)" />
      </div>
    );
  }

  if (type === "listing_start" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Message" value={content.message} />
        <DetailRow label="Property Type" value={content.property_type} />
      </div>
    );
  }

  if (type === "listing_results" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Total Listings" value={content.total_listings} />
        <DetailRow label="Projects" value={content.projects_processed} />
        <DetailRow label="Data Source" value="Web Portals (Asking Price)" />
        <DetailRow label="Remarks" value="Active listings representing current market asking rates, subject to negotiations." />
      </div>
    );
  }

  if (type === "transaction_results" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Project Name" value={content.project_name} />
        <DetailRow label="Total Transactions" value={content.total} />
        <DetailRow label="Data Source" value="Internal DB (Government Registered)" />
        <DetailRow label="Remarks" value="Official transaction values registered under government authorities. Represents actual closed agreement values." />
      </div>
    );
  }

  if (type === "cleaning_start" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Message" value={content.message} />
      </div>
    );
  }

  if (type === "cleaning_results" && content) {
    const auditStats = content.audit_stats || {};
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Valid Listings" value={content.cleaned_listings?.length} />
        <DetailRow label="Web Source" value={content.web_count != null ? `${content.web_count} listings` : null} />
        <DetailRow label="DB Source" value={content.db_count != null ? `${content.db_count} listings` : null} />
        <DetailRow label="IQR Outliers" value={content.review_listings?.length} />
        <DetailRow label="Dropped" value={content.dropped_listings?.length} />
        <DetailRow label="Rate Basis" value={formatRateBasis(content.rate_basis)} />
        {auditStats.input_count != null && <DetailRow label="Input Count" value={auditStats.input_count} />}
        {auditStats.dedup_removed != null && <DetailRow label="Duplicates Removed" value={auditStats.dedup_removed} />}
      </div>
    );
  }

  if (type === "recalculate_results" && content) {
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Listings Updated" value={content.listings?.length} />
        <DetailRow label="Rate Basis" value={formatRateBasis(content.rate_basis)} />
        <DetailRow label="Note" value="User-overridden FSI/construction cost values applied" />
      </div>
    );
  }

  if (type === "factorial_results" && content) {
    const subjectProj = content.table?.find(p => p.is_subject);
    
    let cbdText = null;
    if (subjectProj?.cbd_data && subjectProj.cbd_data.length > 0) {
      const nearest = subjectProj.cbd_data[0];
      cbdText = `${nearest.name || "CBD Hub"} (${nearest.distance_km?.toFixed(2)} km)`;
    }

    const roadText = subjectProj?.road_type || null;

    let densityText = null;
    if (subjectProj?.builtup_density) {
      if (typeof subjectProj.builtup_density === "object") {
        const bd = subjectProj.builtup_density;
        const classVal = bd.congestion_level || bd.density_class || bd.level || bd.congestion?.level;
        const bcr = bd.bcr_pct !== undefined ? bd.bcr_pct : (bd.building_coverage_ratio ? (bd.building_coverage_ratio * 100).toFixed(1) : 0);
        const open = bd.open_space_ratio_pct !== undefined ? bd.open_space_ratio_pct : 0;
        if (classVal) {
          densityText = `${classVal} (BCR: ${bcr}%, Open Space: ${open}%)`;
        }
      } else {
        densityText = String(subjectProj.builtup_density);
      }
    }

    let amenityText = null;
    if (subjectProj?.amenity_summary) {
      const counts = subjectProj.amenity_summary.counts || {};
      const parts = Object.entries(counts)
        .filter(([_, cnt]) => cnt > 0)
        .map(([cat, cnt]) => `${cat}: ${cnt}`);
      if (parts.length > 0) {
        amenityText = parts.join(", ");
      }
    }

    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Projects" value={content.table?.length} />
        <DetailRow label="Valid Listings" value={content.total_valid} />
        <DetailRow label="Currency" value={content.currency} />
        <DetailRow label="Area Unit" value={content.area_unit} />
        <DetailRow label="Rate Basis" value={formatRateBasis(content.rate_basis)} />
        
        {subjectProj && (roadText || cbdText || densityText || amenityText) && (
          <>
            <div className="mt-3 border-t border-border/40 pt-2 text-[9px] uppercase tracking-[0.14em] font-bold text-cyan-400">
              Subject Geospatial Baseline
            </div>
            <DetailRow label="Road Type" value={roadText} />
            <DetailRow label="Nearest CBD" value={cbdText} />
            <DetailRow label="Built Density" value={densityText} />
            <DetailRow label="Amenities Detected" value={amenityText} />
          </>
        )}
      </div>
    );
  }

  if (type === "factorial_analysis_result" && content) {
    const isPlotLand = content.rate_basis === "plot_land";
    const finalRate = isPlotLand
      ? (content.subject_final_plot_rate || content.subject_final_rate)
      : content.subject_final_rate;
    const mktValue = content.subject_market_value;
    const subjectRow = content.comparable_factoring_table?.find(r => r.role === "SUBJECT");
    
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Final Rate" value={finalRate ? `₹${Number(finalRate).toLocaleString()}/sqft` : null} />
        <DetailRow label="Adjusted Rate" value={content.subject_adjusted_rate ? `₹${Number(content.subject_adjusted_rate).toLocaleString()}/sqft` : null} />
        <DetailRow label="Market Value" value={mktValue ? `₹${Number(mktValue).toLocaleString()}` : null} />
        <DetailRow label="Methodology" value={content.methodology} />
        <DetailRow label="Rate Basis" value={formatRateBasis(content.rate_basis)} />
        <DetailRow label="Confidence" value={content.confidence} />
        {content.valuation_details?.total_net_adjustment != null && (
          <DetailRow label="Net Adjustment" value={`${content.valuation_details.total_net_adjustment > 0 ? "+" : ""}${content.valuation_details.total_net_adjustment}/sqft`} />
        )}
        
        {subjectRow && (
          <>
            <div className="mt-3 border-t border-border/40 pt-2 text-[9px] uppercase tracking-[0.14em] font-bold text-[#fb923c]">
              Subject Geospatial Baseline
            </div>
            <DetailRow label="Road Type" value={subjectRow.road_type} />
            <DetailRow label="Nearest CBD" value={subjectRow.cbd_name ? `${subjectRow.cbd_name} (${subjectRow.cbd_nearest_km} km)` : (subjectRow.cbd_nearest_km ? `${subjectRow.cbd_nearest_km} km` : null)} />
            <DetailRow label="Built Density" value={subjectRow.builtup_density_score != null ? `Score: ${subjectRow.builtup_density_score}/10` : null} />
            <DetailRow label="Amenities" value={subjectRow.amenity_summary} />
          </>
        )}
      </div>
    );
  }

  if (type === "cost_calculation_result" && content) {
    const calcs = content.calculations || {};
    const result = content.result || {};
    const inputs = content.inputs || {};
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Final Cost Value" value={result.cost_value ? `₹${Number(result.cost_value).toLocaleString()}` : null} />
        <DetailRow label="Land Value" value={calcs.land_value ? `₹${Number(calcs.land_value).toLocaleString()}` : null} />
        <DetailRow label="Construction Cost" value={calcs.construction_cost ? `₹${Number(calcs.construction_cost).toLocaleString()}` : null} />
        <DetailRow label="Depreciation" value={calcs.depreciation_rate_pct != null ? `${calcs.depreciation_rate_pct}%` : null} />
        <DetailRow label="Depreciated Building" value={calcs.depreciated_building_value ? `₹${Number(calcs.depreciated_building_value).toLocaleString()}` : null} />
        <DetailRow label="Construction Rate" value={inputs.construction_rate_per_sqft ? `₹${inputs.construction_rate_per_sqft}/sqft` : null} />
        <DetailRow label="Building Life" value={inputs.total_life_of_building ? `${inputs.total_life_of_building} years` : null} />
      </div>
    );
  }

  if (type === "area_age_recalc" && content) {
    const fields = content.changed_fields || [];
    const approach = content.approach || "market";
    const sym = approach === "cost" ? "Cost" : "Market";
    const newVal = approach === "cost" ? content.new_cost_value : content.new_market_value;
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="Changed Fields" value={fields.join(", ") || "—"} />
        <DetailRow label="Approach" value={approach} />
        {newVal != null && <DetailRow label={`New ${sym} Value`} value={`₹${Number(newVal).toLocaleString()}`} />}
        <DetailRow label="Pipeline Re-Run" value="Skipped — instant client-side update" />
      </div>
    );
  }

  if (type === "incremental_listing" && content) {
    const newCnt = content.new_count || 0;
    const skipCnt = content.skipped_count || 0;
    const names = (content.skipped_names || []).join(", ");
    return (
      <div className={`${boxClass} space-y-0.5`}>
        <DetailRow label="New Fetches" value={`${newCnt} comparable${newCnt !== 1 ? "s" : ""}`} />
        <DetailRow label="Skipped" value={skipCnt > 0 ? `${skipCnt} (${names})` : "None"} />
        <DetailRow label="Strategy" value="Incremental — existing data preserved" />
      </div>
    );
  }

  return null;
}

// ── Icon Helper Mapper ────────────────────────────────────────────────────────
function getStepIcon(type) {
  const map = {
    entities:                 Box,
    clarification_needed:     HelpCircle,
    approach_choice_needed:   GitBranch,
    map_confirmation:         MapPin,
    extraction_verification:  CheckCircle2,
    area_age_recalc:          Zap,
    workflow:                 ClipboardList,
    comparable_results:       Building2,
    listing_results:          Search,
    transaction_results:      Database,
    incremental_listing:      FastForward,
    cleaning_results:         Sparkles,
    recalculate_results:      SlidersHorizontal,
    factorial_results:        Table,
    factorial_analysis_result:Brain,
    cost_calculation_result:  ShieldCheck,
    done:                     Flag,
    error:                    AlertTriangle,
  };
  return map[type] || HelpCircle;
}

// ── Single Step Card ───────────────────────────────────────────────────────────
function StepCard({ step, accent, index }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    const t = setTimeout(() => {
      el.style.transition = "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const StepIcon = getStepIcon(step.data.eventType);

  return (
    <div ref={cardRef} className="relative flex gap-4 mt-2">
      <div className="flex flex-col items-center">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base shadow-[0_0_15px_rgba(255,255,255,0.02)] transition-all duration-300 relative group-hover:scale-105"
          style={{ 
            background: `linear-gradient(135deg, ${accent}18 0%, ${accent}05 100%)`, 
            border: `1.5px solid ${accent}35`,
            boxShadow: `0 0 10px ${accent}12`,
            color: accent
          }}
        >
          <div className="absolute inset-0 rounded-xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
          <StepIcon className="h-4.5 w-4.5 relative z-10" />
        </div>
        <div className="mt-2 flex-1 w-[2px] rounded-full" style={{ background: `linear-gradient(180deg, ${accent}30 0%, ${accent}05 100%)`, minHeight: "12px" }} />
      </div>

      <div
        className="mb-4 flex-1 rounded-2xl border p-4 futuristic-card relative overflow-hidden"
        style={{ 
          background: `linear-gradient(145deg, ${accent}09 0%, rgba(255,255,255,0.01) 100%)`, 
          borderColor: `${accent}25`,
          "--stage-color": accent,
          "--stage-glow": `${accent}12`
        }}
      >
        {/* Futuristic tech corner accent */}
        <div className="absolute top-0 right-0 h-8 w-8 pointer-events-none opacity-20"
             style={{
               background: `radial-gradient(circle at top right, ${accent}40 0%, transparent 70%)`
             }} 
        />
        
        <div className="flex items-start justify-between gap-3 relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-text-primary leading-tight flex-1 min-w-0">
            {step.data.title}
          </p>
          <span
            className="shrink-0 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em]"
            style={{ 
              background: `linear-gradient(90deg, ${accent}25, ${accent}10)`, 
              color: accent, 
              border: `1px solid ${accent}40`,
              boxShadow: `0 0 8px ${accent}20`
            }}
          >
            AG-{String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-text-secondary break-words font-medium relative z-10">
          {step.data.subtitle}
        </p>
        <div className="relative z-10">
          <StepDetails step={step} />
        </div>
      </div>
    </div>
  );
}

// ── Stage Accordion ────────────────────────────────────────────────────────────
function StageAccordion({ meta, steps, defaultOpen, isActive }) {
  const [open, setOpen] = useState(defaultOpen);
  const { accent, accentGlow, label, icon: IconComponent, description } = meta;

  return (
    <div 
      className="rounded-2xl border overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-md relative z-10" 
      style={{ 
        borderColor: `${accent}25`, 
        background: open 
          ? `linear-gradient(180deg, ${accent}06 0%, rgba(255,255,255,0.01) 100%)` 
          : `${accent}03`
      }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4.5 py-4.5 text-left transition-colors duration-300 hover:bg-white/[0.02] cursor-pointer"
        style={{ background: open ? accentGlow : "transparent" }}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg relative transition-transform duration-300 active:scale-95 ${isActive ? 'animate-[pulse_1.5s_infinite]' : 'animate-[pulse_3s_infinite]'}`}
          style={{ 
            background: `linear-gradient(135deg, ${accent}25 0%, ${accent}08 100%)`, 
            border: `1px solid ${accent}45`,
            boxShadow: open ? `0 0 15px ${accent}30` : 'none',
            color: accent
          }}
        >
          <IconComponent className="h-5 w-5 relative z-10" />
          {open && (
            <span className="absolute -inset-[3px] rounded-xl border border-dashed border-white/10 animate-spin" style={{ animationDuration: '12s' }} />
          )}
          {isActive && (
            <span className="absolute -inset-[6px] rounded-2xl border border-accent/20 animate-ping opacity-45 pointer-events-none" style={{ borderColor: accent }} />
          )}
        </span>
        
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: accent }}>
            {label}
          </p>
          {description && (
            <p className="mt-1 text-[10px] leading-4 text-text-dim truncate font-medium">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3.5 shrink-0">
          <span
            className="rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
            style={{ 
              background: `linear-gradient(90deg, ${accent}22, ${accent}09)`, 
              color: accent, 
              border: `1px solid ${accent}35` 
            }}
          >
            {steps.length} STEP{steps.length !== 1 ? "S" : ""}
          </span>
          <ChevronDown
            className="text-text-dim h-4 w-4 transition-transform duration-300"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          />
        </div>
      </button>

      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[1500px] border-t border-white/[0.03] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <div className="px-4.5 pt-4 pb-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="ml-4 h-px w-3" style={{ background: `${accent}40` }} />
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>EXECUTION STEPS</span>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}20, transparent)` }} />
          </div>
          <div className="space-y-1">
            {steps.map((step, i) => (
              <StepCard key={step.id} step={step} accent={accent} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState() {
  const previewStages = [
    { label: "Stage 1 — Property Profiling", icon: Box, color: "#22d3ee" },
    { label: "Stage 2 — Workflow Planning", icon: ClipboardList, color: "#a78bfa" },
    { label: "Stage 3A — Comparable Identification", icon: Search, color: "#fb923c" },
    { label: "Stage 3B — Listing Fetch", icon: Database, color: "#f97316" },
    { label: "Stage 3C — Data Cleaning", icon: Sparkles, color: "#60a5fa" },
    { label: "Stage 4 — Factorial Table", icon: Table, color: "#34d399" },
    { label: "Stage 5 — Agent Factoring & Value", icon: Brain, color: "#f472b6" },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center py-8">
      <style>{`
        @keyframes radarRotation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="relative mb-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/[0.02]">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/10 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-2.5 rounded-full border border-cyan-500/15" />
          <div className="absolute inset-5 rounded-full border border-dashed border-cyan-500/5 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
          <div 
            className="absolute top-0 bottom-0 left-1/2 right-0 bg-gradient-to-r from-cyan-400/20 to-transparent origin-left pointer-events-none"
            style={{
              animation: 'radarRotation 4s linear infinite',
              borderTopRightRadius: '9999px',
              borderBottomRightRadius: '9999px',
            }}
          />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-bg-card text-cyan-400 shadow-md">
          <Hourglass className="h-3.5 w-3.5 animate-pulse" />
        </span>
      </div>
      <h3 className="font-display text-xs uppercase tracking-[0.18em] text-text-primary font-black">
        Valuation Pipeline Inactive
      </h3>
      <p className="mt-2 max-w-xs text-[10px] leading-5 text-text-dim font-medium">
        Enter a property valuation query to initialize the agentic orchestration.
      </p>
      
      <div className="mt-8 w-full max-w-[320px] rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 backdrop-blur-md text-left">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim mb-3">Orchestration Blueprint</p>
        <div className="flex flex-col gap-2">
          {previewStages.map((s, i) => {
            const PreviewIcon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.01] px-3 py-2 transition hover:bg-white/[0.03]">
                <PreviewIcon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
                <span className="text-[9px] uppercase tracking-[0.12em] font-bold truncate" style={{ color: `${s.color}c0` }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WorkflowSectionNext({ events = [] }) {
  const workflow = useMemo(() => buildWorkflowFromEvents(events), [events]);
  const stages = useMemo(() => groupByStage(workflow.nodes), [workflow.nodes]);
  const isEmpty = stages.length === 0;

  const activeStageKeys = new Set(stages.map((s) => s.key));
  const latestStageKey = stages.length > 0 ? stages[stages.length - 1].key : null;

  return (
    <section className="panel-shell border border-border/80 shadow-lg bg-bg-card/50 backdrop-blur-sm relative overflow-hidden flex flex-col h-full">
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none z-0" />
      
      <style>{`
        .futuristic-card {
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .futuristic-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.6), 0 0 20px var(--stage-glow);
          border-color: var(--stage-color) !important;
        }
      `}</style>

      {/* Header */}
      <div className="panel-header-shell border-b border-border/60 shrink-0 relative z-10">
        <div className="panel-title-shell">
          <div className="icon-chip bg-accent/10 border border-accent/20 p-2 rounded-xl">
            <Bot className="h-5 w-5 text-accent" />
          </div>
          <div className="flex items-center gap-2 m-0">
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary m-0">Agentic Execution Flow</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <span className="rounded-full border border-border/40 bg-white/[0.02] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary">
              {stages.length} / 7 STAGES
            </span>
          )}
          <div className={`panel-pill text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${isEmpty ? "bg-warning/10 border border-warning/20 text-warning" : "bg-accent/10 border border-accent/20 text-accent"}`}>
            {isEmpty ? "STANDBY" : "ACTIVE"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-y-auto custom-scrollbar z-10">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4.5 p-4.5">
            {/* Progress Nodes - Aerospace / Telemetry Control Panel */}
            <div className="flex items-center justify-between gap-1 mb-2 bg-bg-deep/45 rounded-2xl border border-white/[0.04] p-4 backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-pink-500/5 pointer-events-none" />
              {PROGRESS_STAGES.map(({ key, label, matchKeys }, idx) => {
                const active = matchKeys.some((k) => activeStageKeys.has(k));
                const meta = STAGE_META[key] || { accent: "#a78bfa" };
                return (
                  <div key={key} className="flex-1 flex flex-col items-center relative z-10">
                    <div className="flex items-center w-full">
                      {idx > 0 && (
                        <div
                          className="h-[2px] flex-1 transition-all duration-700"
                          style={{
                            background: active 
                              ? `linear-gradient(90deg, ${STAGE_META[PROGRESS_STAGES[idx - 1].key]?.accent || "#ffffff"}, ${meta.accent})` 
                              : "rgba(255,255,255,0.05)"
                          }}
                        />
                      )}
                      <div
                        className={`h-6.5 w-6.5 rounded-xl flex items-center justify-center text-[8px] font-black tracking-tighter transition-all duration-500 relative ${active ? "scale-110 shadow-lg" : "opacity-35"}`}
                        style={{
                          background: active ? `${meta.accent}15` : "rgba(255,255,255,0.03)",
                          border: `1.5px solid ${active ? meta.accent : "rgba(255,255,255,0.08)"}`,
                          color: active ? meta.accent : "rgba(255,255,255,0.3)",
                          boxShadow: active ? `0 0 12px ${meta.accent}45` : "none"
                        }}
                      >
                        {active && (
                          <div
                            className="absolute -inset-[3px] rounded-xl border border-dashed animate-spin pointer-events-none opacity-40"
                            style={{ borderColor: meta.accent, animationDuration: '8s' }}
                          />
                        )}
                        {label}
                      </div>
                      {idx < PROGRESS_STAGES.length - 1 && (
                        <div
                          className="h-[2px] flex-1 transition-all duration-700"
                          style={{
                            background: matchKeys.some((k) => activeStageKeys.has(k)) && activeStageKeys.has(PROGRESS_STAGES[idx + 1].key)
                              ? `linear-gradient(90deg, ${meta.accent}, ${STAGE_META[PROGRESS_STAGES[idx + 1].key]?.accent || "#ffffff"})`
                              : "rgba(255,255,255,0.05)"
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Accordions Container */}
            <div className="space-y-3.5 relative">
              {/* Vertical connector pipeline wire running behind accordion icons */}
              <div 
                className="absolute left-[38px] top-6 bottom-6 w-[2px] pointer-events-none z-0 hidden sm:block" 
                style={{
                  background: `linear-gradient(180deg, rgba(34,211,238,0.15) 0%, rgba(167,139,250,0.15) 50%, rgba(244,114,182,0.15) 100%)`
                }}
              />
              {stages.map((stage) => (
                <StageAccordion
                  key={stage.key}
                  meta={stage.meta}
                  steps={stage.steps}
                  defaultOpen={stage.key === latestStageKey}
                  isActive={stage.key === latestStageKey}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
