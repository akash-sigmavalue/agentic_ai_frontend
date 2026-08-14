import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaSearch, FaSave, FaChartBar, FaMapMarkerAlt, FaTrashAlt, FaExclamationTriangle, FaCoins, FaBuilding, FaChevronDown, FaChevronUp, FaTimes, FaInfoCircle, FaCheckSquare, FaMoneyBillWave, FaMagic, FaCheckCircle, FaLock, FaChartPie } from "react-icons/fa";
import { apiUrl } from "@/lib/api-client";
import CashflowAnalysis from "./CashflowAnalysis";
import CostOutflowSimulationModal from "./CostOutflowSimulationModal";

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
  const [isCostOutflowModalOpen, setIsCostOutflowModalOpen] = useState(false);
  const [selectedSimMode, setSelectedSimMode] = useState('inflow'); // 'inflow' | 'outflow'
  const [activeScenarioPill, setActiveScenarioPill] = useState(null); // which pill is open
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
    { year: "Year 0", percentage: "0" },
    { year: "Year 1", percentage: "" },
  ]);

  // Metric List V2 State
  const [metricListV2, setMetricListV2] = useState(null);
  const [isMetricListV2Open, setIsMetricListV2Open] = useState(false);

  const handleApplyCostOutflow = useCallback((yearlyPercentages) => {
    let maxYear = 0;
    Object.values(yearlyPercentages).forEach(yearsObj => {
      Object.keys(yearsObj).forEach(y => {
        const yearNum = parseInt(y, 10);
        if (!isNaN(yearNum) && yearNum > maxYear) {
          maxYear = yearNum;
        }
      });
    });

    setFormData(prev => {
      const updated = { ...prev };
      if (!updated[selectedScenario]) updated[selectedScenario] = {};
      Object.entries(yearlyPercentages).forEach(([key, years]) => {
        updated[selectedScenario][key] = { ...years };
      });
      
      setProjectDurations(prevDur => {
        const curDur = prevDur[selectedScenario] || 1;
        const finalDur = Math.max(curDur, maxYear);
        const nextDurs = { ...prevDur, [selectedScenario]: finalDur };
        localStorage.setItem("irrFormV2", JSON.stringify({ 
          projectDurations: nextDurs, 
          formData: updated, 
          timestamp: new Date().toISOString(), 
          source: "costOutflowSimulation" 
        }));
        return nextDurs;
      });

      return updated;
    });
  }, [selectedScenario]);

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

  const handleApplyInflowScenario = (scenarioOverride) => {
    const scenario = typeof scenarioOverride === "string" ? scenarioOverride : activeInflowScenario;
    if (!parsedInflowResult?.[scenario]?.length) return;
    let maxY = 1; const cf = {};
    parsedInflowResult[scenario].forEach(row => {
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-3 border-bottom d-none">
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
          
          {/* Predict Toggle + Simulate — centered */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px', marginBottom: '8px' }}>

            {/* Toggle buttons — select mode */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px', gap: '4px' }}>
              {[
                { mode: 'inflow',  label: 'Predict Sales Cash Inflow',  icon: <FaSearch size={13} /> },
                { mode: 'outflow', label: 'Predict Cost Cash Outflow', icon: <FaChartBar size={13} /> },
              ].map(({ mode, label, icon }) => {
                const active = selectedSimMode === mode;
                const tealActive   = active && mode === 'inflow';
                const purpleActive = active && mode === 'outflow';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedSimMode(mode)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '8px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: active ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      background: tealActive
                        ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                        : purpleActive
                          ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                          : 'transparent',
                      color: active ? '#fff' : '#64748b',
                      boxShadow: active ? '0 3px 10px rgba(0,0,0,0.18)' : 'none',
                    }}
                  >
                    {icon} {label}
                  </button>
                );
              })}
            </div>

            {/* Simulate button */}
            <button
              type="button"
              onClick={() => {
                if (selectedSimMode === 'inflow') {
                  setIsComparableModalOpen(true);
                  setComparableResult(null);
                  setComparableError(null);
                } else {
                  setIsCostOutflowModalOpen(true);
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '9px 32px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: selectedSimMode === 'inflow'
                  ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                color: '#fff',
                boxShadow: selectedSimMode === 'inflow'
                  ? '0 4px 14px rgba(13,148,136,0.35)'
                  : '0 4px 14px rgba(124,58,237,0.35)',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1'; }}
            >
              {selectedSimMode === 'inflow' ? <FaSearch size={14} /> : <FaChartBar size={14} />}
              Simulate
            </button>

            {/* Sub-scenario pills — clickable, mode-reactive */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {(selectedSimMode === 'inflow' ? ['Optimistic', 'Most Probable', 'Pessimistic', 'User Cashflow'] : []).map(s => {
                const isInflow = selectedSimMode === 'inflow';
                const hasData = isInflow
                  ? (s === 'User Cashflow' ? true : parsedInflowResult?.[s]?.length > 0)
                  : false;
                const isOpen = activeScenarioPill === s;

                const accentColor  = isInflow ? '#0d9488' : '#7c3aed';
                const accentBg     = isInflow ? 'rgba(13,148,136,0.10)' : 'rgba(124,58,237,0.10)';
                const accentBorder = isInflow ? 'rgba(13,148,136,0.35)' : 'rgba(124,58,237,0.35)';

                return (
                  <span
                    key={s}
                    onClick={() => {
                      if (!hasData && s !== 'User Cashflow') {
                        setActiveScenarioPill(`__hint_${s}`);
                        setTimeout(() => setActiveScenarioPill(prev => prev === `__hint_${s}` ? null : prev), 3000);
                      } else {
                        setActiveScenarioPill(isOpen ? null : s);
                      }
                    }}
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '3px 12px',
                      borderRadius: '999px',
                      background: isOpen ? accentColor : hasData ? accentBg : '#f1f5f9',
                      color: isOpen ? '#fff' : hasData ? accentColor : '#94a3b8',
                      border: `1px solid ${isOpen ? accentColor : hasData ? accentBorder : '#e2e8f0'}`,
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.25s ease',
                      boxShadow: isOpen ? `0 2px 8px ${accentBorder}` : 'none',
                    }}
                  >
                    {s === 'User Cashflow' ? '✏️' : (hasData && !isOpen) ? '✓' : isOpen ? '▾' : '○'} {s}
                  </span>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ── Hint toast — fixed bottom-center, auto-dismisses ── */}
      {activeScenarioPill?.startsWith('__hint_') && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#1e293b', color: '#fef9c3',
          borderRadius: '12px', padding: '12px 20px',
          fontSize: '13px', fontWeight: 500,
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          ⚠️ Run <strong style={{ color: '#fff' }}>Simulate</strong> first, then click this scenario.
        </div>
      )}

      {/* ── Scenario result popup — fixed, viewport-centered ── */}
      {activeScenarioPill && !activeScenarioPill.startsWith('__hint_') && (() => {
        const isInflow    = selectedSimMode === 'inflow';
        const accentColor  = isInflow ? '#0d9488' : '#7c3aed';
        const accentLight  = isInflow ? 'rgba(13,148,136,0.08)' : 'rgba(124,58,237,0.08)';
        const accentBorder = isInflow ? 'rgba(13,148,136,0.25)' : 'rgba(124,58,237,0.25)';
        const inflowRows   = isInflow && activeScenarioPill !== 'User Cashflow'
          ? (parsedInflowResult?.[activeScenarioPill] || [])
          : [];

        return typeof window !== 'undefined' ? createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setActiveScenarioPill(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9000,
                background: 'rgba(15,23,42,0.45)',
                backdropFilter: 'blur(3px)',
                animation: 'fadeIn 0.15s ease',
              }}
            />

            {/* Modal card */}
            <div style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9001,
              width: '90%', maxWidth: 480,
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              overflow: 'hidden',
              animation: 'slideUp 0.22s ease',
            }}>
              {/* Coloured header bar */}
              <div style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, ${isInflow ? '#0f766e' : '#5b21b6'} 100%)`,
                padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                  {isInflow ? '📈' : '📉'} {activeScenarioPill} Scenario
                  <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '11px', opacity: 0.8 }}>
                    {isInflow ? 'Sales Cash Inflow' : 'Cost Cash Outflow'}
                  </span>
                </span>
                <button
                  onClick={() => setActiveScenarioPill(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                    color: '#fff', cursor: 'pointer', fontSize: '16px',
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, fontWeight: 700,
                  }}
                >×</button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>

                {/* Inflow AI scenario table */}
                {isInflow && activeScenarioPill !== 'User Cashflow' && (
                  inflowRows.length > 0 ? (
                    <>
                      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${accentBorder}`, marginBottom: 16 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: accentLight }}>
                              <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: accentColor, borderBottom: `1px solid ${accentBorder}` }}>Year</th>
                              <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: accentColor, borderBottom: `1px solid ${accentBorder}` }}>Sales %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inflowRows.map((row, i) => (
                              <tr key={i} style={{ borderBottom: `1px solid ${accentBorder}`, background: i % 2 === 0 ? '#fff' : accentLight }}>
                                <td style={{ padding: '7px 14px', fontWeight: 600, color: '#334155' }}>{row.year}</td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', color: accentColor, fontWeight: 700 }}>{row.percentage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { handleApplyInflowScenario(activeScenarioPill); setActiveScenarioPill(null); }}
                          style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, ${isInflow ? '#0f766e' : '#5b21b6'} 100%)`,
                            color: '#fff', border: 'none', borderRadius: '10px',
                            padding: '9px 24px', fontWeight: 700, fontSize: '13px',
                            cursor: 'pointer', boxShadow: `0 4px 14px ${accentBorder}`,
                            transition: 'all 0.2s',
                          }}
                        >
                          ✓ Apply {activeScenarioPill}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
                      <p style={{ margin: 0, fontSize: '13px' }}>No data yet. Click <strong>Simulate</strong> to generate this scenario.</p>
                    </div>
                  )
                )}

                {/* User Cashflow manual entry */}
                {activeScenarioPill === 'User Cashflow' && isInflow && (
                  <div>
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${accentBorder}`, marginBottom: 16 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: accentLight }}>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: accentColor, borderBottom: `1px solid ${accentBorder}` }}>Year</th>
                            <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: accentColor, borderBottom: `1px solid ${accentBorder}` }}>Sales %</th>
                            <th style={{ padding: '8px 8px', width: 36, borderBottom: `1px solid ${accentBorder}` }} />
                          </tr>
                        </thead>
                        <tbody>
                          {userCashflowRows.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${accentBorder}`, background: idx % 2 === 0 ? '#fff' : accentLight }}>
                              <td style={{ padding: '6px 14px', fontWeight: 600, color: '#334155' }}>{row.year}</td>
                              <td style={{ padding: '5px 14px', textAlign: 'right' }}>
                                <input
                                  type="number" min="0" max="100" step="0.01"
                                  placeholder="e.g. 30"
                                  value={row.percentage}
                                  onChange={e => { const u = [...userCashflowRows]; u[idx] = { ...u[idx], percentage: e.target.value }; setUserCashflowRows(u); }}
                                  style={{ width: 72, textAlign: 'right', border: `1.5px solid ${accentBorder}`, borderRadius: 7, padding: '4px 7px', fontSize: 12, outline: 'none', color: accentColor, fontWeight: 600 }}
                                />
                              </td>
                              <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                {userCashflowRows.length > 2 && (
                                  <button onClick={() => setUserCashflowRows(p => p.filter((_, i) => i !== idx))}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => setUserCashflowRows(p => {
                          const lastMatch = p.length > 0 ? p[p.length - 1].year.match(/\d+/) : null;
                          const nextNum = lastMatch ? parseInt(lastMatch[0], 10) + 1 : p.length;
                          return [...p, { year: `Year ${nextNum}`, percentage: '' }];
                        })}
                        style={{ background: 'none', border: `1.5px solid ${accentBorder}`, borderRadius: 8, padding: '6px 14px', color: accentColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >+ Add Year</button>
                      <button
                        onClick={() => { handleApplyUserCashflow(); setActiveScenarioPill(null); }}
                        style={{
                          background: `linear-gradient(135deg, ${accentColor} 0%, ${isInflow ? '#0f766e' : '#5b21b6'} 100%)`,
                          color: '#fff', border: 'none', borderRadius: 10,
                          padding: '9px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                        }}
                      >✓ Apply User Cashflow</button>
                    </div>
                  </div>
                )}

                {/* Outflow placeholder */}
                {!isInflow && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
                    <p style={{ margin: 0, fontSize: '13px' }}>Outflow sub-scenarios will be wired in the next phase.</p>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        ) : null;
      })()}

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
                      <div className="fw-bold">
                        {row.label}
                        {row.key === "sales_cash_inflow" && (
                          <FaInfoCircle title="Year 0 usually does not have any sales" className="ms-1 text-muted" size={12} />
                        )}
                      </div>
                      <div className="text-muted" style={{fontSize:"10px"}}>{currency} {formatCurrency(row.totalAmount)}</div>
                    </td>
                    {years.map(y => {
                      const pct = rowData[y] || 0;
                      const val = (pct / 100) * row.totalAmount;
                      const isSalesInflowYear0 = row.key === "sales_cash_inflow" && y === 0;
                      return (
                        <td key={y} className="text-center p-2">
                          <div className="d-flex flex-column align-items-center gap-1">
                            <div className="input-group input-group-sm" style={{ width: "85px" }}>
                              <input type="number" className="form-control" style={{fontSize:"10px", padding:"2px 4px", textAlign:"right"}} value={pct ? Math.round(pct * 100) / 100 : ""} onChange={e => handleDataEntry(row.key, y, "percent", e.target.value)} placeholder="0" min="0" max="100" step="0.01" disabled={row.totalAmount === 0 || isSalesInflowYear0} />
                              <span className="input-group-text" style={{fontSize:"9px", padding:"2px 4px"}}>%</span>
                            </div>
                            <div className="input-group input-group-sm" style={{ width: "85px" }}>
                              <span className="input-group-text" style={{fontSize:"9px", padding:"2px 4px"}}>{currency}</span>
                              <input type="number" className="form-control" style={{fontSize:"10px", padding:"2px 4px", textAlign:"right"}} value={val ? Math.round(val * 100) / 100 : ""} onChange={e => handleDataEntry(row.key, y, "value", e.target.value)} placeholder="0" step="0.01" disabled={row.totalAmount === 0 || isSalesInflowYear0} />
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
      {isComparableModalOpen && typeof window !== 'undefined' && createPortal(
        <div className="bootstrap-scope">
          <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2147483647 }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2" style={{ color: '#1e293b', fontSize: '1.4rem' }}><FaChartPie className="text-primary" /> Project Analysis</h5>
                <button type="button" className="btn-close shadow-none" aria-label="Close" onClick={() => setIsComparableModalOpen(false)} disabled={comparableLoading} />
              </div>
              <div className="modal-body pt-3 pb-4 px-4">
                <div className="row h-100">
                  {/* Sidebar */}
                  <div className="col-md-3 border-end pe-4" style={{ borderColor: '#e2e8f0' }}>
                    <div className="nav flex-column gap-2 mt-2" role="tablist">
                      {["Comparable projects", "Sales velocity", "Cash Inflow Simulation"].map(tab => {
                        const disabled = tab === "Cash Inflow Simulation" && !salesVelocityData;
                        const active = activeComparableTab === tab;
                        return (
                          <button key={tab} type="button" className={`btn text-start fw-semibold py-3 px-4 rounded-4 shadow-sm border-0 d-flex justify-content-between align-items-center w-100`}
                            onClick={() => !disabled && setActiveComparableTab(tab)} disabled={disabled}
                            style={{ 
                              background: active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                              color: active ? '#fff' : '#475569',
                              transition: 'all 0.2s',
                              opacity: disabled ? 0.6 : 1,
                              cursor: disabled ? "not-allowed" : "pointer"
                            }}>
                            {tab}
                            {disabled && <FaLock className="text-slate-400 opacity-50" />}
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
                        <div className="mb-4 d-flex flex-column gap-2">
                          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Searches for real estate projects near your coordinates within the specified radius.</p>
                        </div>
                        {(() => {
                          const lf = JSON.parse(typeof window !== "undefined" ? localStorage.getItem("Land Identification") || "{}" : "{}");
                          const lat = parseFloat(lf.polygonCenterLat || lf.latitude);
                          const lng = parseFloat(lf.polygonCenterLng || lf.longitude);
                          return lat && lng && !isNaN(lat) && !isNaN(lng)
                            ? (<div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-4 shadow-sm" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))', border: '1px solid rgba(226,232,240,0.8)', backdropFilter: 'blur(10px)' }}>
                                <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                                  <FaMapMarkerAlt className="text-primary" />
                                  <span className="text-secondary small fw-medium">Lat:</span>
                                  <strong className="text-dark">{lat}</strong>
                                </div>
                                <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                                  <FaMapMarkerAlt className="text-primary" />
                                  <span className="text-secondary small fw-medium">Lng:</span>
                                  <strong className="text-dark">{lng}</strong>
                                </div>
                              </div>)
                            : <div className="alert border-0 shadow-sm rounded-4 mb-4 d-flex align-items-center gap-3 px-4 py-3" style={{ background: 'linear-gradient(to right, #fffbeb, #fef3c7)', color: '#92400e' }}>
                                <FaExclamationTriangle size={20} className="text-warning" />
                                <span className="fw-medium">No coordinates found. Please save a polygon or enter coordinates in Land Identification first.</span>
                              </div>;
                        })()}

                        <div className="d-flex justify-content-end mb-4 align-items-center gap-3 flex-wrap p-3 rounded-4 shadow-sm" style={{ backgroundColor: 'rgba(248,250,252,0.6)', border: '1px solid #e2e8f0' }}>
                          {comparableProjects && comparableProjects.length === 0 && (
                            <div className="d-flex align-items-center gap-2 text-danger fw-semibold small bg-danger bg-opacity-10 px-3 py-2 rounded-pill border border-danger border-opacity-25 shadow-sm">
                              <FaExclamationTriangle /> No projects found. Increase the area.
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-2">
                            <label className="small text-muted fw-semibold mb-0">Radius:</label>
                            <select className="form-select form-select-sm rounded-pill shadow-sm border-0 px-3" style={{ width: "90px", backgroundColor: '#fff', fontWeight: '600' }} value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} disabled={comparableLoading}>
                              {[1,2,3,4,5].map(r => <option key={r} value={r}>{r} km</option>)}
                            </select>
                          </div>
                          
                          <button type="button" className="btn rounded-pill px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2" 
                            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', border: 'none', transition: 'all 0.2s', minWidth: 160 }} 
                            onClick={handleFindComparables} disabled={comparableLoading}>
                            {comparableLoading ? <><span className="spinner-border spinner-border-sm" /> Searching…</> : <><FaSearch /> Find Comparables</>}
                          </button>
                          
                          <div className="vr d-none d-md-block mx-1" style={{ opacity: 0.15 }}></div>
                          
                          <button type="button" className="btn btn-light btn-sm rounded-pill shadow-sm d-inline-flex align-items-center gap-2 fw-semibold border px-3"
                            style={{ color: '#059669', transition: 'all 0.2s' }}
                            onClick={() => { if (comparableProjects) localStorage.setItem("cache_comparableProjects", JSON.stringify(comparableProjects)); if (comparableProviderStats) localStorage.setItem("cache_comparableProviderStats", JSON.stringify(comparableProviderStats)); if (comparableResult) localStorage.setItem("cache_comparableResult", JSON.stringify(comparableResult)); alert("Saved to cache."); }}
                            disabled={!comparableProjects}>
                            <FaSave /> Save
                          </button>
                          <button type="button" className="btn btn-light btn-sm rounded-pill shadow-sm d-inline-flex align-items-center gap-2 fw-semibold border px-3"
                            style={{ color: '#dc2626', transition: 'all 0.2s' }}
                            onClick={() => { localStorage.removeItem("cache_comparableProjects"); localStorage.removeItem("cache_comparableProviderStats"); localStorage.removeItem("cache_comparableResult"); setComparableProjects(null); setComparableProviderStats(null); setComparableResult(null); }}>
                            <FaTrashAlt /> Clear
                          </button>
                        </div>

                        {comparableError && <div className="alert alert-danger rounded-4 shadow-sm border-0 d-flex align-items-center gap-2"><FaExclamationTriangle /> {comparableError}</div>}

                        {(comparableResult || comparableProjects) && (
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                              <div className="d-flex align-items-center gap-2">
                                <h6 className="fw-bold text-slate-800 mb-0" style={{ fontSize: '1.1rem', color: '#1e293b' }}>Comparable Projects</h6>
                                <span className="badge bg-indigo-50 text-indigo-700 px-2 py-1 rounded-pill fw-medium border" style={{ fontSize: "0.7rem", backgroundColor: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' }}>Web Search + Maps API</span>
                              </div>
                              {comparableProjects?.length > 0 && (
                                <div className="d-flex p-1 rounded-pill bg-light border shadow-sm" style={{ gap: '4px' }}>
                                  {[["under_construction","Under Construction"],["other","Other Projects"]].map(([val,lbl]) => (
                                    <button 
                                      key={val}
                                      className={`btn btn-sm rounded-pill px-3 fw-semibold border-0 d-inline-flex align-items-center gap-2 ${activeProjectTab === val ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                                      style={{ transition: 'all 0.2s' }}
                                      onClick={() => setActiveProjectTab(val)}
                                    >
                                      <FaBuilding /> {lbl}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {comparableProjects?.length > 0 ? (() => {
                              const filtered = comparableProjects.filter(p => activeProjectTab === "under_construction" ? p.status?.toLowerCase().includes("under construction") : !p.status?.toLowerCase().includes("under construction"));
                              return (
                                <div className="table-responsive rounded-4 shadow-sm" style={{ maxHeight: 380, overflowY: "auto", border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                                  <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                                    <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(8px)', borderBottom: '2px solid #e2e8f0' }}>
                                      <tr>{["#","Project Name","Status","BHK","Location","Possession","Coordinates"].map(h => <th key={h} className="px-4 py-3 text-slate-600" style={{ fontWeight:700, whiteSpace:"nowrap", color: '#475569', letterSpacing: '0.3px', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                      {filtered.length > 0 ? filtered.map((p, i) => (
                                        <tr key={i} style={{ transition: 'background-color 0.2s' }}>
                                          <td className="px-4 py-3 text-muted fw-medium">{i+1}</td>
                                          <td className="px-4 py-3 fw-bold" style={{ color: '#1e293b' }}>{p.projectName||"—"}</td>
                                          <td className="px-4 py-3">
                                            <span className="badge rounded-pill fw-medium px-3 py-1" style={{ 
                                              backgroundColor: p.status?.toLowerCase().includes("under construction") ? '#e0f2fe' : '#f1f5f9',
                                              color: p.status?.toLowerCase().includes("under construction") ? '#0369a1' : '#475569',
                                              border: `1px solid ${p.status?.toLowerCase().includes("under construction") ? '#bae6fd' : '#e2e8f0'}`
                                            }}>{p.status||"Unknown"}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="badge rounded-pill fw-semibold px-2 py-1" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>{p.bhkType||"—"}</span>
                                          </td>
                                          <td className="px-4 py-3 text-slate-700 fw-medium" style={{ color: '#334155' }}>{p.location||"—"}</td>
                                          <td className="px-4 py-3">
                                            <span className="badge rounded-pill fw-medium px-3 py-1" style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>{p.expectedPossessionDate||"N/A"}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            {p.coordinates && !p.coordinates.includes("not configured") ? 
                                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.coordinates)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                                                <div className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}>
                                                  <FaMapMarkerAlt size={10} /> {p.coordinates}
                                                </div>
                                              </a> : 
                                              <span className="text-muted">—</span>}
                                          </td>
                                        </tr>
                                      )) : <tr><td colSpan="7" className="text-center py-5 text-muted fw-medium">No projects in this category.</td></tr>}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })() : comparableResult ? (
                              <div className="p-4 rounded-4 shadow-sm" style={{ background:"linear-gradient(145deg, #1e293b, #0f172a)", color:"#f8fafc", fontSize:"0.95rem", lineHeight:"1.8", maxHeight:380, overflowY:"auto", border: '1px solid #334155' }}
                                dangerouslySetInnerHTML={{ __html: comparableResult.replace(/\*\*(.+?)\*\*/g,"<strong style='color:#38bdf8'>$1</strong>").replace(/\n/g,"<br/>") }} />
                            ) : null}

                            {comparableTokenUsage && (
                              <div className="mt-4">
                                <button className="btn btn-sm rounded-pill px-4 py-2 d-inline-flex align-items-center fw-medium border-0 shadow-sm" 
                                  onClick={() => setIsComparableLedgerOpen(!isComparableLedgerOpen)} 
                                  style={{ fontSize:"0.85rem", backgroundColor: '#f8fafc', color: '#475569', transition: 'all 0.2s', border: '1px solid #e2e8f0' }}>
                                  <FaCoins className="me-2 text-warning" /> Token Ledger 
                                  <span className="ms-2" style={{ transform: isComparableLedgerOpen ? "rotate(180deg)" : "none", transition: "transform 0.3s ease", display: 'inline-flex' }}>
                                    <FaChevronDown size={10} />
                                  </span>
                                </button>
                                <div style={{ maxHeight: isComparableLedgerOpen ? "250px" : "0", overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)", opacity: isComparableLedgerOpen ? 1 : 0 }}>
                                  <div className="card card-body border-0 shadow-sm rounded-4 mt-3 p-4" style={{ background: 'linear-gradient(to right bottom, rgba(255,255,255,0.9), rgba(248,250,252,0.9))', backdropFilter: 'blur(10px)', border: '1px solid rgba(226,232,240,0.8)' }}>
                                    <div className="d-flex gap-3 flex-wrap">
                                      {[["Prompt", comparableTokenUsage.input_tokens||0, '#3b82f6', '#eff6ff'], 
                                        ["Completion", comparableTokenUsage.output_tokens||0, '#10b981', '#ecfdf5'], 
                                        ["Total", comparableTokenUsage.total_tokens||0, '#6366f1', '#e0e7ff']].map(([l, v, c, bg])=>(
                                        <div key={l} className="d-flex flex-column align-items-center justify-content-center rounded-4 p-3 shadow-sm flex-grow-1" style={{ backgroundColor: '#fff', border: `1px solid ${bg}` }}>
                                          <span className="fw-bold mb-1" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: '0.5px', color: '#64748b' }}>{l}</span>
                                          <span className="fw-bolder fs-4" style={{ color: c }}>{v.toLocaleString()}</span>
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
                          <div className="d-flex flex-column align-items-center justify-content-center text-muted bg-light rounded-4 border shadow-sm p-5" style={{ minHeight:"300px" }}>
                            <FaChartBar className="text-secondary opacity-50 mb-3" size={48} />
                            <h5 className="fw-bold text-slate-700">Complete Comparable Search First</h5>
                            <p className="text-center w-75 mb-0">Run the Comparable Projects search to enable Sales Velocity analysis.</p>
                          </div>
                        ) : (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-4 px-1">
                              <h6 className="fw-bold text-slate-800 m-0" style={{ fontSize: '1.1rem', color: '#1e293b' }}>Sales Velocity Analysis</h6>
                              <div className="d-flex align-items-center gap-3">
                                <button type="button" className="btn rounded-pill px-4 fw-bold shadow-sm d-inline-flex align-items-center gap-2" 
                                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', border: 'none', transition: 'all 0.2s', minWidth: 160 }} 
                                  onClick={handleFetchSalesVelocity} disabled={salesVelocityLoading}>
                                  {salesVelocityLoading ? <><span className="spinner-border spinner-border-sm" /> Fetching...</> : <><FaChartBar /> Fetch Velocity</>}
                                </button>
                                
                                <div className="vr d-none d-md-block mx-1" style={{ opacity: 0.15 }}></div>

                                <button className="btn btn-light btn-sm rounded-pill shadow-sm d-inline-flex align-items-center gap-2 fw-semibold border px-3" 
                                  style={{ color: '#059669', transition: 'all 0.2s' }}
                                  onClick={() => { if (salesVelocityData) { localStorage.setItem("cache_salesVelocityData", JSON.stringify(salesVelocityData)); alert("Saved."); }}} disabled={!salesVelocityData}>
                                  <FaSave /> Save
                                </button>
                                <button className="btn btn-light btn-sm rounded-pill shadow-sm d-inline-flex align-items-center gap-2 fw-semibold border px-3" 
                                  style={{ color: '#dc2626', transition: 'all 0.2s' }}
                                  onClick={() => { localStorage.removeItem("cache_salesVelocityData"); setSalesVelocityData(null); }}>
                                  <FaTrashAlt /> Clear
                                </button>
                              </div>
                            </div>
                            {salesVelocityError && <div className="alert alert-danger rounded-4 shadow-sm border-0 d-flex align-items-center gap-2"><FaExclamationTriangle /> {salesVelocityError}</div>}
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
                                  <div className="d-flex align-items-center justify-content-between mb-4 px-1">
                                    <div className="d-flex flex-column gap-2">
                                      <span className="text-muted fw-semibold" style={{ fontSize: "0.85rem" }}>
                                        Showing <strong className="text-dark">{filteredRows.length}</strong> of {allRows.length} projects
                                      </span>
                                      <div className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 600 }}>
                                        <FaInfoCircle /> Please select/deselect the projects based on your requirement for future process.
                                      </div>
                                    </div>
                                    <div className="d-flex p-1 rounded-pill bg-light border shadow-sm" style={{ gap: '4px' }}>
                                      <button
                                        className={`btn btn-sm rounded-pill px-3 fw-semibold border-0 d-inline-flex align-items-center gap-2 ${activeSalesTab === "upcoming" ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                                        style={{ transition: 'all 0.2s' }}
                                        onClick={() => setActiveSalesTab("upcoming")}
                                      >
                                        <FaBuilding /> Upcoming Projects
                                      </button>
                                      <button
                                        className={`btn btn-sm rounded-pill px-3 fw-semibold border-0 d-inline-flex align-items-center gap-2 ${activeSalesTab === "other" ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                                        style={{ transition: 'all 0.2s' }}
                                        onClick={() => setActiveSalesTab("other")}
                                      >
                                        <FaBuilding /> Other Projects
                                      </button>
                                    </div>
                                  </div>
                                  <div className="table-responsive rounded-4 shadow-sm" style={{ maxHeight:380, overflowY:"auto", border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                                    <table className="table table-hover table-bordered align-middle mb-0 text-center" style={{ fontSize: "0.85rem", borderColor: '#e2e8f0' }}>
                                      <thead style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <tr>
                                          <th rowSpan={2} className="py-3 px-2 align-middle text-center bg-white" style={{ width: "40px", borderBottom: '2px solid #cbd5e1' }}>
                                            <FaCheckSquare className="text-slate-400" size={16} />
                                          </th>
                                          <th rowSpan={2} className="text-start py-3 px-3 align-middle text-slate-600 bg-white" style={{ fontWeight:700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.3px', color: '#475569' }}>Project Name</th>
                                          <th rowSpan={2} className="text-start py-3 px-3 align-middle text-slate-600 bg-white" style={{ fontWeight:700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.3px', color: '#475569' }}>DB Match</th>
                                          <th rowSpan={2} className="py-3 px-2 align-middle text-slate-600 bg-white" style={{ fontWeight:700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.3px', color: '#475569', borderRight: '2px solid #cbd5e1' }}>Score</th>
                                          {activeYears.map(year => {
                                            const bhkTypes = activeBhkTypesPerYear[year] || [];
                                            return (
                                              <th key={year} colSpan={1 + bhkTypes.length} className="py-2 px-2 text-slate-700" style={{ fontWeight:700, backgroundColor: '#f1f5f9', color: '#334155', borderBottom: '1px solid #e2e8f0', borderRight: '2px solid #cbd5e1' }}>
                                                {year}
                                              </th>
                                            );
                                          })}
                                          <th rowSpan={2} className="py-3 px-3 align-middle text-slate-700" style={{ fontWeight:700, borderBottom: '2px solid #cbd5e1', backgroundColor: '#e2e8f0', color: '#334155', textTransform: 'uppercase', fontSize: '0.75rem' }}>Total</th>
                                        </tr>
                                        <tr>
                                          {activeYears.map(year => {
                                            const bhkTypes = activeBhkTypesPerYear[year] || [];
                                            return (
                                              <React.Fragment key={`sub-${year}`}>
                                                <th className="py-2 px-2" style={{ fontSize: "0.75rem", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 700, borderBottom: '2px solid #cbd5e1' }}>Total</th>
                                                {bhkTypes.map((bhk, index) => (
                                                  <th key={bhk} className="py-2 px-2" style={{ fontSize: "0.75rem", backgroundColor: "#ffffff", color: "#64748b", fontWeight: 600, borderBottom: '2px solid #cbd5e1', borderRight: index === bhkTypes.length - 1 ? '2px solid #cbd5e1' : undefined }}>
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
                                            <tr key={idx} style={{ transition: 'background-color 0.2s', backgroundColor: selectedSalesVelocityProjects.has(row.llmName) ? '#f0fdf4' : 'transparent', cursor: 'pointer' }} onClick={() => {
                                              setSelectedSalesVelocityProjects(prev => {
                                                const next = new Set(prev);
                                                if (next.has(row.llmName)) next.delete(row.llmName);
                                                else next.add(row.llmName);
                                                return next;
                                              });
                                            }}>
                                              <td className="text-center align-middle bg-transparent">
                                                <input
                                                  type="checkbox"
                                                  className="form-check-input shadow-sm"
                                                  style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                                  checked={selectedSalesVelocityProjects.has(row.llmName)}
                                                  onChange={() => {}} // Handled by tr onClick
                                                />
                                              </td>
                                              <td className="text-start fw-bold px-3 bg-transparent" style={{ color: '#1e293b' }}>{row.llmName}</td>
                                              <td className="text-start px-3 text-muted fw-medium bg-transparent" style={{ fontSize: '0.8rem' }}>
                                                {row.dbName ? row.dbName : <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1" style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>No match</span>}
                                              </td>
                                              <td className="bg-transparent" style={{ borderRight: '2px solid #cbd5e1' }}>
                                                {row.matchScore !== null ? (
                                                  <span className="badge rounded-pill fw-bold px-2 py-1" style={{ 
                                                    backgroundColor: row.matchScore >= 80 ? '#dcfce7' : row.matchScore >= 60 ? '#fef3c7' : '#fee2e2',
                                                    color: row.matchScore >= 80 ? '#166534' : row.matchScore >= 60 ? '#b45309' : '#991b1b',
                                                    border: `1px solid ${row.matchScore >= 80 ? '#bbf7d0' : row.matchScore >= 60 ? '#fde68a' : '#fecaca'}`
                                                  }}>
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
                                                    <td className="fw-bold" style={{ color: '#334155', backgroundColor: selectedSalesVelocityProjects.has(row.llmName) ? 'transparent' : 'rgba(241, 245, 249, 0.4)' }}>{count !== null ? count : "-"}</td>
                                                    {bhkTypes.map((bhk, index) => {
                                                      const bhkCount = yearData?.breakdown?.[bhk];
                                                      return (
                                                        <td key={bhk} className="fw-medium bg-transparent" style={{ fontSize: "0.8rem", color: '#64748b', borderRight: index === bhkTypes.length - 1 ? '2px solid #cbd5e1' : undefined }}>
                                                          {bhkCount ? bhkCount : "-"}
                                                        </td>
                                                      );
                                                    })}
                                                  </React.Fragment>
                                                );
                                              })}
                                              <td className="fw-bold" style={{ color: '#4338ca', backgroundColor: selectedSalesVelocityProjects.has(row.llmName) ? 'transparent' : '#e0e7ff', borderLeft: '1px solid #c7d2fe' }}>{rowTotal > 0 ? rowTotal : "-"}</td>
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
                          <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-muted bg-light rounded-4 border shadow-sm p-5">
                            <FaMoneyBillWave className="text-success opacity-50 mb-3" size={48} />
                            <h5 className="fw-bold text-slate-700">Cash Inflow Simulation</h5>
                            <p className="text-center w-75 mb-4">Predict cash inflow schedule using <strong className="text-dark">{selectedSalesVelocityProjects.size}</strong> selected comparable projects.</p>
                            {cashInflowSimError && <div className="alert alert-danger rounded-4 shadow-sm border-0 d-flex align-items-center gap-2 mb-4 w-75"><FaExclamationTriangle /> {cashInflowSimError}</div>}
                            <button className="btn rounded-pill px-5 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2" 
                              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', transition: 'all 0.2s', fontSize: '1.05rem' }} 
                              onClick={handleRunCashInflowSimulation} disabled={cashInflowSimLoading || selectedSalesVelocityProjects.size === 0}>
                              {cashInflowSimLoading ? <><span className="spinner-border spinner-border-sm" /> Simulating...</> : <><FaMagic /> Run Simulation</>}
                            </button>
                            {selectedSalesVelocityProjects.size === 0 && <small className="d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 mt-3" style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600 }}><FaExclamationTriangle size={12} /> Select at least one project in the Sales Velocity tab.</small>}
                            
                            <div className="mt-5 w-100 px-4">
                              <button 
                                className="btn w-100 d-flex justify-content-between align-items-center fw-semibold py-3 shadow-sm rounded-4 border"
                                onClick={() => setIsMetricListV2Open(!isMetricListV2Open)}
                                style={{ background: isMetricListV2Open ? "#f8fafc" : "#fff", color: '#334155', transition: 'all 0.2s' }}
                              >
                                <span className="d-flex align-items-center gap-2"><FaCheckSquare className="text-primary" /> Metric List V2 (Verification)</span>
                                <span style={{ transform: isMetricListV2Open ? "rotate(180deg)" : "none", transition: "transform 0.3s ease", display: 'inline-flex' }}>
                                  <FaChevronDown className="text-slate-400" />
                                </span>
                              </button>
                              
                              {isMetricListV2Open && metricListV2 && (
                                <div className="card card-body border-0 shadow-sm rounded-4 mt-3 p-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                  <div className="row g-4">
                                    <div className="col-12">
                                      <h6 className="fw-bold text-slate-700 border-bottom pb-2 mb-3" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>Sales Info (Cash Inflow Payload)</h6>
                                      <div className="table-responsive rounded-3 border shadow-sm">
                                        <table className="table table-sm table-bordered bg-white text-center mb-0 align-middle" style={{ fontSize: "0.85rem", borderColor: '#e2e8f0' }}>
                                          <thead style={{ backgroundColor: '#f1f5f9' }}>
                                            <tr>
                                              <th className="py-2 text-slate-600" style={{ fontWeight: 600 }}>Asset Class</th>
                                              <th className="py-2 text-slate-600" style={{ fontWeight: 600 }}>Property Type</th>
                                              <th className="py-2 text-slate-600" style={{ fontWeight: 600 }}>Unit Mix</th>
                                              <th className="py-2 text-slate-600" style={{ fontWeight: 600 }}>Total Units</th>
                                              <th className="py-2 text-slate-600" style={{ fontWeight: 600 }}>Per Unit Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {metricListV2.salesInfo.length > 0 ? metricListV2.salesInfo.map((row, idx) => (
                                              <tr key={idx}>
                                                <td className="text-muted fw-medium">{row.assetClass}</td>
                                                <td className="text-muted fw-medium">{row.propertyType}</td>
                                                <td className="fw-bold text-primary">{row.unitMix}</td>
                                                <td className="fw-semibold text-dark">{row.noOfUnits}</td>
                                                <td className="fw-semibold" style={{ color: '#059669' }}>{Number(row.perUnitCost).toLocaleString()} {currency}</td>
                                              </tr>
                                            )) : <tr><td colSpan="5" className="text-muted py-3">No sales info available.</td></tr>}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    <div className="col-12">
                                      <h6 className="fw-bold text-slate-700 border-bottom pb-2 mb-3" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>Selected Sales Velocity Projects (Cash Inflow Payload)</h6>
                                      {selectedSalesVelocityProjects.size > 0 ? (
                                        <div className="d-flex flex-wrap gap-2">
                                          {Array.from(selectedSalesVelocityProjects).map(name => (
                                            <span key={name} className="badge rounded-pill fw-semibold px-3 py-2 shadow-sm" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                                              {name}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-muted small fw-medium">No projects selected. The simulation requires at least one project.</div>
                                      )}
                                    </div>

                                    <div className="col-md-6">
                                      <h6 className="fw-bold text-slate-700 border-bottom pb-2 mb-3" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>Cost Outflow</h6>
                                      <div className="bg-white border rounded-3 p-3 mb-2 shadow-sm" style={{ maxHeight: "200px", overflowY: "auto", borderColor: '#e2e8f0' }}>
                                        {metricListV2.cashOutflowRows.length > 0 ? metricListV2.cashOutflowRows.map((row, idx) => (
                                          <div key={idx} className="d-flex justify-content-between small border-bottom py-2">
                                            <span className="text-slate-600 fw-medium">{row.label}</span>
                                            <span className="fw-bold text-dark">{Number(row.value).toLocaleString()} {currency}</span>
                                          </div>
                                        )) : <span className="small text-muted fw-medium">No cost data.</span>}
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center px-3 py-3 rounded-3 shadow-sm" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                        <span className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Total Cost:</span>
                                        <span className="fw-bold fs-6">{Number(metricListV2.cashOutflowTotal).toLocaleString()} {currency}</span>
                                      </div>
                                      {metricListV2.constructionTimeline && (
                                        <div className="mt-3 text-muted fw-semibold small d-flex align-items-center gap-1">
                                          <FaCheckCircle className="text-success" /> Project Duration: <strong className="text-dark">{metricListV2.constructionTimeline}</strong>
                                        </div>
                                      )}
                                    </div>

                                    <div className="col-md-6">
                                      <h6 className="fw-bold text-slate-700 border-bottom pb-2 mb-3" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>Means of Finance</h6>
                                      <div className="bg-white border rounded-3 p-3 mb-2 shadow-sm" style={{ maxHeight: "200px", overflowY: "auto", borderColor: '#e2e8f0' }}>
                                        {metricListV2.meansOfFinanceRows.length > 0 ? metricListV2.meansOfFinanceRows.map((row, idx) => (
                                          <div key={idx} className="d-flex justify-content-between small border-bottom py-2">
                                            <span className="text-slate-600 fw-medium">{row.label} <span className="badge bg-light text-secondary ms-1">{row.percentage}%</span></span>
                                            <span className="fw-bold text-dark">{Number(row.proposed).toLocaleString()} {currency}</span>
                                          </div>
                                        )) : <span className="small text-muted fw-medium">No finance data.</span>}
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center px-3 py-3 rounded-3 shadow-sm" style={{ backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                                        <span className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Total Finance ({metricListV2.meansOfFinanceTotalPercentage}%):</span>
                                        <span className="fw-bold fs-6">{Number(metricListV2.meansOfFinanceTotals).toLocaleString()} {currency}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                              <h5 className="fw-bold text-slate-800 m-0 d-flex align-items-center gap-2"><FaChartBar className="text-primary" /> Simulation Results</h5>
                              <button className="btn btn-sm btn-light border rounded-pill shadow-sm fw-semibold d-inline-flex align-items-center gap-1 px-3" style={{ color: '#475569', transition: 'all 0.2s' }} onClick={() => setCashInflowSimResult(null)}><FaTimes size={12} /> Reset</button>
                            </div>
                            <div className="d-flex flex-wrap p-1 rounded-pill bg-light border shadow-sm mb-4" style={{ gap: '4px', alignSelf: 'flex-start' }}>
                              {["Optimistic","Most Probable","Pessimistic","User Cashflow","Raw Output"].map(s => (
                                <button key={s} type="button" 
                                  className={`btn btn-sm rounded-pill px-4 fw-semibold border-0 d-inline-flex align-items-center justify-content-center ${activeInflowScenario===s ? "btn-primary shadow-sm" : "btn-light text-muted"}`} 
                                  style={{ transition: 'all 0.2s', flex: '1 1 auto', minWidth: '100px' }}
                                  onClick={() => setActiveInflowScenario(s)}>
                                  {s}
                                </button>
                              ))}
                            </div>
                            {activeInflowScenario === "Raw Output" && (
                              <div className="bg-dark p-3 rounded" style={{ maxHeight:380, overflowY:"auto" }}>
                                <pre style={{ whiteSpace:"pre-wrap", fontFamily:"monospace", fontSize:"0.85rem", margin:0, color:"#f8f9fa" }}>{cashInflowSimResult}</pre>
                              </div>
                            )}
                            {activeInflowScenario === "User Cashflow" && (
                              <div>
                                <div className="table-responsive bg-white rounded-4 border shadow-sm" style={{ maxHeight:300, overflowY:"auto", borderColor: '#e2e8f0' }}>
                                  <table className="table table-hover table-bordered mb-0 text-center align-middle" style={{ fontSize: '0.9rem', borderColor: '#e2e8f0' }}>
                                    <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                      <tr>
                                        <th className="py-3 px-3 bg-white text-slate-600" style={{ fontWeight: 700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Year</th>
                                        <th className="py-3 px-3 bg-white text-slate-600" style={{ fontWeight: 700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                          Sales %
                                          <FaInfoCircle title="Year 0 usually does not have any sales" className="ms-1 text-muted" size={14} />
                                        </th>
                                        <th className="py-3 px-3 bg-white" style={{ width: 60, borderBottom: '2px solid #cbd5e1' }}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {userCashflowRows.map((row, idx) => (
                                        <tr key={idx} style={{ transition: 'background-color 0.2s' }}>
                                          <td className="fw-bold text-slate-700 bg-transparent">{row.year}</td>
                                          <td className="bg-transparent">
                                            <input type="number" disabled={row.year === "Year 0" || row.year === "0"} className="form-control form-control-sm mx-auto fw-bold text-primary shadow-sm" style={{ width:120, borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }} placeholder="e.g. 30" min="0" max="100" step="0.01" value={row.percentage} onChange={e => { const u=[...userCashflowRows]; u[idx]={...u[idx],percentage:e.target.value}; setUserCashflowRows(u); }} />
                                          </td>
                                          <td className="bg-transparent">
                                            {userCashflowRows.length > 2 && <button className="btn btn-sm btn-outline-danger rounded-pill shadow-sm" onClick={() => setUserCashflowRows(p=>p.filter((_,i)=>i!==idx))}><FaTrashAlt size={12} /></button>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="d-flex justify-content-between mt-3">
                                  <button className="btn btn-sm rounded-pill px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2" style={{ backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #bfdbfe', transition: 'all 0.2s' }} 
                                    onClick={() => setUserCashflowRows(p => {
                                      const lastMatch = p.length > 0 ? p[p.length - 1].year.match(/\d+/) : null;
                                      const nextNum = lastMatch ? parseInt(lastMatch[0], 10) + 1 : p.length;
                                      return [...p, { year: `Year ${nextNum}`, percentage: "" }];
                                    })}>+ Add Year</button>
                                  <button className="btn rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', transition: 'all 0.2s' }} onClick={handleApplyUserCashflow}><FaCheckCircle /> Apply User Cashflow</button>
                                </div>
                              </div>
                            )}
                            {activeInflowScenario !== "Raw Output" && activeInflowScenario !== "User Cashflow" && (
                              <div>
                                {parsedInflowResult?.[activeInflowScenario]?.length > 0 ? (
                                  <div className="table-responsive bg-white rounded-4 border shadow-sm" style={{ maxHeight:300, overflowY:"auto", borderColor: '#e2e8f0' }}>
                                    <table className="table table-hover table-bordered align-middle mb-0 text-center" style={{ fontSize: '0.9rem', borderColor: '#e2e8f0' }}>
                                      <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <tr>
                                          <th className="py-3 px-3 bg-white text-slate-600" style={{ fontWeight: 700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Year</th>
                                          <th className="py-3 px-3 bg-white text-slate-600" style={{ fontWeight: 700, borderBottom: '2px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Sales %</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {parsedInflowResult[activeInflowScenario].map((row,i)=>(
                                          <tr key={i} style={{ transition: 'background-color 0.2s' }}>
                                            <td className="fw-bold text-slate-700 bg-transparent">{row.year}</td>
                                            <td className="fw-bold bg-transparent" style={{ color: '#4338ca' }}>{row.percentage}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : <div className="d-flex flex-column align-items-center justify-content-center py-5 bg-light rounded-4 border shadow-sm"><FaExclamationTriangle className="text-warning mb-2" size={32} /><span className="text-muted fw-semibold">No data parsed. Check Raw Output tab.</span></div>}
                                <div className="mt-4 text-end">
                                  <button className="btn rounded-pill px-5 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2" 
                                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', transition: 'all 0.2s' }} 
                                    onClick={handleApplyInflowScenario} disabled={!parsedInflowResult?.[activeInflowScenario]?.length}>
                                    <FaCheckCircle /> Apply {activeInflowScenario} Scenario
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
        </div>,
        document.body
      )}

      {/* Predict Cost Cash Outflow Modal */}
      <CostOutflowSimulationModal
        isOpen={isCostOutflowModalOpen}
        onClose={() => setIsCostOutflowModalOpen(false)}
        onApply={handleApplyCostOutflow}
        selectedScenario={selectedScenario}
      />
    </div>
  );
};

export default FeasibilityIrrSection;
