import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api-client";
import { FaChartLine, FaInfoCircle } from 'react-icons/fa';

// Global variable to store the calculated IRR value
let calculatedPermissibleIRR = 0;

const IRROnPermissible = () => {
  const [projectDuration, setProjectDuration] = useState(0);
  const [irrFormData, setIrrFormData] = useState({});
  const [baseValues, setBaseValues] = useState({});
  const [irrValue, setIrrValue] = useState(0);
  const [irrLoading, setIrrLoading] = useState(false);
  const [irrError, setIrrError] = useState("");

  useEffect(() => {
    // Function to load IRR form data
    const loadIRRFormData = () => {
      const savedData = localStorage.getItem("irrForm");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setProjectDuration(parsedData.projectDuration || 0);
        setIrrFormData(parsedData.formData || {});
      }
    };

    // Function to load base values from page 1
    const loadBaseValues = () => {
      // Get the calculated values from localStorage (saved by CostOutput component)
      const calculatedValues = JSON.parse(localStorage.getItem("calculatedCostValues") || "{}");

      if (calculatedValues.permissible) {
        // Use the calculated permissible values from CostOutput
        const newBaseValues = {
          revenue: calculatedValues.permissible.revenue || 0,
          landCost: calculatedValues.permissible.landCost || 0,
          approvalCost: calculatedValues.permissible.approvalCost || 0,
          constructionCost: calculatedValues.permissible.constructionCost || 0,
          administrativeCost: calculatedValues.permissible.administrativeCost || 0,
          ancillaryCost: calculatedValues.permissible.ancillaryCost || 0,
          tdrCost: calculatedValues.permissible.tdrCost || 0,
          premiumCost: calculatedValues.permissible.premiumCost || 0,
          marketingCost: calculatedValues.permissible.marketingCost || 0,
          contingencyCost: calculatedValues.permissible.contingencyCost || 0,
          financeCost: calculatedValues.permissible.financeCost || 0,
          miscellaneousCost: calculatedValues.permissible.miscellaneousCost || 0
        };

        // Debug logging to see what values are being fetched
        // //console.log("IRROnPermissible - Base Values from calculatedCostValues:", {
        //   calculatedValues,
        //   newBaseValues
        // });

        setBaseValues(newBaseValues);
      } else {
        // Fallback to old method if calculated values are not available
        //console.log("IRROnPermissible - No calculated values found, using fallback method");

        // Get the latest values from localStorage
        const revenueData = JSON.parse(localStorage.getItem("revenueForm") || "{}");
        const costData = JSON.parse(localStorage.getItem("costForm") || "{}");
        const landResults = JSON.parse(localStorage.getItem("landDetailsResults") || "{}");
        const zoningType = localStorage.getItem("zoningType") || "";

        // Calculate permissible revenue based on zoning type
        let permissibleRevenue = 0;
        const residentialRate = parseFloat(revenueData.residentialRate) || 0;
        const commercialRate = parseFloat(revenueData.commercialRate) || 0;
        const saleableArea = parseFloat(landResults.saleableArea) || 0;

        if (zoningType === 'residential' && residentialRate) {
          permissibleRevenue = saleableArea * residentialRate;
        } else if (zoningType === 'commercial' && commercialRate) {
          permissibleRevenue = saleableArea * commercialRate;
        } else if (zoningType === 'mixed' && residentialRate && commercialRate) {
          const residentialRevenue = (saleableArea * 0.7) * residentialRate;
          const commercialRevenue = (saleableArea * 0.3) * commercialRate;
          permissibleRevenue = residentialRevenue + commercialRevenue;
        }

        const newBaseValues = {
          revenue: permissibleRevenue,
          landCost: parseFloat(costData.landCost) || 0,
          approvalCost: parseFloat(costData.approvalCost) || 0,
          constructionCost: parseFloat(costData.constructionCost) || 0,
          administrativeCost: parseFloat(costData.administrativeCost) || 0,
          ancillaryCost: parseFloat(costData.ancillaryCost) || 0,
          tdrCost: parseFloat(costData.tdrCost) || 0,
          premiumCost: parseFloat(costData.premiumCost) || 0,
          marketingCost: parseFloat(costData.marketingCost) || 0,
          contingencyCost: parseFloat(costData.contingencyCost) || 0,
          financeCost: parseFloat(costData.financeCost) || 0,
          miscellaneousCost: parseFloat(costData.miscellaneousCost) || 0
        };

        //console.log("IRROnPermissible - Fallback Base Values:", {
        //   revenueData,
        //   costData,
        //   landResults,
        //   zoningType,
        //   permissibleRevenue,
        //   newBaseValues
        // });

        setBaseValues(newBaseValues);
      }
    };

    // Function to load saved IRR values
    const loadSavedIRRValues = () => {
      const savedResults = localStorage.getItem("irrPermissibleResults");
      if (savedResults) {
        const parsedResults = JSON.parse(savedResults);
        if (parsedResults.irrValue !== undefined && parsedResults.irrValue > 0) {
          // Update both the state and the global variable
          calculatedPermissibleIRR = parsedResults.irrValue;
          setIrrValue(calculatedPermissibleIRR);
          //console.log("IRROnPermissible - Loaded saved IRR value:", calculatedPermissibleIRR);
        }
        if (parsedResults.irrError !== undefined) {
          setIrrError(parsedResults.irrError);
        }
      }
    };

    // Load data initially
    loadIRRFormData();
    loadBaseValues();
    loadSavedIRRValues();

    // Set up interval to check for changes in localStorage
    const interval = setInterval(() => {
      loadIRRFormData();
      loadBaseValues(); // Also reload base values from page 1
      loadSavedIRRValues();
    }, 1000); // Check every second

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Remove automatic saving - only save when IRR is calculated

  // Remove automatic IRR calculation - will be triggered by button click only

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const calculateYearlyValue = (costType, year) => {
    let formKey;
    switch (costType) {
      case 'revenue':
        formKey = 'cashflow';
        break;
      case 'landCost':
        formKey = 'landcost';
        break;
      case 'approvalCost':
        formKey = 'approvalcost';
        break;
      case 'constructionCost':
        formKey = 'constructioncost';
        break;
      case 'administrativeCost':
        formKey = 'administrativecost';
        break;
      case 'ancillaryCost':
        formKey = 'ancillarycost';
        break;
      case 'tdrCost':
        formKey = 'tdrcost';
        break;
      case 'premiumCost':
        formKey = 'premiumcost';
        break;
      case 'marketingCost':
        formKey = 'marketingcost';
        break;
      case 'contingencyCost':
        formKey = 'contingencycost';
        break;
      case 'financeCost':
        formKey = 'financecost';
        break;
      case 'miscellaneousCost':
        formKey = 'miscellaneouscost';
        break;
      default:
        formKey = costType.toLowerCase();
    }

    const percentage = irrFormData[formKey]?.[year] || 0;
    const baseValue = baseValues[costType] || 0;
    const result = (baseValue * percentage) / 100;

    // Debug logging for miscellaneous cost
    // if (costType === 'miscellaneousCost') {
    //   //console.log(`Miscellaneous Cost Year ${year}:`, {
    //     formKey,
    //     percentage,
    //     baseValue,
    //     result,
    //     irrFormData: irrFormData[formKey]
    //   });
    // }

    return result;
  };

  const calculateTotal = (costType) => {
    let total = 0;
    for (let year = 0; year <= projectDuration; year++) {
      total += calculateYearlyValue(costType, year);
    }
    return total;
  };

  if (!projectDuration || Object.keys(baseValues).length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0 text-primary">
            <FaChartLine className="me-2" />
            IRR On Most Optimistic Revenue
            <span
              className="text-muted position-relative ms-2"
              style={{ cursor: 'help' }}
              title="IRR Computed On Max Potential Revenue Based on Permissible"
            >
              <FaInfoCircle style={{ width: '20px', height: '20px' }} />
            </span>
          </h5>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            Please complete the IRR Calculation Form above to view the results.
          </div>
        </div>
      </div>
    );
  }

  const revenueTypes = [
    { key: 'revenue', label: 'Cashflow' },
    { key: 'revenue', label: 'Total sales in flow' } // Same as Cashflow
  ];

  const costTypes = [
    { key: 'landCost', label: 'Land Cost' },
    { key: 'approvalCost', label: 'Approval Cost' },
    { key: 'constructionCost', label: 'Construction Cost' },
    { key: 'administrativeCost', label: 'Administrative Cost' },
    { key: 'ancillaryCost', label: 'Ancillary Cost' },
    { key: 'tdrCost', label: 'TDR Cost' },
    { key: 'premiumCost', label: 'Premium Cost' },
    { key: 'marketingCost', label: 'Marketing and Selling Cost' },
    { key: 'contingencyCost', label: 'Contingency Cost' },
    { key: 'financeCost', label: 'Finance Cost' },
    { key: 'miscellaneousCost', label: 'Miscellaneous Cost' }
  ];

  // Calculate Cost of Project (sum of all costs from Land Cost to Miscellaneous Cost)
  const calculateCostOfProject = (year) => {
    const costKeys = ['landCost', 'approvalCost', 'constructionCost', 'administrativeCost', 'ancillaryCost', 'tdrCost', 'premiumCost', 'marketingCost', 'contingencyCost', 'financeCost', 'miscellaneousCost'];
    return costKeys.reduce((total, costKey) => {
      return total + calculateYearlyValue(costKey, year);
    }, 0);
  };

  const calculateTotalCostOfProject = () => {
    let total = 0;
    for (let year = 0; year <= projectDuration; year++) {
      total += calculateCostOfProject(year);
    }
    return total;
  };

  // Calculate Net Cash Generation for each year
  const calculateNetCashGeneration = (year) => {
    const cashflow = calculateYearlyValue('revenue', year);
    const costOfProject = calculateCostOfProject(year);
    return cashflow - costOfProject;
  };

  const calculateTotalNetCashGeneration = () => {
    let total = 0;
    for (let year = 0; year <= projectDuration; year++) {
      total += calculateNetCashGeneration(year);
    }
    return total;
  };

  // Calculate IRR using backend API
  const calculateIRR = async () => {
    // Exit if project duration is invalid
    if (projectDuration <= 0) return;

    // Set loading state to true
    setIrrLoading(true);
    // Clear any previous errors
    setIrrError("");

    try {
      // Prepare cash flows array for IRR calculation
      const cashFlows = [];
      for (let year = 0; year <= projectDuration; year++) {
        cashFlows.push(calculateNetCashGeneration(year));
      }

      // Log input data for debugging
      console.log("IRROnPermissible - Sending request with:", {
        cash_flows: cashFlows,
        project_duration: projectDuration,
      });

      // Make API call using standard fetch
      const res = await fetch(apiUrl('/new_rate_simulator/simulator/calculate-irr'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cash_flows: cashFlows,
          project_duration: projectDuration,
        }),
      });
      const data = await res.json();

      // Log response data for debugging
      console.log("IRROnPermissible - Response data:", data);

      // Handle successful response: array of [irr_percentage, irr_decimal, irr_string]
      if (Array.isArray(data) && data.length === 3 && typeof data[0] === 'number' && !isNaN(data[0])) {
        const [irrPercentage, , irrString] = data;
        // Update both the state and the global variable
        calculatedPermissibleIRR = irrPercentage;
        setIrrValue(calculatedPermissibleIRR);

        // Log successful calculation
        console.log("IRROnPermissible - IRR calculated:", { irrPercentage, irrString });

        // Save results immediately with the correct value
        const results = {
          projectDuration,
          revenueTypes: revenueTypes.map(({ key, label }) => ({
            key,
            label,
            yearlyValues: Array.from({ length: projectDuration + 1 }, (_, year) => ({
              year,
              value: calculateYearlyValue(key, year)
            })),
            total: calculateTotal(key)
          })),
          costTypes: costTypes.map(({ key, label }) => ({
            key,
            label,
            yearlyValues: Array.from({ length: projectDuration + 1 }, (_, year) => ({
              year,
              value: calculateYearlyValue(key, year)
            })),
            total: calculateTotal(key)
          })),
          costOfProject: {
            yearlyValues: Array.from({ length: projectDuration + 1 }, (_, year) => ({
              year,
              value: calculateCostOfProject(year)
            })),
            total: calculateTotalCostOfProject()
          },
          baseValues,
          irrFormData: irrFormData, // Save the form data explicitly
          irrValue: calculatedPermissibleIRR, // Use the calculated value directly
          irrError: "",
          timestamp: new Date().toISOString()
        };

        // Ensure the IRR value is properly saved to localStorage with multiple safeguards
        try {
          // First, stringify the results
          const resultsString = JSON.stringify(results);

          // Save to localStorage
          localStorage.setItem("irrPermissibleResults", resultsString);
          console.log("IRROnPermissible - Saved results to localStorage with IRR value:", calculatedPermissibleIRR);

          // Double-check that the value was saved correctly
          const savedResults = localStorage.getItem("irrPermissibleResults");
          if (savedResults) {
            const parsedResults = JSON.parse(savedResults);
            console.log("IRROnPermissible - Verification of saved IRR value:", parsedResults.irrValue);

            // If the saved value doesn't match what we calculated, try saving again
            if (parsedResults.irrValue !== calculatedPermissibleIRR) {
              console.warn("IRROnPermissible - Saved IRR value doesn't match calculated value. Trying again...");
              localStorage.setItem("irrPermissibleResults", resultsString);

              // Save to a backup key as well
              localStorage.setItem("irrPermissibleResults_backup", resultsString);
            }
          } else {
            console.error("IRROnPermissible - Failed to verify saved results. Trying alternative storage method...");
            // Try saving with a different key as backup
            localStorage.setItem("irrPermissibleResults_backup", resultsString);
          }
        } catch (storageError) {
          console.error("IRROnPermissible - Error saving to localStorage:", storageError);
        }
      }
      // Handle error response: array with single error message
      else if (Array.isArray(data) && data.length === 1) {
        setIrrError(data[0] || "Failed to calculate IRR");
        calculatedPermissibleIRR = 0;
        setIrrValue(0);
      }
      // Handle unexpected response format
      else {
        setIrrError("Unexpected response format from server");
        calculatedPermissibleIRR = 0;
        setIrrValue(0);
      }
    } catch (error) {
      // Log and handle any errors during the API call
      console.error("IRROnPermissible - Error calculating IRR:", error);
      setIrrError("Failed to connect to IRR calculation service");
      calculatedPermissibleIRR = 0;
      setIrrValue(0);
    } finally {
      // Reset loading state
      setIrrLoading(false);
    }
  };

  // Remove the separate saveIRRPermissibleResults function since we're saving directly in calculateIRR

  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
      <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
        <h5 className="mb-0 fw-bold text-dark">
          <FaChartLine className="me-2 text-success" />
          IRR on Permissible
        </h5>
        <p className="text-muted small mb-0 mt-1">Calculated based on permissible FSI</p>
      </div>
      <div className="card-body p-4">
        {/* Revenue Table */}
        <div className="table-responsive rounded-3 border bg-white mb-4">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-light text-secondary">
              <tr>
                <th className="py-3 px-3 fw-semibold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Revenue Type</th>
                {Array.from({ length: projectDuration + 1 }, (_, year) => (
                  <th key={year} className="text-center py-3 px-2 fw-semibold small">Year {year}</th>
                ))}
                <th className="text-center py-3 px-3 fw-semibold small text-uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {revenueTypes.map(({ key, label }) => (
                <tr key={label}>
                  <td className="fw-semibold text-dark px-3">{label}</td>
                  {Array.from({ length: projectDuration + 1 }, (_, year) => (
                    <td key={year} className="text-end px-2 text-muted small">
                      ₹{formatNumber(calculateYearlyValue(key, year))}
                    </td>
                  ))}
                  <td className="text-end fw-bold text-success px-3">
                    ₹{formatNumber(calculateTotal(key))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost Table */}
        <div className="table-responsive rounded-3 border bg-white">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-light text-secondary">
              <tr>
                <th className="py-3 px-3 fw-semibold small text-uppercase" style={{ letterSpacing: '0.5px' }}>Cost Type</th>
                {Array.from({ length: projectDuration + 1 }, (_, year) => (
                  <th key={year} className="text-center py-3 px-2 fw-semibold small">Year {year}</th>
                ))}
                <th className="text-center py-3 px-3 fw-semibold small text-uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {costTypes.map(({ key, label }) => (
                <tr key={key}>
                  <td className="fw-medium text-dark px-3">{label}</td>
                  {Array.from({ length: projectDuration + 1 }, (_, year) => (
                    <td key={year} className="text-end px-2 text-muted small">
                      ₹{formatNumber(calculateYearlyValue(key, year))}
                    </td>
                  ))}
                  <td className="text-end fw-bold text-dark px-3">
                    ₹{formatNumber(calculateTotal(key))}
                  </td>
                </tr>
              ))}
              {/* Cost of Project Row */}
              <tr className="bg-light bg-opacity-50">
                <td className="fw-bold text-primary px-3">Cost of project</td>
                {Array.from({ length: projectDuration + 1 }, (_, year) => (
                  <td key={year} className="text-end fw-bold text-primary small px-2">
                    ₹{formatNumber(calculateCostOfProject(year))}
                  </td>
                ))}
                <td className="text-end fw-bold text-primary px-3">
                  ₹{formatNumber(calculateTotalCostOfProject())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* IRR Calculation Table */}
        <div className="table-responsive rounded-3 border bg-white mt-4">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-warning bg-opacity-10 text-dark">
              <tr>
                <th className="py-3 px-3 fw-semibold small text-uppercase">IRR Calculation</th>
                {Array.from({ length: projectDuration + 1 }, (_, year) => (
                  <th key={year} className="text-center py-3 px-2 fw-semibold small">Year {year}</th>
                ))}
                <th className="text-center py-3 px-3 fw-semibold small text-uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-bold text-dark px-3">Net Cash Generation</td>
                {Array.from({ length: projectDuration + 1 }, (_, year) => (
                  <td key={year} className="text-end small px-2">
                    ₹{formatNumber(calculateNetCashGeneration(year))}
                  </td>
                ))}
                <td className="text-end fw-bold text-dark px-3">
                  ₹{formatNumber(calculateTotalNetCashGeneration())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Project IRR Display */}
        <div className="mt-4">
          <div className="alert alert-light border shadow-sm rounded-4">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h6 className="mb-0 fw-bold text-secondary text-uppercase small ls-1 text-dark">Project IRR</h6>
                {irrError && <small className="text-danger d-block mt-1">{irrError}</small>}
              </div>
              <div className="col-md-6 text-end">
                <div className="d-flex justify-content-end align-items-center gap-3">
                  <button
                    className="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-medium"
                    onClick={calculateIRR}
                    disabled={irrLoading || projectDuration <= 0}
                  >
                    {irrLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Calculating...
                      </>
                    ) : (
                      'Calculate'
                    )}
                  </button>
                  <div className="bg-white rounded-3 px-3 py-2 border shadow-sm">
                    <h4 className="mb-0 fw-bold text-success">
                      {irrValue > 0 ? `${irrValue.toFixed(2)}%` : '0.00%'}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IRROnPermissible;
