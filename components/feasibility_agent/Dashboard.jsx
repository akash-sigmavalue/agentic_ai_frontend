// import { useState, useEffect } from "react";
// import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
// import LandDetailsOutput from "./LandDetailsOutput";
// import FSIProposalOutput from "./FSIProposalOutput";
// import LocationOutput from "./LocationOutput";
// import CostOutput from "./CostOutput";
// import ConstructionTimetable from "./ConstructionTimetable";

// const Dashboard = ({ isOpen, onClose }) => {
//   const navigate = useNavigate();
//   const [landResults, setLandResults] = useState(null);
//   const [revenueData, setRevenueData] = useState(null);
//   const [costData, setCostData] = useState(null);
//   const [landFormData, setLandFormData] = useState(null);
//   const [fsiProposalData, setFsiProposalData] = useState(null);
//   const [zoningType, setZoningType] = useState(null);

//   const handleCalculateIRR = () => {
//     onClose(); // Close the dashboard
//     navigate("/irr"); // Navigate to IRR page
//   };

//   const handleCalculateConstructionTime = () => {
//     navigate("/construction-timetable");
//   };

//   useEffect(() => {
//     if (isOpen) {
//       const savedLandResults = localStorage.getItem("landDetailsResults");
//       const savedRevenueData = localStorage.getItem("revenueForm");
//       const savedCostData = localStorage.getItem("costForm");
//       const savedLandForm = localStorage.getItem("landDetailsForm");
//       const savedFsiProposal = localStorage.getItem("fsiProposalData");
//       const savedZoningType = localStorage.getItem("zoningType");

//       if (savedLandResults) {
//         setLandResults(JSON.parse(savedLandResults));
//       }

//       if (savedRevenueData) {
//         setRevenueData(JSON.parse(savedRevenueData));
//       }

//       if (savedCostData) {
//         setCostData(JSON.parse(savedCostData));
//       }

//       if (savedLandForm) {
//         setLandFormData(JSON.parse(savedLandForm));
//       }

//       if (savedFsiProposal) {
//         setFsiProposalData(JSON.parse(savedFsiProposal));
//       }

//       if (savedZoningType) {
//         setZoningType(savedZoningType.toLowerCase());
//       }
//     }
//   }, [isOpen]);

//   // Listen for data updates
//   useEffect(() => {
//     const handleLandDetailsUpdate = () => {
//       const savedLandResults = localStorage.getItem("landDetailsResults");
//       const savedLandForm = localStorage.getItem("landDetailsForm");
//       const savedZoningType = localStorage.getItem("zoningType");

//       if (savedLandResults) {
//         setLandResults(JSON.parse(savedLandResults));
//       }

//       if (savedLandForm) {
//         setLandFormData(JSON.parse(savedLandForm));
//       }

//       if (savedZoningType) {
//         setZoningType(savedZoningType.toLowerCase());
//       }
//     };

//     const handleRevenueUpdate = () => {
//       const savedRevenueData = localStorage.getItem("revenueForm");
//       if (savedRevenueData) {
//         setRevenueData(JSON.parse(savedRevenueData));
//       }
//     };

//     const handleCostUpdate = () => {
//       const savedCostData = localStorage.getItem("costForm");
//       if (savedCostData) {
//         setCostData(JSON.parse(savedCostData));
//       }
//     };

//     const handleFsiProposalUpdate = () => {
//       const savedFsiProposal = localStorage.getItem("fsiProposalData");
//       if (savedFsiProposal) {
//         setFsiProposalData(JSON.parse(savedFsiProposal));
//       }
//     };

//     window.addEventListener('landDetailsUpdated', handleLandDetailsUpdate);
//     window.addEventListener('revenueFormUpdated', handleRevenueUpdate);
//     window.addEventListener('costFormUpdated', handleCostUpdate);
//     window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);

//     return () => {
//       window.removeEventListener('landDetailsUpdated', handleLandDetailsUpdate);
//       window.removeEventListener('revenueFormUpdated', handleRevenueUpdate);
//       window.removeEventListener('costFormUpdated', handleCostUpdate);
//       window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
//     };
//   }, []);

//   // Helper functions for calculations (same as CostOutput.jsx)
//   const getMaxPermissibleAreaPermissible = () => {
//     if (!landResults) return 0;

//     // For mixed zoning, use the pre-calculated maxPermissibleArea from Land Details form
//     // This ensures consistency with the Land Details calculations
//     if (zoningType === 'mixed') {
//       return parseFloat(landResults.maxPermissibleArea) || 0;
//     }

//     // For commercial and residential, calculate as before
//     const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
//     const ancillaryArea = parseFloat(landResults.ancillary) || 0;
//     return maxBuildingPotential + ancillaryArea;
//   };

//   const getMaxPermissibleAreaProposed = () => {
//     if (!fsiProposalData) return 0;
//     const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;

//     return proposedMaxBuilding +
//       (zoningType === 'commercial' && fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant ?
//         proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) : 0) +
//       (zoningType === 'residential' && fsiProposalData.Proposed_Residential_Ancillary_Area_Constant ?
//         proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) : 0) +
//       (zoningType === 'mixed' ?
//         ((proposedMaxBuilding *
//           ((parseFloat(landFormData?.commercialSplit) || 0) / 100)) *
//           (parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0)) +
//         ((proposedMaxBuilding *
//           ((parseFloat(landFormData?.residentialSplit) || 0) / 100)) *
//           (parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0)) : 0);
//   };

//   const calculateRevenue = (isProposed = false) => {
//     if (!revenueData || !landResults) return 0;

