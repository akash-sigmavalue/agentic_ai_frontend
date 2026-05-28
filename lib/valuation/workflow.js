export function buildWorkflowFromEvents(events = []) {
  const visibleEvents = [];
  let pendingTokens = null;

  for (const event of events) {
    if (event.type === "token_usage") {
      pendingTokens = event.content;
    } else if ([
      "entities",
      "approach_choice_needed",
      "workflow",
      "comparable_results",
      "listing_results",
      "listing_done",
      "cleaning_results",
      "recalculate_results",
      "factorial_results",
      "factorial_analysis_result",
      "cost_calculation_result",
      "error",
      "done"
    ].includes(event.type)) {
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
      index === 0
        ? "input"
        : isLast
          ? "output"
          : event.type === "error"
            ? "decision"
            : "default";

    const titleMap = {
      start: "Request Started",
      stage: "Stage Update",
      entities: "Entities Extracted",
      clarification_needed: "Clarification Needed",
      map_confirmation: "Map Confirmation",
      approach: "Valuation Approach Planned",
      approach_choice_needed: "Approach Selection",
      workflow: "Execution Workflow Generated",
      comparable_results: "Comparable Projects Identified",
      listing_results: "Listing Data Fetched",
      cleaning_results: "Data Cleaned & Normalized",
      recalculate_results: "Plot Rates Recalculated",
      factorial_results: "Factorial Table Generated",
      factorial_analysis_result: "LLM Factoring Completed",
      cost_calculation_result: "Cost Approach Calculated",
      error: "Pipeline Error",
      done: "Pipeline Complete",
    };

    let stageStr = "Stage 1";
    if (event.type === "approach_choice_needed") stageStr = "Stage 1 Halt";
    if (event.type === "workflow") stageStr = "Stage 2";
    if (["comparable_results", "listing_results", "cleaning_results", "recalculate_results"].includes(event.type)) stageStr = "Stage 3";
    if (event.type === "factorial_results") stageStr = "Stage 4";
    if (["factorial_analysis_result", "cost_calculation_result"].includes(event.type)) stageStr = "Stage 5";

    return {
      id: `node-${index + 1}`,
      type: baseType,
      data: {
        title: titleMap[event.type] || "Workflow Step",
        subtitle: describeEvent(event),
        status:
          event.type === "done"
            ? "Complete"
            : event.type === "error"
              ? "Attention"
              : `${stageStr}`,
        icon: iconForType(event.type),
        payload: formatPayload(event.content),
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

export function formatPayload(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;

  try {
    return JSON.stringify(content, null, 2);
  } catch (error) {
    return String(content);
  }
}

function describeEvent(event) {
  if (typeof event.content === "string") return event.content;

  if (event.type === "entities") {
    const summary = [
      event.content?.property_type,
      event.content?.location_name,
      event.content?.country,
      event.content?.recommended_approach ? `${event.content.recommended_approach} approach` : null
    ].filter(Boolean);
    let text = summary.length > 0
      ? summary.join(" - ")
      : "Structured entity extraction complete";
      
    if (event.content?._token_usage) {
      const t = event.content._token_usage.total_tokens || 0;
      text += ` (${t} tokens)`;
    }
    return text;
  }

  if (event.type === "clarification_needed") {
    return event.content?.question || event.content?.message || "Need more details";
  }

  if (event.type === "map_confirmation") {
    return event.content?.message || "Location identified";
  }

  if (event.type === "comparable_results") {
    const c = event.content;
    return `${c?.total_found || 0} comparables found within ${c?.final_radius_km || "?"}km (${c?.iterations || "?"} iterations)`;
  }

  if (event.type === "listing_results") {
    const c = event.content;
    return `Fetched ${c?.total_listings || 0} listings across ${c?.projects_processed || 0} projects.`;
  }

  if (event.type === "cleaning_results") {
    const c = event.content;
    return `Cleaned: ${c?.cleaned_listings?.length || 0} valid, ${c?.review_listings?.length || 0} outliers, ${c?.dropped_listings?.length || 0} dropped.`;
  }

  if (event.type === "recalculate_results") {
    const c = event.content;
    return `Recalculated rates for ${c?.listings?.length || 0} listings.`;
  }

  if (event.type === "factorial_results") {
    const c = event.content;
    return `Factorial table: ${c?.table?.length || 0} projects, ${c?.total_valid || 0} listings.`;
  }

  if (event.type === "factorial_analysis_result") {
    const c = event.content;
    return `Final rate: ${c?.subject_final_rate ? `${c.subject_final_rate} per sqft` : "derived"}.`;
  }

  if (event.type === "cost_calculation_result") {
    const c = event.content;
    return `Cost Value: ${c?.depreciated_property_value ? `₹${c.depreciated_property_value.toLocaleString()}` : "calculated"}.`;
  }

  return "Pipeline event received";
}

function iconForType(type) {
  switch (type) {
    case "start":
      return "🚀";
    case "stage":
      return "⚙️";
    case "entities":
      return "📦";
    case "clarification_needed":
      return "⚠️";
    case "map_confirmation":
      return "🗺️";
    case "approach":
      return "🎯";
    case "approach_choice_needed":
      return "⚙️";
    case "workflow":
      return "📋";
    case "comparable_results":
      return "🏘️";
    case "listing_results":
      return "📊";
    case "cleaning_results":
      return "🧹";
    case "recalculate_results":
      return "🔄";
    case "factorial_results":
      return "📈";
    case "factorial_analysis_result":
      return "⚖️";
    case "cost_calculation_result":
      return "🛡️";
    case "error":
      return "⛔";
    case "done":
      return "🏁";
    default:
      return "•";
  }
}
