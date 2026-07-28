import React, { useState, useEffect } from 'react';

const CostComparisonOutput = ({ data }) => {
  const [costData, setCostData] = useState(null);
  const [landResults, setLandResults] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [landFormData, setLandFormData] = useState(null);
  const [fsiProposalData, setFSIProposalData] = useState(null);
  const [proposedTotal, setProposedTotal] = useState(0);

  useEffect(() => {
    const loadData = () => {
      const savedCostData = localStorage.getItem('costData');
      const savedLandResults = localStorage.getItem('landCalculationResults');
      const savedRevenueData = localStorage.getItem('revenueCalculationResults');
      const savedLandFormData = localStorage.getItem('landFormData');
      const savedFSIProposalData = localStorage.getItem('fsiProposalData');

      if (savedCostData) setCostData(JSON.parse(savedCostData));
      if (savedLandResults) setLandResults(JSON.parse(savedLandResults));
      if (savedRevenueData) setRevenueData(JSON.parse(savedRevenueData));
      if (savedLandFormData) setLandFormData(JSON.parse(savedLandFormData));
      if (savedFSIProposalData) {
        const fsiData = JSON.parse(savedFSIProposalData);
        setFSIProposalData(fsiData);
        
        // Calculate proposed total FSI
        const basic = landResults?.basicFSI || 0;
        const premium = parseFloat(fsiData.proposedPremium || '0');
        const tdr = parseFloat(fsiData.proposedTDR || '0');
        const ancillaryCommercial = parseFloat(fsiData.proposedAncillaryCommercial || '0');
        const ancillaryResidential = parseFloat(fsiData.proposedAncillaryResidential || '0');
        
        let total = basic + premium + tdr;
        if (landFormData?.zoningType === 'mixed') {
          total += ancillaryCommercial + ancillaryResidential;
        } else if (landFormData?.zoningType === 'commercial') {
          total += ancillaryCommercial;
        } else if (landFormData?.zoningType === 'residential') {
          total += ancillaryResidential;
        }
        
        setProposedTotal(total);
      }
    };

    loadData();

    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [landResults, landFormData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(Math.round(num));
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(num));
  };

  if (!costData || !landResults || !revenueData || !landFormData || !fsiProposalData) {
    return (
      <div className="card w-100">
        <div className="card-header">
          <h5 className="card-title">Section 3: Cost Comparison</h5>
        </div>
        <div className="card-body">
          <p className="text-muted">
            Please complete all previous sections to view cost comparison.
          </p>
        </div>
      </div>
    );
  }

  // Calculate values
  const landCost = parseFloat(costData.landCost || '0');
  const approvalCost = parseFloat(costData.approvalCost || '0');
  const constructionRate = parseFloat(costData.constructionRate || '0');
  const administrativeCost = parseFloat(costData.administrativeCost || '0');
  const governmentLandRate = parseFloat(costData.governmentLandRate || '0');
  const tdrCost = parseFloat(costData.tdrCost || '0');
  const miscellaneousCost = parseFloat(costData.miscellaneousCost || '0');

  // Construction costs
  const permissibleConstructionCost = landResults.maxPermissibleArea * constructionRate;
  const proposedConstructionCost = proposedTotal * constructionRate;

  // Marketing & Selling costs
  const permissibleMarketingCost = revenueData.maxRevenue * 0.05;
  const proposedMarketingCost = revenueData.proposedRevenue * 0.05;

  // Ancillary costs calculation
  const calculateAncillaryCosts = () => {
    const location = landFormData.location.toLowerCase();
    const zoningType = landFormData.zoningType;
    const isPuneOrThane = location === 'pune' || location === 'thane';
    const multiplier = isPuneOrThane ? 0.15 : 0.10;

    let permissibleAncillary = 0;
    let proposedAncillary = 0;

    if (zoningType === 'Residential') {
      permissibleAncillary = (landResults.tdr * 0.6) * (governmentLandRate * multiplier);
      proposedAncillary = (parseFloat(fsiProposalData.proposedTDR || '0') * 0.6) * (governmentLandRate * multiplier);
    } else if (zoningType === 'Commercial') {
      permissibleAncillary = (landResults.tdr * 0.8) * (governmentLandRate * multiplier);
      proposedAncillary = (parseFloat(fsiProposalData.proposedTDR || '0') * 0.8) * (governmentLandRate * multiplier);
    } else if (zoningType === 'Mixed') {
      const permissibleAncillaryCommercial = landResults.commercialMax * 0.8;
      const permissibleAncillaryResidential = landResults.residentialMax * 0.6;
      permissibleAncillary = (permissibleAncillaryCommercial + permissibleAncillaryResidential) * governmentLandRate * multiplier;
      
      const proposedAncillaryCommercial = parseFloat(fsiProposalData.proposedAncillaryCommercial || '0');
      const proposedAncillaryResidential = parseFloat(fsiProposalData.proposedAncillaryResidential || '0');
      proposedAncillary = (proposedAncillaryCommercial + proposedAncillaryResidential) * governmentLandRate * multiplier;
    }

    return { permissibleAncillary, proposedAncillary };
  };

  const { permissibleAncillary, proposedAncillary } = calculateAncillaryCosts();

  // Premium costs
  const permissiblePremiumCost = landResults.premium * governmentLandRate * 0.35;
  const proposedPremiumCost = parseFloat(fsiProposalData.proposedPremium || '0') * governmentLandRate * 0.35;

  // Contingency costs
  const permissibleContingencyCost = permissibleConstructionCost * 0.03;
  const proposedContingencyCost = proposedConstructionCost * 0.03;

  // Total costs
  const totalPermissibleCost = landCost + permissibleConstructionCost + approvalCost + 
    permissibleMarketingCost + administrativeCost + permissibleAncillary + tdrCost + 
    permissiblePremiumCost + permissibleContingencyCost + miscellaneousCost;

  const totalProposedCost = landCost + proposedConstructionCost + approvalCost + 
    proposedMarketingCost + administrativeCost + proposedAncillary + tdrCost + 
    proposedPremiumCost + proposedContingencyCost + miscellaneousCost;

  const costItems = [
    {
      particular: 'Land Cost',
      permissible: formatCurrency(landCost),
      proposed: formatCurrency(landCost)
    },
    {
      particular: 'Construction Cost',
      permissible: formatCurrency(permissibleConstructionCost),
      proposed: formatCurrency(proposedConstructionCost)
    },
    {
      particular: 'Approval Cost',
      permissible: formatCurrency(approvalCost),
      proposed: formatCurrency(approvalCost)
    },
    {
      particular: 'Marketing & Selling Cost',
      permissible: formatCurrency(permissibleMarketingCost),
      proposed: formatCurrency(proposedMarketingCost)
    },
    {
      particular: 'Administrative Cost',
      permissible: formatCurrency(administrativeCost),
      proposed: formatCurrency(administrativeCost)
    },
    {
      particular: 'Ancillary Cost',
      permissible: formatCurrency(permissibleAncillary),
      proposed: formatCurrency(proposedAncillary)
    },
    {
      particular: 'TDR Cost',
      permissible: formatCurrency(tdrCost),
      proposed: formatCurrency(tdrCost)
    },
    {
      particular: 'Premium Cost',
      permissible: formatCurrency(permissiblePremiumCost),
      proposed: formatCurrency(proposedPremiumCost)
    },
    {
      particular: 'Contingency Cost',
      permissible: formatCurrency(permissibleContingencyCost),
      proposed: formatCurrency(proposedContingencyCost)
    },
    {
      particular: 'Miscellaneous Cost',
      permissible: formatCurrency(miscellaneousCost),
      proposed: formatCurrency(miscellaneousCost)
    }
  ];

  return (
    <div className="card w-100">
      <div className="card-header">
        <h5 className="card-title">Section 3: Cost Comparison</h5>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th className="w-33 fw-semibold">Particulars</th>
                <th className="w-33 fw-semibold text-center">Permissible Cost</th>
                <th className="w-33 fw-semibold text-center">Proposed Cost</th>
              </tr>
            </thead>
            <tbody>
              {costItems.map((item, index) => (
                <tr key={index}>
                  <td className="fw-medium py-3">{item.particular}</td>
                  <td className="text-center py-3">{item.permissible}</td>
                  <td className="text-center py-3">{item.proposed}</td>
                </tr>
              ))}
              <tr className="border-top border-primary border-2 bg-light">
                <td className="fw-bold py-4">Cost Of Project</td>
                <td className="fw-bold text-center py-4">{formatCurrency(totalPermissibleCost)}</td>
                <td className="fw-bold text-center py-4">{formatCurrency(totalProposedCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostComparisonOutput; 