//     if (zoningType === 'residential' && revenueData.residentialRate) {
//       const maxPermissibleArea = isProposed ? getMaxPermissibleAreaProposed() : getMaxPermissibleAreaPermissible();
//       const carpetArea = maxPermissibleArea * 0.85;
//       const saleableArea = carpetArea * 1.35;
//       return saleableArea * parseFloat(revenueData.residentialRate);
//     } else if (zoningType === 'commercial' && revenueData.commercialRate) {
//       const maxPermissibleArea = isProposed ? getMaxPermissibleAreaProposed() : getMaxPermissibleAreaPermissible();
//       const carpetArea = maxPermissibleArea * 0.85;
//       const saleableArea = carpetArea * 1.4;
//       return saleableArea * parseFloat(revenueData.commercialRate);
//     } else if (zoningType === 'mixed' && revenueData.residentialRate && revenueData.commercialRate) {
//       // Use the same logic as LocationOutput.jsx for mixed zoning
//       if (isProposed) {
//         return (getCommercialMaxAreaProposed() * 0.85 * 1.4 * parseFloat(revenueData.commercialRate)) +
//           (getResidentialMaxAreaProposed() * 0.85 * 1.35 * parseFloat(revenueData.residentialRate));
//       } else {
//         return (getCommercialMaxAreaPermissible() * 0.85 * 1.4 * parseFloat(revenueData.commercialRate)) +
//           (getResidentialMaxAreaPermissible() * 0.85 * 1.35 * parseFloat(revenueData.residentialRate));
//       }
//     }
//     return 0;
//   };

//   // Helper functions for mixed zoning revenue calculation
//   const getCommercialMaxAreaPermissible = () => {
//     return parseFloat(landResults?.commercialMax) || 0;
//   };

//   const getCommercialMaxAreaProposed = () => {
//     if (!fsiProposalData || !landFormData) return 0;
//     const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;
//     const commercialSplit = (parseFloat(landFormData.commercialSplit) || 0) / 100;
//     const ancillaryConstant = parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0;

//     return (proposedMaxBuilding * commercialSplit) +
//       (proposedMaxBuilding * commercialSplit * ancillaryConstant);
//   };

//   const getResidentialMaxAreaPermissible = () => {
//     return parseFloat(landResults?.residentialMax) || 0;
//   };

//   const getResidentialMaxAreaProposed = () => {
//     if (!fsiProposalData || !landFormData) return 0;
//     const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;
//     const residentialSplit = (parseFloat(landFormData.residentialSplit) || 0) / 100;
//     const ancillaryConstant = parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0;

//     return (proposedMaxBuilding * residentialSplit) +
//       (proposedMaxBuilding * residentialSplit * ancillaryConstant);
//   };

//   // Helper functions for cost calculations (same as CostOutput.jsx)
//   const calculateTotalCost = (isProposed = false) => {
//     if (!costData || !landResults) return 0;

//     const landCost = parseFloat(costData.landCost) || 0;
//     const approvalCost = calculateApprovalCost(isProposed);
//     const constructionCost = isProposed ?
//       getMaxPermissibleAreaProposed() * (parseFloat(costData.constructionRate) || 0) :
//       (parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(costData.constructionRate) || 0);
//     const administrativeCost = calculateAdministrativeCost(isProposed);
//     const ancillaryCost = calculateAncillaryCost(isProposed);
//     const tdrCost = (parseFloat(costData.tdrCost) || 0) * (isProposed ? parseFloat(fsiProposalData?.Proposed_TDR_FSI) || 0 : parseFloat(landResults?.tdr) || 0);
//     const premiumCost = (isProposed ? parseFloat(fsiProposalData?.Proposed_Premium_FSI) || 0 : parseFloat(landResults?.premium) || 0) * (parseFloat(costData.governmentLandRate) || 0) * 0.35;
//     const marketingCost = calculateRevenue(isProposed) * getMarketingCoefficient();
//     const contingencyCost = constructionCost * 0.03;
//     const financeCost = calculateFinanceCost(isProposed);
//     const miscellaneousCost = calculateMiscellaneousCost(isProposed);

//     return landCost + constructionCost + marketingCost + ancillaryCost + tdrCost + premiumCost + contingencyCost + approvalCost + administrativeCost + financeCost + miscellaneousCost;
//   };

//   const getMarketingCoefficient = () => {
//     const coeff = parseFloat(costData?.marketingCoefficient);
//     if (!isNaN(coeff) && coeff >= 0.05 && coeff <= 0.08) {
//       return coeff;
//     }
//     return 0.05; // fallback default
//   };

//   const calculateAncillaryCost = (isProposed = false) => {
//     const govtLandRate = parseFloat(costData?.governmentLandRate) || 0;
//     const location = landFormData?.location?.toLowerCase() || '';
//     const isPuneOrThane = location === 'pune' || location === 'thane';
//     let ancillaryArea = 0;
//     let factor = isPuneOrThane ? 0.15 : 0.10;

//     if (zoningType === 'mixed') {
//       if (isProposed) {
//         const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
//         const commercialSplit = (parseFloat(landFormData?.commercialSplit) || 0) / 100;
//         const residentialSplit = (parseFloat(landFormData?.residentialSplit) || 0) / 100;
//         const commercialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
//         const residentialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;

//         const commercialAncillary = (proposedMaxBuilding * commercialSplit) * commercialAncillaryConstant;
//         const residentialAncillary = (proposedMaxBuilding * residentialSplit) * residentialAncillaryConstant;

//         ancillaryArea = commercialAncillary + residentialAncillary;
//       } else {
//         const commercialAncillary = (parseFloat(landResults?.maxBuildingPotential) || 0) *
//           ((parseFloat(landFormData?.commercialSplit) || 0) / 100) * 0.8;
//         const residentialAncillary = (parseFloat(landResults?.maxBuildingPotential) || 0) *
//           ((parseFloat(landFormData?.residentialSplit) || 0) / 100) * 0.6;

