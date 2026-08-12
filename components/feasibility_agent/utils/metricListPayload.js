import {
  findTransactionsForTicket,
  getCashOutflowRows,
  getMeansOfFinanceRows,
  getTicketSizeSummaryRows,
  pickByNormalizedKey,
} from "./irrMetricUtils";

/** Round like Metric List display (whole numbers). */
export const toMetricJsonNumber = (value) => {
  if (value === "" || value == null) {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.round(num);
};

/**
 * Loads the same data shown in the Metric List panel (from localStorage + scenario).
 */
export function loadMetricListData(selectedScenario = "Most Probable") {
  const revenueForm = JSON.parse(localStorage.getItem("revenueForm") || "{}");
  const revenueMethod = revenueForm.revenueMethod || "bayesian";

  const ticketSummary = JSON.parse(localStorage.getItem("ticketSizeSummary") || "{}");
  const summaryRows = getTicketSizeSummaryRows(ticketSummary, revenueMethod);
  const transactionKey =
    revenueMethod === "bayesian"
      ? "bayesianOptimizerTransactions"
      : "ticketSizeSimulationTransactions";
  const transactionPayload = JSON.parse(localStorage.getItem(transactionKey) || "{}");
  const transactionRowsByType = transactionPayload.rows || transactionPayload;

  const salesInfoRows = summaryRows.map((summaryRow) => {
    const transactionRows =
      pickByNormalizedKey(transactionRowsByType, summaryRow.bhk) || [];
    return {
      bhk: summaryRow.bhk,
      perUnitCost: summaryRow.perUnitCost,
      noOfUnits: summaryRow.numUnits,
      transactionsPerYear: findTransactionsForTicket(
        transactionRows,
        summaryRow.perUnitCost
      ),
    };
  });

  const costBreakdown = JSON.parse(localStorage.getItem("calculatedCostValues") || "{}");
  const cashOutflow = getCashOutflowRows(costBreakdown);

  const financeValues = JSON.parse(localStorage.getItem("meansOfFinanceValues") || "{}");
  const meansOfFinance = getMeansOfFinanceRows(financeValues);

  const costForm = JSON.parse(localStorage.getItem("costForm") || "{}");
  const constructionTimeline = String(costForm.constructionTimeline || "").trim();

  return {
    salesInfoMethod: revenueMethod,
    selectedScenario,
    salesInfoRows,
    cashOutflowRows: cashOutflow.rows,
    cashOutflowTotal: cashOutflow.totalCostOfProject,
    meansOfFinanceRows: meansOfFinance.rows,
    meansOfFinanceTotalPercentage: meansOfFinance.totalPercentage,
    meansOfFinanceTotals: meansOfFinance.totalCostOfProject,
    constructionTimeline,
  };
}

/**
 * Builds simulation API payload from Metric List data (matches UI tables).
 */
export function buildMetricListSimulationPayload(metricData) {
  const {
    salesInfoMethod,
    selectedScenario,
    salesInfoRows,
    cashOutflowRows,
    cashOutflowTotal,
    meansOfFinanceRows,
    meansOfFinanceTotalPercentage,
    meansOfFinanceTotals,
    constructionTimeline,
  } = metricData;

  return {
    generatedAt: new Date().toISOString(),
    salesInfoMethod,
    selectedScenario,
    salesInfo: (salesInfoRows || []).map((row) => ({
      bhk: row.bhk,
      perUnitCost: toMetricJsonNumber(row.perUnitCost),
      noOfUnits: toMetricJsonNumber(row.noOfUnits),
      transactionsPerYear: toMetricJsonNumber(row.transactionsPerYear),
    })),
    collectionSchedule: {
      selectedValue: selectedScenario,
    },
    cashOutflow: {
      rows: (cashOutflowRows || []).map((row) => ({
        key: row.key,
        label: row.label,
        value: toMetricJsonNumber(row.value) ?? 0,
      })),
      totalCostOfProject: toMetricJsonNumber(cashOutflowTotal) ?? 0,
    },
    meansOfFinance: {
      rows: (meansOfFinanceRows || []).map((row) => ({
        key: row.key,
        label: row.label,
        percentage: toMetricJsonNumber(row.percentage) ?? 0,
        proposed: toMetricJsonNumber(row.proposed) ?? 0,
      })),
      totalPercentage: toMetricJsonNumber(meansOfFinanceTotalPercentage) ?? 0,
      totalCostOfProject: toMetricJsonNumber(meansOfFinanceTotals?.proposed) ?? 0,
    },
    constructionTimeline,
  };
}

/** @deprecated Use buildMetricListSimulationPayload */
export function buildIrrSimulationPayload(metricData) {
  return buildMetricListSimulationPayload(metricData);
}
