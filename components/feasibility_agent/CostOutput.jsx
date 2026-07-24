import { useState, useEffect } from "react";

const CostOutput = ({ data }) => {
  const [savedData, setSavedData] = useState(null);
  const [landResults, setLandResults] = useState(null);
  const [fsiProposalData, setFsiProposalData] = useState(null);
  const [landFormData, setLandFormData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [zoningType, setZoningType] = useState("");
  const [expectedRevenueData, setExpectedRevenueData] = useState(null);
  const [unitDesignStructure, setUnitDesignStructure] = useState(null);
  const [areaCalculationResults, setAreaCalculationResults] = useState(null);
  
  const selectedPanelStyles = `
    .nr-selected-panel {
      background: #ffffff;
      border: 1px solid #e7ebf1;
      border-radius: 24px;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .nr-selected-header {
      padding: 24px 26px 16px;
      background: #ffffff;
      border-bottom: 1px solid #edf1f6;
    }
    .nr-selected-eyebrow {
      color: #8b95a5;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .nr-selected-title {
      color: #111827;
      font-size: 32px;
      line-height: 1;
      font-weight: 800;
      margin: 0;
    }
    .nr-selected-body {
      padding: 26px;
      background: #ffffff;
    }
    .nr-table-card {
      border: 1px solid #dbe3ee;
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
    }
    .nr-selected-panel .table {
      margin-bottom: 0;
    }
    .nr-selected-panel .table thead th {
      background: #f4f7fb;
      border-color: #dbe3ee;
      color: #334155;
      font-size: 12px;
      font-weight: 800;
    }
    .nr-selected-panel .table tbody td {
      border-color: #e4eaf2;
      color: #334155;
      vertical-align: middle;
    }
    .nr-inner-card {
      border: 1px solid #dbe3ee !important;
      border-radius: 18px !important;
      overflow: hidden;
      background: #ffffff;
    }
    .nr-inner-card .card-header {
      background: #f8fafc;
      border-bottom: 1px solid #edf1f6;
      padding: 18px 20px;
    }
    .nr-inner-card .card-title {
      color: #111827 !important;
      font-size: 22px;
      font-weight: 800;
    }
    .nr-inner-card .card-body {
      padding: 18px;
    }
  `;


  useEffect(() => {
    const saved = localStorage.getItem("costForm");
    if (saved) {
      setSavedData(JSON.parse(saved));
    }

    // Get data from other components
    const savedLandResults = localStorage.getItem("landDetailsResults");
    if (savedLandResults) {
      setLandResults(JSON.parse(savedLandResults));
    }

    const savedFsiProposal = localStorage.getItem("fsiProposalData");
    if (savedFsiProposal) {
      setFsiProposalData(JSON.parse(savedFsiProposal));
    }

    const savedLandForm = localStorage.getItem("landDetailsForm");
    if (savedLandForm) {
      setLandFormData(JSON.parse(savedLandForm));
    }

    const savedRevenue = localStorage.getItem("revenueForm");
    if (savedRevenue) {
      setRevenueData(JSON.parse(savedRevenue));
    }

    const savedZoningType = localStorage.getItem("zoningType");
    if (savedZoningType) {
      setZoningType(savedZoningType.toLowerCase());
    }

    try {
      const savedExpectedRevenue = localStorage.getItem('expectedRevenueData');
      if (savedExpectedRevenue) setExpectedRevenueData(JSON.parse(savedExpectedRevenue));
    } catch { }

    try {
      const savedUnitDesign = localStorage.getItem('unitDesignStructure');
      if (savedUnitDesign) setUnitDesignStructure(JSON.parse(savedUnitDesign));
    } catch { }

    try {
      const savedAreaResults = localStorage.getItem('areaCalculationResults');
      if (savedAreaResults) setAreaCalculationResults(JSON.parse(savedAreaResults));
    } catch { }
  }, []);

  useEffect(() => {
    if (data) {
      setSavedData(data);
    }
  }, [data]);

  // Save calculated values to localStorage whenever they change
  useEffect(() => {
    if (savedData && landResults && revenueData && fsiProposalData) {
      const calculatedValues = {
        permissible: {
          revenue: calculateRevenue(false),
          landCost: parseFloat(savedData.landCost) || 0,
          approvalCost: calculateApprovalCost(false),
          constructionCost: (parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(savedData.constructionRate) || 0),
          administrativeCost: calculateAdministrativeCost(false),
          ancillaryCost: calculateAncillaryCost(false),
          tdrCost: calculateTDRCost(false),
          premiumCost: (parseFloat(landResults?.premium) || 0) * (parseFloat(savedData.governmentLandRate) || 0) * 0.35,
          marketingCost: getMarketingCoefficient() * calculateRevenue(false),
          contingencyCost: (parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(savedData.constructionRate) || 0) * 0.03,
          financeCost: calculateFinanceCost(false),
          miscellaneousCost: calculateMiscellaneousCost(false)
        },
        proposed: {
          revenue: calculateRevenue(true),
          landCost: parseFloat(savedData.landCost) || 0,
          approvalCost: calculateApprovalCost(true),
          constructionCost: calculateProposedMaxPermissibleArea() * (parseFloat(savedData.constructionRate) || 0),
          administrativeCost: calculateAdministrativeCost(true),
          ancillaryCost: calculateAncillaryCost(true),
          tdrCost: calculateTDRCost(true),
          premiumCost: (parseFloat(fsiProposalData?.Proposed_Premium_FSI) || 0) * (parseFloat(savedData.governmentLandRate) || 0) * 0.35,
          marketingCost: getMarketingCoefficient() * calculateRevenue(true),
          contingencyCost: calculateProposedMaxPermissibleArea() * (parseFloat(savedData.constructionRate) || 0) * 0.03,
          financeCost: calculateFinanceCost(true),
          miscellaneousCost: calculateMiscellaneousCost(true)
        }
      };

      // Save to localStorage
      localStorage.setItem("calculatedCostValues", JSON.stringify(calculatedValues));

      // Debug logging
      console.log("CostOutput - Saved calculated values to localStorage:", calculatedValues);
    }
  }, [savedData, landResults, revenueData, fsiProposalData, landFormData, zoningType, expectedRevenueData, unitDesignStructure, areaCalculationResults]);

  // Listen for updates from other components
  useEffect(() => {
    const handleLandDetailsUpdate = () => {
      const savedLandResults = localStorage.getItem("landDetailsResults");
      if (savedLandResults) {
        setLandResults(JSON.parse(savedLandResults));
      }

      const savedLandForm = localStorage.getItem("landDetailsForm");
      if (savedLandForm) {
        setLandFormData(JSON.parse(savedLandForm));
      }

      const savedZoningType = localStorage.getItem("zoningType");
      if (savedZoningType) {
        setZoningType(savedZoningType.toLowerCase());
      }
    };

    const handleFsiProposalUpdate = () => {
      const savedFsiProposal = localStorage.getItem("fsiProposalData");
      if (savedFsiProposal) {
        setFsiProposalData(JSON.parse(savedFsiProposal));
      }
    };

    const handleRevenueUpdate = () => {
      const savedRevenue = localStorage.getItem("revenueForm");
      if (savedRevenue) {
        setRevenueData(JSON.parse(savedRevenue));
      }
    };

    const handleCostFormUpdate = () => {
      const savedCostForm = localStorage.getItem("costForm");
      if (savedCostForm) {
        setSavedData(JSON.parse(savedCostForm));
      }
    };

    const handleExpectedRevenueUpdate = () => {
      const saved = localStorage.getItem("expectedRevenueData");
      if (saved) setExpectedRevenueData(JSON.parse(saved));
    };

    const handleUnitDesignUpdate = () => {
      const saved = localStorage.getItem("unitDesignStructure");
      if (saved) setUnitDesignStructure(JSON.parse(saved));
    };

    const handleAreaCalculationUpdate = () => {
      const saved = localStorage.getItem("areaCalculationResults");
      if (saved) setAreaCalculationResults(JSON.parse(saved));
    };

    window.addEventListener('landDetailsUpdated', handleLandDetailsUpdate);
    window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
    window.addEventListener('revenueFormUpdated', handleRevenueUpdate);
    window.addEventListener('costFormUpdated', handleCostFormUpdate);
    window.addEventListener('expectedRevenueSaved', handleExpectedRevenueUpdate);
    window.addEventListener('unitDesignStructureUpdated', handleUnitDesignUpdate);
    window.addEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);

    return () => {
      window.removeEventListener('landDetailsUpdated', handleLandDetailsUpdate);
      window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
      window.removeEventListener('revenueFormUpdated', handleRevenueUpdate);
      window.removeEventListener('costFormUpdated', handleCostFormUpdate);
      window.removeEventListener('expectedRevenueSaved', handleExpectedRevenueUpdate);
      window.removeEventListener('unitDesignStructureUpdated', handleUnitDesignUpdate);
      window.removeEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
    };
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  // Helper functions for calculations
  const calculateProposedMaxPermissibleArea = () => {
    if (!fsiProposalData) return 0;
    const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;

    return proposedMaxBuilding +
      (zoningType === 'commercial' && fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant ?
        proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) : 0) +
      (zoningType === 'residential' && fsiProposalData.Proposed_Residential_Ancillary_Area_Constant ?
        proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) : 0) +
      (zoningType === 'mixed' ?
        ((proposedMaxBuilding *
          ((parseFloat(landFormData?.commercialSplit) || 0) / 100)) *
          (parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0)) +
        ((proposedMaxBuilding *
          ((parseFloat(landFormData?.residentialSplit) || 0) / 100)) *
          (parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0)) : 0);
  };

  const getProposedRevenue = () => {
    if (!expectedRevenueData) return 0;
    // Use revenueMethod saved in revenueForm; default to 'bayesian' if not set
    const method = revenueData?.revenueMethod || 'bayesian';
    if (method === 'basic') {
      return expectedRevenueData?.excelLogic?.total || 0;
    }
    return expectedRevenueData?.bayesianOpt?.total || 0;
  };

  const calculateRevenue = (isProposed = false) => {
    if (!revenueData || !landResults) return 0;

    if (isProposed) {
      return getProposedRevenue();
    } else {
      // Default to 'carpet' if Unit Design Structure hasn't been explicitly saved yet
      const calcMode = unitDesignStructure?.calculationMode || 'carpet';

      // If unitDesignStructure is set to 'carpet' logic
      if (calcMode === 'carpet' && areaCalculationResults?.carpetArea) {
        const pCarpet = areaCalculationResults.carpetArea.permissible || 0;
        const prCarpet = areaCalculationResults.carpetArea.proposed || 0;
        
        if (prCarpet > 0) {
          return (pCarpet / prCarpet) * getProposedRevenue();
        }
      }

      // If unitDesignStructure is set to 'saleable' logic
      if (calcMode === 'saleable' && areaCalculationResults?.saleableArea) {
        const pSaleable = areaCalculationResults.saleableArea.permissible || 0;
        const prSaleable = areaCalculationResults.saleableArea.proposed || 0;
        
        if (prSaleable > 0) {
          return (pSaleable / prSaleable) * getProposedRevenue();
        }
      }

      // Fallbacks if not carpet logic or missing data
      if (zoningType === 'residential' && revenueData.residentialRate) {
        const maxPermissibleArea = getMaxPermissibleAreaPermissible();
        const carpetArea = maxPermissibleArea * 0.85;
        const saleableArea = carpetArea * 1.35;
        return saleableArea * parseFloat(revenueData.residentialRate);
      } else if (zoningType === 'commercial' && revenueData.commercialRate) {
        const maxPermissibleArea = getMaxPermissibleAreaPermissible();
        const carpetArea = maxPermissibleArea * 0.85;
        const saleableArea = carpetArea * 1.4;
        return saleableArea * parseFloat(revenueData.commercialRate);
      } else if (zoningType === 'mixed' && revenueData.residentialRate && revenueData.commercialRate) {
        return (getCommercialMaxAreaPermissible() * 0.85 * 1.4 * parseFloat(revenueData.commercialRate)) +
          (getResidentialMaxAreaPermissible() * 0.85 * 1.35 * parseFloat(revenueData.residentialRate));
      }
    }
    return 0;
  };

  // Helper functions for mixed zoning revenue calculation (same as LocationOutput.jsx)
  const getCommercialMaxAreaPermissible = () => {
    return parseFloat(landResults?.commercialMax) || 0;
  };

  const getCommercialMaxAreaProposed = () => {
    if (!fsiProposalData || !landFormData) return 0;
    const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;
    const commercialSplit = (parseFloat(landFormData.commercialSplit) || 0) / 100;
    const ancillaryConstant = parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0;

    return (proposedMaxBuilding * commercialSplit) +
      (proposedMaxBuilding * commercialSplit * ancillaryConstant);
  };

  const getResidentialMaxAreaPermissible = () => {
    return parseFloat(landResults?.residentialMax) || 0;
  };

  const getResidentialMaxAreaProposed = () => {
    if (!fsiProposalData || !landFormData) return 0;
    const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;
    const residentialSplit = (parseFloat(landFormData.residentialSplit) || 0) / 100;
    const ancillaryConstant = parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0;

    return (proposedMaxBuilding * residentialSplit) +
      (proposedMaxBuilding * residentialSplit * ancillaryConstant);
  };

  const calculateAncillaryArea = (isProposed = false) => {
    if (!landResults) return 0;

    if (zoningType === 'residential') {
      return parseFloat(landResults.ancillary) || 0;
    } else if (zoningType === 'commercial') {
      return parseFloat(landResults.ancillary) || 0;
    } else if (zoningType === 'mixed') {
      const commercialAncillary = parseFloat(landResults.commercialMax) || 0;
      const residentialAncillary = parseFloat(landResults.residentialMax) || 0;
      return commercialAncillary + residentialAncillary;
    }
    return 0;
  };

  const calculateAncillaryCost = (isProposed = false) => {
    const govtLandRate = parseFloat(savedData?.governmentLandRate) || 0;

    // Check if location is Pune or Thane
    const location = landFormData?.location?.toLowerCase() || '';
    const isPuneOrThane = location === 'pune' || location === 'thane';

    let ancillaryArea = 0;
    let factor = isPuneOrThane ? 0.15 : 0.10; // Factor based on location for all zoning types

    if (zoningType === 'mixed') {
      if (isProposed) {
        // For proposed, calculate ancillary areas using the same formulas as FSI Proposal Results
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const commercialSplit = (parseFloat(landFormData?.commercialSplit) || 0) / 100;
        const residentialSplit = (parseFloat(landFormData?.residentialSplit) || 0) / 100;
        const commercialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
        const residentialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;

        // Use the same formulas as in FSI Proposal Results
        const commercialAncillary = (proposedMaxBuilding * commercialSplit) * commercialAncillaryConstant;
        const residentialAncillary = (proposedMaxBuilding * residentialSplit) * residentialAncillaryConstant;

        ancillaryArea = commercialAncillary + residentialAncillary;
      } else {
        // For permissible, use ancillary areas from Permissible VS Proposed Cost Breakdown</h6>
        const commercialAncillary = (parseFloat(landResults?.maxBuildingPotential) || 0) *
          ((parseFloat(landFormData?.commercialSplit) || 0) / 100) * 0.8;
        const residentialAncillary = (parseFloat(landResults?.maxBuildingPotential) || 0) *
          ((parseFloat(landFormData?.residentialSplit) || 0) / 100) * 0.6;

        ancillaryArea = commercialAncillary + residentialAncillary;
      }
    } else if (zoningType === 'residential') {
      if (isProposed) {
        // For proposed residential, use Ancillary Area for Residential from Proposed FSI Results
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const residentialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;
        ancillaryArea = proposedMaxBuilding * residentialAncillaryConstant;
      } else {
        // For permissible residential, use Ancillary Area for Residential from Permissible FSI Results
        ancillaryArea = parseFloat(landResults?.ancillary) || 0;
      }
    } else if (zoningType === 'commercial') {
      if (isProposed) {
        // For proposed commercial, use Ancillary Area for Commercial from Proposed FSI Results
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const commercialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
        ancillaryArea = proposedMaxBuilding * commercialAncillaryConstant;
      } else {
        // For permissible commercial, use Ancillary Area for Commercial from Permissible FSI Results
        ancillaryArea = parseFloat(landResults?.ancillary) || 0;
      }
    }

    // Debug logging
    console.log('Ancillary Cost Calculation:', {
      isProposed,
      ancillaryArea,
      govtLandRate,
      location,
      isPuneOrThane,
      zoningType,
      factor,
      result: ancillaryArea * govtLandRate * factor
    });

    return ancillaryArea * govtLandRate * factor;
  };

  const calculateTDRCost = (isProposed = false) => {
    const tdrRate = parseFloat(savedData?.tdrCost) || 0; // This is now TDR Rate from form

    if (isProposed) {
      // TDR Cost for Proposed = TDR Rate * TDR FSI for Proposed from FSI Proposal Results
      const proposedTDRFSI = parseFloat(fsiProposalData?.Proposed_TDR_FSI) || 0;
      return tdrRate * proposedTDRFSI;
    } else {
      // TDR Cost for Permissible = TDR Rate * TDR FSI for Permissible from FSI Proposal Results
      const permissibleTDRFSI = parseFloat(landResults?.tdr) || 0;
      return tdrRate * permissibleTDRFSI;
    }
  };

  const calculateTotalCost = (isProposed = false) => {
    const landCost = parseFloat(savedData?.landCost) || 0;
    const approvalCost = calculateApprovalCost(isProposed);
    const constructionCost = isProposed ?
      calculateProposedMaxPermissibleArea() * (parseFloat(savedData?.constructionRate) || 0) :
      (parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(savedData?.constructionRate) || 0);
    const administrativeCost = calculateAdministrativeCost(isProposed);
    const ancillaryCost = calculateAncillaryCost(isProposed);
    const tdrCost = calculateTDRCost(isProposed);
    const premiumCost = isProposed ?
      (parseFloat(fsiProposalData?.Proposed_Premium_FSI) || 0) * (parseFloat(savedData?.governmentLandRate) || 0) * 0.35 :
      (parseFloat(landResults?.premium) || 0) * (parseFloat(savedData?.governmentLandRate) || 0) * 0.35;
    const marketingCost = calculateRevenue(isProposed) * getMarketingCoefficient();
    const contingencyCost = constructionCost * 0.03;
    const financeCost = calculateFinanceCost(isProposed);
    const miscellaneousCost = calculateMiscellaneousCost(isProposed);
    return landCost + approvalCost + constructionCost + administrativeCost +
      ancillaryCost + tdrCost + premiumCost + marketingCost +
      contingencyCost + financeCost + miscellaneousCost;
  };

  const getMarketingCoefficient = () => {
    const coeff = parseFloat(savedData?.marketingCoefficient);
    if (!isNaN(coeff) && coeff >= 0.05 && coeff <= 0.08) {
      return coeff;
    }
    return 0.05; // fallback default
  };

  // Helper functions for Max Permissible Area calculations (same as FSIProposalOutput.jsx)
  const getMaxPermissibleAreaPermissible = () => {
    if (!landResults) return 0;

    const savedZoningType = typeof window !== 'undefined' ? localStorage.getItem('zoningType')?.toLowerCase() : zoningType;
    if (savedZoningType === 'mixed') {
      return parseFloat(landResults.maxPermissibleArea) || 0;
    }

    const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
    const ancillaryArea = parseFloat(landResults.ancillary) || 0;

    const totalMaxPermissibleArea = maxBuildingPotential + ancillaryArea;

    return totalMaxPermissibleArea;
  };

  const getMaxPermissibleAreaProposed = () => {
    if (!fsiProposalData) return 0;
    const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;

    return proposedMaxBuilding +
      (zoningType === 'commercial' && fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant ?
        proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) : 0) +
      (zoningType === 'residential' && fsiProposalData.Proposed_Residential_Ancillary_Area_Constant ?
        proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) : 0) +
      (zoningType === 'mixed' ?
        ((proposedMaxBuilding *
          ((parseFloat(landFormData?.commercialSplit) || 0) / 100)) *
          (parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0)) +
        ((proposedMaxBuilding *
          ((parseFloat(landFormData?.residentialSplit) || 0) / 100)) *
          (parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0)) : 0);
  };

  // Helper functions for cost calculations with new formulas
  const calculateApprovalCost = (isProposed = false) => {
    const approvalCostFromForm = parseFloat(savedData?.approvalCost) || 0;
    const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
    const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

    if (isProposed) {
      return approvalCostFromForm;
    } else {
      if (maxPermissibleAreaProposed > 0) {
        return (approvalCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
      }
      return approvalCostFromForm;
    }
  };

  const calculateAdministrativeCost = (isProposed = false) => {
    const administrativeCostFromForm = parseFloat(savedData?.administrativeCost) || 0;
    const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
    const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

    if (isProposed) {
      return administrativeCostFromForm;
    } else {
      if (maxPermissibleAreaProposed > 0) {
        return (administrativeCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
      }
      return administrativeCostFromForm;
    }
  };

  const calculateFinanceCost = (isProposed = false) => {
    const financeCostFromForm = parseFloat(savedData?.financeCost) || 0;
    const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
    const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

    if (isProposed) {
      return financeCostFromForm;
    } else {
      if (maxPermissibleAreaProposed > 0) {
        return (financeCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
      }
      return financeCostFromForm;
    }
  };

  const calculateMiscellaneousCost = (isProposed = false) => {
    const miscellaneousCostFromForm = parseFloat(savedData?.miscellaneousCost) || 0;
    const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
    const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

    if (isProposed) {
      return miscellaneousCostFromForm;
    } else {
      if (maxPermissibleAreaProposed > 0) {
        return (miscellaneousCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
      }
      return miscellaneousCostFromForm;
    }
  };

  if (!savedData) {
    return (
      <div className="nr-selected-panel h-100">
        <style>{selectedPanelStyles}</style>
        <div className="nr-selected-header">
          <div className="nr-selected-eyebrow">Selected Section</div>
          <h2 className="nr-selected-title">Permissible VS Proposed Cost Breakdown</h2>
        </div>
        <div className="nr-selected-body">
          <p className="text-muted text-center py-4">
            No cost data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nr-selected-panel h-100">
      <style>{selectedPanelStyles}</style>
      <div className="nr-selected-header">
        <div className="nr-selected-eyebrow">Selected Section</div>
        <h2 className="nr-selected-title">Permissible VS Proposed Cost Breakdown</h2>
      </div>
      <div className="nr-selected-body">
        <div className="table-responsive nr-table-card">
          <table className="table table-sm table-bordered table-striped mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Particulars</th>
                <th className="small fw-semibold text-end">Total Cost As Permissible FSI</th>
                <th className="small fw-semibold text-end">Total Cost As Proposed FSI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="small fw-medium">Land Cost</td>
                <td className="small text-end">₹{formatNumber(parseFloat(savedData.landCost) || 0)}</td>
                <td className="small text-end">₹{formatNumber(parseFloat(savedData.landCost) || 0)}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Approval Cost</td>
                <td className="small text-end">₹{formatNumber(calculateApprovalCost(false))}</td>
                <td className="small text-end">₹{formatNumber(calculateApprovalCost(true))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Construction Cost</td>
                <td className="small text-end">₹{formatNumber((parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(savedData.constructionRate) || 0))}</td>
                <td className="small text-end">₹{formatNumber(calculateProposedMaxPermissibleArea() * (parseFloat(savedData.constructionRate) || 0))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Administrative Cost</td>
                <td className="small text-end">₹{formatNumber(calculateAdministrativeCost(false))}</td>
                <td className="small text-end">₹{formatNumber(calculateAdministrativeCost(true))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Ancillary Cost</td>
                <td className="small text-end">₹{formatNumber(calculateAncillaryCost(false))}</td>
                <td className="small text-end">₹{formatNumber(calculateAncillaryCost(true))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">TDR Cost</td>
                <td className="small text-end">₹{formatNumber(calculateTDRCost(false))}</td>
                <td className="small text-end">₹{formatNumber(calculateTDRCost(true))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Premium Cost</td>
                <td className="small text-end">₹{formatNumber((parseFloat(landResults?.premium) || 0) * (parseFloat(savedData.governmentLandRate) || 0) * 0.35)}</td>
                <td className="small text-end">₹{formatNumber((parseFloat(fsiProposalData?.Proposed_Premium_FSI) || 0) * (parseFloat(savedData.governmentLandRate) || 0) * 0.35)}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Marketing and Selling Cost</td>
                <td className="small text-end">₹{formatNumber(getMarketingCoefficient() * calculateRevenue(false))}</td>
                <td className="small text-end">₹{formatNumber(getMarketingCoefficient() * calculateRevenue(true))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Contingency Cost</td>
                <td className="small text-end">₹{formatNumber((parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(savedData.constructionRate) || 0) * 0.03)}</td>
                <td className="small text-end">₹{formatNumber(calculateProposedMaxPermissibleArea() * (parseFloat(savedData.constructionRate) || 0) * 0.03)}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Finance Cost</td>
                <td className="small text-end">₹{formatNumber(calculateFinanceCost(false))}</td>
                <td className="small text-end">₹{formatNumber(calculateFinanceCost(true))}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Miscellaneous Cost</td>
                <td className="small text-end">₹{formatNumber(calculateMiscellaneousCost(false))}</td>
                <td className="small text-end">₹{formatNumber(calculateMiscellaneousCost(true))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cost of Project Section */}
        <div className="mt-4">
          <div className="card nr-inner-card">
            <div className="card-header">
              <h2 className="card-title mb-0" style={{ color: '#448C74' }}>Cost of Project</h2>
            </div>
            <div className="card-body">
              <div className="table-responsive nr-table-card">
                <table className="table table-sm table-bordered table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="small fw-semibold">Particulars</th>
                      <th className="small fw-semibold text-end">Permissible</th>
                      <th className="small fw-semibold text-end">Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="table-primary">
                      <td className="small fw-bold">Total Cost of Project</td>
                      <td className="small fw-bold text-end">₹{formatNumber(calculateTotalCost(false))}</td>
                      <td className="small fw-bold text-end">₹{formatNumber(calculateTotalCost(true))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostOutput; 
