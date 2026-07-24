/**
 * Maps cashflow simulation output → IRR Calculation Form (year % inputs).
 * revenueSchedulePercentage → cashflow (Sales Cash Inflow)
 */
const COST_KEY_TO_FORM_KEY = {
  landCost: "landcost",
  approvalCost: "approvalcost",
  constructionCost: "constructioncost",
  administrativeCost: "administrativecost",
  ancillaryCost: "ancillarycost",
  tdrCost: "tdrcost",
  premiumCost: "premiumcost",
  marketingCost: "marketingcost",
  contingencyCost: "contingencycost",
  financeCost: "financecost",
  miscellaneousCost: "miscellaneouscost",
};

const EMPTY_IRR_FORM_DATA = () => ({
  cashflow: {},
  landcost: {},
  approvalcost: {},
  constructioncost: {},
  administrativecost: {},
  ancillarycost: {},
  tdrcost: {},
  premiumcost: {},
  marketingcost: {},
  contingencycost: {},
  financecost: {},
  miscellaneouscost: {},
});

const parseYearIndex = (key) => {
  if (key === null || key === undefined) return null;
  if (typeof key === "number" && Number.isInteger(key) && key >= 0) {
    return key;
  }
  const text = String(key).trim().toLowerCase().replace(/_/g, "");
  const yearMatch = text.match(/^year?(\d+)$/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  if (/^\d+$/.test(text)) {
    return parseInt(text, 10);
  }
  return null;
};

/**
 * Converts { year0: 5, year1: 10 } or { 0: 5, 1: 10 } → { 0: 5, 1: 10 } for form inputs.
 */
export const scheduleToFormYearMap = (schedule) => {
  const out = {};
  if (!schedule || typeof schedule !== "object") {
    return out;
  }

  Object.entries(schedule).forEach(([key, value]) => {
    const yearIndex = parseYearIndex(key);
    if (yearIndex === null) return;
    const num = parseFloat(value);
    out[yearIndex] = Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
  });

  return out;
};

/**
 * @param {object} simulationResult - API cashflow simulation data
 * @returns {{ projectDuration: number, formData: object }}
 */
export function mapSimulationToIrrForm(simulationResult) {
  if (!simulationResult || typeof simulationResult !== "object") {
    return {
      projectDuration: 1,
      formData: EMPTY_IRR_FORM_DATA(),
    };
  }

  const projectionYears = Number(simulationResult.cashflowProjectionYears);
  const projectDuration =
    Number.isFinite(projectionYears) && projectionYears >= 0
      ? Math.min(15, Math.max(0, Math.round(projectionYears)))
      : 1;

  const formData = EMPTY_IRR_FORM_DATA();

  formData.cashflow = scheduleToFormYearMap(
    simulationResult.revenueSchedulePercentage
  );

  const costSchedule = simulationResult.costSchedulePercentage || {};
  Object.entries(costSchedule).forEach(([costKey, schedule]) => {
    const formKey = COST_KEY_TO_FORM_KEY[costKey];
    if (formKey) {
      formData[formKey] = scheduleToFormYearMap(schedule);
    }
  });

  return {
    projectDuration: projectDuration || 1,
    formData,
  };
}

export function saveIrrFormToStorage({ projectDuration, formData }) {
  const payload = {
    projectDuration,
    formData,
    timestamp: new Date().toISOString(),
    source: "cashflowSimulation",
  };
  localStorage.setItem("irrForm", JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("irrFormAutofilled", { detail: payload }));
  return payload;
}
