/**
 * buildWorkflowFromEvents — maps backend SSE events to workflow UI nodes.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ACTUAL BACKEND PIPELINE (verified from source code)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * STAGE 1 — Property Profiling  (main.py + s1_intent.py + tools.py)
 *   LLM: gpt-4o-mini with `search_map` tool call
 *   SSE events emitted:
 *     • entities             — structured property JSON after LLM extraction
 *     Gate 1 (property_type missing):
 *     • clarification_needed — asks user for property type
 *     Gate 2 (villa with no explicit approach):
 *     • approach_choice_needed — presents market vs cost choice
 *     Gate 3 (other mandatory fields missing):
 *     • clarification_needed — asks for missing mandatory fields
 *     Gate 4 (coordinates found but not confirmed):
 *     • map_confirmation    — shows lat/lng on map for user confirmation
 *     Gate 5 (extraction not yet verified):
 *     • extraction_verification — shows extracted form for user to confirm
 *   Each gate that triggers → pipeline pauses with done event
 *
 * STAGE 2 — Workflow Planning  (s2_workflow.py)
 *   Deterministic (no LLM call)
 *   SSE event: workflow — emits approach + planned execution steps
 *   Market approach steps: 6 steps (comparable search → listing → cleaning → factorial → LLM factoring → final rate)
 *   Cost approach steps:   8 steps (same 6 + cost inputs collection + cost formula calculation)
 *
 * STAGE 3A — Comparable Identification  (s3_market_execution.py / s3_cost_execution.py)
 *   Calls comparable_selection_agent() which internally does:
 *     1. LLM web search × 3 passes (gpt-4o-mini + web_search_preview)
 *     2. Deduplication
 *     3. Property type hard filter
 *     4. Geocoding (search_map for each comparable)
 *     5. Haversine distance calculation
 *     6. Remove subject project from results
 *     7. URL pagination filter
 *     8. LLM confidence scoring (location 50% + category 30% + amenities 20%)
 *     9. Sort by confidence + filter within 15km
 *   Also supports: DB comparable search (fetch_db_comparables)
 *   SSE events:
 *     • comparable_search_progress (per iteration — not shown in workflow)
 *     • comparable_results  — final comparable list with confidence scores
 *   Pipeline then FREEZES — user selects comparables from the table
 *
 * STAGE 3B — Listing Fetch  (frontend → /listing_stream → listing_search.py)
 *   Triggered AFTER user selects comparables
 *   listing_pipeline() fetches per-unit transaction/listing data for each project
 *   SSE events:
 *     • listing_start
 *     • listing_results   — all listings with price, area, config, possession status
 *     • listing_done
 *
 * STAGE 3C — Data Cleaning  (frontend → /cleaning_stream → data_cleaning.py)
 *   data_cleaning_pipeline() internally:
 *     1. Pre-process & normalize price/area strings (Python regex)
 *     2. Deduplication (keeps richest row per project+bhk+price+area key)
 *     3. LLM batch processing (gpt-4o-mini, project-wise batches of 10)
 *     4. Area conversion (carpet → super built-up, data-driven factors)
 *     5. IQR statistical outlier detection (3× IQR bounds per project)
 *     6. Merge DB transactions (if any)
 *     7. Bucket into: valid / outlier / dropped
 *   For villas/plots: also runs calculate_plot_rates (plot_rate_pipeline.py)
 *   SSE events:
 *     • cleaning_start
 *     • cleaning_results  — valid/outlier/dropped counts + columns
 *     Optional recalculation (user overrides FSI/CC):
 *     • recalculate_results  — updated plot rates
 *
 * STAGE 4 — Factorial Table  (frontend → /factorial_stream → factorial_table.py)
 *   compute_factorial_table() — builds comparable rate grid
 *   SSE events:
 *     • factorial_start
 *     • factorial_results  — table with avg_rate, listing_count per project
 *
 * STAGE 5 — LLM Factoring & Final Valuation  (frontend → /factorial_analysis_stream)
 *   For market/built-up approach:
 *     run_llm_factoring() (gpt-4o) — applies spatial adjustments:
 *       • Neighborhood amenity score
 *       • Road type / infrastructure
 *       • Built-up density (Overpass API)
 *       • CBD proximity score
 *     → subject_final_rate (per sqft) + market value
 *   For plot/cost approach:
 *     Direct average of plot-derived rates (no LLM adjustments)
 *   SSE events:
 *     • factorial_analysis_start
 *     • factorial_analysis_result  — final rate, adjusted rate, market value
 *   Cost approach Phase 2 (villa only, frontend → /cost_calculation_stream):
 *     • cost_calculation_result  — land value + depreciated building = cost value
 * ════════════════════════════════════════════════════════════════════════════
 */

