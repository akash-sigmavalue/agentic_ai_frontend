import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTrash, FaMapMarkerAlt, FaCrosshairs, FaBuilding, FaRulerCombined, FaCheck, FaFilter, FaClock, FaRegBuilding, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import Select from "react-select";
import { apiUrl } from "@/lib/api-client";

const formatProjectOption = ({ project, index }, { context }) => {
    if (context === "value") {
        return (
            <div className="d-flex align-items-center gap-2">
                <FaRegBuilding size={13} className="text-secondary" />
                <span className="fw-bold text-dark" style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#94a3b8", marginRight: "4px" }}>{index}.</span>
                    {project.project_name}
                </span>
            </div>
        );
    }

    return (
        <div className="d-flex align-items-center justify-content-between w-100">
            <div className="d-flex align-items-center gap-2">
                <div className="bg-light rounded p-1 d-flex align-items-center justify-content-center text-secondary">
                    <FaRegBuilding size={14} />
                </div>
                <div className="d-flex flex-column">
                    <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                        <span style={{ color: "#94a3b8", marginRight: "4px" }}>{index}.</span>
                        {project.project_name}
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px", lineHeight: "1.2" }}>
                        {project.distance_formatted} away
                    </span>
                </div>
            </div>
            <div className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1 ms-2" style={{ fontSize: "10px" }}>
                {project.total_transactions} sales
            </div>
        </div>
    );
};

const customSelectStyles = {
    control: (base) => ({
        ...base,
        minHeight: "34px",
        height: "34px",
        fontSize: "13px",
        fontWeight: "bold",
        borderRadius: "0.375rem",
        borderColor: "#cbd5e1",
        minWidth: "250px",
        boxShadow: "none",
        "&:hover": { borderColor: "#94a3b8" }
    }),
    valueContainer: (base) => ({
        ...base,
        padding: "0 8px",
    }),
    singleValue: (base) => ({
        ...base,
        color: "#1e293b",
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? "#eef7f4" : state.isFocused ? "#f8fafc" : "transparent",
        color: "#1e293b",
        cursor: "pointer",
        padding: "8px 12px",
        "&:active": { backgroundColor: "#d1fae5" }
    }),
    menu: (base) => ({
        ...base,
        zIndex: 9999,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        borderRadius: "0.5rem",
        overflow: "hidden",
        minWidth: "300px"
    }),
    menuList: (base) => ({
        ...base,
        padding: 0
    })
};


const ALL_UNITS_OPTION = "All Unit Configurations";

const DEFAULT_PROPERTY_TYPES = [
    "Flat", "Apartment", "Studio", "Villa", "Townhouse", 
    "Retail Shop", "Showroom", "Office", "Serviced Apartment", 
    "Hotel", "Industrial", "Warehouse", "Plot"
];

const DEFAULT_UNIT_TYPES = [
    ALL_UNITS_OPTION,
    "Studio", "1 Bed", "2 Bed", "3 Bed", ">3 Bed", 
    "1Bhk", "2Bhk", "3Bhk", "4Bhk", "Penthouse",
    "Small Office", "Medium Office", "Large Office", 
    "Retail Unit", "Showroom", "Mixed Unit"
];

const RESIDENTIAL_UNITS = ["Studio", "1 Bed", "2 Bed", "3 Bed", ">3 Bed", "1Bhk", "2Bhk", "3Bhk", "4Bhk", "Penthouse", "Duplex"];
const SHOP_UNITS = ["Retail Unit", "Showroom", "Shop", "Ground Floor Shop", "Kiosk"];
const OFFICE_UNITS = ["Small Office", "Medium Office", "Large Office", "Office Unit", "Full Floor"];
const GENERAL_UNITS = ["Studio", "1 Bed", "2 Bed", "3 Bed", ">3 Bed", "1Bhk", "2Bhk", "3Bhk", "Retail Unit", "Small Office", "Medium Office"];

const getUnitTypesForProperty = (propType, dbMap = {}, globalUnitTypes = []) => {
    let subList = [];
    if (propType) {
        const cleanProp = String(propType).trim();
        if (dbMap && dbMap[cleanProp] && Array.isArray(dbMap[cleanProp]) && dbMap[cleanProp].length > 0) {
            subList = dbMap[cleanProp];
        } else {
            const lower = cleanProp.toLowerCase();
            if (lower.includes("flat") || lower.includes("apartment") || lower.includes("villa") || lower.includes("townhouse") || lower.includes("studio") || lower.includes("residen")) {
                subList = (globalUnitTypes.length > 0 ? globalUnitTypes : DEFAULT_UNIT_TYPES).filter(u => {
                    const l = u.toLowerCase();
                    return !l.includes("office") && !l.includes("retail") && !l.includes("showroom") && !l.includes("warehouse") && !l.includes("industrial");
                });
                if (subList.length === 0) subList = RESIDENTIAL_UNITS;
            } else if (lower.includes("shop") || lower.includes("retail") || lower.includes("showroom")) {
                subList = (globalUnitTypes.length > 0 ? globalUnitTypes : DEFAULT_UNIT_TYPES).filter(u => {
                    const l = u.toLowerCase();
                    return l.includes("retail") || l.includes("shop") || l.includes("showroom") || l.includes("kiosk") || l.includes("commercial");
                });
                if (subList.length === 0) subList = SHOP_UNITS;
            } else if (lower.includes("office") || lower.includes("commer")) {
                subList = (globalUnitTypes.length > 0 ? globalUnitTypes : DEFAULT_UNIT_TYPES).filter(u => {
                    const l = u.toLowerCase();
                    return l.includes("office") || l.includes("commercial");
                });
                if (subList.length === 0) subList = OFFICE_UNITS;
            } else {
                subList = globalUnitTypes.length > 0 ? globalUnitTypes : GENERAL_UNITS;
            }
        }
    } else {
        subList = globalUnitTypes.length > 0 ? globalUnitTypes : GENERAL_UNITS;
    }

    const filteredSub = subList.filter(u => u !== ALL_UNITS_OPTION);
    return [ALL_UNITS_OPTION, ...filteredSub];
};

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
    const filteredOptions = (options && options.length > 0 ? options : DEFAULT_PROPERTY_TYPES).filter(
        opt => opt && !["other", "others"].includes(String(opt).trim().toLowerCase())
    );
    const list = filteredOptions.length > 0 ? filteredOptions : DEFAULT_PROPERTY_TYPES;
    return (
        <select 
            className="form-select pm-table-select shadow-none" 
            value={value || list[0] || 'Flat'} 
            onChange={onChange} 
            style={{ minWidth: '95px', ...style }}
        >
            {list.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    );
};

