import { useState, useEffect } from "react";


const RevenueOutput = ({ data }) => {
  const [savedData, setSavedData] = useState(null);
  const [zoningType, setZoningType] = useState("");
  const [landResults, setLandResults] = useState(null);
  const [fsiProposalData, setFsiProposalData] = useState(null);
  const [landFormData, setLandFormData] = useState(null);
  const [expectedRevenueData, setExpectedRevenueData] = useState(null);
  const [unitDesignStructure, setUnitDesignStructure] = useState(null);
  const [areaCalculationResults, setAreaCalculationResults] = useState(null);

 useEffect(() => {
    const saved = localStorage.getItem("revenueForm");
    if (saved) {
      setSavedData(JSON.parse(saved));
    }

    const savedZoningType = localStorage.getItem("zoningType");
    if (savedZoningType) {
      setZoningType(savedZoningType.toLowerCase());
    }

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

    const savedExpectedRevenue = localStorage.getItem("expectedRevenueData");
    if (savedExpectedRevenue) {
      setExpectedRevenueData(JSON.parse(savedExpectedRevenue));
    }

    const savedUnitDesign = localStorage.getItem("unitDesignStructure");
    if (savedUnitDesign) {
      setUnitDesignStructure(JSON.parse(savedUnitDesign));
    }

    const savedAreaResults = localStorage.getItem("areaCalculationResults");
    if (savedAreaResults) {
      setAreaCalculationResults(JSON.parse(savedAreaResults));
    }
  }, []);

  useEffect(() => {
    if (data) {
      setSavedData(data);
    }
  }, [data]);

  // Listen for zoning type changes
 // Listen for zoning type changes
  useEffect(() => {
    const handleZoningChange = () => {
      const savedZoningType = localStorage.getItem("zoningType");
      if (savedZoningType) {
        setZoningType(savedZoningType.toLowerCase());
      }

      // Also refresh land results data when land details are updated
      const savedLandResults = localStorage.getItem("landDetailsResults");
      if (savedLandResults) {
        setLandResults(JSON.parse(savedLandResults));
      }

      // Also refresh land form data for mixed zoning calculations
      const savedLandForm = localStorage.getItem("landDetailsForm");
      if (savedLandForm) {
        setLandFormData(JSON.parse(savedLandForm));
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
        setSavedData(JSON.parse(savedRevenue));
      }
    };

    const handleExpectedRevenueUpdate = (event) => {
      if (event && event.detail) {
        setExpectedRevenueData(event.detail);
      } else {
        const savedExpectedRevenue = localStorage.getItem("expectedRevenueData");
        if (savedExpectedRevenue) {
          setExpectedRevenueData(JSON.parse(savedExpectedRevenue));
        }
      }
    };

    const handleUnitDesignUpdate = () => {
      const savedUnitDesign = localStorage.getItem("unitDesignStructure");
      if (savedUnitDesign) {
        setUnitDesignStructure(JSON.parse(savedUnitDesign));
      }
    };

    const handleAreaCalculationUpdate = () => {
      const savedAreaResults = localStorage.getItem("areaCalculationResults");
      if (savedAreaResults) {
        setAreaCalculationResults(JSON.parse(savedAreaResults));
      }
    };

    window.addEventListener('landDetailsUpdated', handleZoningChange);
    window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
    window.addEventListener('revenueFormUpdated', handleRevenueUpdate);
    window.addEventListener('expectedRevenueSaved', handleExpectedRevenueUpdate);
    window.addEventListener('unitDesignStructureUpdated', handleUnitDesignUpdate);
    window.addEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);

    return () => {
      window.removeEventListener('landDetailsUpdated', handleZoningChange);
      window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
      window.removeEventListener('revenueFormUpdated', handleRevenueUpdate);
      window.removeEventListener('expectedRevenueSaved', handleExpectedRevenueUpdate);
      window.removeEventListener('unitDesignStructureUpdated', handleUnitDesignUpdate);
      window.removeEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
    };
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const formatRevenue = (num) => {
    // For revenue calculations, we want to be more precise and avoid rounding errors
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

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

  const getCommercialMaxAreaPermissible = () => {
    if (zoningType === 'mixed' && landResults && landFormData) {
      // For mixed zoning, calculate Commercial Max Area from Land Details Results
      const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
      const commercialSplit = (parseFloat(landFormData.commercialSplit) || 0) / 100;
      const ancillaryCommercial = (maxBuildingPotential * commercialSplit) * 0.8;
      return ancillaryCommercial + (maxBuildingPotential * commercialSplit);
    }
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
    if (zoningType === 'mixed' && landResults && landFormData) {
      // For mixed zoning, calculate Residential Max Area from Land Details Results
      const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
      const residentialSplit = (parseFloat(landFormData.residentialSplit) || 0) / 100;
      const ancillaryResidential = (maxBuildingPotential * residentialSplit) * 0.6;
      return ancillaryResidential + (maxBuildingPotential * residentialSplit);
    }
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

  // Helper functions to get correct Max Permissible Area values from FSI Proposal Results
  const getMaxPermissibleAreaPermissible = () => {
    // For commercial and residential, we should use the Max Permissible Area from Land Details Results
    // This should match exactly what the Land Details form calculates
    if (!landResults) return 0;

    // Use the exact same calculation as Land Details form
    // For commercial: maxPermissibleArea = maxBuildingPotential + ancillary
    // For residential: maxPermissibleArea = maxBuildingPotential + ancillary
    const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
    const ancillaryArea = parseFloat(landResults.ancillary) || 0;

    const totalMaxPermissibleArea = maxBuildingPotential + ancillaryArea;

    return totalMaxPermissibleArea;
  };

  const getMaxPermissibleAreaProposed = () => {
    if (!fsiProposalData) return 0;

    // For proposed, use the calculated Max Permissible Area from FSI Proposal Results
    return calculateProposedMaxPermissibleArea();
  };

  const getProposedRevenue = () => {
    if (!expectedRevenueData) return 0;
    // Use revenueMethod saved in revenueForm; default to 'bayesian' if not set
    const method = savedData?.revenueMethod || 'bayesian';
    if (method === 'basic') {
      return expectedRevenueData?.excelLogic?.total || 0;
    }
    return expectedRevenueData?.bayesianOpt?.total || 0;
  };

  const getPermissibleRevenue = (zoningArg) => {
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

    // Fallback: use FSI area ratio (maxPermissibleArea / maxProposedArea) × Proposed Revenue
    // This works even when areaCalculationResults hasn't been saved yet
    const permArea = getMaxPermissibleAreaPermissible();
    const propArea = getMaxPermissibleAreaProposed();
    if (propArea > 0) {
      return (permArea / propArea) * getProposedRevenue();
    }

    return 0;
  };

  if (!savedData) {
    return (
      <div className="nr-selected-panel h-100">
        <style>{`
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
            border: 1px solid #e5eaf2;
            background: #fbfcff;
            border-radius: 18px;
            overflow: hidden;
          }
          .nr-selected-panel .table thead th {
            background: #f4f7fb !important;
            color: #3f4a5a !important;
            border-color: #e2e8f0 !important;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .nr-selected-panel .table tbody td {
            border-color: #e2e8f0 !important;
            color: #273242;
          }
        `}</style>
        <div className="nr-selected-header">
          <div className="nr-selected-eyebrow">Selected Section</div>
          <h6 className="nr-selected-title">Revenue Projection based on Area and Rate</h6>
        </div>
        <div className="nr-selected-body">
          <p className="text-muted text-center py-4">
            No revenue data available
          </p>
        </div>
      </div>
    );
  }


 return (
  <div className="nr-selected-panel h-100">
    <style>{`
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
        border: 1px solid #e5eaf2;
        background: #fbfcff;
        border-radius: 18px;
        overflow: hidden;
      }
      .nr-selected-panel .table thead th {
        background: #f4f7fb !important;
        color: #3f4a5a !important;
        border-color: #e2e8f0 !important;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .nr-selected-panel .table tbody td {
        border-color: #e2e8f0 !important;
        color: #273242;
      }
    `}</style>
    <div className="nr-selected-header">
      <div className="nr-selected-eyebrow">Selected Section</div>
      <h2 className="nr-selected-title">Revenue Projection based on Area and Rate</h2>
    </div>
    <div className="nr-selected-body">
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
            {zoningType === 'residential' && expectedRevenueData && (
              <tr className="table-primary">
                <td className="small fw-bold">Revenue</td>
                <td className="small fw-bold text-end">₹{formatRevenue(getPermissibleRevenue())}</td>
                <td className="small fw-bold text-end">₹{formatRevenue(getProposedRevenue())}</td>
              </tr>
            )}

            {zoningType === 'commercial' && expectedRevenueData && (
              <tr className="table-primary">
                <td className="small fw-bold">Revenue</td>
                <td className="small fw-bold text-end">₹{formatRevenue(getPermissibleRevenue())}</td>
                <td className="small fw-bold text-end">₹{formatRevenue(getProposedRevenue())}</td>
              </tr>
            )}

            {zoningType === 'mixed' && expectedRevenueData && (
              <tr className="table-primary">
                <td className="small fw-bold">Revenue</td>
                <td className="small fw-bold text-end">₹{formatRevenue(getPermissibleRevenue())}</td>
                <td className="small fw-bold text-end">₹{formatRevenue(getProposedRevenue())}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
};

export default RevenueOutput; 
