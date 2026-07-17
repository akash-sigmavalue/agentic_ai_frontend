import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import { useState, useEffect, useRef } from "react";
// import Header from "./Header";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { get_data } from "@/components/AppUtils";
import Header from "./Header";
import {
  FaMinus,
  FaArrowLeft,
  FaChartLine,
  FaCalculator,
  FaLayerGroup,
  FaExpandAlt,
  FaPlus,
  FaFolderOpen,
  FaFileExcel,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSave,
  FaTrashAlt
} from 'react-icons/fa';

const IRRComparison = () => {
  const navigate = useNavigate();
  const [irrFormData, setIrrFormData] = useState({});
  const [proposedProjectDuration, setProposedProjectDuration] = useState(0);
  const [proposedResults, setProposedResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [baseValues, setBaseValues] = useState({});
  const [isProposedMinimized, setIsProposedMinimized] = useState(false);

  // Refs to sync a fixed horizontal scrollbar with the scenarios container
  const scenariosContainerRef = useRef(null);
  const fixedScrollbarRef = useRef(null);
  const fixedScrollbarContentRef = useRef(null);
  const isSyncingRef = useRef(false);

  const handleGoBack = () => {
    navigate("/irr");
  };

  // Function to toggle proposed scenario minimization
  const toggleProposedMinimize = () => {
    setIsProposedMinimized(!isProposedMinimized);
  };

  // Function to find the lowest available scenario number from 1-10
  const findLowestAvailableScenarioNumber = () => {
    const usedNumbers = new Set();

    // Collect all currently used scenario numbers
    scenarios.forEach((scenario) => {
      const match = scenario.name.match(/^Scenario (\d+)$/);
      if (match) {
        usedNumbers.add(parseInt(match[1]));
      }
    });

    // Find the lowest available number from 1-10
    for (let i = 1; i <= 10; i++) {
      if (!usedNumbers.has(i)) {
        return i;
      }
    }

    // If all numbers 1-10 are used, return null (shouldn't happen due to max limit)
    return null;
  };

  // Function to add a new scenario
  const addScenario = () => {
    if (scenarios.length >= 10) {
      alert("You can add a maximum of 10 scenarios.");
      return;
    }

    // Check if we have the necessary data to create a scenario
    if (!proposedProjectDuration || proposedProjectDuration === 0) {
      alert(
        "Please ensure the Proposed IRR Scenario is loaded first before adding new scenarios."
      );
      return;
    }

    if (!irrFormData || Object.keys(irrFormData).length === 0) {
      alert(
        "IRR form data is not available. Please ensure the Proposed IRR Scenario is loaded first."
      );
      return;
    }

    // Find the lowest available scenario number
    const nextScenarioNumber = findLowestAvailableScenarioNumber();
    if (nextScenarioNumber === null) {
      alert("Maximum number of scenarios reached.");
      return;
    }

    //console.log("Adding new scenario with:");
    //console.log("  Proposed project duration:", proposedProjectDuration);
    //console.log("  IRR form data:", irrFormData);

    const newScenario = {
      // Keep internal id for React list keys but UUID no longer used for storage
      id: uuidv4(),
      name: `Scenario ${nextScenarioNumber}`,
      isMinimized: false,
      projectDuration: proposedProjectDuration, // Use proposed project duration as default
      formData: JSON.parse(JSON.stringify(irrFormData)), // Deep copy of the form data
      results: null,
      irrValue: 0,
      irrError: "",
      irrLoading: false,
    };

    //console.log("New scenario created:", newScenario);
    setScenarios([...scenarios, newScenario]);
  };

  // Function to toggle scenario minimization
  const toggleScenarioMinimize = (id) => {
    setScenarios(
      scenarios.map((scenario) =>
        scenario.id === id
          ? { ...scenario, isMinimized: !scenario.isMinimized }
          : scenario
      )
    );
  };

  // Function to delete a scenario
  const deleteScenario = (id) => {
    // Remove from state
    const scenarioToDelete = scenarios.find((s) => s.id === id);
    setScenarios(scenarios.filter((scenario) => scenario.id !== id));

    // Remove from localStorage (new key format). Fallback to old keys for cleanup.
    if (scenarioToDelete) {
      const scenarioNumber =
        parseInt((scenarioToDelete.name || "").replace("Scenario ", "")) || 0;
      if (scenarioNumber > 0) {
        localStorage.removeItem(`scenario_${scenarioNumber}_IRR`);
      }
    }
    // Cleanup legacy UUID-based keys if present
    localStorage.removeItem(`irr_scenario_${id}`);
    localStorage.removeItem(`irr_scenario_${id}_backup`);
  };

  // Function to update scenario form data
  const updateScenarioFormData = (id, field, year, value) => {
    setScenarios(
      scenarios.map((scenario) => {
        if (scenario.id === id) {
          const updatedFormData = { ...scenario.formData };
          if (!updatedFormData[field]) {
            updatedFormData[field] = {};
          }
          updatedFormData[field][year] = value;
          return { ...scenario, formData: updatedFormData };
        }
        return scenario;
      })
    );
  };

  // Function to update scenario project duration
  const updateScenarioProjectDuration = (id, duration) => {
    setScenarios(
      scenarios.map((scenario) => {
        if (scenario.id === id) {
          return { ...scenario, projectDuration: duration };
        }
        return scenario;
      })
    );
  };

  // Save a scenario's percentage split to localStorage and update the form display
  const saveScenarioForm = (scenarioId) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    // Per latest requirement: Do NOT persist form-only data to localStorage.
    // Simply update in-memory state. Persistence happens only on "Save Scenario".
    setScenarios(
      scenarios.map((s) =>
        s.id === scenarioId ? { ...s, formData: { ...scenario.formData } } : s
      )
    );
    alert(
      `${scenario.name} split updated locally. Click "Save Scenario" to persist.`
    );
  };

  // Save a scenario to localStorage using key format: scenario_<n>_IRR
  const saveScenario = (scenarioId) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    try {
      // Determine stable scenario number from its name (e.g., "Scenario 1")
      const scenarioNumber =
        parseInt((scenario.name || "").replace("Scenario ", "")) ||
        scenarios.findIndex((s) => s.id === scenarioId) + 1;
      const scenarioData = {
        // Store everything needed to fully restore this scenario
        id: scenario.id, // internal id for UI state; not used in storage key
        name: scenario.name || `Scenario ${scenarioNumber}`,
        isMinimized: scenario.isMinimized,
        projectDuration: scenario.projectDuration || proposedProjectDuration,
        formData: scenario.formData,
        results: scenario.results,
        irrValue: scenario.irrValue,
        irrError: scenario.irrError,
        irrLoading: scenario.irrLoading,
        baseValues,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(
        `scenario_${scenarioNumber}_IRR`,
        JSON.stringify(scenarioData)
      );
      alert(`${scenarioData.name} saved successfully.`);
    } catch (e) {
      //console.error('Failed to save scenario', e);
      alert("Failed to save scenario");
    }
  };

  console.log("testing..................");

  const updatedScenarios = {};

  // Function to calculate IRR for a specific scenario
  const calculateScenarioIRR = async (scenarioId) => {
    // Find the scenario
    const scenarioIndex = scenarios.findIndex((s) => s.id === scenarioId);
    if (scenarioIndex === -1) return;

    setScenarios((prevScenarios) =>
      prevScenarios.map((scenario, index) =>
        index === scenarioIndex
          ? { ...scenario, irrLoading: true, irrError: "" }
          : scenario
      )
    );

    try {
      // Use the current scenario's form data (no automatic loading from localStorage)
      const scenario = scenarios[scenarioIndex];

      // Debug: Check if baseValues are loaded
      if (!baseValues || Object.keys(baseValues).length === 0) {
        console.error("Base values are not loaded. Cannot calculate IRR.");
        setScenarios((prevScenarios) =>
          prevScenarios.map((scenario, index) =>
            index === scenarioIndex
              ? {
                ...scenario,
                irrError:
                  "Base values are not loaded. Please ensure the Proposed IRR Scenario is loaded first.",
                irrLoading: false,
              }
              : scenario
          )
        );
        return;
      }

      // Check if scenario has form data
      if (!scenario.formData || Object.keys(scenario.formData).length === 0) {
        console.error("Scenario form data is empty. Cannot calculate IRR.");
        setScenarios((prevScenarios) =>
          prevScenarios.map((scenario, index) =>
            index === scenarioIndex
              ? {
                ...scenario,
                irrError:
                  "Scenario form data is empty. Please save the scenario split first.",
                irrLoading: false,
              }
              : scenario
          )
        );
        return;
      }

      // Prepare cash flows array using the scenario's form data
      const cashFlows = [];
      const scenarioProjectDuration =
        scenario.projectDuration || proposedProjectDuration;

      for (let year = 0; year <= scenarioProjectDuration; year++) {
        const netCashGeneration = calculateNetCashGeneration(
          scenario.formData,
          year
        );
        cashFlows.push(netCashGeneration);
        console.log(`Year ${year}: Net Cash Generation = ${netCashGeneration}`);
      }

      console.log("Cash flows array:", cashFlows);

      // Call API to calculate IRR using get_data
      const data = await get_data(
        "/new_rate_simulator/simulator/calculate-irr",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json", // Request JSON response
          },
          body: JSON.stringify({
            cash_flows: cashFlows,
            project_duration: scenarioProjectDuration,
          }),
        }
      );

      console.log("IRROnScenario - Response data:", data);

      // Handle successful response: array of [irr_percentage, irr_decimal, irr_string]
      if (
        Array.isArray(data) &&
        data.length === 3 &&
        typeof data[0] === "number" &&
        !isNaN(data[0])
      ) {
        const [irrPercentage, , irrString] = data;
        console.log("IRROnScenario - IRR calculated:", {
          irrPercentage,
          irrString,
        });

        // Prepare results object
        const results = {
          projectDuration: scenarioProjectDuration,
          revenueTypes: [
            { key: "revenue", label: "Cashflow" },
            { key: "revenue", label: "Total sales in flow" },
          ].map(({ key, label }) => ({
            key,
            label,
            yearlyValues: Array.from(
              { length: scenarioProjectDuration + 1 },
              (_, year) => ({
                year,
                value: calculateYearlyValue(scenario.formData, key, year),
              })
            ),
            total: calculateTotal(
              scenario.formData,
              key,
              scenarioProjectDuration
            ),
          })),
          costTypes: [
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
          ].map(({ key, label }) => ({
            key,
            label,
            yearlyValues: Array.from(
              { length: scenarioProjectDuration + 1 },
              (_, year) => ({
                year,
                value: calculateYearlyValue(scenario.formData, key, year),
              })
            ),
            total: calculateTotal(
              scenario.formData,
              key,
              scenarioProjectDuration
            ),
          })),
          costOfProject: {
            yearlyValues: Array.from(
              { length: scenarioProjectDuration + 1 },
              (_, year) => ({
                year,
                value: calculateCostOfProject(scenario.formData, year),
              })
            ),
            total: calculateTotalCostOfProject(
              scenario.formData,
              scenarioProjectDuration
            ),
          },
          baseValues,
          irrFormData: scenario.formData,
          irrValue: irrPercentage,
          irrError: "",
          timestamp: new Date().toISOString(),
        };

        // Update scenario with results and IRR value
        setScenarios((prevScenarios) =>
          prevScenarios.map((scenario, index) =>
            index === scenarioIndex
              ? {
                ...scenario,
                results,
                irrValue: irrPercentage,
                irrLoading: false,
              }
              : scenario
          )
        );

        // Save results to localStorage with safeguards
        try {
          const resultsString = JSON.stringify(results);
          const storageKey = `irrScenarioResults_${scenarioId}`;
          localStorage.setItem(storageKey, resultsString);
          console.log(
            `IRROnScenario - Saved results to localStorage with IRR value for scenario ${scenarioId}:`,
            irrPercentage
          );

          // Verify saved results
          const savedResults = localStorage.getItem(storageKey);
          if (savedResults) {
            const parsedResults = JSON.parse(savedResults);
            console.log(
              `IRROnScenario - Verification of saved IRR value for scenario ${scenarioId}:`,
              parsedResults.irrValue
            );

            if (parsedResults.irrValue !== irrPercentage) {
              console.warn(
                `IRROnScenario - Saved IRR value doesn't match calculated value for scenario ${scenarioId}. Trying again...`
              );
              localStorage.setItem(storageKey, resultsString);
              localStorage.setItem(`${storageKey}_backup`, resultsString);
            }
          } else {
            console.error(
              `IRROnScenario - Failed to verify saved results for scenario ${scenarioId}. Trying alternative storage method...`
            );
            localStorage.setItem(`${storageKey}_backup`, resultsString);
          }
        } catch (storageError) {
          console.error(
            `IRROnScenario - Error saving to localStorage for scenario ${scenarioId}:`,
            storageError
          );
        }
      }
      // Handle error response: array with single error message
      else if (Array.isArray(data) && data.length === 1) {
        setScenarios((prevScenarios) =>
          prevScenarios.map((scenario, index) =>
            index === scenarioIndex
              ? {
                ...scenario,
                irrError: data[0] || "Failed to calculate IRR",
                irrValue: 0,
                irrLoading: false,
              }
              : scenario
          )
        );
      }
      // Handle unexpected response format
      else {
        setScenarios((prevScenarios) =>
          prevScenarios.map((scenario, index) =>
            index === scenarioIndex
              ? {
                ...scenario,
                irrError: "Unexpected response format from server",
                irrValue: 0,
                irrLoading: false,
              }
              : scenario
          )
        );
      }
    } catch (error) {
      console.error(`Error calculating IRR for scenario ${scenarioId}:`, error);
      setScenarios((prevScenarios) =>
        prevScenarios.map((scenario, index) =>
          index === scenarioIndex
            ? {
              ...scenario,
              irrError: "Failed to connect to IRR calculation service",
              irrValue: 0,
              irrLoading: false,
            }
            : scenario
        )
      );
    }
  };

  // Helper functions for IRR calculation
  const calculateYearlyValue = (formData, costType, year) => {
    let formKey;
    switch (costType) {
      case "revenue":
        formKey = "cashflow";
        break;
      case "landCost":
        formKey = "landcost";
        break;
      case "approvalCost":
        formKey = "approvalcost";
        break;
      case "constructionCost":
        formKey = "constructioncost";
        break;
      case "administrativeCost":
        formKey = "administrativecost";
        break;
      case "ancillaryCost":
        formKey = "ancillarycost";
        break;
      case "tdrCost":
        formKey = "tdrcost";
        break;
      case "premiumCost":
        formKey = "premiumcost";
        break;
      case "marketingCost":
        formKey = "marketingcost";
        break;
      case "contingencyCost":
        formKey = "contingencycost";
        break;
      case "financeCost":
        formKey = "financecost";
        break;
      case "miscellaneousCost":
        formKey = "miscellaneouscost";
        break;
      default:
        formKey = costType.toLowerCase();
    }

    const percentage = formData[formKey]?.[year] || 0;
    const baseValue = baseValues[costType] || 0;

    // Debug logging for revenue calculations
    if (costType === "revenue") {
      //console.log(`calculateYearlyValue - Revenue calculation for year ${year}:`);
      //console.log(`  Form key: ${formKey}`);
      //console.log(`  Percentage: ${percentage}%`);
      //console.log(`  Base value: ${baseValue}`);
      //console.log(`  Result: ${(baseValue * percentage) / 100}`);
    }

    return (baseValue * percentage) / 100;
  };

  const calculateTotal = (formData, costType, projectDuration) => {
    let total = 0;
    for (let year = 0; year <= projectDuration; year++) {
      total += calculateYearlyValue(formData, costType, year);
    }
    return total;
  };

  const calculateCostOfProject = (formData, year) => {
    const costKeys = [
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
    return costKeys.reduce((total, costKey) => {
      return total + calculateYearlyValue(formData, costKey, year);
    }, 0);
  };

  const calculateTotalCostOfProject = (formData, projectDuration) => {
    let total = 0;
    for (let year = 0; year <= projectDuration; year++) {
      total += calculateCostOfProject(formData, year);
    }
    return total;
  };

  const calculateNetCashGeneration = (formData, year) => {
    const cashflow = calculateYearlyValue(formData, "revenue", year);
    const costOfProject = calculateCostOfProject(formData, year);
    return cashflow - costOfProject;
  };

  const calculateTotalNetCashGeneration = (formData, projectDuration) => {
    let total = 0;
    for (let year = 0; year <= projectDuration; year++) {
      total += calculateNetCashGeneration(formData, year);
    }
    return total;
  };

  // Function to download scenario data as Excel file
  const downloadScenarioExcel = (scenario) => {
    try {
      const scenarioProjectDuration =
        scenario.projectDuration || proposedProjectDuration;

      // Create workbook and single worksheet
      const wb = XLSX.utils.book_new();

      // Single sheet with all data in organized sections
      const allData = [];

      // Header Section
      allData.push([`${scenario.name} - IRR Scenario Report`]);
      allData.push(["Generated on:", new Date().toLocaleString()]);
      allData.push(["Project Duration:", `${scenarioProjectDuration} Years`]);
      allData.push([
        "IRR Value:",
        scenario.irrValue > 0 ? `${scenario.irrValue.toFixed(2)}%` : "0.00%",
      ]);
      allData.push([]);

      // IRR Calculation Parameters Section
      allData.push(["IRR CALCULATION PARAMETERS"]);
      allData.push([
        "Cost Type",
        ...Array.from(
          { length: scenarioProjectDuration + 1 },
          (_, i) => `Year ${i}`
        ),
        "Total",
      ]);

      const costTypes = [
        { key: "cashflow", label: "Sales Cash Inflow" },
        { key: "landcost", label: "Land Costs" },
        { key: "approvalcost", label: "Approval Costs" },
        { key: "constructioncost", label: "Construction Costs" },
        { key: "administrativecost", label: "Administrative Costs" },
        { key: "ancillarycost", label: "Ancillary Costs" },
        { key: "tdrcost", label: "TDR Costs" },
        { key: "premiumcost", label: "Premium Costs" },
        { key: "marketingcost", label: "Marketing and Selling Costs" },
        { key: "contingencycost", label: "Contingency Costs" },
        { key: "financecost", label: "Finance Costs" },
        { key: "miscellaneouscost", label: "Miscellaneous Costs" },
      ];

      costTypes.forEach(({ key, label }) => {
        const row = [label];
        let total = 0;

        for (let year = 0; year <= scenarioProjectDuration; year++) {
          const value = scenario.formData[key]?.[year] || 0;
          row.push(value);
          total += value;
        }
        row.push(total);
        allData.push(row);
      });

      allData.push([]);

      // Revenue Table Section
      allData.push(["REVENUE TABLE"]);
      allData.push([
        "Revenue Type",
        ...Array.from(
          { length: scenarioProjectDuration + 1 },
          (_, i) => `Year ${i}`
        ),
        "Total",
      ]);

      const revenueTypes = [
        { key: "revenue", label: "Cashflow" },
        { key: "revenue", label: "Total sales in flow" },
      ];

      revenueTypes.forEach(({ key, label }) => {
        const row = [label];
        let total = 0;

        for (let year = 0; year <= scenarioProjectDuration; year++) {
          const value = calculateYearlyValue(scenario.formData, key, year);
          row.push(value);
          total += value;
        }
        row.push(total);
        allData.push(row);
      });

      allData.push([]);

      // Cost Table Section
      allData.push(["COST TABLE"]);
      allData.push([
        "Cost Type",
        ...Array.from(
          { length: scenarioProjectDuration + 1 },
          (_, i) => `Year ${i}`
        ),
        "Total",
      ]);

      const costLabels = [
        "Land Cost",
        "Approval Cost",
        "Construction Cost",
        "Administrative Cost",
        "Ancillary Cost",
        "TDR Cost",
        "Premium Cost",
        "Marketing and Selling Cost",
        "Contingency Cost",
        "Finance Cost",
        "Miscellaneous Cost",
      ];

      const costKeys = [
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

      costLabels.forEach((label, index) => {
        const key = costKeys[index];
        const row = [label];
        let total = 0;

        for (let year = 0; year <= scenarioProjectDuration; year++) {
          const value = calculateYearlyValue(scenario.formData, key, year);
          row.push(value);
          total += value;
        }
        row.push(total);
        allData.push(row);
      });

      // Add Cost of Project row
      const costOfProjectRow = ["Cost of project"];
      let totalCostOfProject = 0;

      for (let year = 0; year <= scenarioProjectDuration; year++) {
        const value = calculateCostOfProject(scenario.formData, year);
        costOfProjectRow.push(value);
        totalCostOfProject += value;
      }
      costOfProjectRow.push(totalCostOfProject);
      allData.push(costOfProjectRow);

      allData.push([]);

      // IRR Calculation Section (Net Cash Generation)
      allData.push(["IRR CALCULATION - NET CASH GENERATION"]);
      allData.push([
        "Calculation Type",
        ...Array.from(
          { length: scenarioProjectDuration + 1 },
          (_, i) => `Year ${i}`
        ),
        "Total",
      ]);

      const netCashRow = ["Net Cash Generation"];
      let totalNetCash = 0;

      for (let year = 0; year <= scenarioProjectDuration; year++) {
        const value = calculateNetCashGeneration(scenario.formData, year);
        netCashRow.push(value);
        totalNetCash += value;
      }
      netCashRow.push(totalNetCash);
      allData.push(netCashRow);

      allData.push([]);

      // Base Values Section
      allData.push(["BASE VALUES USED FOR CALCULATIONS"]);
      if (baseValues && Object.keys(baseValues).length > 0) {
        Object.entries(baseValues).forEach(([key, value]) => {
          allData.push([key, value]);
        });
      }

      // Create single worksheet
      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Apply styling and formatting
      ws["!cols"] = [
        { width: 25 }, // First column (labels)
        ...Array.from({ length: scenarioProjectDuration + 2 }, () => ({
          width: 15,
        })), // Year columns + total
      ];

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, scenario.name);

      // Generate filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = `${scenario.name}_IRR_${timestamp}.xlsx`;

      // Download the file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Error generating Excel file:", error);
      alert("Failed to generate Excel file. Please try again.");
    }
  };

  // Load proposed results directly from localStorage when component mounts (no useEffect)
  const loadProposedData = () => {
    try {
      // Try to load from primary storage key
      let savedProposedResults = localStorage.getItem("irrProposedResults");

      // If primary key doesn't exist, try backup key
      if (!savedProposedResults) {
        savedProposedResults = localStorage.getItem(
          "irrProposedResults_backup"
        );
        if (savedProposedResults) {
          //console.log("IRRComparison - Using backup storage key for proposed results");
          // Restore the primary key from backup
          localStorage.setItem("irrProposedResults", savedProposedResults);
        }
      }

      if (savedProposedResults) {
        try {
          const parsedResults = JSON.parse(savedProposedResults);

          // Verify the IRR value exists and is valid
          if (parsedResults && typeof parsedResults.irrValue === "number") {
            setProposedResults(parsedResults);
            setProposedProjectDuration(parsedResults.projectDuration || 0);
            setIrrFormData(parsedResults.irrFormData || {});
            setBaseValues(parsedResults.baseValues || {});
            //console.log("IRRComparison - Loaded proposed results with IRR value:", parsedResults.irrValue);
          } else {
            //console.warn("IRRComparison - Loaded results but IRR value is missing or invalid");
          }
        } catch (error) {
          //console.error("IRRComparison - Error parsing saved results:", error);
        }
      }

      // Load base values from localStorage
      const savedBaseValues = localStorage.getItem("calculatedCostValues");
      if (savedBaseValues) {
        try {
          const parsed = JSON.parse(savedBaseValues);
          // Prefer proposed block if present, else assume object already flat
          const proposed = parsed?.proposed;
          const normalized = proposed
            ? {
              revenue: proposed.revenue || 0,
              landCost: proposed.landCost || 0,
              approvalCost: proposed.approvalCost || 0,
              constructionCost: proposed.constructionCost || 0,
              administrativeCost: proposed.administrativeCost || 0,
              ancillaryCost: proposed.ancillaryCost || 0,
              tdrCost: proposed.tdrCost || 0,
              premiumCost: proposed.premiumCost || 0,
              marketingCost: proposed.marketingCost || 0,
              contingencyCost: proposed.contingencyCost || 0,
              financeCost: proposed.financeCost || 0,
              miscellaneousCost: proposed.miscellaneousCost || 0,
            }
            : parsed;
          setBaseValues(normalized || {});
        } catch (error) {
          //console.error("IRRComparison - Error parsing base values:", error);
        }
      }
    } catch (error) {
      //console.error("IRRComparison - Error in loadProposedData:", error);
    }
  };

  // Load proposed data on component mount
  useEffect(() => {
    try {
      loadProposedData();
    } catch (error) {
      //console.error("Error loading proposed data:", error);
    }
  }, []);

  // Function to load saved scenarios from localStorage (only when explicitly called)
  const loadSavedScenarios = () => {
    const loadedScenarios = [];

    // Load scenarios saved with new key format: scenario_<n>_IRR
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const match = key.match(/^scenario_(\d+)_IRR$/);
      if (match) {
        try {
          const json = localStorage.getItem(key);
          if (!json) continue;
          const parsed = JSON.parse(json);
          const n = parseInt(match[1], 10);
          loadedScenarios.push({
            // Use a fresh internal id; storage key is the stable scenario number
            id: uuidv4(),
            name: `Scenario ${n}`,
            isMinimized: false,
            projectDuration: parsed.projectDuration || proposedProjectDuration,
            formData: parsed.formData || {},
            results: parsed.results || null,
            irrValue: typeof parsed.irrValue === "number" ? parsed.irrValue : 0,
            irrError: parsed.irrError || "",
            irrLoading: false,
          });
        } catch (error) {
          //console.error('IRRComparison - Error parsing saved scenario (new format):', key, error);
        }
      }
    }

    // Sort scenarios by their numeric suffix
    loadedScenarios.sort((a, b) => {
      const numA = parseInt(a.name.replace("Scenario ", "")) || 0;
      const numB = parseInt(b.name.replace("Scenario ", "")) || 0;
      return numA - numB;
    });

    if (loadedScenarios.length > 0) {
      setScenarios(loadedScenarios);
      alert(`Loaded ${loadedScenarios.length} saved scenarios.`);
    } else {
      alert("No saved scenarios found.");
    }
  };

  // Keep the fixed horizontal scrollbar in sync with the scenarios container
  useEffect(() => {
    const main = scenariosContainerRef.current;
    const fixedBar = fixedScrollbarRef.current;
    const fixedContent = fixedScrollbarContentRef.current;
    if (!main || !fixedBar || !fixedContent) return;

    let rafId;

    const update = () => {
      // Match the scrollbar width to the total scrollable width
      const width = main.scrollWidth;
      fixedContent.style.width = `${width}px`;
      // Align positions and toggle visibility if not overflowing
      fixedBar.scrollLeft = main.scrollLeft;
      fixedBar.style.display = width > main.clientWidth ? "block" : "none";
    };

    const handleMainScroll = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      fixedBar.scrollLeft = main.scrollLeft;
      isSyncingRef.current = false;
    };

    const handleFixedScroll = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      main.scrollLeft = fixedBar.scrollLeft;
      isSyncingRef.current = false;
    };

    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    main.addEventListener("scroll", handleMainScroll);
    fixedBar.addEventListener("scroll", handleFixedScroll);
    window.addEventListener("resize", onResize);

    // Initial update (delayed to ensure layout is settled)
    setTimeout(update, 0);

    return () => {
      main.removeEventListener("scroll", handleMainScroll);
      fixedBar.removeEventListener("scroll", handleFixedScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, [scenarios, isProposedMinimized]);

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <Header />

      <main className="container-fluid py-5 px-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2 fade-in-up" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3 card-hover-lift" onClick={handleGoBack}>
                	<FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaChartLine className="text-primary me-3" />Compared IRR Scenarios
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Compare Internal Rate of Return scenarios for your real estate project.</p>
          </div>
          <div className="mt-3 mt-md-0">
            <button
              className="btn btn-warning rounded-pill shadow-sm fw-semibold card-hover-lift"
              onClick={() => navigate("/investor-irr")}
            >
              <FaCalculator className="me-2" />
              Calculate Investor IRR
            </button>
          </div>
        </div>

        <style>{`
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

        /* Scrollbar styling for tables and containers */
        .table-responsive::-webkit-scrollbar,
        .scenarios-container::-webkit-scrollbar,
        .scenarios-fixed-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        
        .table-responsive::-webkit-scrollbar-track,
        .scenarios-container::-webkit-scrollbar-track,
        .scenarios-fixed-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        
        .table-responsive::-webkit-scrollbar-thumb,
        .scenarios-container::-webkit-scrollbar-thumb,
        .scenarios-fixed-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        
        .table-responsive::-webkit-scrollbar-thumb:hover,
        .scenarios-container::-webkit-scrollbar-thumb:hover,
        .scenarios-fixed-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Table Row Hover */
        .table-hover tbody tr {
          transition: background-color 0.2s ease;
        }
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        .scenarios-fixed-scrollbar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: rgba(255,255,255,0.9);
            border-top: 1px solid #eee;
        }
        .scenarios-fixed-scrollbar-content {
            height: 1px;
        }

        .scenario-card {
            transition: all 0.3s ease;
        }
      `}</style>

        {/* Scenarios Container */}
        <div className="row">
          <div className="col-12">
            <div className="mb-5">
              <div className="d-flex justify-content-between align-items-center mb-4 px-2">
                <div>
                  <h4 className="fw-bold text-dark mb-1">
                    <FaLayerGroup className="text-primary me-2" />Comparison View
                  </h4>
                  <p className="text-secondary small mb-0 text-dark">
                    Scroll horizontally to compare different scenarios side-by-side
                  </p>
                </div>
              </div>

              <div
                ref={scenariosContainerRef}
                className="d-flex flex-row scenarios-container pb-4"
                style={{
                  gap: "24px",
                  overflowX: "auto",
                  padding: "4px 4px 20px 4px",
                  minHeight: "200px",
                  scrollSnapType: "x mandatory",
                  scrollbarWidth: "thin",
                  scrollBehavior: "smooth",
                }}
              >
                {/* Proposed IRR Scenario Section */}
                <div
                  className="card border-0 shadow-sm rounded-4 flex-shrink-0 scenario-card"
                  style={{
                    width: isProposedMinimized ? "200px" : "calc(50% - 12px)",
                    minWidth: isProposedMinimized ? "200px" : "calc(50% - 12px)",
                    scrollSnapAlign: "start",
                    backgroundColor: "#fff"
                  }}
                >
                  {isProposedMinimized ? (
                    <button
                      className="btn btn-lg d-flex flex-column align-items-center justify-content-center h-100 w-100 rounded-4 card-hover-lift"
                      style={{
                        minHeight: "150px",
                        background: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)",
                        color: "white",
                        border: "none"
                      }}
                      onClick={toggleProposedMinimize}
                    >
                      <FaExpandAlt className="mb-2 fs-4" />
                      <span className="fw-bold small text-uppercase ls-1">
                        Show Proposed
                      </span>

                    </button>
                  ) : (
                    <>
                      <div className="card-header bg-white border-bottom border-light py-3 px-4">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                              <FaChartLine className="fs-5" />
                            </div>
                            <div>
                              <h5 className="mb-0 fw-bold text-dark">Proposed IRR Scenario</h5>
                              <small className="text-secondary text-dark">Primary scenario based on initial inputs</small>
                            </div>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm card-hover-lift fw-medium"
                              onClick={addScenario}
                              disabled={scenarios.length >= 10}
                              title={scenarios.length >= 10 ? "Maximum 10 scenarios allowed" : "Create a new scenario for comparison"}
                            >
                              <FaPlus className="me-1" /> Add Scenario
                            </button>
                            <button
                              className="btn btn-light btn-sm rounded-pill px-3 shadow-sm card-hover-lift border fw-medium text-dark"
                              onClick={loadSavedScenarios}
                            >
                              <FaFolderOpen className="me-1 text-warning" /> Load Saved
                            </button>
                            <button
                              className="btn btn-success btn-sm rounded-pill px-3 shadow-sm card-hover-lift fw-medium"
                              onClick={() =>
                                downloadScenarioExcel({
                                  name: "Proposed IRR Scenario",
                                  projectDuration: proposedProjectDuration,
                                  formData:
                                    proposedResults?.irrFormData || {},
                                  irrValue: proposedResults?.irrValue || 0,
                                })
                              }
                              disabled={!proposedResults || !proposedResults.irrFormData}
                            >
                              <FaFileExcel className="me-1" /> Excel
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm rounded-circle shadow-sm card-hover-lift d-flex align-items-center justify-content-center"
                              onClick={toggleProposedMinimize}
                              title="Minimize"
                              style={{ width: '32px', height: '32px', padding: 0 }}
                            >
                              <FaMinus/>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        {/* Status indicator */}
                        <div className="mb-3">
                          {proposedProjectDuration > 0 &&
                            baseValues &&
                            Object.keys(baseValues).length > 0 ? (
                            <div className="alert alert-success small">
                              <FaCheckCircle className="me-2" />
                              Proposed IRR data loaded successfully. Project
                              Duration: {proposedProjectDuration} years
                            </div>
                          ) : (
                            <div className="alert alert-warning small">
                              <FaExclamationTriangle className="me-2" />
                              Proposed IRR data not loaded. Please complete
                              the IRR Calculation Form on the IRR page
                              first.
                            </div>
                          )}
                        </div>

                        {proposedProjectDuration > 0 ? (
                          <>
                            {/* IRR Form Data Display - Non-editable */}
                            <div className="mb-4">
                              <h5 className="text-primary mb-3">
                                IRR Calculation Parameters
                              </h5>
                              <div className="row">
                                <div className="col-md-3 mb-3">
                                  <label className="form-label fw-semibold">
                                    Project Duration
                                  </label>
                                  <div className="form-control-plaintext bg-light">
                                    {proposedProjectDuration} Years
                                  </div>
                                </div>
                              </div>

                              {/* Cost Type Parameters - Read-only display */}
                              <div className="row">
                                {[
                                  {
                                    key: "cashflow",
                                    label: "Sales Cash Inflow",
                                  },
                                  { key: "landcost", label: "Land Costs" },
                                  {
                                    key: "approvalcost",
                                    label: "Approval Costs",
                                  },
                                  {
                                    key: "constructioncost",
                                    label: "Construction Costs",
                                  },
                                  {
                                    key: "administrativecost",
                                    label: "Administrative Costs",
                                  },
                                  {
                                    key: "ancillarycost",
                                    label: "Ancillary Costs",
                                  },
                                  { key: "tdrcost", label: "TDR Costs" },
                                  {
                                    key: "premiumcost",
                                    label: "Premium Costs",
                                  },
                                  {
                                    key: "marketingcost",
                                    label: "Marketing and Selling Costs",
                                  },
                                  {
                                    key: "contingencycost",
                                    label: "Contingency Costs",
                                  },
                                  {
                                    key: "financecost",
                                    label: "Finance Costs",
                                  },
                                  {
                                    key: "miscellaneouscost",
                                    label: "Miscellaneous Costs",
                                  },
                                ].map(({ key: field, label }) => (
                                  <div key={field} className="col-12 mb-3">
                                    <div className="card border-0 shadow-sm">
                                      <div className="card-header bg-light py-2">
                                        <h6 className="mb-0 fw-semibold text-primary">
                                          {label}
                                        </h6>
                                      </div>
                                      <div className="card-body py-2">
                                        <div className="row g-1">
                                          {Array.from(
                                            {
                                              length:
                                                proposedProjectDuration + 1,
                                            },
                                            (_, year) => (
                                              <div
                                                key={year}
                                                className="col-md-2 col-sm-3 col-4 mb-1"
                                              >
                                                <label className="form-label small fw-medium mb-1">
                                                  Year {year}
                                                </label>
                                                <div className="form-control-plaintext bg-light small">
                                                  {proposedResults
                                                    ?.irrFormData?.[
                                                    field
                                                  ]?.[year] || 0}
                                                  %
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* IRR Results Display */}
                            {proposedResults && (
                              <div className="mt-4">
                                <h5 className="text-primary mb-3">
                                  IRR Calculation Results
                                </h5>

                                {/* Revenue Table */}
                                <div className="table-responsive mb-4">
                                  <table className="table table-bordered table-hover">
                                    <thead className="table-success">
                                      <tr>
                                        <th>Revenue Type</th>
                                        {Array.from(
                                          {
                                            length:
                                              proposedProjectDuration + 1,
                                          },
                                          (_, year) => (
                                            <th
                                              key={year}
                                              className="text-center"
                                            >
                                              Year {year}
                                            </th>
                                          )
                                        )}
                                        <th className="text-center">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {proposedResults.revenueTypes?.map(
                                        ({
                                          label,
                                          yearlyValues,
                                          total,
                                        }) => (
                                          <tr key={label}>
                                            <td className="fw-bold">
                                              {label}
                                            </td>
                                            {yearlyValues?.map(
                                              ({ year, value }) => (
                                                <td
                                                  key={year}
                                                  className="text-end"
                                                >
                                                  ₹
                                                  {new Intl.NumberFormat(
                                                    "en-IN",
                                                    {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                    }
                                                  ).format(value)}
                                                </td>
                                              )
                                            )}
                                            <td className="text-end fw-bold">
                                              ₹
                                              {new Intl.NumberFormat(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              ).format(total)}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Cost Table */}
                                <div className="table-responsive mb-4">
                                  <table className="table table-bordered table-hover">
                                    <thead className="table-primary">
                                      <tr>
                                        <th>Cost Type</th>
                                        {Array.from(
                                          {
                                            length:
                                              proposedProjectDuration + 1,
                                          },
                                          (_, year) => (
                                            <th
                                              key={year}
                                              className="text-center"
                                            >
                                              Year {year}
                                            </th>
                                          )
                                        )}
                                        <th className="text-center">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {proposedResults.costTypes?.map(
                                        ({
                                          label,
                                          yearlyValues,
                                          total,
                                        }) => (
                                          <tr key={label}>
                                            <td className="fw-bold">
                                              {label}
                                            </td>
                                            {yearlyValues?.map(
                                              ({ year, value }) => (
                                                <td
                                                  key={year}
                                                  className="text-end"
                                                >
                                                  ₹
                                                  {new Intl.NumberFormat(
                                                    "en-IN",
                                                    {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                    }
                                                  ).format(value)}
                                                </td>
                                              )
                                            )}
                                            <td className="text-end fw-bold">
                                              ₹
                                              {new Intl.NumberFormat(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              ).format(total)}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                      {/* Cost of Project Row */}
                                      <tr className="table-primary">
                                        <td className="fw-bold">
                                          Cost of project
                                        </td>
                                        {proposedResults.costOfProject?.yearlyValues?.map(
                                          ({ year, value }) => (
                                            <td
                                              key={year}
                                              className="text-end fw-bold"
                                            >
                                              ₹
                                              {new Intl.NumberFormat(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              ).format(value)}
                                            </td>
                                          )
                                        )}
                                        <td className="text-end fw-bold">
                                          ₹
                                          {new Intl.NumberFormat("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }).format(
                                            proposedResults.costOfProject
                                              ?.total || 0
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                {/* IRR Calculation Table (Net Cash Generation) */}
                                <div className="table-responsive mb-4">
                                  <table className="table table-bordered table-hover">
                                    <thead className="table-warning">
                                      <tr>
                                        <th>IRR Calculation</th>
                                        {Array.from(
                                          {
                                            length:
                                              proposedProjectDuration + 1,
                                          },
                                          (_, year) => (
                                            <th
                                              key={year}
                                              className="text-center"
                                            >
                                              Year {year}
                                            </th>
                                          )
                                        )}
                                        <th className="text-center">
                                          Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="fw-bold">
                                          Net Cash Generation
                                        </td>
                                        {Array.from(
                                          {
                                            length:
                                              proposedProjectDuration + 1,
                                          },
                                          (_, year) => (
                                            <td
                                              key={year}
                                              className="text-end"
                                            >
                                              ₹
                                              {new Intl.NumberFormat(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              ).format(
                                                calculateNetCashGeneration(
                                                  proposedResults.irrFormData,
                                                  year
                                                )
                                              )}
                                            </td>
                                          )
                                        )}
                                        <td className="text-end fw-bold">
                                          ₹
                                          {new Intl.NumberFormat("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }).format(
                                            calculateTotalNetCashGeneration(
                                              proposedResults.irrFormData,
                                              proposedProjectDuration
                                            )
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                {/* IRR Value Display */}
                                <div className="alert alert-success">
                                  <div className="row">
                                    <div className="col-md-6">
                                      <h5 className="mb-0">
                                        Proposed IRR Value
                                      </h5>
                                    </div>
                                    <div className="col-md-6 text-end">
                                      <h4 className="mb-0 fw-bold">
                                        {proposedResults.irrValue > 0
                                          ? `${proposedResults.irrValue.toFixed(2)}%`
                                          : "0.00%"}
                                      </h4>
                                      <div className="small text-muted mt-1">
                                        IRR Value ID:{" "}
                                        {new Date(
                                          proposedResults.timestamp
                                        ).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* Debug Information */}
                                <div className="alert alert-info small">
                                  <div className="fw-bold">
                                    Debug Information:
                                  </div>
                                  <div>
                                    IRR Value: {proposedResults.irrValue}
                                  </div>
                                  <div>
                                    Timestamp: {proposedResults.timestamp}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="alert alert-info">
                            <FaInfoCircle className="me-2" />
                            Please complete the IRR Calculation Form on the
                            IRR page to view the Proposed IRR Scenario.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Additional Scenarios */}
                {scenarios.map((scenario) => {
                  const isMinimized = scenario.isMinimized;

                  return (
                    <div
                      key={scenario.id}
                      className="card border-0 shadow-sm rounded-4 flex-shrink-0 scenario-card"
                      style={{
                        width: isMinimized ? "200px" : "calc(50% - 12px)",
                        minWidth: isMinimized ? "200px" : "calc(50% - 12px)",
                        position: "relative",
                        scrollSnapAlign: "start",
                        backgroundColor: "#fff"
                      }}
                    >
                      {isMinimized ? (
                        <button
                          className="btn btn-lg d-flex flex-column align-items-center justify-content-center h-100 w-100 rounded-4 card-hover-lift"
                          style={{
                            minHeight: "150px",
                            background: "linear-gradient(135deg, #198754 0%, #157347 100%)",
                            color: "white",
                            border: "none"
                          }}
                          onClick={() =>
                            toggleScenarioMinimize(scenario.id)
                          }
                        >
                          <FaExpandAlt className="mb-2 fs-4" />
                          <span className="fw-bold small text-uppercase ls-1">
                            Show Scenario
                          </span>
                        </button>
                      ) : (
                        <>
                          <div className="card-header bg-white border-bottom border-light py-3 px-4">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                              <div className="d-flex align-items-center">
                                <div className="bg-success bg-opacity-10 text-success rounded-circle me-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                                  <FaChartLine className="fs-5" />
                                </div>
                                <h5 className="mb-0 fw-bold text-dark">{scenario.name}</h5>
                              </div>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-success btn-sm rounded-pill px-3 shadow-sm card-hover-lift fw-medium"
                                  onClick={() =>
                                    downloadScenarioExcel(scenario)
                                  }
                                  title="Download Excel"
                                  disabled={
                                    !scenario.formData ||
                                    Object.keys(scenario.formData).length === 0
                                  }
                                >
                                  <FaFileExcel className="me-1" /> Excel
                                </button>
                                <button
                                  className="btn btn-outline-secondary btn-sm rounded-circle shadow-sm card-hover-lift d-flex align-items-center justify-content-center"
                                  onClick={() =>
                                    toggleScenarioMinimize(scenario.id)
                                  }
                                  title="Minimize"
                                  style={{ width: '32px', height: '32px', padding: 0 }}
                                >
                                  <FaMinus/>
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm rounded-circle shadow-sm card-hover-lift d-flex align-items-center justify-content-center"
                                  onClick={() => deleteScenario(scenario.id)}
                                  title="Delete"
                                  style={{ width: '32px', height: '32px', padding: 0 }}
                                >
                                  <FaTrashAlt/>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="card-body">
                            {(scenario.projectDuration ||
                              proposedProjectDuration) > 0 ? (
                              <>
                                {/* IRR Form Data Input */}
                                <div className="mb-4">
                                  <h5 className="text-info mb-3">
                                    IRR Calculation Parameters
                                  </h5>
                                  <div className="row">
                                    <div className="col-md-3 mb-3">
                                      <label className="form-label fw-semibold">
                                        Project Duration
                                      </label>
                                      <input
                                        type="number"
                                        className="form-control"
                                        value={
                                          scenario.projectDuration ||
                                          proposedProjectDuration
                                        }
                                        onChange={(e) =>
                                          updateScenarioProjectDuration(
                                            scenario.id,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        min="1"
                                        max="50"
                                        step="1"
                                      />
                                    </div>
                                  </div>

                                  {/* Cost Type Parameters */}
                                  <div className="row">
                                    {[
                                      {
                                        key: "cashflow",
                                        label: "Sales Cash Inflow",
                                      },
                                      {
                                        key: "landcost",
                                        label: "Land Costs",
                                      },
                                      {
                                        key: "approvalcost",
                                        label: "Approval Costs",
                                      },
                                      {
                                        key: "constructioncost",
                                        label: "Construction Costs",
                                      },
                                      {
                                        key: "administrativecost",
                                        label: "Administrative Costs",
                                      },
                                      {
                                        key: "ancillarycost",
                                        label: "Ancillary Costs",
                                      },
                                      {
                                        key: "tdrcost",
                                        label: "TDR Costs",
                                      },
                                      {
                                        key: "premiumcost",
                                        label: "Premium Costs",
                                      },
                                      {
                                        key: "marketingcost",
                                        label:
                                          "Marketing and Selling Costs",
                                      },
                                      {
                                        key: "contingencycost",
                                        label: "Contingency Costs",
                                      },
                                      {
                                        key: "financecost",
                                        label: "Finance Costs",
                                      },
                                      {
                                        key: "miscellaneouscost",
                                        label: "Miscellaneous Costs",
                                      },
                                    ].map(({ key: field, label }) => (
                                      <div
                                        key={field}
                                        className="col-12 mb-3"
                                      >
                                        <div className="card border-0 shadow-sm">
                                          <div className="card-header bg-light py-2">
                                            <h6 className="mb-0 fw-semibold text-info">
                                              {label}
                                            </h6>
                                          </div>
                                          <div className="card-body py-2">
                                            <div className="row g-1">
                                              {Array.from(
                                                {
                                                  length:
                                                    (scenario.projectDuration ||
                                                      proposedProjectDuration) +
                                                    1,
                                                },
                                                (_, year) => (
                                                  <div
                                                    key={year}
                                                    className="col-md-2 col-sm-3 col-4 mb-1"
                                                  >
                                                    <label className="form-label small fw-medium mb-1">
                                                      Year {year}
                                                    </label>
                                                    <input
                                                      type="number"
                                                      className="form-control form-control-sm"
                                                      value={
                                                        scenario.formData[
                                                        field
                                                        ]?.[year] || 0
                                                      }
                                                      onChange={(e) =>
                                                        updateScenarioFormData(
                                                          scenario.id,
                                                          field,
                                                          year,
                                                          parseFloat(
                                                            e.target.value
                                                          ) || 0
                                                        )
                                                      }
                                                      min="0"
                                                      max="100"
                                                      step="0.01"
                                                    />
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Calculate IRR Button */}
                                <div className="d-flex justify-content-center mb-4 gap-2">
                                  <button
                                    className="btn btn-secondary btn-lg"
                                    onClick={() =>
                                      saveScenarioForm(scenario.id)
                                    }
                                    disabled={scenario.irrLoading}
                                  >
                                    Save Split
                                  </button>
                                  <button
                                    className="btn btn-info btn-lg"
                                    onClick={() =>
                                      calculateScenarioIRR(scenario.id)
                                    }
                                    disabled={scenario.irrLoading}
                                  >
                                    {scenario.irrLoading ? (
                                      <>
                                        <span
                                          className="spinner-border spinner-border-sm me-2"
                                          role="status"
                                        ></span>
                                        Calculating IRR...
                                      </>
                                    ) : (
                                      <>Calculate IRR</>
                                    )}
                                  </button>
                                </div>

                                {/* IRR Results Display (always show, computed from scenario split) */}
                                <div className="mt-4">
                                  <h5 className="text-info mb-3">
                                    IRR Calculation Results
                                  </h5>

                                  {/* Revenue Table */}
                                  <div className="table-responsive mb-4">
                                    <table className="table table-bordered table-hover">
                                      <thead className="table-success">
                                        <tr>
                                          <th>Revenue Type</th>
                                          {Array.from(
                                            {
                                              length:
                                                (scenario.projectDuration ||
                                                  proposedProjectDuration) +
                                                1,
                                            },
                                            (_, year) => (
                                              <th
                                                key={year}
                                                className="text-center"
                                              >
                                                Year {year}
                                              </th>
                                            )
                                          )}
                                          <th className="text-center">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[
                                          {
                                            key: "revenue",
                                            label: "Cashflow",
                                          },
                                          {
                                            key: "revenue",
                                            label: "Total sales in flow",
                                          },
                                        ].map(({ key, label }) => (
                                          <tr key={label}>
                                            <td className="fw-bold">
                                              {label}
                                            </td>
                                            {Array.from(
                                              {
                                                length:
                                                  (scenario.projectDuration ||
                                                    proposedProjectDuration) +
                                                  1,
                                              },
                                              (_, year) => (
                                                <td
                                                  key={year}
                                                  className="text-end"
                                                >
                                                  ₹
                                                  {new Intl.NumberFormat(
                                                    "en-IN",
                                                    {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                    }
                                                  ).format(
                                                    calculateYearlyValue(
                                                      scenario.formData,
                                                      key,
                                                      year
                                                    )
                                                  )}
                                                </td>
                                              )
                                            )}
                                            <td className="text-end fw-bold">
                                              ₹
                                              {new Intl.NumberFormat(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              ).format(
                                                calculateTotal(
                                                  scenario.formData,
                                                  key,
                                                  scenario.projectDuration ||
                                                  proposedProjectDuration
                                                )
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Cost Table */}
                                  <div className="table-responsive mb-4">
                                    <table className="table table-bordered table-hover">
                                      <thead className="table-primary">
                                        <tr>
                                          <th>Cost Type</th>
                                          {Array.from(
                                            {
                                              length:
                                                (scenario.projectDuration ||
                                                  proposedProjectDuration) +
                                                1,
                                            },
                                            (_, year) => (
                                              <th
                                                key={year}
                                                className="text-center"
                                              >
                                                Year {year}
                                              </th>
                                            )
                                          )}
                                          <th className="text-center">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[
                                          {
                                            key: "landCost",
                                            label: "Land Cost",
                                          },
                                          {
                                            key: "approvalCost",
                                            label: "Approval Cost",
                                          },
                                          {
                                            key: "constructionCost",
                                            label: "Construction Cost",
                                          },
                                          {
                                            key: "administrativeCost",
                                            label: "Administrative Cost",
                                          },
                                          {
                                            key: "ancillaryCost",
                                            label: "Ancillary Cost",
                                          },
                                          {
                                            key: "tdrCost",
                                            label: "TDR Cost",
                                          },
                                          {
                                            key: "premiumCost",
                                            label: "Premium Cost",
                                          },
                                          {
                                            key: "marketingCost",
                                            label:
                                              "Marketing and Selling Cost",
                                          },
                                          {
                                            key: "contingencyCost",
                                            label: "Contingency Cost",
                                          },
                                          {
                                            key: "financeCost",
                                            label: "Finance Cost",
                                          },
                                          {
                                            key: "miscellaneousCost",
                                            label: "Miscellaneous Cost",
                                          },
                                        ].map(({ key, label }) => (
                                          <tr key={label}>
                                            <td className="fw-bold">
                                              {label}
                                            </td>
                                            {Array.from(
                                              {
                                                length:
                                                  (scenario.projectDuration ||
                                                    proposedProjectDuration) +
                                                  1,
                                              },
                                              (_, year) => (
                                                <td
                                                  key={year}
                                                  className="text-end"
                                                >
                                                  ₹
                                                  {new Intl.NumberFormat(
                                                    "en-IN",
                                                    {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                    }
                                                  ).format(
                                                    calculateYearlyValue(
                                                      scenario.formData,
                                                      key,
                                                      year
                                                    )
                                                  )}
                                                </td>
                                              )
                                            )}
                                            <td className="text-end fw-bold">
                                              ₹
                                              {new Intl.NumberFormat(
                                                "en-IN",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              ).format(
                                                calculateTotal(
                                                  scenario.formData,
                                                  key,
                                                  scenario.projectDuration ||
                                                  proposedProjectDuration
                                                )
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                        {/* Cost of Project Row */}
                                        <tr className="table-primary">
                                          <td className="fw-bold">
                                            Cost of project
                                          </td>
                                          {Array.from(
                                            {
                                              length:
                                                (scenario.projectDuration ||
                                                  proposedProjectDuration) +
                                                1,
                                            },
                                            (_, year) => (
                                              <td
                                                key={year}
                                                className="text-end fw-bold"
                                              >
                                                ₹
                                                {new Intl.NumberFormat(
                                                  "en-IN",
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  }
                                                ).format(
                                                  calculateCostOfProject(
                                                    scenario.formData,
                                                    year
                                                  )
                                                )}
                                              </td>
                                            )
                                          )}
                                          <td className="text-end fw-bold">
                                            ₹
                                            {new Intl.NumberFormat(
                                              "en-IN",
                                              {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              }
                                            ).format(
                                              calculateTotalCostOfProject(
                                                scenario.formData,
                                                scenario.projectDuration ||
                                                proposedProjectDuration
                                              )
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* IRR Calculation Table (Net Cash Generation) */}
                                  <div className="table-responsive mt-4">
                                    <table className="table table-bordered table-hover">
                                      <thead className="table-warning">
                                        <tr>
                                          <th>IRR Calculation</th>
                                          {Array.from(
                                            {
                                              length:
                                                (scenario.projectDuration ||
                                                  proposedProjectDuration) +
                                                1,
                                            },
                                            (_, year) => (
                                              <th
                                                key={year}
                                                className="text-center"
                                              >
                                                Year {year}
                                              </th>
                                            )
                                          )}
                                          <th className="text-center">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td className="fw-bold">
                                            Net Cash Generation
                                          </td>
                                          {Array.from(
                                            {
                                              length:
                                                (scenario.projectDuration ||
                                                  proposedProjectDuration) +
                                                1,
                                            },
                                            (_, year) => (
                                              <td
                                                key={year}
                                                className="text-end"
                                              >
                                                ₹
                                                {new Intl.NumberFormat(
                                                  "en-IN",
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  }
                                                ).format(
                                                  calculateNetCashGeneration(
                                                    scenario.formData,
                                                    year
                                                  )
                                                )}
                                              </td>
                                            )
                                          )}
                                          <td className="text-end fw-bold">
                                            ₹
                                            {new Intl.NumberFormat(
                                              "en-IN",
                                              {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              }
                                            ).format(
                                              calculateTotalNetCashGeneration(
                                                scenario.formData,
                                                scenario.projectDuration ||
                                                proposedProjectDuration
                                              )
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* IRR Value Display */}
                                  <div className="alert alert-success">
                                    <div className="row">
                                      <div className="col-md-6">
                                        <h5 className="mb-0">
                                          {scenario.name} IRR Value
                                        </h5>
                                      </div>
                                      <div className="col-md-6 text-end">
                                        <h4 className="mb-0 fw-bold">
                                          {scenario.irrValue > 0
                                            ? `${scenario.irrValue.toFixed(2)}%`
                                            : "0.00%"}
                                        </h4>
                                        {scenario.results?.timestamp && (
                                          <div className="small text-muted mt-1">
                                            IRR Value ID:{" "}
                                            {new Date(
                                              scenario.results.timestamp
                                            ).toLocaleString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {scenario.irrError && (
                                    <div className="alert alert-danger small">
                                      {scenario.irrError}
                                    </div>
                                  )}

                                  {/* Calculate IRR and Save Buttons */}
                                  <div className="d-flex justify-content-center gap-3 mt-4">
                                    <button
                                      className="btn btn-info btn-lg"
                                      onClick={() =>
                                        calculateScenarioIRR(scenario.id)
                                      }
                                      disabled={scenario.irrLoading}
                                    >
                                      {scenario.irrLoading ? (
                                        <>
                                          <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                          ></span>
                                          Calculating IRR...
                                        </>
                                      ) : (
                                        <>Calculate IRR</>
                                      )}
                                    </button>
                                    <button
                                      className="btn btn-success btn-lg"
                                      onClick={() =>
                                        saveScenario(scenario.id)
                                      }
                                    >
                                      <FaSave className="me-2" />
                                      Save Scenario
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="alert alert-info">
                                <FaInfoCircle className="me-2" />
                                Please complete the IRR Calculation Form on
                                the IRR page to view the Proposed IRR
                                Scenario.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed horizontal scrollbar synced with scenarios container */}
      <div ref={fixedScrollbarRef} className="scenarios-fixed-scrollbar">
        <div
          ref={fixedScrollbarContentRef}
          className="scenarios-fixed-scrollbar-content"
        />
      </div>
    </div>
  );
};

export default IRRComparison;