//         ancillaryArea = commercialAncillary + residentialAncillary;
//       }
//     } else if (zoningType === 'residential') {
//       if (isProposed) {
//         const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
//         const residentialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;
//         ancillaryArea = proposedMaxBuilding * residentialAncillaryConstant;
//       } else {
//         ancillaryArea = parseFloat(landResults?.ancillary) || 0;
//       }
//     } else if (zoningType === 'commercial') {
//       if (isProposed) {
//         const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
//         const commercialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
//         ancillaryArea = proposedMaxBuilding * commercialAncillaryConstant;
//       } else {
//         ancillaryArea = parseFloat(landResults?.ancillary) || 0;
//       }
//     }

//     return ancillaryArea * govtLandRate * factor;
//   };

//   const calculateApprovalCost = (isProposed = false) => {
//     const approvalCostFromForm = parseFloat(costData?.approvalCost) || 0;
//     const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
//     const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

//     if (isProposed) {
//       return approvalCostFromForm;
//     } else {
//       if (maxPermissibleAreaProposed > 0) {
//         return (approvalCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
//       }
//       return approvalCostFromForm;
//     }
//   };

//   const calculateAdministrativeCost = (isProposed = false) => {
//     const administrativeCostFromForm = parseFloat(costData?.administrativeCost) || 0;
//     const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
//     const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

//     if (isProposed) {
//       return administrativeCostFromForm;
//     } else {
//       if (maxPermissibleAreaProposed > 0) {
//         return (administrativeCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
//       }
//       return administrativeCostFromForm;
//     }
//   };

//   const calculateFinanceCost = (isProposed = false) => {
//     const financeCostFromForm = parseFloat(costData?.financeCost) || 0;
//     const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
//     const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

//     if (isProposed) {
//       return financeCostFromForm;
//     } else {
//       if (maxPermissibleAreaProposed > 0) {
//         return (financeCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
//       }
//       return financeCostFromForm;
//     }
//   };

//   const calculateMiscellaneousCost = (isProposed = false) => {
//     const miscellaneousCostFromForm = parseFloat(costData?.miscellaneousCost) || 0;
//     const maxPermissibleAreaProposed = getMaxPermissibleAreaProposed();
//     const maxPermissibleAreaPermissible = getMaxPermissibleAreaPermissible();

//     if (isProposed) {
//       return miscellaneousCostFromForm;
//     } else {
//       if (maxPermissibleAreaProposed > 0) {
//         return (miscellaneousCostFromForm / maxPermissibleAreaProposed) * maxPermissibleAreaPermissible;
//       }
//       return miscellaneousCostFromForm;
//     }
//   };

//   if (!isOpen) return null;

//   const formatNumber = (num) => {
//     return new Intl.NumberFormat('en-IN').format(Math.round(num));
//   };

//   const formatRevenue = (num) => {
//     return new Intl.NumberFormat('en-IN').format(Math.round(num));
//   };

//   return (
//     <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
//       <div className="modal-dialog modal-xl modal-dialog-centered">
//         <div className="modal-content">
//           <div className="modal-header">
//             <h4 className="modal-title text-primary text-dark">Real Estate Dashboard</h4>
//             <button type="button" className="btn-close" onClick={onClose}></button>
//           </div>

//           <div className="modal-body">
//             <div className="row g-4">
//               {/* Land Details Output */}
//               <div className="col-lg-6">
//                 <div className="card border-0 shadow-lg" style={{
//                   background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
//                   borderLeft: '5px solid var(--title-cyan)'
//                 }}>
//                   <div className="card-header bg-gradient text-white" style={{
//                     background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                     borderBottom: 'none',
//                     borderRadius: '0.375rem 0.375rem 0 0'
//                   }}>
//                     <div className="d-flex align-items-center justify-content-between">
//                       <h5 className="card-title mb-0 fw-bold text-dark">
//                         <i className="fas fa-map-marker-alt me-2" style={{ color: '#448C74' }}></i>
//                         Land Details Analysis
//                       </h5>
//                       <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
//                         <i className="fas fa-info-circle me-1"></i>
//                         Property Info
//                       </span>
//                     </div>
//                   </div>
//                   <div className="card-body p-4">
//                     <LandDetailsOutput />
//                   </div>
//                 </div>
//               </div>

//               {/* Permissible and Proposed Output */}
//               <div className="col-lg-6">
//                 <div className="card border-0 shadow-lg" style={{
//                   background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
//                   borderLeft: '5px solid var(--title-cyan)'
//                 }}>
//                   <div className="card-header bg-gradient text-white" style={{
//                     background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                     borderBottom: 'none',
//                     borderRadius: '0.375rem 0.375rem 0 0'
//                   }}>
//                     <div className="d-flex align-items-center justify-content-between">
//                       <h5 className="card-title mb-0 fw-bold text-dark">
//                         <i className="fas fa-chart-bar me-2" style={{ color: '#448C74' }}></i>
//                         FSI Analysis Results
//                       </h5>
//                       <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
//                         <i className="fas fa-calculator me-1"></i>
//                         FSI Metrics
//                       </span>
//                     </div>
//                   </div>
//                   <div className="card-body p-4">
//                     <FSIProposalOutput landResults={landResults} zoningType={landFormData?.zoningType?.toLowerCase()} />
//                   </div>
//                 </div>
//               </div>

