import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaSearch, FaSave } from "react-icons/fa";
import { apiUrl } from "@/lib/api-client";
import CashflowAnalysis from "./CashflowAnalysis";

// ─── Constants ───────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
const FeasibilityIrrSection = () => {
  // IRR Form State
  const [projectDurations, setProjectDurations] = useState({});
  const [formData, setFormData] = useState({}); // nested by scenarioId
  
  const [validationErrors, setValidationErrors] = useState({});
  const [autofillNotice, setAutofillNotice] = useState("");

  // Scenarios and Dynamic Data State
  const [currency, setCurrency] = useState("INR");
  const [availableScenarios, setAvailableScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const projectDuration = projectDurations[selectedScenario] || 1;
  const [dynamicRows, setDynamicRows] = useState([]); // [{ key, label, totalAmount }]

  // Comparable Projects State
  const [isComparableModalOpen, setIsComparableModalOpen] = useState(false);
  const [comparableLoading, setComparableLoading] = useState(false);
  const [comparableResult, setComparableResult] = useState(null);
  const [comparableError, setComparableError] = useState(null);
  const [comparableTokenUsage, setComparableTokenUsage] = useState(null);
  const [isComparableLedgerOpen, setIsComparableLedgerOpen] = useState(false);
  const [comparableProjects, setComparableProjects] = useState(null);
  const [comparableProviderStats, setComparableProviderStats] = useState(null);
  const [activeComparableTab, setActiveComparableTab] = useState("Comparable projects");
  const [activeProjectTab, setActiveProjectTab] = useState("under_construction");
  const [searchRadius, setSearchRadius] = useState(1);

  // Sales Velocity State
  const [salesVelocityData, setSalesVelocityData] = useState(null);
  const [salesVelocityLoading, setSalesVelocityLoading] = useState(false);
  const [salesVelocityError, setSalesVelocityError] = useState(null);
  const [selectedSalesVelocityProjects, setSelectedSalesVelocityProjects] = useState(new Set());
  const [activeSalesTab, setActiveSalesTab] = useState("upcoming");

  // Cash Inflow Simulation State
  const [cashInflowSimLoading, setCashInflowSimLoading] = useState(false);
  const [cashInflowSimResult, setCashInflowSimResult] = useState(null);
  const [cashInflowSimError, setCashInflowSimError] = useState(null);
  const [activeInflowScenario, setActiveInflowScenario] = useState("Most Probable");
  const [userCashflowRows, setUserCashflowRows] = useState([
    { year: "Year 0", percentage: "" },
    { year: "Year 1", percentage: "" },
  ]);

  // Metric List V2 State
  const [metricListV2, setMetricListV2] = useState(null);
  const [isMetricListV2Open, setIsMetricListV2Open] = useState(false);

  // ── Load dynamic scenario data ─────────────────────────────────────────────
  const loadDynamicData = useCallback(() => {
    try {
      const savedLand = localStorage.getItem("Land Identification");
      let cur = "INR";
      if (savedLand) {
        const parsedLand = JSON.parse(savedLand);
        if (parsedLand.currency) cur = parsedLand.currency;
      }
      setCurrency(cur);

      let scenarios = [];
      let activeId = "";
      const savedScenarios = localStorage.getItem('ProductMixScenarios');
      if (savedScenarios) {
        const parsed = JSON.parse(savedScenarios);
        if (parsed.scenarios?.length > 0) {
          scenarios = parsed.scenarios;
          activeId = parsed.activeScenarioId || scenarios[0].id;
        }
      }
      setAvailableScenarios(scenarios);
      
      const currentScenarioId = activeId || (selectedScenario && scenarios.some(s => s.id === selectedScenario) ? selectedScenario : null);
      if (currentScenarioId !== selectedScenario) {
        setSelectedScenario(currentScenarioId);
      }

      if (!currentScenarioId) return;

      let totalRev = 0;
      const revData = localStorage.getItem("RevenueV2");
      if (revData) {
        const parsedRev = JSON.parse(revData);
        const scenarioRev = parsedRev.scenarios?.find(s => s.scenarioId === currentScenarioId);
        if (scenarioRev) totalRev = scenarioRev.totalRevenue || 0;
      }

      let fixed = {};
      let custom = [];
      const costData = localStorage.getItem("CostProjectDetailsV1");
      if (costData) {
        const parsedCost = JSON.parse(costData);
        const scenarioCost = parsedCost[currentScenarioId];
        if (scenarioCost) {
          fixed = scenarioCost.fixedInputs || {};
          custom = scenarioCost.customFields || [];
        }
      }

      const rows = [];
      rows.push({ key: "sales_cash_inflow", label: "Sales Cash Inflow", totalAmount: totalRev });

      Object.keys(FIXED_COST_LABELS).forEach(key => {
        const val = Number(fixed[key]) || 0;
        rows.push({ key, label: FIXED_COST_LABELS[key], totalAmount: val });
      });

      custom.forEach(field => {
        rows.push({ key: `custom_${field.id}`, label: field.name || "Custom Field", totalAmount: Number(field.value) || 0 });
      });

      setDynamicRows(rows);

    } catch (e) {
      console.error("Error loading dynamic IRR data", e);
    }
  }, [selectedScenario]);

  useEffect(() => {
    loadDynamicData();
    window.addEventListener('storage', loadDynamicData);
    window.addEventListener('productMixScenariosUpdated', loadDynamicData);
    window.addEventListener('costProjectDetailsUpdated', loadDynamicData);
    return () => {
      window.removeEventListener('storage', loadDynamicData);
      window.removeEventListener('productMixScenariosUpdated', loadDynamicData);
      window.removeEventListener('costProjectDetailsUpdated', loadDynamicData);
    };
  }, [loadDynamicData]);

  useEffect(() => {
    const checkCurrency = () => {
      try {
        const savedLand = localStorage.getItem("Land Identification");
        if (savedLand) {
          const parsed = JSON.parse(savedLand);
          if (parsed.currency && parsed.currency !== currency) {
            setCurrency(parsed.currency);
          }
        }
      } catch (e) {}
    };
    const interval = setInterval(checkCurrency, 1000);
    return () => clearInterval(interval);
  }, [currency]);

  // Build Metric List V2 Payload
  useEffect(() => {
    const buildV2Payload = () => {
      try {
        let activeId = selectedScenario;
        let scenarios = availableScenarios;
        const savedMix = localStorage.getItem("ProductMixScenarios");
        
        let salesInfo = [];
        if (savedMix) {
          const parsed = JSON.parse(savedMix);
          if (parsed.scenarios) scenarios = parsed.scenarios;
          if (!activeId) activeId = parsed.activeScenarioId || (scenarios[0]?.id);
          
          const scenarioMix = scenarios.find(s => s.id === activeId);
          if (scenarioMix && scenarioMix.productMixRows) {
            salesInfo = scenarioMix.productMixRows.map(row => ({
              bhk: row.unitMix || row.bhkType || row.unitType || row.bhk,
              assetClass: row.assetClass || "-",
              propertyType: row.propertyType || "-",
              unitMix: row.unitMix || "-",
              noOfUnits: Number(row.totalInventory) || 0,
              perUnitCost: 0 // Will map from RevenueV2
            }));
          }
        }

        const revData = localStorage.getItem("RevenueV2");
        if (revData && activeId) {
          const parsedRev = JSON.parse(revData);
          const scenarioRev = parsedRev.scenarios?.find(s => s.scenarioId === activeId);
          if (scenarioRev && scenarioRev.rowRevenues) {
            salesInfo = salesInfo.map(info => {
              const revRow = scenarioRev.rowRevenues.find(r => (r.unitMix || r.bhkType || r.unitType || r.bhk) === info.bhk);
              return {
                ...info,
                perUnitCost: revRow ? (Number(revRow.rate) * Number(revRow.pointArea) || 0) : 0
              };
            });
          }
        }

        let cashOutflowRows = [];
        let cashOutflowTotal = 0;
        let constructionTimeline = "";
        const costData = localStorage.getItem("CostProjectDetailsV1");
        if (costData && activeId) {
          const parsedCost = JSON.parse(costData);
          const scenarioCost = parsedCost[activeId];
          if (scenarioCost) {
            const fixed = scenarioCost.fixedInputs || {};
            const custom = scenarioCost.customFields || [];
            
            Object.keys(FIXED_COST_LABELS).forEach(key => {
              const val = Number(fixed[key]) || 0;
              if (val > 0) cashOutflowRows.push({ key, label: FIXED_COST_LABELS[key], value: val });
            });
            custom.forEach(field => {
              const val = Number(field.value) || 0;
              if (val > 0) cashOutflowRows.push({ key: `custom_${field.id}`, label: field.name || "Custom Field", value: val });
            });
            
            cashOutflowTotal = scenarioCost.totalProjectCost || 0;
            constructionTimeline = fixed.constructionTimeline || "";
          }
        }

        let meansOfFinanceRows = [];
        let meansOfFinanceTotalPercentage = 0;
        let meansOfFinanceTotals = 0;
        const meansData = localStorage.getItem("MeansOfFinanceV1");
        if (meansData && activeId) {
          const parsedMeans = JSON.parse(meansData);
          const scenarioMeans = parsedMeans[activeId];
          if (scenarioMeans) {
            const formData = scenarioMeans.formData || {};
            const customFields = scenarioMeans.customFields || [];
            
            const FIXED_FINANCE_KEYS = [
              { key: "equity", label: "Equity" },
              { key: "termLoan", label: "Term Loan" },
              { key: "customerAdvances", label: "Customer Advances" }
            ];
            
            const allRows = [
              ...FIXED_FINANCE_KEYS,
              ...customFields.map(f => ({ key: f.key, label: f.name }))
            ];
            
            allRows.forEach(row => {
              const perc = Number(formData[row.key]) || 0;
              if (perc > 0) {
                meansOfFinanceRows.push({
                  key: row.key,
                  label: row.label,
                  percentage: perc,
                  proposed: (perc / 100) * cashOutflowTotal
                });
                meansOfFinanceTotalPercentage += perc;
              }
            });
            meansOfFinanceTotals = cashOutflowTotal;
          }
        }

        setMetricListV2({
          salesInfo,
          cashOutflowRows,
          cashOutflowTotal,
          meansOfFinanceRows,
          meansOfFinanceTotalPercentage,
          meansOfFinanceTotals,
          constructionTimeline
        });

      } catch (e) {
        console.error("Error building Metric List V2", e);
      }
    };

    buildV2Payload();
    window.addEventListener("productMixScenariosUpdated", buildV2Payload);
    window.addEventListener("costProjectDetailsUpdated", buildV2Payload);
    window.addEventListener("storage", buildV2Payload);
    return () => {
      window.removeEventListener("productMixScenariosUpdated", buildV2Payload);
      window.removeEventListener("costProjectDetailsUpdated", buildV2Payload);
      window.removeEventListener("storage", buildV2Payload);
    };
  }, [selectedScenario, availableScenarios]);

  // Load standard saved IRR form
  useEffect(() => {
    try {
      const saved = localStorage.getItem("irrFormV2");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.projectDurations) {
          setProjectDurations(p.projectDurations);
        } else if (p.projectDuration) {
          const sid = p.formData ? Object.keys(p.formData)[0] : null;
          if (sid) setProjectDurations({ [sid]: p.projectDuration });
        }
        if (p.formData) setFormData(p.formData);
      }
    } catch (e) {}
    
    try {
      const cc = localStorage.getItem("cache_comparableProjects"); if (cc) setComparableProjects(JSON.parse(cc));
      const cs = localStorage.getItem("cache_comparableProviderStats"); if (cs) setComparableProviderStats(JSON.parse(cs));
      const cr = localStorage.getItem("cache_comparableResult"); if (cr) setComparableResult(JSON.parse(cr));
      const sv = localStorage.getItem("cache_salesVelocityData"); if (sv) setSalesVelocityData(JSON.parse(sv));
    } catch (e) {}
  }, []);

  // Auto-select under-construction projects when sales velocity loads
  useEffect(() => {
    if (salesVelocityData?.velocity_data && comparableProjects) {
      const lookup = {};
      comparableProjects.forEach(p => { lookup[(p.projectName || "").toLowerCase()] = (p.status || "").toLowerCase(); });
      const init = new Set();
      salesVelocityData.velocity_data.forEach(row => {
        if ((lookup[(row.llmName || "").toLowerCase()] || "").includes("under construction")) init.add(row.llmName);
      });
      setSelectedSalesVelocityProjects(init);
    }
  }, [salesVelocityData, comparableProjects]);

  // ── IRR Form Handlers ──────────────────────────────────────────────────────
  const handleProjectDurationChange = (e) => {
    if (!selectedScenario) return;
    const val = Math.min(15, Math.max(1, parseInt(e.target.value) || 1));
    setProjectDurations(prev => {
      const next = { ...prev, [selectedScenario]: val };
      localStorage.setItem("irrFormV2", JSON.stringify({ projectDurations: next, formData }));
      return next;
    });
    setValidationErrors({});
  };

  const handleDataEntry = (rowKey, year, inputType, value) => {
    if (!selectedScenario) return;
    const row = dynamicRows.find(r => r.key === rowKey);
    if (!row) return;

    let percentage = 0;
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      percentage = 0;
    } else if (inputType === "percent") {
      percentage = numValue;
    } else if (inputType === "value") {
      if (row.totalAmount === 0) {
        percentage = 0;
      } else {
        percentage = (numValue / row.totalAmount) * 100;
      }
    }

    setFormData(prev => {
      const scenarioData = prev[selectedScenario] || {};
      const rowData = scenarioData[rowKey] || {};
      const nfd = {
        ...prev,
        [selectedScenario]: {
          ...scenarioData,
          [rowKey]: {
            ...rowData,
            [year]: percentage
          }
        }
      };
      localStorage.setItem("irrFormV2", JSON.stringify({ projectDurations, formData: nfd }));
      return nfd;
    });
  };

  const saveBreakdown = () => {
    if (!selectedScenario) return;
    const errors = {};
    const scenarioData = formData[selectedScenario] || {};
    
    dynamicRows.forEach((row) => {
      const rowData = scenarioData[row.key] || {};
      let totalPercent = 0;
      for (let y = 0; y <= projectDuration; y++) {
        totalPercent += rowData[y] || 0;
      }
      if (Math.abs(totalPercent - 100) > 0.01 && row.totalAmount > 0) {
        errors[`${selectedScenario}_${row.key}`] = `Total: ${totalPercent.toFixed(2)}%`;
      }
    });

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    localStorage.setItem("ProposedBreakdownV2", JSON.stringify({ projectDurations, formData, timestamp: new Date().toISOString() }));
    localStorage.setItem("irrFormV2", JSON.stringify({ projectDurations, formData, timestamp: new Date().toISOString() }));
    alert("Breakdown saved successfully!");
  };

  const applyAutofill = useCallback((newCashflow, newDuration) => {
    if (!selectedScenario) return;
    let curForm = { ...formData };
    const curDur = projectDurations[selectedScenario] || 1;
    const finalDur = Math.max(curDur, newDuration);
    
    const scenarioData = curForm[selectedScenario] || {};
    curForm = {
      ...curForm,
      [selectedScenario]: {
        ...scenarioData,
        sales_cash_inflow: newCashflow
      }
    };
    
    setProjectDurations(prev => {
      const nextDurs = { ...prev, [selectedScenario]: finalDur };
      localStorage.setItem("irrFormV2", JSON.stringify({ projectDurations: nextDurs, formData: curForm, timestamp: new Date().toISOString(), source: "cashflowSimulation" }));
      return nextDurs;
    });
    setFormData(curForm);
    setValidationErrors({});
    setAutofillNotice("Cash inflow applied from simulation. Review values and click Save Breakdown.");
    const timer = setTimeout(() => setAutofillNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [formData, projectDurations, selectedScenario]);

  // ── Comparable Projects Handlers ───────────────────────────────────────────
  const handleFindComparables = async () => {
    setComparableLoading(true); setComparableResult(null); setComparableError(null);
    setComparableTokenUsage(null); setComparableProjects(null); setComparableProviderStats(null); setIsComparableLedgerOpen(false);
    const lf = JSON.parse(localStorage.getItem("Land Identification") || "{}");
    const lat = parseFloat(lf.polygonCenterLat || lf.latitude);
    const lng = parseFloat(lf.polygonCenterLng || lf.longitude);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      setComparableError("Coordinates not found. Please enter Latitude and Longitude in Land Identification first.");
      setComparableLoading(false); return;
    }
    try {
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/comparable-projects"), {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, fetched_location: lf.fetched_location || "", location: lf.location || "", village: lf.village || "", radius: searchRadius }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) setComparableError(body?.error || "Search failed.");
      else {
        setComparableResult(body.result);
        if (body.tokenUsage) setComparableTokenUsage(body.tokenUsage);
        if (body.projects) setComparableProjects(body.projects);
        if (body.providerStats) setComparableProviderStats(body.providerStats);
      }
    } catch (err) { setComparableError(err.message || "Unexpected error."); }
    finally { setComparableLoading(false); }
  };

  const handleFetchSalesVelocity = async () => {
    if (!comparableProjects?.length) return;
    setSalesVelocityLoading(true); setSalesVelocityError(null); setSalesVelocityData(null);
    try {
      const pp = comparableProjects.filter(p => p.coordinates?.includes(",")).map(p => {
        const [la, lo] = p.coordinates.split(",").map(s => s.trim());
        return { projectName: p.projectName, location: p.location, lat: la, lng: lo };
      });
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/sales-velocity2"), {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ projects: pp }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) setSalesVelocityError(body?.error || "Failed.");
      else setSalesVelocityData(body);
    } catch (err) { setSalesVelocityError(err.message); }
    finally { setSalesVelocityLoading(false); }
  };

  const handleRunCashInflowSimulation = async () => {
    if (!salesVelocityData?.velocity_data) return;
    setCashInflowSimLoading(true); setCashInflowSimError(null); setCashInflowSimResult(null);
    try {
      const selVel = salesVelocityData.velocity_data.filter(r => selectedSalesVelocityProjects.has(r.llmName));
      const salesInfoRows = metricListV2?.salesInfo || [];
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/predict-cash-inflow"), {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ salesInfo: salesInfoRows, velocityData: selVel }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) setCashInflowSimError(body?.error || "Failed.");
      else setCashInflowSimResult(body.data);
    } catch (err) { setCashInflowSimError(err.message); }
    finally { setCashInflowSimLoading(false); }
  };

  const parsedInflowResult = useMemo(() => {
    if (!cashInflowSimResult) return null;
    const sc = { "Optimistic": [], "Most Probable": [], "Pessimistic": [] };
    const m = cashInflowSimResult.match(/<FINAL_IRR_INPUT_FORMAT>([\s\S]*?)<\/FINAL_IRR_INPUT_FORMAT>/);
    if (m) {
      let cur = null;
      m[1].split("\n").forEach(raw => {
        const l = raw.trim(); if (!l) return;
        if (/^optimistic:?$/i.test(l)) { cur = "Optimistic"; return; }
        if (/^most probable:?$/i.test(l)) { cur = "Most Probable"; return; }
        if (/^pessimistic:?$/i.test(l)) { cur = "Pessimistic"; return; }
        const ym = l.match(/^year\s+(\d+)\s*=\s*([\d.]+%?)/i);
        if (ym && cur) { const n = parseInt(ym[1], 10), pct = ym[2].endsWith("%") ? ym[2] : ym[2] + "%"; sc[cur].push({ year: `Year ${n}`, percentage: pct }); }
      });
    }
    return sc;
  }, [cashInflowSimResult]);

  const handleApplyInflowScenario = () => {
    if (!parsedInflowResult?.[activeInflowScenario]?.length) return;
    let maxY = 1; const cf = {};
    parsedInflowResult[activeInflowScenario].forEach(row => {
      const m = row.year.match(/\d+/); if (m) { const n = parseInt(m[0], 10); if (n > maxY) maxY = n; if (n > 0) cf[n] = parseFloat(row.percentage.replace("%", "").trim()) || 0; }
    });
    applyAutofill(cf, maxY); setIsComparableModalOpen(false);
  };

  const handleApplyUserCashflow = () => {
    let maxY = 1; const cf = {};
    userCashflowRows.forEach(row => {
      const m = row.year.match(/\d+/); if (m) { const n = parseInt(m[0], 10); if (n > maxY) maxY = n; if (n > 0) cf[n] = parseFloat(row.percentage.replace("%", "").trim()) || 0; }
    });
    applyAutofill(cf, maxY); setIsComparableModalOpen(false);
  };
  const handleScenarioSelect = (id) => {
    setSelectedScenario(id);
    try {
      const saved = localStorage.getItem("ProductMixScenarios");
      let parsed = { scenarios: availableScenarios, activeScenarioId: id };
      if (saved) {
        parsed = JSON.parse(saved);
        parsed.activeScenarioId = id;
      }
      localStorage.setItem("ProductMixScenarios", JSON.stringify(parsed));
      window.dispatchEvent(new Event("productMixScenariosUpdated"));
    } catch (e) {}
  };

  const years = Array.from({ length: projectDuration + 1 }, (_, i) => i);

  const getScenarioColor = (index) => {
    const colors = ['#448C74', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
    return colors[index % colors.length];
  };

  return (
    <div className="unit-design-panel w-100 p-4" style={{ background: "#ffffff", border: "1px solid #e7ebf1", borderRadius: "24px", boxShadow: "0 18px 42px rgba(15,23,42,0.08)", marginBottom: "2rem" }}>
      <style>{`
        .irr-fs-btn { border:1px solid #dbe3ee; border-radius:999px; background:#111827; color:#fff; font-size:14px; font-weight:700; min-height:42px; padding:0 24px; transition:all 0.2s; display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
        .irr-fs-btn:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,0.18); }
        .irr-ct { font-size:12px; border-collapse:separate; border-spacing:0; }
        .irr-ct th { background:#f8fafc; color:#475569; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; padding:8px 6px; white-space:nowrap; border-bottom:2px solid #e2e8f0; position:sticky; top:0; z-index:1; }
        .irr-ct td { padding:5px 4px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
        .irr-ct tbody tr:hover td { background:#f8fafc; }
        .irr-ct .cl { font-weight:600; color:#334155; font-size:11px; white-space:nowrap; min-width:140px; padding-left:12px; }
        .irr-ct .rt { font-weight:700; font-size:11px; text-align:right; padding-right:10px; min-width:60px; }
        .irr-ct input[type="number"] { width:56px; padding:3px 4px; font-size:11px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; text-align:center; -moz-appearance:textfield; }
        .irr-ct input[type="number"]::-webkit-outer-spin-button,.irr-ct input[type="number"]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .irr-ct input[type="number"]:focus { outline:none; border-color:#448C74; background:#fff; box-shadow:0 0 0 2px rgba(68,140,116,0.15); }
        .irr-err-row td { background:#fee2e2 !important; }
        .irr-err-row .cl { color:#dc2626; }
        .irr-rv { color:#16a34a; font-weight:800; }
        .irr-ri { color:#ef4444; }
        
        .scenario-strip { display: flex; align-items: stretch; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: thin; scrollbar-color: #cbd5e1 #f8fafc; margin-top: 10px; }
        .scenario-strip::-webkit-scrollbar { height: 6px; }
        .scenario-strip::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .scenario-strip::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
        .scenario-strip::-webkit-scrollbar-thumb:hover { background-color: #448C74; }
        .scenario-card { position: relative; display: flex; flex-direction: column; justify-content: center; min-width: 170px; max-width: 220px; padding: 12px 16px 12px 18px; border-radius: 14px; border: 2px solid #e2e8f0; background: #ffffff; cursor: pointer; transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0; user-select: none; overflow: hidden; }
        .scenario-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; border-radius: 14px 0 0 14px; background: #e2e8f0; transition: background 0.22s; }
        .scenario-card.active::before { background: var(--sc-color, #448C74); }
        .scenario-card:hover:not(.active) { border-color: #94a3b8; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.07); }
        .scenario-card.active { border-color: var(--sc-color, #448C74); box-shadow: 0 4px 16px rgba(68,140,116,0.18); background: #f8fffe; }
        .scenario-card-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0; margin-bottom: 6px; }
        .scenario-card-name { font-size: 12.5px; font-weight: 800; color: #0f172a; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .scenario-card-subtitle { font-size: 10.5px; color: #94a3b8; font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; min-height: 14px; }
      `}</style>

      {/* Section Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-3 border-bottom">
        <div>
          <div className="fw-bold text-uppercase mb-1" style={{ fontSize: "11px", letterSpacing: "1px", color: "#94a3b8" }}>Cashflow Analysis</div>
          <h4 className="fw-bold mb-1" style={{ color: "#0f172a", margin: 0 }}>IRR Calculator</h4>
          <p className="text-muted mb-0 mt-1" style={{ fontSize: "13px" }}>Find comparable projects, simulate cash inflows and define year-wise cost distribution (% or {currency}).</p>
        </div>
      </div>

      {availableScenarios.length > 0 && (
        <div className="mb-4">
          <div className="fw-bold text-muted mb-2 text-uppercase" style={{ fontSize: '13px', letterSpacing: '1px' }}>
            Scenarios
          </div>
          <div className="scenario-strip">
            {availableScenarios.map((scenario, idx) => {
              const isActive = scenario.id === selectedScenario;
              const color = getScenarioColor(idx);
              return (
                <div
                  key={scenario.id}
                  className={`scenario-card${isActive ? ' active' : ''}`}
                  style={{ '--sc-color': color }}
                  onClick={() => handleScenarioSelect(scenario.id)}
                  title={`Click to switch to ${scenario.name}`}
                >
                  <div className="scenario-card-icon" style={{ background: color }}>{idx + 1}</div>
                  <div className="scenario-card-name">{scenario.name}</div>
                  <div className="scenario-card-subtitle">{scenario.subtitle || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No description</span>}</div>
                  {isActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="d-flex justify-content-end mt-3 mb-2">
            <button 
              type="button" 
              className="btn d-inline-flex align-items-center gap-2 px-4 py-2" 
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.25)'; }}
              onClick={() => { setIsComparableModalOpen(true); setComparableResult(null); setComparableError(null); }}
            >
              <FaSearch size={14} /> Predict Sales Cash Inflow
            </button>
          </div>
        </div>
      )}

      {/* IRR Calculation Form */}
      <div>
        {autofillNotice && <div className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center gap-2">✅ {autofillNotice}</div>}
        <div className="d-flex align-items-center gap-3 mb-3">
          <label className="fw-semibold text-dark mb-0" style={{ fontSize: "13px" }}>Cashflow Projection Years:</label>
          <input type="number" className="form-control form-control-sm" style={{ width: "72px" }} value={projectDuration} onChange={handleProjectDurationChange} min="1" max="15" />
          <span className="text-muted" style={{ fontSize: "11px" }}>(Max 15)</span>
        </div>

        <div className="table-responsive" style={{ borderRadius: "12px", border: "1px solid #e2e8f0", maxHeight: "430px", overflowY: "auto" }}>
          <table className="table irr-ct mb-0">
            <thead>
              <tr>
                <th style={{ minWidth: "200px" }}>Cost Type</th>
                {years.map(y => <th key={y} className="text-center" style={{ minWidth: "100px" }}>Yr {y}</th>)}
                <th style={{ minWidth: "80px" }}>Total %</th>
              </tr>
            </thead>
            <tbody>
              {dynamicRows.map((row) => {
                const rowData = formData[selectedScenario]?.[row.key] || {};
                let totalPercent = 0;
                for (let y = 0; y <= projectDuration; y++) {
                  totalPercent += parseFloat(rowData[y]) || 0;
                }
                const isValid = Math.abs(totalPercent - 100) < 0.01 || row.totalAmount === 0;
                const isOver = totalPercent > 100.01;
                const hasError = !!validationErrors[`${selectedScenario}_${row.key}`];

                const formatCurrency = (val) => {
                  if (!val && val !== 0) return "0";
                  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val);
                };

                return (
                  <tr key={row.key} className={hasError || isOver ? "irr-err-row" : ""}>
                    <td className="cl">
                      <div className="fw-bold">{row.label}</div>
                      <div className="text-muted" style={{fontSize:"10px"}}>{currency} {formatCurrency(row.totalAmount)}</div>
                    </td>
                    {years.map(y => {
                      const pct = rowData[y] || 0;
                      const val = (pct / 100) * row.totalAmount;
                      return (
                        <td key={y} className="text-center p-2">
                          <div className="d-flex flex-column align-items-center gap-1">
                            <div className="input-group input-group-sm" style={{ width: "85px" }}>
                              <input type="number" className="form-control" style={{fontSize:"10px", padding:"2px 4px", textAlign:"right"}} value={pct ? Math.round(pct * 100) / 100 : ""} onChange={e => handleDataEntry(row.key, y, "percent", e.target.value)} placeholder="0" min="0" max="100" step="0.01" disabled={row.totalAmount === 0} />
                              <span className="input-group-text" style={{fontSize:"9px", padding:"2px 4px"}}>%</span>
                            </div>
                            <div className="input-group input-group-sm" style={{ width: "85px" }}>
                              <span className="input-group-text" style={{fontSize:"9px", padding:"2px 4px"}}>{currency}</span>
                              <input type="number" className="form-control" style={{fontSize:"10px", padding:"2px 4px", textAlign:"right"}} value={val ? Math.round(val * 100) / 100 : ""} onChange={e => handleDataEntry(row.key, y, "value", e.target.value)} placeholder="0" step="0.01" disabled={row.totalAmount === 0} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className={`rt ${totalPercent > 0 ? (isValid ? "irr-rv" : "irr-ri") : "text-muted"}`} style={{ verticalAlign: "middle" }}>
                      {totalPercent.toFixed(1)}%
                      {isOver && <div className="text-danger mt-1 fw-bold" style={{ fontSize: "9px" }}>⚠️ Exceeds 100%</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {Object.keys(validationErrors).length > 0 && (
          <div className="alert alert-danger py-2 px-3 mt-3 small"><strong>All rows must total exactly 100%.</strong> Rows highlighted in red need correction.</div>
        )}
        <div className="text-end mt-3">
          <button type="button" className="btn btn-dark rounded-pill px-5 fw-semibold d-inline-flex align-items-center gap-2" onClick={saveBreakdown}>
            <FaSave size={12} /> Save Breakdown
          </button>
        </div>
        
        <CashflowAnalysis 
          key={selectedScenario}
          formData={formData} 
          projectDuration={projectDuration} 
          selectedScenario={selectedScenario} 
          dynamicRows={dynamicRows} 
        />
      </div>

      {/* Find Comparable Projects Modal */}
      {isComparableModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">🔍 Project Analysis</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setIsComparableModalOpen(false)} disabled={comparableLoading} />
              </div>
              <div className="modal-body pt-3 pb-4">
                <div className="row h-100">
                  {/* Sidebar */}
                  <div className="col-md-3 border-end">
                    <div className="nav flex-column nav-pills" role="tablist">
                      {["Comparable projects", "Sales velocity", "Cash Inflow Simulation"].map(tab => {
                        const disabled = tab === "Cash Inflow Simulation" && !salesVelocityData;
                        const active = activeComparableTab === tab;
                        return (
                          <button key={tab} type="button" className={`nav-link text-start fw-semibold mb-2 ${active ? "active" : ""}`}
                            onClick={() => !disabled && setActiveComparableTab(tab)} disabled={disabled}
                            style={{ ...(active ? { backgroundColor: "#198754", color: "white" } : { color: "#495057" }), ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>
                            {tab}{disabled && <i className="bi bi-lock-fill float-end text-muted mt-1"></i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="col-md-9 ps-4">

                    {/* Tab 1: Comparable Projects */}
                    {activeComparableTab === "Comparable projects" && (
                      <div>
                        <p className="text-dark mb-4">Searches for real estate projects near your coordinates within the specified radius.</p>
                        {(() => {
                          const lf = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("Land Identification") || "{}" : "{}");
                          const lat = parseFloat(lf.polygonCenterLat || lf.latitude);
                          const lng = parseFloat(lf.polygonCenterLng || lf.longitude);
                          return lat && lng && !isNaN(lat) && !isNaN(lng)
                            ? (<div className="d-flex gap-3 mb-4">
                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fs-6">📍 Lat: <strong>{lat}</strong></span>
                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fs-6">📍 Lng: <strong>{lng}</strong></span>
                              </div>)
                            : <div className="alert alert-warning rounded-3 mb-4">⚠️ No coordinates found. Please save a polygon or enter coordinates in Land Identification first.</div>;
                        })()}

                        <div className="d-flex justify-content-end mb-4 align-items-center gap-2 flex-wrap">
                          {comparableProjects && comparableProjects.length === 0 && (
                            <div className="text-danger fw-semibold small bg-danger bg-opacity-10 px-3 py-1 rounded-pill border border-danger border-opacity-25">⚠️ No projects found. Increase the area.</div>
                          )}
                          <select className="form-select form-select-sm rounded-pill shadow-sm" style={{ width: "auto", minWidth: "80px" }} value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} disabled={comparableLoading}>
                            {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}km</option>)}
                          </select>
                          <button type="button" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" onClick={handleFindComparables} disabled={comparableLoading} style={{ minWidth: 155 }}>
                            {comparableLoading ? <><span className="spinner-border spinner-border-sm me-2" />Searching…</> : "Find Comparables"}
                          </button>
                          <button type="button" className="btn btn-outline-success btn-sm rounded-pill shadow-sm"
                            onClick={() => { if (comparableProjects) localStorage.setItem("cache_comparableProjects", JSON.stringify(comparableProjects)); if (comparableProviderStats) localStorage.setItem("cache_comparableProviderStats", JSON.stringify(comparableProviderStats)); if (comparableResult) localStorage.setItem("cache_comparableResult", JSON.stringify(comparableResult)); alert("Saved to cache."); }}
                            disabled={!comparableProjects}>💾 Save</button>
                          <button type="button" className="btn btn-outline-danger btn-sm rounded-pill shadow-sm"
                            onClick={() => { localStorage.removeItem("cache_comparableProjects"); localStorage.removeItem("cache_comparableProviderStats"); localStorage.removeItem("cache_comparableResult"); setComparableProjects(null); setComparableProviderStats(null); setComparableResult(null); }}>🗑️ Clear</button>
                        </div>

                        {comparableError && <div className="alert alert-danger rounded-3">❌ {comparableError}</div>}

                        {(comparableResult || comparableProjects) && (
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div className="d-flex align-items-center gap-2">
                                <h6 className="fw-bold text-dark mb-0">Comparable Projects</h6>
                                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: "0.75rem" }}>Web Search + Maps API</span>
                              </div>
                              {comparableProjects?.length > 0 && (
                                <div className="btn-group shadow-sm" role="group">
                                  {[["under_construction","Under Construction"],["other","Other Projects"]].map(([val,lbl]) => (
                                    <React.Fragment key={val}>
                                      <input type="radio" className="btn-check" name="pTabR" id={`pt-${val}`} autoComplete="off" checked={activeProjectTab === val} onChange={() => setActiveProjectTab(val)} />
                                      <label className={`btn btn-sm ${activeProjectTab === val ? "btn-primary" : "btn-outline-primary"}`} htmlFor={`pt-${val}`}>{lbl}</label>
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>

                            {comparableProjects?.length > 0 ? (() => {
                              const filtered = comparableProjects.filter(p => activeProjectTab === "under_construction" ? p.status?.toLowerCase().includes("under construction") : !p.status?.toLowerCase().includes("under construction"));
                              return (
                                <div className="table-responsive rounded-3 border shadow-sm" style={{ maxHeight: 380, overflowY: "auto" }}>
                                  <table className="table table-hover table-striped align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                                    <thead style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", color: "#e2e8f0", position: "sticky", top: 0 }}>
                                      <tr>{["#","Project Name","Status","BHK","Location","Possession","Coordinates"].map(h => <th key={h} className="px-3 py-3" style={{ fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                      {filtered.length > 0 ? filtered.map((p, i) => (
                                        <tr key={i}>
                                          <td className="px-3 py-2 text-muted">{i+1}</td>
                                          <td className="px-3 py-2 fw-semibold text-dark">{p.projectName||"—"}</td>
                                          <td className="px-3 py-2"><span className={`badge ${p.status?.toLowerCase().includes("under construction")?"bg-info text-dark":"bg-secondary"} bg-opacity-10 border px-2 py-1 rounded-pill`}>{p.status||"Unknown"}</span></td>
                                          <td className="px-3 py-2"><span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-2">{p.bhkType||"—"}</span></td>
                                          <td className="px-3 py-2 text-dark">{p.location||"—"}</td>
                                          <td className="px-3 py-2"><span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill px-2">{p.expectedPossessionDate||"N/A"}</span></td>
                                          <td className="px-3 py-2">{p.coordinates && !p.coordinates.includes("not configured") ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.coordinates)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}><code style={{ fontSize:"0.75rem", background:"#f0f4ff", color:"#3730a3", padding:"2px 5px", borderRadius:4 }}>📍 {p.coordinates}</code></a> : <span className="text-muted">—</span>}</td>
                                        </tr>
                                      )) : <tr><td colSpan="7" className="text-center py-4 text-muted">No projects in this category.</td></tr>}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })() : comparableResult ? (
                              <div className="p-4 rounded-3 border" style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", color:"#e2e8f0", fontSize:"0.92rem", lineHeight:"1.75", maxHeight:380, overflowY:"auto" }}
                                dangerouslySetInnerHTML={{ __html: comparableResult.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>") }} />
                            ) : null}

                            {comparableTokenUsage && (
                              <div className="mt-3">
                                <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-inline-flex align-items-center" onClick={() => setIsComparableLedgerOpen(!isComparableLedgerOpen)} style={{ fontSize:"0.8rem" }}>
                                  Token Ledger <span style={{ marginLeft:6, transform: isComparableLedgerOpen?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>▼</span>
                                </button>
                                <div style={{ maxHeight: isComparableLedgerOpen?"180px":"0", overflow:"hidden", transition:"max-height 0.3s ease-in-out" }}>
                                  <div className="card card-body bg-light border-0 shadow-sm rounded-4 mt-2 p-3">
                                    <div className="d-flex gap-2">
                                      {[["Prompt",comparableTokenUsage.input_tokens||0],["Completion",comparableTokenUsage.output_tokens||0],["Total",comparableTokenUsage.total_tokens||0]].map(([l,v])=>(
                                        <div key={l} className="d-flex flex-column align-items-center bg-white rounded-3 p-2 shadow-sm flex-grow-1 border">
                                          <span className="text-muted fw-semibold" style={{ fontSize:"0.7rem", textTransform:"uppercase" }}>{l}</span>
                                          <span className="fw-bold text-dark fs-6">{v}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Sales Velocity */}
                    {activeComparableTab === "Sales velocity" && (
                      <div>
                        {!comparableProjects?.length ? (
                          <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ minHeight:"300px" }}>
                            <div className="fs-1 mb-3">📊</div>
                            <h5 className="fw-bold text-secondary">Complete Comparable Search First</h5>
                            <p className="text-center w-75">Run the Comparable Projects search to enable Sales Velocity analysis.</p>
                          </div>
                        ) : (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <h6 className="fw-bold text-dark m-0">Sales Velocity Analysis</h6>
                              <div className="d-flex align-items-center gap-2">
                                <button className="btn btn-primary btn-sm px-4 fw-bold shadow-sm" onClick={handleFetchSalesVelocity} disabled={salesVelocityLoading}>
                                  {salesVelocityLoading ? <><span className="spinner-border spinner-border-sm me-2" />Fetching...</> : "Fetch Velocity"}
                                </button>
                                <button className="btn btn-outline-success btn-sm rounded-pill" onClick={() => { if (salesVelocityData) { localStorage.setItem("cache_salesVelocityData", JSON.stringify(salesVelocityData)); alert("Saved."); }}} disabled={!salesVelocityData}>💾 Save</button>
                                <button className="btn btn-outline-danger btn-sm rounded-pill" onClick={() => { localStorage.removeItem("cache_salesVelocityData"); setSalesVelocityData(null); }}>🗑️ Clear</button>
                              </div>
                            </div>
                            {salesVelocityError && <div className="alert alert-danger py-2 px-3 small">{salesVelocityError}</div>}
                            {salesVelocityData?.velocity_data && (() => {
                              const statusLookup = {};
                              if (comparableProjects) {
                                comparableProjects.forEach(p => {
                                  statusLookup[(p.projectName || "").toLowerCase()] = (p.status || "").toLowerCase();
                                });
                              }

                              const allRows = salesVelocityData.velocity_data;
                              const filteredRows = allRows.filter(row => {
                                const status = statusLookup[(row.llmName || "").toLowerCase()] || "";
                                if (activeSalesTab === "upcoming") {
                                  return status.includes("under construction");
                                } else {
                                  return !status.includes("under construction");
                                }
                              });

                              const activeYears = salesVelocityData.years
                                ? salesVelocityData.years.filter(year =>
                                  filteredRows.some(row => row.transactions && row.transactions[year])
                                )
                                : [];

                              const activeBhkTypesPerYear = {};
                              activeYears.forEach(year => {
                                const activeBhksInFilteredRows = new Set();
                                filteredRows.forEach(row => {
                                  if (row.transactions && row.transactions[year] && row.transactions[year].breakdown) {
                                    Object.keys(row.transactions[year].breakdown).forEach(bhk => {
                                      if (row.transactions[year].breakdown[bhk] > 0) {
                                        activeBhksInFilteredRows.add(bhk);
                                      }
                                    });
                                  }
                                });
                                const allBhkTypesForYear = salesVelocityData.bhk_types_per_year?.[year] || [];
                                activeBhkTypesPerYear[year] = allBhkTypesForYear.filter(bhk => activeBhksInFilteredRows.has(bhk));
                              });

                              return (
                                <div>
                                  <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="d-flex flex-column">
                                      <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                                        Showing {filteredRows.length} of {allRows.length} projects
                                      </span>
                                      <span className="badge mt-1 px-2 py-1" style={{ fontSize: "0.75rem", alignSelf: "flex-start", backgroundColor: "rgba(253, 126, 20, 0.1)", color: "#d9534f", border: "1px solid rgba(253, 126, 20, 0.5)" }}>
                                        <i className="bi bi-info-circle me-1"></i>
                                        Reminder: Please select/deselect the projects based on your requirement for future process.
                                      </span>
                                    </div>
                                    <div className="btn-group shadow-sm" role="group" aria-label="Sales velocity filter">
                                      <input
                                        type="radio"
                                        className="btn-check"
                                        name="salesTabRadio"
                                        id="salesTab1"
                                        autoComplete="off"
                                        checked={activeSalesTab === "upcoming"}
                                        onChange={() => setActiveSalesTab("upcoming")}
                                      />
                                      <label className={`btn btn-sm ${activeSalesTab === "upcoming" ? "btn-primary" : "btn-outline-primary"}`} htmlFor="salesTab1">
                                        Upcoming Projects
                                      </label>
                                      <input
                                        type="radio"
                                        className="btn-check"
                                        name="salesTabRadio"
                                        id="salesTab2"
                                        autoComplete="off"
                                        checked={activeSalesTab === "other"}
                                        onChange={() => setActiveSalesTab("other")}
                                      />
                                      <label className={`btn btn-sm ${activeSalesTab === "other" ? "btn-primary" : "btn-outline-primary"}`} htmlFor="salesTab2">
                                        Other Projects
                                      </label>
                                    </div>
                                  </div>
                                  <div className="table-responsive bg-white rounded-3 border border-secondary border-opacity-25 shadow-sm" style={{ maxHeight:340, overflowY:"auto" }}>
                                    <table className="table table-hover table-bordered mb-0 align-middle text-center" style={{ fontSize: "0.85rem" }}>
                                      <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                        <tr>
                                          <th rowSpan={2} className="py-3 px-2 align-middle text-center" style={{ width: "40px" }}>
                                            <i className="bi bi-check2-square"></i>
                                          </th>
                                          <th rowSpan={2} className="text-start py-3 px-3 align-middle">Project Name</th>
                                          <th rowSpan={2} className="text-start py-3 px-3 align-middle">DB Match</th>
                                          <th rowSpan={2} className="py-3 px-2 align-middle">Score</th>
                                          {activeYears.map(year => {
                                            const bhkTypes = activeBhkTypesPerYear[year] || [];
                                            return (
                                              <th key={year} colSpan={1 + bhkTypes.length} className="py-2 px-2 border-bottom">
                                                {year}
                                              </th>
                                            );
                                          })}
                                          <th rowSpan={2} className="py-3 px-3 bg-secondary align-middle">Total</th>
                                        </tr>
                                        <tr>
                                          {activeYears.map(year => {
                                            const bhkTypes = activeBhkTypesPerYear[year] || [];
                                            return (
                                              <React.Fragment key={`sub-${year}`}>
                                                <th className="py-2 px-2" style={{ fontSize: "0.8rem", backgroundColor: "#2c3034", color: "#e2e8f0" }}>Total</th>
                                                {bhkTypes.map(bhk => (
                                                  <th key={bhk} className="py-2 px-2 fw-normal" style={{ fontSize: "0.8rem", backgroundColor: "#2c3034", color: "#9ca3af" }}>
                                                    {bhk}
                                                  </th>
                                                ))}
                                              </React.Fragment>
                                            );
                                          })}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredRows.length > 0 ? filteredRows.map((row, idx) => {
                                          let rowTotal = 0;
                                          return (
                                            <tr key={idx}>
                                              <td className="text-center align-middle">
                                                <input
                                                  type="checkbox"
                                                  className="form-check-input"
                                                  checked={selectedSalesVelocityProjects.has(row.llmName)}
                                                  onChange={() => {
                                                    setSelectedSalesVelocityProjects(prev => {
                                                      const next = new Set(prev);
                                                      if (next.has(row.llmName)) next.delete(row.llmName);
                                                      else next.add(row.llmName);
                                                      return next;
                                                    });
                                                  }}
                                                />
                                              </td>
                                              <td className="text-start fw-bold text-dark px-3">{row.llmName}</td>
                                              <td className="text-start px-3 text-muted">
                                                {row.dbName ? row.dbName : <span className="fst-italic text-danger">No match</span>}
                                              </td>
                                              <td>
                                                {row.matchScore !== null ? (
                                                  <span className={`badge ${row.matchScore >= 80 ? "bg-success" : row.matchScore >= 60 ? "bg-warning text-dark" : "bg-danger"}`}>
                                                    {row.matchScore}%
                                                  </span>
                                                ) : "-"}
                                              </td>
                                              {activeYears.map(year => {
                                                const yearData = row.transactions && row.transactions[year] ? row.transactions[year] : null;
                                                const count = yearData ? yearData.total : null;
                                                if (count) rowTotal += count;

                                                const bhkTypes = activeBhkTypesPerYear[year] || [];

                                                return (
                                                  <React.Fragment key={year}>
                                                    <td className="fw-semibold bg-light bg-opacity-10">{count !== null ? count : "-"}</td>
                                                    {bhkTypes.map(bhk => {
                                                      const bhkCount = yearData?.breakdown?.[bhk];
                                                      return (
                                                        <td key={bhk} className="text-muted" style={{ fontSize: "0.8rem" }}>
                                                          {bhkCount ? bhkCount : "-"}
                                                        </td>
                                                      );
                                                    })}
                                                  </React.Fragment>
                                                );
                                              })}
                                              <td className="fw-bold text-primary bg-light">{rowTotal > 0 ? rowTotal : "-"}</td>
                                            </tr>
                                          );
                                        }) : (() => {
                                          let totalCols = 4 + 1; // Base columns (checkbox + 3) + total
                                          activeYears.forEach(year => {
                                            const bhkTypes = activeBhkTypesPerYear[year] || [];
                                            totalCols += (1 + bhkTypes.length);
                                          });
                                          return (
                                            <tr>
                                              <td colSpan={totalCols} className="text-center py-4 text-muted">
                                                No projects found for this category.
                                              </td>
                                            </tr>
                                          );
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Cash Inflow Simulation */}
                    {activeComparableTab === "Cash Inflow Simulation" && (
                      <div className="h-100 d-flex flex-column" style={{ minHeight:"400px" }}>
                        {!cashInflowSimResult ? (
                          <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-muted">
                            <div className="fs-1 mb-3">💸</div>
                            <h5 className="fw-bold text-secondary">Cash Inflow Simulation</h5>
                            <p className="text-center w-75 mb-4">Predict cash inflow schedule using {selectedSalesVelocityProjects.size} selected comparable projects.</p>
                            {cashInflowSimError && <div className="alert alert-danger w-75 mb-4">{cashInflowSimError}</div>}
                            <button className="btn btn-success btn-lg px-5 rounded-pill shadow-sm fw-bold" onClick={handleRunCashInflowSimulation} disabled={cashInflowSimLoading || selectedSalesVelocityProjects.size === 0}>
                              {cashInflowSimLoading ? <><span className="spinner-border spinner-border-sm me-2" />Simulating...</> : "Run Simulation"}
                            </button>
                            {selectedSalesVelocityProjects.size === 0 && <small className="text-danger mt-2">Select at least one project in the Sales Velocity tab.</small>}
                            
                            <div className="mt-5 w-100 px-4">
                              <button 
                                className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center fw-bold py-2 shadow-sm rounded-3"
                                onClick={() => setIsMetricListV2Open(!isMetricListV2Open)}
                                style={{ background: isMetricListV2Open ? "#f8fafc" : "#fff" }}
                              >
                                <span><i className="bi bi-list-check me-2 text-primary"></i> Metric List V2 (Verification)</span>
                                <span>{isMetricListV2Open ? "▲" : "▼"}</span>
                              </button>
                              
                              {isMetricListV2Open && metricListV2 && (
                                <div className="card card-body bg-light border-0 shadow-sm rounded-4 mt-3 p-4">
                                  <div className="row g-4">
                                    <div className="col-12">
                                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Sales Info (Cash Inflow Payload)</h6>
                                      <table className="table table-sm table-bordered bg-white text-center mb-0" style={{ fontSize: "0.85rem" }}>
                                        <thead className="table-dark">
                                          <tr>
                                            <th>Asset Class</th>
                                            <th>Property Type</th>
                                            <th>Unit Mix</th>
                                            <th>Total Units</th>
                                            <th>Per Unit Cost</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {metricListV2.salesInfo.length > 0 ? metricListV2.salesInfo.map((row, idx) => (
                                            <tr key={idx}>
                                              <td className="text-muted">{row.assetClass}</td>
                                              <td className="text-muted">{row.propertyType}</td>
                                              <td className="fw-semibold text-primary">{row.unitMix}</td>
                                              <td>{row.noOfUnits}</td>
                                              <td>{Number(row.perUnitCost).toLocaleString()} {currency}</td>
                                            </tr>
                                          )) : <tr><td colSpan="5" className="text-muted">No sales info available.</td></tr>}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="col-12">
                                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Selected Sales Velocity Projects (Cash Inflow Payload)</h6>
                                      {selectedSalesVelocityProjects.size > 0 ? (
                                        <div className="d-flex flex-wrap gap-2">
                                          {Array.from(selectedSalesVelocityProjects).map(name => (
                                            <span key={name} className="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2">
                                              {name}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-muted small">No projects selected. The simulation requires at least one project.</div>
                                      )}
                                    </div>

                                    <div className="col-md-6">
                                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Cost Outflow</h6>
                                      <div className="bg-white border rounded p-3 mb-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                                        {metricListV2.cashOutflowRows.length > 0 ? metricListV2.cashOutflowRows.map((row, idx) => (
                                          <div key={idx} className="d-flex justify-content-between small border-bottom py-1">
                                            <span className="text-muted">{row.label}</span>
                                            <span className="fw-semibold">{Number(row.value).toLocaleString()} {currency}</span>
                                          </div>
                                        )) : <span className="small text-muted">No cost data.</span>}
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2 rounded">
                                        <span className="fw-bold small">Total Cost:</span>
                                        <span className="fw-bold">{Number(metricListV2.cashOutflowTotal).toLocaleString()} {currency}</span>
                                      </div>
                                      {metricListV2.constructionTimeline && (
                                        <div className="mt-2 text-muted small">
                                          <i className="bi bi-clock me-1"></i> Project Duration: <strong>{metricListV2.constructionTimeline}</strong>
                                        </div>
                                      )}
                                    </div>

                                    <div className="col-md-6">
                                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Means of Finance</h6>
                                      <div className="bg-white border rounded p-3 mb-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                                        {metricListV2.meansOfFinanceRows.length > 0 ? metricListV2.meansOfFinanceRows.map((row, idx) => (
                                          <div key={idx} className="d-flex justify-content-between small border-bottom py-1">
                                            <span className="text-muted">{row.label} ({row.percentage}%)</span>
                                            <span className="fw-semibold">{Number(row.proposed).toLocaleString()} {currency}</span>
                                          </div>
                                        )) : <span className="small text-muted">No finance data.</span>}
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded">
                                        <span className="fw-bold small">Total Finance ({metricListV2.meansOfFinanceTotalPercentage}%):</span>
                                        <span className="fw-bold">{Number(metricListV2.meansOfFinanceTotals).toLocaleString()} {currency}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                              <h5 className="fw-bold text-dark m-0">Simulation Results</h5>
                              <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => setCashInflowSimResult(null)}>↺ Reset</button>
                            </div>
                            <div className="btn-group w-100 shadow-sm mb-4" role="group">
                              {["Optimistic","Most Probable","Pessimistic","User Cashflow","Raw Output"].map(s => (
                                <button key={s} type="button" className={`btn ${activeInflowScenario===s?"btn-primary fw-bold":"btn-outline-primary"}`} onClick={() => setActiveInflowScenario(s)}>{s}</button>
                              ))}
                            </div>
                            {activeInflowScenario === "Raw Output" && (
                              <div className="bg-dark p-3 rounded" style={{ maxHeight:380, overflowY:"auto" }}>
                                <pre style={{ whiteSpace:"pre-wrap", fontFamily:"monospace", fontSize:"0.85rem", margin:0, color:"#f8f9fa" }}>{cashInflowSimResult}</pre>
                              </div>
                            )}
                            {activeInflowScenario === "User Cashflow" && (
                              <div>
                                <div className="table-responsive bg-white rounded border shadow-sm" style={{ maxHeight:300, overflowY:"auto" }}>
                                  <table className="table table-bordered mb-0 text-center align-middle">
                                    <thead className="table-dark" style={{ position:"sticky", top:0 }}><tr><th>Year</th><th>Sales %</th><th style={{ width:60 }}></th></tr></thead>
                                    <tbody>
                                      {userCashflowRows.map((row, idx) => (
                                        <tr key={idx}>
                                          <td className="fw-semibold">{row.year}</td>
                                          <td><input type="number" className="form-control form-control-sm mx-auto" style={{ width:100 }} placeholder="e.g. 30" min="0" max="100" step="0.01" value={row.percentage} onChange={e => { const u=[...userCashflowRows]; u[idx]={...u[idx],percentage:e.target.value}; setUserCashflowRows(u); }} /></td>
                                          <td>{userCashflowRows.length > 2 && <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => setUserCashflowRows(p=>p.filter((_,i)=>i!==idx))}>✕</button>}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="d-flex justify-content-between mt-2">
                                  <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => setUserCashflowRows(p=>[...p,{year:`Year ${p.length}`,percentage:""}])}>+ Add Year</button>
                                  <button className="btn btn-success fw-bold px-4" onClick={handleApplyUserCashflow}>Apply User Cashflow</button>
                                </div>
                              </div>
                            )}
                            {activeInflowScenario !== "Raw Output" && activeInflowScenario !== "User Cashflow" && (
                              <div>
                                {parsedInflowResult?.[activeInflowScenario]?.length > 0 ? (
                                  <div className="table-responsive bg-white rounded border shadow-sm" style={{ maxHeight:300, overflowY:"auto" }}>
                                    <table className="table align-middle mb-0 text-center">
                                      <thead className="table-dark" style={{ position:"sticky", top:0 }}><tr><th>Year</th><th>Sales %</th></tr></thead>
                                      <tbody>{parsedInflowResult[activeInflowScenario].map((row,i)=><tr key={i}><td className="fw-bold">{row.year}</td><td className="text-primary fw-semibold">{row.percentage}</td></tr>)}</tbody>
                                    </table>
                                  </div>
                                ) : <p className="text-muted text-center py-4">No data parsed. Check Raw Output tab.</p>}
                                <div className="mt-3 text-end">
                                  <button className="btn btn-success fw-bold px-4" onClick={handleApplyInflowScenario} disabled={!parsedInflowResult?.[activeInflowScenario]?.length}>
                                    <i className="bi bi-check2-circle me-2"></i>Apply {activeInflowScenario} Scenario
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeasibilityIrrSection;
