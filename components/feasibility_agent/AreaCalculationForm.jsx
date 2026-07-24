import { useState, useEffect } from "react";
import { FaCalculator, FaLayerGroup, FaStore, FaSave, FaSyncAlt, FaExchangeAlt } from "react-icons/fa";

const AreaCalculationForm = ({ landResults, fsiProposalData, zoningType, location, onSave }) => {
    const [formData, setFormData] = useState({
        efficiencyRatio: "0.85",
        resLoadingRatio: "1.35",
        commercialType: ["Shop"],
        shopLoading: "1.50",
        officeLoading: "1.45",
        shopPercentage: 50,
        officePercentage: 50
    });
    const theme = "light";

    useEffect(() => {
        const saved = localStorage.getItem("areaCalculationForm");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.commercialType && !Array.isArray(parsed.commercialType)) {
                parsed.commercialType = [parsed.commercialType];
            }
            setFormData(prev => ({
                ...prev,
                ...parsed,
                shopLoading: parsed.shopLoading || "1.50",
                officeLoading: parsed.officeLoading || "1.45",
                shopPercentage: parsed.shopPercentage || 50,
                officePercentage: parsed.officePercentage || 50,
            }));
        }
    }, [zoningType]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        localStorage.setItem("areaCalculationForm", JSON.stringify(formData));

        // Calculate and save area calculations payload
        const efficiency = parseFloat(formData.efficiencyRatio) || 0;
        const resLoading = parseFloat(formData.resLoadingRatio) || 0;

        const permissibleTotal = typeof permissible === 'object' ? permissible.total : (permissible || 0);
        const proposedTotal = typeof proposed === 'object' ? proposed.total : (proposed || 0);

        const permCarpetTotal = permissibleTotal * efficiency;
        const propCarpetTotal = proposedTotal * efficiency;

        let areaResults = {
            carpetArea: {
                permissible: permCarpetTotal,
                proposed: propCarpetTotal
            },
            saleableArea: {
                permissible: 0,
                proposed: 0
            },
            details: {}
        };

        if (zoningType === "residential") {
            const permSaleable = permCarpetTotal * resLoading;
            const propSaleable = propCarpetTotal * resLoading;

            areaResults.saleableArea.permissible = permSaleable;
            areaResults.saleableArea.proposed = propSaleable;

            areaResults.details.residential = {
                carpetPerm: permCarpetTotal,
                carpetProp: propCarpetTotal,
                saleablePerm: permSaleable,
                saleableProp: propSaleable
            };
        } else if (zoningType === "commercial") {
            const commTypes = Array.isArray(formData.commercialType) ? formData.commercialType : (formData.commercialType ? [formData.commercialType] : []);
            const commSplitShop = (commTypes.length === 2 ? (formData.shopPercentage / 100) : 1);
            const commSplitOffice = (commTypes.length === 2 ? (formData.officePercentage / 100) : 1);

            let permSaleable = 0;
            let propSaleable = 0;
            const details = {};

            if (commTypes.includes("Shop")) {
                const shopLoading = parseFloat(formData.shopLoading) || 0;
                const pCarpetShop = permCarpetTotal * commSplitShop;
                const prCarpetShop = propCarpetTotal * commSplitShop;
                const pSaleShop = pCarpetShop * shopLoading;
                const prSaleShop = prCarpetShop * shopLoading;

                permSaleable += pSaleShop;
                propSaleable += prSaleShop;

                details.shop = {
                    carpetPerm: pCarpetShop,
                    carpetProp: prCarpetShop,
                    saleablePerm: pSaleShop,
                    saleableProp: prSaleShop
                };
            }

            if (commTypes.includes("Office")) {
                const officeLoading = parseFloat(formData.officeLoading) || 0;
                const pCarpetOffice = permCarpetTotal * commSplitOffice;
                const prCarpetOffice = propCarpetTotal * commSplitOffice;
                const pSaleOffice = pCarpetOffice * officeLoading;
                const prSaleOffice = prCarpetOffice * officeLoading;

                permSaleable += pSaleOffice;
                propSaleable += prSaleOffice;

                details.office = {
                    carpetPerm: pCarpetOffice,
                    carpetProp: prCarpetOffice,
                    saleablePerm: pSaleOffice,
                    saleableProp: prSaleOffice
                };
            }

            areaResults.saleableArea.permissible = permSaleable;
            areaResults.saleableArea.proposed = propSaleable;
            areaResults.details.commercial = details;
        } else if (zoningType === "mixed") {
            const permResBase = (typeof permissible === 'object' ? permissible.res : 0) * efficiency;
            const propResBase = (typeof proposed === 'object' ? proposed.res : 0) * efficiency;

            const permCommBase = (typeof permissible === 'object' ? permissible.comm : 0) * efficiency;
            const propCommBase = (typeof proposed === 'object' ? proposed.comm : 0) * efficiency;

            const permResSale = permResBase * resLoading;
            const propResSale = propResBase * resLoading;

            const commTypes = Array.isArray(formData.commercialType) ? formData.commercialType : (formData.commercialType ? [formData.commercialType] : []);
            const commSplitShop = (commTypes.length === 2 ? (formData.shopPercentage / 100) : 1);
            const commSplitOffice = (commTypes.length === 2 ? (formData.officePercentage / 100) : 1);

            let permCommSale = 0;
            let propCommSale = 0;
            const commDetails = {};

            if (commTypes.includes("Shop")) {
                const shopLoading = parseFloat(formData.shopLoading) || 0;
                const pCarpetShop = permCommBase * commSplitShop;
                const prCarpetShop = propCommBase * commSplitShop;
                const pSaleShop = pCarpetShop * shopLoading;
                const prSaleShop = prCarpetShop * shopLoading;

                permCommSale += pSaleShop;
                propCommSale += prSaleShop;

                commDetails.shop = {
                    carpetPerm: pCarpetShop,
                    carpetProp: prCarpetShop,
                    saleablePerm: pSaleShop,
                    saleableProp: prSaleShop
                };
            }

            if (commTypes.includes("Office")) {
                const officeLoading = parseFloat(formData.officeLoading) || 0;
                const pCarpetOffice = permCommBase * commSplitOffice;
                const prCarpetOffice = propCommBase * commSplitOffice;
                const pSaleOffice = pCarpetOffice * officeLoading;
                const prSaleOffice = prCarpetOffice * officeLoading;

                permCommSale += pSaleOffice;
                propCommSale += prSaleOffice;

                commDetails.office = {
                    carpetPerm: pCarpetOffice,
                    carpetProp: prCarpetOffice,
                    saleablePerm: pSaleOffice,
                    saleableProp: prSaleOffice
                };
            }

            areaResults.saleableArea.permissible = permResSale + permCommSale;
            areaResults.saleableArea.proposed = propResSale + propCommSale;

            areaResults.details.residential = {
                carpetPerm: permResBase,
                carpetProp: propResBase,
                saleablePerm: permResSale,
                saleableProp: propResSale
            };

            areaResults.details.commercial = {
                totalCarpetPerm: permCommBase,
                totalCarpetProp: propCommBase,
                totalSaleablePerm: permCommSale,
                totalSaleableProp: propCommSale,
                ...commDetails
            };
        }

        localStorage.setItem("areaCalculationResults", JSON.stringify(areaResults));

        onSave(formData);
        window.dispatchEvent(new CustomEvent("areaCalculationUpdated"));
        alert("Area calculation ratios saved successfully!");
    };

    if (!landResults) {
        return (
            <div className="loading-factor-panel h-100">
                <style>{`
                    .loading-factor-panel {
                        
                        border: 1px solid ${theme === "dark" ? "#353941" : "#e7ebf1"};
                        border-radius: 24px;
                        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                        overflow: hidden;
                    }

                    .loading-factor-header {
                        padding: 24px 26px 14px;
                        
                        border-bottom: 1px solid ${theme === "dark" ? "#353941" : "#edf1f6"};
                    }

                    .loading-factor-eyebrow {
                        color: ${theme === "dark" ? "#9ca3af" : "#8b95a5"};
                        font-size: 12px;
                        font-weight: 800;
                        letter-spacing: 0.12em;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }

                    .loading-factor-title {
                        color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                        font-size: 32px;
                        line-height: 1;
                        font-weight: 800;
                        margin: 0;
                    }

                    .loading-factor-body {
                        padding: 26px;
                        
                    }
                `}</style>
                <div className="loading-factor-header">
                    <div className="loading-factor-eyebrow">Selected Section</div>
                    <h2 className="loading-factor-title">Loading Factor</h2>
                </div>
                <div className="loading-factor-body text-center">
                    <p className="text-muted mb-0">Please complete Section 1 (Land Details) to see Area Calculations.</p>
                </div>
            </div>
        );
    }

    const isPuneThane = location === "Pune" || location === "Thane";

    // 1. Calculate Base Potentials (Max + Ancillary)
    const getPotential = (isPermissible) => {
        let landDetails = {};
        if (typeof window !== 'undefined') {
            try {
                landDetails = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
            } catch (e) { landDetails = {}; }
        }
        const commSplit = (parseFloat(landDetails.commercialSplit) || 0) / 100;
        const resSplit = (parseFloat(landDetails.residentialSplit) || 0) / 100;

        if (isPermissible) {
            const pBasic = parseFloat(isPuneThane ? landResults.basicFSI : fsiProposalData?.Permissible_Basic_FSI) || 0;
            const pPremium = parseFloat(isPuneThane ? landResults.premium : fsiProposalData?.Permissible_Premium_FSI) || 0;
            const pTDR = parseFloat(isPuneThane ? landResults.tdr : fsiProposalData?.Permissible_TDR_FSI) || 0;
            const pMaxBuildingPotential = pBasic + pPremium + pTDR;

            const pAncResConst = parseFloat(isPuneThane ? 0.6 : fsiProposalData?.Permissible_Residential_Ancillary_Area_Constant) || 0;
            const pAncCommConst = parseFloat(isPuneThane ? 0.8 : fsiProposalData?.Permissible_Commercial_Ancillary_Area_Constant) || 0;

            if (zoningType === 'residential') return pMaxBuildingPotential * (1 + pAncResConst);
            if (zoningType === 'commercial') return pMaxBuildingPotential * (1 + pAncCommConst);
            if (zoningType === 'mixed') {
                const commPot = (pMaxBuildingPotential * commSplit) * (1 + pAncCommConst);
                const resPot = (pMaxBuildingPotential * resSplit) * (1 + pAncResConst);
                return { total: commPot + resPot, comm: commPot, res: resPot };
            }
            return pMaxBuildingPotential;
        } else {
            const prMaxBuilding = (parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0);
            const prAncResConst = parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0;
            const prAncCommConst = parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0;

            if (zoningType === 'residential') return prMaxBuilding * (1 + prAncResConst);
            if (zoningType === 'commercial') return prMaxBuilding * (1 + prAncCommConst);
            if (zoningType === 'mixed') {
                const commPot = (prMaxBuilding * commSplit) * (1 + prAncCommConst);
                const resPot = (prMaxBuilding * resSplit) * (1 + prAncResConst);
                return { total: commPot + resPot, comm: commPot, res: resPot };
            }
            return prMaxBuilding;
        }
    };

    const permissible = getPotential(true);
    const proposed = getPotential(false);

    const formatNum = (v) => Math.round(v).toLocaleString('en-IN');

    const efficiency = parseFloat(formData.efficiencyRatio) || 0;
    const resLoading = parseFloat(formData.resLoadingRatio) || 0;

    const renderFormulaRow = (label, inputField, baseValuePerm, baseValueProp, resultValuePerm, resultValueProp, baseLabel, resultLabel) => {
        return (
            <div className="loading-factor-card mb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <span className={`fw-bold small text-uppercase ls-1 ${theme == "dark" ? "text-white" : "text-dark-emphasis"
                        }`}>
                        <FaLayerGroup className="me-2 text-info" />{label}
                    </span>
                </div>

                <div className="row g-4">
                    {/* Permissible Column */}
                    <div className="col-lg-6">
                        <div className="p-3 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-25 h-100">
                            <div className="d-flex align-items-center mb-3">
                                <span className="badge bg-success text-white px-3 py-1 rounded-pill me-2">Permissible</span>
                            </div>
                            <div className="d-flex align-items-end flex-wrap gap-2">
                                <div className="text-center">
                                    <div
                                        className="small fw-bold text-success mb-1"
                                        style={{
                                            fontSize: '0.65rem',
                                            color: theme == "dark" ? "#fff" : "#333"
                                        }}
                                    >
                                        LOADING FACTOR
                                    </div>
                                    <div className="input-group input-group-sm rounded-3 shadow-sm" style={{ width: "100px" }}>
                                        <input
                                            type="number"
                                            className={`form-control text-center fw-bold ${theme == "dark" ? "text-white" : "text-primary"}`}
                                            value={formData[inputField]}
                                            onChange={(e) => handleInputChange(inputField, e.target.value)}
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <span className="fw-bold text-muted px-1 pb-2">×</span>
                                <div className="text-center">
                                    <div className="small fw-bold text-success mb-1" style={{ fontSize: '0.65rem' }}>{baseLabel.toUpperCase()}</div>
                                    <div className={`${theme == "dark" ? "bg-dark" : "bg-white"} px-3 py-2 rounded-3 shadow-sm border border-light fw-bold text-dark small`} style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                                        {formatNum(baseValuePerm)}
                                    </div>
                                </div>
                                <span className="fw-bold text-muted px-1 pb-2">=</span>
                                <div className="text-center flex-grow-1">
                                    <div className="small fw-bold text-success mb-1" style={{ fontSize: '0.65rem' }}>{resultLabel.toUpperCase()}</div>
                                    <div
                                        className={`${theme == "dark" ? "bg-dark" : "bg-white"} px-3 py-2 rounded-3 shadow-sm border border-info-subtle fw-bold text-info text-center`}
                                        style={{ minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {formatNum(resultValuePerm)} <span className="small ms-1">sqft</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Proposed Column */}
                    <div className="col-lg-6">
                        <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-25 h-100">
                            <div className="d-flex align-items-center mb-3">
                                <span className="badge bg-primary text-white px-3 py-1 rounded-pill me-2">Proposed</span>
                            </div>
                            <div className="d-flex align-items-end flex-wrap gap-2">
                                <div className="text-center">
                                    <div className="small fw-bold text-primary mb-1" style={{ fontSize: '0.65rem' }}>LOADING FACTOR</div>
                                    <div className={`${theme == "dark" ? "bg-dark" : "bg-white"} px-3 py-2 rounded-3 shadow-sm border border-light fw-bold ${theme == "dark" ? "text-white" : "text-primary"} text-center`} style={{ width: "100px", minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {formData[inputField]}
                                    </div>
                                </div>
                                <span className="fw-bold text-muted px-1 pb-2">×</span>
                                <div className="text-center">
                                    <div className="small fw-bold text-primary mb-1" style={{ fontSize: '0.65rem' }}>{baseLabel.toUpperCase()}</div>
                                    <div className={`${theme == "dark" ? "bg-dark" : "bg-white"} px-3 py-2 rounded-3 shadow-sm border border-light fw-bold text-dark small`} style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                                        {formatNum(baseValueProp)}
                                    </div>
                                </div>
                                <span className="fw-bold text-muted px-1 pb-2">=</span>
                                <div className="text-center flex-grow-1">
                                    <div className="small fw-bold text-primary mb-1" style={{ fontSize: '0.65rem' }}>{resultLabel.toUpperCase()}</div>
                                    <div className={`${theme == "dark" ? "bg-dark" : "bg-white"} px-3 py-2 rounded-3 shadow-sm border border-primary-subtle fw-bold text-primary text-center`} style={{ minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {formatNum(resultValueProp)} <span className="small ms-1">sqft</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        );
    };

    const permTotal = typeof permissible === 'object' ? permissible.total : permissible;
    const propTotal = typeof proposed === 'object' ? proposed.total : proposed;

    // Carpet Areas
    const permCarpet = permTotal * efficiency;
    const propCarpet = propTotal * efficiency;

    // Residential Bases (If mixed, use .res, otherwise use total)
    const permResBase = (typeof permissible === 'object' ? permissible.res : permissible) * efficiency;
    const propResBase = (typeof proposed === 'object' ? proposed.res : proposed) * efficiency;

    // Commercial Bases (If mixed, use .comm, otherwise use total)
    const permCommBase = (typeof permissible === 'object' ? permissible.comm : permissible) * efficiency;
    const propCommBase = (typeof proposed === 'object' ? proposed.comm : proposed) * efficiency;

    const commTypes = Array.isArray(formData.commercialType) ? formData.commercialType : (formData.commercialType ? [formData.commercialType] : []);
    const commSplitShop = (commTypes.length === 2 ? (formData.shopPercentage / 100) : 1);
    const commSplitOffice = (commTypes.length === 2 ? (formData.officePercentage / 100) : 1);

    return (
        <div className="loading-factor-panel mt-4 h-100">
            <style>{`
                .ls-1 { letter-spacing: 0.5px; }
                .loading-factor-panel {
                    
                    border: 1px solid ${theme === "dark" ? "#353941" : "#e7ebf1"};
                    border-radius: 24px;
                    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                }

                .loading-factor-header {
                    padding: 24px 26px 14px;
                    
                    border-bottom: 1px solid ${theme === "dark" ? "#353941" : "#edf1f6"};
                }

                .loading-factor-eyebrow {
                    color: ${theme === "dark" ? "#9ca3af" : "#8b95a5"};
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .loading-factor-title {
                    color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                    font-size: 32px;
                    line-height: 1;
                    font-weight: 800;
                    margin: 0;
                }

                .loading-factor-body {
                    padding: 26px;
                    
                }

                .loading-factor-card {
                    border: 1px solid ${theme === "dark" ? "#383e49" : "#e5eaf2"};
                    background: ${theme === "dark" ? "#262a31" : "#fbfcff"};
                    border-radius: 18px;
                    padding: 18px;
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
                }

                .loading-factor-panel .form-control,
                .loading-factor-panel .form-select {
                    min-height: 41px;
                    border-radius: 12px;
                    border: 1px solid ${theme === "dark" ? "#434956" : "#dfe5ee"};
                    background: ${theme === "dark" ? "#1f232a" : "#ffffff"};
                    color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
                }

                .loading-factor-panel .btn {
                    min-height: 46px;
                    font-weight: 800;
                    border-radius: 999px;
                }

                @media (max-width: 768px) {
                    .loading-factor-header,
                    .loading-factor-body {
                        padding-left: 20px;
                        padding-right: 20px;
                    }

                    .loading-factor-title {
                        font-size: 28px;
                    }
                }
            `}</style>
            <div className="loading-factor-header">
                <div className="loading-factor-eyebrow">Selected Section</div>
                <h2 className="loading-factor-title">Loading Factor</h2>
            </div>
            <div className="loading-factor-body">
                {/* Efficiency Formula Card */}
                {renderFormulaRow(
                    "Total Carpet Area Calculation",
                    "efficiencyRatio",
                    permTotal,
                    propTotal,
                    permCarpet,
                    propCarpet,
                    "FSI Area",
                    "Carpet Area"
                )}

                {/* Residential Loading Formula Card */}
                {(zoningType === "residential" || zoningType === "mixed") && (
                    renderFormulaRow(
                        "Residential Saleable Area Loading",
                        "resLoadingRatio",
                        permResBase,
                        propResBase,
                        permResBase * resLoading,
                        propResBase * resLoading,
                        "Carpet Area",
                        "Saleable Area"
                    )
                )}

                {/* Commercial Section (Shop/Office) */}
                {(zoningType === "commercial" || zoningType === "mixed") && (
                    <div className="loading-factor-card mt-4">
                        <div className="d-flex flex-column mb-4">
                            <label className="fw-bold text-dark-emphasis small text-uppercase ls-1 mb-3">
                                <FaStore className="me-2 text-warning" />Commercial Loading Settings
                            </label>
                            <div className="d-flex gap-4 p-3 bg-light rounded-3">
                                {["Shop", "Office"].map(type => (
                                    <div className="form-check" key={type}>
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={`type${type}`}
                                            checked={commTypes.includes(type)}
                                            onChange={(e) => {
                                                const types = new Set(commTypes);
                                                if (e.target.checked) types.add(type); else types.delete(type);
                                                handleInputChange("commercialType", Array.from(types));
                                            }}
                                        />
                                        <label className="form-check-label fw-bold ms-1" htmlFor={`type${type}`}>{type}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {commTypes.includes("Shop") && (
                            <div className="mt-4 border-top pt-4">
                                {renderFormulaRow(
                                    "Shop Saleable Area Loading",
                                    "shopLoading",
                                    permCommBase * commSplitShop,
                                    propCommBase * commSplitShop,
                                    permCommBase * commSplitShop * (parseFloat(formData.shopLoading) || 0),
                                    propCommBase * commSplitShop * (parseFloat(formData.shopLoading) || 0),
                                    "Carpet Area",
                                    "Saleable Area"
                                )}
                            </div>
                        )}

                        {commTypes.includes("Office") && (
                            <div className="mt-4 border-top pt-4">
                                {renderFormulaRow(
                                    "Office Saleable Area Loading",
                                    "officeLoading",
                                    permCommBase * commSplitOffice,
                                    propCommBase * commSplitOffice,
                                    permCommBase * commSplitOffice * (parseFloat(formData.officeLoading) || 0),
                                    propCommBase * commSplitOffice * (parseFloat(formData.officeLoading) || 0),
                                    "Carpet Area",
                                    "Saleable Area"
                                )}
                            </div>
                        )}

                        {commTypes.length === 2 && (
                            <div className="bg-info bg-opacity-10 p-4 rounded-4 mt-4 border border-info border-opacity-25">
                                <h6 className="small fw-bold text-info-emphasis text-uppercase ls-1 mb-4">Commercial Area Split (%)</h6>
                                <div className="row g-4 align-items-center">
                                    <div className="col-md-5">
                                        <label className="small fw-bold text-dark-emphasis mb-2">Shop Percentage</label>
                                        <div className="input-group">
                                            <input type="number" className="form-control fw-bold border-info-subtle" value={formData.shopPercentage} onChange={(e) => {
                                                const s = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                                setFormData(p => ({ ...p, shopPercentage: s, officePercentage: 100 - s }));
                                            }} />
                                            <span className="input-group-text bg-info-subtle border-info-subtle">%</span>
                                        </div>
                                    </div>
                                    <div className="col-md-2 text-center pt-3 mt-md-0">
                                        {/* <i className="fas fa-arrows-left-right text-info opacity-50 h4 mb-0"></i> */}
                                        <FaExchangeAlt className="text-info opacity-50 h4 mb-0" />
                                    </div>
                                    <div className="col-md-5">
                                        <label className="small fw-bold text-dark-emphasis mb-2">Office Percentage</label>
                                        <div className="input-group">
                                            <input type="number" className="form-control fw-bold border-success-subtle" value={formData.officePercentage} onChange={(e) => {
                                                const o = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                                setFormData(p => ({ ...p, officePercentage: o, shopPercentage: 100 - o }));
                                            }} />
                                            <span className="input-group-text bg-success-subtle border-success-subtle">%</span>
                                        </div>
                                    </div>
                                    <div className="col-12 mt-3">
                                        <div className="progress rounded-pill shadow-sm" style={{ height: '12px' }}>
                                            <div className="progress-bar bg-info" style={{ width: `${formData.shopPercentage}%` }}></div>
                                            <div className="progress-bar bg-success" style={{ width: `${formData.officePercentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-5 pt-4 border-top border-light-subtle">
                    <div className="row g-4">
                        <div className="col-md-6">
                            <button onClick={handleSave} className="btn btn-primary btn-lg rounded-pill w-100 shadow px-4 py-3 fw-bold">
                                <FaSave className="me-3" />Save Loading Ratios
                            </button>
                        </div>
                        <div className="col-md-6">
                            <button onClick={handleSave} className="btn btn-outline-secondary btn-lg rounded-pill w-100 shadow-sm px-4 py-3 fw-bold">
                                <FaSyncAlt className="me-3" />Update Results
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AreaCalculationForm;