//               {/* Revenue Output */}
//               <div className="col-12">
//                 <div className="card border-0 shadow-lg" style={{
//                   background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
//                   borderLeft: '5px solid var(--title-cyan)'
//                 }}>
//                   <div className="card-header bg-gradient text-white" style={{
//                     background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                     borderBottom: 'none',
//                     borderRadius: '0.375rem 0.375rem 0 0'
//                   }}>
//                     <div className="d-flex align-items-center justify-content-between">
//                       <h5 className="card-title mb-0 fw-bold text-dark">
//                         <i className="fas fa-money-bill-wave me-2" style={{ color: '#448C74' }}></i>
//                         Revenue Projections
//                       </h5>
//                       <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
//                         <i className="fas fa-trending-up me-1"></i>
//                         Income Analysis
//                       </span>
//                     </div>
//                   </div>
//                   <div className="card-body p-4">
//                     <LocationOutput />
//                   </div>
//                 </div>
//               </div>

//               {/* Cost Output */}
//               <div className="col-12">
//                 <div className="card border-0 shadow-lg" style={{
//                   background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
//                   borderLeft: '5px solid var(--title-cyan)'
//                 }}>
//                   <div className="card-header bg-gradient text-white" style={{
//                     background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                     borderBottom: 'none',
//                     borderRadius: '0.375rem 0.375rem 0 0'
//                   }}>
//                     <div className="d-flex align-items-center justify-content-between">
//                       <h5 className="card-title mb-0 fw-bold text-dark">
//                         <i className="fas fa-coins me-2" style={{ color: '#448C74' }}></i>
//                         Cost Breakdown Analysis
//                       </h5>
//                       <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
//                         <i className="fas fa-receipt me-1"></i>
//                         Expense Details
//                       </span>
//                     </div>
//                   </div>
//                   <div className="card-body p-4">
//                     <CostOutput />
//                   </div>
//                 </div>
//               </div>

//               {/* Summary */}
//               <div className="col-12">
//                 <div className="card border-0 shadow-lg" style={{
//                   background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
//                   borderLeft: '5px solid var(--title-cyan)'
//                 }}>
//                   <div className="card-header bg-gradient text-white" style={{
//                     background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                     borderBottom: 'none',
//                     borderRadius: '0.375rem 0.375rem 0 0'
//                   }}>
//                     <div className="d-flex align-items-center justify-content-between">
//                       <h5 className="card-title mb-0 fw-bold text-dark">
//                         <i className="fas fa-chart-line me-2" style={{ color: '#448C74' }}></i>
//                         Financial Summary - Main Output
//                       </h5>
//                       <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
//                         <i className="fas fa-star me-1"></i>
//                         Key Results
//                       </span>
//                     </div>
//                   </div>
//                   <div className="card-body p-4">
//                     {costData && revenueData && landResults && landFormData ? (
//                       <div className="table-responsive">
//                         <table className="table table-hover mb-0" style={{
//                           background: 'white',
//                           borderRadius: '0.5rem',
//                           overflow: 'hidden',
//                           boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
//                         }}>
//                           <thead style={{
//                             background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                             color: 'white'
//                           }}>
//                             <tr>
//                               <th className="small fw-bold py-3 px-3" style={{ border: 'none' }}>Particulars</th>
//                               <th className="small fw-bold text-end py-3 px-3" style={{ border: 'none' }}>Permissible</th>
//                               <th className="small fw-bold text-end py-3 px-3" style={{ border: 'none' }}>Proposed</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             <tr className="border-bottom">
//                               <td className="small fw-semibold py-3 px-3" style={{
//                                 background: 'rgba(0, 206, 209, 0.05)',
//                                 color: 'var(--title-cyan)'
//                               }}>
//                                 <i className="fas fa-arrow-up text-success me-2"></i>
//                                 Revenue (Inflow)
//                               </td>
//                               <td className="small fw-semibold text-end py-3 px-3" style={{
//                                 background: 'rgba(0, 206, 209, 0.05)',
//                                 color: 'var(--title-cyan)'
//                               }}>
//                                 ₹{formatRevenue(calculateRevenue(false))}
//                               </td>
//                               <td className="small fw-semibold text-end py-3 px-3" style={{
//                                 background: 'rgba(0, 206, 209, 0.05)',
//                                 color: 'var(--title-cyan)'
//                               }}>
//                                 ₹{formatRevenue(calculateRevenue(true))}
//                               </td>
//                             </tr>

//                             <tr className="border-bottom">
//                               <td className="small fw-semibold py-3 px-3" style={{
//                                 background: 'rgba(220, 53, 69, 0.05)',
//                                 color: '#dc3545'
//                               }}>
//                                 <i className="fas fa-arrow-down text-danger me-2"></i>
//                                 Cost Of Project (Outflow)
//                               </td>
//                               <td className="small fw-semibold text-end py-3 px-3" style={{
//                                 background: 'rgba(220, 53, 69, 0.05)',
//                                 color: '#dc3545'
//                               }}>
//                                 ₹{formatNumber(calculateTotalCost(false))}
//                               </td>
//                               <td className="small fw-semibold text-end py-3 px-3" style={{
//                                 background: 'rgba(220, 53, 69, 0.05)',
//                                 color: '#dc3545'
//                               }}>
//                                 ₹{formatNumber(calculateTotalCost(true))}
//                               </td>
//                             </tr>

