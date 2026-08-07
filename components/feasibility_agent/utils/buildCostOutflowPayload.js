/**
 * buildCostOutflowPayload.js
 *
 * Reads the 4 available localStorage keys and assembles a clean payload
 * for POST /new_rate_simulator/simulator/cost-outflow-simulation
 *
 * Keys consumed:
 *   "Land Identification"    → location, currency, planning authority, coordinates
 *   "ProductMixScenarios"   → unit mix (active scenario)
 *   "RevenueV2"             → ticket size, revenue (active scenario)
 *   "CostProjectDetailsV1"  → cost heads + construction timeline (active scenario)
 */

// Fixed cost head keys (order matches display order)
const FIXED_COST_KEYS = [
  "landAcquisition",
  "landLeveling",
  "constructionCost",
  "marketingCost",
  "approvalCost",
  "administrativeCost",
  "tdrCost",
  "financeCost",
  "miscellaneousCost",
];

const NON_COST_KEYS = new Set(["constructionTimeline"]);

/**
 * Returns the most common value in an array of strings, or a fallback.
 */
function mostCommon(arr, fallback = "") {
  if (!arr || arr.length === 0) return fallback;
  const freq = {};
  arr.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] || fallback;
}

/**
 * Build the full payload from localStorage.
 * Returns { payload, errors, warnings }
 * where errors[] are blocking problems and warnings[] are non-blocking.
 */
