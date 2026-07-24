import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import Header from "./Header";
import IRRCalculationForm from "./IRRCalculationForm";
import IRROnPermissible from "./IRROnPermissible";
import IRROnProposed from "./IRROnProposed";
import CashflowSimulationModal from "./CashflowSimulationModal";
import {
  buildMetricListSimulationPayload,
  loadMetricListData,
} from "./utils/metricListPayload";
import { mapSimulationToIrrForm } from "./utils/mapSimulationToIrrForm";
import { formatMetricNumber } from "./utils/irrMetricUtils";
import { runIrrCashflowSimulation, runSalesInflowSimulation } from "./services/irrSimulationService";
import { FaArrowLeft, FaCalculator, FaChartBar, FaChevronDown, FaChevronUp, FaCopy, FaInfoCircle } from 'react-icons/fa';
import { apiUrl } from "@/lib/api-client";

const IRR_SCENARIOS = ["Optimistic", "Most Probable", "Pessimistic"];

const applyMetricListData = (metricData, setters) => {
  setters.setSalesInfoMethod(metricData.salesInfoMethod);
  setters.setSalesInfoRows(metricData.salesInfoRows);
  setters.setCashOutflowRows(metricData.cashOutflowRows);
  setters.setCashOutflowTotal(metricData.cashOutflowTotal);
  setters.setMeansOfFinanceRows(metricData.meansOfFinanceRows);
  setters.setMeansOfFinanceTotalPercentage(metricData.meansOfFinanceTotalPercentage);
  setters.setMeansOfFinanceTotals(metricData.meansOfFinanceTotals);
  setters.setConstructionTimeline(metricData.constructionTimeline);
};

