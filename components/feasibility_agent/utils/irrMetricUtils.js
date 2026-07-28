export const SALES_INFO_BHK_TYPES = ["1Bhk", "2Bhk", "3Bhk", ">3Bhk", "Shop", "Office"];

export const CASH_OUTFLOW_ROWS = [
  { key: "landCost", label: "Land Cost" },
  { key: "approvalCost", label: "Approval Cost" },
  { key: "constructionCost", label: "Construction Cost" },
  { key: "administrativeCost", label: "Administrative Cost" },
  { key: "ancillaryCost", label: "Ancillary Cost" },
  { key: "tdrCost", label: "TDR Cost" },
  { key: "premiumCost", label: "Premium Cost" },
  { key: "marketingCost", label: "Marketing and Selling Cost" },
  { key: "contingencyCost", label: "Contingency Cost" },
  { key: "financeCost", label: "Finance Cost" },
  { key: "miscellaneousCost", label: "Miscellaneous Cost" },
];

export const normalizeMetricKey = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, "");

export const pickByNormalizedKey = (source = {}, key) => {
  const normalized = normalizeMetricKey(key);
  const foundEntry = Object.entries(source).find(
    ([entryKey]) => normalizeMetricKey(entryKey) === normalized
  );
  return foundEntry ? foundEntry[1] : undefined;
};

export const getTicketSizeSummaryRows = (summary = {}, method = "bayesian") => {
  const unitSummary = summary.unitSummary || {};
  const expectedRevenueBase = summary.expectedRevenueBase || {};
  const expectedRevenueBayes = summary.expectedRevenueBayes || {};

  return SALES_INFO_BHK_TYPES.map((bhk) => {
    const key = normalizeMetricKey(bhk).replace(/bhk$/i, "BHK");
    const normalizedKey = key.replace(/BHK$/, "BHK");
    const unit = pickByNormalizedKey(unitSummary, normalizedKey) || {};
    const numUnits = Number(unit.numUnits) || 0;
    const baseRevenue = Number(pickByNormalizedKey(expectedRevenueBase, normalizedKey)) || 0;
    const bayesRevenue = Number(pickByNormalizedKey(expectedRevenueBayes, normalizedKey)) || 0;
    const selectedRevenue = method === "bayesian" ? bayesRevenue : baseRevenue;
    const perUnitCost = numUnits > 0 && selectedRevenue > 0 ? selectedRevenue / numUnits : "";

    return {
      bhk,
      key: normalizedKey,
      numUnits,
      perUnitCost,
    };
  });
};

export const findTransactionsForTicket = (transactionRows = [], ticketSize) => {
  const selectedTicket = Number(ticketSize) || 0;
  if (!Array.isArray(transactionRows) || selectedTicket <= 0) return "";

  const exact = transactionRows.find(
    (row) => Math.round(Number(row.ticketSize) || 0) === Math.round(selectedTicket)
  );
  if (exact) return Number(exact.totalTransactions) || "";

  const closest = transactionRows.reduce((best, row) => {
    const rowTicket = Number(row.ticketSize) || 0;
    if (rowTicket <= 0) return best;
    const diff = Math.abs(rowTicket - selectedTicket);
    if (!best || diff < best.diff) {
      return { diff, row };
    }
    return best;
  }, null);

  return closest ? Number(closest.row.totalTransactions) || "" : "";
};

export const formatMetricNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(Number(value) || 0)
  );

export const getCashOutflowRows = (costBreakdown = {}) => {
  const proposed = costBreakdown.proposed || {};
  const rows = CASH_OUTFLOW_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    value: Number(proposed[row.key]) || 0,
  }));
  const totalCostOfProject = rows.reduce((total, row) => total + row.value, 0);

  return {
    rows,
    totalCostOfProject,
  };
};

export const getMeansOfFinanceRows = (financeValues = {}) => {
  const rows = Array.isArray(financeValues.rows) ? financeValues.rows : [];
  return {
    rows: rows.map((row) => ({
      key: row.key,
      label: row.label,
      percentage: Number(row.percentage) || 0,
      permissible: Number(row.permissible) || 0,
      proposed: Number(row.proposed) || 0,
    })),
    totalPercentage: Number(financeValues.totalPercentage) || 0,
    totalCostOfProject: {
      permissible: Number(financeValues.totalCostOfProject?.permissible) || 0,
      proposed: Number(financeValues.totalCostOfProject?.proposed) || 0,
    },
  };
};
