import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCube,
  FaPlus,
  FaTrash,
  FaSlidersH,
  FaInfoCircle,
  FaSave,
  FaSyncAlt,
} from "react-icons/fa";
import { useGlobalState } from "@/components/GlobalContext";

const UnitDesignStructure = ({ onSave, calculationMode, setCalculationMode }) => {
    // const [calculationMode, setCalculationMode] = useState('carpet'); // Lifted to parent
    const [developmentCategory, setDevelopmentCategory] = useState('residential');
    const [residentialData, setResidentialData] = useState({
        totalCarpet: 0,
        variations: [{ bhkType: '1 BHK', area: 0, splitPct: 0 }],
        factorCar: 1.0,
        visitorPct: 5.0
    });
    const [commercialData, setCommercialData] = useState({
        totalCarpet: 0,
        variations: [{ unitType: 'Shop', area: 0, splitPct: 0 }],
        factorCar: 1.0,
        visitorPct: 5.0
    });
    const [gstate] = useGlobalState();
    const theme = gstate?.theme || "light"

    const MAX_VARIATIONS = 10;

    const getProposedCarpetAreas = useCallback(() => {
        const areaForm = JSON.parse(localStorage.getItem("areaCalculationForm") || "{}");
        const fsi = JSON.parse(localStorage.getItem("fsiProposalData") || "{}");
        const landDetails = JSON.parse(localStorage.getItem("landDetailsForm") || "{}");

        const efficiency = parseFloat(areaForm?.efficiencyRatio || 0.85);
        const proposedMaxBuilding = parseFloat(fsi?.Proposed_Max_Building_Potential) || 0;

        const commAncConst = parseFloat(fsi?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
        const resAncConst = parseFloat(fsi?.Proposed_Residential_Ancillary_Area_Constant) || 0;

        const commSplit = (parseFloat(landDetails?.commercialSplit) || 0) / 100;
        const resSplit = (parseFloat(landDetails?.residentialSplit) || 0) / 100;

        const zoning = (localStorage.getItem("zoningType") || "residential").toLowerCase();

        if (zoning === "mixed") {
            const prCommAnc = proposedMaxBuilding * commSplit * commAncConst;
            const prResAnc = proposedMaxBuilding * resSplit * resAncConst;
            const prCommMax = (proposedMaxBuilding * commSplit) + prCommAnc;
            const prResMax = (proposedMaxBuilding * resSplit) + prResAnc;
            return {
                residential: prResMax * efficiency,
                commercial: prCommMax * efficiency,
            };
        }

        if (zoning === "commercial") {
            const proposedTotal = proposedMaxBuilding + (proposedMaxBuilding * commAncConst);
            return {
                residential: 0,
                commercial: proposedTotal * efficiency,
            };
        }

        const proposedTotal = proposedMaxBuilding + (proposedMaxBuilding * resAncConst);
        return {
            residential: proposedTotal * efficiency,
            commercial: 0,
        };
    }, []);

    const getProposedSaleableAreas = useCallback(() => {
        const areaForm = JSON.parse(localStorage.getItem("areaCalculationForm") || "{}");
        const carpetAreas = getProposedCarpetAreas();

        const resLoading = parseFloat(areaForm?.resLoadingRatio || 1.35);
        const commercialTypes = Array.isArray(areaForm?.commercialType)
            ? areaForm.commercialType
            : areaForm?.commercialType ? [areaForm.commercialType] : ["Shop"];

        const shopLoading = parseFloat(areaForm?.shopLoading || 1.50);
        const officeLoading = parseFloat(areaForm?.officeLoading || 1.45);

        let commercialSaleable = 0;
        if (commercialTypes.length === 1) {
            const loading = commercialTypes[0] === "Office" ? officeLoading : shopLoading;
            commercialSaleable = carpetAreas.commercial * loading;
        } else if (commercialTypes.length === 2) {
            const shopPct = (areaForm?.shopPercentage ?? 50) / 100;
            const officePct = (areaForm?.officePercentage ?? 50) / 100;
            const shopCarpet = carpetAreas.commercial * shopPct;
            const officeCarpet = carpetAreas.commercial * officePct;
            commercialSaleable = (shopCarpet * shopLoading) + (officeCarpet * officeLoading);
        }

        return {
            residential: carpetAreas.residential * resLoading,
            commercial: commercialSaleable,
        };
    }, [getProposedCarpetAreas]);

    const applyAutoTotalCarpet = useCallback((zoningTypeValue) => {
        const zoning = (zoningTypeValue || "residential").toLowerCase();

        // Get areas based on calculation mode
        const areas = calculationMode === 'carpet' ? getProposedCarpetAreas() : getProposedSaleableAreas();
        const { residential, commercial } = areas;

        if (zoning === "mixed") {
            setResidentialData((prev) => ({ ...prev, totalCarpet: residential }));
            setCommercialData((prev) => ({ ...prev, totalCarpet: commercial }));
            return;
        }

        if (zoning === "commercial") {
            setCommercialData((prev) => ({ ...prev, totalCarpet: commercial }));
            return;
        }

        setResidentialData((prev) => ({ ...prev, totalCarpet: residential }));
        setResidentialData((prev) => ({ ...prev, totalCarpet: residential }));
    }, [calculationMode, getProposedCarpetAreas, getProposedSaleableAreas]);

    // Effect to trigger calculation when mode changes (from parent or self)
    useEffect(() => {
        const savedZoningType = localStorage.getItem("zoningType") || 'residential';
        applyAutoTotalCarpet(savedZoningType);
    }, [calculationMode, applyAutoTotalCarpet]);

    // Load initial data from localStorage (Run Once)
    useEffect(() => {
        const savedZoningType = localStorage.getItem("zoningType") || 'residential';
        const saved = localStorage.getItem("unitDesignStructure");

        setDevelopmentCategory(savedZoningType);

        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.calculationMode) {
                setCalculationMode(parsed.calculationMode);
            }
            if (parsed.residentialData) {
                const totalCarpet = parseFloat(parsed?.residentialData?.totalCarpet) || 0;
                if (!parsed.residentialData.variations || !Array.isArray(parsed.residentialData.variations)) {
                    parsed.residentialData.variations = [{ bhkType: '1 BHK', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }];
                } else {
                    parsed.residentialData.variations = parsed.residentialData.variations.map((v) => {
                        const area = parseFloat(v?.area) || 0;
                        const storedSplitPct = parseFloat(v?.splitPct);
                        const count = parseFloat(v?.count) || 0;
                        const derivedSplitPct = totalCarpet > 0 ? ((area * count) / totalCarpet) * 100 : 0;
                        const rawBhkType = v?.bhkType || '1 BHK';
                        const normalizedBhkType = (rawBhkType === '4 BHK' || rawBhkType === '5 BHK') ? '>3 BHK' : rawBhkType;
                        const resolvedSplitPct = Number.isFinite(storedSplitPct) ? storedSplitPct : derivedSplitPct;
                        const areaAllotted = totalCarpet * ((parseFloat(resolvedSplitPct) || 0) / 100);
                        const units = area > 0 ? areaAllotted / area : 0;
                        const roundedUnits = units > 0 ? Math.round(units) : 0;
                        const adjustedUnitArea = roundedUnits > 0 ? areaAllotted / roundedUnits : 0;
                        const adjustedUnits = adjustedUnitArea > 0 ? areaAllotted / adjustedUnitArea : 0;
                        return {
                            bhkType: normalizedBhkType,
                            area,
                            splitPct: resolvedSplitPct,
                            areaAllotted: Number.isFinite(areaAllotted) ? Number(areaAllotted.toFixed(2)) : 0,
                            noOfUnits: Number.isFinite(units) ? Number(units.toFixed(2)) : 0,
                            adjustedUnitArea: Number.isFinite(adjustedUnitArea) ? Number(adjustedUnitArea.toFixed(2)) : 0,
                            adjustedUnits: Number.isFinite(adjustedUnits) ? Math.round(adjustedUnits) : 0,
                        };
                    });
                }
                setResidentialData(parsed.residentialData);
            }
            if (parsed.commercialData) {
                const totalCarpet = parseFloat(parsed?.commercialData?.totalCarpet) || 0;

                if (!parsed.commercialData.variations || !Array.isArray(parsed.commercialData.variations)) {
                    parsed.commercialData.variations = [{ unitType: 'Shop', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }];
                } else {
                    parsed.commercialData.variations = parsed.commercialData.variations.map((v) => {
                        const area = parseFloat(v?.area) || 0;
                        const storedSplitPct = parseFloat(v?.splitPct);
                        const count = parseFloat(v?.count) || 0;
                        const derivedSplitPct = totalCarpet > 0 ? ((area * count) / totalCarpet) * 100 : 0;
                        const resolvedSplitPct = Number.isFinite(storedSplitPct) ? storedSplitPct : derivedSplitPct;
                        const areaAllotted = totalCarpet * ((parseFloat(resolvedSplitPct) || 0) / 100);
                        const units = area > 0 ? areaAllotted / area : 0;
                        const roundedUnits = units > 0 ? Math.round(units) : 0;
                        const adjustedUnitArea = roundedUnits > 0 ? areaAllotted / roundedUnits : 0;
                        const adjustedUnits = adjustedUnitArea > 0 ? areaAllotted / adjustedUnitArea : 0;
                        return {
                            unitType: v?.unitType || 'Shop',
                            area,
                            splitPct: resolvedSplitPct,
                            areaAllotted: Number.isFinite(areaAllotted) ? Number(areaAllotted.toFixed(2)) : 0,
                            noOfUnits: Number.isFinite(units) ? Number(units.toFixed(2)) : 0,
                            adjustedUnitArea: Number.isFinite(adjustedUnitArea) ? Number(adjustedUnitArea.toFixed(2)) : 0,
                            adjustedUnits: Number.isFinite(adjustedUnits) ? Math.round(adjustedUnits) : 0,
                        };
                    });
                }
                setCommercialData(parsed.commercialData);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for updates from other components
    useEffect(() => {
        const savedZoningType = localStorage.getItem("zoningType") || 'residential';
        applyAutoTotalCarpet(savedZoningType);

        const handleLandDetailsUpdate = () => {
            const updatedZoningType = localStorage.getItem("zoningType") || 'residential';
            setDevelopmentCategory(updatedZoningType);
            applyAutoTotalCarpet(updatedZoningType);
        };

        const handleAreaCalculationUpdate = () => {
            const updatedZoningType = localStorage.getItem("zoningType") || 'residential';
            applyAutoTotalCarpet(updatedZoningType);
        };

        const handleFsiProposalUpdate = () => {
            const updatedZoningType = localStorage.getItem("zoningType") || 'residential';
            applyAutoTotalCarpet(updatedZoningType);
        };

        window.addEventListener('landDetailsUpdated', handleLandDetailsUpdate);
        window.addEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
        window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);

        return () => {
            window.removeEventListener('landDetailsUpdated', handleLandDetailsUpdate);
            window.removeEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
            window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
        };
    }, [applyAutoTotalCarpet]);

    // Handle variation changes for residential or commercial
    const handleVariationChange = (type, index, field, value) => {
        if (type === 'residential') {
            const newVariations = [...residentialData.variations];
            newVariations[index][field] = field === 'bhkType' ? value : (parseFloat(value) || 0);
            setResidentialData(prev => ({ ...prev, variations: newVariations }));
        } else {
            const newVariations = [...commercialData.variations];
            newVariations[index][field] = field === 'unitType' ? value : (parseFloat(value) || 0);
            setCommercialData(prev => ({ ...prev, variations: newVariations }));
        }
    };

    // Add new variation for residential or commercial
    const addVariation = (type) => {
        if (type === 'residential' && residentialData.variations.length < MAX_VARIATIONS) {
            setResidentialData(prev => ({
                ...prev,
                variations: [...prev.variations, { bhkType: '1 BHK', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }]
            }));
        } else if (type === 'commercial' && commercialData.variations.length < MAX_VARIATIONS) {
            setCommercialData(prev => ({
                ...prev,
                variations: [...prev.variations, { unitType: 'Shop', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }]
            }));
        }
    };

    // Remove variation for residential or commercial
    const removeVariation = (type, index) => {
        if (type === 'residential' && residentialData.variations.length > 1) {
            const newVariations = [...residentialData.variations];
            newVariations.splice(index, 1);
            setResidentialData(prev => ({ ...prev, variations: newVariations }));
        } else if (type === 'commercial' && commercialData.variations.length > 1) {
            const newVariations = [...commercialData.variations];
            newVariations.splice(index, 1);
            setCommercialData(prev => ({ ...prev, variations: newVariations }));
        }
    };

    const handleInputChange = (type, field, value) => {
        if (type === 'residential') {
            setResidentialData(prev => ({ ...prev, [field]: value }));
        } else {
            setCommercialData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSave = () => {
        const savedZoningType = (localStorage.getItem("zoningType") || 'residential').toLowerCase();

        const withAreaAllotted = (data) => {
            const totalCarpet = parseFloat(data?.totalCarpet) || 0;
            const variations = (data?.variations || []).map((v) => {
                const area = parseFloat(v?.area) || 0;
                const pct = parseFloat(v?.splitPct) || 0;
                const areaAllotted = totalCarpet * (pct / 100);
                const units = area > 0 ? areaAllotted / area : 0;

                const roundedUnits = units > 0 ? Math.round(units) : 0;
                const adjustedUnitArea = roundedUnits > 0 ? areaAllotted / roundedUnits : 0;
                const adjustedUnits = adjustedUnitArea > 0 ? areaAllotted / adjustedUnitArea : 0;
                return {
                    ...v,
                    areaAllotted: Number.isFinite(areaAllotted) ? Number(areaAllotted.toFixed(2)) : 0,
                    noOfUnits: Number.isFinite(units) ? Number(units.toFixed(2)) : 0,
                    adjustedUnitArea: Number.isFinite(adjustedUnitArea) ? Number(adjustedUnitArea.toFixed(2)) : 0,
                    adjustedUnits: Number.isFinite(adjustedUnits) ? Math.round(adjustedUnits) : 0,
                };
            });
            return { ...data, variations };
        };

        let dataToSave;
        if (savedZoningType === 'residential') {
            dataToSave = {
                developmentCategory: 'residential',
                calculationMode: calculationMode,
                residentialData: withAreaAllotted(residentialData),
            };
        } else if (savedZoningType === 'commercial') {
            dataToSave = {
                developmentCategory: 'commercial',
                calculationMode: calculationMode,
                commercialData: withAreaAllotted(commercialData),
            };
        } else {
            dataToSave = {
                developmentCategory: 'mixed',
                calculationMode: calculationMode,
                residentialData: withAreaAllotted(residentialData),
                commercialData: withAreaAllotted(commercialData),
            };
        }

        localStorage.setItem("unitDesignStructure", JSON.stringify(dataToSave));
        if (onSave) onSave(dataToSave);

        // Optional: dispatch event
        window.dispatchEvent(new Event('unitDesignUpdated'));
    };

    const calculateTotals = useCallback((type) => {
        const data = type === 'residential' ? residentialData : commercialData;
        const totalCarpet = parseFloat(data.totalCarpet) || 0;
        const totalAllotted = data.variations.reduce((sum, v) => {
            const pct = parseFloat(v?.splitPct) || 0;
            return sum + (totalCarpet * (pct / 100));
        }, 0);
        const remaining = totalCarpet - totalAllotted;
        return { totalAllotted, remaining };
    }, [residentialData, commercialData]);

    const handleAdjustArea = (type) => {
        if (type === 'residential') {
            setResidentialData((prev) => {
                const variations = prev?.variations || [];
                if (variations.length === 0) return prev;

                const lastIndex = variations.length - 1;
                const last = variations[lastIndex] || {};
                const sumPctExcludingLast = variations.reduce((sum, v, idx) => {
                    if (idx === lastIndex) return sum;
                    return sum + (parseFloat(v?.splitPct) || 0);
                }, 0);

                const newSplitPct = 100 - sumPctExcludingLast;
                const newVariations = [...variations];
                newVariations[lastIndex] = { ...last, splitPct: Number.isFinite(newSplitPct) ? Number(newSplitPct.toFixed(2)) : 0 };

                return { ...prev, variations: newVariations };
            });
            return;
        }

        if (type === 'commercial') {
            setCommercialData((prev) => {
                const variations = prev?.variations || [];
                if (variations.length === 0) return prev;

                const lastIndex = variations.length - 1;
                const last = variations[lastIndex] || {};
                const sumPctExcludingLast = variations.reduce((sum, v, idx) => {
                    if (idx === lastIndex) return sum;
                    return sum + (parseFloat(v?.splitPct) || 0);
                }, 0);

                const newSplitPct = 100 - sumPctExcludingLast;
                const newVariations = [...variations];
                newVariations[lastIndex] = { ...last, splitPct: Number.isFinite(newSplitPct) ? Number(newSplitPct.toFixed(2)) : 0 };

                return { ...prev, variations: newVariations };
            });
        }
    };

    // Render unit design section for residential or commercial
    const renderUnitDesignSection = (type) => {
        const data = type === 'residential' ? residentialData : commercialData;
        const totals = type === 'residential' ? residentialTotals : commercialTotals;
        const title = type === 'residential' ? 'Residential Units Design' : 'Commercial Units Design';

        return (
            <div className="unit-design-section mb-4">
                <h5 className="unit-design-section-title fw-bold mb-3">{title}</h5>
                <div className="unit-design-field-card mb-4">
                    <label htmlFor={`${type}TotalCarpet`} className="form-label fw-semibold small text-uppercase">
                        Total {calculationMode === 'carpet' ? 'carpet' : 'saleable'} area for {type} (sqft)
                    </label>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        id={`${type}TotalCarpet`}
                        value={data.totalCarpet}
                        onChange={(e) => handleInputChange(type, 'totalCarpet', parseFloat(e.target.value) || 0)}
                        readOnly
                        min="0"
                        step="10"
                    />
                    <small className="text-muted">Auto-filled from Area Calculation Results (Proposed {calculationMode === 'carpet' ? 'Carpet' : 'Saleable'} Area)</small>
                </div>

                <h6 className="mt-4 fw-bold text-dark small text-uppercase">
                    {type === 'residential' ? 'Residential' : 'Commercial'} unit variations
                </h6>

                <div className="d-flex justify-content-start mb-3">
                    <button
                        className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm"
                        onClick={() => addVariation(type)}
                        disabled={data.variations.length >= MAX_VARIATIONS}
                    >
                        <FaPlus className="me-1" />
                        Add {type} variation
                    </button>
                </div>

                {/* Table Format for Variations */}
                <div className="unit-design-table-wrap table-responsive">
                    <table className="table table-sm table-bordered table-hover align-middle unit-design-table">
                        <thead>
                            <tr>
                                {type === 'residential' ? (
                                    <>
                                        <th className="small fw-semibold">BHK Type</th>
                                        <th className="small fw-semibold">Area Per Unit (sqft)</th>
                                        <th className="small fw-semibold">% Split</th>
                                        <th className="small fw-semibold">Area Allotted (sqft)</th>
                                        <th className="small fw-semibold text-center" style={{ width: '80px' }}>Action</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="small fw-semibold">Unit Type</th>
                                        <th className="small fw-semibold">Area Per Unit (sqft)</th>
                                        <th className="small fw-semibold">% Split</th>
                                        <th className="small fw-semibold">Area Allotted (sqft)</th>
                                        <th className="small fw-semibold text-center" style={{ width: '80px' }}>Action</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {data.variations.map((variation, index) => (
                                <tr key={`${type}-${index}`}>
                                    {type === 'residential' ? (
                                        <>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={variation.bhkType || '1 BHK'}
                                                    onChange={(e) => handleVariationChange(type, index, 'bhkType', e.target.value)}
                                                >
                                                    <option value="1 BHK">1 BHK</option>
                                                    <option value="2 BHK">2 BHK</option>
                                                    <option value="3 BHK">3 BHK</option>
                                                    <option value=">3 BHK">&gt;3 BHK</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={variation.area}
                                                    onChange={(e) => handleVariationChange(type, index, 'area', e.target.value)}
                                                    min="0"
                                                    step="1"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={variation.splitPct}
                                                    onChange={(e) => handleVariationChange(type, index, 'splitPct', e.target.value)}
                                                    step="0.01"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm bg-light"
                                                    value={((parseFloat(data.totalCarpet) || 0) * ((parseFloat(variation.splitPct) || 0) / 100)).toFixed(2)}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="text-center">
                                                {data.variations.length > 1 && (
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => removeVariation(type, index)}
                                                        title={`Remove ${type} variation`}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={variation.unitType || 'Shop'}
                                                    onChange={(e) => handleVariationChange(type, index, 'unitType', e.target.value)}
                                                >
                                                    <option value="Shop">Shop</option>
                                                    <option value="Office">Office</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={variation.area}
                                                    onChange={(e) => handleVariationChange(type, index, 'area', e.target.value)}
                                                    min="0"
                                                    step="1"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={variation.splitPct}
                                                    onChange={(e) => handleVariationChange(type, index, 'splitPct', e.target.value)}
                                                    step="0.01"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm bg-light"
                                                    value={((parseFloat(data.totalCarpet) || 0) * ((parseFloat(variation.splitPct) || 0) / 100)).toFixed(2)}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="text-center">
                                                {data.variations.length > 1 && (
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => removeVariation(type, index)}
                                                        title={`Remove ${type} variation`}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-start mb-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm rounded-pill px-3"
                        onClick={() => handleAdjustArea(type)}
                        disabled={!data.variations?.length}
                    >
                        <FaSlidersH className="me-1" />
                        Adjust Area
                    </button>
                </div>

                <div className="unit-design-summary row mt-3">
                    <div className="col-md-6">
                        <div className="d-flex justify-content-between mb-1">
                            <span className="small text-muted">Total allotted area:</span>
                            <span className="fw-medium">{totals.totalAllotted.toFixed(2)} sqft</span>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span className="small text-muted">Remaining area:</span>
                            <span className={totals.remaining < 0 ? 'text-danger fw-bold' : 'fw-medium'}>
                                {totals.remaining.toFixed(2)} sqft
                            </span>
                        </div>
                    </div>
                </div>

                <div className="row mt-4 g-3">
                    <div className="col-md-6">
                        <div className="unit-design-field-card h-100">
                            <label className="form-label fw-semibold small text-uppercase">
                                {type === 'residential' ? 'Residential' : 'Commercial'} car parking factor
                            </label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={data.factorCar}
                                onChange={(e) => handleInputChange(type, 'factorCar', parseFloat(e.target.value) || 1.0)}
                                step="0.1"
                                min="0.1"
                            />
                            <small className="text-muted">Multiplier for {type} car parking requirements</small>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="unit-design-field-card h-100">
                            <label className="form-label fw-semibold small text-uppercase">
                                {type === 'residential' ? 'Residential' : 'Commercial'} visitor parking (%)
                            </label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                value={data.visitorPct}
                                onChange={(e) => handleInputChange(type, 'visitorPct', parseFloat(e.target.value) || 0)}
                                step="0.1"
                                min="0"
                                max="100"
                            />
                            <small className="text-muted">Percentage for {type} visitor parking</small>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const residentialTotals = calculateTotals('residential');
    const commercialTotals = calculateTotals('commercial');

    return (
        <div className="unit-design-panel mt-4 h-100 w-100">
            <style>{`
                .unit-design-panel {
                    background: ${theme === "dark" ? "#202226" : "#ffffff"};
                    border: 1px solid ${theme === "dark" ? "#353941" : "#e7ebf1"};
                    border-radius: 24px;
                    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                }

                .unit-design-header {
                    padding: 24px 26px 14px;
                    background: ${theme === "dark" ? "#202226" : "#ffffff"};
                    border-bottom: 1px solid ${theme === "dark" ? "#353941" : "#edf1f6"};
                }

                .unit-design-eyebrow {
                    color: ${theme === "dark" ? "#9ca3af" : "#8b95a5"};
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .unit-design-title {
                    color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                    font-size: 32px;
                    line-height: 1;
                    font-weight: 800;
                    margin: 0;
                }

                .unit-design-body {
                    padding: 26px;
                    background: ${theme === "dark" ? "#202226" : "#ffffff"};
                }

                .unit-design-control-card,
                .unit-design-section,
                .unit-design-field-card,
                .unit-design-summary {
                    border: 1px solid ${theme === "dark" ? "#383e49" : "#e5eaf2"};
                    background: ${theme === "dark" ? "#262a31" : "#fbfcff"};
                    border-radius: 18px;
                    padding: 16px;
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
                }

                .unit-design-section-title {
                    color: ${theme === "dark" ? "#f8fafc" : "#111827"} !important;
                }

                .unit-design-panel .form-label,
                .unit-design-panel h6 {
                    color: ${theme === "dark" ? "#eef2f7" : "#3f4a5a"} !important;
                    font-size: 13px;
                    font-weight: 800 !important;
                    letter-spacing: 0 !important;
                    text-transform: none !important;
                    margin-bottom: 8px;
                }

                .unit-design-panel .form-control,
                .unit-design-panel .form-select {
                    min-height: 41px;
                    border-radius: 12px;
                    border: 1px solid ${theme === "dark" ? "#434956" : "#dfe5ee"};
                    background: ${theme === "dark" ? "#1f232a" : "#ffffff"};
                    color: ${theme === "dark" ? "#f8fafc" : "#111827"};
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
                }

                .unit-design-panel .form-control[readonly] {
                    background: ${theme === "dark" ? "#20242b" : "#f4f7fb"};
                    color: ${theme === "dark" ? "#d8dee8" : "#334155"};
                }

                .unit-design-panel .btn {
                    min-height: 40px;
                    font-weight: 800;
                    border-radius: 999px;
                }

                .unit-design-table-wrap {
                    border: 1px solid ${theme === "dark" ? "#383e49" : "#e5eaf2"};
                    border-radius: 16px;
                    overflow: hidden;
                    background: ${theme === "dark" ? "#262a31" : "#ffffff"};
                    margin-bottom: 14px;
                }

                .unit-design-table {
                    margin-bottom: 0;
                }

                .unit-design-table thead th {
                    background: ${theme === "dark" ? "#2f3540" : "#f4f7fb"} !important;
                    color: ${theme === "dark" ? "#eef2f7" : "#3f4a5a"} !important;
                    border-color: ${theme === "dark" ? "#434956" : "#e2e8f0"} !important;
                    font-size: 12px;
                    font-weight: 800 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                .unit-design-table tbody td {
                    background: ${theme === "dark" ? "#262a31" : "#ffffff"};
                    color: ${theme === "dark" ? "#eef2f7" : "#273242"};
                    border-color: ${theme === "dark" ? "#434956" : "#e2e8f0"} !important;
                    vertical-align: middle;
                }

                .unit-design-table tbody tr:hover td {
                    background: ${theme === "dark" ? "#2a3038" : "#f8fafc"};
                }

                .unit-design-panel .btn-group {
                    gap: 8px;
                    padding: 6px;
                    border-radius: 999px;
                    background: ${theme === "dark" ? "#222834" : "#eef3f8"};
                    border: 1px solid ${theme === "dark" ? "#2f3642" : "#dbe3ee"};
                }

                .unit-design-panel .btn-group .btn {
                    border-radius: 999px !important;
                    border: 0;
                    box-shadow: none !important;
                }

                .unit-design-panel .text-muted {
                    color: ${theme === "dark" ? "#b8c0cc" : "#687384"} !important;
                    font-weight: 600;
                }

                .unit-design-actions {
                    border-top: 1px solid ${theme === "dark" ? "#353941" : "#edf1f6"};
                }

                @media (max-width: 768px) {
                    .unit-design-header,
                    .unit-design-body {
                        padding-left: 20px;
                        padding-right: 20px;
                    }

                    .unit-design-title {
                        font-size: 28px;
                    }

                    .unit-design-panel .btn-group {
                        border-radius: 18px;
                        flex-direction: column;
                    }
                }
            `}</style>
            <div className="unit-design-header">
                <div className="unit-design-eyebrow">Selected Section</div>
                <h2 className="unit-design-title">Unit Design Structure</h2>
            </div>
            <div className="unit-design-body">
                <div className="unit-design-control-card mb-4">
                    <label className="form-label fw-semibold small text-uppercase">
                        Development Category *
                    </label>
                    <div className="btn-group w-100" role="group">
                        <input
                            type="radio"
                            className="btn-check"
                            name="developmentCategory"
                            id="residentialCategory"
                            autoComplete="off"
                            checked={developmentCategory === 'residential'}
                            onChange={() => { }} // Prevent manual changes
                            disabled
                        />
                        <label className={`btn ${developmentCategory === 'residential' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="residentialCategory">
                            Residential
                        </label>

                        <input
                            type="radio"
                            className="btn-check"
                            name="developmentCategory"
                            id="commercialCategory"
                            autoComplete="off"
                            checked={developmentCategory === 'commercial'}
                            onChange={() => { }} // Prevent manual changes
                            disabled
                        />
                        <label className={`btn ${developmentCategory === 'commercial' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="commercialCategory">
                            Commercial
                        </label>

                        <input
                            type="radio"
                            className="btn-check"
                            name="developmentCategory"
                            id="mixedCategory"
                            autoComplete="off"
                            checked={developmentCategory === 'mixed'}
                            onChange={() => { }} // Prevent manual changes
                            disabled
                        />
                        <label className={`btn ${developmentCategory === 'mixed' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="mixedCategory">
                            Mixed Use
                        </label>
                    </div>
                    <div className="mt-2 text-muted small">
                        <FaInfoCircle className="me-1" />
                        Development category is set by the Land Details form
                    </div>
                </div>

                {/* Calculation Mode Toggle */}
                <div className="unit-design-control-card mb-4">
                    <label className="form-label fw-semibold small text-uppercase">
                        Calculation Mode *
                    </label>
                    <div className="btn-group w-100" role="group">
                        <input
                            type="radio"
                            className="btn-check"
                            name="calculationMode"
                            id="carpetMode"
                            autoComplete="off"
                            checked={calculationMode === 'carpet'}
                            onChange={() => {
                                setCalculationMode('carpet');
                                // Effect will handle update
                            }}
                        />
                        <label className={`btn ${calculationMode === 'carpet' ? 'btn-success' : 'btn-outline-secondary'}`} htmlFor="carpetMode">
                            Calculate on Carpet Area
                        </label>

                        <input
                            type="radio"
                            className="btn-check"
                            name="calculationMode"
                            id="saleableMode"
                            autoComplete="off"
                            checked={calculationMode === 'saleable'}
                            onChange={() => {
                                setCalculationMode('saleable');
                                // Effect will handle update
                            }}
                        />
                        <label className={`btn ${calculationMode === 'saleable' ? 'btn-success' : 'btn-outline-secondary'}`} htmlFor="saleableMode">
                            Calculate on Saleable Area
                        </label>
                    </div>
                    <div className="mt-2 text-muted small">
                        <FaInfoCircle className="me-1" />
                        {calculationMode === 'carpet'
                            ? 'Total area is fetched from Carpet Area in Area Calculation Results'
                            : 'Total area is fetched from Saleable Area in Area Calculation Results'}
                    </div>
                </div>

                {(developmentCategory === 'residential' || developmentCategory === 'mixed') && (
                    <div className="mb-4">
                        {renderUnitDesignSection('residential')}
                    </div>
                )}

                {(developmentCategory === 'commercial' || developmentCategory === 'mixed') && (
                    <div className="mb-4">
                        {renderUnitDesignSection('commercial')}
                    </div>
                )}

                <div className="unit-design-actions mt-4 pt-3">
                    <div className="row g-3">
                        <div className="col-6">
                            <button
                                onClick={handleSave}
                                className="btn btn-primary rounded-pill w-100 shadow-sm card-hover-lift"
                            >
                                <FaSave className="me-2" />Save Design
                            </button>
                        </div>
                        <div className="col-6">
                            <button
                                onClick={handleSave}
                                className="btn btn-secondary rounded-pill w-100 shadow-sm card-hover-lift"
                            >
                                <FaSyncAlt className="me-2" />Update
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitDesignStructure;


// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   FaCube,
//   FaPlus,
//   FaTrash,
//   FaSlidersH,
//   FaInfoCircle,
//   FaSave,
//   FaSyncAlt,
// } from "react-icons/fa";

// const UnitDesignStructure = ({ onSave, calculationMode, setCalculationMode }) => {
//     // const [calculationMode, setCalculationMode] = useState('carpet'); // Lifted to parent
//     const [developmentCategory, setDevelopmentCategory] = useState('residential');
//     const [residentialData, setResidentialData] = useState({
//         totalCarpet: 0,
//         variations: [{ bhkType: '1 BHK', area: 0, splitPct: 0 }],
//         factorCar: 1.0,
//         visitorPct: 5.0
//     });
//     const [commercialData, setCommercialData] = useState({
//         totalCarpet: 0,
//         variations: [{ unitType: 'Shop', area: 0, splitPct: 0 }],
//         factorCar: 1.0,
//         visitorPct: 5.0
//     });

//     const MAX_VARIATIONS = 10;

//     const getProposedCarpetAreas = useCallback(() => {
//         const areaForm = JSON.parse(localStorage.getItem("areaCalculationForm") || "{}");
//         const fsi = JSON.parse(localStorage.getItem("fsiProposalData") || "{}");
//         const landDetails = JSON.parse(localStorage.getItem("landDetailsForm") || "{}");

//         const efficiency = parseFloat(areaForm?.efficiencyRatio || 0.85);
//         const proposedMaxBuilding = parseFloat(fsi?.Proposed_Max_Building_Potential) || 0;

//         const commAncConst = parseFloat(fsi?.Proposed_Commercial_Ancillary_Area_Constant) || 0;
//         const resAncConst = parseFloat(fsi?.Proposed_Residential_Ancillary_Area_Constant) || 0;

//         const commSplit = (parseFloat(landDetails?.commercialSplit) || 0) / 100;
//         const resSplit = (parseFloat(landDetails?.residentialSplit) || 0) / 100;

//         const zoning = (localStorage.getItem("zoningType") || "residential").toLowerCase();

//         if (zoning === "mixed") {
//             const prCommAnc = proposedMaxBuilding * commSplit * commAncConst;
//             const prResAnc = proposedMaxBuilding * resSplit * resAncConst;
//             const prCommMax = (proposedMaxBuilding * commSplit) + prCommAnc;
//             const prResMax = (proposedMaxBuilding * resSplit) + prResAnc;
//             return {
//                 residential: prResMax * efficiency,
//                 commercial: prCommMax * efficiency,
//             };
//         }

//         if (zoning === "commercial") {
//             const proposedTotal = proposedMaxBuilding + (proposedMaxBuilding * commAncConst);
//             return {
//                 residential: 0,
//                 commercial: proposedTotal * efficiency,
//             };
//         }

//         const proposedTotal = proposedMaxBuilding + (proposedMaxBuilding * resAncConst);
//         return {
//             residential: proposedTotal * efficiency,
//             commercial: 0,
//         };
//     }, []);

//     const getProposedSaleableAreas = useCallback(() => {
//         const areaForm = JSON.parse(localStorage.getItem("areaCalculationForm") || "{}");
//         const carpetAreas = getProposedCarpetAreas();

//         const resLoading = parseFloat(areaForm?.resLoadingRatio || 1.35);
//         const commercialTypes = Array.isArray(areaForm?.commercialType)
//             ? areaForm.commercialType
//             : areaForm?.commercialType ? [areaForm.commercialType] : ["Shop"];

//         const shopLoading = parseFloat(areaForm?.shopLoading || 1.50);
//         const officeLoading = parseFloat(areaForm?.officeLoading || 1.45);

//         let commercialSaleable = 0;
//         if (commercialTypes.length === 1) {
//             const loading = commercialTypes[0] === "Office" ? officeLoading : shopLoading;
//             commercialSaleable = carpetAreas.commercial * loading;
//         } else if (commercialTypes.length === 2) {
//             const shopPct = (areaForm?.shopPercentage ?? 50) / 100;
//             const officePct = (areaForm?.officePercentage ?? 50) / 100;
//             const shopCarpet = carpetAreas.commercial * shopPct;
//             const officeCarpet = carpetAreas.commercial * officePct;
//             commercialSaleable = (shopCarpet * shopLoading) + (officeCarpet * officeLoading);
//         }

//         return {
//             residential: carpetAreas.residential * resLoading,
//             commercial: commercialSaleable,
//         };
//     }, [getProposedCarpetAreas]);

//     const applyAutoTotalCarpet = useCallback((zoningTypeValue) => {
//         const zoning = (zoningTypeValue || "residential").toLowerCase();

//         // Get areas based on calculation mode
//         const areas = calculationMode === 'carpet' ? getProposedCarpetAreas() : getProposedSaleableAreas();
//         const { residential, commercial } = areas;

//         if (zoning === "mixed") {
//             setResidentialData((prev) => ({ ...prev, totalCarpet: residential }));
//             setCommercialData((prev) => ({ ...prev, totalCarpet: commercial }));
//             return;
//         }

//         if (zoning === "commercial") {
//             setCommercialData((prev) => ({ ...prev, totalCarpet: commercial }));
//             return;
//         }

//         setResidentialData((prev) => ({ ...prev, totalCarpet: residential }));
//         setResidentialData((prev) => ({ ...prev, totalCarpet: residential }));
//     }, [calculationMode, getProposedCarpetAreas, getProposedSaleableAreas]);

//     // Effect to trigger calculation when mode changes (from parent or self)
//     useEffect(() => {
//         const savedZoningType = localStorage.getItem("zoningType") || 'residential';
//         applyAutoTotalCarpet(savedZoningType);
//     }, [calculationMode, applyAutoTotalCarpet]);

//     useEffect(() => {
//         // First, get the zoning type from land details
//         const savedZoningType = localStorage.getItem("zoningType") || 'residential';

//         // Then get any previously saved unit design data
//         const saved = localStorage.getItem("unitDesignStructure");

//         // Set development category based on zoning type from land details
//         setDevelopmentCategory(savedZoningType);

//         if (saved) {
//             const parsed = JSON.parse(saved);
//             if (parsed.residentialData) {
//                 const totalCarpet = parseFloat(parsed?.residentialData?.totalCarpet) || 0;
//                 if (!parsed.residentialData.variations || !Array.isArray(parsed.residentialData.variations)) {
//                     parsed.residentialData.variations = [{ bhkType: '1 BHK', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }];
//                 } else {
//                     parsed.residentialData.variations = parsed.residentialData.variations.map((v) => {
//                         const area = parseFloat(v?.area) || 0;
//                         const storedSplitPct = parseFloat(v?.splitPct);
//                         const count = parseFloat(v?.count) || 0;
//                         const derivedSplitPct = totalCarpet > 0 ? ((area * count) / totalCarpet) * 100 : 0;
//                         const rawBhkType = v?.bhkType || '1 BHK';
//                         const normalizedBhkType = (rawBhkType === '4 BHK' || rawBhkType === '5 BHK') ? '>3 BHK' : rawBhkType;
//                         const resolvedSplitPct = Number.isFinite(storedSplitPct) ? storedSplitPct : derivedSplitPct;
//                         const areaAllotted = totalCarpet * ((parseFloat(resolvedSplitPct) || 0) / 100);
//                         const units = area > 0 ? areaAllotted / area : 0;
//                         const roundedUnits = units > 0 ? Math.round(units) : 0;
//                         const adjustedUnitArea = roundedUnits > 0 ? areaAllotted / roundedUnits : 0;
//                         const adjustedUnits = adjustedUnitArea > 0 ? areaAllotted / adjustedUnitArea : 0;
//                         return {
//                             bhkType: normalizedBhkType,
//                             area,
//                             splitPct: resolvedSplitPct,
//                             areaAllotted: Number.isFinite(areaAllotted) ? Number(areaAllotted.toFixed(2)) : 0,
//                             noOfUnits: Number.isFinite(units) ? Number(units.toFixed(2)) : 0,
//                             adjustedUnitArea: Number.isFinite(adjustedUnitArea) ? Number(adjustedUnitArea.toFixed(2)) : 0,
//                             adjustedUnits: Number.isFinite(adjustedUnits) ? Math.round(adjustedUnits) : 0,
//                         };
//                     });
//                 }
//                 setResidentialData(parsed.residentialData);
//             }
//             if (parsed.commercialData) {
//                 const totalCarpet = parseFloat(parsed?.commercialData?.totalCarpet) || 0;

//                 if (!parsed.commercialData.variations || !Array.isArray(parsed.commercialData.variations)) {
//                     parsed.commercialData.variations = [{ unitType: 'Shop', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }];
//                 } else {
//                     parsed.commercialData.variations = parsed.commercialData.variations.map((v) => {
//                         const area = parseFloat(v?.area) || 0;
//                         const storedSplitPct = parseFloat(v?.splitPct);
//                         const count = parseFloat(v?.count) || 0;
//                         const derivedSplitPct = totalCarpet > 0 ? ((area * count) / totalCarpet) * 100 : 0;
//                         const resolvedSplitPct = Number.isFinite(storedSplitPct) ? storedSplitPct : derivedSplitPct;
//                         const areaAllotted = totalCarpet * ((parseFloat(resolvedSplitPct) || 0) / 100);
//                         const units = area > 0 ? areaAllotted / area : 0;
//                         const roundedUnits = units > 0 ? Math.round(units) : 0;
//                         const adjustedUnitArea = roundedUnits > 0 ? areaAllotted / roundedUnits : 0;
//                         const adjustedUnits = adjustedUnitArea > 0 ? areaAllotted / adjustedUnitArea : 0;
//                         return {
//                             unitType: v?.unitType || 'Shop',
//                             area,
//                             splitPct: resolvedSplitPct,
//                             areaAllotted: Number.isFinite(areaAllotted) ? Number(areaAllotted.toFixed(2)) : 0,
//                             noOfUnits: Number.isFinite(units) ? Number(units.toFixed(2)) : 0,
//                             adjustedUnitArea: Number.isFinite(adjustedUnitArea) ? Number(adjustedUnitArea.toFixed(2)) : 0,
//                             adjustedUnits: Number.isFinite(adjustedUnits) ? Math.round(adjustedUnits) : 0,
//                         };
//                     });
//                 }
//                 setCommercialData(parsed.commercialData);
//             }
//         }

//         applyAutoTotalCarpet(savedZoningType);

//         // Listen for updates to land details
//         const handleLandDetailsUpdate = () => {
//             const updatedZoningType = localStorage.getItem("zoningType") || 'residential';
//             setDevelopmentCategory(updatedZoningType);
//             applyAutoTotalCarpet(updatedZoningType);
//         };

//         const handleAreaCalculationUpdate = () => {
//             const updatedZoningType = localStorage.getItem("zoningType") || 'residential';
//             applyAutoTotalCarpet(updatedZoningType);
//         };

//         const handleFsiProposalUpdate = () => {
//             const updatedZoningType = localStorage.getItem("zoningType") || 'residential';
//             applyAutoTotalCarpet(updatedZoningType);
//         };

//         window.addEventListener('landDetailsUpdated', handleLandDetailsUpdate);
//         window.addEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
//         window.addEventListener('fsiProposalUpdated', handleFsiProposalUpdate);

//         return () => {
//             window.removeEventListener('landDetailsUpdated', handleLandDetailsUpdate);
//             window.removeEventListener('areaCalculationUpdated', handleAreaCalculationUpdate);
//             window.removeEventListener('fsiProposalUpdated', handleFsiProposalUpdate);
//         };
//     }, [applyAutoTotalCarpet]);

//     // Handle variation changes for residential or commercial
//     const handleVariationChange = (type, index, field, value) => {
//         if (type === 'residential') {
//             const newVariations = [...residentialData.variations];
//             newVariations[index][field] = field === 'bhkType' ? value : (parseFloat(value) || 0);
//             setResidentialData(prev => ({ ...prev, variations: newVariations }));
//         } else {
//             const newVariations = [...commercialData.variations];
//             newVariations[index][field] = field === 'unitType' ? value : (parseFloat(value) || 0);
//             setCommercialData(prev => ({ ...prev, variations: newVariations }));
//         }
//     };

//     // Add new variation for residential or commercial
//     const addVariation = (type) => {
//         if (type === 'residential' && residentialData.variations.length < MAX_VARIATIONS) {
//             setResidentialData(prev => ({
//                 ...prev,
//                 variations: [...prev.variations, { bhkType: '1 BHK', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }]
//             }));
//         } else if (type === 'commercial' && commercialData.variations.length < MAX_VARIATIONS) {
//             setCommercialData(prev => ({
//                 ...prev,
//                 variations: [...prev.variations, { unitType: 'Shop', area: 0, splitPct: 0, areaAllotted: 0, noOfUnits: 0, adjustedUnitArea: 0, adjustedUnits: 0 }]
//             }));
//         }
//     };

//     // Remove variation for residential or commercial
//     const removeVariation = (type, index) => {
//         if (type === 'residential' && residentialData.variations.length > 1) {
//             const newVariations = [...residentialData.variations];
//             newVariations.splice(index, 1);
//             setResidentialData(prev => ({ ...prev, variations: newVariations }));
//         } else if (type === 'commercial' && commercialData.variations.length > 1) {
//             const newVariations = [...commercialData.variations];
//             newVariations.splice(index, 1);
//             setCommercialData(prev => ({ ...prev, variations: newVariations }));
//         }
//     };

//     const handleInputChange = (type, field, value) => {
//         if (type === 'residential') {
//             setResidentialData(prev => ({ ...prev, [field]: value }));
//         } else {
//             setCommercialData(prev => ({ ...prev, [field]: value }));
//         }
//     };

//     const handleSave = () => {
//         const savedZoningType = (localStorage.getItem("zoningType") || 'residential').toLowerCase();

//         const withAreaAllotted = (data) => {
//             const totalCarpet = parseFloat(data?.totalCarpet) || 0;
//             const variations = (data?.variations || []).map((v) => {
//                 const area = parseFloat(v?.area) || 0;
//                 const pct = parseFloat(v?.splitPct) || 0;
//                 const areaAllotted = totalCarpet * (pct / 100);
//                 const units = area > 0 ? areaAllotted / area : 0;

//                 const roundedUnits = units > 0 ? Math.round(units) : 0;
//                 const adjustedUnitArea = roundedUnits > 0 ? areaAllotted / roundedUnits : 0;
//                 const adjustedUnits = adjustedUnitArea > 0 ? areaAllotted / adjustedUnitArea : 0;
//                 return {
//                     ...v,
//                     areaAllotted: Number.isFinite(areaAllotted) ? Number(areaAllotted.toFixed(2)) : 0,
//                     noOfUnits: Number.isFinite(units) ? Number(units.toFixed(2)) : 0,
//                     adjustedUnitArea: Number.isFinite(adjustedUnitArea) ? Number(adjustedUnitArea.toFixed(2)) : 0,
//                     adjustedUnits: Number.isFinite(adjustedUnits) ? Math.round(adjustedUnits) : 0,
//                 };
//             });
//             return { ...data, variations };
//         };

//         let dataToSave;
//         if (savedZoningType === 'residential') {
//             dataToSave = {
//                 developmentCategory: 'residential',
//                 residentialData: withAreaAllotted(residentialData),
//             };
//         } else if (savedZoningType === 'commercial') {
//             dataToSave = {
//                 developmentCategory: 'commercial',
//                 commercialData: withAreaAllotted(commercialData),
//             };
//         } else {
//             dataToSave = {
//                 developmentCategory: 'mixed',
//                 residentialData: withAreaAllotted(residentialData),
//                 commercialData: withAreaAllotted(commercialData),
//             };
//         }

//         localStorage.setItem("unitDesignStructure", JSON.stringify(dataToSave));
//         if (onSave) onSave(dataToSave);

//         // Optional: dispatch event
//         window.dispatchEvent(new Event('unitDesignUpdated'));
//     };

//     const calculateTotals = useCallback((type) => {
//         const data = type === 'residential' ? residentialData : commercialData;
//         const totalCarpet = parseFloat(data.totalCarpet) || 0;
//         const totalAllotted = data.variations.reduce((sum, v) => {
//             const pct = parseFloat(v?.splitPct) || 0;
//             return sum + (totalCarpet * (pct / 100));
//         }, 0);
//         const remaining = totalCarpet - totalAllotted;
//         return { totalAllotted, remaining };
//     }, [residentialData, commercialData]);

//     const handleAdjustArea = (type) => {
//         if (type === 'residential') {
//             setResidentialData((prev) => {
//                 const variations = prev?.variations || [];
//                 if (variations.length === 0) return prev;

//                 const lastIndex = variations.length - 1;
//                 const last = variations[lastIndex] || {};
//                 const sumPctExcludingLast = variations.reduce((sum, v, idx) => {
//                     if (idx === lastIndex) return sum;
//                     return sum + (parseFloat(v?.splitPct) || 0);
//                 }, 0);

//                 const newSplitPct = 100 - sumPctExcludingLast;
//                 const newVariations = [...variations];
//                 newVariations[lastIndex] = { ...last, splitPct: Number.isFinite(newSplitPct) ? Number(newSplitPct.toFixed(2)) : 0 };

//                 return { ...prev, variations: newVariations };
//             });
//             return;
//         }

//         if (type === 'commercial') {
//             setCommercialData((prev) => {
//                 const variations = prev?.variations || [];
//                 if (variations.length === 0) return prev;

//                 const lastIndex = variations.length - 1;
//                 const last = variations[lastIndex] || {};
//                 const sumPctExcludingLast = variations.reduce((sum, v, idx) => {
//                     if (idx === lastIndex) return sum;
//                     return sum + (parseFloat(v?.splitPct) || 0);
//                 }, 0);

//                 const newSplitPct = 100 - sumPctExcludingLast;
//                 const newVariations = [...variations];
//                 newVariations[lastIndex] = { ...last, splitPct: Number.isFinite(newSplitPct) ? Number(newSplitPct.toFixed(2)) : 0 };

//                 return { ...prev, variations: newVariations };
//             });
//         }
//     };

//     // Render unit design section for residential or commercial
//     const renderUnitDesignSection = (type) => {
//         const data = type === 'residential' ? residentialData : commercialData;
//         const totals = type === 'residential' ? residentialTotals : commercialTotals;
//         const title = type === 'residential' ? 'Residential Units Design' : 'Commercial Units Design';

//         return (
//             <div className="mb-4">
//                 <h5 className="fw-bold text-dark mb-3">{title}</h5>
//                 <div className="mb-4">
//                     <label htmlFor={`${type}TotalCarpet`} className="form-label fw-semibold small text-uppercase">
//                         Total {calculationMode === 'carpet' ? 'carpet' : 'saleable'} area for {type} (sqft)
//                     </label>
//                     <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         id={`${type}TotalCarpet`}
//                         value={Math.round(data.totalCarpet)}
//                         onChange={(e) => handleInputChange(type, 'totalCarpet', parseFloat(e.target.value) || 0)}
//                         readOnly
//                         min="0"
//                         step="10"
//                     />
//                     <small className="text-muted">Auto-filled from Area Calculation Results (Proposed {calculationMode === 'carpet' ? 'Carpet' : 'Saleable'} Area)</small>
//                 </div>

//                 <h6 className="mt-4 fw-bold text-dark small text-uppercase">
//                     {type === 'residential' ? 'Residential' : 'Commercial'} unit variations
//                 </h6>

//                 <div className="d-flex justify-content-start mb-3">
//                     <button
//                         className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm"
//                         onClick={() => addVariation(type)}
//                         disabled={data.variations.length >= MAX_VARIATIONS}
//                     >
//                         <FaPlus className="me-1" />
//                         Add {type} variation
//                     </button>
//                 </div>

//                 {/* Table Format for Variations */}
//                 <div className="table-responsive">
//                     <table className="table table-sm table-bordered table-hover align-middle">
//                         <thead className="table-light">
//                             <tr>
//                                 {type === 'residential' ? (
//                                     <>
//                                         <th className="small fw-semibold">BHK Type</th>
//                                         <th className="small fw-semibold">Area Per Unit (sqft)</th>
//                                         <th className="small fw-semibold">% Split</th>
//                                         <th className="small fw-semibold">Area Allotted (sqft)</th>
//                                         <th className="small fw-semibold text-center" style={{ width: '80px' }}>Action</th>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <th className="small fw-semibold">Unit Type</th>
//                                         <th className="small fw-semibold">Area Per Unit (sqft)</th>
//                                         <th className="small fw-semibold">% Split</th>
//                                         <th className="small fw-semibold">Area Allotted (sqft)</th>
//                                         <th className="small fw-semibold text-center" style={{ width: '80px' }}>Action</th>
//                                     </>
//                                 )}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {data.variations.map((variation, index) => (
//                                 <tr key={`${type}-${index}`}>
//                                     {type === 'residential' ? (
//                                         <>
//                                             <td>
//                                                 <select
//                                                     className="form-select form-select-sm"
//                                                     value={variation.bhkType || '1 BHK'}
//                                                     onChange={(e) => handleVariationChange(type, index, 'bhkType', e.target.value)}
//                                                 >
//                                                     <option value="1 BHK">1 BHK</option>
//                                                     <option value="2 BHK">2 BHK</option>
//                                                     <option value="3 BHK">3 BHK</option>
//                                                     <option value=">3 BHK">&gt;3 BHK</option>
//                                                 </select>
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm"
//                                                     value={variation.area}
//                                                     onChange={(e) => handleVariationChange(type, index, 'area', e.target.value)}
//                                                     min="0"
//                                                     step="1"
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm"
//                                                     value={variation.splitPct}
//                                                     onChange={(e) => handleVariationChange(type, index, 'splitPct', e.target.value)}
//                                                     step="0.01"
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm bg-light"
//                                                     value={((parseFloat(data.totalCarpet) || 0) * ((parseFloat(variation.splitPct) || 0) / 100)).toFixed(2)}
//                                                     readOnly
//                                                 />
//                                             </td>
//                                             <td className="text-center">
//                                                 {data.variations.length > 1 && (
//                                                     <button
//                                                         className="btn btn-outline-danger btn-sm"
//                                                         onClick={() => removeVariation(type, index)}
//                                                         title={`Remove ${type} variation`}
//                                                     >
//                                                         <FaTrash />
//                                                     </button>
//                                                 )}
//                                             </td>
//                                         </>
//                                     ) : (
//                                         <>
//                                             <td>
//                                                 <select
//                                                     className="form-select form-select-sm"
//                                                     value={variation.unitType || 'Shop'}
//                                                     onChange={(e) => handleVariationChange(type, index, 'unitType', e.target.value)}
//                                                 >
//                                                     <option value="Shop">Shop</option>
//                                                     <option value="Office">Office</option>
//                                                 </select>
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm"
//                                                     value={variation.area}
//                                                     onChange={(e) => handleVariationChange(type, index, 'area', e.target.value)}
//                                                     min="0"
//                                                     step="1"
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm"
//                                                     value={variation.splitPct}
//                                                     onChange={(e) => handleVariationChange(type, index, 'splitPct', e.target.value)}
//                                                     step="0.01"
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm bg-light"
//                                                     value={((parseFloat(data.totalCarpet) || 0) * ((parseFloat(variation.splitPct) || 0) / 100)).toFixed(2)}
//                                                     readOnly
//                                                 />
//                                             </td>
//                                             <td className="text-center">
//                                                 {data.variations.length > 1 && (
//                                                     <button
//                                                         className="btn btn-outline-danger btn-sm"
//                                                         onClick={() => removeVariation(type, index)}
//                                                         title={`Remove ${type} variation`}
//                                                     >
//                                                        <FaTrash/>
//                                                     </button>
//                                                 )}
//                                             </td>
//                                         </>
//                                     )}
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>

//                 <div className="d-flex justify-content-start mb-2">
//                     <button
//                         type="button"
//                         className="btn btn-outline-primary btn-sm rounded-pill px-3"
//                         onClick={() => handleAdjustArea(type)}
//                         disabled={!data.variations?.length}
//                     >
//                         <FaSlidersH className="me-1" />
//                         Adjust Area
//                     </button>
//                 </div>

//                 <div className="row mt-3">
//                     <div className="col-md-6">
//                         <div className="d-flex justify-content-between mb-1">
//                             <span className="small text-muted">Total allotted area:</span>
//                             <span className="fw-medium">{totals.totalAllotted.toFixed(0)} sqft</span>
//                         </div>
//                         <div className="d-flex justify-content-between">
//                             <span className="small text-muted">Remaining area:</span>
//                             <span className={totals.remaining < 0 ? 'text-danger fw-bold' : 'fw-medium'}>
//                                 {totals.remaining.toFixed(0)} sqft
//                             </span>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="row mt-4">
//                     <div className="col-md-6">
//                         <label className="form-label fw-semibold small text-uppercase">
//                             {type === 'residential' ? 'Residential' : 'Commercial'} car parking factor
//                             &nbsp;&nbsp;
//                                 <a 
//                                     href="/parking-logic" 
//                                     target="_blank" 
//                                     rel="noopener noreferrer"
//                                     className="text-primary text-decoration-underline small"
//                                     style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'normal' }}
//                                 >
//                                         (Calculate Required parking for your project)
//                                 </a>
//                         </label>
//                         <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={data.factorCar}
//                             onChange={(e) => handleInputChange(type, 'factorCar', parseFloat(e.target.value) || 1.0)}
//                             step="0.1"
//                             min="0.1"
//                         />
//                         <small className="text-muted">Multiplier for {type} car parking requirements</small>
//                     </div>
//                     <div className="col-md-6">
//                         <label className="form-label fw-semibold small text-uppercase">
//                             {type === 'residential' ? 'Residential' : 'Commercial'} visitor parking (%)
//                             &nbsp;&nbsp;
//                                 <a 
//                                     href="/parking-logic" 
//                                     target="_blank" 
//                                     rel="noopener noreferrer"
//                                     className="text-primary text-decoration-underline small"
//                                     style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'normal' }}
//                                 >
//                                         (Calculate Required parking for your project)
//                                 </a>                            
//                         </label>
//                         <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={data.visitorPct}
//                             onChange={(e) => handleInputChange(type, 'visitorPct', parseFloat(e.target.value) || 0)}
//                             step="0.1"
//                             min="0"
//                             max="100"
//                         />
//                         <small className="text-muted">Percentage for {type} visitor parking</small>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     const residentialTotals = calculateTotals('residential');
//     const commercialTotals = calculateTotals('commercial');

//     return (
//         <div className="card border-0 shadow-sm rounded-4 mt-4 h-100 w-100">
//             <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
//                 <h2 className="mb-3" style={{ color: '#000000' }}>
//                     <div className="d-flex align-items-center">
//                         <div className="bg-info bg-opacity-10 text-info rounded-circle me-3 d-flex align-items-center justify-content-center"
//                             style={{ width: '40px', height: '40px' }}>
//                             <FaCube style={{ color: "#0dcaf0" }} />
//                         </div>
//                         Unit Design Structure
//                     </div>
//                 </h2>
//             </div>
//             <div className="card-body p-4">
//                 <div className="mb-4">
//                     <label className="form-label fw-semibold small text-uppercase">
//                         Development Category *
//                     </label>
//                     <div className="btn-group w-100" role="group">
//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="developmentCategory"
//                             id="residentialCategory"
//                             autoComplete="off"
//                             checked={developmentCategory === 'residential'}
//                             onChange={() => { }} // Prevent manual changes
//                             disabled
//                         />
//                         <label className={`btn ${developmentCategory === 'residential' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="residentialCategory">
//                             Residential
//                         </label>

//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="developmentCategory"
//                             id="commercialCategory"
//                             autoComplete="off"
//                             checked={developmentCategory === 'commercial'}
//                             onChange={() => { }} // Prevent manual changes
//                             disabled
//                         />
//                         <label className={`btn ${developmentCategory === 'commercial' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="commercialCategory">
//                             Commercial
//                         </label>

//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="developmentCategory"
//                             id="mixedCategory"
//                             autoComplete="off"
//                             checked={developmentCategory === 'mixed'}
//                             onChange={() => { }} // Prevent manual changes
//                             disabled
//                         />
//                         <label className={`btn ${developmentCategory === 'mixed' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="mixedCategory">
//                             Mixed Use
//                         </label>
//                     </div>
//                     <div className="mt-2 text-muted small">
//                         <FaInfoCircle className="me-1" />
//                         Development category is set by the Land Details form
//                     </div>
//                 </div>

//                 {/* Calculation Mode Toggle */}
//                 <div className="mb-4">
//                     <label className="form-label fw-semibold small text-uppercase">
//                         Calculation Mode *
//                     </label>
//                     <div className="btn-group w-100" role="group">
//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="calculationMode"
//                             id="carpetMode"
//                             autoComplete="off"
//                             checked={calculationMode === 'carpet'}
//                             onChange={() => {
//                                 setCalculationMode('carpet');
//                                 // Effect will handle update
//                             }}
//                         />
//                         <label className={`btn ${calculationMode === 'carpet' ? 'btn-success' : 'btn-outline-secondary'}`} htmlFor="carpetMode">
//                             Calculate on Carpet Area
//                         </label>

//                         <input
//                             type="radio"
//                             className="btn-check"
//                             name="calculationMode"
//                             id="saleableMode"
//                             autoComplete="off"
//                             checked={calculationMode === 'saleable'}
//                             onChange={() => {
//                                 setCalculationMode('saleable');
//                                 // Effect will handle update
//                             }}
//                         />
//                         <label className={`btn ${calculationMode === 'saleable' ? 'btn-success' : 'btn-outline-secondary'}`} htmlFor="saleableMode">
//                             Calculate on Saleable Area
//                         </label>
//                     </div>
//                     <div className="mt-2 text-muted small">
//                         <FaInfoCircle className="me-1" />
//                         {calculationMode === 'carpet'
//                             ? 'Total area is fetched from Carpet Area in Area Calculation Results'
//                             : 'Total area is fetched from Saleable Area in Area Calculation Results'}
//                     </div>
//                 </div>

//                 {(developmentCategory === 'residential' || developmentCategory === 'mixed') && (
//                     <div className="mb-4 pb-4 border-bottom">
//                         {renderUnitDesignSection('residential')}
//                     </div>
//                 )}

//                 {(developmentCategory === 'commercial' || developmentCategory === 'mixed') && (
//                     <div className="mb-4">
//                         {renderUnitDesignSection('commercial')}
//                     </div>
//                 )}

//                 <div className="mt-4 pt-3">
//                     <div className="row g-3">
//                         <div className="col-6">
//                             <button
//                                 onClick={handleSave}
//                                 className="btn btn-primary rounded-pill w-100 shadow-sm card-hover-lift"
//                             >
//                                 <FaSave className="me-2" />Save Design
//                             </button>
//                         </div>
//                         <div className="col-6">
//                             <button
//                                 onClick={handleSave}
//                                 className="btn btn-secondary rounded-pill w-100 shadow-sm card-hover-lift"
//                             >
//                                 <FaSyncAlt className="me-2" />Update
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default UnitDesignStructure;
