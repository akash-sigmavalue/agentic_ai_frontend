import React, { useEffect, useState, useCallback } from "react";
import { FaPlus, FaTrash, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const FIXED_FINANCE_ROWS = [
  {
    key: "promoterEquityUnsecuredLoan",
    label: "Promoter Equity",
    description: "Capital contributed directly by the project promoters, partners, or equity investors, including interest-free unsecured loans.",
    isCustom: false,
  },
  {
    key: "bankFinance",
    label: "Bank & Debt Finance",
    description: "Debt financing secured from commercial banks, financial institutions, or NBFCs to fund project construction and capital costs.",
    isCustom: false,
  },
  {
    key: "salesCollection",
    label: "Customer Advances",
    description: "Revenue generated from early customer bookings, milestone payments, and advance sales receipts to fund ongoing project cash flows.",
    isCustom: false,
  },
];

const COST_KEYS = [
  "landCost",
  "approvalCost",
  "constructionCost",
  "administrativeCost",
  "ancillaryCost",
  "tdrCost",
  "premiumCost",
  "marketingCost",
  "contingencyCost",
  "financeCost",
  "miscellaneousCost",
];

const getScenarioColor = (index) => {
  const colors = ["#448C74", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6"];
  return colors[index % colors.length];
};

const MeansOfFinance = () => {
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [costProjectData, setCostProjectData] = useState(null);
  const [meansOfFinanceScenarioData, setMeansOfFinanceScenarioData] = useState({});
  
  const [currency, setCurrency] = useState("₹");
  const [formData, setFormData] = useState({});
  const [amountData, setAmountData] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [costTotalsFallback, setCostTotalsFallback] = useState({ permissible: 0, proposed: 0 });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDesc, setNewFieldDesc] = useState("");

  const getCurrencyFromStorage = () => {
    try {
      const savedLand = localStorage.getItem("Land Identification");
      if (savedLand) {
        const parsed = JSON.parse(savedLand);
        const c = parsed.currency || parsed.currency_symbol;
        if (c) return c === "INR" ? "₹" : c;
      }
      const savedLandForm = localStorage.getItem("landDetailsForm");
      if (savedLandForm) {
        const parsed = JSON.parse(savedLandForm);
        const c = parsed.currency || parsed.currency_symbol;
        if (c) return c === "INR" ? "₹" : c;
      }
    } catch (e) {}
    return "₹";
  };

  // Load all scenario & cost data from localStorage
  const loadData = useCallback(() => {
    // 0. Load Currency
    setCurrency(getCurrencyFromStorage());

    // 1. Load Scenarios
    let loadedScenarios = [];
    let currentActiveId = null;
    try {
      const savedScenarios = localStorage.getItem("ProductMixScenarios");
      if (savedScenarios) {
        const parsed = JSON.parse(savedScenarios);
        if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
          loadedScenarios = parsed.scenarios;
          setScenarios(loadedScenarios);
          currentActiveId = parsed.activeScenarioId || (loadedScenarios.length > 0 ? loadedScenarios[0].id : null);
        }
      }
    } catch (e) {}

    setActiveScenarioId((prev) => {
      const targetId = currentActiveId || prev;
      return targetId && loadedScenarios.some((s) => s.id === targetId) ? targetId : null;
    });

    // 2. Load CostProjectDetailsV1 Payload
    try {
      const savedCostState = localStorage.getItem("CostProjectDetailsV1");
      if (savedCostState) {
        setCostProjectData(JSON.parse(savedCostState));
      }
    } catch (e) {}

    // 3. Load MeansOfFinanceV1 Scenario Data
    let loadedMeansMap = {};
    try {
      const savedMeans = localStorage.getItem("MeansOfFinanceV1");
      if (savedMeans) {
        loadedMeansMap = JSON.parse(savedMeans) || {};
        setMeansOfFinanceScenarioData(loadedMeansMap);
      }
    } catch (e) {}

    // 4. Load Fallback calculatedCostValues
    try {
      const savedCalculated = localStorage.getItem("calculatedCostValues");
      if (savedCalculated) {
        const parsed = JSON.parse(savedCalculated);
        const getSum = (costData = {}) =>
          COST_KEYS.reduce((tot, k) => tot + (parseFloat(costData?.[k]) || 0), 0);
        setCostTotalsFallback({
          permissible: getSum(parsed.permissible),
          proposed: getSum(parsed.proposed),
        });
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("productMixScenariosUpdated", loadData);
    window.addEventListener("costProjectDetailsUpdated", loadData);
    window.addEventListener("costFormUpdated", loadData);
    window.addEventListener("storage", loadData);

    return () => {
      window.removeEventListener("productMixScenariosUpdated", loadData);
      window.removeEventListener("costProjectDetailsUpdated", loadData);
      window.removeEventListener("costFormUpdated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, [loadData]);

  // Synchronize active scenario data whenever activeScenarioId changes
  const lastSyncedScenario = React.useRef(null);

  useEffect(() => {
    if (!activeScenarioId) {
      // Load fallback legacy values if no scenarios exist
      try {
        const savedData = localStorage.getItem("meansOfFinanceData");
        const parsedData = savedData ? JSON.parse(savedData) : {};
        setFormData(prev => JSON.stringify(prev) === JSON.stringify(parsedData) ? prev : parsedData);
      } catch (e) {}

      try {
        const savedCustom = localStorage.getItem("meansOfFinanceCustomFields");
        const parsedCustom = savedCustom ? JSON.parse(savedCustom) : [];
        setCustomFields(prev => JSON.stringify(prev) === JSON.stringify(parsedCustom) ? prev : parsedCustom);
      } catch (e) {}
      return;
    }

    const scenarioMeans = meansOfFinanceScenarioData[activeScenarioId];
    if (scenarioMeans) {
      if (lastSyncedScenario.current !== activeScenarioId) {
        setFormData(scenarioMeans.formData || {});
        setCustomFields(scenarioMeans.customFields || []);
        lastSyncedScenario.current = activeScenarioId;
      }
    } else {
      if (lastSyncedScenario.current !== activeScenarioId) {
        // Try fallback to legacy flat keys if scenario-specific entry not created yet
        try {
          const savedData = localStorage.getItem("meansOfFinanceData");
          const savedCustom = localStorage.getItem("meansOfFinanceCustomFields");
          const parsedData = savedData ? JSON.parse(savedData) : {};
          const parsedCustom = savedCustom ? JSON.parse(savedCustom) : [];
          setFormData(parsedData);
          setCustomFields(parsedCustom);
        } catch (e) {
          setFormData({});
          setCustomFields([]);
        }
        // Do NOT set lastSyncedScenario.current here, so that when scenarioMeans arrives from localStorage, it can sync.
        // However, if the user starts typing, auto-save will create scenarioMeans, and it will sync once and set the ref.
      }
    }
  }, [activeScenarioId, meansOfFinanceScenarioData]);

  // Helper to extract Total Project Cost from CostProjectDetailsV1 payload for a given scenario
  const getScenarioTotalProjectCost = useCallback(
    (scenarioId) => {
      const targetId = scenarioId || activeScenarioId;
      if (costProjectData && targetId && costProjectData[targetId]) {
        const sData = costProjectData[targetId];
        if (typeof sData.totalProjectCost === "number" && sData.totalProjectCost > 0) {
          return sData.totalProjectCost;
        }
        const fixedSum = Object.values(sData.fixedInputs || {}).reduce(
          (acc, val) => acc + (parseFloat(val) || 0),
          0
        );
        const customSum = (sData.customFields || []).reduce(
          (acc, field) => acc + (parseFloat(field.value) || 0),
          0
        );
        const total = fixedSum + customSum;
        if (total > 0) return total;
      }
      return costTotalsFallback.proposed || 0;
    },
    [costProjectData, activeScenarioId, costTotalsFallback]
  );

  const activeTotalProjectCost = getScenarioTotalProjectCost(activeScenarioId);

  const handleScenarioSelect = (id) => {
    setActiveScenarioId(id);
    try {
      const saved = localStorage.getItem("ProductMixScenarios");
      let parsed = { scenarios, activeScenarioId: id };
      if (saved) {
        parsed = JSON.parse(saved);
        parsed.activeScenarioId = id;
      }
      localStorage.setItem("ProductMixScenarios", JSON.stringify(parsed));
      window.dispatchEvent(new Event("productMixScenariosUpdated"));
    } catch (e) {}
  };

  const allRows = [
    ...FIXED_FINANCE_ROWS,
    ...customFields.map((f) => ({
      key: f.key,
      label: f.name,
      description: f.description,
      isCustom: true,
      id: f.id,
    })),
  ];

  const getTotalPercentage = (values = formData) =>
    allRows.reduce(
      (total, row) => total + (parseFloat(values[row.key]) || 0),
      0
    );

  const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.round(parseFloat(value) || 0)
    );

  const formatCurrencyShort = (value) => {
    const num = parseFloat(value) || 0;
    if (!num) return `${currency} 0`;
    if (currency === "₹" || currency === "INR") {
      if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
      if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
      return `₹ ${new Intl.NumberFormat("en-IN").format(Math.round(num))}`;
    }
    return `${currency} ${new Intl.NumberFormat("en-US").format(Math.round(num))}`;
  };

  const getFinanceValue = (percentage, totalCost) =>
    ((parseFloat(percentage) || 0) / 100) * (parseFloat(totalCost) || 0);

  // Bi-directional Handlers for Percentage and Amount
  const handlePercentageChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    const percNum = parseFloat(value);
    if (!isNaN(percNum) && activeTotalProjectCost > 0) {
      const amt = (percNum / 100) * activeTotalProjectCost;
      setAmountData((prev) => ({ ...prev, [key]: formatNumber(amt) }));
    } else if (value === "") {
      setAmountData((prev) => ({ ...prev, [key]: "" }));
    }
    if (error) setError("");
  };

  const handleAmountChange = (key, rawValue) => {
    const cleanVal = rawValue.replace(/[^0-9.]/g, "");
    setAmountData((prev) => ({ ...prev, [key]: rawValue }));

    const numAmt = parseFloat(cleanVal);
    if (!isNaN(numAmt) && activeTotalProjectCost > 0) {
      const calculatedPerc = (numAmt / activeTotalProjectCost) * 100;
      const formattedPerc = Number.isInteger(calculatedPerc)
        ? String(calculatedPerc)
        : calculatedPerc.toFixed(2);
      setFormData((prev) => ({ ...prev, [key]: formattedPerc }));
    } else if (rawValue === "") {
      setFormData((prev) => ({ ...prev, [key]: "" }));
    }
    if (error) setError("");
  };

  const handleAmountBlur = (key) => {
    const currentVal = amountData[key];
    if (!currentVal) return;
    const num = parseFloat(currentVal.replace(/[^0-9.]/g, "")) || 0;
    if (num > 0) {
      setAmountData((prev) => ({ ...prev, [key]: formatNumber(num) }));
    }
  };

  // Sync Amount Data from Percentage & Active Total Project Cost
  useEffect(() => {
    if (activeTotalProjectCost > 0 && Object.keys(formData).length > 0) {
      const syncedAmounts = {};
      allRows.forEach((row) => {
        const perc = parseFloat(formData[row.key]) || 0;
        if (perc > 0) {
          syncedAmounts[row.key] = formatNumber((perc / 100) * activeTotalProjectCost);
        }
      });
      setAmountData(syncedAmounts);
    }
  }, [activeTotalProjectCost, formData]);

  const buildMeansOfFinanceValues = (values = formData, totalCost = activeTotalProjectCost) => ({
    percentages: values,
    totalPercentage: getTotalPercentage(values),
    totalCostOfProject: {
      permissible: totalCost,
      proposed: totalCost,
    },
    rows: allRows.map((row) => ({
      key: row.key,
      label: row.label,
      description: row.description || "",
      isCustom: !!row.isCustom,
      percentage: parseFloat(values[row.key]) || 0,
      permissible: getFinanceValue(values[row.key], totalCost),
      proposed: getFinanceValue(values[row.key], totalCost),
    })),
  });

  // Auto-save whenever formData or customFields change and total percentage equals 100%
  useEffect(() => {
    if (Object.keys(formData).length === 0) return;
    const total = allRows.reduce(
      (tot, row) => tot + (parseFloat(formData[row.key]) || 0),
      0
    );

    if (Math.abs(total - 100) < 0.001) {
      const currentTotalCost = getScenarioTotalProjectCost(activeScenarioId);
      const valuesData = buildMeansOfFinanceValues(formData, currentTotalCost);

      const updatedMeansMap = {
        ...meansOfFinanceScenarioData,
        ...(activeScenarioId
          ? {
              [activeScenarioId]: {
                formData,
                customFields,
              },
            }
          : {}),
      };

      setMeansOfFinanceScenarioData(updatedMeansMap);
      localStorage.setItem("MeansOfFinanceV1", JSON.stringify(updatedMeansMap));
      localStorage.setItem("meansOfFinanceCustomFields", JSON.stringify(customFields));
      localStorage.setItem("meansOfFinanceData", JSON.stringify(formData));
      localStorage.setItem("meansOfFinanceValues", JSON.stringify(valuesData));
      setError("");
      window.dispatchEvent(new CustomEvent("meansOfFinanceUpdated"));
    } else {
      setError(`Means of Finance total must be 100%. Current total is ${total.toFixed(2)}%.`);
    }
  }, [formData, customFields, activeScenarioId, activeTotalProjectCost]);

  const handleSave = () => {
    const total = getTotalPercentage();

    if (Math.abs(total - 100) > 0.001) {
      setError(
        `Means of Finance total must be 100%. Current total is ${total.toFixed(2)}%.`
      );
      return;
    }

    const currentTotalCost = getScenarioTotalProjectCost(activeScenarioId);
    const valuesData = buildMeansOfFinanceValues(formData, currentTotalCost);

    const updatedMeansMap = {
      ...meansOfFinanceScenarioData,
      ...(activeScenarioId
        ? {
            [activeScenarioId]: {
              formData,
              customFields,
            },
          }
        : {}),
    };

    setMeansOfFinanceScenarioData(updatedMeansMap);
    localStorage.setItem("MeansOfFinanceV1", JSON.stringify(updatedMeansMap));
    localStorage.setItem("meansOfFinanceCustomFields", JSON.stringify(customFields));
    localStorage.setItem("meansOfFinanceData", JSON.stringify(formData));
    localStorage.setItem("meansOfFinanceValues", JSON.stringify(valuesData));
    setError("");
    window.dispatchEvent(new CustomEvent("meansOfFinanceUpdated"));
  };


  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      alert("Field Name is required");
      return;
    }
    if (customFields.length >= 10) {
      alert("Maximum of 10 custom fields allowed.");
      return;
    }

    const fieldId = `custom_${Date.now()}`;
    const newField = {
      id: fieldId,
      key: fieldId,
      name: newFieldName.trim(),
      description: newFieldDesc.trim(),
    };

    const updatedCustom = [...customFields, newField];
    setCustomFields(updatedCustom);

    // Update active scenario map in state & localStorage
    if (activeScenarioId) {
      const updatedMeansMap = {
        ...meansOfFinanceScenarioData,
        [activeScenarioId]: {
          formData,
          customFields: updatedCustom,
        },
      };
      setMeansOfFinanceScenarioData(updatedMeansMap);
      localStorage.setItem("MeansOfFinanceV1", JSON.stringify(updatedMeansMap));
    }

    localStorage.setItem("meansOfFinanceCustomFields", JSON.stringify(updatedCustom));

    setNewFieldName("");
    setNewFieldDesc("");
    setIsModalOpen(false);
  };

  const handleDeleteCustomField = (id, key) => {
    const updatedCustom = customFields.filter((f) => f.id !== id);
    setCustomFields(updatedCustom);

    const updatedFormData = { ...formData };
    delete updatedFormData[key];
    setFormData(updatedFormData);

    if (activeScenarioId) {
      const updatedMeansMap = {
        ...meansOfFinanceScenarioData,
        [activeScenarioId]: {
          formData: updatedFormData,
          customFields: updatedCustom,
        },
      };
      setMeansOfFinanceScenarioData(updatedMeansMap);
      localStorage.setItem("MeansOfFinanceV1", JSON.stringify(updatedMeansMap));
    }

    localStorage.setItem("meansOfFinanceCustomFields", JSON.stringify(updatedCustom));
    localStorage.setItem("meansOfFinanceData", JSON.stringify(updatedFormData));
  };

  const totalPercentage = getTotalPercentage();
  const isTotal100 = Math.abs(totalPercentage - 100) < 0.001;

  return (
    <div className="means-finance-shell mt-1 fade-in-up">
      <style>{`
        .means-finance-shell {
          position: relative;
        }

        .mean-finance-panel {
          border: 1px solid #e6ebf2;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .mean-finance-panel-header {
          padding: 22px 28px;
          border-bottom: 1px solid #e6ebf2;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .mean-finance-panel-eyebrow {
          color: #868e96;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .mean-finance-panel-title {
          color: #111827;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          margin: 0;
        }

        .btn-dark-pill {
          background-color: #1a1c23;
          color: #fff;
          border-radius: 24px !important;
          padding: 10px 22px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .btn-dark-pill:hover:not(:disabled) {
          background-color: #2c2e31;
          color: #fff;
          transform: translateY(-1px);
        }

        .btn-dark-pill:disabled {
          background-color: #868e96;
          cursor: not-allowed;
        }

        /* Scenario Strip Styles */
        .scenario-strip {
          display: flex;
          align-items: stretch;
          gap: 10px;
          overflow-x: auto;
          padding: 4px 2px 12px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f8fafc;
        }
        .scenario-strip::-webkit-scrollbar { height: 6px; }
        .scenario-strip::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .scenario-strip::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
        .scenario-strip::-webkit-scrollbar-thumb:hover { background-color: #448C74; }

        .scenario-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 180px;
          max-width: 230px;
          padding: 12px 16px 12px 18px;
          border-radius: 14px;
          border: 2px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          user-select: none;
          overflow: hidden;
        }
        .scenario-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0; width: 5px;
          border-radius: 14px 0 0 14px;
          background: #e2e8f0;
          transition: background 0.22s;
        }
        .scenario-card.active::before { background: var(--sc-color, #448C74); }
        .scenario-card:hover:not(.active) {
          border-color: #94a3b8;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.07);
        }
        .scenario-card.active {
          border-color: var(--sc-color, #448C74);
          box-shadow: 0 4px 16px rgba(68,140,116,0.18);
          background: #f8fffe;
        }
        .scenario-card-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
          margin-bottom: 6px;
        }
        .scenario-card-name {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .scenario-card-subtitle {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          margin-top: 3px;
        }

        .mean-finance-panel-body {
          padding: 24px 28px 28px;
          background: #ffffff;
        }

        /* Two Section / Column Headers */
        .parts-header-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 1fr 1fr;
          gap: 16px;
          padding: 10px 16px;
          background: #f1f5f9;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mean-finance-item-card {
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.02);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .mean-finance-item-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
        }

        .item-card-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 1fr 1fr;
          gap: 16px;
          align-items: center;
        }

        .mean-finance-label-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mean-finance-label {
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 0;
        }

        .mean-finance-input-wrap {
          position: relative;
        }

        .mean-finance-input {
          min-height: 44px;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          color: #111827;
          font-weight: 600;
          font-size: 14px;
          padding-right: 36px;
          padding-left: 14px;
          background: #ffffff;
          transition: all 0.2s;
          -moz-appearance: textfield;
        }

        .mean-finance-input::-webkit-outer-spin-button,
        .mean-finance-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .mean-finance-input:focus {
          border-color: #3f967b;
          box-shadow: 0 0 0 3px rgba(63, 150, 123, 0.12);
          outline: none;
        }

        .mean-finance-percent {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          font-size: 14px;
          font-weight: 800;
          pointer-events: none;
        }

        .mean-finance-currency-prefix {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
          pointer-events: none;
        }

        .mean-finance-amount-input {
          padding-right: 14px !important;
        }

        /* Summary Total Bar */
        .mean-finance-total-bar {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 1fr 1fr;
          gap: 16px;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: #f8fafc;
          padding: 16px;
          margin-top: 20px;
        }

        .total-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .total-percent-badge {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          border: 1px solid;
          min-height: 44px;
        }

        .total-percent-badge.is-valid {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #047857;
        }

        .total-percent-badge.is-invalid {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
        }

        .total-amount-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: #eaf5f1;
          border: 1px solid #d4ebe2;
          color: #111827;
          font-size: 14px;
          font-weight: 800;
          min-height: 44px;
        }

        .mean-finance-error {
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fff1f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 700;
          padding: 12px 16px;
          margin-top: 16px;
        }

        .mean-finance-success {
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          background: #ecfdf5;
          color: #047857;
          font-size: 13px;
          font-weight: 700;
          padding: 12px 16px;
          margin-top: 16px;
        }

        .mean-finance-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }

        .mean-finance-btn {
          border: 0;
          border-radius: 999px;
          min-height: 44px;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 20px;
          transition: all 0.2s ease;
        }

        .mean-finance-btn-save {
          background: #3f967b;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(63, 150, 123, 0.18);
        }

        .mean-finance-btn-save:hover {
          background: #337a64;
          box-shadow: 0 12px 24px rgba(63, 150, 123, 0.25);
        }

        .mean-finance-btn-update {
          background: #eef2f7;
          color: #334155;
        }

        .mean-finance-btn-update:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Tooltip and Modal Styles */
        .tooltip-custom {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .tooltip-custom .tooltip-text {
          visibility: hidden;
          width: max-content;
          max-width: 220px;
          background-color: #334155;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          position: absolute;
          z-index: 10;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          text-transform: none;
          letter-spacing: normal;
          font-weight: 500;
        }

        .tooltip-custom .tooltip-text::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #334155 transparent transparent transparent;
        }

        .tooltip-custom:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }

        .modal-overlay-custom {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }

        .modal-content-custom {
          background: #fff;
          border-radius: 20px;
          padding: 26px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: scaleIn 0.2s ease-out;
        }

        .pill-modal-input {
          border-radius: 12px;
          border: 1px solid #dee2e6;
          padding: 10px 16px;
          font-size: 14px;
          background-color: #fff;
          width: 100%;
          transition: border-color 0.2s;
        }

        .pill-modal-input:focus {
          outline: none;
          border-color: #3f967b;
          box-shadow: 0 0 0 3px rgba(63, 150, 123, 0.12);
        }

        /* Scenario Breakdown Summary Section Styles */
        .scenario-summary-card {
          border: 1px solid #e6ebf2;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .scenario-summary-header {
          padding: 20px 28px;
          border-bottom: 1px solid #e6ebf2;
          background: #f8fafc;
        }

        .scenario-summary-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .scenario-summary-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }

        .scenario-summary-table {
          margin-bottom: 0;
        }

        .scenario-summary-table th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 14px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .scenario-summary-table td {
          padding: 16px 20px;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
        }

        .scenario-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        .scenario-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-pill.complete {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .status-pill.pending {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 768px) {
          .mean-finance-panel-header,
          .mean-finance-panel-body,
          .scenario-summary-header {
            padding-left: 18px;
            padding-right: 18px;
          }

          .parts-header-grid {
            display: none;
          }

          .item-card-grid,
          .mean-finance-total-bar {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>

      {/* Main Means of Finance Panel */}
      <div className="mean-finance-panel">
        <div className="mean-finance-panel-header">
          <div>
            <div className="mean-finance-panel-eyebrow">Selected Section</div>
            <h1 className="mean-finance-panel-title">Means Of Finance</h1>
          </div>
        </div>

        <div className="mean-finance-panel-body">
          {/* Scenario Selection Strip */}
          {scenarios.length > 0 && (
            <div className="mb-4 pb-3 border-bottom">
              <div
                className="fw-bold text-muted mb-3 text-uppercase"
                style={{ fontSize: "12px", letterSpacing: "1px" }}
              >
                Scenarios
              </div>
              <div className="scenario-strip">
                {scenarios.map((scenario, idx) => {
                  const isActive = scenario.id === activeScenarioId;
                  const color = getScenarioColor(idx);
                  const sCost = getScenarioTotalProjectCost(scenario.id);

                  return (
                    <div
                      key={scenario.id}
                      className={`scenario-card${isActive ? " active" : ""}`}
                      style={{ "--sc-color": color }}
                      onClick={() => handleScenarioSelect(scenario.id)}
                      title={`Click to switch to ${scenario.name}`}
                    >
                      <div className="scenario-card-icon" style={{ background: color }}>
                        {idx + 1}
                      </div>
                      <div className="scenario-card-name">{scenario.name}</div>
                      <div className="scenario-card-subtitle">
                        {sCost > 0 ? formatCurrencyShort(sCost) : "No Cost set"}
                      </div>
                      {isActive && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "6px",
                          }}
                        >
                          <div
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: color,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 700,
                              color: color,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            Active
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Dividers / Column Headers */}
          <div className="parts-header-grid">
            <span>Funding Source</span>
            <span>Part 1: Percentage (%)</span>
            <span>Part 2: Amount ({currency})</span>
          </div>

          <div className="d-grid gap-3">
            {allRows.map((row) => {
              const percVal = formData[row.key] ?? "";
              const calculatedAmount = getFinanceValue(
                percVal,
                activeTotalProjectCost
              );

              return (
                <div className="mean-finance-item-card" key={row.key}>
                  <div className="item-card-grid">
                    {/* Item Name / Source */}
                    <div className="mean-finance-label-group">
                      <label className="mean-finance-label">{row.label}</label>
                      {row.description && (
                        <div className="tooltip-custom" style={{ cursor: "help" }}>
                          <FaInfoCircle
                            className="text-primary opacity-75"
                            size={14}
                          />
                          <span className="tooltip-text">{row.description}</span>
                        </div>
                      )}
                      {row.isCustom && (
                        <button
                          type="button"
                          className="btn btn-sm text-danger p-0 border-0 ms-auto me-2 hover-opacity"
                          onClick={() => handleDeleteCustomField(row.id, row.key)}
                          title="Delete this field"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>

                    {/* Part 1: Percentage (%) */}
                    <div className="mean-finance-input-wrap">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="form-control mean-finance-input"
                        value={percVal}
                        onChange={(event) =>
                          handlePercentageChange(row.key, event.target.value)
                        }
                        placeholder="Enter percentage"
                      />
                      <span className="mean-finance-percent">%</span>
                    </div>

                    {/* Part 2: Amount ({currency}) - Editable Bi-directionally */}
                    <div className="mean-finance-input-wrap">
                      <span className="mean-finance-currency-prefix">{currency}</span>
                      <input
                        type="text"
                        className="form-control mean-finance-input mean-finance-amount-input"
                        style={{
                          paddingLeft: `${Math.max(34, (currency || "₹").length * 12 + 16)}px`,
                        }}
                        value={
                          amountData[row.key] !== undefined
                            ? amountData[row.key]
                            : percVal && activeTotalProjectCost > 0
                            ? formatNumber(getFinanceValue(percVal, activeTotalProjectCost))
                            : ""
                        }
                        onChange={(event) =>
                          handleAmountChange(row.key, event.target.value)
                        }
                        onBlur={() => handleAmountBlur(row.key)}
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Custom Field Button below the last Means of Finance Source */}
            <div className="mt-2 mb-1 text-center">
              <button
                type="button"
                className="btn-dark-pill d-inline-flex align-items-center justify-content-center gap-2"
                onClick={() => {
                  if (customFields.length < 10) setIsModalOpen(true);
                }}
                disabled={customFields.length >= 10}
              >
                <FaPlus />
                {customFields.length >= 10 ? "Max 10 Fields Reached" : "Add Custom Field"}
              </button>
            </div>

            {/* Unified Total Bar */}
            <div className="mean-finance-total-bar">
              <div className="total-title">Total</div>
              <div
                className={`total-percent-badge ${
                  isTotal100 ? "is-valid" : "is-invalid"
                }`}
              >
                <span>Total Percentage</span>
                <span>{totalPercentage.toFixed(2)}%</span>
              </div>
              <div className="total-amount-badge">
                <span className="amount-currency-tag">Total Cost (CostProjectDetailsV1)</span>
                <span>{currency} {formatNumber(activeTotalProjectCost)}</span>
              </div>
            </div>

            {error && <div className="mean-finance-error">{error}</div>}

          </div>
        </div>
      </div>

      {/* Add Custom Field Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay-custom">
          <div className="modal-content-custom">
            <h5 className="fw-bold mb-3">Add Custom Field</h5>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">
                Field Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="pill-modal-input"
                placeholder="e.g. Mezzanine Debt / Investor Equity"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="form-label small fw-semibold text-muted">
                Field Description (Optional)
              </label>
              <textarea
                className="pill-modal-input"
                style={{ minHeight: "80px" }}
                placeholder="Briefly describe this funding source..."
                rows="2"
                value={newFieldDesc}
                onChange={(e) => setNewFieldDesc(e.target.value)}
              ></textarea>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-light fw-medium px-4 rounded-pill"
                onClick={() => {
                  setIsModalOpen(false);
                  setNewFieldName("");
                  setNewFieldDesc("");
                }}
              >
                Exit
              </button>
              <button
                type="button"
                className="btn-dark-pill px-4"
                onClick={handleAddCustomField}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeansOfFinance;

