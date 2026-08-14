/**
 * FeasibilityReport.jsx
 * ─────────────────────────────────────────────────────────────────────
 * Generates a professional, print-optimised feasibility report as an
 * HTML document, opens it in a new tab, and auto-triggers the browser
 * print dialog so the user can "Save as PDF".
 *
 * Follows the same proven pattern used by ValuationReport.jsx.
 * ─────────────────────────────────────────────────────────────────────
 */

/* ── Section IDs mirrored from RegulatoryIntelligence.jsx ───────── */
const REGULATORY_SECTION_TITLES = {
  reservations: "Reservations (Master Plan / Survey Map)",
  "environmental-compliance": "Environmental Compliance",
  "height-restrictions": "Height Restrictions",
  "heritage-restrictions": "Heritage Restrictions",
  "airport-clearances": "Airport Clearances",
  "development-regulations": "Development Regulations",
  "buffer-distance": "Buffer Distance from Roads",
  "fsi-sanctioned-details": "FSI Sanctioned Details",
  "setbacks-margins": "Setbacks and Margins",
  "parking-access": "Parking and Access Requirements",
  "ground-coverage": "Ground Coverage Percentage",
};

/* ── Cost labels mirrored from FeasibilityIrrSection.jsx ─────────── */
const FIXED_COST_LABELS = {
  landAcquisition: "Land Acquisition",
  landLeveling: "Land Leveling",
  constructionCost: "Construction Cost",
  marketingCost: "Marketing & Selling Cost",
  approvalCost: "Approval Cost",
  administrativeCost: "Administrative Cost",
  tdrCost: "TDR Cost",
  financeCost: "Finance Cost",
  miscellaneousCost: "Miscellaneous Cost",
};

/* ── Finance row labels mirrored from MeansOfFinance.jsx ───────── */
const FIXED_FINANCE_LABELS = {
  promoterEquityUnsecuredLoan: "Promoter Equity",
  bankFinance: "Bank & Debt Finance",
  salesCollection: "Customer Advances",
};

/* ===================================================================
   HELPERS & CHART GENERATORS
   =================================================================== */

function getCurrencySymbol(code) {
  const c = (code || "INR").toUpperCase().trim();
  const map = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ" };
  return map[c] || c + " ";
}

function fmtCurrencyVal(val, sym) {
  if (val == null || isNaN(Number(val))) return "—";
  const n = Number(val);
  return sym + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtCurrencyCompact(val, sym) {
  if (val == null || isNaN(Number(val))) return "—";
  const n = Number(val);
  if (n >= 10000000) return sym + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return sym + (n / 100000).toFixed(2) + " L";
  return sym + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtNum(val) {
  if (val == null || isNaN(Number(val))) return "—";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val));
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(str, len = 500) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

function stripMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\|/g, " ")
    .replace(/-{3,}/g, "");
}

/* Legacy SVG Chart Generator functions removed – now rendering premium interactive Chart.js graphs */

function generateGanttChart(rows) {
  if (!rows || rows.length === 0) {
    return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; color: #64748b; font-size: 8px;">
      No timetable milestones configured. Visit the Construction Timetable tool to map your stages.
    </div>`;
  }
  
  const hasStages = rows.some(row => row.stages && row.stages.length > 0);
  if (!hasStages) {
    return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; color: #64748b; font-size: 8px;">
      No timetable milestones configured. Visit the Construction Timetable tool to map your stages.
    </div>`;
  }
  
  const STAGE_LABELS = {
    excavation: "Excavation",
    foundation: "Foundation / Substructure",
    structure: "RCC Frame / Structure",
    brickwork: "Brickwork / Plastering",
    finishing: "Finishing & Interiors",
    ancillary: "Ancillary & External Works",
  };
  
  const stageTimeline = {};
  rows.forEach((row, qIdx) => {
    const stages = row.stages || [];
    stages.forEach(st => {
      if (!stageTimeline[st]) {
        stageTimeline[st] = { start: qIdx, end: qIdx };
      } else {
        stageTimeline[st].end = qIdx;
      }
    });
  });

  const uniqueStages = Object.keys(stageTimeline);
  if (uniqueStages.length === 0) return "";

  const width = 600;
  const barHeight = 14;
  const barGap = 6;
  const paddingLeft = 140;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 25;
  const height = paddingTop + paddingBottom + uniqueStages.length * (barHeight + barGap);
  
  const numQuarters = rows.length;
  const chartWidth = width - paddingLeft - paddingRight;
  const qStep = chartWidth / numQuarters;

  let gridLines = "";
  for (let i = 0; i <= numQuarters; i++) {
    const x = paddingLeft + i * qStep;
    gridLines += `<line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${height - paddingBottom}" stroke="#e2e8f0" stroke-width="1" />`;
    if (i < numQuarters) {
      gridLines += `<text x="${x + qStep/2}" y="${height - 8}" fill="#64748b" font-size="7" font-weight="700" text-anchor="middle">Q${i + 1}</text>`;
    }
  }

  let barsHtml = "";
  uniqueStages.forEach((st, idx) => {
    const y = paddingTop + idx * (barHeight + barGap);
    const timeline = stageTimeline[st];
    const x = paddingLeft + timeline.start * qStep;
    const barW = (timeline.end - timeline.start + 1) * qStep;
    const label = STAGE_LABELS[st] || st.charAt(0).toUpperCase() + st.slice(1);
    
    barsHtml += `<text x="${paddingLeft - 8}" y="${y + 10}" fill="#334155" font-size="8" font-weight="700" text-anchor="end">${escHtml(label)}</text>`;
    barsHtml += `<rect x="${x}" y="${y}" width="${barW}" height="${barHeight}" fill="#448C74" rx="3" />`;
    
    const durationMonths = (timeline.end - timeline.start + 1) * 3;
    barsHtml += `<text x="${x + barW/2}" y="${y + 10}" fill="#ffffff" font-size="7" font-weight="800" text-anchor="middle">${durationMonths}m</text>`;
  });

  return `
  <div style="text-align: center; margin: 20px 0; page-break-inside: avoid;">
    <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Project Schedule Milestone Timeline (Gantt Chart)</div>
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: ${width}px; background:#fafbfc; border:1px solid #e2e8f0; border-radius:8px; padding: 10px;">
      ${gridLines}
      ${barsHtml}
    </svg>
  </div>`;
}

