// import { useState, useEffect } from "react";

// const FSIProposalOutput = ({ data, landResults, zoningType, location }) => {
//   const [savedData, setSavedData] = useState(null);

//   useEffect(() => {
//     const saved = localStorage.getItem('fsiProposalData');
//     if (saved) {
//       setSavedData(JSON.parse(saved));
//     }
//   }, []);

//   // Listen for FSI proposal updates
//   useEffect(() => {
//     const handleFsiProposalUpdate = () => {
//       const saved = localStorage.getItem('fsiProposalData');
//       if (saved) {
//         setSavedData(JSON.parse(saved));
//       }
//     };

//     window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);

//     return () => {
//       window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
//     };
//   }, []);

//   useEffect(() => {
//     if (data) {
//       setSavedData(data);
//     }
//   }, [data]);

//   const formatNumber = (num) => {
//     return new Intl.NumberFormat('en-IN').format(Math.round(num));
//   };

//   const getLandDetailsData = () => {
//     try {
//       const landDetailsForm = localStorage.getItem('landDetailsForm');
//       return landDetailsForm ? JSON.parse(landDetailsForm) : {};
//     } catch (error) {
//       return {};
//     }
//   };

//   const calculateCommercialAncillary = () => {
//     const landDetails = getLandDetailsData();
//     const proposedMaxBuilding = parseFloat(savedData.Proposed_Max_Building_Potential) || 0;
//     const commercialSplit = parseFloat(landDetails.commercialSplit) || 0;
//     const ancillaryConstant = parseFloat(savedData.Proposed_Commercial_Ancillary_Area_Constant) || 0;

//     return proposedMaxBuilding * (commercialSplit / 100) * ancillaryConstant;
//   };

//   const calculateResidentialAncillary = () => {
//     const landDetails = getLandDetailsData();
//     const proposedMaxBuilding = parseFloat(savedData.Proposed_Max_Building_Potential) || 0;
//     const residentialSplit = parseFloat(landDetails.residentialSplit) || 0;
//     const ancillaryConstant = parseFloat(savedData.Proposed_Residential_Ancillary_Area_Constant) || 0;

//     return proposedMaxBuilding * (residentialSplit / 100) * ancillaryConstant;
//   };

//   const calculatePermissibleCommercialAncillary = () => {
//     const landDetails = getLandDetailsData();
//     const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
//     const commercialSplit = parseFloat(landDetails.commercialSplit) || 0;

//     return (maxBuildingPotential * commercialSplit / 100) * 0.8;
//   };

//   const calculatePermissibleResidentialAncillary = () => {
//     const landDetails = getLandDetailsData();
//     const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
//     const residentialSplit = parseFloat(landDetails.residentialSplit) || 0;

//     return (maxBuildingPotential * residentialSplit / 100) * 0.6;
//   };

//   if (!savedData || !landResults) {
//     return (
//       <div className="card h-100">
//         <div className="card-header">
//           <h6 className="card-title text-primary mb-0">Permissible FSI Vs Proposed FSI Breakdown in sqft</h6>
//         </div>
//         <div className="card-body">
//           <p className="text-muted text-center py-4">
//             No FSI proposal data available
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const isPuneThane = location === "Pune" || location === "Thane";

//   // Calculate permissible values based on location
//   const permissibleBasic = parseFloat(isPuneThane ? landResults.basicFSI : savedData.Permissible_Basic_FSI) || 0;
//   const permissiblePremium = parseFloat(isPuneThane ? landResults.premium : savedData.Permissible_Premium_FSI) || 0;
//   const permissibleTDR = parseFloat(isPuneThane ? landResults.tdr : savedData.Permissible_TDR_FSI) || 0;
//   const permissibleMaxBuildingPotential = permissibleBasic + permissiblePremium + permissibleTDR;

//   const permissibleAncillaryResidentialConst = parseFloat(isPuneThane ? 0.6 : savedData.Permissible_Residential_Ancillary_Area_Constant) || 0;
//   const permissibleAncillaryCommercialConst = parseFloat(isPuneThane ? 0.8 : savedData.Permissible_Commercial_Ancillary_Area_Constant) || 0;