export function buildCostOutflowPayload(selectedScenarioId = null) {
  const errors = [];
  const warnings = [];

  // ── 1. Land Identification ────────────────────────────────────────────────
  let land = {};
  try {
    land = JSON.parse(localStorage.getItem("Land Identification") || "{}");
  } catch (e) {
    errors.push("Could not read Land Identification data.");
  }

  const location = {
    locality:           land.village || "",
    city:               land.location || "",
    planning_authority: land.planningAuthority || "",
    latitude:           parseFloat(land.polygonCenterLat) || null,
    longitude:          parseFloat(land.polygonCenterLng) || null,
    currency:           land.currency || "INR",
    zoning:             land.zoning || "",
  };

  if (!location.planning_authority) {
    errors.push("Planning authority is missing. Please fill in Land Identification.");
  }
  if (location.latitude === null || location.longitude === null) {
    errors.push(
      "Coordinates are missing. Save a polygon or enter Lat/Lng in Land Identification."
    );
  }
  if (!location.currency) {
    errors.push("Currency is missing. Please fill in Land Identification.");
  }

  // ── 2. ProductMixScenarios ────────────────────────────────────────────────
  let productMixRows = [];
  let activeScenarioId = selectedScenarioId;

  try {
    const rawScenarios = JSON.parse(
      localStorage.getItem("ProductMixScenarios") || "{}"
    );
    const scenarios = rawScenarios.scenarios || [];
    if (!activeScenarioId) {
      activeScenarioId =
        rawScenarios.activeScenarioId || scenarios[0]?.id || null;
    }
    const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
    if (activeScenario) {
      productMixRows = activeScenario.productMixRows || [];
    }
  } catch (e) {
    warnings.push("Could not read Product Mix data.");
  }

  if (productMixRows.length === 0) {
    warnings.push("Unit mix is empty. Product mix has not been saved.");
  }

  // ── 3. RevenueV2 ──────────────────────────────────────────────────────────
  let revenueRows = [];
  let totalRevenue = 0;

  try {
    const rawRevenue = JSON.parse(localStorage.getItem("RevenueV2") || "{}");
    const scenarioRev = (rawRevenue.scenarios || []).find(
      (s) => s.scenarioId === activeScenarioId
    );
    if (scenarioRev) {
      revenueRows = scenarioRev.rowRevenues || [];
      totalRevenue = scenarioRev.totalRevenue || 0;
    }
  } catch (e) {
    warnings.push("Could not read Revenue data.");
  }

  // ── 4. CostProjectDetailsV1 ───────────────────────────────────────────────
  let fixedInputs = {};
  let customFields = [];
  let constructionTimeline = "";

  try {
    const rawCost = JSON.parse(
      localStorage.getItem("CostProjectDetailsV1") || "{}"
    );
    const scenarioCost = rawCost[activeScenarioId] || {};
    fixedInputs = scenarioCost.fixedInputs || {};
    customFields = scenarioCost.customFields || [];
    constructionTimeline = String(fixedInputs.constructionTimeline || "").trim();
  } catch (e) {
    errors.push("Could not read Cost of Project Details data.");
  }

  const durationYears = parseFloat(constructionTimeline);
  if (!durationYears || durationYears < 1) {
    errors.push(
      "Project duration (Construction Timeline) is missing. " +
        "Please fill in Cost of Project Details."
    );
  }

  // Validate at least one non-zero cost
  const totalCostCheck = FIXED_COST_KEYS.reduce(
    (sum, k) => sum + (parseFloat(fixedInputs[k]) || 0),
    0
  ) + customFields.reduce((sum, f) => sum + (parseFloat(f.value) || 0), 0);

  if (totalCostCheck === 0) {
    errors.push("All cost head amounts are zero. Please fill in Cost of Project Details.");
  }

  // ── 5. Derive project-level fields ────────────────────────────────────────
  const assetClasses = productMixRows.map((r) => r.assetClass).filter(Boolean);
  const propertyTypes = productMixRows.map((r) => r.propertyType).filter(Boolean);
  const assetClass = mostCommon(assetClasses, "Residential");
  const propertyType = mostCommon(propertyTypes, "Flat");

  const totalUnits = productMixRows.reduce(
    (sum, r) => sum + (parseInt(r.totalInventory) || 0),
    0
  );
  const calculatedCarpet = productMixRows.reduce(
    (sum, r) =>
      sum + (parseFloat(r.pointArea) || 0) * (parseInt(r.totalInventory) || 0),
    0
  );

  // ── 6. Warnings ───────────────────────────────────────────────────────────
  // Carpet vs allotted area
  const totalAllotted = productMixRows.reduce(
    (sum, r) => sum + (parseFloat(r.allottedArea) || 0),
    0
  );
  if (totalAllotted > 0 && calculatedCarpet > 0) {
    const diffPct = Math.abs(calculatedCarpet - totalAllotted) / totalAllotted * 100;
    if (diffPct > 5) {
      warnings.push(
        `Calculated carpet area (${Math.round(calculatedCarpet).toLocaleString()} sqft) ` +
          `differs from allotted area (${Math.round(totalAllotted).toLocaleString()} sqft) ` +
          `by ${diffPct.toFixed(1)}%.`
      );
    }
  }

  // Miscellaneous cost share
  const miscAmt = parseFloat(fixedInputs.miscellaneousCost) || 0;
  if (totalCostCheck > 0 && miscAmt / totalCostCheck > 0.2) {
    warnings.push(
      `Miscellaneous Cost represents ${((miscAmt / totalCostCheck) * 100).toFixed(1)}% ` +
        "of total project cost. Consider breaking it into specific categories."
    );
  }

  // ── 7. Assemble payload ───────────────────────────────────────────────────
  const payload = {
    location,
    timeline: {
      duration_years: durationYears || 1,
    },
    product_mix_rows: productMixRows.map((r) => ({
      unitMix:        r.unitMix || r.bhkType || r.unitType || r.bhk || "",
      assetClass:     r.assetClass || "",
      propertyType:   r.propertyType || "",
      pointArea:      parseFloat(r.pointArea) || 0,
      rate:           parseFloat(r.rate) || 0,
      totalInventory: parseInt(r.totalInventory) || 0,
      allottedArea:   parseFloat(r.allottedArea) || 0,
    })),
    revenue_rows: revenueRows.map((r) => ({
      unitMix:    r.unitMix || r.bhkType || r.unitType || r.bhk || "",
      ticketSize: parseFloat(r.ticketSize) || 0,
      rowRevenue: parseFloat(r.rowRevenue) || 0,
    })),
    fixed_inputs:  fixedInputs,
    custom_fields: customFields,
    derived_metrics: {
      asset_class:                assetClass,
      property_type:              propertyType,
      total_units:                totalUnits,
      calculated_carpet_area_sqft: calculatedCarpet,
      total_project_cost:         totalCostCheck,
      estimated_revenue:          totalRevenue,
    },
    settings: {
      cost_escalation_enabled: false,
      escalation_pct:          0,
      web_research_enabled:    true,
    },
  };

  return { payload, errors, warnings };
}

/**
 * Parse the simulation result into the format FeasibilityIrrSection needs.
 * Returns: { [costRowKey]: { [yearIndex]: percentageString } }
 *
 * costRowKey matches the keys in FeasibilityIrrSection.dynamicRows.
 */
export function convertResultToIrrFormData(simulationResult) {
  const COST_CODE_TO_ROW_KEY = {
    LAND_ACQUISITION:    "landAcquisition",
    LAND_LEVELING:       "landLeveling",
    CONSTRUCTION_COST:   "constructionCost",
    MARKETING_SELLING:   "marketingCost",
    APPROVAL_COST:       "approvalCost",
    ADMINISTRATIVE_COST: "administrativeCost",
    TDR_COST:            "tdrCost",
    FINANCE_COST:        "financeCost",
    MISCELLANEOUS_COST:  "miscellaneousCost",
  };

  const result = {};
  for (const row of simulationResult.cost_rows || []) {
    const rowKey = COST_CODE_TO_ROW_KEY[row.cost_code] ||
      (row.cost_code.startsWith("CUSTOM_") ? `custom_${row.cost_code.replace("CUSTOM_", "").toLowerCase()}` : null);
    if (!rowKey) continue;

    result[rowKey] = {};
    for (const alloc of row.allocations || []) {
      result[rowKey][alloc.year_index] = String(alloc.percentage);
    }
  }
  return result;
}