const UnitTypeSelect = ({ value, onChange, options = [], style, isLoading, propertyType, dbPropertyUnitMap }) => {
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
    const list = getUnitTypesForProperty(propertyType, dbPropertyUnitMap, options);
    const currentValue = value && list.includes(value) ? value : list[0] || ALL_UNITS_OPTION;
    return (
        <select 
            className="form-select pm-table-select shadow-none" 
            value={currentValue} 
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
    const [dbPropertyUnitMap, setDbPropertyUnitMap] = useState({});
    const [typeDataSourceInfo, setTypeDataSourceInfo] = useState({ isFallback: false, remark: '', dataSource: '' });
    const [typesLoading, setTypesLoading] = useState(false);
    const [isAnalyzingArea, setIsAnalyzingArea] = useState(false);
    const [isAnalyzingRate, setIsAnalyzingRate] = useState(false);
    const [isAnalyzingTicketSize, setIsAnalyzingTicketSize] = useState(false);
    const [subjectCity, setSubjectCity] = useState("");
    const [subjectLocation, setSubjectLocation] = useState("");

    // Universal Scope & Tab Filter States
    const [analysisViewMode, setAnalysisViewMode] = useState("location");
    const [analysisAppliedRadius, setAnalysisAppliedRadius] = useState(1000);
    const [analysisInputRadius, setAnalysisInputRadius] = useState(1000);
    const [analysisSelectedProject, setAnalysisSelectedProject] = useState("all");
    const [analysisNearbyProjects, setAnalysisNearbyProjects] = useState([]);
    const [analysisNearbyLimit, setAnalysisNearbyLimit] = useState(5);
    const [loadingAnalysisNearbyProjects, setLoadingAnalysisNearbyProjects] = useState(false);

    // Analysis View Tab: "overall" | "yoy" | "custom"
    const [analysisViewTab, setAnalysisViewTab] = useState("overall");
    const [activeResultPropertyTab, setActiveResultPropertyTab] = useState("all");
    
    const getLastOneYearDates = () => {
        const today = new Date();
        const endStr = today.toISOString().split('T')[0];
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);
        const startStr = lastYear.toISOString().split('T')[0];
        return { startStr, endStr };
    };

    const [customStartDate, setCustomStartDate] = useState(() => getLastOneYearDates().startStr);
    const [customEndDate, setCustomEndDate] = useState(() => getLastOneYearDates().endStr);
    const DEFAULT_YOY_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const [availableYears, setAvailableYears] = useState(DEFAULT_YOY_YEARS);

    // Fetch nearby projects when nearby mode is active
    useEffect(() => {
        if (analysisViewMode !== "nearby") return;

        let lat = null;
        let lng = null;
        let city = "";

        try {
            const landRaw = localStorage.getItem("Land Identification");
            if (landRaw) {
                const parsed = JSON.parse(landRaw);
                lat = parsed?.polygonCenterLat || parsed?.latitude || null;
                lng = parsed?.polygonCenterLng || parsed?.longitude || null;
                city = parsed?.location || parsed?.city || "";
            }
        } catch (e) {
            console.error("Error parsing Land Identification for nearby projects:", e);
        }

        if (!lat || !lng) return;

        const fetchNearby = async () => {
            setLoadingAnalysisNearbyProjects(true);
            try {
                const response = await fetch(apiUrl("/new_rate_simulator/simulator/nearby-projects/"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ city_name: city, latitude: lat, longitude: lng, limit: analysisNearbyLimit })
                });
                const data = await response.json();
                if (data.success && Array.isArray(data.projects)) {
                    setAnalysisNearbyProjects(data.projects);
                    if (data.projects.length > 0) {
                        setAnalysisSelectedProject((prev) => {
                            if (!prev || prev === "all") {
                                const first = data.projects[0];
                                return first.project_id ? `id:${first.project_id}:${first.project_name}` : first.project_name;
                            }
                            return prev;
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching nearby projects:", err);
            } finally {
                setLoadingAnalysisNearbyProjects(false);
            }
        };

        fetchNearby();
    }, [analysisViewMode, analysisNearbyLimit]);

    const getAnalysisParams = (overrideTab, overrideStart, overrideEnd) => {
        let city = "";
        let location = "";
        let lat = null;
        let lng = null;

        const savedLandData = localStorage.getItem("Land Identification");
        if (savedLandData) {
            try {
                const parsedLand = JSON.parse(savedLandData);
                city = parsedLand.location || parsedLand.city || "";
                location = parsedLand.village || parsedLand.villageName || "";
                lat = parsedLand.polygonCenterLat || parsedLand.latitude || null;
                lng = parsedLand.polygonCenterLng || parsedLand.longitude || null;
            } catch (e) {
                console.error("Error parsing Land Identification", e);
            }
        }

        let pId = null;
        let pName = "all";
        if (analysisSelectedProject && analysisSelectedProject !== "all") {
            if (String(analysisSelectedProject).startsWith("id:")) {
                const parts = analysisSelectedProject.split(":");
                pId = parts[1];
                pName = parts.slice(2).join(":");
            } else {
                const found = analysisNearbyProjects.find(p => String(p.project_id) === String(analysisSelectedProject) || p.project_name === analysisSelectedProject);
                if (found) {
                    pId = found.project_id;
                    pName = found.project_name;
                } else {
                    pName = analysisSelectedProject;
                }
            }
        }

        const vTab = overrideTab || analysisViewTab;
        const sDate = overrideStart !== undefined ? overrideStart : customStartDate;
        const eDate = overrideEnd !== undefined ? overrideEnd : customEndDate;

        return {
            city_name: city,
            location_name: location,
            mode: analysisViewMode,
            latitude: lat ? parseFloat(lat) : null,
            longitude: lng ? parseFloat(lng) : null,
            radius_km: (analysisAppliedRadius || 1000) / 1000.0,
            project_id: pId,
            project_name: pName,
            analysis_view: vTab,
            start_date: sDate || null,
            end_date: eDate || null
        };
    };

    useEffect(() => {
        const syncFromStorage = () => {
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

            const savedLandData = localStorage.getItem("Land Identification");
            if (savedLandData) {
                try {
                    const parsedLand = JSON.parse(savedLandData);
                    if (parsedLand.currency) {
                        setCurrency(parsedLand.currency);
                    }
                    const cName = parsedLand.location || parsedLand.city || "";
                    const vName = parsedLand.village || parsedLand.villageName || "";
                    setSubjectCity(cName);
                    setSubjectLocation(vName);
                } catch (e) {
                    console.error("Error parsing Land Identification", e);
                }
            }
        };

        syncFromStorage();
        window.addEventListener("storage", syncFromStorage);
        window.addEventListener("landIdentificationUpdated", syncFromStorage);
        const intervalId = setInterval(syncFromStorage, 500);

        let cityName = "";
        let locationName = "";
        const savedLandData = localStorage.getItem("Land Identification");
        if (savedLandData) {
            try {
                const parsedLand = JSON.parse(savedLandData);
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
                        if (json.remark) {
                            setTypeDataSourceInfo({
                                isFallback: !!json.is_fallback,
                                remark: json.remark,
                                dataSource: json.data_source || ""
                            });
                        }
                        if (json.property_type_units_map && typeof json.property_type_units_map === "object") {
                            setDbPropertyUnitMap(json.property_type_units_map);
                        }
                        if (Array.isArray(json.property_types) && json.property_types.length > 0) {
                            const cleaned = json.property_types.filter(pt => pt && !["other", "others"].includes(String(pt).trim().toLowerCase()));
                            if (cleaned.length > 0) setDbPropertyTypes(cleaned);
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

        return () => {
            window.removeEventListener("storage", syncFromStorage);
            window.removeEventListener("landIdentificationUpdated", syncFromStorage);
            clearInterval(intervalId);
        };
    }, []);

    const [areaRows, setAreaRows] = useState([{ id: 1, propertyType: 'Flat', unitType: ALL_UNITS_OPTION, min: '', max: '', interval: '' }]);
    const [rateRows, setRateRows] = useState([{ id: 1, propertyType: 'Flat', unitType: ALL_UNITS_OPTION, min: '', max: '', interval: '' }]);
    const [ticketRows, setTicketRows] = useState([{ id: 1, propertyType: 'Flat', unitType: ALL_UNITS_OPTION, min: '', max: '', interval: '' }]);

    const [isAnalysisResultsOpen, setIsAnalysisResultsOpen] = useState(true);
    const [areaAnalysisResults, setAreaAnalysisResults] = useState([]);
    const [rateAnalysisResults, setRateAnalysisResults] = useState([]);
    const [ticketSizeAnalysisResults, setTicketSizeAnalysisResults] = useState([]);

    const handleAreaRowChange = (id, field, value) => {
        setAreaRows(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };
                if (field === 'propertyType') {
                    const validUnits = getUnitTypesForProperty(value, dbPropertyUnitMap, dbUnitTypes);
                    if (!validUnits.includes(updated.unitType)) {
                        updated.unitType = validUnits[0] || '';
                    }
                }
                return updated;
            }
            return row;
        }));
    };

    const handleRateRowChange = (id, field, value) => {
        setRateRows(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };
                if (field === 'propertyType') {
                    const validUnits = getUnitTypesForProperty(value, dbPropertyUnitMap, dbUnitTypes);
                    if (!validUnits.includes(updated.unitType)) {
                        updated.unitType = validUnits[0] || '';
                    }
                }
                return updated;
            }
            return row;
        }));
    };

    const handleTicketRowChange = (id, field, value) => {
        setTicketRows(prev => prev.map(row => {
            if (row.id === id) {
                const updated = { ...row, [field]: value };
                if (field === 'propertyType') {
                    const validUnits = getUnitTypesForProperty(value, dbPropertyUnitMap, dbUnitTypes);
                    if (!validUnits.includes(updated.unitType)) {
                        updated.unitType = validUnits[0] || '';
                    }
                }
                return updated;
            }
            return row;
        }));
    };

    const handleTabChange = (newTab) => {
        setAnalysisViewTab(newTab);
        if (newTab === "custom") {
            const sDate = customStartDate || getLastOneYearDates().startStr;
            const eDate = customEndDate || getLastOneYearDates().endStr;
            if (!customStartDate) setCustomStartDate(sDate);
            if (!customEndDate) setCustomEndDate(eDate);

            if (areaAnalysisResults.length > 0) handleAnalyzeArea("custom", sDate, eDate);
            if (rateAnalysisResults.length > 0) handleAnalyzeRate("custom", sDate, eDate);
            if (ticketSizeAnalysisResults.length > 0) handleAnalyzeTicketSize("custom", sDate, eDate);
        } else {
            if (areaAnalysisResults.length > 0) handleAnalyzeArea(newTab);
            if (rateAnalysisResults.length > 0) handleAnalyzeRate(newTab);
            if (ticketSizeAnalysisResults.length > 0) handleAnalyzeTicketSize(newTab);
        }
    };

    const handleApplyCustomDates = () => {
        if (!customStartDate || !customEndDate) {
            alert("Please select both Start Date and End Date.");
            return;
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
            alert("Start Date must be before or equal to End Date.");
            return;
        }
        if (areaAnalysisResults.length > 0) handleAnalyzeArea("custom", customStartDate, customEndDate);
        if (rateAnalysisResults.length > 0) handleAnalyzeRate("custom", customStartDate, customEndDate);
        if (ticketSizeAnalysisResults.length > 0) handleAnalyzeTicketSize("custom", customStartDate, customEndDate);
    };

    const handleAnalyzeArea = async (overrideTab, overrideStart, overrideEnd) => {
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
                    propertyType: row.propertyType || 'Flat',
                    unitType: row.unitType || ALL_UNITS_OPTION,
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
                        count: null,
                        countsByYear: null
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
            const params = getAnalysisParams(overrideTab, overrideStart, overrideEnd);
            const res = await fetch(apiUrl("/new_rate_simulator/simulator/area-range-analysis/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...params,
                    queries: queries
                })
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    if (Array.isArray(json.years) && json.years.length > 0) {
                        setAvailableYears(json.years);
                    }
                    json.data.forEach(apiData => {
                        const targetResult = results.find(r => r.id === apiData.id);
                        if (targetResult) {
                            targetResult.rows.forEach(rRow => {
                                if (apiData.counts_by_year && apiData.counts_by_year[rRow.id]) {
                                    rRow.countsByYear = apiData.counts_by_year[rRow.id];
                                    rRow.count = apiData.counts_by_year[rRow.id].overall || 0;
                                } else if (apiData.counts) {
                                    rRow.count = apiData.counts[rRow.id] !== undefined ? apiData.counts[rRow.id] : 0;
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

    const handleAnalyzeRate = async (overrideTab, overrideStart, overrideEnd) => {
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
                    propertyType: row.propertyType || 'Flat',
                    unitType: row.unitType || ALL_UNITS_OPTION,
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
                        count: null,
                        countsByYear: null
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
            const params = getAnalysisParams(overrideTab, overrideStart, overrideEnd);
            const res = await fetch(apiUrl("/new_rate_simulator/simulator/rate-range-analysis/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...params,
                    queries: queries,
                    conversion_factor: conversionFactor
                })
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    if (Array.isArray(json.years) && json.years.length > 0) {
                        setAvailableYears(json.years);
                    }
                    json.data.forEach(apiData => {
                        const targetResult = results.find(r => r.id === apiData.id);
                        if (targetResult) {
                            targetResult.rows.forEach(rRow => {
                                if (apiData.counts_by_year && apiData.counts_by_year[rRow.id]) {
                                    rRow.countsByYear = apiData.counts_by_year[rRow.id];
                                    rRow.count = apiData.counts_by_year[rRow.id].overall || 0;
                                } else if (apiData.counts) {
                                    rRow.count = apiData.counts[rRow.id] !== undefined ? apiData.counts[rRow.id] : 0;
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

    const handleAnalyzeTicketSize = async (overrideTab, overrideStart, overrideEnd) => {
        const results = [];
        const queries = [];
        
        ticketRows.forEach(row => {
            const min = Number(row.min);
            const max = Number(row.max);
            const interval = Number(row.interval);

            if (min > 0 && max > 0 && interval > 0 && max >= min) {
                const tableData = {
                    id: row.id,
                    propertyType: row.propertyType || 'Flat',
                    unitType: row.unitType || ALL_UNITS_OPTION,
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
                        count: null,
                        countsByYear: null
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
            const params = getAnalysisParams(overrideTab, overrideStart, overrideEnd);
            const res = await fetch(apiUrl("/new_rate_simulator/simulator/ticket-size-analysis/"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...params,
                    queries: queries
                })
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    if (Array.isArray(json.years) && json.years.length > 0) {
                        setAvailableYears(json.years);
                    }
                    json.data.forEach(apiData => {
                        const targetResult = results.find(r => r.id === apiData.id);
                        if (targetResult) {
                            targetResult.rows.forEach(rRow => {
                                if (apiData.counts_by_year && apiData.counts_by_year[rRow.id]) {
                                    rRow.countsByYear = apiData.counts_by_year[rRow.id];
                                    rRow.count = apiData.counts_by_year[rRow.id].overall || 0;
                                } else if (apiData.counts) {
                                    rRow.count = apiData.counts[rRow.id] !== undefined ? apiData.counts[rRow.id] : 0;
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
                .table-responsive {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    max-width: 100%;
                    scrollbar-width: thin;
                    scrollbar-color: ${theme === "dark" ? "#4b5563 #1a1d24" : "#cbd5e1 #f8fafc"};
                }
                .table-responsive::-webkit-scrollbar {
                    height: 6px;
                    width: 6px;
                }
                .table-responsive::-webkit-scrollbar-track {
                    background: ${theme === "dark" ? "#1a1d24" : "#f8fafc"};
                    border-radius: 4px;
                }
                .table-responsive::-webkit-scrollbar-thumb {
                    background-color: ${theme === "dark" ? "#4b5563" : "#cbd5e1"};
                    border-radius: 4px;
                }
                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background-color: ${theme === "dark" ? "#6b7280" : "#94a3b8"};
                }
                .pm-results-scroll-container {
                    overflow-x: auto !important;
                    max-width: 100%;
                    padding-bottom: 6px;
                    scrollbar-width: thin;
                    scrollbar-color: ${theme === "dark" ? "#4b5563 #1a1d24" : "#cbd5e1 #f8fafc"};
                }
                .pm-results-scroll-container::-webkit-scrollbar {
                    height: 6px;
                    width: 6px;
                }
                .pm-results-scroll-container::-webkit-scrollbar-track {
                    background: ${theme === "dark" ? "#1a1d24" : "#f8fafc"};
                    border-radius: 4px;
                }
                .pm-results-scroll-container::-webkit-scrollbar-thumb {
                    background-color: ${theme === "dark" ? "#4b5563" : "#cbd5e1"};
                    border-radius: 4px;
                }
                .pm-results-scroll-container::-webkit-scrollbar-thumb:hover {
                    background-color: ${theme === "dark" ? "#6b7280" : "#94a3b8"};
                }
            `}</style>
            <div className="unit-design-header">
                <div className="unit-design-eyebrow">Selected Section</div>
                <h2 className="unit-design-title">Product Mix - Ticket Size</h2>
            </div>
            <div className="unit-design-body">
                {/* 1) Analysis Mode & Results */}
                <div className="pm-section-card mb-4">
                    <div 
                        className="pm-section-header"
                        onClick={() => setIsAnalysisModeOpen(!isAnalysisModeOpen)}
                    >
                        <div>
                            <div className="pm-section-eyebrow">SUBSECTION 1</div>
                            <div className="pm-section-maintitle">Analysis Mode & Results</div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-inline-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill border" style={{ borderColor: "#cbd5e1" }}>
                                <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2.5 py-1 rounded-pill" style={{ fontSize: "11px" }}>
                                    {analysisViewMode === "location" ? "Location Scope" : analysisViewMode === "catchment" ? "Catchment Scope" : "Nearby Projects"}
                                </span>
                                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-2.5 py-1 rounded-pill" style={{ fontSize: "11px" }}>
                                    {analysisViewTab === 'yoy' ? 'YoY View' : analysisViewTab === 'custom' ? 'Custom View' : 'Overall View'}
                                </span>
                            </div>
                            <div className="pm-chevron-btn">
                                {isAnalysisModeOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                            </div>
                        </div>
                    </div>
                    {isAnalysisModeOpen && (
                        <div className="pm-section-body">
                            {/* Global Inputs */}
                            <div className="row mb-4 align-items-end g-3">
                                <div className="col-md-2">
                                    <div className="pm-global-label">Subject Location</div>
                                    <input 
                                        type="text" 
                                        className="form-control pm-global-select shadow-none text-truncate" 
                                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', cursor: 'not-allowed', fontWeight: 600 }} 
                                        value={subjectLocation || "Not Specified"} 
                                        disabled 
                                        title={subjectLocation}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <div className="pm-global-label">City</div>
                                    <input 
                                        type="text" 
                                        className="form-control pm-global-select shadow-none text-truncate" 
                                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', cursor: 'not-allowed', fontWeight: 600 }} 
                                        value={subjectCity || "Not Specified"} 
                                        disabled 
                                        title={subjectCity}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <div className="pm-global-label">Area Unit</div>
                                    <input 
                                        type="text" 
                                        className="form-control pm-global-select shadow-none" 
                                        style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed', fontWeight: 600 }} 
                                        value="sq ft" 
                                        disabled 
                                    />
                                </div>
                                <div className="col-md-2">
                                    <div className="pm-global-label">Currency</div>
                                    <input 
                                        type="text" 
                                        className="form-control pm-global-select shadow-none" 
                                        style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed', fontWeight: 600 }} 
                                        value={currency} 
                                        disabled 
                                    />
                                </div>
                                <div className="col-md-4">
                                    <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border h-100" style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534", fontSize: "11.5px" }}>
                                        <FaInfoCircle size={15} style={{ color: "#15803d", flexShrink: 0 }} />
                                        <span><strong>Remark:</strong> All Area and Rate calculations are on <strong>Carpet Area (sq ft)</strong>.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Market Research Scope & Duration Filter Bar */}
                            <div
                                className="card border-0 shadow-sm rounded-4 mb-4"
                                style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
                                }}
                            >
                                <div className="card-body p-3 d-flex flex-column gap-3">
                                    {/* Scope Filter Row */}
                                    <div className="d-flex align-items-center flex-wrap gap-3">
                                        {/* Scope Info Label */}
                                        <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ flexBasis: "0", minWidth: "250px" }}>
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-3 px-3 py-2.5"
                                                style={{ backgroundColor: "#eef7f4", color: "#448C74" }}
                                            >
                                                <FaFilter size={16} />
                                            </div>
                                            <div>
                                                <div className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "14px", lineHeight: "1.2" }}>
                                                    <span>Analysis Scope Filter</span>
                                                    {(subjectLocation || subjectCity) && (
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-0.5 rounded-pill fw-semibold" style={{ fontSize: "11px" }}>
                                                            📍 {subjectLocation ? `${subjectLocation}, ${subjectCity}` : subjectCity}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-secondary fw-medium" style={{ fontSize: "12px" }}>
                                                    {analysisViewMode === "location"
                                                        ? `Showing overall ${subjectLocation ? `${subjectLocation} (${subjectCity})` : subjectCity || 'city/location'} statistics`
                                                        : analysisViewMode === "catchment"
                                                        ? `Showing ${analysisAppliedRadius >= 1000 ? `${analysisAppliedRadius / 1000}km` : `${analysisAppliedRadius}m`} radius catchment around project`
                                                        : `Showing statistics for selected project: ${analysisSelectedProject && analysisSelectedProject.startsWith("id:") ? analysisSelectedProject.split(":").slice(2).join(":") : analysisSelectedProject}`}
                                                </div>
                                            </div>
                                        </div>

                                        {/* View Mode Toggle Pill Container */}
                                        <div className="d-flex justify-content-center">
                                            <div
                                                className="d-inline-flex p-1 bg-light rounded-pill border shadow-xs"
                                                style={{ borderColor: "#cbd5e1" }}
                                            >
                                                <button
                                                    type="button"
                                                    className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all"
                                                    style={{
                                                        fontSize: "12px",
                                                        backgroundColor: analysisViewMode === "location" ? "#448C74" : "transparent",
                                                        borderColor: "transparent",
                                                        color: analysisViewMode === "location" ? "#ffffff" : "#475569",
                                                        boxShadow: analysisViewMode === "location" ? "0 2px 8px rgba(68,140,116,0.35)" : "none"
                                                    }}
                                                    onClick={() => setAnalysisViewMode("location")}
                                                >
                                                    <FaMapMarkerAlt size={13} style={{ color: analysisViewMode === "location" ? "#ffffff" : "#448C74" }} />
                                                    <span>Location</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all"
                                                    style={{
                                                        fontSize: "12px",
                                                        backgroundColor: analysisViewMode === "catchment" ? "#448C74" : "transparent",
                                                        borderColor: "transparent",
                                                        color: analysisViewMode === "catchment" ? "#ffffff" : "#475569",
                                                        boxShadow: analysisViewMode === "catchment" ? "0 2px 8px rgba(68,140,116,0.35)" : "none"
                                                    }}
                                                    onClick={() => setAnalysisViewMode("catchment")}
                                                >
                                                    <FaCrosshairs size={13} style={{ color: analysisViewMode === "catchment" ? "#ffffff" : "#448C74" }} />
                                                    <span>Catchment ({analysisAppliedRadius >= 1000 ? `${analysisAppliedRadius / 1000}km` : `${analysisAppliedRadius}m`})</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all"
                                                    style={{
                                                        fontSize: "12px",
                                                        backgroundColor: analysisViewMode === "nearby" ? "#448C74" : "transparent",
                                                        borderColor: "transparent",
                                                        color: analysisViewMode === "nearby" ? "#ffffff" : "#475569",
                                                        boxShadow: analysisViewMode === "nearby" ? "0 2px 8px rgba(68,140,116,0.35)" : "none"
                                                    }}
                                                    onClick={() => setAnalysisViewMode("nearby")}
                                                >
                                                    <FaBuilding size={13} style={{ color: analysisViewMode === "nearby" ? "#ffffff" : "#448C74" }} />
                                                    <span>Nearby Projects</span>
                                                </button>
                                            </div>
                                        </div>

                                         {/* Dynamic Settings Container (Right) */}
                                        <div className="d-flex align-items-center justify-content-end gap-3 flex-grow-1 flex-wrap" style={{ flexBasis: "0", minWidth: "250px" }}>
                                            {/* Data Source / Fallback Remark Badge */}
                                            {typeDataSourceInfo.remark && (
                                                <div
                                                    className={`badge px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-bold shadow-xs ${
                                                        typeDataSourceInfo.isFallback
                                                            ? "bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25"
                                                            : "bg-success bg-opacity-10 text-success border border-success border-opacity-25"
                                                    }`}
                                                    style={{ fontSize: "11px" }}
                                                    title={typeDataSourceInfo.remark}
                                                >
                                                    {typeDataSourceInfo.isFallback ? <FaInfoCircle size={12} /> : <FaCheckCircle size={12} />}
                                                    <span>{typeDataSourceInfo.remark}</span>
                                                </div>
                                            )}
                                            {/* Catchment Radius Settings */}
                                            {analysisViewMode === "catchment" && (
                                                <div
                                                    className="d-inline-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-pill border shadow-xs"
                                                    style={{ borderColor: "#cbd5e1" }}
                                                >
                                                    <div className="d-flex align-items-center gap-1 text-secondary pe-2 border-end me-1" style={{ borderColor: "#cbd5e1" }}>
                                                        <FaRulerCombined size={13} style={{ color: "#448C74" }} />
                                                        <span className="fw-bold text-dark ms-1" style={{ fontSize: "12px" }}>Radius:</span>
                                                    </div>

                                                    <select
                                                        value={[500, 1000, 2000, 3000, 5000].includes(Number(analysisInputRadius)) ? analysisInputRadius : "custom"}
                                                        onChange={(e) => {
                                                            if (e.target.value !== "custom") {
                                                                const val = Number(e.target.value);
                                                                setAnalysisInputRadius(val);
                                                                setAnalysisAppliedRadius(val);
                                                            }
                                                        }}
                                                        className="form-select form-select-sm px-2.5 py-1 fw-bold rounded-2 border"
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "#1e293b",
                                                            backgroundColor: "#ffffff",
                                                            borderColor: "#cbd5e1",
                                                            cursor: "pointer",
                                                            width: "auto"
                                                        }}
                                                    >
                                                        <option value="500">500m (0.5km)</option>
                                                        <option value="1000">1000m (1.0km)</option>
                                                        <option value="2000">2000m (2.0km)</option>
                                                        <option value="3000">3000m (3.0km)</option>
                                                        <option value="5000">5000m (5.0km)</option>
                                                        <option value="custom">Custom Value...</option>
                                                    </select>

                                                    <div className="d-flex align-items-center ms-1">
                                                        <input
                                                            type="number"
                                                            min="100"
                                                            max="20000"
                                                            step="100"
                                                            value={analysisInputRadius}
                                                            onChange={(e) => setAnalysisInputRadius(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    const val = Math.max(100, Number(analysisInputRadius) || 1000);
                                                                    setAnalysisInputRadius(val);
                                                                    setAnalysisAppliedRadius(val);
                                                                }
                                                            }}
                                                            className="form-control form-control-sm px-2.5 py-1 text-center fw-bold rounded-2 border shadow-inner"
                                                            style={{
                                                                width: "80px",
                                                                backgroundColor: "#ffffff",
                                                                fontSize: "12px",
                                                                color: "#1e293b",
                                                                borderColor: "#cbd5e1",
                                                                outline: "none"
                                                            }}
                                                            placeholder="Meters"
                                                        />
                                                        <span className="text-muted fw-bold ms-1" style={{ fontSize: "11px" }}>mtrs</span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm rounded-pill px-3 py-1 fw-bold text-white d-flex align-items-center gap-1.5 shadow-sm transition-all ms-1"
                                                        style={{
                                                            backgroundColor: "#448C74",
                                                            borderColor: "#448C74",
                                                            fontSize: "12px",
                                                            boxShadow: "0 2px 6px rgba(68,140,116,0.3)"
                                                        }}
                                                        onClick={() => {
                                                            const val = Math.max(100, Number(analysisInputRadius) || 1000);
                                                            setAnalysisInputRadius(val);
                                                            setAnalysisAppliedRadius(val);
                                                        }}
                                                    >
                                                        <FaCheck size={11} />
                                                        <span>Apply</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Nearby Projects Selector */}
                                            {analysisViewMode === "nearby" && (
                                                <div
                                                    className="d-inline-flex align-items-center gap-2 bg-light px-3 py-1.5 rounded-pill border shadow-xs"
                                                    style={{ borderColor: "#cbd5e1" }}
                                                >
                                                    <div className="d-flex align-items-center gap-1 text-secondary pe-2 border-end me-1" style={{ borderColor: "#cbd5e1" }}>
                                                        <FaBuilding size={13} style={{ color: "#448C74" }} />
                                                        <span className="fw-bold text-dark ms-1" style={{ fontSize: "12px" }}>Select Project:</span>
                                                    </div>

                                                    {(() => {
                                                        const projectOptions = analysisNearbyProjects.map((p, idx) => ({
                                                            value: p.project_id ? `id:${p.project_id}:${p.project_name}` : p.project_name,
                                                            label: `${p.project_name} (${p.distance_formatted} away • ${p.total_transactions} sales)`,
                                                            project: p,
                                                            index: idx + 1
                                                        }));
                                                        return (
                                                            <Select
                                                                options={projectOptions}
                                                                value={projectOptions.find(opt => opt.value === analysisSelectedProject) || null}
                                                                onChange={(selectedOption) => setAnalysisSelectedProject(selectedOption ? selectedOption.value : "all")}
                                                                formatOptionLabel={formatProjectOption}
                                                                styles={customSelectStyles}
                                                                placeholder="Select a project..."
                                                                isSearchable={true}
                                                                classNamePrefix="custom-select"
                                                            />
                                                        );
                                                    })()}

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-1.5 shadow-xs transition-all ms-1"
                                                        style={{
                                                            fontSize: "12px",
                                                            backgroundColor: "#eef7f4",
                                                            color: "#448C74",
                                                            borderColor: "#a3d9c9"
                                                        }}
                                                        disabled={loadingAnalysisNearbyProjects}
                                                        onClick={() => setAnalysisNearbyLimit((prev) => prev + 5)}
                                                        title="Load the next 5 nearest competitor projects"
                                                    >
                                                        <FaPlus size={10} />
                                                        <span>Show More (+5)</span>
                                                    </button>

                                                    {loadingAnalysisNearbyProjects && (
                                                        <span className="spinner-border spinner-border-sm text-success ms-1" role="status" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Universal Analysis View Tab Row */}
                                    <div className="d-flex align-items-center flex-wrap gap-3 pt-2 border-top" style={{ borderColor: "#f1f5f9" }}>
                                        <div className="d-flex align-items-center gap-2 text-secondary">
                                            <FaClock size={14} style={{ color: "#448C74" }} />
                                            <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>Analysis View:</span>
                                        </div>

                                        {/* Tab Buttons */}
                                        <div className="d-inline-flex p-1 bg-light rounded-pill border shadow-xs" style={{ borderColor: "#cbd5e1" }}>
                                            <button
                                                type="button"
                                                className="btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all"
                                                style={{
                                                    fontSize: "12px",
                                                    backgroundColor: analysisViewTab === "overall" ? "#448C74" : "transparent",
                                                    borderColor: "transparent",
                                                    color: analysisViewTab === "overall" ? "#ffffff" : "#475569",
                                                    boxShadow: analysisViewTab === "overall" ? "0 2px 6px rgba(68,140,116,0.3)" : "none"
                                                }}
                                                onClick={() => handleTabChange("overall")}
                                            >
                                                Overall (2020+)
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all"
                                                style={{
                                                    fontSize: "12px",
                                                    backgroundColor: analysisViewTab === "yoy" ? "#448C74" : "transparent",
                                                    borderColor: "transparent",
                                                    color: analysisViewTab === "yoy" ? "#ffffff" : "#475569",
                                                    boxShadow: analysisViewTab === "yoy" ? "0 2px 6px rgba(68,140,116,0.3)" : "none"
                                                }}
                                                onClick={() => handleTabChange("yoy")}
                                            >
                                                YoY Breakdown
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all"
                                                style={{
                                                    fontSize: "12px",
                                                    backgroundColor: analysisViewTab === "custom" ? "#448C74" : "transparent",
                                                    borderColor: "transparent",
                                                    color: analysisViewTab === "custom" ? "#ffffff" : "#475569",
                                                    boxShadow: analysisViewTab === "custom" ? "0 2px 6px rgba(68,140,116,0.3)" : "none"
                                                }}
                                                onClick={() => handleTabChange("custom")}
                                            >
                                                Custom Date Range
                                            </button>
                                        </div>

                                        {/* Custom Date Pickers container */}
                                        {analysisViewTab === "custom" && (
                                            <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill border ms-auto" style={{ borderColor: "#cbd5e1" }}>
                                                <span className="fw-bold text-dark" style={{ fontSize: "12px" }}>From:</span>
                                                <input
                                                    type="date"
                                                    value={customStartDate}
                                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                                    className="form-control form-control-sm px-2 py-0.5 rounded border"
                                                    style={{ fontSize: "12px", color: "#1e293b", backgroundColor: "#ffffff" }}
                                                />
                                                <span className="fw-bold text-dark ms-1" style={{ fontSize: "12px" }}>To:</span>
                                                <input
                                                    type="date"
                                                    value={customEndDate}
                                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                                    className="form-control form-control-sm px-2 py-0.5 rounded border"
                                                    style={{ fontSize: "12px", color: "#1e293b", backgroundColor: "#ffffff" }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-success rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-1 ms-1"
                                                    style={{ fontSize: "12px", backgroundColor: "#448C74", borderColor: "#448C74" }}
                                                    onClick={handleApplyCustomDates}
                                                >
                                                    <FaCheck size={11} />
                                                    <span>Apply Dates</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Configuration Input Tables */}
                            <div className="row g-4 mb-4">
                                {/* Table 1: Area Range Analysis */}
                                <div className="col-md-4">
                                    <div className="pm-table-container h-100 mb-0">
                                        <div className="pm-table-title">
                                            <span>Area Range Analysis</span>
                                            <button className="pm-action-btn" onClick={() => handleAnalyzeArea()} disabled={isAnalyzingArea}>
                                                {isAnalyzingArea ? (
                                                    <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Simulating...</>
                                                ) : "Simulate Area"}
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
                                                                    propertyType={row.propertyType}
                                                                    dbPropertyUnitMap={dbPropertyUnitMap}
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
                                                    <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Simulating...</>
                                                ) : "Simulate Rate"}
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
                                                                    propertyType={row.propertyType}
                                                                    dbPropertyUnitMap={dbPropertyUnitMap}
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
                                            <button className="pm-action-btn" onClick={() => handleAnalyzeTicketSize()} disabled={isAnalyzingTicketSize}>
                                                {isAnalyzingTicketSize ? (
                                                    <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Simulating...</>
                                                ) : "Simulate Ticket Size"}
                                            </button>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="pm-table">
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Property Type</th>
                                                        <th rowSpan="2" className="align-middle" style={{ width: '22%' }}>Unit Type</th>
                                                        <th colSpan="2" style={{ borderBottom: 'none', paddingBottom: '4px' }}>Ticket Size Range</th>
                                                        <th rowSpan="2" className="align-middle" style={{ whiteSpace: 'normal', width: '20%' }}>Intervals for Ticket Range</th>
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
                                                                    value={row.propertyType}
                                                                    onChange={(e) => handleTicketRowChange(row.id, 'propertyType', e.target.value)}
                                                                    options={dbPropertyTypes}
                                                                    isLoading={typesLoading}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <UnitTypeSelect
                                                                    value={row.unitType}
                                                                    onChange={(e) => handleTicketRowChange(row.id, 'unitType', e.target.value)}
                                                                    options={dbUnitTypes}
                                                                    isLoading={typesLoading}
                                                                    propertyType={row.propertyType}
                                                                    dbPropertyUnitMap={dbPropertyUnitMap}
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

                            {/* Analysis Results Container */}
                            <div className="mt-4 pt-3 border-top" style={{ borderColor: "#cbd5e1" }}>
                                {(() => {
                                    const distinctAnalyzedPropertyTypes = Array.from(
                                        new Set([
                                            ...areaAnalysisResults.map(r => r.propertyType),
                                            ...rateAnalysisResults.map(r => r.propertyType),
                                            ...ticketSizeAnalysisResults.map(r => r.propertyType)
                                        ].filter(Boolean))
                                    );

                                    const displayAreaResults = activeResultPropertyTab === "all"
                                        ? areaAnalysisResults
                                        : areaAnalysisResults.filter(r => r.propertyType === activeResultPropertyTab);

                                    const displayRateResults = activeResultPropertyTab === "all"
                                        ? rateAnalysisResults
                                        : rateAnalysisResults.filter(r => r.propertyType === activeResultPropertyTab);

                                    const displayTicketResults = activeResultPropertyTab === "all"
                                        ? ticketSizeAnalysisResults
                                        : ticketSizeAnalysisResults.filter(r => r.propertyType === activeResultPropertyTab);

                                    const hasAnyResults = areaAnalysisResults.length > 0 || rateAnalysisResults.length > 0 || ticketSizeAnalysisResults.length > 0;
                                    const yearsToRender = (availableYears && availableYears.length > 0) ? availableYears : DEFAULT_YOY_YEARS;

                                    return (
                                        <>
                                            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="rounded-2 p-1.5 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#eef7f4", color: "#448C74" }}>
                                                        <FaCheckCircle size={15} />
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "14px", lineHeight: "1.2" }}>
                                                            <span>Transaction Analysis Results</span>
                                                            {(subjectLocation || subjectCity) && (
                                                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-0.5 rounded-pill fw-semibold" style={{ fontSize: "11px" }}>
                                                                    📍 {subjectLocation ? `${subjectLocation}, ${subjectCity}` : subjectCity}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-secondary fw-medium" style={{ fontSize: "12px" }}>
                                                            {analysisViewTab === 'yoy' 
                                                                ? 'Showing Year-on-Year transaction distribution breakdown' 
                                                                : analysisViewTab === 'custom' 
                                                                ? `Showing transaction distribution for custom date range (${customStartDate || 'Start'} to ${customEndDate || 'End'})` 
                                                                : 'Showing overall cumulative transaction distribution'}
                                                        </div>
                                                        <div className="mt-1" style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                                                            * Note: Area and Rate metrics are based on Carpet Area (sq ft).
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge px-3 py-1.5 rounded-pill bg-light text-dark border fw-bold" style={{ fontSize: "11px" }}>
                                                        {analysisViewTab === 'yoy' ? 'YoY Breakdown' : analysisViewTab === 'custom' ? 'Custom Date Range' : 'Overall (2020+)'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Property Type Sub-Tabs */}
                                            {hasAnyResults && distinctAnalyzedPropertyTypes.length > 0 && (
                                                <div className="d-flex align-items-center flex-wrap gap-2 mb-4 p-1.5 bg-light rounded-pill border shadow-xs" style={{ borderColor: "#cbd5e1" }}>
                                                    <span className="fw-bold text-dark px-2 ms-1" style={{ fontSize: "12px" }}>Filter Property Type:</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm rounded-pill px-3 py-1 fw-bold transition-all"
                                                        style={{
                                                            fontSize: "12px",
                                                            backgroundColor: activeResultPropertyTab === "all" ? "#448C74" : "transparent",
                                                            borderColor: "transparent",
                                                            color: activeResultPropertyTab === "all" ? "#ffffff" : "#475569",
                                                            boxShadow: activeResultPropertyTab === "all" ? "0 2px 6px rgba(68,140,116,0.3)" : "none"
                                                        }}
                                                        onClick={() => setActiveResultPropertyTab("all")}
                                                    >
                                                        All Property Types ({distinctAnalyzedPropertyTypes.length})
                                                    </button>

                                                    {distinctAnalyzedPropertyTypes.map((pt) => {
                                                        const isSelected = activeResultPropertyTab === pt;
                                                        return (
                                                            <button
                                                                key={pt}
                                                                type="button"
                                                                className="btn btn-sm rounded-pill px-3.5 py-1 fw-bold transition-all"
                                                                style={{
                                                                    fontSize: "12px",
                                                                    backgroundColor: isSelected ? "#448C74" : "transparent",
                                                                    borderColor: "transparent",
                                                                    color: isSelected ? "#ffffff" : "#475569",
                                                                    boxShadow: isSelected ? "0 2px 6px rgba(68,140,116,0.3)" : "none"
                                                                }}
                                                                onClick={() => setActiveResultPropertyTab(pt)}
                                                            >
                                                                {pt} Results
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {hasAnyResults ? (
                                                <div className="pm-results-scroll-container">
                                                    <div className="row g-4 flex-nowrap flex-md-wrap">
                                                        {/* Area Range Results */}
                                                        {displayAreaResults.map((result) => (
                                                            <div className={analysisViewTab === 'yoy' ? "col-12" : "col-md-4"} key={result.id}>
                                                                <div className="pm-table-container h-100 mb-0 shadow-xs border rounded-3" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
                                                                    <div className="pm-table-title d-flex align-items-center justify-content-between py-2 px-3 bg-light border-bottom">
                                                                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                                                                            Area Range Results ({result.propertyType ? `${result.propertyType} - ` : ''}{result.unitType})
                                                                        </span>
                                                                        <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5 rounded-pill" style={{ fontSize: "10px" }}>
                                                                            {result.unitType}
                                                                        </span>
                                                                    </div>
                                                                    <div className="table-responsive">
                                                                        <table className="pm-table mb-0">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th className="align-middle">Property Type</th>
                                                                                    <th className="align-middle">Unit Type</th>
                                                                                    <th className="align-middle text-center">Area Range<br/><span style={{fontWeight: 400, fontSize: '10px'}}>(Min - Max)</span></th>
                                                                                    {analysisViewTab === 'yoy' ? (
                                                                                        <>
                                                                                            {yearsToRender.map(yr => (
                                                                                                <th key={yr} className="align-middle text-center">{yr}</th>
                                                                                            ))}
                                                                                            <th className="align-middle text-center bg-light text-success fw-bold">Overall Total</th>
                                                                                        </>
                                                                                    ) : (
                                                                                        <th className="align-middle text-center">Transaction Count</th>
                                                                                    )}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {result.rows.map(r => (
                                                                                    <tr key={r.id}>
                                                                                        <td className="align-middle fw-medium">{result.propertyType || 'Apartment'}</td>
                                                                                        <td className="align-middle fw-medium">{result.unitType}</td>
                                                                                        <td className="align-middle text-center fw-semibold">{r.rangeMin.toLocaleString()} - {r.rangeMax.toLocaleString()}</td>
                                                                                        {analysisViewTab === 'yoy' ? (
                                                                                            <>
                                                                                                {yearsToRender.map(yr => (
                                                                                                    <td key={yr} className="align-middle text-center">
                                                                                                        <span className="badge bg-light text-dark fw-bold border">{r.countsByYear?.[String(yr)] ?? 0}</span>
                                                                                                    </td>
                                                                                                ))}
                                                                                                <td className="align-middle text-center bg-light">
                                                                                                    <span className="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill fw-bold">{r.countsByYear?.overall ?? r.count ?? 0}</span>
                                                                                                </td>
                                                                                            </>
                                                                                        ) : (
                                                                                            <td className="align-middle text-center">
                                                                                                {r.count === null ? (
                                                                                                    <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                                                                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                                                                                                        <span style={{ color: '#2ea868' }}>Loading data...</span>
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="badge bg-primary bg-opacity-10 text-primary px-2.5 py-1 rounded-pill fw-bold" style={{ fontSize: "12px" }}>{r.count.toLocaleString()}</span>
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Rate Range Results */}
                                                        {displayRateResults.map((result) => (
                                                            <div className={analysisViewTab === 'yoy' ? "col-12" : "col-md-4"} key={result.id}>
                                                                <div className="pm-table-container h-100 mb-0 shadow-xs border rounded-3" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
                                                                    <div className="pm-table-title d-flex align-items-center justify-content-between py-2 px-3 bg-light border-bottom">
                                                                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                                                                            Rate Range Results ({result.propertyType ? `${result.propertyType} - ` : ''}{result.unitType})
                                                                        </span>
                                                                        <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5 rounded-pill" style={{ fontSize: "10px" }}>
                                                                            {result.unitType}
                                                                        </span>
                                                                    </div>
                                                                    <div className="table-responsive">
                                                                        <table className="pm-table mb-0">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th className="align-middle">Property Type</th>
                                                                                    <th className="align-middle">Unit Type</th>
                                                                                    <th className="align-middle text-center">Rate Range<br/><span style={{fontWeight: 400, fontSize: '10px'}}>(Min - Max)</span></th>
                                                                                    {analysisViewTab === 'yoy' ? (
                                                                                        <>
                                                                                            {yearsToRender.map(yr => (
                                                                                                <th key={yr} className="align-middle text-center">{yr}</th>
                                                                                            ))}
                                                                                            <th className="align-middle text-center bg-light text-success fw-bold">Overall Total</th>
                                                                                        </>
                                                                                    ) : (
                                                                                        <th className="align-middle text-center">Transaction Count</th>
                                                                                    )}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {result.rows.map(r => (
                                                                                    <tr key={r.id}>
                                                                                        <td className="align-middle fw-medium">{result.propertyType || 'Apartment'}</td>
                                                                                        <td className="align-middle fw-medium">{result.unitType}</td>
                                                                                        <td className="align-middle text-center fw-semibold">{r.rangeMin.toLocaleString()} - {r.rangeMax.toLocaleString()}</td>
                                                                                        {analysisViewTab === 'yoy' ? (
                                                                                            <>
                                                                                                {yearsToRender.map(yr => (
                                                                                                    <td key={yr} className="align-middle text-center">
                                                                                                        <span className="badge bg-light text-dark fw-bold border">{r.countsByYear?.[String(yr)] ?? 0}</span>
                                                                                                    </td>
                                                                                                ))}
                                                                                                <td className="align-middle text-center bg-light">
                                                                                                    <span className="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill fw-bold">{r.countsByYear?.overall ?? r.count ?? 0}</span>
                                                                                                </td>
                                                                                            </>
                                                                                        ) : (
                                                                                            <td className="align-middle text-center">
                                                                                                {r.count === null ? (
                                                                                                    <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                                                                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                                                                                                        <span style={{ color: '#2ea868' }}>Loading data...</span>
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="badge bg-primary bg-opacity-10 text-primary px-2.5 py-1 rounded-pill fw-bold" style={{ fontSize: "12px" }}>{r.count.toLocaleString()}</span>
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Ticket Size Results */}
                                                        {displayTicketResults.map((result) => (
                                                            <div className={analysisViewTab === 'yoy' ? "col-12" : "col-md-4"} key={result.id}>
                                                                <div className="pm-table-container h-100 mb-0 shadow-xs border rounded-3" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
                                                                    <div className="pm-table-title d-flex align-items-center justify-content-between py-2 px-3 bg-light border-bottom">
                                                                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                                                                            Ticket Size Results ({result.propertyType ? `${result.propertyType} - ` : ''}{result.unitType})
                                                                        </span>
                                                                        <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5 rounded-pill" style={{ fontSize: "10px" }}>
                                                                            {result.unitType}
                                                                        </span>
                                                                    </div>
                                                                    <div className="table-responsive">
                                                                        <table className="pm-table mb-0">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th className="align-middle">Property Type</th>
                                                                                    <th className="align-middle">Unit Type</th>
                                                                                    <th className="align-middle text-center">Ticket Size Range<br/><span style={{fontWeight: 400, fontSize: '10px'}}>(Min - Max)</span></th>
                                                                                    {analysisViewTab === 'yoy' ? (
                                                                                        <>
                                                                                            {yearsToRender.map(yr => (
                                                                                                <th key={yr} className="align-middle text-center">{yr}</th>
                                                                                            ))}
                                                                                            <th className="align-middle text-center bg-light text-success fw-bold">Overall Total</th>
                                                                                        </>
                                                                                    ) : (
                                                                                        <th className="align-middle text-center">Transaction Count</th>
                                                                                    )}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {result.rows.map(r => (
                                                                                    <tr key={r.id}>
                                                                                        <td className="align-middle fw-medium">{result.propertyType || 'Apartment'}</td>
                                                                                        <td className="align-middle fw-medium">{result.unitType}</td>
                                                                                        <td className="align-middle text-center fw-semibold">{r.rangeMin.toLocaleString()} - {r.rangeMax.toLocaleString()}</td>
                                                                                        {analysisViewTab === 'yoy' ? (
                                                                                            <>
                                                                                                {yearsToRender.map(yr => (
                                                                                                    <td key={yr} className="align-middle text-center">
                                                                                                        <span className="badge bg-light text-dark fw-bold border">{r.countsByYear?.[String(yr)] ?? 0}</span>
                                                                                                    </td>
                                                                                                ))}
                                                                                                <td className="align-middle text-center bg-light">
                                                                                                    <span className="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill fw-bold">{r.countsByYear?.overall ?? r.count ?? 0}</span>
                                                                                                </td>
                                                                                            </>
                                                                                        ) : (
                                                                                            <td className="align-middle text-center">
                                                                                                {r.count === null ? (
                                                                                                    <span className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center" style={{ backgroundColor: '#eef9f2', fontSize: '11px', fontWeight: 500 }}>
                                                                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '10px', height: '10px', borderWidth: '1.5px', color: '#0da19c'}}></span>
                                                                                                        <span style={{ color: '#2ea868' }}>Loading data...</span>
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="badge bg-primary bg-opacity-10 text-primary px-2.5 py-1 rounded-pill fw-bold" style={{ fontSize: "12px" }}>{r.count.toLocaleString()}</span>
                                                                                                )}
                                                                                            </td>
                                                                                        )}
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
                                            ) : (
                                                <div className="text-center p-4 rounded-3 border border-dashed bg-light text-secondary" style={{ borderColor: "#cbd5e1" }}>
                                                    <FaFilter size={18} className="mb-2 text-muted" />
                                                    <div className="fw-semibold text-dark" style={{ fontSize: "13px" }}>No Simulation Results Generated Yet</div>
                                                    <div className="small text-muted">Set your range parameters in the tables above and click <strong>Simulate Area</strong>, <strong>Simulate Rate</strong>, or <strong>Simulate Ticket Size</strong>.</div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

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
                                    <input 
                                        type="text" 
                                        className="form-control pm-global-select shadow-none" 
                                        style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed', fontWeight: 600 }} 
                                        value="sq ft" 
                                        disabled 
                                    />
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
