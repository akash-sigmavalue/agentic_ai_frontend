import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTrash } from 'react-icons/fa';
import { apiUrl } from "@/lib/api-client";

const DEFAULT_PROPERTY_TYPES = [
    "Apartment", "Flat", "Studio", "Villa", "Townhouse", 
    "Retail Shop", "Showroom", "Office", "Serviced Apartment", 
    "Hotel", "Industrial", "Warehouse", "Plot", "Other"
];

const DEFAULT_UNIT_TYPES = [
    "Studio", "1 Bed", "2 Bed", "3 Bed", ">3 Bed", 
    "Small Office", "Medium Office", "Large Office", 
    "Retail Unit", "Mixed Unit", "Other"
];

const PropertyTypeSelect = ({ value, onChange, options = [], style, isLoading }) => {
    if (isLoading) {
        return (
            <div className="d-flex align-items-center" style={{ minWidth: '95px', padding: '0.15rem 0', ...style }}>
                <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                    <span style={{ color: '#2ea868' }}>Fetching...</span>
                </span>
            </div>
        );
    }
    const list = (options && options.length > 0) ? options : DEFAULT_PROPERTY_TYPES;
    return (
        <select 
            className="form-select pm-table-select shadow-none" 
            value={value || list[0] || 'Apartment'} 
            onChange={onChange} 
            style={{ minWidth: '95px', ...style }}
        >
            {list.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    );
};

const UnitTypeSelect = ({ value, onChange, options = [], style, isLoading }) => {
    if (isLoading) {
        return (
            <div className="d-flex align-items-center" style={{ minWidth: '85px', padding: '0.15rem 0', ...style }}>
                <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                    <span style={{ color: '#2ea868' }}>Fetching...</span>
                </span>
            </div>
        );
    }
    const list = (options && options.length > 0) ? options : DEFAULT_UNIT_TYPES;
    return (
        <select 
            className="form-select pm-table-select shadow-none" 
            value={value || list[0] || 'Studio'} 
            onChange={onChange} 
            style={{ minWidth: '85px', ...style }}
        >
            {list.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    );
};

const ProductMixTicketSize = () => {
    const theme = "light";
    const [isAnalysisModeOpen, setIsAnalysisModeOpen] = useState(true);
    const [isAppliedProductMixOpen, setIsAppliedProductMixOpen] = useState(false);

    const [currency, setCurrency] = useState("INR");
    const [areaUnit, setAreaUnit] = useState("sq ft");

    const [grossFloorArea, setGrossFloorArea] = useState(0);

    const [dbPropertyTypes, setDbPropertyTypes] = useState(DEFAULT_PROPERTY_TYPES);
    const [dbUnitTypes, setDbUnitTypes] = useState(DEFAULT_UNIT_TYPES);
    const [typesLoading, setTypesLoading] = useState(false);
    const [isAnalyzingArea, setIsAnalyzingArea] = useState(false);
    const [timeFilter, setTimeFilter] = useState("Last 1 year");
    const [isAnalyzingRate, setIsAnalyzingRate] = useState(false);
    const [rateTimeFilter, setRateTimeFilter] = useState("Last 1 year");
    const [isAnalyzingTicketSize, setIsAnalyzingTicketSize] = useState(false);
    const [ticketSizeTimeFilter, setTicketSizeTimeFilter] = useState("Last 1 year");

    useEffect(() => {
        const savedData = localStorage.getItem("Land_and_fsi_details");
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.grossFloorArea) {
                    setGrossFloorArea(Number(parsed.grossFloorArea));
                }
            } catch (e) {
                console.error("Error parsing Land_and_fsi_details", e);
            }
        }

        let cityName = "";
        let locationName = "";
        const savedLandData = localStorage.getItem("Land Identification");
        if (savedLandData) {
            try {
                const parsedLand = JSON.parse(savedLandData);
                if (parsedLand.currency) {
                    setCurrency(parsedLand.currency);
                }
                cityName = parsedLand.location || parsedLand.city || "";
                locationName = parsedLand.village || parsedLand.villageName || "";
            } catch (e) {
                console.error("Error parsing Land Identification", e);
            }
        }

        const fetchTypes = async () => {
            setTypesLoading(true);
            try {
                const res = await fetch(apiUrl("/new_rate_simulator/simulator/property-and-unit-types/"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ city_name: cityName, location_name: locationName })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        if (Array.isArray(json.property_types) && json.property_types.length > 0) {
                            setDbPropertyTypes(json.property_types);
                        }
                        if (Array.isArray(json.unit_types) && json.unit_types.length > 0) {
                            setDbUnitTypes(json.unit_types);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch property/unit types from DB", e);
            } finally {
                setTypesLoading(false);
            }
        };
        fetchTypes();
    }, []);

    const [areaRows, setAreaRows] = useState([{ id: 1, propertyType: '', unitType: '', min: '', max: '', interval: '' }]);
    const [rateRows, setRateRows] = useState([{ id: 1, propertyType: '', unitType: '', min: '', max: '', interval: '' }]);
    const [ticketRows, setTicketRows] = useState([{ id: 1, propertyType: '', unitType: '', min: '', max: '', interval: '' }]);

    const [isAnalysisResultsOpen, setIsAnalysisResultsOpen] = useState(true);
    const [areaAnalysisResults, setAreaAnalysisResults] = useState([]);
    const [rateAnalysisResults, setRateAnalysisResults] = useState([]);
    const [ticketSizeAnalysisResults, setTicketSizeAnalysisResults] = useState([]);

    const handleAreaRowChange = (id, field, value) => {
        setAreaRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleRateRowChange = (id, field, value) => {
        setRateRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleTicketRowChange = (id, field, value) => {
        setTicketRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleAnalyzeArea = async (overrideTimeFilter) => {
        const filterToUse = (typeof overrideTimeFilter === 'string') ? overrideTimeFilter : timeFilter;
        const results = [];
        const queries = [];
        
        let conversionFactor = 1;
        if (areaUnit === 'sq ft') conversionFactor = 0.092903;
        else if (areaUnit === 'sq yd') conversionFactor = 0.836127;
        else if (areaUnit === 'acres') conversionFactor = 4046.86;
        else if (areaUnit === 'hectares') conversionFactor = 10000;
        
        areaRows.forEach(row => {
            const min = Number(row.min);
            const max = Number(row.max);
            const interval = Number(row.interval);

            if (min > 0 && max > 0 && interval > 0 && max >= min) {
                const tableData = {
                    id: row.id,
                    propertyType: row.propertyType || dbPropertyTypes[0] || 'Flat',
                    unitType: row.unitType || dbUnitTypes[0] || '1Bhk',
                    rows: []
                };
                
                const queryData = {
                    id: row.id,
                    property_type: tableData.propertyType,
                    unit_type: tableData.unitType,
                    ranges: []
                };

                let currentMin = min;
                while (currentMin <= max) {
                    let currentMax = currentMin + interval - 1;
                    if (currentMax > max || (max - currentMax < interval / 2)) {
                        currentMax = max;
                    }

                    tableData.rows.push({
                        id: currentMin + '-' + currentMax,
                        rangeMin: currentMin,
                        rangeMax: currentMax,
                        count: null
                    });
                    
                    queryData.ranges.push({
                        id: currentMin + '-' + currentMax,
                        min_sqm: currentMin * conversionFactor,
                        max_sqm: currentMax * conversionFactor
                    });
                    
                    if (currentMax === max) break;
                    currentMin = currentMax + 1;
                }
                
                results.push(tableData);
                queries.push(queryData);
            }
        });
        
        if (results.length === 0) {
            alert("Please enter valid Min, Max, and Interval values for at least one row.");
            return;
        }

        setAreaAnalysisResults([...results]);
        setIsAnalysisResultsOpen(true);
        setIsAnalyzingArea(true);

        try {
            const savedLandData = localStorage.getItem("Land Identification");
            let reqCity = "";
            let reqLoc = "";
            if (savedLandData) {
                const parsedLand = JSON.parse(savedLandData);
                reqCity = parsedLand.location || parsedLand.city || "";
                reqLoc = parsedLand.village || parsedLand.villageName || "";
            }

            const res = await fetch(apiUrl("/new_rate_simulator/simulator/area-range-analysis/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    city_name: reqCity,
                    location_name: reqLoc,
                    queries: queries,
                    time_filter: filterToUse
                })
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    json.data.forEach(apiData => {
                        const targetResult = results.find(r => r.id === apiData.id);
                        if (targetResult && apiData.counts) {
                            targetResult.rows.forEach(rRow => {
                                if (apiData.counts[rRow.id] !== undefined) {
                                    rRow.count = apiData.counts[rRow.id];
                                } else {
                                    rRow.count = 0;
                                }
                            });
                        }
                    });
                }
            } else {
                results.forEach(r => r.rows.forEach(row => { row.count = 0; }));
            }
        } catch (e) {
            console.error("Failed to analyze area", e);
            results.forEach(r => r.rows.forEach(row => { row.count = 0; }));
        } finally {
            setIsAnalyzingArea(false);
            setAreaAnalysisResults([...results]);
        }
    };

    const handleTimeFilterChange = (e) => {
        const newFilter = e.target.value;
        setTimeFilter(newFilter);
        if (areaAnalysisResults.length > 0) {
            handleAnalyzeArea(newFilter);
        }
    };

    const handleRateTimeFilterChange = (e) => {
        const newFilter = e.target.value;
        setRateTimeFilter(newFilter);
        if (rateAnalysisResults.length > 0) {
            handleAnalyzeRate(newFilter);
        }
    };

    const handleAnalyzeRate = async (overrideTimeFilter) => {
        const filterToUse = (typeof overrideTimeFilter === 'string') ? overrideTimeFilter : rateTimeFilter;
        const results = [];
        const queries = [];
        
        let conversionFactor = 1;
        if (areaUnit === 'sq ft') conversionFactor = 0.092903;
        else if (areaUnit === 'sq yd') conversionFactor = 0.836127;
        else if (areaUnit === 'acres') conversionFactor = 4046.86;
        else if (areaUnit === 'hectares') conversionFactor = 10000;

        rateRows.forEach(row => {
            const min = Number(row.min);
            const max = Number(row.max);
            const interval = Number(row.interval);

            if (min > 0 && max > 0 && interval > 0 && max >= min) {
                const tableData = {
                    id: row.id,
                    propertyType: row.propertyType || dbPropertyTypes[0] || 'Flat',
                    unitType: row.unitType || dbUnitTypes[0] || '1Bhk',
                    rows: []
                };
                
                const queryData = {
                    id: row.id,
                    property_type: tableData.propertyType,
                    unit_type: tableData.unitType,
                    ranges: []
                };

                let currentMin = min;
                while (currentMin <= max) {
                    let currentMax = currentMin + interval - 1;
                    if (currentMax > max || (max - currentMax < interval / 2)) {
                        currentMax = max;
                    }
                    
                    tableData.rows.push({
                        id: currentMin + '-' + currentMax,
                        rangeMin: currentMin,
                        rangeMax: currentMax,
                        count: null
                    });
                    
                    queryData.ranges.push({
                        id: currentMin + '-' + currentMax,
                        min_rate: currentMin,
                        max_rate: currentMax
                    });
                    
                    if (currentMax === max) break;
                    currentMin = currentMax + 1;
                }
                
                results.push(tableData);
                queries.push(queryData);
            }
        });
        
        if (results.length === 0) {
            alert("Please enter valid Min, Max, and Interval values for at least one row.");
            return;
        }

        setRateAnalysisResults([...results]);
        setIsAnalysisResultsOpen(true);
        setIsAnalyzingRate(true);

        try {
            const savedLandData = localStorage.getItem("Land Identification");
            let reqCity = "";
            let reqLoc = "";
            if (savedLandData) {
                const parsedLand = JSON.parse(savedLandData);
                reqCity = parsedLand.location || parsedLand.city || "";
                reqLoc = parsedLand.village || parsedLand.villageName || "";
            }

            const res = await fetch(apiUrl("/new_rate_simulator/simulator/rate-range-analysis/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    city_name: reqCity,
                    location_name: reqLoc,
                    queries: queries,
                    time_filter: filterToUse,
                    conversion_factor: conversionFactor
                })
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    json.data.forEach(apiData => {
                        const targetResult = results.find(r => r.id === apiData.id);
                        if (targetResult && apiData.counts) {
                            targetResult.rows.forEach(rRow => {
                                if (apiData.counts[rRow.id] !== undefined) {
                                    rRow.count = apiData.counts[rRow.id];
                                } else {
                                    rRow.count = 0;
                                }
                            });
                        }
                    });
                }
            } else {
                results.forEach(r => r.rows.forEach(row => { row.count = 0; }));
            }
        } catch (e) {
            console.error("Failed to analyze rate", e);
            results.forEach(r => r.rows.forEach(row => { row.count = 0; }));
        } finally {
            setIsAnalyzingRate(false);
            setRateAnalysisResults([...results]);
        }
    };

    const handleTicketSizeTimeFilterChange = (e) => {
        const newFilter = e.target.value;
        setTicketSizeTimeFilter(newFilter);
        if (ticketSizeAnalysisResults.length > 0) {
            handleAnalyzeTicketSize(newFilter);
        }
    };

    const handleAnalyzeTicketSize = async (overrideTimeFilter) => {
        const filterToUse = (typeof overrideTimeFilter === 'string') ? overrideTimeFilter : ticketSizeTimeFilter;
        const results = [];
        const queries = [];
        
        ticketRows.forEach(row => {
            const min = Number(row.min);
            const max = Number(row.max);
            const interval = Number(row.interval);

            if (min > 0 && max > 0 && interval > 0 && max >= min) {
                const tableData = {
                    id: row.id,
                    propertyType: row.propertyType || dbPropertyTypes[0] || 'Flat',
                    unitType: row.unitType || dbUnitTypes[0] || '1Bhk',
                    rows: []
                };
                
                const queryData = {
                    id: row.id,
                    property_type: tableData.propertyType,
                    unit_type: tableData.unitType,
                    ranges: []
                };

                let currentMin = min;
                while (currentMin <= max) {
                    let currentMax = currentMin + interval - 1;
                    if (currentMax > max || (max - currentMax < interval / 2)) {
                        currentMax = max;
                    }
                    
                    tableData.rows.push({
                        id: currentMin + '-' + currentMax,
                        rangeMin: currentMin,
                        rangeMax: currentMax,
                        count: null
                    });
                    
                    queryData.ranges.push({
                        id: currentMin + '-' + currentMax,
                        min: currentMin,
                        max: currentMax
                    });
                    
                    if (currentMax === max) break;
                    currentMin = currentMax + 1;
                }
                
                results.push(tableData);
                queries.push(queryData);
            }
        });
        
        if (results.length === 0) {
            alert("Please enter valid Min, Max, and Interval values for at least one row.");
            return;
        }

        setTicketSizeAnalysisResults([...results]);
        setIsAnalysisResultsOpen(true);
        setIsAnalyzingTicketSize(true);

        try {
            const savedLandData = localStorage.getItem("Land Identification");
            let reqCity = "";
            let reqLoc = "";
            if (savedLandData) {
                const parsedLand = JSON.parse(savedLandData);
                reqCity = parsedLand.location || parsedLand.city || "";
                reqLoc = parsedLand.village || parsedLand.villageName || "";
            }

            const res = await fetch(apiUrl("/new_rate_simulator/simulator/ticket-size-analysis/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    city_name: reqCity,
                    location_name: reqLoc,
                    queries: queries,
                    time_filter: filterToUse
                })
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    json.data.forEach(apiData => {
                        const targetResult = results.find(r => r.id === apiData.id);
                        if (targetResult && apiData.counts) {
                            targetResult.rows.forEach(rRow => {
                                if (apiData.counts[rRow.id] !== undefined) {
                                    rRow.count = apiData.counts[rRow.id];
                                } else {
                                    rRow.count = 0;
                                }
                            });
                        }
                    });
                }
            } else {
                results.forEach(r => r.rows.forEach(row => { row.count = 0; }));
            }
        } catch (e) {
            console.error("Failed to analyze ticket size", e);
            results.forEach(r => r.rows.forEach(row => { row.count = 0; }));
        } finally {
            setIsAnalyzingTicketSize(false);
            setTicketSizeAnalysisResults([...results]);
        }
    };

    const addRow = (setter) => {
        setter(prev => [...prev, { id: Date.now() + Math.random(), propertyType: dbPropertyTypes[0] || '', unitType: dbUnitTypes[0] || '', min: '', max: '', interval: '' }]);
    };
    const removeRow = (setter, id) => {
        setter(prev => prev.filter(row => row.id !== id));
    };

    const [productMixRows, setProductMixRows] = useState([
        { id: 1, assetClass: 'Residential', propertyType: 'Apartment', unitMix: 'Studio', mode: 'Range', minArea: '', maxArea: '', pointArea: '', rate: '', allottedArea: '' }
    ]);

    const totalAllottedArea = productMixRows.reduce((sum, row) => sum + (Number(row.allottedArea) || 0), 0);

    const formatCurrency = (val) => {
        if (!val || isNaN(val)) return '-';
        return Number(val).toLocaleString();
    };

    const handleProductMixChange = (id, field, value) => {
        setProductMixRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const addProductMixRow = () => {
        setProductMixRows(prev => [...prev, { id: Date.now(), assetClass: 'Residential', propertyType: 'Apartment', unitMix: 'Studio', mode: 'Range', minArea: '', maxArea: '', pointArea: '', rate: '', allottedArea: '' }]);
    };

    const removeProductMixRow = (id) => {
        setProductMixRows(prev => prev.filter(row => row.id !== id));
    };

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
                    min-height: 200px;
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
                }
                .pm-section-card {
                    background: ${theme === "dark" ? "#1e232b" : "#ffffff"};
                    border: 1px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                    border-radius: 16px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
                }
                .pm-section-header {
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    cursor: pointer;
                    background: transparent;
                    transition: background 0.2s;
                    border-radius: 16px 16px 0 0;
                }
                .pm-section-header:hover {
                    background: ${theme === "dark" ? "#242931" : "#f8fafc"};
                }
                .pm-section-eyebrow {
                    font-size: 11px;
                    letter-spacing: 0.1em;
                    color: ${theme === "dark" ? "#9ca3af" : "#64748b"};
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }
                .pm-section-maintitle {
                    font-size: 20px;
                    font-weight: 800;
                    color: ${theme === "dark" ? "#f8fafc" : "#0f172a"};
                    margin: 0;
                }
                .pm-section-body {
                    padding: 0 24px 24px 24px;
                    background: transparent;
                }
                .pm-chevron-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: ${theme === "dark" ? "#2a3038" : "#f1f5f9"};
                    color: ${theme === "dark" ? "#9ca3af" : "#475569"};
                    transition: all 0.2s;
                }
                .pm-table-container {
                    background: ${theme === "dark" ? "#1e232b" : "#ffffff"};
                    border: 1px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                    border-radius: 12px;
                    overflow: hidden;
                    margin-bottom: 24px;
                }
                .pm-table-container:last-child {
                    margin-bottom: 0;
                }
                .pm-table-title {
                    padding: 12px 20px;
                    background: ${theme === "dark" ? "#242931" : "#f8fafc"};
                    border-bottom: 1px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                    font-size: 14px;
                    font-weight: 700;
                    color: ${theme === "dark" ? "#f8fafc" : "#0f172a"};
                    margin: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .pm-action-btn {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 6px 14px;
                    border-radius: 50px !important;
                    background: ${theme === "dark" ? "#eef2f7" : "#0f172a"};
                    color: ${theme === "dark" ? "#0f172a" : "#ffffff"};
                    border: none;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.2s;
                }
                .pm-action-btn:hover {
                    background: ${theme === "dark" ? "#ffffff" : "#1e293b"};
                    color: ${theme === "dark" ? "#0f172a" : "#ffffff"};
                }
                .pm-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .pm-global-select {
                    font-size: 13px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                    background-color: ${theme === "dark" ? "#1a1d24" : "#ffffff"};
                    color: ${theme === "dark" ? "#eef2f7" : "#334155"};
                }
                .pm-global-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: ${theme === "dark" ? "#9ca3af" : "#64748b"};
                    margin-bottom: 6px;
                }
                .pm-table th {
                    background: ${theme === "dark" ? "#1a1d24" : "#ffffff"};
                    color: ${theme === "dark" ? "#9ca3af" : "#64748b"};
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 10px 8px;
                    text-align: center;
                    border: 1px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                }
                .pm-table td {
                    padding: 8px;
                    color: ${theme === "dark" ? "#eef2f7" : "#334155"};
                    font-size: 12px;
                    border: 1px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                    text-align: center;
                }
                .pm-table-input {
                    font-size: 12px !important;
                    padding: 4px 8px !important;
                    min-width: 60px;
                }
                .pm-table-select {
                    font-size: 12px !important;
                    padding: 4px 24px 4px 8px !important;
                    min-width: 90px;
                }
                .pm-asset-chip {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    background: ${theme === "dark" ? "#2a323c" : "#f1f5f9"};
                    color: ${theme === "dark" ? "#eef2f7" : "#475569"};
                    border: 1px solid ${theme === "dark" ? "#3b4351" : "#e2e8f0"};
                }
                .pm-tfoot-summary {
                    font-weight: 800;
                    background: ${theme === "dark" ? "#1e232b" : "#f8fafc"};
                }
                .pm-tfoot-summary td {
                    border-top: 2px solid ${theme === "dark" ? "#323842" : "#e2e8f0"};
                }
                .ticket-size-text {
                    font-weight: 700;
                    color: ${theme === "dark" ? "#60a5fa" : "#2563eb"};
                    font-size: 11px;
                }
            `}</style>
            <div className="unit-design-header">
                <div className="unit-design-eyebrow">Selected Section</div>
                <h2 className="unit-design-title">Product Mix - Ticket Size</h2>
            </div>
            <div className="unit-design-body">
                {/* 1) Analysis Mode */}
                <div className="pm-section-card">
                    <div 
                        className="pm-section-header"
                        onClick={() => setIsAnalysisModeOpen(!isAnalysisModeOpen)}
                    >
                        <div>
                            <div className="pm-section-eyebrow">SUBSECTION 1</div>
                            <div className="pm-section-maintitle">Analysis Mode</div>
                        </div>
                        <div className="pm-chevron-btn">
                            {isAnalysisModeOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                        </div>
                    </div>
                    {isAnalysisModeOpen && (
                        <div className="pm-section-body">
                            {/* Global Inputs */}
                            <div className="row mb-4">
                                <div className="col-md-2">
                                    <div className="pm-global-label">Area Unit</div>
                                    <select className="form-select pm-global-select shadow-none" value={areaUnit} onChange={(e) => setAreaUnit(e.target.value)}>
                                        <option value="sq ft">sq ft</option>
                                        <option value="sq m">sq m</option>
                                        <option value="sq yd">sq yd</option>
                                        <option value="acre">acre</option>
                                        <option value="hectare">hectare</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <div className="pm-global-label">Currency</div>
                                    <input 
                                        type="text" 
                                        className="form-control pm-global-select shadow-none" 
                                        style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} 
                                        value={currency} 
                                        disabled 
                                    />
                                </div>
                            </div>

                            <div className="row g-4">
                                {/* Table 1: Area Range Analysis */}
                                <div className="col-md-4">
                                    <div className="pm-table-container h-100 mb-0">
                                        <div className="pm-table-title">
                                            <span>Area Range Analysis</span>
                                            <button className="pm-action-btn" onClick={() => handleAnalyzeArea()} disabled={isAnalyzingArea}>
                                                {isAnalyzingArea ? (
                                                    <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Analyzing...</>
                                                ) : "Analyze Area"}
                                            </button>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="pm-table">
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Property Type</th>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Unit Type</th>
                                                        <th colSpan="2" style={{ borderBottom: 'none', paddingBottom: '4px' }}>Area Range For Analysis</th>
                                                        <th rowSpan="2" className="align-middle" style={{ whiteSpace: 'normal', width: '20%' }}>Intervals for Area Range</th>
                                                        <th rowSpan="2" style={{ width: '30px' }}></th>
                                                    </tr>
                                                    <tr>
                                                        <th style={{ paddingTop: 0, width: '18%' }}>Min</th>
                                                        <th style={{ paddingTop: 0, width: '18%' }}>Max</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {areaRows.map((row, index) => (
                                                        <tr key={row.id}>
                                                            <td className="align-middle">
                                                                <PropertyTypeSelect
                                                                    options={dbPropertyTypes}
                                                                    value={row.propertyType}
                                                                    onChange={(e) => handleAreaRowChange(row.id, 'propertyType', e.target.value)}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <UnitTypeSelect
                                                                    options={dbUnitTypes}
                                                                    value={row.unitType}
                                                                    onChange={(e) => handleAreaRowChange(row.id, 'unitType', e.target.value)}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Min" value={row.min || ''} onChange={(e) => handleAreaRowChange(row.id, 'min', e.target.value)} style={{ minWidth: '70px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Max" value={row.max || ''} onChange={(e) => handleAreaRowChange(row.id, 'max', e.target.value)} style={{ minWidth: '70px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Interval" value={row.interval || ''} onChange={(e) => handleAreaRowChange(row.id, 'interval', e.target.value)} style={{ minWidth: '50px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle text-center px-1" style={{ width: '30px', borderLeft: 'none' }}>
                                                                {index > 0 && (
                                                                    <button 
                                                                        className="btn btn-sm text-danger p-0 border-0 shadow-none" 
                                                                        onClick={() => removeRow(setAreaRows, row.id)}
                                                                        title="Delete row"
                                                                    >
                                                                        <FaTrash size={12} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr>
                                                        <td colSpan="6" className="text-center p-2" style={{ border: 'none' }}>
                                                            <button 
                                                                className="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                                                                onClick={() => addRow(setAreaRows)}
                                                                style={{ width: '28px', height: '28px' }}
                                                                title="Add row"
                                                            >
                                                                <FaPlus size={12} className="text-secondary" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Table 2: Rate Range Analysis */}
                                <div className="col-md-4">
                                    <div className="pm-table-container h-100 mb-0">
                                        <div className="pm-table-title">
                                            <span>Rate Range Analysis</span>
                                            <button className="pm-action-btn" onClick={() => handleAnalyzeRate()} disabled={isAnalyzingRate}>
                                                {isAnalyzingRate ? (
                                                    <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Analyzing...</>
                                                ) : "Analyze Rate"}
                                            </button>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="pm-table">
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Property Type</th>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Unit Type</th>
                                                        <th colSpan="2" style={{ borderBottom: 'none', paddingBottom: '4px' }}>Rate Range</th>
                                                        <th rowSpan="2" className="align-middle" style={{ whiteSpace: 'normal', width: '20%' }}>Intervals for Rate Range</th>
                                                        <th rowSpan="2" style={{ width: '30px' }}></th>
                                                    </tr>
                                                    <tr>
                                                        <th style={{ paddingTop: 0, width: '18%' }}>Min</th>
                                                        <th style={{ paddingTop: 0, width: '18%' }}>Max</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rateRows.map((row, index) => (
                                                        <tr key={row.id}>
                                                            <td className="align-middle">
                                                                <PropertyTypeSelect
                                                                    value={row.propertyType}
                                                                    onChange={(e) => handleRateRowChange(row.id, 'propertyType', e.target.value)}
                                                                    options={dbPropertyTypes}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <UnitTypeSelect
                                                                    value={row.unitType}
                                                                    onChange={(e) => handleRateRowChange(row.id, 'unitType', e.target.value)}
                                                                    options={dbUnitTypes}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Min" value={row.min || ''} onChange={(e) => handleRateRowChange(row.id, 'min', e.target.value)} style={{ minWidth: '70px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Max" value={row.max || ''} onChange={(e) => handleRateRowChange(row.id, 'max', e.target.value)} style={{ minWidth: '70px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Interval" value={row.interval || ''} onChange={(e) => handleRateRowChange(row.id, 'interval', e.target.value)} style={{ minWidth: '50px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle text-center px-1" style={{ width: '30px', borderLeft: 'none' }}>
                                                                {index > 0 && (
                                                                    <button 
                                                                        className="btn btn-sm text-danger p-0 border-0 shadow-none" 
                                                                        onClick={() => removeRow(setRateRows, row.id)}
                                                                        title="Delete row"
                                                                    >
                                                                        <FaTrash size={12} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr>
                                                        <td colSpan="6" className="text-center p-2" style={{ border: 'none' }}>
                                                            <button 
                                                                className="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                                                                onClick={() => addRow(setRateRows)}
                                                                style={{ width: '28px', height: '28px' }}
                                                                title="Add row"
                                                            >
                                                                <FaPlus size={12} className="text-secondary" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Table 3: Ticket Size Analysis */}
                                <div className="col-md-4">
                                    <div className="pm-table-container h-100 mb-0">
                                        <div className="pm-table-title">
                                            <span>Ticket Size Analysis</span>
                                            <button className="pm-action-btn" onClick={handleAnalyzeTicketSize}>Analyze Ticket Size</button>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="pm-table">
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Property Type</th>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Unit Type</th>
                                                        <th colSpan="2" style={{ borderBottom: 'none', paddingBottom: '4px' }}>Ticket Size Range</th>
                                                        <th rowSpan="2" className="align-middle" style={{ whiteSpace: 'normal', width: '20%' }}>Intervals for Ticket Size Range</th>
                                                        <th rowSpan="2" style={{ width: '30px' }}></th>
                                                    </tr>
                                                    <tr>
                                                        <th style={{ paddingTop: 0, width: '18%' }}>Min</th>
                                                        <th style={{ paddingTop: 0, width: '18%' }}>Max</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ticketRows.map((row, index) => (
                                                        <tr key={row.id}>
                                                            <td className="align-middle">
                                                                <PropertyTypeSelect
                                                                    options={dbPropertyTypes}
                                                                    value={row.propertyType}
                                                                    onChange={(e) => handleTicketRowChange(row.id, 'propertyType', e.target.value)}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <UnitTypeSelect
                                                                    options={dbUnitTypes}
                                                                    value={row.unitType}
                                                                    onChange={(e) => handleTicketRowChange(row.id, 'unitType', e.target.value)}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Min" value={row.min || ''} onChange={(e) => handleTicketRowChange(row.id, 'min', e.target.value)} style={{ minWidth: '70px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Max" value={row.max || ''} onChange={(e) => handleTicketRowChange(row.id, 'max', e.target.value)} style={{ minWidth: '70px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Interval" value={row.interval || ''} onChange={(e) => handleTicketRowChange(row.id, 'interval', e.target.value)} style={{ minWidth: '50px', width: '100%' }} />
                                                            </td>
                                                            <td className="align-middle text-center px-1" style={{ width: '30px', borderLeft: 'none' }}>
                                                                {index > 0 && (
                                                                    <button 
                                                                        className="btn btn-sm text-danger p-0 border-0 shadow-none" 
                                                                        onClick={() => removeRow(setTicketRows, row.id)}
                                                                        title="Delete row"
                                                                    >
                                                                        <FaTrash size={12} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr>
                                                        <td colSpan="6" className="text-center p-2" style={{ border: 'none' }}>
                                                            <button 
                                                                className="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                                                                onClick={() => addRow(setTicketRows)}
                                                                style={{ width: '28px', height: '28px' }}
                                                                title="Add row"
                                                            >
                                                                <FaPlus size={12} className="text-secondary" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 1.5) Analysis Results */}
                {(areaAnalysisResults.length > 0 || rateAnalysisResults.length > 0 || ticketSizeAnalysisResults.length > 0) && (
                    <div className="pm-section-card mb-4">
                        <div 
                            className="pm-section-header"
                            onClick={() => setIsAnalysisResultsOpen(!isAnalysisResultsOpen)}
                        >
                            <div>
                                <div className="pm-section-eyebrow">SUBSECTION 1.5</div>
                                <div className="pm-section-maintitle">Analysis Results</div>
                            </div>
                            <div className="pm-chevron-btn">
                                {isAnalysisResultsOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                            </div>
                        </div>
                        {isAnalysisResultsOpen && (
                            <div className="pm-section-body">
                                <div className="row g-4">
                                    {areaAnalysisResults.map((result) => (
                                        <div className="col-md-4" key={result.id}>
                                            <div className="pm-table-container h-100 mb-0">
                                                <div className="pm-table-title">
                                                    <span>Area Range Analysis ({result.propertyType ? `${result.propertyType} - ` : ''}{result.unitType})</span>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="pm-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="align-middle">Property Type</th>
                                                                <th className="align-middle">Unit Type</th>
                                                                <th className="align-middle text-center">Area Range<br/><span style={{fontWeight: 400, fontSize: '10px'}}>(Min - Max)</span></th>
                                                                <th className="align-middle text-center">
                                                                    Transaction Count
                                                                    <div className="mt-1">
                                                                        <select 
                                                                            className="form-select form-select-sm d-inline-block shadow-none" 
                                                                            style={{fontSize: '11px', padding: '0.1rem 0.5rem', width: 'auto'}}
                                                                            value={timeFilter}
                                                                            onChange={handleTimeFilterChange}
                                                                        >
                                                                            <option value="Last 3 years">Last 3 years</option>
                                                                            <option value="Last 2 years">Last 2 years</option>
                                                                            <option value="Last 1 year">Last 1 year</option>
                                                                            <option value="Last 6 Months">Last 6 Months</option>
                                                                        </select>
                                                                    </div>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.rows.map(r => (
                                                                <tr key={r.id}>
                                                                    <td className="align-middle fw-medium">{result.propertyType || 'Apartment'}</td>
                                                                    <td className="align-middle fw-medium">{result.unitType}</td>
                                                                    <td className="align-middle text-center">{r.rangeMin.toLocaleString()} - {r.rangeMax.toLocaleString()}</td>
                                                                    <td className="align-middle text-center">
                                                                        {r.count === null ? (
                                                                            <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                                                                                <span style={{ color: '#2ea868' }}>Loading data...</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill">{r.count}</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {rateAnalysisResults.map((result) => (
                                        <div className="col-md-4" key={result.id}>
                                            <div className="pm-table-container h-100 mb-0">
                                                <div className="pm-table-title">
                                                    <span>Rate Range Analysis ({result.propertyType ? `${result.propertyType} - ` : ''}{result.unitType})</span>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="pm-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="align-middle">Property Type</th>
                                                                <th className="align-middle">Unit Type</th>
                                                                <th className="align-middle text-center">Rate Range<br/><span style={{fontWeight: 400, fontSize: '10px'}}>(Min - Max)</span></th>
                                                                <th className="align-middle text-center">
                                                                    Transaction Count
                                                                    <div className="mt-1">
                                                                        <select 
                                                                            className="form-select form-select-sm d-inline-block shadow-none" 
                                                                            style={{fontSize: '11px', padding: '0.1rem 0.5rem', width: 'auto'}}
                                                                            value={rateTimeFilter}
                                                                            onChange={handleRateTimeFilterChange}
                                                                        >
                                                                            <option value="Last 3 years">Last 3 years</option>
                                                                            <option value="Last 2 years">Last 2 years</option>
                                                                            <option value="Last 1 year">Last 1 year</option>
                                                                            <option value="Last 6 Months">Last 6 Months</option>
                                                                        </select>
                                                                    </div>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.rows.map(r => (
                                                                <tr key={r.id}>
                                                                    <td className="align-middle fw-medium">{result.propertyType || 'Apartment'}</td>
                                                                    <td className="align-middle fw-medium">{result.unitType}</td>
                                                                    <td className="align-middle text-center">{r.rangeMin.toLocaleString()} - {r.rangeMax.toLocaleString()}</td>
                                                                    <td className="align-middle text-center">
                                                                        {r.count === null ? (
                                                                            <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                                                                                <span style={{ color: '#2ea868' }}>Loading data...</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill">{r.count}</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {ticketSizeAnalysisResults.map((result) => (
                                        <div className="col-md-4" key={result.id}>
                                            <div className="pm-table-container h-100 mb-0">
                                                <div className="pm-table-title">
                                                    <span>Ticket Size Analysis ({result.propertyType ? `${result.propertyType} - ` : ''}{result.unitType})</span>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="pm-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="align-middle">Property Type</th>
                                                                <th className="align-middle">Unit Type</th>
                                                                <th className="align-middle text-center">Ticket Size Range<br/><span style={{fontWeight: 400, fontSize: '10px'}}>(Min - Max)</span></th>
                                                                <th className="align-middle text-center">
                                                                    Transaction Count
                                                                    <div className="mt-1">
                                                                        <select 
                                                                            className="form-select form-select-sm d-inline-block shadow-none" 
                                                                            style={{fontSize: '11px', padding: '0.1rem 0.5rem', width: 'auto'}}
                                                                            value={ticketSizeTimeFilter}
                                                                            onChange={handleTicketSizeTimeFilterChange}
                                                                        >
                                                                            <option value="Last 3 years">Last 3 years</option>
                                                                            <option value="Last 2 years">Last 2 years</option>
                                                                            <option value="Last 1 year">Last 1 year</option>
                                                                            <option value="Last 6 Months">Last 6 Months</option>
                                                                        </select>
                                                                    </div>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.rows.map(r => (
                                                                <tr key={r.id}>
                                                                    <td className="align-middle fw-medium">{result.propertyType || 'Apartment'}</td>
                                                                    <td className="align-middle fw-medium">{result.unitType}</td>
                                                                    <td className="align-middle text-center">{r.rangeMin.toLocaleString()} - {r.rangeMax.toLocaleString()}</td>
                                                                    <td className="align-middle text-center">
                                                                        {r.count === null ? (
                                                                            <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                                                                                <span style={{ color: '#2ea868' }}>Loading data...</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill">{r.count}</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2) Applied Product Mix */}
                <div className="pm-section-card mb-2">
                    <div 
                        className="pm-section-header"
                        onClick={() => setIsAppliedProductMixOpen(!isAppliedProductMixOpen)}
                    >
                        <div>
                            <div className="pm-section-eyebrow">SUBSECTION 2</div>
                            <div className="pm-section-maintitle">Applied Product Mix</div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center rounded-pill" style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 16px', fontSize: '14px', fontWeight: 600 }}>
                                <span style={{ marginRight: '6px', fontWeight: 500, opacity: 0.9 }}>Currency:</span>
                                <span>{currency}</span>
                            </div>
                            <div className="d-flex align-items-center rounded-pill" style={{ backgroundColor: '#e8f7ed', color: '#16a34a', padding: '6px 16px', fontSize: '14px', fontWeight: 600 }}>
                                <span style={{ marginRight: '6px', fontWeight: 500, opacity: 0.9 }}>Gross Floor Area:</span>
                                <span>{Number(grossFloorArea).toLocaleString()} {areaUnit.toUpperCase()}</span>
                            </div>
                            <div className="pm-chevron-btn">
                                {isAppliedProductMixOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                            </div>
                        </div>
                    </div>
                    {isAppliedProductMixOpen && (
                        <div className="pm-section-body">
                            <div className="row mb-4">
                                <div className="col-md-2">
                                    <div className="pm-global-label">Area Unit</div>
                                    <select className="form-select pm-global-select shadow-none" value={areaUnit} onChange={(e) => setAreaUnit(e.target.value)}>
                                        <option value="sq ft">sq ft</option>
                                        <option value="sq m">sq m</option>
                                        <option value="sq yd">sq yd</option>
                                        <option value="acre">acre</option>
                                        <option value="hectare">hectare</option>
                                    </select>
                                </div>
                            </div>
                            <div className="table-responsive">
                                <table className="pm-table">
                                    <thead>
                                        <tr>
                                            <th>Asset Class</th>
                                            <th>Property Type</th>
                                            <th>Unit Mix</th>
                                            <th>Saleable Area ({areaUnit.toUpperCase()})</th>
                                            <th>Rate ({currency}/{areaUnit.toUpperCase()})</th>
                                            <th>Ticket Size</th>
                                            <th>Allotted Area ({areaUnit.toUpperCase()})</th>
                                            <th>Mix %</th>
                                            <th style={{ width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productMixRows.map((row, index) => {
                                            const mixPercent = grossFloorArea > 0 ? ((Number(row.allottedArea) || 0) / grossFloorArea * 100).toFixed(1) : "0.0";
                                            let ticketSizeDisplay = "-";
                                            if (row.rate) {
                                                if (row.mode === 'Range' && row.minArea && row.maxArea) {
                                                    ticketSizeDisplay = `${currency} ${formatCurrency(row.minArea * row.rate)} - ${currency} ${formatCurrency(row.maxArea * row.rate)}`;
                                                } else if (row.mode === 'Point' && row.pointArea) {
                                                    ticketSizeDisplay = `${currency} ${formatCurrency(row.pointArea * row.rate)}`;
                                                }
                                            }

                                            return (
                                                <tr key={row.id}>
                                                    <td className="align-middle">
                                                        <select className="form-select pm-table-select shadow-none mx-auto" value={row.assetClass} onChange={(e) => handleProductMixChange(row.id, 'assetClass', e.target.value)} style={{ minWidth: '110px' }}>
                                                            <option value="Residential">Residential</option>
                                                            <option value="Commercial">Commercial</option>
                                                        </select>
                                                    </td>
                                                    <td className="align-middle">
                                                        <PropertyTypeSelect
                                                            options={dbPropertyTypes}
                                                            value={row.propertyType}
                                                            onChange={(e) => handleProductMixChange(row.id, 'propertyType', e.target.value)}
                                                            isLoading={typesLoading}
                                                            style={{ margin: '0 auto', minWidth: '110px' }}
                                                        />
                                                    </td>
                                                    <td className="align-middle">
                                                        <UnitTypeSelect
                                                            options={dbUnitTypes}
                                                            value={row.unitMix}
                                                            onChange={(e) => handleProductMixChange(row.id, 'unitMix', e.target.value)}
                                                            isLoading={typesLoading}
                                                            style={{ margin: '0 auto', minWidth: '90px' }}
                                                        />
                                                    </td>
                                                    <td className="align-middle">
                                                        <div className="d-flex align-items-center justify-content-center gap-1">
                                                            <select className="form-select pm-table-select shadow-none" style={{ minWidth: '70px', padding: '4px 18px 4px 6px !important' }} value={row.mode} onChange={(e) => handleProductMixChange(row.id, 'mode', e.target.value)}>
                                                                <option value="Range">Range</option>
                                                                <option value="Point">Point</option>
                                                            </select>
                                                            {row.mode === 'Range' ? (
                                                                <>
                                                                    <input type="number" className="form-control pm-table-input shadow-none" placeholder="Min" value={row.minArea} onChange={(e) => handleProductMixChange(row.id, 'minArea', e.target.value)} style={{ width: '60px', minWidth: '60px' }} />
                                                                    <span className="text-muted" style={{ fontSize: '10px' }}>-</span>
                                                                    <input type="number" className="form-control pm-table-input shadow-none" placeholder="Max" value={row.maxArea} onChange={(e) => handleProductMixChange(row.id, 'maxArea', e.target.value)} style={{ width: '60px', minWidth: '60px' }} />
                                                                </>
                                                            ) : (
                                                                <input type="number" className="form-control pm-table-input shadow-none" placeholder="Point" value={row.pointArea} onChange={(e) => handleProductMixChange(row.id, 'pointArea', e.target.value)} style={{ width: '80px', minWidth: '80px' }} />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="align-middle">
                                                        <input type="number" className="form-control pm-table-input shadow-none text-center" value={row.rate} onChange={(e) => handleProductMixChange(row.id, 'rate', e.target.value)} style={{ width: '80px', margin: '0 auto', minWidth: '80px' }} />
                                                    </td>
                                                    <td className="align-middle ticket-size-text text-nowrap">
                                                        {ticketSizeDisplay}
                                                    </td>
                                                    <td className="align-middle">
                                                        <input type="number" className="form-control pm-table-input shadow-none text-center" value={row.allottedArea} onChange={(e) => handleProductMixChange(row.id, 'allottedArea', e.target.value)} style={{ width: '100px', margin: '0 auto', minWidth: '100px' }} />
                                                    </td>
                                                    <td className="align-middle fw-bold">
                                                        {mixPercent}%
                                                    </td>
                                                    <td className="align-middle text-center px-1">
                                                        {index > 0 && (
                                                            <button 
                                                                className="btn btn-sm text-danger p-0 border-0 shadow-none" 
                                                                onClick={() => removeProductMixRow(row.id)}
                                                                title="Delete row"
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr>
                                            <td colSpan="9" className="text-center p-2" style={{ border: 'none' }}>
                                                <button 
                                                    className="btn btn-sm btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                                                    onClick={addProductMixRow}
                                                    style={{ width: '28px', height: '28px' }}
                                                    title="Add row"
                                                >
                                                    <FaPlus size={12} className="text-secondary" />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="pm-tfoot-summary">
                                        <tr>
                                            <td colSpan="6" className="text-end pe-4">Total</td>
                                            <td className={`text-center ${totalAllottedArea !== grossFloorArea && grossFloorArea > 0 ? 'text-danger fw-bold' : ''}`}>
                                                {totalAllottedArea.toLocaleString()}
                                                {totalAllottedArea !== grossFloorArea && grossFloorArea > 0 && (
                                                    <div style={{ fontSize: '10px', marginTop: '2px' }}>(Target: {grossFloorArea.toLocaleString()})</div>
                                                )}
                                            </td>
                                            <td className={`text-center ${totalAllottedArea !== grossFloorArea && grossFloorArea > 0 ? 'text-danger fw-bold' : ''}`}>
                                                {(grossFloorArea > 0 ? (totalAllottedArea / grossFloorArea * 100) : 0).toFixed(1)}%
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductMixTicketSize;