//   const landDetails = getLandDetailsData();
//   const commercialSplit = (parseFloat(landDetails.commercialSplit) || 0) / 100;
//   const residentialSplit = (parseFloat(landDetails.residentialSplit) || 0) / 100;

//   const calculatePermissibleAreaResults = () => {
//     let ancillary = 0;
//     let maxPermissible = 0;
//     let commercialMax = 0;
//     let residentialMax = 0;

//     if (zoningType === 'residential') {
//       ancillary = permissibleMaxBuildingPotential * permissibleAncillaryResidentialConst;
//       maxPermissible = permissibleMaxBuildingPotential + ancillary;
//     } else if (zoningType === 'commercial') {
//       ancillary = permissibleMaxBuildingPotential * permissibleAncillaryCommercialConst;
//       maxPermissible = permissibleMaxBuildingPotential + ancillary;
//     } else if (zoningType === 'mixed') {
//       const ancComm = permissibleMaxBuildingPotential * commercialSplit * permissibleAncillaryCommercialConst;
//       const ancResi = permissibleMaxBuildingPotential * residentialSplit * permissibleAncillaryResidentialConst;
//       commercialMax = ancComm + (permissibleMaxBuildingPotential * commercialSplit);
//       residentialMax = ancResi + (permissibleMaxBuildingPotential * residentialSplit);
//       maxPermissible = permissibleMaxBuildingPotential + ancComm + ancResi;
//     }

//     return { ancillary, maxPermissible, commercialMax, residentialMax };
//   };

//   const permResults = calculatePermissibleAreaResults();

//   // Calculate proposed values
//   const proposedMaxBuilding = parseFloat(savedData.Proposed_Max_Building_Potential) || 0;
//   const proposedAncillaryResidentialConst = parseFloat(savedData.Proposed_Residential_Ancillary_Area_Constant) || 0;
//   const proposedAncillaryCommercialConst = parseFloat(savedData.Proposed_Commercial_Ancillary_Area_Constant) || 0;

//   const calculateProposedAreaResults = () => {
//     let ancillary = 0;
//     let maxPermissible = 0;
//     let commercialMax = 0;
//     let residentialMax = 0;

//     if (zoningType === 'residential') {
//       ancillary = proposedMaxBuilding * proposedAncillaryResidentialConst;
//       maxPermissible = proposedMaxBuilding + ancillary;
//     } else if (zoningType === 'commercial') {
//       ancillary = proposedMaxBuilding * proposedAncillaryCommercialConst;
//       maxPermissible = proposedMaxBuilding + ancillary;
//     } else if (zoningType === 'mixed') {
//       const ancComm = proposedMaxBuilding * commercialSplit * proposedAncillaryCommercialConst;
//       const ancResi = proposedMaxBuilding * residentialSplit * proposedAncillaryResidentialConst;
//       commercialMax = ancComm + (proposedMaxBuilding * commercialSplit);
//       residentialMax = ancResi + (proposedMaxBuilding * residentialSplit);
//       maxPermissible = proposedMaxBuilding + ancComm + ancResi;
//     }

//     return { ancillary, maxPermissible, commercialMax, residentialMax };
//   };

//   const propResults = calculateProposedAreaResults();

//   return (
//     <div className="card h-100 border border-2">
//       <div className="card-header">
//         <h2 className="card-title mb-0" style={{ color: '#448C74' }}>Permissible FSI Vs Proposed FSI Breakdown in sqft</h2>
//       </div>
//       <div className="card-body">
//         <div className="table-responsive">
//           <table className="table table-sm table-bordered table-striped mb-0">
//             <thead className="table-light">
//               <tr>
//                 <th className="small fw-semibold">Particulars</th>
//                 <th className="small fw-semibold text-end">Permissible FSI</th>
//                 <th className="small fw-semibold text-end">Proposed FSI</th>
//               </tr>
//             </thead>
//             <tbody>
//               <tr>
//                 <td className="small fw-medium">Basic FSI</td>
//                 <td className="small text-end">{formatNumber(permissibleBasic)}</td>
//                 <td className="small text-end">{formatNumber(parseFloat(savedData.Proposed_Basic_FSI) || 0)}</td>
//               </tr>

