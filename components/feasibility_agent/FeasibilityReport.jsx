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

let activeCurrencyCode = "INR";

function fmtCurrencyVal(val, sym) {
  if (val == null || isNaN(Number(val))) return "—";
  const n = Number(val);
  const isIndian = activeCurrencyCode === "INR";
  const formatted = new Intl.NumberFormat(isIndian ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
  return sym + formatted;
}

function fmtCurrencyCompact(val, sym) {
  return fmtCurrencyVal(val, sym);
}

function fmtNum(val) {
  if (val == null || isNaN(Number(val))) return "—";
  const n = Number(val);
  const isIndian = activeCurrencyCode === "INR";
  return new Intl.NumberFormat(isIndian ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
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
  const landDetailsResults = get("landDetailsResults") || {};
  const zoningType = get("zoningType") || "";
  const landDetailsForm = get("landDetailsForm") || {};
  const landAndFsiDetails = get("Land_and_fsi_details") || {};

  return {
    land,
    landGeoJson,
    regulatory,
    market,
    comps,
    productMix,
    revenueV2,
    costDetails,
    meansOfFinance,
    irrForm,
    scheduleRows,
    landDetailsResults,
    zoningType,
    landDetailsForm,
    landAndFsiDetails
  };
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
  const { land, landGeoJson, regulatory, comps, productMix, revenueV2, costDetails, meansOfFinance, irrForm, scheduleRows, landDetailsResults, zoningType, landDetailsForm, landAndFsiDetails } = data;
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

  activeCurrencyCode = currencyCode;
  activeCurrencyCode = currencyCode;
  activeCurrencyCode = currencyCode;
  activeCurrencyCode = currencyCode;
  activeCurrencyCode = currencyCode;
  activeCurrencyCode = currencyCode;
  activeCurrencyCode = currencyCode;
  const primaryKPI = scenarioKPIs[0] || { totalRevenue: 0, totalCost: 0, netProfit: 0 };
  const logoImg = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" style="height:55px;object-fit:contain;max-width:180px;" alt="Logo" />`
    : `<span class="brand-name">SIGMAVALUE</span>`;

  const projectLocation = [land.location, land.village, land.country].filter(Boolean).join(", ");
  const projectTitle = projectLocation || "Feasibility Study";

  const pages = [];
  let currentPage = 1;

  // ─── PAGE 1: COVER PAGE ───────────────────────────────────────────
  pages.push(`
  <div class="rp-page rp-cover">
    <div class="cover-inner">
      <div class="cover-logo">
        ${logoBase64
          ? `<img src="data:image/png;base64,${logoBase64}" style="height:110px;object-fit:contain;" alt="SigmaValue" />`
          : `<div class="brand-name" style="font-size:32px;">SIGMAVALUE</div>`}
      </div>
      <div class="cover-subtitle">AI-Powered Real Estate Intelligence</div>
      <h1 class="cover-title">Feasibility Study Report</h1>
      <div class="cover-location">${escHtml(projectTitle)}</div>
      ${land.surveyNumber ? `<div class="cover-survey">Survey No: ${escHtml(land.surveyNumber)}${land.ctsNumber ? ` &nbsp;|&nbsp; CTS: ${escHtml(land.ctsNumber)}` : ""}</div>` : ""}
      <div class="cover-date">${dateStr} &nbsp;|&nbsp; ${timeStr}</div>
      <span class="cover-badge">Confidential Document</span>

      <div class="cover-kpi-row">
        <div class="cover-kpi">
          <div class="ck-label">Net Plot Area</div>
          <div class="ck-value">${land.netPlotAreaSqFt ? fmtNum(land.netPlotAreaSqFt) : "—"}</div>
          <div class="ck-unit">sq.ft</div>
        </div>
        <div class="cover-kpi">
          <div class="ck-label">Planning Authority</div>
          <div class="ck-value ck-small">${escHtml(land.planningAuthority || "—")}</div>
        </div>
        <div class="cover-kpi">
          <div class="ck-label">Scenarios</div>
          <div class="ck-value">${scenarios.length}</div>
        </div>
      </div>

      <div class="cover-scenarios">
        <div class="cs-heading">Executive Scenario Summary</div>
        ${scenarioKPIs.map((k, idx) => `
          <div class="cs-row">
            <div class="cs-name">Scenario ${idx + 1}: ${escHtml(k.name)}</div>
            <div class="cs-cols">
              <div><div class="cs-lbl">Cost</div><div class="cs-val">${fmtCurrencyCompact(k.totalCost, sym)}</div></div>
              <div><div class="cs-lbl">Revenue</div><div class="cs-val green">${fmtCurrencyCompact(k.totalRevenue, sym)}</div></div>
              <div><div class="cs-lbl">Surplus</div><div class="cs-val ${k.netProfit >= 0 ? "green" : "red"}">${fmtCurrencyCompact(k.netProfit, sym)}</div></div>
            </div>
          </div>`).join("")}
      </div>
    </div>
    <div class="rp-footer">
      <span>Confidential – SigmaValue AI Feasibility Agent</span>
      <span>${dateStr}</span>
      <span>Page ${currentPage}</span>
    </div>
  </div>`);

  // ─── PAGE 2: LAND DETAILS ─────────────────────────────────────────
  currentPage++;
  pages.push(`
  <div class="rp-page">
    <div class="rp-header">
      <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
      <div class="rp-header-title"><div class="rph-section">Section 01</div><div class="rph-name">Land &amp; Site Details</div><div class="rph-date">${dateStr}</div></div>
    </div>
    <div class="rp-body">
      <div class="section-title">Land Identification &amp; Site Parameters</div>
      <div class="land-grid">
        <div>
          <table class="data-table">
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
                `<tr><td class="dt-label">${escHtml(label)}</td><td>${escHtml(String(val))}</td></tr>`
              ).join("")}
            </tbody>
          </table>
        </div>
        <div>
          <div class="map-label">Site Map</div>
          <div id="print-map" class="map-box"></div>
          <div class="map-legend">
            <span class="ml-dot green-dot"></span>Subject plot boundary&nbsp;&nbsp;
            <span class="ml-dot blue-dot"></span>Comparable projects
          </div>
        </div>
      </div>
    </div>
    <div class="rp-footer">
      <span>Confidential – SigmaValue AI Feasibility Agent</span>
      <span>${escHtml(projectTitle)}</span>
      <span>Page ${currentPage}</span>
    </div>
  </div>`);

  // ─── PAGE 3+: REGULATORY COMPLIANCE ─────────────────────────────
  const regSectionsList = Object.entries(REGULATORY_SECTION_TITLES).map(([id, title]) => {
    const result = regulatory.sectionResults?.[id] || {};
    return { id, title, ...result };
  });
  const completedRegs = regSectionsList.filter(r => r.status === "completed" && r.answer);
  const pendingRegs   = regSectionsList.filter(r => r.status !== "completed" || !r.answer);

  if (completedRegs.length > 0) {
    // 2 sections per page
    for (let i = 0; i < completedRegs.length; i += 2) {
      currentPage++;
      const chunk = completedRegs.slice(i, i + 2);
      const chunkNum = Math.floor(i / 2) + 1;
      const chunkTotal = Math.ceil(completedRegs.length / 2);
      pages.push(`
      <div class="rp-page">
        <div class="rp-header">
          <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
          <div class="rp-header-title"><div class="rph-section">Section 02</div><div class="rph-name">Regulatory Intelligence (${chunkNum}/${chunkTotal})</div><div class="rph-date">${dateStr}</div></div>
        </div>
        <div class="rp-body">
          <div class="section-title">Regulatory Compliance Details</div>
          ${chunk.map(r => {
            const qText = regulatory.editableQuestions?.[r.id] || "";
            return `
            <div class="reg-block">
              <div class="reg-block-header">
                <span class="badge-done">&#10003; Done</span>
                <strong>${escHtml(r.title)}</strong>
              </div>
              ${qText ? `<div class="query-box"><strong>Query:</strong> ${escHtml(qText)}</div>` : ""}
              <div class="reg-body reg-markdown-content" data-raw="${escHtml(r.answer)}"></div>
            </div>`;
          }).join("")}
        </div>
        <div class="rp-footer">
          <span>Confidential – SigmaValue AI Feasibility Agent</span>
          <span>${escHtml(projectTitle)}</span>
          <span>Page ${currentPage}</span>
        </div>
      </div>`);
    }

    if (pendingRegs.length > 0) {
      currentPage++;
      pages.push(`
      <div class="rp-page">
        <div class="rp-header">
          <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
          <div class="rp-header-title"><div class="rph-section">Section 02</div><div class="rph-name">Regulatory Intelligence – Pending</div><div class="rph-date">${dateStr}</div></div>
        </div>
        <div class="rp-body">
          <div class="section-title">Pending Regulatory Sections</div>
          <div class="reg-grid">
            ${pendingRegs.map(r => `
              <div class="reg-pending-card">
                <span class="badge-pending">&#9679; Pending</span>&nbsp;${escHtml(r.title)}
              </div>`).join("")}
          </div>
        </div>
        <div class="rp-footer">
          <span>Confidential – SigmaValue AI Feasibility Agent</span>
          <span>${escHtml(projectTitle)}</span>
          <span>Page ${currentPage}</span>
        </div>
      </div>`);
    }
  } else {
    currentPage++;
    pages.push(`
    <div class="rp-page">
      <div class="rp-header">
        <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
        <div class="rp-header-title"><div class="rph-section">Section 02</div><div class="rph-name">Regulatory Intelligence</div><div class="rph-date">${dateStr}</div></div>
      </div>
      <div class="rp-body">
        <div class="section-title">Regulatory Compliance Snapshot</div>
        <p style="color:#64748b;font-style:italic;font-size:9px;text-align:center;margin-top:40px;">No completed regulatory sections. Run the regulatory intelligence agent to analyze compliance.</p>
        <div class="reg-grid">
          ${pendingRegs.map(r => `<div class="reg-pending-card"><span class="badge-pending">&#9679; Pending</span>&nbsp;${escHtml(r.title)}</div>`).join("")}
        </div>
      </div>
      <div class="rp-footer">
        <span>Confidential – SigmaValue AI Feasibility Agent</span>
        <span>${escHtml(projectTitle)}</span>
        <span>Page ${currentPage}</span>
      </div>
    </div>`);
  }

  // ─── PAGE: LAND & FSI DETAILS (Section 03) ───────────────────────
  currentPage++;
  const hasFsiData = landAndFsiDetails && (
    landAndFsiDetails.permissibleFSI_FAR != null ||
    landAndFsiDetails.grossFloorArea != null ||
    landAndFsiDetails.webAgentResponse
  );

  pages.push(`
  <div class="rp-page">
    <div class="rp-header">
      <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
      <div class="rp-header-title"><div class="rph-section">Section 03</div><div class="rph-name">Land &amp; FSI Details</div><div class="rph-date">${dateStr}</div></div>
    </div>
    <div class="rp-body">
      <div class="section-title">Permissible FSI Vs Proposed FSI Breakdown</div>
      ${!hasFsiData ? `
        <div class="empty-state">No FSI breakdown data available. Configure and save FSI details in the Land And FSI Details section.</div>
      ` : `
        <div class="fsi-kpi-row">
          <div class="fsi-kpi">
            <div class="fk-label">Permissible FSI / FAR</div>
            <div class="fk-value">${landAndFsiDetails.permissibleFSI_FAR ? fmtNum(landAndFsiDetails.permissibleFSI_FAR) + " sq.ft" : "—"}</div>
          </div>
          <div class="fsi-kpi green-kpi">
            <div class="fk-label">Gross Floor Area (Area to Build)</div>
            <div class="fk-value">${landAndFsiDetails.grossFloorArea ? fmtNum(landAndFsiDetails.grossFloorArea) + " sq.ft" : "—"}</div>
          </div>
        </div>
        ${landAndFsiDetails.webAgentResponse ? `
          <div class="reg-block" style="margin-top:14px;">
            <div class="reg-block-header">
              <span class="badge-done">&#10003; Verified</span>
              <strong>Web &amp; Document Intelligence – Building Regulations</strong>
            </div>
            ${landAndFsiDetails.webAgentQuery ? `<div class="query-box"><strong>Query:</strong> ${escHtml(landAndFsiDetails.webAgentQuery)}</div>` : ""}
            <div class="reg-body reg-markdown-content" data-raw="${escHtml(landAndFsiDetails.webAgentResponse)}"></div>
          </div>
        ` : `<div class="empty-state" style="margin-top:14px;">No Web Agent analysis run for building codes/regulations.</div>`}
      `}
    </div>
    <div class="rp-footer">
      <span>Confidential – SigmaValue AI Feasibility Agent</span>
      <span>${escHtml(projectTitle)}</span>
      <span>Page ${currentPage}</span>
    </div>
  </div>`);

  // ─── PAGE: PRODUCT MIX & REVENUE (Section 04) ────────────────────
  currentPage++;
  pages.push(`
  <div class="rp-page">
    <div class="rp-header">
      <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
      <div class="rp-header-title"><div class="rph-section">Section 04</div><div class="rph-name">Product Mix &amp; Revenue</div><div class="rph-date">${dateStr}</div></div>
    </div>
    <div class="rp-body">
      <div class="section-title">Product Mix Design &amp; Revenue – All Scenarios</div>
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
            <td class="tr">${fmtNum(row.pointArea || 0)}</td>
            <td class="tr mono">${fmtCurrencyVal(row.rate, sym)}</td>
            <td class="tr mono">${fmtCurrencyVal(ticketSize, sym)}</td>
            <td class="tc">${inv || "—"}</td>
            <td class="tr">${fmtNum(row.allottedArea || 0)}</td>
            <td class="tr mono bold green">${fmtCurrencyCompact(rowRev, sym)}</td>
          </tr>`;
        }).join("");
        return `
        <div class="sc-header ${sIdx > 0 ? "mt-12" : ""}">
          <strong>Scenario ${sIdx + 1}: ${escHtml(sc.name || `Scenario ${sIdx + 1}`)}</strong>
          <span class="sc-sub">Total Revenue: ${fmtCurrencyCompact(scenarioTotalRevenue, sym)}</span>
        </div>
        <div class="table-wrap">
          <table class="data-table compact-table">
            <thead><tr>
              <th>Asset Class</th><th>Type</th><th>Unit Mix</th>
              <th class="tr">Area (sqft)</th><th class="tr">Rate</th><th class="tr">Ticket Size</th>
              <th class="tc">Inv.</th><th class="tr">Allotted</th><th class="tr">Revenue</th>
            </tr></thead>
            <tbody>
              ${rowsHTML}
              <tr class="total-row">
                <td colspan="6" class="tr bold">Scenario Total Revenue</td>
                <td class="tc bold">${rows.reduce((a, r) => a + (Number(r.totalInventory) || 0), 0)}</td>
                <td class="tr bold">${fmtNum(rows.reduce((a, r) => a + (Number(r.allottedArea) || 0), 0))}</td>
                <td class="tr bold mono">${fmtCurrencyCompact(scenarioTotalRevenue, sym)}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
      }).join("")}

      <div class="chart-section">
        <div class="chart-label">Financial Feasibility Comparison</div>
        <div class="chart-box"><canvas id="cost-revenue-canvas"></canvas></div>
      </div>
    </div>
    <div class="rp-footer">
      <span>Confidential – SigmaValue AI Feasibility Agent</span>
      <span>${escHtml(projectTitle)}</span>
      <span>Page ${currentPage}</span>
    </div>
  </div>`);

  // ─── PAGE: COST & FINANCE (Section 05) ───────────────────────────
  currentPage++;
  pages.push(`
  <div class="rp-page">
    <div class="rp-header">
      <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
      <div class="rp-header-title"><div class="rph-section">Section 05</div><div class="rph-name">Cost of Project &amp; Means of Finance</div><div class="rph-date">${dateStr}</div></div>
    </div>
    <div class="rp-body">
      <div class="section-title">Cost of Project &amp; Means of Finance Details</div>
      ${scenarios.map((sc, sIdx) => {
        const scenarioCost = costDetails[sc.id] || {};
        const fixed  = scenarioCost.fixedInputs || {};
        const custom = scenarioCost.customFields || [];
        const costRows = Object.entries(FIXED_COST_LABELS).map(([key, label]) => ({ label, value: Number(fixed[key]) || 0 }));
        custom.forEach((f) => costRows.push({ label: f.name || "Custom", value: Number(f.value) || 0 }));
        const totalCost = costRows.reduce((a, r) => a + r.value, 0);
        const constructionTimeline = fixed.constructionTimeline || "";

        const mofData   = meansOfFinance[sc.id] || {};
        const mofForm   = mofData.formData || {};
        const mofCustom = mofData.customFields || [];
        const allMofRows = [
          ...Object.entries(FIXED_FINANCE_LABELS).map(([key, label]) => ({ label, pct: Number(mofForm[key]) || 0 })),
          ...mofCustom.map((f) => ({ label: f.label || f.name || "Custom Source", pct: Number(mofForm[f.key]) || 0 })),
        ].filter((r) => r.pct > 0);

        return `
        <div class="sc-header ${sIdx > 0 ? "mt-12" : ""}">
          <strong>Scenario ${sIdx + 1}: ${escHtml(sc.name || `Scenario ${sIdx + 1}`)}</strong>
          <span class="sc-sub">Total Cost: ${fmtCurrencyCompact(totalCost, sym)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
          <div>
            <div class="sub-label">Cost of Project Breakdown</div>
            <table class="data-table compact-table">
              <thead><tr><th>Cost Head</th><th class="tr">Amount (${escHtml(currencyCode)})</th><th class="tr">%</th></tr></thead>
              <tbody>
                ${costRows.filter(r => r.value > 0).map(r => `
                  <tr>
                    <td>${escHtml(r.label)}</td>
                    <td class="tr mono">${fmtCurrencyVal(r.value, sym)}</td>
                    <td class="tr mono">${totalCost > 0 ? ((r.value / totalCost) * 100).toFixed(1) + "%" : "—"}</td>
                  </tr>`).join("")}
                <tr class="total-row">
                  <td class="bold">Total</td>
                  <td class="tr bold mono">${fmtCurrencyVal(totalCost, sym)}</td>
                  <td class="tr bold mono">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <div class="sub-label">Means of Finance Breakdown</div>
            <table class="data-table compact-table">
              <thead><tr><th>Funding Source</th><th class="tr">Share (%)</th><th class="tr">Amount (${escHtml(currencyCode)})</th></tr></thead>
              <tbody>
                ${allMofRows.length > 0 ? allMofRows.map(r => `
                  <tr>
                    <td>${escHtml(r.label)}</td>
                    <td class="tr mono">${r.pct.toFixed(1)}%</td>
                    <td class="tr mono">${fmtCurrencyVal((r.pct / 100) * totalCost, sym)}</td>
                  </tr>`).join("") +
                  `<tr class="total-row">
                    <td class="bold">Total</td>
                    <td class="tr bold mono">100.0%</td>
                    <td class="tr bold mono">${fmtCurrencyVal(totalCost, sym)}</td>
                  </tr>`
                : `<tr><td colspan="3" class="tc" style="color:#94a3b8;font-style:italic;">No financing parameters saved.</td></tr>`}
              </tbody>
            </table>

            <!-- Loan Summary -->
            ${(() => {
              const costData = costDetails[sc.id] || {};
              const params   = costData.financeCostParams;
              if (!params) return "";
              const pSym = getCurrencySymbol(params.currency || currencyCode);
              return `
              <div class="sub-label" style="margin-top:10px;">Loan Parameters</div>
              <table class="data-table compact-table">
                <tbody>
                  <tr><td class="dt-label">Loan Principal</td><td class="mono">${fmtCurrencyCompact(params.loanAmount, pSym)}</td></tr>
                  <tr><td class="dt-label">Annual ROI</td><td class="mono">${params.annualInterest}%</td></tr>
                  <tr><td class="dt-label">Tenure</td><td class="mono">${params.tenureMonths} months</td></tr>
                  <tr><td class="dt-label">Total Interest</td><td class="mono bold" style="color:#d97706;">${fmtCurrencyCompact(params.totalInterest, pSym)}</td></tr>
                </tbody>
              </table>`;
            })()}
          </div>
        </div>`;
      }).join("")}
    </div>
    <div class="rp-footer">
      <span>Confidential – SigmaValue AI Feasibility Agent</span>
      <span>${escHtml(projectTitle)}</span>
      <span>Page ${currentPage}</span>
    </div>
  </div>`);

  // ─── PAGES: IRR & CASH FLOW (Section 06, one per scenario) ───────
  scenarios.forEach((sc, sIdx) => {
    currentPage++;
    const projectDuration = (irrForm.projectDurations || {})[sc.id] || 1;
    const scenarioFormData = (irrForm.formData || {})[sc.id] || {};
    const yearsArray = Array.from({ length: projectDuration + 1 }, (_, i) => i);

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

    const getYearVal = (rowKey, year, total) => {
      const pct = scenarioFormData[rowKey]?.[year] || 0;
      return (parseFloat(pct) / 100) * (total || 0);
    };

    const revenueYearly = yearsArray.map((y) => getYearVal("sales_cash_inflow", y, totalRev));
    const costRowsData  = dynamicRows.filter((r) => r.key !== "sales_cash_inflow");
    const costYearlyTotals = yearsArray.map((y) =>
      costRowsData.reduce((sum, r) => sum + getYearVal(r.key, y, r.totalAmount), 0)
    );
    const netCashYearly = yearsArray.map((y) => revenueYearly[y] - costYearlyTotals[y]);
    const calculatedIrrMap = irrForm.calculatedIrr || {};
    const scIrr = calculatedIrrMap[sc.id];
    const scIrrText = (scIrr != null && !isNaN(Number(scIrr))) ? Number(scIrr).toFixed(2) + "%" : "—";

    // Year columns — if too many, abbreviate header
    const maxCols = 6; // hard limit displayed year columns to prevent overflow
    const displayYears = yearsArray.slice(0, maxCols);
    const hasMore = yearsArray.length > maxCols;

    pages.push(`
    <div class="rp-page">
      <div class="rp-header">
        <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
        <div class="rp-header-title"><div class="rph-section">Section 06</div><div class="rph-name">Cash Flow &amp; IRR Analysis</div><div class="rph-date">${dateStr}</div></div>
      </div>
      <div class="rp-body">
        <div class="section-title">Cash Flow &amp; IRR – Scenario ${sIdx + 1}: ${escHtml(sc.name || "")}</div>

        <div class="chart-box small-chart"><canvas id="j-curve-canvas-${sc.id}"></canvas></div>

        <!-- Revenue Type -->
        <div class="sub-label mt-8">Revenue Type</div>
        <div class="table-wrap">
          <table class="data-table compact-table cashflow-table">
            <thead><tr>
              <th style="min-width:110px;">Revenue Type</th>
              ${displayYears.map(y => `<th class="tr">Yr ${y}</th>`).join("")}
              ${hasMore ? `<th class="tr">…</th>` : ""}
              <th class="tr">Total</th>
            </tr></thead>
            <tbody>
              <tr>
                <td>Sales Cashflow</td>
                ${displayYears.map(y => `<td class="tr mono">${fmtCurrencyCompact(getYearVal("sales_cash_inflow", y, totalRev), sym)}</td>`).join("")}
                ${hasMore ? `<td class="tr mono">…</td>` : ""}
                <td class="tr mono bold green">${fmtCurrencyCompact(totalRev, sym)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cost Type -->
        <div class="sub-label mt-8">Cost Type</div>
        <div class="table-wrap">
          <table class="data-table compact-table cashflow-table">
            <thead><tr>
              <th style="min-width:110px;">Cost Type</th>
              ${displayYears.map(y => `<th class="tr">Yr ${y}</th>`).join("")}
              ${hasMore ? `<th class="tr">…</th>` : ""}
              <th class="tr">Total</th>
            </tr></thead>
            <tbody>
              ${costRowsData.filter(r => r.totalAmount > 0).map(row => `
                <tr>
                  <td>${escHtml(row.label)}</td>
                  ${displayYears.map(y => `<td class="tr mono">${fmtCurrencyCompact(getYearVal(row.key, y, row.totalAmount), sym)}</td>`).join("")}
                  ${hasMore ? `<td class="tr mono">…</td>` : ""}
                  <td class="tr mono bold">${fmtCurrencyCompact(row.totalAmount, sym)}</td>
                </tr>`).join("")}
              <tr class="total-row">
                <td class="bold">Cost of Project</td>
                ${displayYears.map(y => `<td class="tr bold mono">${fmtCurrencyCompact(costYearlyTotals[y], sym)}</td>`).join("")}
                ${hasMore ? `<td class="tr bold mono">…</td>` : ""}
                <td class="tr bold mono">${fmtCurrencyCompact(costRowsData.reduce((s, r) => s + r.totalAmount, 0), sym)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- IRR -->
        <div class="sub-label mt-8">IRR Calculation</div>
        <div class="table-wrap">
          <table class="data-table compact-table cashflow-table">
            <thead><tr>
              <th style="min-width:110px;">IRR Metric</th>
              ${displayYears.map(y => `<th class="tr">Yr ${y}</th>`).join("")}
              ${hasMore ? `<th class="tr">…</th>` : ""}
              <th class="tr">Total</th>
            </tr></thead>
            <tbody>
              <tr class="total-row">
                <td class="bold">Net Cash Generation</td>
                ${displayYears.map(y => `<td class="tr bold mono">${fmtCurrencyCompact(netCashYearly[y], sym)}</td>`).join("")}
                ${hasMore ? `<td class="tr bold mono">…</td>` : ""}
                <td class="tr bold mono">${fmtCurrencyCompact(totalRev - costRowsData.reduce((s, r) => s + r.totalAmount, 0), sym)}</td>
              </tr>
              <tr class="irr-row">
                <td class="bold irr-label">Project IRR (%)</td>
                <td colspan="${displayYears.length + (hasMore ? 1 : 0)}"></td>
                <td class="tr bold mono irr-value">${scIrrText}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ${hasMore ? `<p style="font-size:7.5px;color:#64748b;margin-top:4px;">* Year columns beyond Year ${displayYears[displayYears.length-1]} omitted for print fit. Full data in the application.</p>` : ""}
      </div>
      <div class="rp-footer">
        <span>Confidential – SigmaValue AI Feasibility Agent</span>
        <span>${escHtml(projectTitle)}</span>
        <span>Page ${currentPage}</span>
      </div>
    </div>`);
  });

  // ─── PAGE: VIABILITY ASSESSMENT (last page) ──────────────────────
  currentPage++;
  pages.push(`
  <div class="rp-page">
    <div class="rp-header">
      <div class="rp-header-logo">${logoImg}<div class="brand-sub">AI Feasibility Report</div></div>
      <div class="rp-header-title"><div class="rph-section">Section 07</div><div class="rph-name">Viability Assessment</div><div class="rph-date">${dateStr}</div></div>
    </div>
    <div class="rp-body">
      <div class="section-title">Financial Viability Assessment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th class="tr">Revenue</th>
            <th class="tr">Cost</th>
            <th class="tr">Net Surplus</th>
            <th class="tc">IRR (%)</th>
            <th class="tc">Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const calculatedIrrMap = irrForm.calculatedIrr || {};
            return scenarioKPIs.map((k) => {
              const margin = k.totalRevenue > 0 ? (k.netProfit / k.totalRevenue) * 100 : 0;
              let verdictColor = "#dc2626", verdictBg = "#fef2f2", verdictText = "Not Viable";
              if (margin >= 20)      { verdictColor = "#059669"; verdictBg = "#ecfdf5"; verdictText = "Highly Viable"; }
              else if (margin >= 10) { verdictColor = "#d97706"; verdictBg = "#fffbeb"; verdictText = "Moderately Viable"; }
              else if (margin >= 0)  { verdictColor = "#d97706"; verdictBg = "#fffbeb"; verdictText = "Marginally Viable"; }
              const scIrr = calculatedIrrMap[k.id];
              const scIrrText = (scIrr != null && !isNaN(Number(scIrr))) ? Number(scIrr).toFixed(2) + "%" : "—";
              return `<tr>
                <td class="bold">${escHtml(k.name)}</td>
                <td class="tr mono green">${fmtCurrencyCompact(k.totalRevenue, sym)}</td>
                <td class="tr mono">${fmtCurrencyCompact(k.totalCost, sym)}</td>
                <td class="tr mono bold ${k.netProfit >= 0 ? "green" : "red"}">${fmtCurrencyCompact(k.netProfit, sym)}</td>
                <td class="tc mono bold" style="color:#0f766e;">${scIrrText}</td>
                <td class="tc">
                  <span class="verdict-badge" style="color:${verdictColor};background:${verdictBg};">${verdictText}</span><br>
                  <span style="font-size:7px;color:#64748b;">Margin: ${margin.toFixed(1)}%</span>
                </td>
              </tr>`;
            }).join("");
          })()}
        </tbody>
      </table>

      <div class="disclaimer">
        <strong>Disclaimer:</strong> This feasibility report has been generated using AI-powered analysis by SigmaValue's Feasibility Agent.
        All figures, projections, and regulatory intelligence are indicative and based on available data at the time of generation.
        Users are advised to independently verify all data, consult qualified professionals, and perform due diligence before making
        investment or development decisions. SigmaValue does not guarantee the accuracy, completeness, or reliability of this report.
      </div>
    </div>
    <div class="rp-footer">
      <span>Confidential – SigmaValue AI Feasibility Agent</span>
      <span>${escHtml(projectTitle)}</span>
      <span>Page ${currentPage}</span>
    </div>
  </div>`);

  // ─── ASSEMBLE FINAL HTML ──────────────────────────────────────────
  const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Feasibility Report – ${escHtml(projectTitle)}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

/* ── Print Page Setup ── */
@page {
  size: A4 portrait;
  margin: 14mm 12mm 14mm 12mm;
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: 'Inter', Arial, sans-serif;
  font-size: 9px;
  line-height: 1.5;
  color: #1e293b;
  background: #e2e8f0;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* ── Page Container ── */
.rp-page {
  width: 210mm;
  min-height: 297mm;
  background: #ffffff;
  margin: 10px auto;
  padding: 18mm 14mm 14mm 14mm;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
}

/* ── Print: one page per .rp-page ── */
@media print {
  html, body { background: white !important; }
  .rp-page {
    width: 100% !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    page-break-after: always;
    page-break-inside: avoid;
    display: block;
    overflow: visible;
  }
  .rp-page:last-child { page-break-after: auto; }
  .rp-body { overflow: visible !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
}

/* ── Cover Page ── */
.rp-cover { background: linear-gradient(160deg, #f0fdf4 0%, #ffffff 60%); }
.cover-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px 10px;
}
.cover-logo { margin-bottom: 20px; }
.cover-title { font-size: 26px; font-weight: 900; color: #0f172a; margin: 6px 0; }
.cover-subtitle { font-size: 11px; font-weight: 500; color: #64748b; margin-bottom: 4px; }
.cover-location { font-size: 13px; font-weight: 700; color: #448C74; margin-bottom: 18px; }
.cover-survey { font-size: 8.5px; color: #64748b; margin-bottom: 4px; }
.cover-date { font-size: 8px; color: #94a3b8; letter-spacing: 0.06em; text-transform: uppercase; }
.cover-badge {
  display: inline-block; margin-top: 6px; padding: 3px 10px;
  background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;
  border-radius: 20px; font-size: 7.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
}
.cover-kpi-row {
  display: flex; gap: 10px; margin-top: 20px; width: 100%; max-width: 480px; justify-content: center;
}
.cover-kpi {
  flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 10px 8px; text-align: center;
}
.ck-label { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 3px; }
.ck-value { font-size: 14px; font-weight: 900; color: #0f172a; font-family: 'JetBrains Mono', monospace; word-break: break-word; }
.ck-value.ck-small { font-size: 10px; }
.ck-unit { font-size: 7px; color: #94a3b8; }
.cover-scenarios { width: 100%; max-width: 520px; margin-top: 18px; text-align: left; }
.cs-heading { font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; text-align: center; }
.cs-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
  padding: 8px 12px; margin-bottom: 6px;
}
.cs-name { font-size: 8.5px; font-weight: 800; color: #448C74; flex: 1; }
.cs-cols { display: flex; gap: 18px; }
.cs-lbl { font-size: 6.5px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.cs-val { font-size: 9px; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace; }
.cs-val.green { color: #059669; }
.cs-val.red { color: #dc2626; }

/* ── Page Header ── */
.rp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 10px; border-bottom: 3px solid #448C74; margin-bottom: 14px;
}
.rp-header-logo { display: flex; flex-direction: column; }
.brand-sub { font-size: 7px; color: #64748b; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
.brand-name { font-size: 18px; font-weight: 900; color: #448C74; }
.rp-header-title { text-align: right; }
.rph-section { font-size: 7.5px; font-weight: 900; color: #448C74; text-transform: uppercase; letter-spacing: 0.06em; }
.rph-name { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em; }
.rph-date { font-size: 7.5px; color: #64748b; margin-top: 1px; }

/* ── Page Body ── */
.rp-body { flex: 1; overflow: hidden; }

/* ── Section Title ── */
.section-title {
  font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em;
  color: #0f172a; border-bottom: 2px solid #448C74; padding-bottom: 5px; margin-bottom: 12px;
}

/* ── Page Footer ── */
.rp-footer {
  border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 10px;
  display: flex; justify-content: space-between;
  font-size: 6.5px; color: #94a3b8;
}

/* ── Land Grid ── */
.land-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
.map-label { font-size: 7.5px; font-weight: 800; color: #475569; margin-bottom: 5px; text-transform: uppercase; }
.map-box { height: 220px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; }
.map-legend { font-size: 7px; color: #64748b; margin-top: 5px; }
.ml-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid white; margin-right: 3px; vertical-align: middle; }
.green-dot { background: #448C74; }
.blue-dot  { background: #2563eb; }

/* ── Tables ── */
.table-wrap { width: 100%; overflow: hidden; margin-bottom: 10px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 8.5px; table-layout: fixed; }
.compact-table { font-size: 7.5px; }
.cashflow-table td, .cashflow-table th { padding: 3px 5px !important; }
.data-table th {
  background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.03em; padding: 5px 7px; border-bottom: 2px solid #e2e8f0;
  text-align: left; font-size: 7.5px; white-space: nowrap;
}
.data-table td {
  padding: 4px 7px; border-bottom: 1px solid #f1f5f9; color: #334155;
  vertical-align: top; overflow: hidden; text-overflow: ellipsis;
}
.data-table tr:nth-child(even) td { background: #fafbfc; }
.total-row td { font-weight: 800 !important; background: #f0fdf4 !important; color: #065f46 !important; border-top: 1.5px solid #a7f3d0 !important; }
.irr-row td { background: #ecfdf5 !important; border-top: 2px solid #0f766e !important; }
.irr-label { color: #0f766e !important; font-size: 8.5px !important; }
.irr-value { color: #0f766e !important; font-size: 9px !important; }
.dt-label { font-weight: 700; color: #0f172a; width: 40%; white-space: nowrap; }

/* ── Table utilities ── */
.tr   { text-align: right !important; }
.tc   { text-align: center !important; }
.bold { font-weight: 800 !important; }
.mono { font-family: 'JetBrains Mono', monospace !important; }
.green { color: #059669 !important; }
.red   { color: #dc2626 !important; }

/* ── Scenario Header ── */
.sc-header {
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border: 1px solid #a7f3d0; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 10px;
}
.sc-header strong { font-size: 10px; font-weight: 800; color: #065f46; }
.sc-sub { font-size: 7.5px; color: #059669; }
.mt-12 { margin-top: 12px; }
.mt-8 { margin-top: 8px; }

/* ── Sub Labels ── */
.sub-label {
  font-size: 7.5px; font-weight: 800; color: #475569;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
}

/* ── Regulatory Blocks ── */
.reg-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; background: #fff; }
.reg-block-header { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
.reg-block-header strong { font-size: 9px; font-weight: 800; color: #0f172a; }
.badge-done { background: #dcfce7; color: #16a34a; padding: 1px 5px; border-radius: 8px; font-size: 6.5px; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
.badge-pending { background: #fef3c7; color: #d97706; padding: 1px 5px; border-radius: 8px; font-size: 6.5px; font-weight: 800; white-space: nowrap; }
.query-box {
  font-size: 7.5px; font-weight: 600; color: #475569;
  padding: 3px 7px; background: #f8fafc; border-left: 3px solid #3b82f6;
  border-radius: 3px; margin-bottom: 6px; line-height: 1.4;
}
.reg-body {
  font-size: 7.5px; color: #334155; line-height: 1.5; overflow: hidden;
}
.reg-body p { margin-bottom: 4px; }
.reg-body p:last-child { margin-bottom: 0; }
.reg-body ul, .reg-body ol { margin-left: 10px; margin-bottom: 4px; }
.reg-body li { margin-bottom: 1px; }
.reg-body strong { color: #0f172a; font-weight: 700; }
.reg-body table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 7px; }
.reg-body th { background: #f8fafc; color: #475569; font-weight: 700; padding: 3px 5px; border: 1px solid #e2e8f0; text-align: left; }
.reg-body td { padding: 3px 5px; border: 1px solid #e2e8f0; color: #334155; }
.reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.reg-pending-card { border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 10px; font-size: 8px; color: #64748b; background: #fff; }

/* ── FSI KPI ── */
.fsi-kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.fsi-kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
.green-kpi .fk-value { color: #448C74 !important; }
.fk-label { font-size: 7px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
.fk-value { font-size: 14px; font-weight: 900; color: #0f172a; font-family: 'JetBrains Mono', monospace; }

/* ── Charts ── */
.chart-section { margin-top: 14px; }
.chart-label { font-size: 7.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; text-align: center; }
.chart-box { width: 100%; height: 200px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
.chart-box.small-chart { height: 120px; margin-bottom: 10px; }

/* ── Viability ── */
.verdict-badge { padding: 2px 7px; border-radius: 10px; font-size: 7.5px; font-weight: 800; text-transform: uppercase; }

/* ── Misc ── */
.empty-state { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; color: #64748b; font-size: 8.5px; font-style: italic; }
.disclaimer { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 7.5px; color: #92400e; margin-top: 16px; line-height: 1.55; }
</style>
</head>
<body>

${pages.join("\n")}

<script>
  const scenarioKPIs = ${JSON.stringify(scenarioKPIs)};
  const jCurveData   = ${JSON.stringify(jCurveData)};
  const currSym      = "${sym}";
  const isINR        = ${currencyCode === "INR"};

  function fmtChart(v) {
    const abs = Math.abs(v), sign = v < 0 ? "-" : "";
    if (isINR) {
      if (abs >= 1e7) return sign + currSym + (abs/1e7).toFixed(2) + " Cr";
      if (abs >= 1e5) return sign + currSym + (abs/1e5).toFixed(2) + " L";
      return sign + currSym + Math.round(abs).toLocaleString("en-IN");
    }
    if (abs >= 1e6) return sign + currSym + (abs/1e6).toFixed(2) + " M";
    if (abs >= 1e3) return sign + currSym + (abs/1e3).toFixed(1) + " K";
    return sign + currSym + Math.round(abs).toLocaleString("en-US");
  }

  function initMap() {
    const lat = ${subjectLat};
    const lng = ${subjectLng};
    if (!lat || !lng) return;
    const map = L.map("print-map", { center: [lat, lng], zoom: 15, zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    const polygonCoords = ${JSON.stringify(polygonCoords)};
    if (polygonCoords && polygonCoords.length > 0) {
      const poly = L.polygon(polygonCoords.map(c => [c[0], c[1]]), { color: "#448C74", fillColor: "#448C74", fillOpacity: 0.18, weight: 3 }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [10, 10] });
    } else {
      L.marker([lat, lng]).addTo(map);
    }
    const comps = ${JSON.stringify(comps.map((c) => { const p = (c.coordinates||"").split(","); return { name: c.projectName, lat: parseFloat(p[0]), lng: parseFloat(p[1]) }; }).filter(p => !isNaN(p.lat)))};
    comps.forEach((c, i) => {
      const icon = L.divIcon({ className:"", html: '<div style="width:14px;height:14px;background:#2563eb;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:7px;font-family:sans-serif;">' + (i+1) + "</div>", iconSize:[14,14], iconAnchor:[7,7] });
      L.marker([c.lat, c.lng], { icon }).addTo(map);
    });
  }

  // ── Inline data-label plugin: draws values directly on canvas ──
  const dataLabelPlugin = {
    id: "inlineDataLabels",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, dIdx) => {
        const meta = chart.getDatasetMeta(dIdx);
        if (meta.hidden) return;
        meta.data.forEach((element, idx) => {
          const value = dataset.data[idx];
          if (value == null || value === 0) return;
          const label = fmtChart(value);
          ctx.save();
          ctx.font = "bold 7.5px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          // White halo for readability
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          const x = element.x;
          const y = element.y - 4;
          ctx.strokeText(label, x, y);
          // Label color: green for revenue line/bar, blue for cost bar, teal for J-curve
          if (chart.config.type === "bar") {
            ctx.fillStyle = dIdx === 0 ? "#065f46" : "#1e40af";
          } else {
            ctx.fillStyle = "#065f46";
          }
          ctx.fillText(label, x, y);
          ctx.restore();
        });
      });
    }
  };

  function initCharts() {
    const barEl = document.getElementById("cost-revenue-canvas");
    if (barEl) {
      new Chart(barEl, {
        type: "bar",
        plugins: [dataLabelPlugin],
        data: {
          labels: scenarioKPIs.map(k => k.name),
          datasets: [
            { label: "Revenue", data: scenarioKPIs.map(k => k.totalRevenue), backgroundColor: "#10b981", borderRadius: 4, barPercentage: 0.55, categoryPercentage: 0.6 },
            { label: "Cost",    data: scenarioKPIs.map(k => k.totalCost),    backgroundColor: "#3b82f6", borderRadius: 4, barPercentage: 0.55, categoryPercentage: 0.6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 20 } },
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 8 } } },
            tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtChart(ctx.raw) } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 7 } } },
            y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 7 }, callback: v => fmtChart(v) } }
          }
        }
      });
    }

    jCurveData.forEach(sc => {
      const el = document.getElementById("j-curve-canvas-" + sc.id);
      if (!el) return;
      new Chart(el, {
        type: "line",
        plugins: [dataLabelPlugin],
        data: {
          labels: sc.years,
          datasets: [{
            label: "Cumulative Cash Flow",
            data: sc.cumulativeCashFlows,
            borderColor: "#10b981", borderWidth: 2,
            fill: true, backgroundColor: "rgba(16,185,129,0.08)",
            tension: 0.35,
            pointRadius: 4, pointHoverRadius: 6,
            pointBackgroundColor: "#10b981", pointBorderColor: "#ffffff", pointBorderWidth: 1.5
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 22 } },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => "Cumulative: " + fmtChart(ctx.raw) } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 7 } } },
            y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 7 }, callback: v => fmtChart(v) } }
          }
        }
      });
    });
  }

  function initMarkdown() {
    if (typeof marked === "undefined") return;
    document.querySelectorAll(".reg-markdown-content").forEach(el => {
      el.innerHTML = marked.parse(el.getAttribute("data-raw") || "");
    });
  }

  function initAll() {
    if (typeof L === "undefined" || typeof Chart === "undefined") { setTimeout(initAll, 50); return; }
    try { initMap(); }     catch(e) { console.error(e); }
    try { initCharts(); }  catch(e) { console.error(e); }
    try { initMarkdown(); } catch(e) { console.error(e); }
    setTimeout(() => window.print(), 2500);
  }

  document.readyState === "complete" ? initAll() : window.addEventListener("load", initAll);
</script>
</body>
</html>`;

  return finalHtml;
}
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
