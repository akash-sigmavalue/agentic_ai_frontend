import { useState, useEffect } from "react";
import { FaCalculator, FaSave } from 'react-icons/fa';

const IRRCalculationForm = ({ onCalculate, autofillData = null }) => {
  const [projectDuration, setProjectDuration] = useState(1);
  const [autofillNotice, setAutofillNotice] = useState("");
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

  const [formData, setFormData] = useState(defaultFormData);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const savedData = localStorage.getItem("irrForm");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setProjectDuration(parsedData.projectDuration || 1);
      if (parsedData.formData) {
        setFormData({ ...defaultFormData, ...parsedData.formData });
      }
    }
  }, []);

  useEffect(() => {
    if (!autofillData?.formData || autofillData.appliedAt == null) {
      return;
    }

    const duration = Math.min(
      15,
      Math.max(1, parseInt(autofillData.projectDuration, 10) || 1)
    );
    setProjectDuration(duration);
    setFormData({ ...defaultFormData, ...autofillData.formData });
    setValidationErrors({});
    setAutofillNotice(
      "Form autofilled from cashflow simulation. Review values and click Save Breakdown."
    );

    localStorage.setItem(
      "irrForm",
      JSON.stringify({
        projectDuration: duration,
        formData: autofillData.formData,
        timestamp: new Date().toISOString(),
        source: "cashflowSimulation",
      })
    );
    window.dispatchEvent(
      new CustomEvent("irrFormAutofilled", { detail: autofillData })
    );

    const timer = window.setTimeout(() => setAutofillNotice(""), 8000);
    return () => window.clearTimeout(timer);
  }, [autofillData?.appliedAt]);

  const handleProjectDurationChange = (e) => {
    const value = Math.min(15, Math.max(1, parseInt(e.target.value) || 1));
    setProjectDuration(value);

    // Clear form data when project duration changes
    const newFormData = {
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
    setFormData(newFormData);
    setValidationErrors({});

    // Save to localStorage
    localStorage.setItem("irrForm", JSON.stringify({
      projectDuration: value,
      formData: newFormData
    }));
  };

  const handleCostChange = (costType, year, value) => {
    const newFormData = {
      ...formData,
      [costType]: {
        ...formData[costType],
        [year]: parseFloat(value) || 0
      }
    };
    setFormData(newFormData);

    // Save to localStorage
    localStorage.setItem("irrForm", JSON.stringify({
      projectDuration,
      formData: newFormData
    }));
  };

  const validatePercentages = () => {
    const errors = {};
    const costTypes = ['cashflow', 'landcost', 'approvalcost', 'constructioncost', 'administrativecost', 'ancillarycost', 'tdrcost', 'premiumcost', 'marketingcost', 'contingencycost', 'financecost', 'miscellaneouscost'];

    costTypes.forEach(costType => {
      let total = 0;
      for (let year = 0; year <= projectDuration; year++) {
        total += formData[costType][year] || 0;
      }

      if (Math.abs(total - 100) > 0.01) {
        errors[costType] = `Total percentage for ${costType} must be 100%. Current total: ${total.toFixed(2)}%`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveBreakdown = () => {
    if (!validatePercentages()) {
      return;
    }

    // Check if required data is available
    const costData = JSON.parse(localStorage.getItem("costForm") || "{}");
    const landResults = JSON.parse(localStorage.getItem("landDetailsResults") || "{}");
    const revenueData = JSON.parse(localStorage.getItem("revenueForm") || "{}");

    if (!costData || !landResults || !revenueData) {
      alert("Please complete the Cost Details, Land Details, and Revenue sections first.");
      return;
    }

    // Save the breakdown data to localStorage
    const breakdownData = {
      projectDuration,
      formData,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem("ProposedBreakdown", JSON.stringify(breakdownData));

    // Also save to irrForm for consistency
    localStorage.setItem("irrForm", JSON.stringify({
      projectDuration,
      formData,
      timestamp: new Date().toISOString()
    }));

    //console.log("IRRCalculationForm - Saved breakdown data to localStorage");

    // Pass results to parent component
    onCalculate({ message: "Breakdown saved successfully!" });

    // Show success message
    alert("Breakdown has been saved successfully! Check the tables below for results.");
  };



  const getProposedBaseValues = (costData, landResults, revenueData, fsiProposalData, landDetailsForm, zoningType) => {
    // For Proposed scenario, we need to get the actual values from the Revenue Details and Cost Details pages
    // These values should come from the "Proposed" columns in the stored data in localStorage

    // Get the latest values from localStorage
    const latestRevenueData = JSON.parse(localStorage.getItem("revenueForm") || "{}");
    const latestCostData = JSON.parse(localStorage.getItem("costForm") || "{}");
    const latestLandResults = JSON.parse(localStorage.getItem("landDetailsResults") || "{}");
    const latestFsiData = JSON.parse(localStorage.getItem("fsiProposalData") || "{}");

    // Calculate revenue based on latest data (same as permissible for now, but can be different)
    const residentialRate = parseFloat(latestRevenueData.residentialRate) || 0;
    const commercialRate = parseFloat(latestRevenueData.commercialRate) || 0;
    const carpetArea = parseFloat(latestLandResults.carpetArea) || 0;
    const saleableArea = parseFloat(latestLandResults.saleableArea) || 0;

    let revenue = 0;
    if (zoningType === 'residential' && residentialRate) {
      revenue = saleableArea * residentialRate;
    } else if (zoningType === 'commercial' && commercialRate) {
      revenue = saleableArea * commercialRate;
    } else if (zoningType === 'mixed' && residentialRate && commercialRate) {
      // For mixed, calculate based on the split
      const residentialRevenue = (saleableArea * 0.7) * residentialRate;
      const commercialRevenue = (saleableArea * 0.3) * commercialRate;
      revenue = residentialRevenue + commercialRevenue;
    }

    return {
      revenue: revenue,
      landCost: parseFloat(latestCostData.landCost) || 0,
      approvalCost: parseFloat(latestCostData.approvalCost) || 0,
      constructionCost: parseFloat(latestCostData.constructionCost) || 0,
      administrativeCost: parseFloat(latestCostData.administrativeCost) || 0,
      ancillaryCost: parseFloat(latestCostData.ancillaryCost) || 0,
      tdrCost: parseFloat(latestCostData.tdrCost) || 0,
      premiumCost: parseFloat(latestCostData.premiumCost) || 0,
      marketingCost: parseFloat(latestCostData.marketingCost) || 0,
      contingencyCost: parseFloat(latestCostData.contingencyCost) || 0,
      financeCost: parseFloat(latestCostData.financeCost) || 0,
      miscellaneousCost: parseFloat(latestCostData.miscellaneousCost) || 0
    };
  };

  const calculateYearlyBreakdown = (baseValues, formData) => {
    const breakdown = {};
    const costTypes = ['revenue', 'landCost', 'approvalCost', 'constructionCost', 'administrativeCost', 'ancillaryCost', 'tdrCost', 'premiumCost', 'marketingCost', 'contingencyCost', 'financeCost', 'miscellaneousCost'];

    costTypes.forEach(costType => {
      breakdown[costType] = {};
      let total = 0;

      for (let year = 0; year <= projectDuration; year++) {
        // Map cost type to form data key
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

        const percentage = formData[formKey]?.[year] || 0;
        const yearlyValue = (baseValues[costType] * percentage) / 100;
        breakdown[costType][year] = yearlyValue;
        total += yearlyValue;
      }

      breakdown[costType].total = total;
    });

    return breakdown;
  };

  const calculateRevenue = (revenueData, area) => {
    const ratePerSqFt = parseFloat(revenueData.ratePerSqFt) || 0;
    return ratePerSqFt * area;
  };

  const getMaxPermissibleAreaPermissible = (landArea, zoningType) => {
    // Use permissible FSI values
    const fsiData = JSON.parse(localStorage.getItem("fsiProposalData") || "{}");
    const permissibleFSI = parseFloat(fsiData.permissibleFSI) || 1.5;
    return landArea * permissibleFSI;
  };

  const getMaxPermissibleAreaProposed = (landArea, zoningType) => {
    // Use proposed FSI values
    const fsiData = JSON.parse(localStorage.getItem("fsiProposalData") || "{}");
    const proposedFSI = parseFloat(fsiData.proposedFSI) || 2.0;
    return landArea * proposedFSI;
  };

  const calculateApprovalCost = (costData, maxArea) => {
    return maxArea * parseFloat(costData.approvalCost || 0);
  };

  const calculateConstructionCost = (costData, maxArea) => {
    return maxArea * parseFloat(costData.constructionRate || 0);
  };

  const calculateAdministrativeCost = (costData, maxArea) => {
    return maxArea * parseFloat(costData.administrativeCost || 0);
  };

  const calculateAncillaryCost = (costData, maxArea, landDetailsForm) => {
    const location = landDetailsForm.location?.toLowerCase() || '';
    const isPuneOrThane = location === 'pune' || location === 'thane';
    const multiplier = isPuneOrThane ? 0.15 : 0.10;
    return maxArea * parseFloat(costData.constructionRate || 0) * multiplier;
  };

  const calculateTDRCost = (costData, maxArea) => {
    return maxArea * parseFloat(costData.tdrCost || 0);
  };

  const calculatePremiumCost = (costData, landResults) => {
    const premium = parseFloat(landResults?.premium) || 0;
    const governmentLandRate = parseFloat(costData.governmentLandRate || 0);
    return premium * governmentLandRate * 0.35;
  };

  const calculatePremiumCostProposed = (costData, fsiProposalData) => {
    const proposedPremium = parseFloat(fsiProposalData.Proposed_Premium_FSI) || 0;
    const governmentLandRate = parseFloat(costData.governmentLandRate || 0);
    return proposedPremium * governmentLandRate * 0.35;
  };

  const calculateMarketingCost = (revenue) => {
    const marketingCoefficient = 0.05; // 5% of revenue
    return revenue * marketingCoefficient;
  };

  const calculateContingencyCost = (costData, maxArea) => {
    return maxArea * parseFloat(costData.constructionRate || 0) * 0.03;
  };

  const calculateFinanceCost = (costData, maxArea) => {
    return maxArea * parseFloat(costData.constructionRate || 0) * 0.12;
  };

  const renderYearInputs = () => {
    const costTypes = [
      { key: 'cashflow', label: 'Sales Cash Inflow' },
      { key: 'landcost', label: 'Land Costs' },
      { key: 'approvalcost', label: 'Approval Costs' },
      { key: 'constructioncost', label: 'Construction Costs' },
      { key: 'administrativecost', label: 'Administrative Costs' },
      { key: 'ancillarycost', label: 'Ancillary Costs' },
      { key: 'tdrcost', label: 'TDR Costs' },
      { key: 'premiumcost', label: 'Premium Costs' },
      { key: 'marketingcost', label: 'Marketing and Selling Costs' },
      { key: 'contingencycost', label: 'Contingency Costs' },
      { key: 'financecost', label: 'Finance Costs' },
      { key: 'miscellaneouscost', label: 'Miscellaneous Costs' }
    ];

    return costTypes.map(({ key, label }) => (
      <div key={key} className="col-12 mb-3">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-header bg-white border-0 pt-3 px-3 pb-0">
            <h6 className="mb-0 fw-bold text-dark">{label}</h6>
            <small className="text-muted">Enter percentage values</small>
          </div>
          <div className="card-body p-3">
            <div className="row g-2">
              {Array.from({ length: projectDuration + 1 }, (_, year) => (
                <div key={year} className="col-md-2 col-sm-3 col-4 mb-1">
                  <label className="form-label small fw-medium text-secondary mb-1 text-dark">Year {year}</label>
                  <input
                    type="number"
                    className={`form-control form-control-sm bg-light border-0 ${validationErrors[key] ? 'is-invalid' : ''}`}
                    value={formData[key][year] || ''}
                    onChange={(e) => handleCostChange(key, year, e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    style={{ fontSize: '0.875rem' }}
                  />
                  {validationErrors[key] && year === 0 && (
                    <div className="invalid-feedback small">{validationErrors[key]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift h-100">
      <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
        <h5 className="mb-0 fw-bold text-dark">
          <FaCalculator className="text-primary me-3" />
          IRR Calculation Form
        </h5>
        <p className="text-muted small mb-0 mt-1">Enter project details and cost distribution over years</p>
      </div>
      <div className="card-body p-4">
        {autofillNotice ? (
          <div
            className="alert alert-success py-2 px-3 small mb-3"
            role="status"
          >
            {autofillNotice}
          </div>
        ) : null}
        <div className="row mb-4">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Cashflow Projection years</label>
            <input
              type="number"
              className="form-control form-control-lg bg-light border-0"
              value={projectDuration}
              onChange={handleProjectDurationChange}
              min="1"
              max="15"
              placeholder="Enter duration"
            />
            <small className="text-muted ps-1">Max: 15 years</small>
          </div>
        </div>

        <div className="row g-3">
          {renderYearInputs()}
        </div>

        <div className="row mt-5">
          <div className="col-12 text-center">
            <button
              type="button"
              className="btn btn-primary btn-lg rounded-pill px-5 shadow-sm fw-semibold card-hover-lift"
              onClick={saveBreakdown}
            >
              <FaSave className="me-2" />
              Save Breakdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IRRCalculationForm;