export function buildWorkflowFromEvents(events = []) {
  const visibleEvents = [];

  // `done` is only shown as "Pipeline Complete" when a true final-stage result exists.
  // Otherwise `done` is just the backend closing the SSE stream after a pause gate.
  const hasFinalStageEvent = events.some((e) =>
    ["factorial_analysis_result", "cost_calculation_result"].includes(e.type)
  );

  // Only these event types get a step card in the workflow panel
  const VISIBLE_TYPES = new Set([
    // Stage 1 — Profiling
    "entities",
    "clarification_needed",
    "approach_choice_needed",
    "map_confirmation",
    "extraction_verification",
    // Stage 1 — Instant recalculation (area/age edit shortcut)
    "area_age_recalc",
    // Stage 2 — Workflow Planning
    "workflow",
    // Stage 3A — Comparable Identification
    "comparable_results",
    // Stage 3B — Listing Fetch
    "listing_results",
    "transaction_results",
    // Stage 3B — Incremental listing addition
    "incremental_listing",
    // Stage 3C — Data Cleaning
    "cleaning_results",
    "recalculate_results",
    // Stage 4 — Factorial Table
    "factorial_results",
    // Stage 5 — LLM Factoring / Cost Valuation
    "factorial_analysis_result",
    "cost_calculation_result",
    // Errors
    "error",
  ]);

  if (hasFinalStageEvent) VISIBLE_TYPES.add("done");

  let pendingTokens = null;

  for (const event of events) {
    if (event.type === "token_usage") {
      pendingTokens = event.content;
    } else if (VISIBLE_TYPES.has(event.type)) {
      const cloned = { ...event };
      if (cloned.type === "entities" && pendingTokens) {
        if (typeof cloned.content === "object" && cloned.content !== null) {
          cloned.content = { ...cloned.content, _token_usage: pendingTokens };
        }
        pendingTokens = null;
      }
      visibleEvents.push(cloned);
    }
  }

  const nodes = visibleEvents.map((event, index) => {
    const isLast = index === visibleEvents.length - 1;
    const baseType =
      index === 0 ? "input"
      : isLast ? "output"
      : event.type === "error" ? "decision"
      : "default";

    return {
      id: `node-${index + 1}`,
      type: baseType,
      data: {
        title: titleForType(event.type),
        subtitle: describeEvent(event),
        status: stageForType(event.type),
        icon: iconForType(event.type),
        payload: formatPayload(event.content),
        eventType: event.type,
      },
    };
  });

  const edges = nodes.slice(1).map((node, index) => ({
    id: `edge-${index + 1}`,
    source: nodes[index].id,
    target: node.id,
  }));

  return { nodes, edges };
}

// ── Stage assignment — exact match to actual backend stages ──────────────────
function stageForType(type) {
  switch (type) {
    // Stage 1 — Property Profiling (s1_intent.py, main.py gates 1–5)
    case "entities":
    case "clarification_needed":
    case "map_confirmation":
    case "extraction_verification":
      return "Stage 1";

    // Stage 1 — Instant area/age update (skips pipeline)
    case "area_age_recalc":
      return "Stage 1";

    case "approach_choice_needed":
      return "Stage 1 Halt";

    // Stage 2 — Workflow Planning (s2_workflow.py, deterministic)
    case "workflow":
      return "Stage 2";

    // Stage 3A — Comparable Identification (comparable_selection_agent)
    case "comparable_results":
      return "Stage 3A";

    // Stage 3B — Listing Fetch (/listing_stream, listing_pipeline)
    case "listing_results":
    case "transaction_results":
    case "incremental_listing":
      return "Stage 3B";

    // Stage 3C — Data Cleaning (/cleaning_stream, data_cleaning_pipeline)
    case "cleaning_results":
    case "recalculate_results":
      return "Stage 3C";

    // Stage 4 — Factorial Table (/factorial_stream, compute_factorial_table)
    case "factorial_results":
      return "Stage 4";

    // Stage 5 — LLM Factoring & Final Valuation
    case "factorial_analysis_result":
    case "cost_calculation_result":
      return "Stage 5";

    case "done":
      return "Complete";
    case "error":
      return "Attention";
    default:
      return "Stage 1";
  }
}