//               <tr>
//                 <td className="small fw-medium">Premium FSI</td>
//                 <td className="small text-end">{formatNumber(permissiblePremium)}</td>
//                 <td className="small text-end">{formatNumber(parseFloat(savedData.Proposed_Premium_FSI) || 0)}</td>
//               </tr>

//               <tr>
//                 <td className="small fw-medium">TDR FSI</td>
//                 <td className="small text-end">{formatNumber(permissibleTDR)}</td>
//                 <td className="small text-end">{formatNumber(parseFloat(savedData.Proposed_TDR_FSI) || 0)}</td>
//               </tr>

//               <tr className="table-light">
//                 <td className="small fw-semibold">Max Building Potential</td>
//                 <td className="small fw-semibold text-end">{formatNumber(permissibleMaxBuildingPotential)}</td>
//                 <td className="small fw-semibold text-end">{formatNumber(proposedMaxBuilding)}</td>
//               </tr>

//               {zoningType === 'residential' && (
//                 <tr>
//                   <td className="small fw-medium">Ancillary Area for Residential</td>
//                   <td className="small text-end">{formatNumber(permResults.ancillary)}</td>
//                   <td className="small text-end">{formatNumber(propResults.ancillary)}</td>
//                 </tr>
//               )}

//               {zoningType === 'commercial' && (
//                 <tr>
//                   <td className="small fw-medium">Ancillary Area for Commercial</td>
//                   <td className="small text-end">{formatNumber(permResults.ancillary)}</td>
//                   <td className="small text-end">{formatNumber(propResults.ancillary)}</td>
//                 </tr>
//               )}

//               {zoningType === 'mixed' && (
//                 <>
//                   <tr>
//                     <td className="small fw-medium">Ancillary Area for Commercial</td>
//                     <td className="small text-end">{formatNumber(permissibleMaxBuildingPotential * commercialSplit * permissibleAncillaryCommercialConst)}</td>
//                     <td className="small text-end">{formatNumber(proposedMaxBuilding * commercialSplit * proposedAncillaryCommercialConst)}</td>
//                   </tr>
//                   <tr>
//                     <td className="small fw-medium">Ancillary Area for Residential</td>
//                     <td className="small text-end">{formatNumber(permissibleMaxBuildingPotential * residentialSplit * permissibleAncillaryResidentialConst)}</td>
//                     <td className="small text-end">{formatNumber(proposedMaxBuilding * residentialSplit * proposedAncillaryResidentialConst)}</td>
//                   </tr>

//                   {/* Commercial Max Area */}
//                   <tr>
//                     <td className="small fw-medium">Commercial Max Area</td>
//                     <td className="small text-end">{formatNumber(permResults.commercialMax)}</td>
//                     <td className="small text-end">{formatNumber(propResults.commercialMax)}</td>
//                   </tr>

//                   {/* Residential Max Area */}
//                   <tr>
//                     <td className="small fw-medium">Residential Max Area</td>
//                     <td className="small text-end">{formatNumber(permResults.residentialMax)}</td>
//                     <td className="small text-end">{formatNumber(propResults.residentialMax)}</td>
//                   </tr>
//                 </>
//               )}

//               <tr className="table-primary">
//                 <td className="small fw-bold">Max Permissible Area</td>
//                 <td className="small fw-bold text-end">{formatNumber(permResults.maxPermissible)}</td>
//                 <td className="small fw-bold text-end">{formatNumber(propResults.maxPermissible)}</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FSIProposalOutput; 

import { useState, useEffect } from "react";

