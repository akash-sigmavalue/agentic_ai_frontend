import { useEffect, useState } from "react";

const UpdatedRevenue = ({ isDark = false }) => {
  const [values, setValues] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("calculatedCostValues");
    if (saved) setValues(JSON.parse(saved));

    const onUpdate = () => {
      const latest = localStorage.getItem("calculatedCostValues");
      if (latest) setValues(JSON.parse(latest));
    };
    window.addEventListener('costFormUpdated', onUpdate);
    window.addEventListener('landDetailsUpdated', onUpdate);
    window.addEventListener('revenueFormUpdated', onUpdate);
    window.addEventListener('fsiProposalUpdated', onUpdate);
    return () => {
      window.removeEventListener('costFormUpdated', onUpdate);
      window.removeEventListener('landDetailsUpdated', onUpdate);
      window.removeEventListener('revenueFormUpdated', onUpdate);
      window.removeEventListener('fsiProposalUpdated', onUpdate);
    };
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

  const getTotals = () => {
    const permissible = values?.permissible || {};
    const proposed = values?.proposed || {};

    let premiumAmount = 0;
    const sumCosts = (obj) => {
      const costKeys = [
        'landCost','approvalCost','constructionCost','administrativeCost','ancillaryCost',
        'tdrCost','premiumCost','marketingCost','contingencyCost','financeCost','miscellaneousCost'
      ];
      let total = costKeys.reduce((acc, k) => acc + (parseFloat(obj?.[k]) || 0), 0);
      // Ownership Check page adjustment: add premiumAmount from ownership form (if any)
      const oc = JSON.parse(localStorage.getItem('ownershipCheck') || localStorage.getItem('landDetailsForm') || '{}');
      premiumAmount = parseFloat(oc?.premiumAmount) || 0;
      total += premiumAmount;
      return total;
    };

    // Get ownership form data
    const oc = JSON.parse(localStorage.getItem('ownershipCheck') || localStorage.getItem('landDetailsForm') || '{}');
    const areaPercentage = Math.min(100, Math.max(0, parseFloat(oc?.areaPercentage) || 0));
    const commercialAreaPercentage = Math.min(100, Math.max(0, parseFloat(oc?.commercialAreaPercentage) || 0));
    const residentialAreaPercentage = Math.min(100, Math.max(0, parseFloat(oc?.residentialAreaPercentage) || 0));
    
    // Get revenue data for calculations
    const revenueData = JSON.parse(localStorage.getItem('revenueForm') || '{}');
    const landResults = JSON.parse(localStorage.getItem('landDetailsResults') || '{}');
    const fsiProposalData = JSON.parse(localStorage.getItem('fsiProposalData') || '{}');
    const landFormData = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
    const zoningType = localStorage.getItem('zoningType')?.toLowerCase() || '';

    // Calculate original saleable areas (before area percentage adjustment)
    const getOriginalSaleableAreaPermissible = () => {
      if (zoningType === 'residential') {
        const maxPermissibleArea = parseFloat(landResults?.maxPermissibleArea) || 0;
        return maxPermissibleArea * 0.85 * 1.35;
      } else if (zoningType === 'commercial') {
        const maxPermissibleArea = parseFloat(landResults?.maxPermissibleArea) || 0;
        return maxPermissibleArea * 0.85 * 1.4;
      } else if (zoningType === 'mixed') {
        const commercialMax = parseFloat(landResults?.commercialMax) || 0;
        const residentialMax = parseFloat(landResults?.residentialMax) || 0;
        return (commercialMax * 0.85 * 1.4) + (residentialMax * 0.85 * 1.35);
      }
      return 0;
    };

    const getOriginalSaleableAreaProposed = () => {
      if (zoningType === 'residential') {
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const residentialAncillary = proposedMaxBuilding * (parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0);
        const maxPermissibleArea = proposedMaxBuilding + residentialAncillary;
        return maxPermissibleArea * 0.85 * 1.35;
      } else if (zoningType === 'commercial') {
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const commercialAncillary = proposedMaxBuilding * (parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0);
        const maxPermissibleArea = proposedMaxBuilding + commercialAncillary;
        return maxPermissibleArea * 0.85 * 1.4;
      } else if (zoningType === 'mixed') {
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const commercialSplit = (parseFloat(landFormData?.commercialSplit) || 0) / 100;
        const residentialSplit = (parseFloat(landFormData?.residentialSplit) || 0) / 100;
        const commercialAncillary = (proposedMaxBuilding * commercialSplit) * (parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0);
        const residentialAncillary = (proposedMaxBuilding * residentialSplit) * (parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0);
        
        const commercialArea = (proposedMaxBuilding * commercialSplit) + commercialAncillary;
        const residentialArea = (proposedMaxBuilding * residentialSplit) + residentialAncillary;
        
        return (commercialArea * 0.85 * 1.4) + (residentialArea * 0.85 * 1.35);
      }
      return 0;
    };

    // Helper functions for mixed zoning calculations
    // (No longer needed because we compute inline in both places where used)

    // Calculate developer share saleable areas (after area percentage adjustment)
    const originalSaleablePerm = getOriginalSaleableAreaPermissible();
    const originalSaleableProp = getOriginalSaleableAreaProposed();
    
    let developerSharePerm, developerShareProp;
    let revenuePermOverride = null;
    let revenuePropOverride = null;
    
    if (zoningType === 'mixed') {
      // For mixed zoning, calculate separate commercial and residential areas
      const commercialMaxPerm = parseFloat(landResults?.commercialMax) || 0;
      const residentialMaxPerm = parseFloat(landResults?.residentialMax) || 0;
      
      // Saleable areas
      const commercialSaleablePerm = commercialMaxPerm * 0.85 * 1.4;
      const residentialSaleablePerm = residentialMaxPerm * 0.85 * 1.35;
      
      const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
      const commercialSplit = (parseFloat(landFormData?.commercialSplit) || 0) / 100;
      const residentialSplit = (parseFloat(landFormData?.residentialSplit) || 0) / 100;
      const commAncC = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
      const resAncC = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;
      const commercialMaxProp = (proposedMaxBuilding * commercialSplit) + (proposedMaxBuilding * commercialSplit * commAncC);
      const residentialMaxProp = (proposedMaxBuilding * residentialSplit) + (proposedMaxBuilding * residentialSplit * resAncC);
      const commercialSaleableProp = commercialMaxProp * 0.85 * 1.4;
      const residentialSaleableProp = residentialMaxProp * 0.85 * 1.35;
      
      // Apply area percentages separately on saleable areas
      const commPct = commercialAreaPercentage;
      const resPct = residentialAreaPercentage;
      const commercialDeveloperSharePerm = commercialSaleablePerm * (1 - commPct / 100);
      const residentialDeveloperSharePerm = residentialSaleablePerm * (1 - resPct / 100);
      const commercialDeveloperShareProp = commercialSaleableProp * (1 - commPct / 100);
      const residentialDeveloperShareProp = residentialSaleableProp * (1 - resPct / 100);
      
      developerSharePerm = commercialDeveloperSharePerm + residentialDeveloperSharePerm;
      developerShareProp = commercialDeveloperShareProp + residentialDeveloperShareProp;
      
      // Compute revenue directly from saleable developer shares and rates
      const commercialRate = parseFloat(revenueData?.commercialRate) || 0;
      const residentialRate = parseFloat(revenueData?.residentialRate) || 0;
      revenuePermOverride = (commercialDeveloperSharePerm * commercialRate) + (residentialDeveloperSharePerm * residentialRate);
      revenuePropOverride = (commercialDeveloperShareProp * commercialRate) + (residentialDeveloperShareProp * residentialRate);
    } else {
      // For residential and commercial, use single area percentage on total saleable area
      developerSharePerm = originalSaleablePerm - (originalSaleablePerm * areaPercentage / 100);
      developerShareProp = originalSaleableProp - (originalSaleableProp * areaPercentage / 100);
    }

    // Calculate revenue based on developer share areas
    const calculateRevenueFromArea = (saleableArea) => {
      if (zoningType === 'residential' && revenueData.residentialRate) {
        return saleableArea * parseFloat(revenueData.residentialRate);
      } else if (zoningType === 'commercial' && revenueData.commercialRate) {
        return saleableArea * parseFloat(revenueData.commercialRate);
      } else if (zoningType === 'mixed' && revenueData.residentialRate && revenueData.commercialRate) {
        // For mixed we already computed direct totals above
        return null;
      }
      return 0;
    };

    const revenuePerm = revenuePermOverride !== null ? revenuePermOverride : calculateRevenueFromArea(developerSharePerm);
    const revenueProp = revenuePropOverride !== null ? revenuePropOverride : calculateRevenueFromArea(developerShareProp);

    // Ownership Check page adjustment: revenue share percentage applied on revenue and added to cost
    const revenueSharePct = Math.min(100, Math.max(0, parseFloat(oc?.revenueShare) || 0));
    const revenueSharePerm = (revenuePerm * revenueSharePct) / 100;
    const revenueShareProp = (revenueProp * revenueSharePct) / 100;
    let costPerm = sumCosts(permissible) + revenueSharePerm;
    let costProp = sumCosts(proposed) + revenueShareProp;
    const grossPerm = revenuePerm - costPerm;
    const grossProp = revenueProp - costProp;
    
    const result = { 
      revenuePerm, revenueProp, revenueSharePct, revenueSharePerm, revenueShareProp, 
      premiumAmount, costPerm, costProp, grossPerm, grossProp,
      areaPercentage, originalSaleablePerm, originalSaleableProp, developerSharePerm, developerShareProp,
      commercialAreaPercentage, residentialAreaPercentage
    };
    // Persist for this page
    try {
      const payload = { ...result, timestamp: new Date().toISOString() };
      localStorage.setItem('ownershipUpdatedRevenue', JSON.stringify(payload));
      // Also save under a general-friendly key name per request
      localStorage.setItem('updatedRevenue', JSON.stringify(payload));
    } catch {
      // ignore storage errors in private mode
    }
    return result;
  };

  return (
    <div className={`card mt-4 ${isDark ? 'bg-dark text-white border-secondary' : ''}`}>
      <div className="card-header">
        <h6 className="card-title text-primary mb-0">Updated Revenue</h6>
      </div>
      <div className="card-body">
        {!values ? (
          <p className="text-muted mb-0">No calculated values available.</p>
        ) : (
          <>
            {(() => {
              const t = getTotals();
              const p = values?.permissible || {};
              const r = values?.proposed || {};

              const row = (label, a, b) => (
                <tr className={`${isDark ? 'bg-dark' : ''}`}>
                  <td className="small fw-medium">{label}</td>
                  <td className="small text-end">₹{fmt(a)}</td>
                  <td className="small text-end">₹{fmt(b)}</td>
                </tr>
              );

              return (
                <>
                  <div className="mb-3">
                    <div className={`${isDark ? 'text-white-50' : 'text-muted'} small fw-semibold mb-1`}>Revenue</div>
                    <div className="table-responsive">
                      <table className="table table-sm table-borderless align-middle mb-0">
                        <thead>
                          <tr className={`${isDark ? 'text-white-50' : 'text-muted'}`}>
                            <th className="small">Particulars</th>
                            <th className="small text-end">Permissible</th>
                            <th className="small text-end">Proposed</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className={`${isDark ? 'bg-dark' : ''}`}>
                            <td className="small fw-semibold text-accent">Revenue (Inflow)</td>
                            <td className="small text-end text-accent">₹{fmt(t.revenuePerm)}</td>
                            <td className="small text-end text-accent">₹{fmt(t.revenueProp)}</td>
                          </tr>
                          {/* {t.revenueSharePct > 0 ? row(`Revenue Share (${fmt(t.revenueSharePct)}%)`, t.revenueSharePerm, t.revenueShareProp) : null}
                          {t.premiumAmount > 0 ? row('Premium Amount To Land Owner', t.premiumAmount, t.premiumAmount) : null}
                          {(() => {
                            const zoningType = localStorage.getItem("zoningType")?.toLowerCase();
                            if (zoningType === "mixed") {
                              // Compute saleable areas for commercial/residential separately
                              const landResults = JSON.parse(localStorage.getItem('landDetailsResults') || '{}');
                              const fsi = JSON.parse(localStorage.getItem('fsiProposalData') || '{}');
                              const landForm = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
                              const permCommercialSaleable = (parseFloat(landResults?.commercialMax) || 0) * 0.85 * 1.4;
                              const permResidentialSaleable = (parseFloat(landResults?.residentialMax) || 0) * 0.85 * 1.35;
                              const proposedMaxBuilding = parseFloat(fsi?.Proposed_Max_Building_Potential) || 0;
                              const commercialSplit = (parseFloat(landForm?.commercialSplit) || 0) / 100;
                              const residentialSplit = (parseFloat(landForm?.residentialSplit) || 0) / 100;
                              const commAncC = parseFloat(fsi?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
                              const resAncC = parseFloat(fsi?.Proposed_Residential_Ancillary_Area_Constant) || 0;
                              const propCommercialMax = (proposedMaxBuilding * commercialSplit) + (proposedMaxBuilding * commercialSplit * commAncC);
                              const propResidentialMax = (proposedMaxBuilding * residentialSplit) + (proposedMaxBuilding * residentialSplit * resAncC);
                              const propCommercialSaleable = propCommercialMax * 0.85 * 1.4;
                              const propResidentialSaleable = propResidentialMax * 0.85 * 1.35;

                              const commPct = Math.min(100, Math.max(0, parseFloat(t.commercialAreaPercentage) || 0));
                              const resPct = Math.min(100, Math.max(0, parseFloat(t.residentialAreaPercentage) || 0));

                              const commAreaPermRemoved = permCommercialSaleable * commPct / 100;
                              const commAreaPropRemoved = propCommercialSaleable * commPct / 100;
                              const resAreaPermRemoved = permResidentialSaleable * resPct / 100;
                              const resAreaPropRemoved = propResidentialSaleable * resPct / 100;

                              return (
                                <>
                                  {commPct > 0 ? row(`Commercial Area % (${fmt(commPct)}%)`, commAreaPermRemoved, commAreaPropRemoved) : null}
                                  {resPct > 0 ? row(`Residential Area % (${fmt(resPct)}%)`, resAreaPermRemoved, resAreaPropRemoved) : null}
                                </>
                              );
                            } else {
                              return t.areaPercentage > 0 ? row(`Area Percentage (${fmt(t.areaPercentage)}%)`, 
                                (t.originalSaleablePerm - t.developerSharePerm), 
                                (t.originalSaleableProp - t.developerShareProp)) : null;
                            }
                          })()} */}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className={`${isDark ? 'text-white-50' : 'text-muted'} small fw-semibold mb-1`}>Cost Details</div>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="small fw-semibold">Particulars</th>
                            <th className="small fw-semibold text-end">Permissible</th>
                            <th className="small fw-semibold text-end">Proposed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row('Land Cost', p.landCost, r.landCost)}
                          {row('Approval Cost', p.approvalCost, r.approvalCost)}
                          {row('Construction Cost', p.constructionCost, r.constructionCost)}
                          {row('Administrative Cost', p.administrativeCost, r.administrativeCost)}
                          {row('Ancillary Cost', p.ancillaryCost, r.ancillaryCost)}
                          {row('TDR Cost', p.tdrCost, r.tdrCost)}
                          {row('Premium Cost', p.premiumCost, r.premiumCost)}
                          {row('Marketing and Selling Cost', p.marketingCost, r.marketingCost)}
                          {row('Contingency Cost', p.contingencyCost, r.contingencyCost)}
                          {row('Finance Cost', p.financeCost, r.financeCost)}
                          {row('Miscellaneous Cost', p.miscellaneousCost, r.miscellaneousCost)}
                          {t.revenueSharePct > 0 ? row(`Revenue Share (${fmt(t.revenueSharePct)}%)`, t.revenueSharePerm, t.revenueShareProp) : null}
                          {t.premiumAmount > 0 ? row('Premium Amount To Land Owner', t.premiumAmount, t.premiumAmount) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className={`${isDark ? 'text-white-50' : 'text-muted'} small fw-semibold mb-1`}>Gross Profit</div>
                    <div className="table-responsive">
                      <table className="table table-sm table-borderless align-middle mb-0">
                        <thead>
                          <tr className={`${isDark ? 'text-white-50' : 'text-muted'}`}>
                            <th className="small">Particulars</th>
                            <th className="small text-end">Permissible</th>
                            <th className="small text-end">Proposed</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className={`${isDark ? 'bg-dark' : ''}`}>
                            <td className="small fw-semibold text-danger">Cost Of Project (Outflow)</td>
                            <td className="small text-end text-danger">₹{fmt(t.costPerm)}</td>
                            <td className="small text-end text-danger">₹{fmt(t.costProp)}</td>
                          </tr>
                          <tr className={`${isDark ? 'bg-dark' : ''}`}>
                            <td className="small fw-semibold text-success">Gross Profit</td>
                            <td className="small text-end text-success">₹{fmt(t.grossPerm)}</td>
                            <td className="small text-end text-success">₹{fmt(t.grossProp)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default UpdatedRevenue;