/* ===================================================================
   DATA COLLECTION
   =================================================================== */

function collectReportData() {
  const get = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const land = get("Land Identification") || {};
  const landGeoJson = get("subject project") || null;
  const regulatory = get("Regulatory Intelligence") || {};
  const market = get("market research") || {};
  const comps = get("cache_comparableProjects") || [];
  const productMix = get("ProductMixScenarios") || {};
  const revenueV2 = get("RevenueV2") || {};
  const costDetails = get("CostProjectDetailsV1") || {};
  const meansOfFinance = get("MeansOfFinanceV1") || {};
  const irrForm = get("irrFormV2") || {};
  const scheduleRows = get("constructionTable_rows") || [];

  return { land, landGeoJson, regulatory, market, comps, productMix, revenueV2, costDetails, meansOfFinance, irrForm, scheduleRows };
}

/* ===================================================================
   COMPLETENESS VALIDATION
   =================================================================== */

export function checkFeasibilityCompleteness() {
  const missing = [];
  const get = (key) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
  };

  const land = get("Land Identification");
  if (!land || !land.location) missing.push("Land Identification");

  const reg = get("Regulatory Intelligence");
  if (!reg || !reg.sectionResults) {
    missing.push("Regulatory Intelligence");
  } else {
    const answeredCount = Object.values(reg.sectionResults).filter(
      (r) => r.status === "completed"
    ).length;
    if (answeredCount === 0) missing.push("Regulatory Intelligence (no sections analyzed)");
  }

  const pm = get("ProductMixScenarios");
  if (!pm || !pm.scenarios || pm.scenarios.length === 0) {
    missing.push("Product Mix Design");
  }

  const cost = get("CostProjectDetailsV1");
  if (!cost || Object.keys(cost).length === 0) {
    missing.push("Cost of Project Details");
  }

  const mof = get("MeansOfFinanceV1");
  if (!mof || Object.keys(mof).length === 0) {
    missing.push("Means of Finance");
  }

  const irr = get("irrFormV2");
  if (!irr || !irr.formData || Object.keys(irr.formData).length === 0) {
    missing.push("IRR Calculator (breakdown not saved)");
  }

  return { complete: missing.length === 0, missing };
}

/* ===================================================================
   HTML BUILDER
   =================================================================== */