// ── Human-readable event titles ───────────────────────────────────────────────
function titleForType(type) {
  const map = {
    entities:                 "Property Entities Extracted",
    clarification_needed:     "Clarification Required",
    approach_choice_needed:   "Approach Selection",
    map_confirmation:         "Location Confirmed on Map",
    extraction_verification:  "Extraction Verification",
    area_age_recalc:          "⚡ Instant Recalculation Applied",
    workflow:                 "Execution Workflow Generated",
    comparable_results:       "Comparable Projects Identified",
    listing_results:          "Web Listings Fetched",
    transaction_results:      "DB Transactions Fetched",
    incremental_listing:      "⏩ Incremental Listing Addition",
    cleaning_results:         "Data Cleaned & Normalized",
    recalculate_results:      "Plot Rates Recalculated",
    factorial_results:        "Factorial Rate Table Built",
    factorial_analysis_result:"Agent Rate Factoring Complete",
    cost_calculation_result:  "Cost Approach Value Calculated",
    done:                     "Pipeline Complete",
    error:                    "Pipeline Error",
  };
  return map[type] || "Workflow Step";
}

// ── Plain-text descriptions matching actual backend logic ─────────────────────
function describeEvent(event) {
  const c = event.content;

  if (typeof c === "string") return c;

  switch (event.type) {
    case "entities": {
      const parts = [
        c?.property_type,
        c?.location_name,
        c?.country,
        c?.recommended_approach ? `${c.recommended_approach} approach` : null,
      ].filter(Boolean);
      let text = parts.length > 0 ? parts.join(" · ") : "Property details extracted from query.";
      if (c?._token_usage?.total_tokens) text += ` (${c._token_usage.total_tokens} tokens)`;
      return text;
    }

    case "clarification_needed":
      return c?.question || c?.message || "Agent requires additional property details.";

    case "approach_choice_needed": {
      const rec = c?.recommended_approach;
      const alt = c?.alternative_approach;
      const q = c?.question || "";
      return q || (rec ? `Recommended: ${rec.charAt(0).toUpperCase() + rec.slice(1)} Approach${alt ? ` · Alternative: ${alt.charAt(0).toUpperCase() + alt.slice(1)} Approach` : ""}` : "Agent requires valuation approach selection.");
    }

    case "map_confirmation":
      return c?.message || `Location pinned at ${c?.lat?.toFixed(5)}, ${c?.lng?.toFixed(5)} — awaiting confirmation.`;

    case "extraction_verification":
      return c?.message || "Please review and confirm all extracted property attributes before proceeding.";

    case "workflow": {
      const approach = c?.approach || "";
      const steps = Array.isArray(c?.steps) ? c.steps : [];
      // Show only real execution steps (filter out internal radius_filter which is part of comparable search)
      const realSteps = steps.filter(s => s?.step_id !== "radius_filter");
      const count = realSteps.length;
      return [
        approach ? `Approach: ${approach.charAt(0).toUpperCase() + approach.slice(1)}` : null,
        count ? `${count} execution steps planned` : null,
      ].filter(Boolean).join(" · ") || "Execution plan generated.";
    }

    case "comparable_results": {
      const total = c?.total_found || 0;
      const source = c?.comparable_source;
      const sourceLabel = source === "web" ? "Agent web search"
        : source === "db" ? "internal database"
        : source === "both" ? "Agent web search + internal database"
        : "web search";
      return `${total} comparable project${total !== 1 ? "s" : ""} identified via ${sourceLabel}.`;
    }

    case "listing_results":
      return `${c?.total_listings || 0} active web listing${(c?.total_listings || 0) !== 1 ? "s" : ""} fetched across ${c?.projects_processed || 0} projects (asking prices).`;

    case "transaction_results":
      return `${c?.total || 0} government registered transaction${(c?.total || 0) !== 1 ? "s" : ""} fetched for project "${c?.project_name || c?.project_id}".`;

    case "cleaning_results": {
      const valid = c?.cleaned_listings?.length ?? 0;
      const outliers = c?.review_listings?.length ?? 0;
      const dropped = c?.dropped_listings?.length ?? 0;
      const web = c?.web_count != null ? ` (${c.web_count} web, ${c.db_count ?? 0} DB)` : "";
      return `${valid} valid listing${valid !== 1 ? "s" : ""}${web} · ${outliers} IQR outlier${outliers !== 1 ? "s" : ""} · ${dropped} dropped.`;
    }

    case "recalculate_results":
      return `Plot/land rates recalculated for ${c?.listings?.length || 0} listing${(c?.listings?.length || 0) !== 1 ? "s" : ""} with user overrides applied.`;

    case "factorial_results": {
      const projects = c?.table?.length ?? 0;
      const valid = c?.total_valid ?? 0;
      return `Rate table built — ${projects} comparable project${projects !== 1 ? "s" : ""} · ${valid} valid listing${valid !== 1 ? "s" : ""} analysed.`;
    }

    case "factorial_analysis_result": {
      const rate = c?.subject_final_rate;
      const adj = c?.subject_adjusted_rate;
      const methodology = c?.methodology;
      const confidence = c?.confidence;
      const parts = [
        rate ? `Rate: ${rate}/sqft` : null,
        adj && adj !== rate ? `Adjusted: ${adj}/sqft` : null,
        methodology || null,
        confidence ? `Confidence: ${confidence}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : "Agent factorial analysis and rate derivation complete.";
    }

    case "cost_calculation_result": {
      const costVal = c?.result?.cost_value || c?.depreciated_property_value;
      const landVal = c?.calculations?.land_value;
      const deprPct = c?.calculations?.depreciation_rate_pct;
      const parts = [
        costVal ? `Cost Value: ₹${Number(costVal).toLocaleString()}` : null,
        landVal ? `Land: ₹${Number(landVal).toLocaleString()}` : null,
        deprPct != null ? `Depreciation: ${deprPct}%` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : "Cost approach formula applied.";
    }

    case "area_age_recalc": {
      const fields = c?.changed_fields || [];
      const approach = c?.approach || "market";
      const val = approach === "cost"
        ? (c?.new_cost_value ? `Cost Value: ₹${Number(c.new_cost_value).toLocaleString()}` : null)
        : (c?.new_market_value ? `Market Value: ₹${Number(c.new_market_value).toLocaleString()}` : null);
      return [
        `Fields updated: ${fields.join(", ")}`,
        val,
        "Full pipeline re-run skipped",
      ].filter(Boolean).join(" · ");
    }

    case "incremental_listing": {
      const newCnt = c?.new_count || 0;
      const skipCnt = c?.skipped_count || 0;
      const names = (c?.skipped_names || []).join(", ");
      return [
        `${newCnt} new comparable${newCnt !== 1 ? "s" : ""} fetched`,
        skipCnt > 0 ? `${skipCnt} skipped (${names})` : null,
      ].filter(Boolean).join(" · ");
    }

    case "done":
      return typeof c === "string" && c ? c : "All pipeline stages completed successfully.";

    case "error":
      return c?.message || c?.error || (typeof c === "string" ? c : "An unexpected pipeline error occurred.");

    default:
      return "Pipeline step completed.";
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function iconForType(type) {
  const map = {
    entities:                 "📦",
    clarification_needed:     "❓",
    approach_choice_needed:   "⚙️",
    map_confirmation:         "📍",
    extraction_verification:  "✅",
    area_age_recalc:          "⚡",
    workflow:                 "📋",
    comparable_results:       "🏘️",
    listing_results:          "📊",
    transaction_results:      "🗄️",
    incremental_listing:      "⏩",
    cleaning_results:         "🧹",
    recalculate_results:      "🔄",
    factorial_results:        "📈",
    factorial_analysis_result:"⚖️",
    cost_calculation_result:  "🛡️",
    done:                     "🏁",
    error:                    "⛔",
  };
  return map[type] || "•";
}

// ── Payload formatter (for StepDetails JSON parsing) ─────────────────────────
export function formatPayload(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}