//                             <tr className="border-bottom">
//                               <td className="small fw-bold py-3 px-3" style={{
//                                 background: 'rgba(25, 135, 84, 0.1)',
//                                 color: '#198754'
//                               }}>
//                                 <i className="fas fa-chart-line text-success me-2"></i>
//                                 Gross Profit
//                               </td>
//                               <td className="small fw-bold text-end py-3 px-3" style={{
//                                 background: 'rgba(25, 135, 84, 0.1)',
//                                 color: '#198754'
//                               }}>
//                                 ₹{formatNumber(calculateRevenue(false) - calculateTotalCost(false))}
//                               </td>
//                               <td className="small fw-bold text-end py-3 px-3" style={{
//                                 background: 'rgba(25, 135, 84, 0.1)',
//                                 color: '#198754'
//                               }}>
//                                 ₹{formatNumber(calculateRevenue(true) - calculateTotalCost(true))}
//                               </td>
//                             </tr>

//                             <tr style={{
//                               background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
//                               color: 'white',
//                               boxShadow: '0 4px 12px rgba(0, 206, 209, 0.3)'
//                             }}>

//                             </tr>
//                           </tbody>
//                         </table>
//                       </div>
//                     ) : (
//                       <div className="text-center py-5">
//                         <i className="fas fa-chart-bar text-muted mb-3" style={{ fontSize: '3rem' }}></i>
//                         <h6 className="text-muted mb-2">Summary Data Not Available</h6>
//                         <p className="text-muted small">Please complete all sections to view the financial summary</p>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="modal-footer">
//             <button type="button" className="btn btn-primary me-2" onClick={handleCalculateConstructionTime}>
//               <i className="fa-solid fa-clock-rotate-left me-2"></i>
//               Calculate Construction time
//             </button>
//             <button type="button" className="btn btn-primary me-2" onClick={handleCalculateIRR}>
//               <i className="fas fa-calculator me-2"></i>
//               Calculate IRR
//             </button>
//             <button type="button" className="btn btn-secondary" onClick={onClose}>
//               Close Dashboard
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard; 

import { useState, useEffect } from "react";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import LandDetailsOutput from "./LandDetailsOutput";
import FSIProposalOutput from "./FSIProposalOutput";
import LocationOutput from "./LocationOutput";
import CostOutput from "./CostOutput";
import ConstructionTimetable from "./ConstructionTimetable";
import { FaTable, FaTag, FaCoins, FaInfoCircle, FaReceipt, FaRegStar, FaCalculator, FaMoneyBillWave, FaChartLine, FaArrowUp, FaArrowDown, FaChartBar, FaMapMarkerAlt } from 'react-icons/fa';

const UNIT_TYPES = ['1BHK', '2BHK', '3BHK', '>3BHK', 'Shop', 'Office'];