function buildReportHTML(data, logoBase64) {
  const { land, landGeoJson, regulatory, comps, productMix, revenueV2, costDetails, meansOfFinance, irrForm, scheduleRows } = data;
  const currencyCode = land.currency || "INR";
  const sym = getCurrencySymbol(currencyCode);
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const scenarios = productMix.scenarios || [];

  const subjectLat = parseFloat(land.polygonCenterLat || land.latitude || 0);
  const subjectLng = parseFloat(land.polygonCenterLng || land.longitude || 0);
  const polygonCoords = landGeoJson?.geometry?.coordinates?.[0] || [];

  const scenarioKPIs = scenarios.map((sc) => {
    let totalRevenue = 0;
    if (sc.productMixRows) {
      sc.productMixRows.forEach((row) => {
        totalRevenue += Number(row.pointArea || 0) * Number(row.rate || 0) * Number(row.totalInventory || 0);
      });
    }
    const costData = costDetails[sc.id] || {};
    const fixed = costData.fixedInputs || {};
    const custom = costData.customFields || [];
    const totalCost =
      Object.entries(fixed)
        .filter(([k]) => k !== "constructionTimeline")
        .reduce((acc, [, v]) => acc + (Number(v) || 0), 0) +
      custom.reduce((acc, f) => acc + (Number(f.value) || 0), 0);
    const netProfit = totalRevenue - totalCost;
    return { id: sc.id, name: sc.name, totalRevenue, totalCost, netProfit };
  });

  const jCurveData = scenarios.map((sc) => {
    let totalRev = 0;
    if (revenueV2.scenarios) {
      const sr = revenueV2.scenarios.find((s) => s.scenarioId === sc.id);
      if (sr) totalRev = sr.totalRevenue || 0;
    }

    const scenarioCostData = costDetails[sc.id] || {};
    const fixedInputs = scenarioCostData.fixedInputs || {};
    const customFields = scenarioCostData.customFields || [];
    const dynamicRows = [{ key: "sales_cash_inflow", label: "Sales Cash Inflow", totalAmount: totalRev }];
    Object.keys(FIXED_COST_LABELS).forEach((key) => {
      dynamicRows.push({ key, label: FIXED_COST_LABELS[key], totalAmount: Number(fixedInputs[key]) || 0 });
    });
    customFields.forEach((f) => {
      dynamicRows.push({ key: `custom_${f.id}`, label: f.name || "Custom", totalAmount: Number(f.value) || 0 });
    });

    const scenarioFormData = (irrForm.formData || {})[sc.id] || {};
    const projectDuration = (irrForm.projectDurations || {})[sc.id] || 1;
    const yearsArray = Array.from({ length: projectDuration + 1 }, (_, i) => i);

    const getYearVal = (rowKey, year, total) => {
      const pct = scenarioFormData[rowKey]?.[year] || 0;
      return (parseFloat(pct) / 100) * (total || 0);
    };

    const revenueYearly = yearsArray.map((y) => getYearVal("sales_cash_inflow", y, totalRev));
    const costRowsData = dynamicRows.filter((r) => r.key !== "sales_cash_inflow");
    const costYearlyTotals = yearsArray.map((y) =>
      costRowsData.reduce((sum, r) => sum + getYearVal(r.key, y, r.totalAmount), 0)
    );
    const netCashYearly = yearsArray.map((y) => revenueYearly[y] - costYearlyTotals[y]);

    let cumulative = 0;
    const cumulativeCashFlows = netCashYearly.map((val) => {
      cumulative += val;
      return Math.round(cumulative * 100) / 100;
    });

    return {
      id: sc.id,
      name: sc.name,
      years: yearsArray.map((y) => `Yr ${y}`),
      cumulativeCashFlows,
    };
  });

  const primaryKPI = scenarioKPIs[0] || { totalRevenue: 0, totalCost: 0, netProfit: 0 };
  const logoImg = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" style="height:42px;object-fit:contain;" alt="Logo" />`
    : `<span class="brand-name">SIGMAVALUE</span>`;

  const projectLocation = [land.location, land.village, land.country].filter(Boolean).join(", ");
  const projectTitle = projectLocation || "Feasibility Study";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Feasibility Report - ${escHtml(projectTitle)}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1e293b;
    background: white;
    font-size: 10px;
    line-height: 1.55;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .page {
    padding: 44px 48px;
    max-width: 900px;
    margin: 20px auto;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    position: relative;
    box-sizing: border-box;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
    page-break-inside: avoid;
  }

  /* Sleek decorative inner border for premium institutional report feel */
  .page::before {
    content: "";
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 16px;
    right: 16px;
    border: 1px solid #e2e8f0;
    pointer-events: none;
    border-radius: 6px;
  }

  /* Double accent border for cover page */
  .page-cover::before {
    border: 3px double #448C74 !important;
  }

  .report-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 16px; border-bottom: 3px solid #448C74; margin-bottom: 24px;
    position: relative;
    z-index: 2;
  }
  .brand-name { font-size: 20px; font-weight: 900; color: #448C74; letter-spacing: 0.03em; }
  .brand-sub { font-size: 8px; color: #64748b; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 12px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; }
  .doc-title .date { font-size: 8px; color: #64748b; margin-top: 3px; }

  .page-footer {
    border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 32px;
    display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8;
    position: relative;
    z-index: 2;
  }

  .cover-page {
    min-height: 80vh; display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    position: relative;
    z-index: 2;
  }
  .cover-logo { margin-bottom: 30px; }
  .cover-logo img { height: 50px; }
  .cover-title { font-size: 30px; font-weight: 900; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.01em; }
  .cover-subtitle { font-size: 13px; font-weight: 500; color: #64748b; margin-bottom: 6px; }
  .cover-location { font-size: 15px; font-weight: 700; color: #448C74; margin-bottom: 30px; }
  .cover-date { font-size: 9px; color: #94a3b8; letter-spacing: 0.06em; text-transform: uppercase; }
  .cover-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; margin-top: 8px;
  }

  .kpi-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    margin-top: 40px; width: 100%; max-width: 650px;
  }
  .kpi-card {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;
    text-align: center;
  }
  .kpi-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 900; color: #0f172a; font-family: 'JetBrains Mono', monospace; }
  .kpi-value.green { color: #059669; }
  .kpi-value.red { color: #dc2626; }

  .section { margin-bottom: 24px; position: relative; z-index: 2; width: 100%; }
  .section-num { font-size: 9px; font-weight: 900; color: #448C74; letter-spacing: 0.06em; text-transform: uppercase; }
  .section-title {
    font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em;
    color: #0f172a; border-bottom: 2px solid #448C74; padding-bottom: 6px; margin-bottom: 14px; margin-top: 2px;
  }

  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 16px; }
  th {
    background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.04em; padding: 7px 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 8px;
  }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
  tr:nth-child(even) td { background: #fafbfc; }
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .font-black { font-weight: 900; }
  .total-row td { font-weight: 800 !important; background: #f0fdf4 !important; color: #065f46 !important; border-top: 2px solid #a7f3d0; }

  .reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .reg-card {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
    background: #fff; page-break-inside: avoid;
  }
  .reg-card-title {
    font-size: 9px; font-weight: 800; color: #0f172a; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .reg-badge {
    display: inline-block; padding: 1px 6px; border-radius: 10px;
    font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .reg-badge.completed { background: #dcfce7; color: #16a34a; }
  .reg-badge.pending { background: #fef3c7; color: #d97706; }
  .reg-body { font-size: 8px; color: #64748b; line-height: 1.5; }

  .scenario-header {
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
    border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px;
    margin-bottom: 12px; page-break-inside: avoid;
  }
  .scenario-header h4 { font-size: 11px; font-weight: 800; color: #065f46; margin: 0; }
  .scenario-header .sub { font-size: 8px; color: #059669; margin-top: 2px; }

  .mof-bar {
    height: 18px; border-radius: 9px; overflow: hidden; display: flex; margin: 10px 0 6px;
  }
  .mof-segment { height: 100%; }
  .mof-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 8px; color: #475569; }
  .mof-legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 4px; vertical-align: middle; }

  .disclaimer {
    background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
    padding: 10px 14px; font-size: 8px; color: #92400e; margin-top: 20px; line-height: 1.6;
  }

  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .page {
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      width: 100% !important;
      height: 100vh !important;
      min-height: 100vh !important;
      padding: 28px 32px !important;
      page-break-after: always !important;
      page-break-inside: avoid !important;
    }
    .page::before {
      top: 10px !important;
      bottom: 10px !important;
      left: 10px !important;
      right: 10px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
    }
    .page-cover::before {
      border: 3px double #448C74 !important;
    }
    .page-break { page-break-before: always !important; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 1: COVER PAGE & EXECUTIVE SUMMARY
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-cover">
  <div class="cover-page">
    <div class="cover-logo">
      ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height:60px;" alt="SigmaValue" />` : `<div class="brand-name" style="font-size:28px;">SIGMAVALUE</div>`}
    </div>
    <div class="cover-subtitle">AI-Powered Real Estate Intelligence</div>
    <div class="cover-title">Feasibility Study Report</div>
    <div class="cover-location">${escHtml(projectTitle)}</div>
    ${land.surveyNumber ? `<div style="font-size:10px;color:#64748b;margin-bottom:8px;">Survey No: ${escHtml(land.surveyNumber)}${land.ctsNumber ? ` | CTS: ${escHtml(land.ctsNumber)}` : ""}</div>` : ""}
    <div class="cover-date">${dateStr} | ${timeStr}</div>
    <div class="cover-badge">Confidential Document</div>

    <div style="display: flex; gap: 12px; margin-top: 30px; justify-content: center; width: 100%; max-width: 650px;">
      <div class="kpi-card" style="flex: 1;">
        <div class="kpi-label">Net Plot Area</div>
        <div class="kpi-value">${land.netPlotAreaSqFt ? fmtNum(land.netPlotAreaSqFt) : "—"}</div>
        <div style="font-size:7px;color:#94a3b8;">sq.ft</div>
      </div>
      <div class="kpi-card" style="flex: 1;">
        <div class="kpi-label">Planning Authority</div>
        <div class="kpi-value" style="font-size:11px;font-family:Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(land.planningAuthority || "—")}</div>
      </div>
      <div class="kpi-card" style="flex: 1;">
        <div class="kpi-label">Scenarios Analyzed</div>
        <div class="kpi-value">${scenarios.length}</div>
      </div>
    </div>

    <div style="width: 100%; max-width: 650px; margin-top: 24px; text-align: left;">
      <div style="font-size: 8px; font-weight: 800; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Executive Scenario Summary</div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${scenarioKPIs.map((k, idx) => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: #448C74;">Scenario ${idx + 1}: ${escHtml(k.name)}</div>
            </div>
            <div style="display: flex; gap: 24px;">
              <div style="text-align: right;">
                <div style="font-size: 7px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Cost</div>
                <div style="font-size: 11px; font-weight: 700; color: #0f172a; font-family: 'JetBrains Mono', monospace;">${fmtCurrencyCompact(k.totalCost, sym)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 7px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Revenue</div>
                <div style="font-size: 11px; font-weight: 700; color: #059669; font-family: 'JetBrains Mono', monospace;">${fmtCurrencyCompact(k.totalRevenue, sym)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 7px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Surplus</div>
                <div style="font-size: 11px; font-weight: 900; color: ${k.netProfit >= 0 ? "#059669" : "#dc2626"}; font-family: 'JetBrains Mono', monospace;">${fmtCurrencyCompact(k.netProfit, sym)}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${dateStr}</span>
    <span>Page 1</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 2: LAND DETAILS & INTEGRATED SITE MAP
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>Land & Site Details</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">Section 01</div>
    <div class="section-title">Land Identification & Site Parameters</div>
    
    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; align-items: start;">
      <div>
        <table>
          <tbody>
            ${[
              ["Country", land.country],
              ["City / Location", land.location],
              ["Village", land.village],
              ["Planning Authority", land.planningAuthority],
              ["Survey Number", land.surveyNumber],
              ["CTS Number", land.ctsNumber],
              ["Net Plot Area", land.netPlotAreaSqFt ? fmtNum(land.netPlotAreaSqFt) + " sq.ft" : ""],
              ["Polygon Area", land.polygonAreaSqft ? fmtNum(land.polygonAreaSqft) + " sq.ft" : ""],
              ["Coordinates", (subjectLat && subjectLng) ? `${subjectLat.toFixed(6)}, ${subjectLng.toFixed(6)}` : ""],
              ["Zoning", land.zoning],
              ["Development Category", land.developmentCategory],
              ["Road Category", land.roadCategory],
              ["Road Widening", land.roadWidening],
              ["Built-up Density", land.builtupDensity],
              ["Boundary Verification", land.boundaryVerification],
              ["Ownership Summary", land.ownershipSummary],
            ].filter(([, v]) => v).map(([label, val]) =>
              `<tr><td style="font-weight:700;color:#0f172a;width:40%;padding:5px 8px;">${escHtml(label)}</td><td style="padding:5px 8px;">${escHtml(String(val))}</td></tr>`
            ).join("")}
          </tbody>
        </table>
      </div>
      <div>
        <div style="font-size: 8px; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Interactive Site Map</div>
        <div id="print-map" style="height: 280px; width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #f8fafc;"></div>
        <div style="font-size: 7.5px; color: #64748b; margin-top: 6px; line-height: 1.4;">
          <span style="display:inline-block; width:8px; height:8px; background:#448C74; border:1px solid white; border-radius:50%; margin-right:4px;"></span>Subject plot boundary highlight<br>
          <span style="display:inline-block; width:8px; height:8px; background:#2563eb; border:1px solid white; border-radius:50%; margin-right:4px;"></span>Competitor/Comparable projects
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 2</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 3: REGULATORY INTELLIGENCE
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>Regulatory Intelligence</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">Section 02</div>
    <div class="section-title">Regulatory Compliance Snapshot</div>

    <div class="reg-grid">
      ${Object.entries(REGULATORY_SECTION_TITLES).map(([id, title]) => {
        const result = regulatory.sectionResults?.[id] || {};
        const isCompleted = result.status === "completed";
        const answer = result.answer ? truncate(stripMarkdown(result.answer), 320) : "Not analyzed";
        return `
        <div class="reg-card">
          <div class="reg-card-title">
            <span class="reg-badge ${isCompleted ? "completed" : "pending"}">
              ${isCompleted 
                ? `<svg style="width:8px; height:8px; stroke:currentColor; stroke-width:3.5; fill:none; margin-right:2px; vertical-align:middle;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> Done` 
                : `<svg style="width:8px; height:8px; stroke:currentColor; stroke-width:3.5; fill:none; margin-right:2px; vertical-align:middle;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg> Pending`
              }
            </span>
            ${escHtml(title)}
          </div>
          <div class="reg-body">${escHtml(answer)}</div>
        </div>`;
      }).join("")}
    </div>
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 3</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 4: PRODUCT MIX & REVENUE
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>Product Mix & Revenue</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">Section 03</div>
    <div class="section-title">Product Mix Design & Revenue – All Scenarios</div>

    ${scenarios.map((sc, sIdx) => {
      const rows = sc.productMixRows || [];
      let scenarioTotalRevenue = 0;
      const rowsHTML = rows.map((row) => {
        const ticketSize = Number(row.pointArea || 0) * Number(row.rate || 0);
        const inv = Number(row.totalInventory || 0);
        const rowRev = ticketSize * inv;
        scenarioTotalRevenue += rowRev;
        return `<tr>
          <td>${escHtml(row.assetClass || "—")}</td>
          <td>${escHtml(row.propertyType || "—")}</td>
          <td>${escHtml(row.unitMix || "—")}</td>
          <td class="text-right mono">${fmtNum(row.pointArea || 0)}</td>
          <td class="text-right mono">${fmtCurrencyVal(row.rate, sym)}</td>
          <td class="text-right mono">${fmtCurrencyVal(ticketSize, sym)}</td>
          <td class="text-center mono">${inv || "—"}</td>
          <td class="text-right mono">${fmtNum(row.allottedArea || 0)}</td>
          <td class="text-right mono font-black" style="color:#059669;">${fmtCurrencyCompact(rowRev, sym)}</td>
        </tr>`;
      }).join("");

      return `
      <div class="scenario-header" ${sIdx > 0 ? 'style="margin-top:20px;"' : ""}>
        <h4>Scenario ${sIdx + 1}: ${escHtml(sc.name || `Scenario ${sIdx + 1}`)}</h4>
        <div class="sub">Total Revenue: ${fmtCurrencyCompact(scenarioTotalRevenue, sym)} | ${rows.length} product line(s)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Asset Class</th>
            <th>Type</th>
            <th>Unit Mix</th>
            <th class="text-right">Area (sqft)</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Ticket Size</th>
            <th class="text-center">Inventory</th>
            <th class="text-right">Allotted Area</th>
            <th class="text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
          <tr class="total-row">
            <td colspan="6" style="text-align:right;font-weight:900;">Scenario Total Revenue</td>
            <td class="text-center mono font-black">${rows.reduce((a, r) => a + (Number(r.totalInventory) || 0), 0)}</td>
            <td class="text-right mono font-black">${fmtNum(rows.reduce((a, r) => a + (Number(r.allottedArea) || 0), 0))}</td>
            <td class="text-right mono font-black">${fmtCurrencyCompact(scenarioTotalRevenue, sym)}</td>
          </tr>
        </tbody>
      </table>`;
    }).join("")}

    <!-- Beautiful Interactive Chart.js Scenario comparison -->
    <div style="text-align: center; margin: 20px 0; page-break-inside: avoid;">
      <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Financial Feasibility Comparison</div>
      <div style="width: 100%; height: 260px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-sizing: border-box; position: relative;">
        <canvas id="cost-revenue-canvas"></canvas>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 4</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 5: COST OF PROJECT & MEANS OF FINANCE
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>Cost & Finance</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">Section 04</div>
    <div class="section-title">Cost of Project Details</div>

    ${scenarios.map((sc, sIdx) => {
      const scenarioCost = costDetails[sc.id] || {};
      const fixed = scenarioCost.fixedInputs || {};
      const custom = scenarioCost.customFields || [];

      const costRows = Object.entries(FIXED_COST_LABELS).map(([key, label]) => ({
        label,
        value: Number(fixed[key]) || 0,
      }));
      custom.forEach((f) => costRows.push({ label: f.name || "Custom", value: Number(f.value) || 0 }));
      const totalCost = costRows.reduce((a, r) => a + r.value, 0);
      const constructionTimeline = fixed.constructionTimeline || "";

      return `
      <div class="scenario-header" ${sIdx > 0 ? 'style="margin-top:20px;"' : ""}>
        <h4>Scenario ${sIdx + 1}: ${escHtml(sc.name || `Scenario ${sIdx + 1}`)}</h4>
        <div class="sub">Total Project Cost: ${fmtCurrencyCompact(totalCost, sym)}${constructionTimeline ? ` | Timeline: ${escHtml(constructionTimeline)} months` : ""}</div>
      </div>
      <table>
        <thead><tr><th>Cost Head</th><th class="text-right">Amount (${escHtml(currencyCode)})</th><th class="text-right">% of Total</th></tr></thead>
        <tbody>
          ${costRows.filter((r) => r.value > 0).map((r) => `
            <tr>
              <td style="font-weight:600;">${escHtml(r.label)}</td>
              <td class="text-right mono">${fmtCurrencyVal(r.value, sym)}</td>
              <td class="text-right mono">${totalCost > 0 ? ((r.value / totalCost) * 100).toFixed(1) + "%" : "—"}</td>
            </tr>`).join("")}
          <tr class="total-row">
            <td>Total Project Cost</td>
            <td class="text-right mono font-black">${fmtCurrencyVal(totalCost, sym)}</td>
            <td class="text-right mono font-black">100%</td>
          </tr>
        </tbody>
      </table>`;
    }).join("")}
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 5</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 6: MEANS OF FINANCE
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>Means of Finance</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">Section 05</div>
    <div class="section-title">Means of Finance</div>

    ${scenarios.map((sc, sIdx) => {
      const mofData = meansOfFinance[sc.id] || {};
      const mofForm = mofData.formData || {};
      const mofCustom = mofData.customFields || [];
      const allMofRows = [
        ...Object.entries(FIXED_FINANCE_LABELS).map(([key, label]) => ({ label, pct: Number(mofForm[key]) || 0 })),
        ...mofCustom.map((f) => ({ label: f.label || f.name || "Custom Source", pct: Number(mofForm[f.key]) || 0 })),
      ].filter((r) => r.pct > 0);

      const scenarioCost = costDetails[sc.id] || {};
      const fixedC = scenarioCost.fixedInputs || {};
      const customC = scenarioCost.customFields || [];
      const totalCost =
        Object.entries(fixedC).filter(([k]) => k !== "constructionTimeline").reduce((a, [, v]) => a + (Number(v) || 0), 0) +
        customC.reduce((a, f) => a + (Number(f.value) || 0), 0);

      const colors = ["#448C74", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"];

      if (allMofRows.length === 0) return "";

      return `
      <div class="scenario-header" ${sIdx > 0 ? 'style="margin-top:16px;"' : ""}>
        <h4>Scenario ${sIdx + 1}: ${escHtml(sc.name || `Scenario ${sIdx + 1}`)}</h4>
      </div>
      <div class="mof-bar">
        ${allMofRows.map((r, i) => `<div class="mof-segment" style="width:${r.pct}%;background:${colors[i % colors.length]};"></div>`).join("")}
      </div>
      <div class="mof-legend" style="margin-bottom:12px;">
        ${allMofRows.map((r, i) => `<span><span class="mof-legend-dot" style="background:${colors[i % colors.length]};"></span>${escHtml(r.label)}: ${r.pct.toFixed(1)}% (${fmtCurrencyCompact((r.pct / 100) * totalCost, sym)})</span>`).join("")}
      </div>`;
    }).join("")}

    <!-- Scenario-wise Debt Summary Grid -->
    <div style="margin-top: 24px;">
      <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Debt Financing & Loan Parameters Summary</div>
      <table>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Loan Principal</th>
            <th>Annual ROI</th>
            <th>Tenure</th>
            <th class="text-right">Total Interest Cost</th>
          </tr>
        </thead>
        <tbody>
          ${scenarios.map((sc) => {
            const costData = costDetails[sc.id] || {};
            const params = costData.financeCostParams;
            if (!params) {
              return `<tr>
                <td style="font-weight:700;">${escHtml(sc.name)}</td>
                <td colspan="4" style="color:#94a3b8;font-style:italic;">No calculated loan parameters saved (manually entered or not configured).</td>
              </tr>`;
            }
            const pSym = getCurrencySymbol(params.currency || currencyCode);
            return `<tr>
              <td style="font-weight:700;">${escHtml(sc.name)}</td>
              <td class="mono">${fmtCurrencyCompact(params.loanAmount, pSym)}</td>
              <td class="mono">${params.annualInterest}%</td>
              <td class="mono">${params.tenureMonths} months</td>
              <td class="text-right mono font-black" style="color:#f59e0b;">${fmtCurrencyCompact(params.totalInterest, pSym)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 6</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 7: IRR & CASH FLOW ANALYSIS
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>IRR & Cash Flow</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-num">Section 06</div>
    <div class="section-title">Cash Flow & IRR Analysis</div>

    ${scenarios.map((sc, sIdx) => {
      const projectDuration = (irrForm.projectDurations || {})[sc.id] || 1;
      const scenarioFormData = (irrForm.formData || {})[sc.id] || {};
      const yearsArray = Array.from({ length: projectDuration + 1 }, (_, i) => i);

      let totalRev = 0;
      const revData = revenueV2;
      if (revData.scenarios) {
        const sr = revData.scenarios.find((s) => s.scenarioId === sc.id);
        if (sr) totalRev = sr.totalRevenue || 0;
      }

      const scenarioCostData = costDetails[sc.id] || {};
      const fixedInputs = scenarioCostData.fixedInputs || {};
      const customFields = scenarioCostData.customFields || [];
      const dynamicRows = [{ key: "sales_cash_inflow", label: "Sales Cash Inflow", totalAmount: totalRev }];
      Object.keys(FIXED_COST_LABELS).forEach((key) => {
        dynamicRows.push({ key, label: FIXED_COST_LABELS[key], totalAmount: Number(fixedInputs[key]) || 0 });
      });
      customFields.forEach((f) => {
        dynamicRows.push({ key: `custom_${f.id}`, label: f.name || "Custom", totalAmount: Number(f.value) || 0 });
      });

      const getYearVal = (rowKey, year, total) => {
        const pct = scenarioFormData[rowKey]?.[year] || 0;
        return (parseFloat(pct) / 100) * (total || 0);
      };

      const revenueYearly = yearsArray.map((y) => getYearVal("sales_cash_inflow", y, totalRev));
      const costRowsData = dynamicRows.filter((r) => r.key !== "sales_cash_inflow");
      const costYearlyTotals = yearsArray.map((y) =>
        costRowsData.reduce((sum, r) => sum + getYearVal(r.key, y, r.totalAmount), 0)
      );
      const netCashYearly = yearsArray.map((y) => revenueYearly[y] - costYearlyTotals[y]);

      return `
      <div class="scenario-header" ${sIdx > 0 ? 'style="margin-top:24px;"' : ""}>
        <h4>Scenario ${sIdx + 1}: ${escHtml(sc.name || `Scenario ${sIdx + 1}`)}</h4>
      </div>
      <!-- Beautiful Interactive Chart.js J-Curve Cumulative Chart -->
      <div style="text-align: center; margin: 20px 0; page-break-inside: avoid;">
        <div style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Cumulative Project Cash Flow (J-Curve)</div>
        <div style="width: 100%; height: 230px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-sizing: border-box; position: relative;">
          <canvas id="j-curve-canvas-${sc.id}"></canvas>
        </div>
      </div>
      `;
    }).join("")}
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 7</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     PAGE 8: FINANCIAL VIABILITY ASSESSMENT & VERDICT
     ═══════════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="report-header">
    <div>
      ${logoImg}
      <div class="brand-sub">AI Feasibility Report</div>
    </div>
    <div class="doc-title">
      <h1>Viability Assessment</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <!-- Viability Verdict -->
  <div class="section" style="margin-top:20px; page-break-inside: avoid;">
    <div class="section-title">Financial Viability Assessment</div>
    <table>
      <thead><tr><th>Scenario</th><th class="text-right">Revenue</th><th class="text-right">Cost</th><th class="text-right">Net Surplus</th><th class="text-center">IRR (%)</th><th class="text-center">Verdict</th></tr></thead>
      <tbody>
        ${(() => {
          const calculatedIrrMap = irrForm.calculatedIrr || {};
          return scenarioKPIs.map((k) => {
            const margin = k.totalRevenue > 0 ? (k.netProfit / k.totalRevenue) * 100 : 0;
            let verdictColor = "#dc2626";
            let verdictBg = "#fef2f2";
            let verdictBorder = "#fca5a5";
            let verdictText = "Not Viable";
            let verdictIcon = `<svg style="width:10px; height:10px; stroke:currentColor; stroke-width:3; fill:none; margin-right:3px; vertical-align:middle;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

            if (margin >= 20) {
              verdictColor = "#059669";
              verdictBg = "#ecfdf5";
              verdictBorder = "#a7f3d0";
              verdictText = "Highly Viable";
              verdictIcon = `<svg style="width:10px; height:10px; stroke:currentColor; stroke-width:3; fill:none; margin-right:3px; vertical-align:middle;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            } else if (margin >= 10) {
              verdictColor = "#d97706";
              verdictBg = "#fffbeb";
              verdictBorder = "#fde68a";
              verdictText = "Moderately Viable";
              verdictIcon = `<svg style="width:10px; height:10px; stroke:currentColor; stroke-width:2.5; fill:none; margin-right:3px; vertical-align:middle;" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            } else if (margin >= 0) {
              verdictColor = "#d97706";
              verdictBg = "#fffbeb";
              verdictBorder = "#fde68a";
              verdictText = "Marginally Viable";
              verdictIcon = `<svg style="width:10px; height:10px; stroke:currentColor; stroke-width:2.5; fill:none; margin-right:3px; vertical-align:middle;" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            }

            const scIrr = calculatedIrrMap[k.id];
            const scIrrText = scIrr != null && !isNaN(Number(scIrr)) ? Number(scIrr).toFixed(2) + "%" : "—";

            return `<tr>
              <td style="font-weight:700;">${escHtml(k.name)}</td>
              <td class="text-right mono" style="color:#059669;font-weight:700;">${fmtCurrencyCompact(k.totalRevenue, sym)}</td>
              <td class="text-right mono">${fmtCurrencyCompact(k.totalCost, sym)}</td>
              <td class="text-right mono font-black" style="color:${k.netProfit >= 0 ? "#059669" : "#dc2626"};">${fmtCurrencyCompact(k.netProfit, sym)}</td>
              <td class="text-center mono font-black" style="color:#0f766e;font-size:10px;">${scIrrText}</td>
              <td class="text-center" style="padding: 8px 10px;">
                <span style="display:inline-flex; align-items:center; padding:2.5px 8px; border-radius:12px; font-size:8px; font-weight:800; text-transform:uppercase; color:${verdictColor}; background:${verdictBg}; border:1px solid ${verdictBorder};">
                  ${verdictIcon} ${verdictText}
                </span>
                <br><span style="font-size:7px;color:#64748b;margin-top:2px;display:inline-block;">Margin: ${margin.toFixed(1)}%</span>
              </td>
            </tr>`;
          }).join("");
        })()}
      </tbody>
    </table>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This feasibility report has been generated using AI-powered analysis by SigmaValue's Feasibility Agent.
    All figures, projections, and regulatory intelligence are indicative and based on available data at the time of generation.
    Users are advised to independently verify all data, consult qualified professionals, and perform due diligence before making
    investment or development decisions. SigmaValue does not guarantee the accuracy, completeness, or reliability of this report.
  </div>

  <div class="page-footer">
    <span>Confidential – SigmaValue AI Feasibility Agent</span>
    <span>${escHtml(projectTitle)}</span>
    <span>Page 8</span>
  </div>
</div>

<!-- Leaflet & Chart.js initialization script -->
<script>
  const scenarioKPIs = ${JSON.stringify(scenarioKPIs)};
  const jCurveData = ${JSON.stringify(jCurveData)};
  const currencySymbol = "${sym}";

  function initMap() {
    const lat = ${subjectLat};
    const lng = ${subjectLng};
    if (!lat || !lng) return;

    const map = L.map('print-map', {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // 1. Draw plot boundaries polygon
    const polygonCoords = ${JSON.stringify(polygonCoords)};
    if (polygonCoords && polygonCoords.length > 0) {
      const leafletCoords = polygonCoords.map(c => [c[0], c[1]]);
      const polygon = L.polygon(leafletCoords, {
        color: '#448C74',
        fillColor: '#448C74',
        fillOpacity: 0.18,
        weight: 3
      }).addTo(map);
      map.fitBounds(polygon.getBounds(), { padding: [15, 15] });
    } else {
      const subjectIcon = L.divIcon({
        className: '',
        html: '<div style="width:20px;height:20px;background:#448C74;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:9px;font-family:sans-serif;">S</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([lat, lng], { icon: subjectIcon }).addTo(map);
    }

    // 2. Add competitor marker pins
    const comps = ${JSON.stringify(
      comps.map((c) => {
        const parts = c.coordinates?.split(",") || [];
        return {
          name: c.projectName,
          lat: parseFloat(parts[0]),
          lng: parseFloat(parts[1])
        };
      }).filter(p => !isNaN(p.lat) && !isNaN(p.lng))
    )};

    comps.forEach((c, idx) => {
      const compIcon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;background:#2563eb;border:2.5px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:7px;font-family:sans-serif;">' + (idx + 1) + '</div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([c.lat, c.lng], { icon: compIcon }).addTo(map).bindPopup('<b>' + c.name + '</b>');
    });
  }

  const datalabelsPlugin = {
    id: 'datalabels',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { top } } = chart;
      ctx.save();
      ctx.font = 'bold 8px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((element, index) => {
          const value = dataset.data[index];
          if (value == null) return;

          let label = "";
          const absVal = Math.abs(value);
          if (absVal >= 10000000) label = currencySymbol + (value / 10000000).toFixed(2) + ' Cr';
          else if (absVal >= 100000) label = currencySymbol + (value / 100000).toFixed(2) + ' L';
          else label = currencySymbol + Math.round(value).toLocaleString('en-IN');

          const x = element.x;
          let y = element.y - 6;
          if (chart.config.type === 'line') {
            y = element.y - 8;
          }
          const drawY = Math.max(y, top + 10);

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeText(label, x, drawY);

          ctx.fillStyle = chart.config.type === 'bar'
            ? (dataset.label === 'Expected Revenue' ? '#065f46' : '#1d4ed8')
            : '#047857';

          ctx.fillText(label, x, drawY);
        });
      });
      ctx.restore();
    }
  };

  function initCharts() {
    // 1. Cost vs Revenue Bar Chart
    const ctxBar = document.getElementById('cost-revenue-canvas');
    if (ctxBar) {
      new Chart(ctxBar, {
        type: 'bar',
        plugins: [datalabelsPlugin],
        data: {
          labels: scenarioKPIs.map(k => k.name),
          datasets: [
            {
              label: 'Expected Revenue',
              data: scenarioKPIs.map(k => k.totalRevenue),
              backgroundColor: '#10b981',
              borderRadius: 6,
              borderWidth: 0,
              barPercentage: 0.6,
              categoryPercentage: 0.5
            },
            {
              label: 'Project Cost',
              data: scenarioKPIs.map(k => k.totalCost),
              backgroundColor: '#3b82f6',
              borderRadius: 6,
              borderWidth: 0,
              barPercentage: 0.6,
              categoryPercentage: 0.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { size: 9, weight: 'bold', family: 'Inter' },
                color: '#475569'
              }
            },
            tooltip: {
              titleFont: { size: 10, family: 'Inter' },
              bodyFont: { size: 10, family: 'Inter' },
              callbacks: {
                label: function(context) {
                  let value = context.raw;
                  if (value >= 10000000) return context.dataset.label + ': ' + currencySymbol + (value / 10000000).toFixed(2) + ' Cr';
                  if (value >= 100000) return context.dataset.label + ': ' + currencySymbol + (value / 100000).toFixed(2) + ' L';
                  return context.dataset.label + ': ' + currencySymbol + value.toLocaleString('en-IN');
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 8, weight: '700', family: 'Inter' }, color: '#1e293b' }
            },
            y: {
              grid: { color: '#f1f5f9' },
              ticks: {
                font: { size: 8, family: 'Inter' },
                color: '#64748b',
                callback: function(value) {
                  if (value >= 10000000) return currencySymbol + (value / 10000000).toFixed(1) + ' Cr';
                  if (value >= 100000) return currencySymbol + (value / 100000).toFixed(1) + ' L';
                  return currencySymbol + value.toLocaleString('en-IN');
                }
              }
            }
          }
        }
      });
    }

    // 2. Scenario J-Curve Chart
    jCurveData.forEach(scData => {
      const ctxLine = document.getElementById('j-curve-canvas-' + scData.id);
      if (ctxLine) {
        const chartCtx = ctxLine.getContext('2d');
        const gradient = chartCtx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

        new Chart(ctxLine, {
          type: 'line',
          plugins: [datalabelsPlugin],
          data: {
            labels: scData.years,
            datasets: [
              {
                label: 'Cumulative Net Cash Flow',
                data: scData.cumulativeCashFlows,
                borderColor: '#10b981',
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                backgroundColor: gradient,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: 4,
                pointHoverRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                titleFont: { size: 10, family: 'Inter' },
                bodyFont: { size: 10, family: 'Inter' },
                callbacks: {
                  label: function(context) {
                    let value = context.raw;
                    if (value >= 10000000) return 'Cumulative: ' + currencySymbol + (value / 10000000).toFixed(2) + ' Cr';
                    if (value >= 100000) return 'Cumulative: ' + currencySymbol + (value / 100000).toFixed(2) + ' L';
                    return 'Cumulative: ' + currencySymbol + value.toLocaleString('en-IN');
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 8, weight: '700', family: 'Inter' }, color: '#1e293b' }
              },
              y: {
                grid: { color: '#f1f5f9' },
                ticks: {
                  font: { size: 8, family: 'Inter' },
                  color: '#64748b',
                  callback: function(value) {
                    const absVal = Math.abs(value);
                    let prefix = value < 0 ? '-' : '';
                    if (absVal >= 10000000) return prefix + currencySymbol + (absVal / 10000000).toFixed(1) + ' Cr';
                    if (absVal >= 100000) return prefix + currencySymbol + (absVal / 100000).toFixed(1) + ' L';
                    return prefix + currencySymbol + absVal.toLocaleString('en-IN');
                  }
                }
              }
            }
          }
        });
      }
    });
  }

  function triggerPrint() {
    setTimeout(() => { window.print(); }, 2000);
  }

  function initAll() {
    if (typeof L === 'undefined' || typeof Chart === 'undefined') {
      setTimeout(initAll, 50);
      return;
    }
    try {
      initMap();
    } catch (e) {
      console.error("Leaflet map initialization failed:", e);
    }
    try {
      initCharts();
    } catch (e) {
      console.error("Chart.js initialization failed:", e);
    }
    triggerPrint();
  }

  if (document.readyState === 'complete') {
    initAll();
  } else {
    window.addEventListener('load', initAll);
  }
</script>
</body>
</html>`;
}

/* ===================================================================
   MAIN EXPORT: downloadFeasibilityPDF
   =================================================================== */

export async function downloadFeasibilityPDF() {
  if (typeof window === "undefined") return;

  const data = collectReportData();

  let logoBase64 = null;
  try {
    const resp = await fetch("/logo.png");
    if (resp.ok) {
      const blob = await resp.blob();
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          resolve(result ? result.split(",")[1] : null);
        };
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Fallback to text branding
  }

  const html = buildReportHTML(data, logoBase64);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function FeasibilityReportPreview() {
  return null;
}