const FSIProposalOutput = ({ data, landResults, zoningType, location }) => {
  const [savedData, setSavedData] = useState(null);
  const [meansOfFinanceData, setMeansOfFinanceData] = useState({
    promoterEquityUnsecuredLoan: "",
    bankFinance: "",
    salesCollection: "",
  });
  const [savedMeansOfFinanceData, setSavedMeansOfFinanceData] = useState(null);
  const [meansOfFinanceError, setMeansOfFinanceError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('fsiProposalData');
    if (saved) {
      setSavedData(JSON.parse(saved));
    }
  }, []);

  // Listen for FSI proposal updates
  useEffect(() => {
    const handleFsiProposalUpdate = () => {
      const saved = localStorage.getItem('fsiProposalData');
      if (saved) {
        setSavedData(JSON.parse(saved));
      }
    };

    window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);

    return () => {
      window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
    };
  }, []);

  useEffect(() => {
    if (data) {
      setSavedData(data);
    }
  }, [data]);

  useEffect(() => {
    const saved = localStorage.getItem("meansOfFinanceData");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setMeansOfFinanceData({
        promoterEquityUnsecuredLoan: parsed.promoterEquityUnsecuredLoan || "",
        bankFinance: parsed.bankFinance || "",
        salesCollection: parsed.salesCollection || "",
      });
      setSavedMeansOfFinanceData(parsed);
    } catch (error) {
      setSavedMeansOfFinanceData(null);
    }
  }, []);
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const getLandDetailsData = () => {
    try {
      if (typeof window === 'undefined') return {};
      const landDetailsForm = localStorage.getItem('landDetailsForm');
      return landDetailsForm ? JSON.parse(landDetailsForm) : {};
    } catch (error) {
      return {};
    }
  };

  const calculateCommercialAncillary = () => {
    const landDetails = getLandDetailsData();
    const proposedMaxBuilding = parseFloat(savedData.Proposed_Max_Building_Potential) || 0;
    const commercialSplit = parseFloat(landDetails.commercialSplit) || 0;
    const ancillaryConstant = parseFloat(savedData.Proposed_Commercial_Ancillary_Area_Constant) || 0;

    return proposedMaxBuilding * (commercialSplit / 100) * ancillaryConstant;
  };

  const calculateResidentialAncillary = () => {
    const landDetails = getLandDetailsData();
    const proposedMaxBuilding = parseFloat(savedData.Proposed_Max_Building_Potential) || 0;
    const residentialSplit = parseFloat(landDetails.residentialSplit) || 0;
    const ancillaryConstant = parseFloat(savedData.Proposed_Residential_Ancillary_Area_Constant) || 0;

    return proposedMaxBuilding * (residentialSplit / 100) * ancillaryConstant;
  };

  const calculatePermissibleCommercialAncillary = () => {
    const landDetails = getLandDetailsData();
    const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
    const commercialSplit = parseFloat(landDetails.commercialSplit) || 0;

    return (maxBuildingPotential * commercialSplit / 100) * 0.8;
  };

  const calculatePermissibleResidentialAncillary = () => {
    const landDetails = getLandDetailsData();
    const maxBuildingPotential = parseFloat(landResults.maxBuildingPotential) || 0;
    const residentialSplit = parseFloat(landDetails.residentialSplit) || 0;

    return (maxBuildingPotential * residentialSplit / 100) * 0.6;
  };

  const handleMeansOfFinanceInputChange = (field, value) => {
    setMeansOfFinanceData((prev) => ({ ...prev, [field]: value }));
    if (meansOfFinanceError) {
      setMeansOfFinanceError("");
    }
  };

  const getMeansOfFinanceTotal = (values = meansOfFinanceData) =>
    (parseFloat(values.promoterEquityUnsecuredLoan) || 0) +
    (parseFloat(values.bankFinance) || 0) +
    (parseFloat(values.salesCollection) || 0);

  const handleSaveMeansOfFinance = () => {
    const total = getMeansOfFinanceTotal();

    if (Math.abs(total - 100) > 0.001) {
      setMeansOfFinanceError(
        `Means of Finance total must be 100%. Current total is ${total.toFixed(2)}%.`
      );
      return;
    }

    localStorage.setItem("meansOfFinanceData", JSON.stringify(meansOfFinanceData));
    setSavedMeansOfFinanceData(meansOfFinanceData);
    setMeansOfFinanceError("");
  };

  const meansOfFinanceRows = [
    {
      key: "promoterEquityUnsecuredLoan",
      label: "Promoter Equity and Unsecured Loan",
    },
    {
      key: "bankFinance",
      label: "Bank Finance",
    },
    {
      key: "salesCollection",
      label: "Sales Collection",
    },
  ];

  const meansOfFinanceStyles = `
        .mean-finance-panel {
          border: 1px solid #e6ebf2;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .mean-finance-panel-header {
          padding: 20px 22px 14px;
          border-bottom: 1px solid #e6ebf2;
          background: #f7f9fc;
        }

        .mean-finance-panel-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #768396;
          margin-bottom: 4px;
        }

        .mean-finance-panel-title {
          margin: 0;
          font-size: 22px;
          line-height: 1.15;
          font-weight: 800;
          color: #111827;
        }

        .mean-finance-panel-body {
          min-height: 140px;
          padding: 20px 22px 22px;
          background: #ffffff;
        }

        .mean-finance-field {
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
        }

        .mean-finance-label {
          color: #3f4a5a;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .mean-finance-input-wrap {
          position: relative;
        }

        .mean-finance-input {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          color: #111827;
          font-weight: 600;
          padding-right: 36px;
        }

        .mean-finance-percent {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          font-size: 13px;
          font-weight: 800;
          pointer-events: none;
        }

        .mean-finance-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f7f9fc;
          padding: 12px 14px;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
        }

        .mean-finance-error {
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fff1f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 12px;
        }

        .mean-finance-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .mean-finance-btn {
          border: 0;
          border-radius: 999px;
          min-height: 42px;
          font-size: 13px;
          font-weight: 800;
          padding: 10px 16px;
        }

        .mean-finance-btn-save {
          background: #3f967b;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(63, 150, 123, 0.18);
        }

        .mean-finance-btn-update {
          background: #eef2f7;
          color: #334155;
        }

        .mean-finance-values-list {
          display: grid;
          gap: 10px;
        }

        .mean-finance-value-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid #e5eaf2;
          border-radius: 14px;
          background: #fbfcff;
          padding: 12px 14px;
        }

        .mean-finance-value-label {
          color: #3f4a5a;
          font-size: 13px;
          font-weight: 800;
        }

        .mean-finance-value {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .mean-finance-panel-placeholder {
          min-height: 100px;
          display: grid;
          place-items: center;
          border: 1px dashed #d8e0ea;
          border-radius: 14px;
          background: #fbfcff;
          color: #7b8796;
          font-weight: 600;
          text-align: center;
          padding: 16px;
        }

        @media (max-width: 576px) {
          .mean-finance-actions {
            grid-template-columns: 1fr;
          }

          .mean-finance-value-row {
            flex-direction: column;
            gap: 6px;
          }
        }
  `;

  const meansOfFinancePanels = (
    <div className="row g-3 mt-3">
      <div className="col-lg-6">
        <div className="mean-finance-panel h-100">
          <div className="mean-finance-panel-header">
            <div className="mean-finance-panel-eyebrow">Selected Section</div>
            <h3 className="mean-finance-panel-title">Means Of Finance</h3>
          </div>
          <div className="mean-finance-panel-body">
            <div className="d-grid gap-3">
              {meansOfFinanceRows.map((row) => (
                <div className="mean-finance-field" key={row.key}>
                  <label className="mean-finance-label">{row.label}</label>
                  <div className="mean-finance-input-wrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="form-control mean-finance-input"
                      value={meansOfFinanceData[row.key]}
                      onChange={(event) =>
                        handleMeansOfFinanceInputChange(row.key, event.target.value)
                      }
                      placeholder="Enter percentage"
                    />
                    <span className="mean-finance-percent">%</span>
                  </div>
                </div>
              ))}

              <div className="mean-finance-total">
                <span>Total</span>
                <span>{getMeansOfFinanceTotal().toFixed(2)}%</span>
              </div>

              {meansOfFinanceError && (
                <div className="mean-finance-error">{meansOfFinanceError}</div>
              )}

              <div className="mean-finance-actions">
                <button
                  type="button"
                  className="mean-finance-btn mean-finance-btn-save"
                  onClick={handleSaveMeansOfFinance}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="mean-finance-btn mean-finance-btn-update"
                  onClick={handleSaveMeansOfFinance}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="mean-finance-panel h-100">
          <div className="mean-finance-panel-header">
            <div className="mean-finance-panel-eyebrow">Selected Section</div>
            <h3 className="mean-finance-panel-title">Means of Finance Values</h3>
          </div>
          <div className="mean-finance-panel-body">
            {savedMeansOfFinanceData ? (
              <div className="mean-finance-values-list">
                {meansOfFinanceRows.map((row) => (
                  <div className="mean-finance-value-row" key={row.key}>
                    <span className="mean-finance-value-label">{row.label}</span>
                    <span className="mean-finance-value">
                      {(parseFloat(savedMeansOfFinanceData[row.key]) || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
                <div className="mean-finance-total">
                  <span>Total</span>
                  <span>{getMeansOfFinanceTotal(savedMeansOfFinanceData).toFixed(2)}%</span>
                </div>
              </div>
            ) : (
              <div className="mean-finance-panel-placeholder">
                No means of finance values saved.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!savedData || !landResults) {
    return (
      <div className="fsi-breakdown-shell">
        <style>{`
          .fsi-breakdown-shell {
            background: ${location === "Pune" || location === "Thane" ? "#f5f7fb" : "#f5f7fb"};
            border: 1px solid #e6ebf2;
            border-radius: 18px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
            overflow: hidden;
          }

          .fsi-breakdown-header {
            padding: 22px 26px 14px;
            border-bottom: 1px solid #e6ebf2;
            background: #f7f9fc;
          }

          .fsi-breakdown-eyebrow {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #768396;
            margin-bottom: 4px;
          }

          .fsi-breakdown-title {
            margin: 0;
            font-size: 28px;
            line-height: 1.1;
            font-weight: 800;
            color: #111827;
          }

          .fsi-breakdown-body {
            padding: 20px 22px 22px;
            background: #ffffff;
          }

          .fsi-breakdown-empty {
            min-height: 160px;
            display: grid;
            place-items: center;
            color: #7b8796;
            font-weight: 600;
          }

          ${meansOfFinanceStyles}

          @media (max-width: 768px) {
            .fsi-breakdown-header,
            .fsi-breakdown-body {
              padding-left: 16px;
              padding-right: 16px;
            }

            .fsi-breakdown-title {
              font-size: 24px;
            }
          }
        `}</style>

        <div className="fsi-breakdown-header">
          <div className="fsi-breakdown-eyebrow">Selected Section</div>
          <h2 className="fsi-breakdown-title">Permissible FSI Vs Proposed FSI Breakdown in sqft</h2>
        </div>

        <div className="fsi-breakdown-body">
          <div className="fsi-breakdown-empty">No FSI proposal data available</div>
        </div>
      </div>
    );
  }

  const isPuneThane = location === "Pune" || location === "Thane";

  // Calculate permissible values based on location
  const permissibleBasic = parseFloat(isPuneThane ? landResults.basicFSI : savedData.Permissible_Basic_FSI) || 0;
  const permissiblePremium = parseFloat(isPuneThane ? landResults.premium : savedData.Permissible_Premium_FSI) || 0;
  const permissibleTDR = parseFloat(isPuneThane ? landResults.tdr : savedData.Permissible_TDR_FSI) || 0;
  const permissibleOtherFSI = parseFloat(savedData.Permissible_Other_FSI) || 0;
  const permissibleMaxBuildingPotential = permissibleBasic + permissiblePremium + permissibleTDR + permissibleOtherFSI;

  const permissibleAncillaryResidentialConst = parseFloat(isPuneThane ? 0.6 : savedData.Permissible_Residential_Ancillary_Area_Constant) || 0;
  const permissibleAncillaryCommercialConst = parseFloat(isPuneThane ? 0.8 : savedData.Permissible_Commercial_Ancillary_Area_Constant) || 0;

  const landDetails = getLandDetailsData();
  const commercialSplit = (parseFloat(landDetails.commercialSplit) || 0) / 100;
  const residentialSplit = (parseFloat(landDetails.residentialSplit) || 0) / 100;

  const calculatePermissibleAreaResults = () => {
    let ancillary = 0;
    let maxPermissible = 0;
    let commercialMax = 0;
    let residentialMax = 0;

    if (zoningType === 'residential') {
      ancillary = permissibleMaxBuildingPotential * permissibleAncillaryResidentialConst;
      maxPermissible = permissibleMaxBuildingPotential + ancillary;
    } else if (zoningType === 'commercial') {
      ancillary = permissibleMaxBuildingPotential * permissibleAncillaryCommercialConst;
      maxPermissible = permissibleMaxBuildingPotential + ancillary;
    } else if (zoningType === 'mixed') {
      const ancComm = permissibleMaxBuildingPotential * commercialSplit * permissibleAncillaryCommercialConst;
      const ancResi = permissibleMaxBuildingPotential * residentialSplit * permissibleAncillaryResidentialConst;
      commercialMax = ancComm + (permissibleMaxBuildingPotential * commercialSplit);
      residentialMax = ancResi + (permissibleMaxBuildingPotential * residentialSplit);
      maxPermissible = permissibleMaxBuildingPotential + ancComm + ancResi;
    }

    return { ancillary, maxPermissible, commercialMax, residentialMax };
  };

  const permResults = calculatePermissibleAreaResults();

  // Calculate proposed values
  const proposedBasic = parseFloat(savedData.Proposed_Basic_FSI) || 0;
  const proposedPremium = parseFloat(savedData.Proposed_Premium_FSI) || 0;
  const proposedTDR = parseFloat(savedData.Proposed_TDR_FSI) || 0;
  const proposedOtherFSI = parseFloat(savedData.Proposed_Other_FSI) || 0;
  const proposedMaxBuildingFromData = parseFloat(savedData.Proposed_Max_Building_Potential) || 0;
  const proposedMaxBuilding = proposedBasic + proposedPremium + proposedTDR + proposedOtherFSI;
  
  const proposedAncillaryResidentialConst = parseFloat(savedData.Proposed_Residential_Ancillary_Area_Constant) || 0;
  const proposedAncillaryCommercialConst = parseFloat(savedData.Proposed_Commercial_Ancillary_Area_Constant) || 0;

  const calculateProposedAreaResults = () => {
    let ancillary = 0;
    let maxPermissible = 0;
    let commercialMax = 0;
    let residentialMax = 0;

    if (zoningType === 'residential') {
      ancillary = proposedMaxBuilding * proposedAncillaryResidentialConst;
      maxPermissible = proposedMaxBuilding + ancillary;
    } else if (zoningType === 'commercial') {
      ancillary = proposedMaxBuilding * proposedAncillaryCommercialConst;
      maxPermissible = proposedMaxBuilding + ancillary;
    } else if (zoningType === 'mixed') {
      const ancComm = proposedMaxBuilding * commercialSplit * proposedAncillaryCommercialConst;
      const ancResi = proposedMaxBuilding * residentialSplit * proposedAncillaryResidentialConst;
      commercialMax = ancComm + (proposedMaxBuilding * commercialSplit);
      residentialMax = ancResi + (proposedMaxBuilding * residentialSplit);
      maxPermissible = proposedMaxBuilding + ancComm + ancResi;
    }

    return { ancillary, maxPermissible, commercialMax, residentialMax };
  };

  const propResults = calculateProposedAreaResults();

  return (
    <div className="fsi-breakdown-shell">
      <style>{`
        .fsi-breakdown-shell {
          background: #f5f7fb;
          border: 1px solid #e6ebf2;
          border-radius: 18px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .fsi-breakdown-header {
          padding: 22px 26px 14px;
          border-bottom: 1px solid #e6ebf2;
          background: #f7f9fc;
        }

        .fsi-breakdown-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #768396;
          margin-bottom: 4px;
        }

        .fsi-breakdown-title {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          color: #111827;
        }

        .fsi-breakdown-body {
          padding: 20px 22px 22px;
          background: #ffffff;
        }

        .fsi-breakdown-table-wrap {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
        }

        .fsi-breakdown-table {
          margin-bottom: 0;
        }

        .fsi-breakdown-table thead th {
          background: #f4f7fb !important;
          color: #334155;
          border-bottom: 1px solid #e2e8f0 !important;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 800;
        }

        .fsi-breakdown-table tbody td {
          vertical-align: middle;
          border-color: #e2e8f0 !important;
          color: #1f2937;
        }

        .fsi-breakdown-table tbody tr.table-light td {
          background: #f8fafc !important;
        }

        .fsi-breakdown-table tbody tr.table-primary td {
          background: #eaf5f1 !important;
          color: #0f172a;
        }

        .fsi-breakdown-empty {
          min-height: 160px;
          display: grid;
          place-items: center;
          color: #7b8796;
          font-weight: 600;
        }

        ${meansOfFinanceStyles}

        @media (max-width: 768px) {
          .fsi-breakdown-header,
          .fsi-breakdown-body {
            padding-left: 16px;
            padding-right: 16px;
          }

          .fsi-breakdown-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="fsi-breakdown-header">
        <div className="fsi-breakdown-eyebrow">Selected Section</div>
        <h2 className="fsi-breakdown-title">Permissible FSI Vs Proposed FSI Breakdown in sqft</h2>
      </div>

      <div className="fsi-breakdown-body">
        <div className="fsi-breakdown-table-wrap table-responsive">
          <table className="table table-sm table-bordered table-striped mb-0 fsi-breakdown-table">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Particulars</th>
                <th className="small fw-semibold text-end">Permissible FSI</th>
                <th className="small fw-semibold text-end">Proposed FSI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="small fw-medium">Basic FSI</td>
                <td className="small text-end">{formatNumber(permissibleBasic)}</td>
                <td className="small text-end">{formatNumber(proposedBasic)}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Premium FSI</td>
                <td className="small text-end">{formatNumber(permissiblePremium)}</td>
                <td className="small text-end">{formatNumber(proposedPremium)}</td>
              </tr>

              <tr>
                <td className="small fw-medium">TDR FSI</td>
                <td className="small text-end">{formatNumber(permissibleTDR)}</td>
                <td className="small text-end">{formatNumber(proposedTDR)}</td>
              </tr>

              <tr>
                <td className="small fw-medium">Other FSI</td>
                <td className="small text-end">{formatNumber(permissibleOtherFSI)}</td>
                <td className="small text-end">{formatNumber(proposedOtherFSI)}</td>
              </tr>

              <tr className="table-light">
                <td className="small fw-semibold">Max Building Potential</td>
                <td className="small fw-semibold text-end">{formatNumber(permissibleMaxBuildingPotential)}</td>
                <td className="small fw-semibold text-end">{formatNumber(proposedMaxBuilding)}</td>
              </tr>

              {zoningType === 'residential' && (
                <tr>
                  <td className="small fw-medium">Ancillary Area for Residential</td>
                  <td className="small text-end">{formatNumber(permResults.ancillary)}</td>
                  <td className="small text-end">{formatNumber(propResults.ancillary)}</td>
                </tr>
              )}

              {zoningType === 'commercial' && (
                <tr>
                  <td className="small fw-medium">Ancillary Area for Commercial</td>
                  <td className="small text-end">{formatNumber(permResults.ancillary)}</td>
                  <td className="small text-end">{formatNumber(propResults.ancillary)}</td>
                </tr>
              )}

              {zoningType === 'mixed' && (
                <>
                  <tr>
                    <td className="small fw-medium">Ancillary Area for Commercial</td>
                    <td className="small text-end">{formatNumber(permissibleMaxBuildingPotential * commercialSplit * permissibleAncillaryCommercialConst)}</td>
                    <td className="small text-end">{formatNumber(proposedMaxBuilding * commercialSplit * proposedAncillaryCommercialConst)}</td>
                  </tr>
                  <tr>
                    <td className="small fw-medium">Ancillary Area for Residential</td>
                    <td className="small text-end">{formatNumber(permissibleMaxBuildingPotential * residentialSplit * permissibleAncillaryResidentialConst)}</td>
                    <td className="small text-end">{formatNumber(proposedMaxBuilding * residentialSplit * proposedAncillaryResidentialConst)}</td>
                  </tr>

                  {/* Commercial Max Area */}
                  <tr>
                    <td className="small fw-medium">Commercial Max Area</td>
                    <td className="small text-end">{formatNumber(permResults.commercialMax)}</td>
                    <td className="small text-end">{formatNumber(propResults.commercialMax)}</td>
                  </tr>

                  {/* Residential Max Area */}
                  <tr>
                    <td className="small fw-medium">Residential Max Area</td>
                    <td className="small text-end">{formatNumber(permResults.residentialMax)}</td>
                    <td className="small text-end">{formatNumber(propResults.residentialMax)}</td>
                  </tr>
                </>
              )}

              <tr className="table-primary">
                <td className="small fw-bold">Max Permissible Area</td>
                <td className="small fw-bold text-end">{formatNumber(permResults.maxPermissible)}</td>
                <td className="small fw-bold text-end">{formatNumber(propResults.maxPermissible)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FSIProposalOutput;