const Dashboard = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [landResults, setLandResults] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [landFormData, setLandFormData] = useState(null);
  const [fsiProposalData, setFsiProposalData] = useState(null);
  const [zoningType, setZoningType] = useState(null);
  const [ticketSizeSummary, setTicketSizeSummary] = useState(null);
  const [expectedRevenueData, setExpectedRevenueData] = useState(null);
  const [unitDesignStructure, setUnitDesignStructure] = useState(null);
  const [areaCalculationResults, setAreaCalculationResults] = useState(null);

  const handleCalculateIRR = () => {
    onClose(); // Close the dashboard
    navigate("/irr"); // Navigate to IRR page
  };

  const handleCalculateConstructionTime = () => {
    navigate("/construction-timetable");
  };

  useEffect(() => {
    if (isOpen) {
      const savedLandResults = localStorage.getItem("landDetailsResults");
      const savedRevenueData = localStorage.getItem("revenueForm");
      const savedCostData = localStorage.getItem("costForm");
      const savedLandForm = localStorage.getItem("landDetailsForm");
      const savedFsiProposal = localStorage.getItem("fsiProposalData");
      const savedZoningType = localStorage.getItem("zoningType");

      if (savedLandResults) {
        setLandResults(JSON.parse(savedLandResults));
      }

      if (savedRevenueData) {
        setRevenueData(JSON.parse(savedRevenueData));
      }

      if (savedCostData) {
        setCostData(JSON.parse(savedCostData));
      }

      if (savedLandForm) {
        setLandFormData(JSON.parse(savedLandForm));
      }

      if (savedFsiProposal) {
        setFsiProposalData(JSON.parse(savedFsiProposal));
      }

      if (savedZoningType) {
        setZoningType(savedZoningType.toLowerCase());
      }

      try {
        const savedTicketSize = localStorage.getItem('ticketSizeSummary');
        if (savedTicketSize) setTicketSizeSummary(JSON.parse(savedTicketSize));
      } catch { }

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
    }
  }, [isOpen]);

  // Listen for data updates
  useEffect(() => {
    const handleLandDetailsUpdate = () => {
      const savedLandResults = localStorage.getItem("landDetailsResults");
      const savedLandForm = localStorage.getItem("landDetailsForm");
      const savedZoningType = localStorage.getItem("zoningType");

      if (savedLandResults) {
        setLandResults(JSON.parse(savedLandResults));
      }

      if (savedLandForm) {
        setLandFormData(JSON.parse(savedLandForm));
      }

      if (savedZoningType) {
        setZoningType(savedZoningType.toLowerCase());
      }
    };

    const handleRevenueUpdate = () => {
      const savedRevenueData = localStorage.getItem("revenueForm");
      if (savedRevenueData) {
        setRevenueData(JSON.parse(savedRevenueData));
      }
    };

    const handleCostUpdate = () => {
      const savedCostData = localStorage.getItem("costForm");
      if (savedCostData) {
        setCostData(JSON.parse(savedCostData));
      }
    };

    const handleFsiProposalUpdate = () => {
      const savedFsiProposal = localStorage.getItem("fsiProposalData");
      if (savedFsiProposal) {
        setFsiProposalData(JSON.parse(savedFsiProposal));
      }
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
    window.addEventListener('revenueFormUpdated', handleRevenueUpdate);
    window.addEventListener('costFormUpdated', handleCostUpdate);
    window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
    window.addEventListener('unitDesignStructureUpdated', handleUnitDesignUpdate);
    window.addEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);

    return () => {
      window.removeEventListener('landDetailsUpdated', handleLandDetailsUpdate);
      window.removeEventListener('revenueFormUpdated', handleRevenueUpdate);
      window.removeEventListener('costFormUpdated', handleCostUpdate);
      window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
      window.removeEventListener('unitDesignStructureUpdated', handleUnitDesignUpdate);
      window.removeEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
    };
  }, []);

  // Helper functions for calculations (same as CostOutput.jsx)
  const getMaxPermissibleAreaPermissible = () => {
    if (!landResults) return 0;

    // For mixed zoning, use the pre-calculated maxPermissibleArea from Land Details form
    // This ensures consistency with the Land Details calculations
    if (zoningType === 'mixed') {
      return parseFloat(landResults.maxPermissibleArea) || 0;
    }

    // For commercial and residential, calculate as before
    const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
    const ancillaryArea = parseFloat(landResults.ancillary) || 0;
    return maxBuildingPotential + ancillaryArea;
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

  // Helper functions for mixed zoning revenue calculation
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

  // Helper functions for cost calculations (same as CostOutput.jsx)
  const calculateTotalCost = (isProposed = false) => {
    if (!costData || !landResults) return 0;

    const landCost = parseFloat(costData.landCost) || 0;
    const approvalCost = calculateApprovalCost(isProposed);
    const constructionCost = isProposed ?
      getMaxPermissibleAreaProposed() * (parseFloat(costData.constructionRate) || 0) :
      (parseFloat(landResults?.maxPermissibleArea) || 0) * (parseFloat(costData.constructionRate) || 0);
    const administrativeCost = calculateAdministrativeCost(isProposed);
    const ancillaryCost = calculateAncillaryCost(isProposed);
    const tdrCost = (parseFloat(costData.tdrCost) || 0) * (isProposed ? parseFloat(fsiProposalData?.Proposed_TDR_FSI) || 0 : parseFloat(landResults?.tdr) || 0);
    const premiumCost = (isProposed ? parseFloat(fsiProposalData?.Proposed_Premium_FSI) || 0 : parseFloat(landResults?.premium) || 0) * (parseFloat(costData.governmentLandRate) || 0) * 0.35;
    const marketingCost = calculateRevenue(isProposed) * getMarketingCoefficient();
    const contingencyCost = constructionCost * 0.03;
    const financeCost = calculateFinanceCost(isProposed);
    const miscellaneousCost = calculateMiscellaneousCost(isProposed);

    return landCost + constructionCost + marketingCost + ancillaryCost + tdrCost + premiumCost + contingencyCost + approvalCost + administrativeCost + financeCost + miscellaneousCost;
  };

  const getMarketingCoefficient = () => {
    const coeff = parseFloat(costData?.marketingCoefficient);
    if (!isNaN(coeff) && coeff >= 0.05 && coeff <= 0.08) {
      return coeff;
    }
    return 0.05; // fallback default
  };

  const calculateAncillaryCost = (isProposed = false) => {
    const govtLandRate = parseFloat(costData?.governmentLandRate) || 0;
    const location = landFormData?.location?.toLowerCase() || '';
    const isPuneOrThane = location === 'pune' || location === 'thane';
    let ancillaryArea = 0;
    let factor = isPuneOrThane ? 0.15 : 0.10;

    if (zoningType === 'mixed') {
      if (isProposed) {
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const commercialSplit = (parseFloat(landFormData?.commercialSplit) || 0) / 100;
        const residentialSplit = (parseFloat(landFormData?.residentialSplit) || 0) / 100;
        const commercialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
        const residentialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;

        const commercialAncillary = (proposedMaxBuilding * commercialSplit) * commercialAncillaryConstant;
        const residentialAncillary = (proposedMaxBuilding * residentialSplit) * residentialAncillaryConstant;

        ancillaryArea = commercialAncillary + residentialAncillary;
      } else {
        const commercialAncillary = (parseFloat(landResults?.maxBuildingPotential) || 0) *
          ((parseFloat(landFormData?.commercialSplit) || 0) / 100) * 0.8;
        const residentialAncillary = (parseFloat(landResults?.maxBuildingPotential) || 0) *
          ((parseFloat(landFormData?.residentialSplit) || 0) / 100) * 0.6;

        ancillaryArea = commercialAncillary + residentialAncillary;
      }
    } else if (zoningType === 'residential') {
      if (isProposed) {
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const residentialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;
        ancillaryArea = proposedMaxBuilding * residentialAncillaryConstant;
      } else {
        ancillaryArea = parseFloat(landResults?.ancillary) || 0;
      }
    } else if (zoningType === 'commercial') {
      if (isProposed) {
        const proposedMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const commercialAncillaryConstant = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
        ancillaryArea = proposedMaxBuilding * commercialAncillaryConstant;
      } else {
        ancillaryArea = parseFloat(landResults?.ancillary) || 0;
      }
    }

    return ancillaryArea * govtLandRate * factor;
  };

  const calculateApprovalCost = (isProposed = false) => {
    const approvalCostFromForm = parseFloat(costData?.approvalCost) || 0;
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
    const administrativeCostFromForm = parseFloat(costData?.administrativeCost) || 0;
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
    const financeCostFromForm = parseFloat(costData?.financeCost) || 0;
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
    const miscellaneousCostFromForm = parseFloat(costData?.miscellaneousCost) || 0;
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

  if (!isOpen) return null;

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const formatRevenue = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };


  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title text-primary text-dark">Real Estate Dashboard</h4>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="row g-4">
              {/* Land Details Output */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid var(--title-cyan)'
                }}>
                  <div className="card-header bg-gradient text-white" style={{
                    background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaMapMarkerAlt className="me-2" style={{ color: '#448C74' }} />
                        Land Details Analysis
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaInfoCircle className="me-1" />
                        Property Info
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <LandDetailsOutput />
                  </div>
                </div>
              </div>

              {/* Permissible and Proposed Output */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid var(--title-cyan)'
                }}>
                  <div className="card-header bg-gradient text-white" style={{
                    background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaChartBar className="me-2" style={{ color: '#448C74' }} />
                        FSI Analysis Results
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaCalculator className="me-2" />
                        FSI Metrics
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <FSIProposalOutput landResults={landResults} zoningType={landFormData?.zoningType?.toLowerCase()} />
                  </div>
                </div>
              </div>

              {/* Ticket Size Summary */}
              <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid #448C74'
                }}>
                  <div className="card-header text-white" style={{
                    background: 'linear-gradient(135deg, #448C74 0%, #5aab8e 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaTable className="me-2" style={{ color: '#fff' }} />
                        Ticket Size Summary (by Unit Type)
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaTag className="me-1" />
                        Unit Analysis
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    {ticketSizeSummary && (() => {
                      const { unitSummary = {}, expectedRevenueBase = {}, expectedRevenueBayes = {} } = ticketSizeSummary;
                      const normalizeKey = (k) => k ? String(k).trim().replace(/\s+/g, '').replace(/Bhk/i, 'BHK') : '';
                      const fmt = (val, digits = 0) => Number(val).toLocaleString('en-IN', { maximumFractionDigits: digits });
                      const rows = UNIT_TYPES.map(rawType => {
                        const key = normalizeKey(rawType);
                        const base = unitSummary[key];
                        if (!base) return null;
                        const totalArea = Number(base.totalArea) || 0;
                        const areaPerUnit = Number(base.areaPerUnit) || 0;
                        const numUnits = Number(base.numUnits) || 0;
                        const expBase = Number(expectedRevenueBase[key]) || 0;
                        const expBayes = Number(expectedRevenueBayes[key]) || 0;
                        if (totalArea <= 0 || areaPerUnit <= 0 || numUnits <= 0 || (expBase <= 0 && expBayes <= 0)) return null;
                        const ticketBase = expBase > 0 ? expBase / numUnits : 0;
                        const ticketBayes = expBayes > 0 ? expBayes / numUnits : 0;
                        const rate = ticketBase > 0 && areaPerUnit > 0 ? ticketBase / areaPerUnit : 0;
                        return { key, unitType: base.unitType || rawType, totalArea, areaPerUnit, numUnits, ticketBase, ticketBayes, rate, fmt };
                      }).filter(Boolean);
                      if (!rows.length) return <p className="text-muted small mb-0"><FaInfoCircle className="me-1" />No ticket size data saved yet.</p>;
                      return (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Unit Type</th>
                                <th className="text-end">Ticket Size – Base (₹)</th>
                                <th className="text-end">Ticket Size – Bayesian (₹)</th>
                                <th className="text-end">Area/Unit (sqft)</th>
                                <th className="text-end">No of Units</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(row => (
                                <tr key={row.key}>
                                  <td>{row.unitType}</td>
                                  <td className="text-end">{row.fmt(row.ticketBase)}</td>
                                  <td className="text-end">{row.ticketBayes > 0 ? row.fmt(row.ticketBayes) : '—'}</td>
                                  <td className="text-end">{row.fmt(row.areaPerUnit)}</td>
                                  <td className="text-end">{row.fmt(row.numUnits)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                    {!ticketSizeSummary && (
                      <p className="text-muted small mb-0"><FaInfoCircle className="me-1" />No ticket size data available. Run a simulation first.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expected Revenue Calculation */}
              <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid #00b947ff'
                }}>
                  <div className="card-header text-white" style={{
                    background: 'linear-gradient(135deg, #00b947ff 0%, #02df57ff 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaCoins className="me-2" style={{ color: '#fff' }} />
                        Maximum Potential
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaCalculator className="me-2" />
                        Revenue by BHK
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    {expectedRevenueData ? (
                      <div className="row g-4">
                        <div className="col-lg-6">
                          <div className="card border h-100">
                            <div className="card-header bg-light py-2">
                              <h6 className="fw-bold mb-0 text-primary">Expected Revenue (Base Logic)</h6>
                            </div>
                            <div className="table-responsive">
                              <table className="table table-striped table-hover mb-0 align-middle">
                                <thead className="table-light">
                                  <tr>
                                    <th>Unit Type</th>
                                    <th className="text-end">Expected Revenue (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {UNIT_TYPES.map(type => (
                                    <tr key={type}>
                                      <td>{type}</td>
                                      <td className="text-end fw-medium">
                                        {expectedRevenueData.excelLogic?.data?.[type] != null
                                          ? Number(expectedRevenueData.excelLogic.data[type]).toLocaleString('en-IN')
                                          : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="table-info fw-bold">
                                  <tr>
                                    <td>Total</td>
                                    <td className="text-end">{Number(expectedRevenueData.excelLogic?.total || 0).toLocaleString('en-IN')}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="card border h-100">
                            <div className="card-header bg-light py-2">
                              <h6 className="fw-bold mb-0 text-success">Expected Revenue (Bayesian Opt)</h6>
                            </div>
                            <div className="table-responsive">
                              <table className="table table-striped table-hover mb-0 align-middle">
                                <thead className="table-light">
                                  <tr>
                                    <th>Unit Type</th>
                                    <th className="text-end">Expected Revenue (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {UNIT_TYPES.map(type => (
                                    <tr key={type}>
                                      <td>{type}</td>
                                      <td className="text-end fw-medium">
                                        {expectedRevenueData.bayesianOpt?.data?.[type] != null
                                          ? Number(expectedRevenueData.bayesianOpt.data[type]).toLocaleString('en-IN')
                                          : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="table-success fw-bold">
                                  <tr>
                                    <td>Total</td>
                                    <td className="text-end">{Number(expectedRevenueData.bayesianOpt?.total || 0).toLocaleString('en-IN')}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted small mb-0"><FaInfoCircle className="me-1" />No expected revenue data saved yet. Save revenue data from the simulation page first.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Revenue Output */}
              <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid var(--title-cyan)'
                }}>
                  <div className="card-header bg-gradient text-white" style={{
                    background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaMoneyBillWave className="me-2" style={{ color: '#448C74' }} />
                        Revenue Projections
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaChartLine className="me-1" />
                        Income Analysis
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <LocationOutput />
                  </div>
                </div>
              </div>

              {/* Cost Output */}
              <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid var(--title-cyan)'
                }}>
                  <div className="card-header bg-gradient text-white" style={{
                    background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaCoins className="me-2" style={{ color: '#448C74' }} />
                        Cost Breakdown Analysis
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaReceipt className="me-1" />
                        Expense Details
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <CostOutput />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderLeft: '5px solid var(--title-cyan)'
                }}>
                  <div className="card-header bg-gradient text-white" style={{
                    background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                    borderBottom: 'none',
                    borderRadius: '0.375rem 0.375rem 0 0'
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="card-title mb-0 fw-bold text-dark">
                        <FaChartLine className="me-2" style={{ color: '#448C74' }} />
                        Financial Summary - Main Output
                      </h5>
                      <span className="badge bg-light text-dark px-3 py-2 fw-semibold">
                        <FaRegStar className="me-1" />
                        Key Results
                      </span>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    {costData && revenueData && landResults && landFormData ? (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0" style={{
                          background: 'white',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <thead style={{
                            background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                            color: 'white'
                          }}>
                            <tr>
                              <th className="small fw-bold py-3 px-3" style={{ border: 'none' }}>Particulars</th>
                              <th className="small fw-bold text-end py-3 px-3" style={{ border: 'none' }}>Permissible</th>
                              <th className="small fw-bold text-end py-3 px-3" style={{ border: 'none' }}>Proposed</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-bottom">
                              <td className="small fw-semibold py-3 px-3" style={{
                                background: 'rgba(0, 206, 209, 0.05)',
                                color: 'var(--title-cyan)'
                              }}>
                                <FaArrowUp className="text-success me-2" />
                                Revenue (Inflow)
                              </td>
                              <td className="small fw-semibold text-end py-3 px-3" style={{
                                background: 'rgba(0, 206, 209, 0.05)',
                                color: 'var(--title-cyan)'
                              }}>
                                ₹{formatRevenue(calculateRevenue(false))}
                              </td>
                              <td className="small fw-semibold text-end py-3 px-3" style={{
                                background: 'rgba(0, 206, 209, 0.05)',
                                color: 'var(--title-cyan)'
                              }}>
                                ₹{formatRevenue(calculateRevenue(true))}
                              </td>
                            </tr>

                            <tr className="border-bottom">
                              <td className="small fw-semibold py-3 px-3" style={{
                                background: 'rgba(220, 53, 69, 0.05)',
                                color: '#dc3545'
                              }}>
                                <FaArrowDown className="text-danger me-2" />
                                Cost Of Project (Outflow)
                              </td>
                              <td className="small fw-semibold text-end py-3 px-3" style={{
                                background: 'rgba(220, 53, 69, 0.05)',
                                color: '#dc3545'
                              }}>
                                ₹{formatNumber(calculateTotalCost(false))}
                              </td>
                              <td className="small fw-semibold text-end py-3 px-3" style={{
                                background: 'rgba(220, 53, 69, 0.05)',
                                color: '#dc3545'
                              }}>
                                ₹{formatNumber(calculateTotalCost(true))}
                              </td>
                            </tr>

                            <tr className="border-bottom">
                              <td className="small fw-bold py-3 px-3" style={{
                                background: 'rgba(25, 135, 84, 0.1)',
                                color: '#198754'
                              }}>
                                <FaChartLine className="text-success me-2" />
                                Gross Profit
                              </td>
                              <td className="small fw-bold text-end py-3 px-3" style={{
                                background: 'rgba(25, 135, 84, 0.1)',
                                color: '#198754'
                              }}>
                                ₹{formatNumber(calculateRevenue(false) - calculateTotalCost(false))}
                              </td>
                              <td className="small fw-bold text-end py-3 px-3" style={{
                                background: 'rgba(25, 135, 84, 0.1)',
                                color: '#198754'
                              }}>
                                ₹{formatNumber(calculateRevenue(true) - calculateTotalCost(true))}
                              </td>
                            </tr>

                            <tr style={{
                              background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)',
                              color: 'white',
                              boxShadow: '0 4px 12px rgba(0, 206, 209, 0.3)'
                            }}>

                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <FaChartBar className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                        <h6 className="text-muted mb-2">Summary Data Not Available</h6>
                        <p className="text-muted small">Please complete all sections to view the financial summary</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-primary me-2" onClick={handleCalculateConstructionTime}>
              <i className="fa-solid fa-clock-rotate-left me-2"></i>
              Calculate Construction time
            </button>
            <button type="button" className="btn btn-primary me-2" onClick={handleCalculateIRR}>
              <FaCalculator className="me-2" />
              Calculate IRR
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 