import { useState, useEffect } from "react";


const AreaCalculationResult = ({ data, landResults, fsiProposalData, zoningType, location }) => {
    const [savedData, setSavedData] = useState(null);
    const theme = "light";


    const isPuneThane = location === "Pune" || location === "Thane";

    // Constants for Permissible side (derived from fsiProposalData or landResults)
    const pBasic = parseFloat(isPuneThane ? landResults.basicFSI : fsiProposalData?.Permissible_Basic_FSI) || 0;
    const pPremium = parseFloat(isPuneThane ? landResults.premium : fsiProposalData?.Permissible_Premium_FSI) || 0;
    const pTDR = parseFloat(isPuneThane ? landResults.tdr : fsiProposalData?.Permissible_TDR_FSI) || 0;
    const pOther = parseFloat(isPuneThane ? 0 : fsiProposalData?.Permissible_Other_FSI) || 0;
    const pMaxBuildingPotential = pBasic + pPremium + pTDR + pOther;

    const pAncResConst = parseFloat(isPuneThane ? 0.6 : fsiProposalData?.Permissible_Residential_Ancillary_Area_Constant) || 0;
    const pAncCommConst = parseFloat(isPuneThane ? 0.8 : fsiProposalData?.Permissible_Commercial_Ancillary_Area_Constant) || 0;

    useEffect(() => {
        const saved = localStorage.getItem("areaCalculationForm");
        if (saved) {
            setSavedData(JSON.parse(saved));
        }
    }, [data]);

    useEffect(() => {
        const handleAreaCalculationUpdate = () => {
            const saved = localStorage.getItem("areaCalculationForm");
            if (saved) {
                setSavedData(JSON.parse(saved));
            }
        };

        window.addEventListener("areaCalculationUpdated", handleAreaCalculationUpdate);
        return () => {
            window.removeEventListener("areaCalculationUpdated", handleAreaCalculationUpdate);
        };
    }, []);

    const formatNumber = (num) => {
        return new Intl.NumberFormat("en-IN", {
            maximumFractionDigits: 0,
        }).format(Math.round(num || 0));
    };

    if (!landResults) {
        return (
            <div className="area-results-panel h-100">
                <style>{`
                    .area-results-panel {
                        
                        border: 1px solid ${theme === "dark" ? "#353941" : "#e7ebf1"};
                        border-radius: 24px;
                        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                        overflow: hidden;
                    }

                    .area-results-header {
                        padding: 24px 26px 14px;
                        
                        border-bottom: 1px solid ${theme === "dark" ? "#353941" : "#edf1f6"};
                    }

                    .area-results-eyebrow {
                        color: ${theme === "dark" ? "#9ca3af" : "#8b95a5"};
                        font-size: 12px;
                        font-weight: 800;
                        letter-spacing: 0.12em;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }

                    .area-results-title {
                        color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                        font-size: 32px;
                        line-height: 1;
                        font-weight: 800;
                        margin: 0;
                    }

                    .area-results-body {
                        padding: 26px;
                        
                    }
                `}</style>
                <div className="area-results-header">
                    <div className="area-results-eyebrow">Selected Section</div>
                    <h2 className="area-results-title">Area Calculation Results</h2>
                </div>
                <div className="area-results-body text-center">
                    <p className="text-muted mb-0">No Land Details available.</p>
                </div>
            </div>
        );
    }

    const efficiency = parseFloat(savedData?.efficiencyRatio || 0.85);
    const resLoading = parseFloat(savedData?.resLoadingRatio || 1.35);
    const commercialTypesForSummary = Array.isArray(savedData?.commercialType)
        ? savedData.commercialType
        : savedData?.commercialType
            ? [savedData.commercialType]
            : ["Shop"];
    const shopLoadingForSummary = savedData?.shopLoading ? parseFloat(savedData.shopLoading) : 1.50;
    const officeLoadingForSummary = savedData?.officeLoading ? parseFloat(savedData.officeLoading) : 1.45;
    const shopPctForSummary = savedData?.shopPercentage ?? 50;
    const officePctForSummary = savedData?.officePercentage ?? 50;

    // Helpers to get Max AREAS (including ancillary)
    const getPermissibleTotalArea = () => {
        let ancillary = 0;
        let landDetails = {};
        if (typeof window !== 'undefined') {
            try {
                landDetails = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
            } catch (e) { }
        }
        const commSplit = (parseFloat(landDetails.commercialSplit) || 0) / 100;
        const resSplit = (parseFloat(landDetails.residentialSplit) || 0) / 100;

        if (zoningType === 'residential') {
            ancillary = pMaxBuildingPotential * pAncResConst;
        } else if (zoningType === 'commercial') {
            ancillary = pMaxBuildingPotential * pAncCommConst;
        } else if (zoningType === 'mixed') {
            const ancComm = pMaxBuildingPotential * commSplit * pAncCommConst;
            const ancResi = pMaxBuildingPotential * resSplit * pAncResConst;
            ancillary = ancComm + ancResi;
        }
        return pMaxBuildingPotential + ancillary;
    };

    const getProposedTotalArea = () => {
        if (!fsiProposalData) return 0;
        const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;

        // Calculate proposed ancillary
        let proposedAncillaryTotal = 0;
        let landDetails = {};
        if (typeof window !== 'undefined') {
            try {
                landDetails = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
            } catch (e) { }
        }
        const commSplit = (parseFloat(landDetails.commercialSplit) || 0) / 100;
        const resSplit = (parseFloat(landDetails.residentialSplit) || 0) / 100;

        if (zoningType === 'mixed') {
            const commAnc = proposedMaxBuilding * commSplit * (parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0);
            const resAnc = proposedMaxBuilding * resSplit * (parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0);
            proposedAncillaryTotal = commAnc + resAnc;
        } else if (zoningType === 'commercial') {
            proposedAncillaryTotal = proposedMaxBuilding * (parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0);
        } else if (zoningType === 'residential') {
            proposedAncillaryTotal = proposedMaxBuilding * (parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0);
        }

        return proposedMaxBuilding + proposedAncillaryTotal;
    };

    // Zoning Specific Area Calculations
    const calculateAreas = (totalArea, type) => {
        const efficiency = parseFloat(savedData?.efficiencyRatio || 0.85);
        const carpet = totalArea * efficiency;

        // Default loading values
        const defaultLoadings = {
            shop: 1.50,
            office: 1.45
        };

        // Get user input loadings or use defaults
        const loadings = {
            shop: savedData?.shopLoading ? parseFloat(savedData.shopLoading) : defaultLoadings.shop,
            office: savedData?.officeLoading ? parseFloat(savedData.officeLoading) : defaultLoadings.office
        };

        // Handle commercial areas
        if (type === 'commercial') {
            const commercialTypes = Array.isArray(savedData?.commercialType)
                ? savedData.commercialType
                : savedData?.commercialType
                    ? [savedData.commercialType]
                    : ["Shop"];

            // If only one type is selected
            if (commercialTypes.length === 1) {
                const loading = commercialTypes[0] === "Office"
                    ? loadings.office
                    : loadings.shop;
                return {
                    carpet,
                    saleable: carpet * loading
                };
            }

            // When both types are selected
            if (commercialTypes.length === 2) {
                const shopPct = (savedData?.shopPercentage ?? 50) / 100;
                const officePct = (savedData?.officePercentage ?? 50) / 100;

                // Calculate carpet areas
                const shopCarpet = carpet * shopPct;
                const officeCarpet = carpet * officePct;

                // Calculate saleable areas using user-defined loading factors
                const shopSaleable = shopCarpet * loadings.shop;
                const officeSaleable = officeCarpet * loadings.office;

                return {
                    carpet,
                    saleable: shopSaleable + officeSaleable,
                    _details: {
                        shop: {
                            carpet: shopCarpet,
                            loading: loadings.shop,
                            saleable: shopSaleable
                        },
                        office: {
                            carpet: officeCarpet,
                            loading: loadings.office,
                            saleable: officeSaleable
                        }
                    }
                };
            }
        }

        // Residential or other types
        const loading = parseFloat(savedData?.resLoadingRatio || 1.35);
        return {
            carpet,
            saleable: carpet * loading
        };
    };

    // Helper function to render commercial area rows with details
    const renderCommercialAreaRows = (pComm, prComm) => {
        const hasDetails = !!pComm._details;
        const commercialTypes = Array.isArray(savedData?.commercialType)
            ? savedData.commercialType
            : savedData?.commercialType ? [savedData.commercialType] : [];
        const hasBothTypes = commercialTypes.length === 2;

        return (
            <>
                <tr>
                    <td className="small fw-medium">Carpet Area Comm.</td>
                    <td className="small text-end">{formatNumber(pComm.carpet)}</td>
                    <td className="small text-end">{formatNumber(prComm.carpet)}</td>
                </tr>

                {hasDetails && hasBothTypes && (
                    <>
                        <tr className="bg-light">
                            <td className="small ps-4">- Shop Carpet Area ({Number(savedData?.shopPercentage ?? 50).toFixed(0)}%)</td>
                            <td className="small text-end">
                                {formatNumber(pComm._details.shop.carpet)}
                            </td>
                            <td className="small text-end">
                                {formatNumber(prComm._details.shop.carpet)}
                            </td>
                        </tr>
                        <tr className="bg-light">
                            <td className="small ps-4">- Office Carpet Area ({Number(savedData?.officePercentage ?? 50).toFixed(0)}%)</td>
                            <td className="small text-end">
                                {formatNumber(pComm._details.office.carpet)}
                            </td>
                            <td className="small text-end">
                                {formatNumber(prComm._details.office.carpet)}
                            </td>
                        </tr>
                    </>
                )}

                <tr>
                    <td className="small fw-medium">Saleable Area Comm.</td>
                    <td className="small text-end">{formatNumber(pComm.saleable)}</td>
                    <td className="small text-end">{formatNumber(prComm.saleable)}</td>
                </tr>

                {hasDetails && hasBothTypes && (
                    <>
                        <tr className="bg-light">
                            <td className="small ps-4">- Shop Saleable Area (×{pComm._details.shop.loading.toFixed(2)})</td>
                            <td className="small text-end">
                                {formatNumber(pComm._details.shop.saleable)}
                            </td>
                            <td className="small text-end">
                                {formatNumber(prComm._details.shop.saleable)}
                            </td>
                        </tr>
                        <tr className="bg-light">
                            <td className="small ps-4">- Office Saleable Area (×{pComm._details.office.loading.toFixed(2)})</td>
                            <td className="small text-end">
                                {formatNumber(pComm._details.office.saleable)}
                            </td>
                            <td className="small text-end">
                                {formatNumber(prComm._details.office.saleable)}
                            </td>
                        </tr>
                    </>
                )}
            </>
        );
    };

    const permissibleTotal = getPermissibleTotalArea();
    const proposedTotal = getProposedTotalArea();

    const commercialOnly = zoningType === 'commercial'
        ? {
            pComm: calculateAreas(permissibleTotal, 'commercial'),
            prComm: calculateAreas(proposedTotal, 'commercial')
        }
        : null;

    // Specific Mixed Calculations
    const getMixedCalculations = () => {
        let landDetails = {};
        if (typeof window !== 'undefined') {
            try {
                landDetails = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
            } catch (e) { }
        }
        const commSplit = (parseFloat(landDetails.commercialSplit) || 0) / 100;
        const resSplit = (parseFloat(landDetails.residentialSplit) || 0) / 100;

        // Permissible
        const pCommMax = (pMaxBuildingPotential * commSplit) + (pMaxBuildingPotential * commSplit * pAncCommConst);
        const pResMax = (pMaxBuildingPotential * resSplit) + (pMaxBuildingPotential * resSplit * pAncResConst);

        // Proposed
        const propMaxBuilding = parseFloat(fsiProposalData?.Proposed_Max_Building_Potential) || 0;
        const prCommAnc = propMaxBuilding * commSplit * (parseFloat(fsiProposalData?.Proposed_Commercial_Ancillary_Area_Constant) || 0);
        const prResAnc = propMaxBuilding * resSplit * (parseFloat(fsiProposalData?.Proposed_Residential_Ancillary_Area_Constant) || 0);

        const prCommMax = (propMaxBuilding * commSplit) + prCommAnc;
        const prResMax = (propMaxBuilding * resSplit) + prResAnc;

        return {
            pComm: calculateAreas(pCommMax, 'commercial'),
            pRes: calculateAreas(pResMax, 'residential'),
            prComm: calculateAreas(prCommMax, 'commercial'),
            prRes: calculateAreas(prResMax, 'residential')
        };
    };

    const mixed = zoningType === 'mixed' ? getMixedCalculations() : null;

    return (
        <div className={`area-results-panel h-100 theme-${theme}`}>
            <div className="area-results-header">
                <div className="area-results-eyebrow">Selected Section</div>
                <h2 className="area-results-title">Area Calculation Results</h2>
            </div>
            <div className="area-results-body">
                <div className="area-results-table-wrap table-responsive">
                    <table className="table table-sm table-bordered table-striped mb-0 area-results-table">
                        <thead>
                            <tr>
                                <th className="small fw-semibold">Particulars (Sq Ft)</th>
                                <th className="small fw-semibold text-end">Permissible</th>
                                <th className="small fw-semibold text-end">Proposed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zoningType === 'mixed' ? (
                                <>
                                    {renderCommercialAreaRows(mixed.pComm, mixed.prComm)}
                                    <tr>
                                        <td className="small fw-medium">Carpet Area Res.</td>
                                        <td className="small text-end">{formatNumber(mixed.pRes.carpet)}</td>
                                        <td className="small text-end">{formatNumber(mixed.prRes.carpet)}</td>
                                    </tr>
                                    <tr>
                                        <td className="small fw-medium">Saleable Area Res.</td>
                                        <td className="small text-end">{formatNumber(mixed.pRes.saleable)}</td>
                                        <td className="small text-end">{formatNumber(mixed.prRes.saleable)}</td>
                                    </tr>
                                    <tr className="table-primary">  {/* Will be overridden by theme styles */}
                                        <td className="small fw-bold">Total Saleable Area</td>
                                        <td className="small fw-bold text-end">{formatNumber(mixed.pComm.saleable + mixed.pRes.saleable)}</td>
                                        <td className="small fw-bold text-end">{formatNumber(mixed.prComm.saleable + mixed.prRes.saleable)}</td>
                                    </tr>
                                </>
                            ) : (
                                <>
                                    {zoningType === 'commercial' ? (
                                        <>
                                            {renderCommercialAreaRows(commercialOnly.pComm, commercialOnly.prComm)}
                                        </>
                                    ) : (
                                        <>
                                            <tr>
                                                <td className="small fw-medium">Carpet Area</td>
                                                <td className="small text-end">{formatNumber(permissibleTotal * efficiency)}</td>
                                                <td className="small text-end">{formatNumber(proposedTotal * efficiency)}</td>
                                            </tr>
                                            <tr className="table-primary">
                                                <td className="small fw-bold">Saleable Area</td>
                                                <td className="small fw-bold text-end">
                                                    {formatNumber(permissibleTotal * efficiency * resLoading)}
                                                </td>
                                                <td className="small fw-bold text-end">
                                                    {formatNumber(proposedTotal * efficiency * resLoading)}
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="area-results-note mt-4 small text-muted">
                    <p className="mb-1">* Efficiency used: {efficiency.toFixed(2)}</p>
                    {zoningType !== 'commercial' && <p className="mb-1">* Residential Loading: {resLoading.toFixed(2)}</p>}
                    {(zoningType === 'commercial' || zoningType === 'mixed') ? (
                        <>
                            {commercialTypesForSummary.includes('Shop') && (
                                <p className="mb-1">* Shop Loading: {shopLoadingForSummary.toFixed(2)}</p>
                            )}
                            {commercialTypesForSummary.includes('Office') && (
                                <p className="mb-1">* Office Loading: {officeLoadingForSummary.toFixed(2)}</p>
                            )}
                            {commercialTypesForSummary.includes('Shop') && commercialTypesForSummary.includes('Office') && (
                                <p className="mb-0">* Commercial Split: Shop {Number(shopPctForSummary).toFixed(0)}% / Office {Number(officePctForSummary).toFixed(0)}%</p>
                            )}
                        </>
                    ) : (
                        zoningType !== 'residential' && <p className="mb-0">* Commercial Loading: {shopLoadingForSummary.toFixed(2)}</p>
                    )}
                </div>
            </div>

            {/* Dark theme overrides for this component */}
            <style>{`
                .area-results-panel {
                    
                    border: 1px solid ${theme === "dark" ? "#353941" : "#e7ebf1"};
                    border-radius: 24px;
                    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                }

                .area-results-header {
                    padding: 24px 26px 14px;
                    
                    border-bottom: 1px solid ${theme === "dark" ? "#353941" : "#edf1f6"};
                }

                .area-results-eyebrow {
                    color: ${theme === "dark" ? "#9ca3af" : "#8b95a5"};
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .area-results-title {
                    color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                    font-size: 32px;
                    line-height: 1;
                    font-weight: 800;
                    margin: 0;
                }

                .area-results-body {
                    padding: 26px;
                    
                }

                .area-results-table-wrap {
                    border: 1px solid ${theme === "dark" ? "#383e49" : "#e5eaf2"};
                    border-radius: 18px;
                    overflow: hidden;
                    background: ${theme === "dark" ? "#262a31" : "#fbfcff"};
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
                }

                .area-results-table {
                    margin-bottom: 0;
                }

                .area-results-table thead th {
                    background: ${theme === "dark" ? "#2f3540" : "#f4f7fb"} !important;
                    color: ${theme === "dark" ? "#eef2f7" : "#3f4a5a"} !important;
                    border-color: ${theme === "dark" ? "#434956" : "#e2e8f0"} !important;
                    font-size: 12px;
                    font-weight: 800 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                .area-results-table tbody td {
                    background: ${theme === "dark" ? "#262a31" : "#ffffff"};
                    color: ${theme === "dark" ? "#eef2f7" : "#273242"};
                    border-color: ${theme === "dark" ? "#434956" : "#e2e8f0"} !important;
                    vertical-align: middle;
                }

                .area-results-table tbody tr:nth-of-type(odd) td {
                    background: ${theme === "dark" ? "#242830" : "#fbfcff"};
                }

                .area-results-table tbody tr.bg-light td {
                    background: ${theme === "dark" ? "#2f3540" : "#f4f7fb"} !important;
                }

                .area-results-table tbody tr.table-primary td {
                    background: ${theme === "dark" ? "#243a47" : "#eaf5f1"} !important;
                    color: ${theme === "dark" ? "#f8fafc" : "#0f172a"} !important;
                    font-weight: 800;
                }

                .area-results-note {
                    border: 1px dashed ${theme === "dark" ? "#3b4453" : "#d6dee8"};
                    border-radius: 16px;
                    background: ${theme === "dark" ? "#191e26" : "#fbfdff"};
                    color: ${theme === "dark" ? "#b8c0cc" : "#687384"} !important;
                    padding: 14px 16px;
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .area-results-header,
                    .area-results-body {
                        padding-left: 20px;
                        padding-right: 20px;
                    }

                    .area-results-title {
                        font-size: 28px;
                    }
                }

                .theme-dark .table-primary {
                    --bs-table-bg: #212529 !important;
                    --bs-table-color: #fff !important;
                }
                .theme-dark .bg-light {
                    background-color: #2c2e31 !important;
                    color: #e4e6ef !important;
                }
                .theme-dark .table {
                    --bs-table-striped-bg: #2c2e31;
                    --bs-table-bg: #1e1e2f;
                    color: #dddfe7;
                }
                .theme-dark .table-bordered {
                    border-color: #c3cbd4;
                }
                .theme-dark .table thead th {
                    background-color: #2c2e31;
                    color: #e4e6ef;
                }
                .theme-dark .card-header {
                    background-color: #2c2e31 !important;
                    border-bottom-color: #cbd3dd;
                }
                .theme-dark .card-body {
                    background-color: #0a0a0a;
                }
                .theme-dark .text-muted {
                    color: #dde0ec !important;
                }
                .theme-dark .small {
                    color: #e4e6ef;
                }
            `}</style>
        </div>
    );
};

export default AreaCalculationResult;