const IRR = () => {
  const navigate = useNavigate();
  const [irrResult, setIrrResult] = useState(null);
  const [isMetricListOpen, setIsMetricListOpen] = useState(false);
  const [salesInfoRows, setSalesInfoRows] = useState([]);
  const [salesInfoMethod, setSalesInfoMethod] = useState("");
  const [selectedScenario, setSelectedScenario] = useState("Most Probable");
  const [cashOutflowRows, setCashOutflowRows] = useState([]);
  const [cashOutflowTotal, setCashOutflowTotal] = useState(0);
  const [meansOfFinanceRows, setMeansOfFinanceRows] = useState([]);
  const [meansOfFinanceTotalPercentage, setMeansOfFinanceTotalPercentage] = useState(0);
  const [meansOfFinanceTotals, setMeansOfFinanceTotals] = useState({ permissible: 0, proposed: 0 });
  const [constructionTimeline, setConstructionTimeline] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);
  const [simulationInputPayload, setSimulationInputPayload] = useState(null);
  const [simulationTokenLedger, setSimulationTokenLedger] = useState(null);
  const [irrFormAutofill, setIrrFormAutofill] = useState(null);
  const [isSim2PopupOpen, setIsSim2PopupOpen] = useState(false);
  const [sim2Loading, setSim2Loading] = useState(false);
  const [sim2Result, setSim2Result] = useState(null);
  const [sim2Error, setSim2Error] = useState(null);
  const [isSim2RawOutputVisible, setIsSim2RawOutputVisible] = useState(false);
  const [sim2PromptVersion, setSim2PromptVersion] = useState("p1");
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
  const [salesVelocityData, setSalesVelocityData] = useState(null);
  const [salesVelocityLoading, setSalesVelocityLoading] = useState(false);
  const [salesVelocityError, setSalesVelocityError] = useState(null);
  const [activeSalesTab, setActiveSalesTab] = useState("upcoming");
  const [searchRadius, setSearchRadius] = useState(1);
  const [selectedSalesVelocityProjects, setSelectedSalesVelocityProjects] = useState(new Set());

  const [cashInflowSimLoading, setCashInflowSimLoading] = useState(false);
  const [cashInflowSimResult, setCashInflowSimResult] = useState(null);
  const [cashInflowSimError, setCashInflowSimError] = useState(null);
  const [activeInflowScenario, setActiveInflowScenario] = useState("Most Probable");
  const [userCashflowRows, setUserCashflowRows] = useState([
    { year: "Year 0", percentage: "" },
    { year: "Year 1", percentage: "" },
  ]);

  const metricListSetters = {
    setSalesInfoMethod,
    setSalesInfoRows,
    setCashOutflowRows,
    setCashOutflowTotal,
    setMeansOfFinanceRows,
    setMeansOfFinanceTotalPercentage,
    setMeansOfFinanceTotals,
    setConstructionTimeline,
  };

  const getMetricListPayload = useCallback(
    () => buildMetricListSimulationPayload(loadMetricListData(selectedScenario)),
    [selectedScenario]
  );

  useEffect(() => {
    const loadMetrics = () => {
      try {
        applyMetricListData(loadMetricListData(selectedScenario), metricListSetters);
      } catch (error) {
        console.error("Failed to load sales info metrics", error);
        setSalesInfoRows([]);
        setCashOutflowRows([]);
        setCashOutflowTotal(0);
        setMeansOfFinanceRows([]);
        setMeansOfFinanceTotalPercentage(0);
        setMeansOfFinanceTotals({ permissible: 0, proposed: 0 });
        setConstructionTimeline("");
      }
    };

    loadMetrics();
    window.addEventListener("storage", loadMetrics);
    window.addEventListener("revenueFormUpdated", loadMetrics);
    window.addEventListener("ticketSizeSummaryUpdated", loadMetrics);
    window.addEventListener("bayesianOptimizerTransactionsUpdated", loadMetrics);
    window.addEventListener("ticketSizeSimulationTransactionsUpdated", loadMetrics);
    window.addEventListener("costFormUpdated", loadMetrics);
    window.addEventListener("landDetailsUpdated", loadMetrics);
    window.addEventListener("fsiProposalUpdated", loadMetrics);
    window.addEventListener("expectedRevenueSaved", loadMetrics);
    window.addEventListener("unitDesignStructureUpdated", loadMetrics);
    window.addEventListener("areaCalculationUpdated", loadMetrics);
    window.addEventListener("meansOfFinanceUpdated", loadMetrics);

    return () => {
      window.removeEventListener("storage", loadMetrics);
      window.removeEventListener("revenueFormUpdated", loadMetrics);
      window.removeEventListener("ticketSizeSummaryUpdated", loadMetrics);
      window.removeEventListener("bayesianOptimizerTransactionsUpdated", loadMetrics);
      window.removeEventListener("ticketSizeSimulationTransactionsUpdated", loadMetrics);
      window.removeEventListener("costFormUpdated", loadMetrics);
      window.removeEventListener("landDetailsUpdated", loadMetrics);
      window.removeEventListener("fsiProposalUpdated", loadMetrics);
      window.removeEventListener("expectedRevenueSaved", loadMetrics);
      window.removeEventListener("unitDesignStructureUpdated", loadMetrics);
      window.removeEventListener("areaCalculationUpdated", loadMetrics);
      window.removeEventListener("meansOfFinanceUpdated", loadMetrics);
    };
  }, [selectedScenario]);

  // Handle Caching for Testing
  useEffect(() => {
    try {
      const cachedCompProjects = localStorage.getItem("cache_comparableProjects");
      if (cachedCompProjects) setComparableProjects(JSON.parse(cachedCompProjects));

      const cachedCompStats = localStorage.getItem("cache_comparableProviderStats");
      if (cachedCompStats) setComparableProviderStats(JSON.parse(cachedCompStats));

      const cachedCompResult = localStorage.getItem("cache_comparableResult");
      if (cachedCompResult) setComparableResult(JSON.parse(cachedCompResult));

      const cachedSalesVel = localStorage.getItem("cache_salesVelocityData");
      if (cachedSalesVel) setSalesVelocityData(JSON.parse(cachedSalesVel));
    } catch (e) {
      console.error("Failed to parse cached data", e);
    }
  }, []);

  useEffect(() => {
    if (salesVelocityData && salesVelocityData.velocity_data && comparableProjects) {
      const initialSelected = new Set();
      const statusLookup = {};
      comparableProjects.forEach(p => {
        statusLookup[(p.projectName || "").toLowerCase()] = (p.status || "").toLowerCase();
      });

      salesVelocityData.velocity_data.forEach(row => {
        const status = statusLookup[(row.llmName || "").toLowerCase()] || "";
        if (status.includes("under construction")) {
          initialSelected.add(row.llmName);
        }
      });
      setSelectedSalesVelocityProjects(initialSelected);
    }
  }, [salesVelocityData, comparableProjects]);

  const handleSaveComparableCache = () => {
    if (comparableProjects) localStorage.setItem("cache_comparableProjects", JSON.stringify(comparableProjects));
    if (comparableProviderStats) localStorage.setItem("cache_comparableProviderStats", JSON.stringify(comparableProviderStats));
    if (comparableResult) localStorage.setItem("cache_comparableResult", JSON.stringify(comparableResult));
    alert("Comparable Projects saved to cache.");
  };

  const handleClearComparableCache = () => {
    localStorage.removeItem("cache_comparableProjects");
    localStorage.removeItem("cache_comparableProviderStats");
    localStorage.removeItem("cache_comparableResult");
    setComparableProjects(null);
    setComparableProviderStats(null);
    setComparableResult(null);
  };

  const handleSaveSalesVelocityCache = () => {
    if (salesVelocityData) localStorage.setItem("cache_salesVelocityData", JSON.stringify(salesVelocityData));
    alert("Sales Velocity data saved to cache.");
  };

  const handleClearSalesVelocityCache = () => {
    localStorage.removeItem("cache_salesVelocityData");
    setSalesVelocityData(null);
  };

  const handleGoBack = () => {
    navigate("/new_rate_simulator/");
  };

  const handleIRRCalculate = (result) => {
    setIrrResult(result);
  };

  const handleRunSimulation = async () => {
    const metricData = loadMetricListData(selectedScenario);
    applyMetricListData(metricData, metricListSetters);

    const payload = buildMetricListSimulationPayload(metricData);
    setSimulationInputPayload(payload);

    const timeline = String(payload.constructionTimeline ?? "").trim();
    if (timeline === "" || Number.isNaN(Number(timeline))) {
      setSimulationResult(null);
      setSimulationError(
        "Construction timeline is required. Complete Cost Details on the rate simulator first."
      );
      setIsSimulationModalOpen(true);
      return;
    }

    if (!Array.isArray(payload.cashOutflow?.rows) || payload.cashOutflow.rows.length === 0) {
      setSimulationResult(null);
      setSimulationError(
        "Cash outflow data is missing. Complete cost calculations on the rate simulator first."
      );
      setIsSimulationModalOpen(true);
      return;
    }

    setIsSimulationModalOpen(true);
    setSimulationLoading(true);
    setSimulationResult(null);
    setSimulationError(null);
    setSimulationTokenLedger(null);

    try {
      const { data, tokenLedger } = await runIrrCashflowSimulation(payload);
      setSimulationResult(data);
      setSimulationTokenLedger(tokenLedger);

      const irrFormFill = mapSimulationToIrrForm(data);

      // Disconnect Sales Cash Inflow from Simulation 1 by preserving existing state
      const savedFormStr = localStorage.getItem("irrForm");
      if (savedFormStr) {
        try {
          const parsed = JSON.parse(savedFormStr);
          if (parsed.formData && parsed.formData.cashflow) {
            irrFormFill.formData.cashflow = parsed.formData.cashflow;
          } else {
            irrFormFill.formData.cashflow = {};
          }
        } catch (e) {
          irrFormFill.formData.cashflow = {};
        }
      } else {
        irrFormFill.formData.cashflow = {};
      }

      setIrrFormAutofill({
        ...irrFormFill,
        appliedAt: Date.now(),
      });
    } catch (error) {
      console.error("Cashflow simulation failed", error);
      setSimulationError(error?.message || "Simulation failed. Please try again.");
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleCloseSimulationModal = () => {
    if (simulationLoading) return;
    setIsSimulationModalOpen(false);
  };

  const handleFindComparables = async () => {
    setComparableLoading(true);
    setComparableResult(null);
    setComparableError(null);
    setComparableTokenUsage(null);
    setComparableProjects(null);
    setComparableProviderStats(null);
    setIsComparableLedgerOpen(false);

    const landForm = JSON.parse(localStorage.getItem("landDetailsForm") || "{}");
    const latRaw = landForm.latitude;
    const lngRaw = landForm.longitude;
    const latitude = parseFloat(latRaw);
    const longitude = parseFloat(lngRaw);

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setComparableError("Coordinates not found. Please enter Latitude and Longitude in the Land Details form first.");
      setComparableLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl("/new_rate_simulator/simulator/comparable-projects"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          latitude: latRaw,
          longitude: lngRaw,
          fetched_location: landForm.fetched_location || "",
          location: landForm.location || "",
          village: landForm.village || "",
          radius: searchRadius,
        }),
      });
      const body = await response.json();
      if (!response.ok || body?.success === false) {
        setComparableError(body?.error || "Search failed. Please try again.");
      } else {
        setComparableResult(body.result);
        if (body.tokenUsage) setComparableTokenUsage(body.tokenUsage);
        if (body.projects) setComparableProjects(body.projects);
        if (body.providerStats) setComparableProviderStats(body.providerStats);
      }
    } catch (err) {
      setComparableError(err.message || "An unexpected error occurred.");
    } finally {
      setComparableLoading(false);
    }
  };

  const handleFetchSalesVelocity = async () => {
    if (!comparableProjects || comparableProjects.length === 0) return;

    setSalesVelocityLoading(true);
    setSalesVelocityError(null);
    setSalesVelocityData(null);

    try {
      const payloadProjects = comparableProjects
        .filter(p => p.coordinates && p.coordinates.includes(","))
        .map(p => {
          const [lat, lng] = p.coordinates.split(",").map(s => s.trim());
          return { projectName: p.projectName, location: p.location, lat, lng };
        });

      const response = await fetch(apiUrl("/new_rate_simulator/simulator/sales-velocity2"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ projects: payloadProjects }),
      });

      const body = await response.json();
      if (!response.ok || body?.success === false) {
        setSalesVelocityError(body?.error || "Failed to fetch sales velocity.");
      } else {
        setSalesVelocityData(body);
      }
    } catch (err) {
      setSalesVelocityError(err.message || "An unexpected error occurred.");
    } finally {
      setSalesVelocityLoading(false);
    }
  };

  const handleRunCashInflowSimulation = async () => {
    if (!salesVelocityData || !salesVelocityData.velocity_data) return;

    setCashInflowSimLoading(true);
    setCashInflowSimError(null);
    setCashInflowSimResult(null);

    try {
      const selectedVelocityData = salesVelocityData.velocity_data.filter(row => selectedSalesVelocityProjects.has(row.llmName));

      const response = await fetch(apiUrl("/new_rate_simulator/simulator/predict-cash-inflow"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          salesInfo: salesInfoRows.filter(r => !r.isTotal),
          velocityData: selectedVelocityData
        }),
      });

      const body = await response.json();
      if (!response.ok || body?.success === false) {
        setCashInflowSimError(body?.error || "Failed to run simulation.");
      } else {
        setCashInflowSimResult(body.data);
      }
    } catch (err) {
      setCashInflowSimError(err.message || "An unexpected error occurred.");
    } finally {
      setCashInflowSimLoading(false);
    }
  };

  const handleApplyInflowScenario = () => {
    if (!parsedInflowResult || !parsedInflowResult[activeInflowScenario]) return;

    const scenarioData = parsedInflowResult[activeInflowScenario];
    if (scenarioData.length === 0) return;

    let maxYear = 1;
    const newCashflow = {};
    scenarioData.forEach(row => {
      const yearNumMatch = row.year.match(/\d+/);
      if (yearNumMatch) {
        const yearNum = parseInt(yearNumMatch[0], 10);
        if (yearNum > maxYear) maxYear = yearNum;
        if (yearNum > 0) {
          newCashflow[yearNum] = row.percentage.replace('%', '').trim();
        }
      }
    });

    const defaultFormData = {
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
      miscellaneouscost: {}
    };

    let currentDuration = 1;
    let currentFormData = { ...defaultFormData };

    try {
      const savedFormStr = localStorage.getItem("irrForm");
      if (savedFormStr) {
        const parsed = JSON.parse(savedFormStr);
        currentDuration = parseInt(parsed.projectDuration, 10) || 1;
        if (parsed.formData) {
          currentFormData = { ...defaultFormData, ...parsed.formData };
        }
      }
    } catch (e) {
      console.error("Could not parse irrForm from localStorage", e);
    }

    const finalDuration = Math.max(currentDuration, maxYear);
    currentFormData.cashflow = newCashflow;

    setIrrFormAutofill({
      projectDuration: finalDuration,
      formData: currentFormData,
      appliedAt: Date.now(),
      source: "cashflowSimulation",
    });

    setIsComparableModalOpen(false);
  };

  // ── User Cashflow: apply manually entered rows to the IRR form ──
  const handleApplyUserCashflow = () => {
    const newCashflow = {};
    let maxYear = 1;
    userCashflowRows.forEach(row => {
      const yearNumMatch = row.year.match(/\d+/);
      if (yearNumMatch) {
        const yearNum = parseInt(yearNumMatch[0], 10);
        if (yearNum > maxYear) maxYear = yearNum;
        if (yearNum > 0) {
          newCashflow[yearNum] = row.percentage.replace('%', '').trim();
        }
      }
    });

    const defaultFormData = {
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
      miscellaneouscost: {}
    };

    let currentDuration = 1;
    let currentFormData = { ...defaultFormData };

    try {
      const savedFormStr = localStorage.getItem("irrForm");
      if (savedFormStr) {
        const parsed = JSON.parse(savedFormStr);
        currentDuration = parseInt(parsed.projectDuration, 10) || 1;
        if (parsed.formData) {
          currentFormData = { ...defaultFormData, ...parsed.formData };
        }
      }
    } catch (e) {
      console.error("Could not parse irrForm from localStorage", e);
    }

    const finalDuration = Math.max(currentDuration, maxYear);
    currentFormData.cashflow = newCashflow;

    setIrrFormAutofill({
      projectDuration: finalDuration,
      formData: currentFormData,
      appliedAt: Date.now(),
      source: "userCashflow",
    });

    setIsComparableModalOpen(false);
  };

  const parsedInflowResult = useMemo(() => {
    if (!cashInflowSimResult) return null;
    const scenarios = {
      "Optimistic": [],
      "Most Probable": [],
      "Pessimistic": []
    };

    // ── Strategy 1: Parse <FINAL_IRR_INPUT_FORMAT> key=value block ──
    const irrMatch = cashInflowSimResult.match(/<FINAL_IRR_INPUT_FORMAT>([\s\S]*?)<\/FINAL_IRR_INPUT_FORMAT>/);
    if (irrMatch) {
      const content = irrMatch[1];
      let currentScenario = null;
      content.split("\n").forEach(rawLine => {
        const line = rawLine.trim();
        if (!line) return;
        // detect scenario headers — case-insensitive, with or without trailing colon
        if (/^optimistic:?$/i.test(line)) { currentScenario = "Optimistic"; return; }
        if (/^most probable:?$/i.test(line)) { currentScenario = "Most Probable"; return; }
        if (/^pessimistic:?$/i.test(line)) { currentScenario = "Pessimistic"; return; }
        // detect Year N = X.XX% lines — very permissive regex
        const yearMatch = line.match(/^year\s+(\d+)\s*=\s*([\d.]+%?)/i);
        if (yearMatch && currentScenario) {
          const yearNum = parseInt(yearMatch[1], 10);
          const pct = yearMatch[2].endsWith("%") ? yearMatch[2] : yearMatch[2] + "%";
          scenarios[currentScenario].push({ year: `Year ${yearNum}`, percentage: pct });
        }
      });
    }

    // ── Strategy 2 (fallback): Parse <FINAL_YEAR_WISE_SALES_DISTRIBUTION_FOR_IRR> markdown table ──
    const allEmpty = Object.values(scenarios).every(arr => arr.length === 0);
    if (allEmpty) {
      const tableMatch = cashInflowSimResult.match(/<FINAL_YEAR_WISE_SALES_DISTRIBUTION_FOR_IRR>([\s\S]*?)<\/FINAL_YEAR_WISE_SALES_DISTRIBUTION_FOR_IRR>/);
      if (tableMatch) {
        const rows = tableMatch[1].split("\n").filter(l => l.trim().startsWith("|"));
        rows.forEach(row => {
          const cells = row.split("|").map(c => c.trim()).filter(Boolean);
          // expect: Year N | X.XX% | X.XX% | X.XX%
          if (cells.length >= 4) {
            const yearMatch = cells[0].match(/year\s+(\d+)/i);
            if (yearMatch) {
              const yearNum = parseInt(yearMatch[1], 10);
              const extractPct = (str) => {
                const m = str.match(/([\d.]+%?)/);
                return m ? (m[1].endsWith("%") ? m[1] : m[1] + "%") : "0.00%";
              };
              scenarios["Optimistic"].push({ year: `Year ${yearNum}`, percentage: extractPct(cells[1]) });
              scenarios["Most Probable"].push({ year: `Year ${yearNum}`, percentage: extractPct(cells[2]) });
              scenarios["Pessimistic"].push({ year: `Year ${yearNum}`, percentage: extractPct(cells[3]) });
            }
          }
        });
      }
    }

    console.debug("[CashInflowParser] Parsed result:", scenarios);
    return scenarios;
  }, [cashInflowSimResult]);


  const handleRunSimulation2 = async () => {
    setSim2Loading(true);
    setSim2Result(null);
    setSim2Error(null);

    const formattedSalesInfo = (salesInfoRows || []).map((row) => ({
      bhk: row.bhk,
      perUnitCost: Number(String(row.perUnitCost || "0").replace(/,/g, "")),
      noOfUnits: Number(String(row.numUnits || row.noOfUnits || "0").replace(/,/g, "")),
      transactionsPerYear: Number(String(row.transactionsPerYear || "0").replace(/,/g, "")),
    }));

    try {
      const data = await runSalesInflowSimulation({
        salesInfoMethod: salesInfoMethod || "bayesian",
        salesInfo: formattedSalesInfo,
        promptVersion: sim2PromptVersion,
      });
      setSim2Result(data);
    } catch (err) {
      setSim2Error(err.message || "An unexpected error occurred");
    } finally {
      setSim2Loading(false);
    }
  };

  const parsedSim2Data = useMemo(() => {
    if (!sim2Result) return null;

    const sections = {
      "Optimistic": { data: {}, maxYear: 0 },
      "Most Probable": { data: {}, maxYear: 0 },
      "Pessimistic": { data: {}, maxYear: 0 }
    };

    let currentSection = null;
    const lines = String(sim2Result).split('\n');

    for (let line of lines) {
      line = line.replace(/\*/g, '').trim();

      if (line.startsWith('Optimistic:')) {
        currentSection = 'Optimistic';
      } else if (line.startsWith('Most Probable:')) {
        currentSection = 'Most Probable';
      } else if (line.startsWith('Pessimistic:')) {
        currentSection = 'Pessimistic';
      } else if (currentSection && line.toLowerCase().startsWith('year')) {
        const match = line.match(/(Year\s+\d+)\s*=\s*([\d.]+)%/i);
        if (match) {
          const yearKey = match[1].toLowerCase();
          const val = parseFloat(match[2]);
          sections[currentSection].data[yearKey] = val;
          if (val > 0) {
            const yearNum = parseInt(match[1].replace(/\D/g, ''), 10);
            sections[currentSection].maxYear = Math.max(sections[currentSection].maxYear, yearNum);
          }
        }
      }
    }
    return sections;
  }, [sim2Result]);

  const handleAutoFill = () => {
    if (!parsedSim2Data) return;

    if (Object.keys(parsedSim2Data["Optimistic"].data).length > 0) {
      localStorage.setItem("Inflow_Optimistic", JSON.stringify({
        ...parsedSim2Data["Optimistic"].data,
        totalYearsRequired: parsedSim2Data["Optimistic"].maxYear
      }));
    }
    if (Object.keys(parsedSim2Data["Most Probable"].data).length > 0) {
      localStorage.setItem("Inflow_Most_Probable", JSON.stringify({
        ...parsedSim2Data["Most Probable"].data,
        totalYearsRequired: parsedSim2Data["Most Probable"].maxYear
      }));
    }
    if (Object.keys(parsedSim2Data["Pessimistic"].data).length > 0) {
      localStorage.setItem("Inflow_Pessimistic", JSON.stringify({
        ...parsedSim2Data["Pessimistic"].data,
        totalYearsRequired: parsedSim2Data["Pessimistic"].maxYear
      }));
    }

    const targetSection = parsedSim2Data[selectedScenario]?.data;

    if (targetSection && Object.keys(targetSection).length > 0) {
      let maxYear = 0;
      const cashflow = {};
      for (const [key, value] of Object.entries(targetSection)) {
        const yearMatch = key.match(/\d+/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0], 10);
          maxYear = Math.max(maxYear, year);
          cashflow[year] = value;
        }
      }

      const savedFormStr = localStorage.getItem("irrForm");
      let currentFormData = {
        cashflow: {}, landcost: {}, approvalcost: {}, constructioncost: {},
        administrativecost: {}, ancillarycost: {}, tdrcost: {}, premiumcost: {},
        marketingcost: {}, contingencycost: {}, financecost: {}, miscellaneouscost: {}
      };

      let existingDuration = null;
      if (savedFormStr) {
        try {
          const parsed = JSON.parse(savedFormStr);
          if (parsed.projectDuration) {
            existingDuration = parsed.projectDuration;
          }
          if (parsed.formData) {
            currentFormData = { ...currentFormData, ...parsed.formData };
          }
        } catch (e) {
          console.error("Failed to parse irrForm", e);
        }
      }

      currentFormData.cashflow = cashflow;

      let requiredYears = parsedSim2Data[selectedScenario]?.maxYear || 0;
      let finalDuration = existingDuration !== null
        ? Math.max(existingDuration, requiredYears)
        : (requiredYears > 0 ? requiredYears : 1);

      setIrrFormAutofill({
        projectDuration: finalDuration,
        formData: currentFormData,
        appliedAt: Date.now()
      });
    }

    alert("Data saved to local storage successfully!");
  };

  const handleCopyMetricJson = async () => {
    const metricPayload = getMetricListPayload();

    try {
      await navigator.clipboard.writeText(JSON.stringify(metricPayload, null, 2));
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1500);
    } catch (error) {
      console.error("Failed to copy metric JSON", error);
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <Header />
      <main className="container-fluid py-5 px-4 position-relative">
        <div className="irr-metric-list">
          <div className="irr-metric-toggle">
            <div
              className="irr-metric-toggle-head"
              role="button"
              tabIndex={0}
              onClick={() => setIsMetricListOpen((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsMetricListOpen((prev) => !prev);
                }
              }}
              aria-expanded={isMetricListOpen}
              aria-controls="irr-metric-list-body"
            >
              <h2 className="irr-metric-title">Metric List</h2>
              {isMetricListOpen ? (
                <FaChevronUp className="irr-metric-icon" />
              ) : (
                <FaChevronDown className="irr-metric-icon" />
              )}
            </div>
            {isMetricListOpen && (
              <div id="irr-metric-list-body" className="irr-metric-body">
                <div className="irr-metric-actions">
                  <button
                    type="button"
                    className="irr-copy-btn"
                    onClick={handleCopyMetricJson}
                  >
                    <FaCopy />
                    <span>{copyStatus || "Copy JSON"}</span>
                  </button>
                </div>

                <div className="irr-metric-section">
                  <div className="irr-metric-section-header">
                    <div className="irr-metric-section-title">Sales Info</div>
                    <div className="irr-metric-section-subtitle">
                      {salesInfoMethod === "bayesian" ? "Bayesian data" : "Basic logic data"}
                    </div>
                  </div>
                  <div className="table-responsive irr-metric-table-wrap">
                    <table className="table table-sm mb-0 align-middle irr-metric-table">
                      <thead>
                        <tr>
                          <th>BHK</th>
                          <th className="text-end">Per Unit Cost</th>
                          <th className="text-end">No. of Units</th>
                          <th className="text-end">Transactions / Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesInfoRows.length > 0 ? (
                          salesInfoRows.map((row) => {
                            const hasCost = row.perUnitCost !== "" && row.perUnitCost != null;
                            const hasUnits = row.noOfUnits !== "" && row.noOfUnits != null;
                            const hasTxn = row.transactionsPerYear !== "" && row.transactionsPerYear != null;
                            return (
                              <tr key={row.bhk}>
                                <td className="fw-semibold text-dark">{row.bhk}</td>
                                <td className="text-end text-dark">
                                  {hasCost ? formatMetricNumber(row.perUnitCost) : "—"}
                                </td>
                                <td className="text-end text-dark">
                                  {hasUnits ? formatMetricNumber(row.noOfUnits) : "—"}
                                </td>
                                <td className="text-end text-dark">
                                  {hasTxn ? formatMetricNumber(row.transactionsPerYear) : "—"}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              No sales info available yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="irr-metric-section mt-3">
                  <div className="irr-metric-section-header">
                    <div className="irr-metric-section-title">Collection Schedule</div>
                    <div className="irr-metric-section-subtitle">
                      Current IRR scenario selection
                    </div>
                  </div>
                  <div className="irr-metric-single-value">
                    <div className="irr-metric-single-label">Selected Value</div>
                    <div className="irr-metric-single-chip">{selectedScenario}</div>
                  </div>
                </div>

                <div className="irr-metric-section mt-3">
                  <div className="irr-metric-section-header">
                    <div className="irr-metric-section-title">Cash OutFlow</div>
                    <div className="irr-metric-section-subtitle">
                      Proposed values from cost breakdown
                    </div>
                  </div>
                  <div className="table-responsive irr-metric-table-wrap">
                    <table className="table table-sm mb-0 align-middle irr-metric-table">
                      <thead>
                        <tr>
                          <th>Particulars</th>
                          <th className="text-end">Proposed Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashOutflowRows.length > 0 ? (
                          <>
                            {cashOutflowRows.map((row) => (
                              <tr key={row.key}>
                                <td className="fw-semibold text-dark">{row.label}</td>
                                <td className="text-end text-dark">
                                  {formatMetricNumber(row.value)}
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td className="fw-bold text-dark">Total Cost of Project</td>
                              <td className="text-end fw-bold text-dark">
                                {formatMetricNumber(cashOutflowTotal)}
                              </td>
                            </tr>
                          </>
                        ) : (
                          <tr>
                            <td colSpan={2} className="text-center text-muted py-4">
                              No cash outflow data available yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="irr-metric-section mt-3">
                  <div className="irr-metric-section-header">
                    <div className="irr-metric-section-title">Means of Finance</div>
                    <div className="irr-metric-section-subtitle">
                      Saved values from Means of Finance Values
                    </div>
                  </div>
                  <div className="table-responsive irr-metric-table-wrap">
                    <table className="table table-sm mb-0 align-middle irr-metric-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th className="text-end">Proposed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meansOfFinanceRows.length > 0 ? (
                          <>
                            {meansOfFinanceRows.map((row) => (
                              <tr key={row.key}>
                                <td className="fw-semibold text-dark">{row.label}</td>
                                <td className="text-end text-dark">
                                  {formatMetricNumber(row.proposed)}
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td className="fw-bold text-dark">Total Cost of Project</td>
                              <td className="text-end fw-bold text-dark">
                                {formatMetricNumber(meansOfFinanceTotals.proposed)}
                              </td>
                            </tr>
                            <tr>
                              <td className="fw-bold text-dark">Total Percentage</td>
                              <td className="text-end fw-bold text-dark">
                                {formatMetricNumber(meansOfFinanceTotalPercentage)}%
                              </td>
                            </tr>
                          </>
                        ) : (
                          <tr>
                            <td colSpan={2} className="text-center text-muted py-4">
                              No means of finance data available yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="irr-metric-section mt-3">
                  <div className="irr-metric-section-header">
                    <div className="irr-metric-section-title">Construction Timeline</div>
                    <div className="irr-metric-section-subtitle">
                      Saved from Cost Details For Proposed FSI
                    </div>
                  </div>
                  <div className="irr-metric-single-value">
                    <div className="irr-metric-single-label">Timeline</div>
                    <div className="irr-metric-single-chip">
                      {constructionTimeline ? `${constructionTimeline} Years` : "No timeline saved yet."}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2 fade-in-up" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3 card-hover-lift" onClick={handleGoBack}>
                <FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaCalculator className="text-primary me-3" />IRR Calculator
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Calculate Internal Rate of Return for your real estate project.</p>
            <div className="irr-scenario-controls ms-1 mt-4">
              <div className="irr-scenario-row">
                {IRR_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    className={`irr-scenario-btn ${selectedScenario === scenario ? "active" : ""}`}
                    onClick={() => setSelectedScenario(scenario)}
                    aria-pressed={selectedScenario === scenario}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
              <div className="d-flex align-items-center flex-wrap gap-2 position-relative mt-3">
                <button
                  type="button"
                  className="irr-run-simulation-btn d-none"
                  onClick={() => setIsSim2PopupOpen(true)}
                >
                  Simulation 2
                </button>
                <button
                  type="button"
                  className="irr-run-simulation-btn"
                  onClick={handleRunSimulation}
                  disabled={simulationLoading}
                >
                  {simulationLoading ? "Running…" : "Run Simulation"}
                </button>
                <button
                  type="button"
                  className="irr-run-simulation-btn"
                  onClick={() => { setIsComparableModalOpen(true); setComparableResult(null); setComparableError(null); }}
                >
                  Find Comparable Projects
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 mt-md-0">
            {/* Optional: Add a top-level action or summary badge here if needed */}
          </div>
        </div>

        {/* IRR Calculation Form */}
        <div className="row justify-content-center mb-5 fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="col-12">
            <IRRCalculationForm
              onCalculate={handleIRRCalculate}
              autofillData={irrFormAutofill}
            />
          </div>
        </div>

        {/* IRR on Permissible and Proposed - Side by Side */}
        <div className="row g-4 fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="col-lg-6">
            <IRROnPermissible />
          </div>
          <div className="col-lg-6">
            <IRROnProposed />
          </div>
        </div>

        <div className="row mt-5 fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="col-12 text-center">
            <button
              className="btn btn-success btn-lg px-5 py-3 rounded-pill shadow-sm fw-semibold card-hover-lift pulse-animation"
              onClick={() => navigate("/irr-comparison")}
            >
              <FaChartBar className="me-2" />
              Compare Scenarios
            </button>
          </div>
        </div>
      </main>

      <style>{`
        .irr-scenario-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
        }

        .irr-scenario-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .irr-scenario-btn,
        .irr-run-simulation-btn {
          border: 1px solid #dbe3ee;
          border-radius: 999px;
          background: #ffffff;
          color: #475569;
          font-size: 14px;
          font-weight: 800;
          line-height: 1;
          min-height: 42px;
          padding: 0 22px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition: all 0.2s ease;
        }

        .irr-scenario-btn.active {
          background: #3f967b;
          border-color: #3f967b;
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(63, 150, 123, 0.24);
        }

        .irr-scenario-btn:hover,
        .irr-run-simulation-btn:hover {
          transform: translateY(-1px);
          border-color: #3f967b;
        }

        .irr-run-simulation-btn {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
          min-width: 190px;
        }

        .irr-metric-list {
          position: absolute;
          top: 18px;
          right: 24px;
          z-index: 10;
          width: min(320px, calc(100vw - 32px));
        }

        .irr-metric-toggle {
          width: 100%;
          border: 1px solid #dbe3ee;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .irr-metric-toggle-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          cursor: pointer;
          user-select: none;
        }

        .irr-metric-title {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin: 0;
        }

        .irr-metric-icon {
          color: #3f967b;
          flex: 0 0 auto;
        }

        .irr-metric-body {
          border-top: 1px solid #e6ebf2;
          min-height: 140px;
          background: #fbfcff;
          padding: 14px;
        }

        .irr-metric-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .irr-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe3ee;
          border-radius: 999px;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
          min-height: 38px;
          padding: 0 14px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition: all 0.2s ease;
        }

        .irr-copy-btn:hover {
          transform: translateY(-1px);
          border-color: #3f967b;
          color: #166534;
        }

        .irr-metric-section {
          border: 1px solid #e5eaf2;
          border-radius: 14px;
          background: #ffffff;
          overflow: hidden;
        }

        .irr-metric-section-header {
          padding: 12px 14px 10px;
          border-bottom: 1px solid #edf1f6;
          background: #f7f9fc;
        }

        .irr-metric-section-title {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .irr-metric-section-subtitle {
          color: #6b7280;
          font-size: 11px;
          margin-top: 2px;
        }

        .irr-metric-table-wrap {
          max-height: 280px;
        }

        .irr-metric-single-value {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
        }

        .irr-metric-single-label {
          color: #6b7280;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .irr-metric-single-chip {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          padding: 10px 14px;
          background: #effaf5;
          border: 1px solid #cfeedd;
          color: #166534;
          font-size: 13px;
          font-weight: 800;
        }

        .irr-metric-table thead th {
          background: #f4f7fb;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e5eaf2;
        }

        .irr-metric-table tbody td {
          font-size: 12px;
          border-color: #edf1f6;
        }

        @media (max-width: 576px) {
          .irr-metric-list {
            position: static;
            width: 100%;
            margin-bottom: 18px;
          }
        }

        .ls-1 { letter-spacing: 1px; }
        .card-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .form-control:focus { box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15); border-color: var(--bs-primary) !important; }
        
        /* Animation Classes */
        .fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pulse-animation {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(25, 135, 84, 0); }
          100% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
        }

        /* Scrollbar styling for tables */
        .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-responsive::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-responsive::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Table Row Hover */
        .table-hover tbody tr {
          transition: background-color 0.2s ease;
        }
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
      `}</style>

      <CashflowSimulationModal
        isOpen={isSimulationModalOpen}
        onClose={handleCloseSimulationModal}
        isLoading={simulationLoading}
        result={simulationResult}
        error={simulationError}
        inputPayload={simulationInputPayload}
        tokenLedger={simulationTokenLedger}
      />

      {isSim2PopupOpen && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  Simulation 2
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setIsSim2PopupOpen(false)}
                  disabled={sim2Loading}
                />
              </div>
              <div className="modal-body pt-3 pb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <p className="text-secondary mb-0">Run the second simulation analysis.</p>

                  {/* P1 / P2 Slider Toggle */}
                  <div className="d-flex align-items-center bg-light rounded-pill p-1 border shadow-sm" style={{ width: "fit-content" }}>
                    <button
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-bold ${sim2PromptVersion === 'p1' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border-0'}`}
                      style={{ transition: 'all 0.2s', zIndex: 1 }}
                      onClick={() => setSim2PromptVersion('p1')}
                    >
                      P1
                    </button>
                    <button
                      className={`btn btn-sm rounded-pill px-3 py-1 fw-bold ${sim2PromptVersion === 'p2' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border-0'}`}
                      style={{ transition: 'all 0.2s', zIndex: 1 }}
                      onClick={() => setSim2PromptVersion('p2')}
                    >
                      P2
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-end mb-4">
                  <button
                    type="button"
                    className="btn btn-primary rounded-pill px-4"
                    onClick={handleRunSimulation2}
                    disabled={sim2Loading}
                  >
                    {sim2Loading ? "Running..." : "Run"}
                  </button>
                </div>

                {sim2Loading && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}

                {sim2Error && (
                  <div className="alert alert-danger" role="alert">
                    {sim2Error}
                  </div>
                )}

                {sim2Result && (
                  <div className="bg-light p-3 rounded" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="fw-bold text-dark">Raw Output</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                        onClick={() => setIsSim2RawOutputVisible(!isSim2RawOutputVisible)}
                      >
                        {isSim2RawOutputVisible ? "Collapse" : "Expand"}
                      </button>
                    </div>
                    {isSim2RawOutputVisible && (
                      <div className="bg-white p-3 rounded border mb-3">
                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.85rem", margin: 0, color: "white" }}>
                          {sim2Result}
                        </pre>
                      </div>
                    )}

                    <hr className="my-4 text-muted" />

                    <div className="mb-4">
                      <p className="fw-bold text-dark mb-3">Select Scenario for AutoFill:</p>
                      <div className="btn-group w-100 shadow-sm" role="group">
                        {["Optimistic", "Most Probable", "Pessimistic"].map((scen) => (
                          <button
                            key={scen}
                            type="button"
                            className={`btn ${selectedScenario === scen ? 'btn-primary fw-bold' : 'btn-outline-primary'}`}
                            onClick={() => setSelectedScenario(scen)}
                          >
                            {scen}
                          </button>
                        ))}
                      </div>
                    </div>

                    {parsedSim2Data && Object.keys(parsedSim2Data[selectedScenario]?.data || {}).length > 0 && (
                      <div className="mt-4 mb-4">
                        <h6 className="fw-bold text-dark mb-3">{selectedScenario} Cashflow Projection</h6>
                        <div className="table-responsive shadow-sm rounded border">
                          <table className="table table-hover table-striped mb-0 text-center align-middle">
                            <thead className="bg-light">
                              <tr>
                                {Object.keys(parsedSim2Data[selectedScenario].data).map(year => (
                                  <th key={year} className="text-capitalize px-3 py-2 text-secondary" style={{ whiteSpace: "nowrap", fontSize: "0.9rem" }}>{year}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {Object.values(parsedSim2Data[selectedScenario].data).map((val, idx) => (
                                  <td key={idx} className="px-3 py-3 fw-medium text-dark" style={{ fontSize: "0.95rem" }}>{val.toFixed(2)}%</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 text-start">
                          <span className="badge bg-secondary bg-opacity-10 text-dark border border-secondary border-opacity-25 px-3 py-2 fs-6 rounded-pill">
                            Total years required to sellout: <span className="fw-bold text-primary">{parsedSim2Data[selectedScenario].maxYear}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-end">
                      <button
                        type="button"
                        className="btn btn-success btn-lg rounded-pill px-5 shadow-sm fw-bold card-hover-lift"
                        onClick={handleAutoFill}
                      >
                        AutoFill
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Find Comparable Projects Modal */}
      {isComparableModalOpen && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  🔍 Project Analysis
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setIsComparableModalOpen(false)}
                  disabled={comparableLoading}
                />
              </div>

              <div className="modal-body pt-3 pb-4">
                <div className="row h-100">
                  {/* Sidebar */}
                  <div className="col-md-3 border-end">
                    <div className="nav flex-column nav-pills" role="tablist" aria-orientation="vertical">
                      <button
                        className={`nav-link text-start fw-semibold mb-2 ${activeComparableTab === "Comparable projects" ? "active" : ""}`}
                        onClick={() => setActiveComparableTab("Comparable projects")}
                        type="button"
                        style={activeComparableTab === "Comparable projects" ? { backgroundColor: "#198754", color: "white" } : { color: "#495057" }}
                      >
                        Comparable projects
                      </button>
                      <button
                        className={`nav-link text-start fw-semibold mb-2 ${activeComparableTab === "Sales velocity" ? "active" : ""}`}
                        onClick={() => setActiveComparableTab("Sales velocity")}
                        type="button"
                        style={activeComparableTab === "Sales velocity" ? { backgroundColor: "#198754", color: "white" } : { color: "#495057" }}
                      >
                        Sales velocity
                      </button>
                      <button
                        className={`nav-link text-start fw-semibold mb-2 ${activeComparableTab === "Cash Inflow Simulation" ? "active" : ""}`}
                        onClick={() => setActiveComparableTab("Cash Inflow Simulation")}
                        type="button"
                        disabled={!salesVelocityData}
                        style={{
                          ...(activeComparableTab === "Cash Inflow Simulation" ? { backgroundColor: "#198754", color: "white" } : { color: "#495057" }),
                          ...(!salesVelocityData ? { opacity: 0.5, cursor: "not-allowed" } : {})
                        }}
                      >
                        Cash Inflow Simulation
                        {!salesVelocityData && <i className="bi bi-lock-fill float-end text-muted mt-1"></i>}
                      </button>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="col-md-9 ps-4">
                    {activeComparableTab === "Comparable projects" && (
                      <div>
                        <p className="text-dark mb-4">
                          Searches for under-construction real estate projects within a <strong>1km radius</strong> using your saved project coordinates.
                        </p>

                        {/* Coordinates preview */}
                        {(() => {
                          const lfStr = typeof window !== 'undefined' ? localStorage.getItem("landDetailsForm") : null;
                          const lf = lfStr ? JSON.parse(lfStr) : {};
                          const latRaw = lf.latitude;
                          const lngRaw = lf.longitude;
                          const lat = parseFloat(latRaw);
                          const lng = parseFloat(lngRaw);
                          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                            return (
                              <div className="d-flex gap-3 mb-4">
                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fs-6">
                                  📍 Lat: <strong>{latRaw}</strong>
                                </span>
                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fs-6">
                                  📍 Lng: <strong>{lngRaw}</strong>
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="alert alert-warning rounded-3 mb-4">
                              ⚠️ No coordinates saved. Please fill in Latitude &amp; Longitude in the Land Details form first.
                            </div>
                          );
                        })()}

                        {/* Find button */}
                        <div className="d-flex justify-content-end mb-4 align-items-center">
                          {comparableProjects && comparableProjects.length === 0 && (
                            <div className="text-danger fw-semibold me-3 small bg-danger bg-opacity-10 px-3 py-1 rounded-pill border border-danger border-opacity-25 shadow-sm">
                              ⚠️ No Comparable projects found. Please increase the area.
                            </div>
                          )}
                          <select
                            className="form-select form-select-sm rounded-pill me-3 shadow-sm border-secondary"
                            style={{ width: "auto", minWidth: "90px" }}
                            value={searchRadius}
                            onChange={(e) => setSearchRadius(Number(e.target.value))}
                            disabled={comparableLoading}
                          >
                            <option value={1}>1km</option>
                            <option value={2}>2km</option>
                            <option value={3}>3km</option>
                            <option value={4}>4km</option>
                            <option value={5}>5km</option>
                          </select>
                          <button
                            type="button"
                            className="btn btn-primary rounded-pill px-5 fw-bold shadow-sm"
                            onClick={handleFindComparables}
                            disabled={comparableLoading}
                            style={{ transition: "transform 0.15s", minWidth: 180 }}
                          >
                            {comparableLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                Searching…
                              </>
                            ) : "Find Comparables"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm ms-2 rounded-pill shadow-sm"
                            onClick={handleSaveComparableCache}
                            disabled={!comparableProjects}
                            title="Save to Cache"
                          >
                            💾 Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm ms-2 rounded-pill shadow-sm"
                            onClick={handleClearComparableCache}
                            title="Clear Cache"
                          >
                            🗑️ Clear
                          </button>
                        </div>

                        {/* Error */}
                        {comparableError && (
                          <div className="alert alert-danger rounded-3">
                            ❌ {comparableError}
                          </div>
                        )}

                        {/* Results */}
                        {(comparableResult || comparableProjects) && (
                          <div className="mt-2">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div className="d-flex align-items-center">
                                <h6 className="fw-bold text-dark mb-0 me-2">Comparable Projects</h6>
                                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: "0.75rem" }}>
                                  Web Search + Maps API
                                </span>
                              </div>

                              {/* Project Filter Toggle */}
                              {comparableProjects && comparableProjects.length > 0 && (
                                <div className="btn-group shadow-sm" role="group" aria-label="Project filter">
                                  <input
                                    type="radio"
                                    className="btn-check"
                                    name="btnradio"
                                    id="btnradio1"
                                    autoComplete="off"
                                    checked={activeProjectTab === "under_construction"}
                                    onChange={() => setActiveProjectTab("under_construction")}
                                  />
                                  <label className={`btn btn-sm ${activeProjectTab === "under_construction" ? 'btn-primary' : 'btn-outline-primary'}`} htmlFor="btnradio1">
                                    Under Construction
                                  </label>

                                  <input
                                    type="radio"
                                    className="btn-check"
                                    name="btnradio"
                                    id="btnradio2"
                                    autoComplete="off"
                                    checked={activeProjectTab === "other"}
                                    onChange={() => setActiveProjectTab("other")}
                                  />
                                  <label className={`btn btn-sm ${activeProjectTab === "other" ? 'btn-primary' : 'btn-outline-primary'}`} htmlFor="btnradio2">
                                    Other Projects
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Structured table (when JSON parsed successfully) */}
                            {comparableProjects && comparableProjects.length > 0 ? (() => {
                              const filteredProjects = comparableProjects.filter(p =>
                                activeProjectTab === "under_construction"
                                  ? p.status?.toLowerCase().includes("under construction")
                                  : !p.status?.toLowerCase().includes("under construction")
                              );
                              return (
                                <div>
                                  <div className="table-responsive rounded-3 border shadow-sm" style={{ maxHeight: 400, overflowY: "auto" }}>
                                    <table className="table table-hover table-striped align-middle mb-0" style={{ fontSize: "0.9rem" }}>
                                      <thead style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", color: "#e2e8f0", position: "sticky", top: 0 }}>
                                        <tr>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>#</th>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Project Name</th>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Status</th>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>BHK Type</th>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Location</th>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Expected Possession</th>
                                          <th className="px-4 py-3" style={{ fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Coordinates</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredProjects.length > 0 ? filteredProjects.map((p, i) => (
                                          <tr key={i}>
                                            <td className="px-4 py-3 text-muted fw-medium">{i + 1}</td>
                                            <td className="px-4 py-3 fw-semibold text-dark">{p.projectName || "—"}</td>
                                            <td className="px-4 py-3">
                                              <span className={`badge ${p.status?.toLowerCase().includes("under construction") ? 'bg-info text-dark' : 'bg-secondary'} bg-opacity-10 border px-2 py-1 rounded-pill`}>
                                                {p.status || "Unknown"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-2">
                                                {p.bhkType || "—"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-dark">{p.location || "—"}</td>
                                            <td className="px-4 py-3">
                                              <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill px-2">
                                                {p.expectedPossessionDate || "N/A"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              {p.coordinates && p.coordinates !== "Not specified" && !p.coordinates.includes("not configured") ? (() => {
                                                const parts = p.coordinates.split(",").map(s => s.trim());
                                                const mapsUrl = parts.length === 2
                                                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.coordinates)}`
                                                  : null;
                                                return mapsUrl ? (
                                                  <a
                                                    href={mapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Open in Google Maps"
                                                    style={{ textDecoration: "none" }}
                                                  >
                                                    <code style={{
                                                      fontSize: "0.78rem",
                                                      background: "#f0f4ff",
                                                      color: "#3730a3",
                                                      padding: "2px 6px",
                                                      borderRadius: 4,
                                                      whiteSpace: "nowrap",
                                                      cursor: "pointer",
                                                      borderBottom: "1px dashed #3730a3",
                                                      transition: "background 0.15s",
                                                    }}>
                                                      📍 {p.coordinates}
                                                    </code>
                                                  </a>
                                                ) : (
                                                  <code style={{ fontSize: "0.78rem", background: "#f0f4ff", color: "#3730a3", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                                                    {p.coordinates}
                                                  </code>
                                                );
                                              })() : (
                                                <span className="text-muted" style={{ fontSize: "0.82rem" }}>—</span>
                                              )}
                                            </td>
                                          </tr>
                                        )) : (
                                          <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted">
                                              No projects match this category.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                  {comparableProviderStats && (
                                    <div className="d-flex justify-content-end mt-2">
                                      <div
                                        style={{
                                          fontSize: "0.72rem",
                                          color: "#6b7280",
                                          background: "#f9fafb",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: 6,
                                          padding: "4px 10px",
                                          letterSpacing: "0.01em",
                                        }}
                                      >
                                        Data via:
                                        {comparableProviderStats["SerpApi"] > 0 && (
                                          <span style={{ marginLeft: 6, color: "#1d4ed8", fontWeight: 600 }}>
                                            SerpApi ({comparableProviderStats["SerpApi"]})
                                          </span>
                                        )}
                                        {comparableProviderStats["Tavily"] > 0 && (
                                          <span style={{ marginLeft: 6, color: "#059669", fontWeight: 600 }}>
                                            Tavily ({comparableProviderStats["Tavily"]})
                                          </span>
                                        )}
                                        {comparableProviderStats["AI-Memory"] > 0 && (
                                          <span style={{ marginLeft: 6, color: "#9ca3af", fontWeight: 600 }}>
                                            AI Memory ({comparableProviderStats["AI-Memory"]})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })() : comparableResult ? (
                              /* Fallback: markdown render when JSON parsing failed */
                              <div
                                className="p-4 rounded-3 border comparable-md-output"
                                style={{
                                  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                                  color: "#e2e8f0",
                                  fontFamily: "Inter, system-ui, sans-serif",
                                  fontSize: "0.92rem",
                                  lineHeight: "1.75",
                                  maxHeight: 420,
                                  overflowY: "auto",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: comparableResult
                                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/__(.+?)__/g, '<strong>$1</strong>')
                                    .replace(/`([^`]+)`/g, '<code style="background:#2d3748;padding:1px 5px;border-radius:3px;font-size:0.85em">$1</code>')
                                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#63b3ed;text-decoration:underline">$1</a>')
                                    .replace(/^### (.+)$/gm, '<h6 style="color:#90cdf4;font-weight:700;margin-top:12px">$1</h6>')
                                    .replace(/^## (.+)$/gm, '<h5 style="color:#90cdf4;font-weight:700;margin-top:14px">$1</h5>')
                                    .replace(/^# (.+)$/gm, '<h4 style="color:#bee3f8;font-weight:800;margin-top:16px">$1</h4>')
                                    .replace(/^[*-] (.+)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
                                    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal">$1</li>')
                                    .replace(/\n/g, '<br/>')
                                }}
                              />
                            ) : null}

                            {/* Token Ledger */}
                            {comparableTokenUsage && (
                              <div className="mt-3">
                                <button
                                  className="btn btn-sm btn-outline-secondary rounded-pill fw-semibold px-3 d-inline-flex align-items-center"
                                  onClick={() => setIsComparableLedgerOpen(!isComparableLedgerOpen)}
                                  style={{ fontSize: "0.8rem", transition: "all 0.2s" }}
                                >
                                  Token Ledger
                                  <span style={{
                                    display: "inline-block",
                                    marginLeft: "6px",
                                    transform: isComparableLedgerOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s"
                                  }}>
                                    ▼
                                  </span>
                                </button>

                                <div style={{
                                  maxHeight: isComparableLedgerOpen ? "200px" : "0",
                                  overflow: "hidden",
                                  transition: "max-height 0.3s ease-in-out",
                                  opacity: isComparableLedgerOpen ? 1 : 0,
                                }}>
                                  <div className="card card-body bg-light border-0 shadow-sm rounded-4 mt-2 p-3">
                                    <h6 className="fw-bold text-secondary mb-3 pb-2 border-bottom border-secondary border-opacity-25" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                      Usage Statistics
                                    </h6>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div className="d-flex flex-column align-items-center bg-white rounded-3 p-2 shadow-sm flex-grow-1 mx-1 border border-light">
                                        <span className="text-muted fw-semibold" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Prompt</span>
                                        <span className="fw-bold text-dark fs-6">{comparableTokenUsage.input_tokens || 0}</span>
                                      </div>
                                      <div className="d-flex flex-column align-items-center bg-white rounded-3 p-2 shadow-sm flex-grow-1 mx-1 border border-light">
                                        <span className="text-muted fw-semibold" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Completion</span>
                                        <span className="fw-bold text-dark fs-6">{comparableTokenUsage.output_tokens || 0}</span>
                                      </div>
                                      <div className="d-flex flex-column align-items-center bg-white rounded-3 p-2 shadow-sm flex-grow-1 mx-1 border border-primary border-opacity-25" style={{ backgroundColor: "#f0f4ff" }}>
                                        <span className="text-primary fw-bold" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Total</span>
                                        <span className="fw-bold text-primary fs-5">{comparableTokenUsage.total_tokens || 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeComparableTab === "Sales velocity" && (
                      <div className="w-100">
                        {!comparableProjects || comparableProjects.length === 0 ? (
                          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted" style={{ minHeight: "300px" }}>
                            <div className="fs-1 mb-3">📊</div>
                            <h5 className="fw-bold text-secondary">Complete Comparable Search First</h5>
                            <p className="text-center w-75">Please complete the Comparable Projects search first to enable Sales Velocity analysis.</p>
                          </div>
                        ) : (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <h6 className="fw-bold text-dark m-0">Sales Velocity Analysis</h6>
                              <div className="d-flex align-items-center">
                                <button
                                  className="btn btn-primary btn-sm px-4 fw-bold shadow-sm"
                                  onClick={handleFetchSalesVelocity}
                                  disabled={salesVelocityLoading}
                                >
                                  {salesVelocityLoading ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Fetching...</>
                                  ) : (
                                    <><i className="bi bi-cloud-download me-2"></i>Fetch Velocity</>
                                  )}
                                </button>
                                <button
                                  className="btn btn-outline-success btn-sm ms-2 shadow-sm rounded-pill"
                                  onClick={handleSaveSalesVelocityCache}
                                  disabled={!salesVelocityData}
                                  title="Save to Cache"
                                >
                                  💾 Save
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm ms-2 shadow-sm rounded-pill"
                                  onClick={handleClearSalesVelocityCache}
                                  title="Clear Cache"
                                >
                                  🗑️ Clear
                                </button>
                              </div>
                            </div>

                            {salesVelocityError && (
                              <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-25 py-2 px-3 d-flex align-items-center mb-3">
                                <i className="bi bi-exclamation-circle-fill text-danger me-2"></i>
                                <span className="text-danger" style={{ fontSize: "0.9rem" }}>{salesVelocityError}</span>
                              </div>
                            )}

                            {salesVelocityData && salesVelocityData.velocity_data && (() => {
                              // Build a quick status lookup from comparableProjects by project name
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
                                  <div className="table-responsive bg-white rounded-3 border border-secondary border-opacity-25 shadow-sm">
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

                    {activeComparableTab === "Cash Inflow Simulation" && (
                      <div className="h-100 d-flex flex-column" style={{ minHeight: "400px" }}>
                        {!cashInflowSimResult ? (
                          <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-muted">
                            <div className="fs-1 mb-3">💸</div>
                            <h5 className="fw-bold text-secondary">Cash Inflow Simulation</h5>
                            <p className="text-center w-75 mb-4">
                              Ready to predict the cash inflow schedule for your subject project using the {selectedSalesVelocityProjects.size} selected comparable projects.
                            </p>

                            {cashInflowSimError && (
                              <div className="alert alert-danger w-75 mb-4" role="alert">
                                {cashInflowSimError}
                              </div>
                            )}

                            <button
                              className="btn btn-success btn-lg px-5 rounded-pill shadow-sm fw-bold"
                              onClick={handleRunCashInflowSimulation}
                              disabled={cashInflowSimLoading || selectedSalesVelocityProjects.size === 0}
                            >
                              {cashInflowSimLoading ? (
                                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Simulating...</>
                              ) : (
                                <><i className="bi bi-play-fill me-2"></i>Run Simulation</>
                              )}
                            </button>
                            {selectedSalesVelocityProjects.size === 0 && (
                              <small className="text-danger mt-2">Please select at least one comparable project in the Sales Velocity tab.</small>
                            )}
                          </div>
                        ) : (
                          <div className="d-flex flex-column h-100">
                            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                              <h5 className="fw-bold text-dark m-0">Simulation Results</h5>
                              <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => setCashInflowSimResult(null)}>
                                <i className="bi bi-arrow-counterclockwise me-1"></i>Reset
                              </button>
                            </div>

                            <div className="btn-group w-100 shadow-sm mb-4" role="group">
                              {["Optimistic", "Most Probable", "Pessimistic", "User Cashflow", "Raw Output"].map((scen) => (
                                <button
                                  key={scen}
                                  type="button"
                                  className={`btn ${activeInflowScenario === scen ? 'btn-primary fw-bold' : 'btn-outline-primary'}`}
                                  onClick={() => setActiveInflowScenario(scen)}
                                >
                                  {scen}
                                </button>
                              ))}
                            </div>

                            {activeInflowScenario === "Raw Output" ? (
                              <div className="bg-dark p-3 rounded border" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.85rem", margin: 0, color: "#f8f9fa" }}>
                                  {cashInflowSimResult}
                                </pre>
                              </div>
                            ) : activeInflowScenario === "User Cashflow" ? (
                              (() => {
                                const totalPct = userCashflowRows.reduce((sum, r) => {
                                  const v = parseFloat(r.percentage);
                                  return sum + (isNaN(v) ? 0 : v);
                                }, 0);
                                const totalDisplay = totalPct.toFixed(2);
                                const isOver100 = totalPct > 100;
                                const isUnder100 = totalPct < 100 && userCashflowRows.some(r => r.percentage !== "");
                                const isExact100 = Math.abs(totalPct - 100) < 0.01;
                                return (
                                  <div>
                                    <div className="table-responsive bg-white rounded border shadow-sm" style={{ maxHeight: "340px", overflowY: "auto" }}>
                                      <table className="table table-hover table-bordered mb-0 align-middle text-center">
                                        <thead className="table-dark" style={{ position: "sticky", top: 0 }}>
                                          <tr>
                                            <th className="py-3" style={{ width: "40%" }}>Year</th>
                                            <th className="py-3">Projected Sales Percentage (%)</th>
                                            <th className="py-3" style={{ width: "60px" }}></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {userCashflowRows.map((row, idx) => (
                                            <tr key={idx}>
                                              <td className="fw-bold text-dark">{row.year}</td>
                                              <td>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  max="100"
                                                  className="form-control form-control-sm text-center mx-auto"
                                                  style={{ width: "110px", borderColor: "#dee2e6" }}
                                                  placeholder="0.00"
                                                  value={row.percentage}
                                                  onChange={(e) => {
                                                    const updated = [...userCashflowRows];
                                                    updated[idx] = { ...updated[idx], percentage: e.target.value };
                                                    setUserCashflowRows(updated);
                                                  }}
                                                />
                                              </td>
                                              <td>
                                                {userCashflowRows.length > 1 && (
                                                  <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger rounded-circle"
                                                    style={{ width: 28, height: 28, padding: 0, lineHeight: "26px", fontSize: "1rem" }}
                                                    onClick={() => {
                                                      setUserCashflowRows(userCashflowRows.filter((_, i) => i !== idx));
                                                    }}
                                                    title="Remove row"
                                                  >
                                                    ×
                                                  </button>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Add row + Total */}
                                    <div className="d-flex align-items-center justify-content-between mt-3">
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-semibold"
                                        onClick={() => {
                                          const nextYear = userCashflowRows.length;
                                          setUserCashflowRows([...userCashflowRows, { year: `Year ${nextYear}`, percentage: "" }]);
                                        }}
                                      >
                                        + Add Year
                                      </button>

                                      <div className="d-flex align-items-center gap-2">
                                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Total:</span>
                                        <span
                                          className={`fw-bold fs-6 ${isExact100 ? "text-success" : isOver100 ? "text-danger" : "text-warning"}`}
                                        >
                                          {totalDisplay}%
                                        </span>
                                        {isOver100 && (
                                          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: "0.75rem" }}>
                                            ⚠️ Exceeds 100%
                                          </span>
                                        )}
                                        {isUnder100 && (
                                          <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: "0.75rem" }}>
                                            ⚠️ Does not sum to 100%
                                          </span>
                                        )}
                                        {isExact100 && (
                                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: "0.75rem" }}>
                                            ✓ Valid
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-3 text-end">
                                      <button
                                        className="btn btn-success fw-bold px-4"
                                        onClick={handleApplyUserCashflow}
                                        disabled={userCashflowRows.every(r => r.percentage === "")}
                                      >
                                        <i className="bi bi-check2-circle me-2"></i>
                                        Apply User Cashflow
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="table-responsive bg-white rounded border shadow-sm" style={{ maxHeight: "400px" }}>
                                <table className="table table-hover table-bordered mb-0 align-middle text-center">
                                  <thead className="table-dark" style={{ position: "sticky", top: 0 }}>
                                    <tr>
                                      <th className="py-3">Year</th>
                                      <th className="py-3">Projected Sales Percentage</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parsedInflowResult?.[activeInflowScenario]?.length > 0 ? (
                                      parsedInflowResult[activeInflowScenario].map((row, idx) => (
                                        <tr key={idx}>
                                          <td className="fw-bold">{row.year}</td>
                                          <td className="text-primary fw-semibold">{row.percentage}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="2" className="py-4 text-muted">Failed to parse table data. Please view Raw Output.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activeInflowScenario !== "Raw Output" && activeInflowScenario !== "User Cashflow" && (
                              <div className="mt-3 text-end">
                                <button
                                  className="btn btn-success fw-bold px-4"
                                  onClick={handleApplyInflowScenario}
                                  disabled={!parsedInflowResult?.[activeInflowScenario] || parsedInflowResult[activeInflowScenario].length === 0}
                                >
                                  <i className="bi bi-check2-circle me-2"></i>
                                  Apply {activeInflowScenario} Scenario
                                </button>
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

export default IRR;
