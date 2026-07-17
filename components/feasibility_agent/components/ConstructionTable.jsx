import React, { useMemo, useState, useEffect } from "react";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import Select from "react-select";
import {
  FaArrowLeft,
  FaHardHat,
  FaCalendarAlt,
  FaPlus,
  FaCheckCircle,
  FaCalculator,
  FaExclamationTriangle,
  FaTimesCircle,
  FaTable,
  FaInbox,
  FaFileExport,
  FaSave
} from 'react-icons/fa';

const STAGES = {
    "Mobilization & Excavation": 10,
    "Foundation & Plinth Work": 10,
    "Ground Floor Structure": 10,
    "Superstructure (Up to 3rd Floor)": 10,
    "Superstructure Completion": 10,
    "Brickwork & Internal Plastering": 10,
    "External Plastering & Waterproofing": 10,
    "Flooring & Tiling Work": 10,
    "Electrical, Plumbing & Fixtures": 10,
    "Painting & Final Finishes": 5,
    "Site Development & Landscaping": 3,
    "Possession & Handover": 2,
};

const DESCRIPTIONS = {
    "Mobilization & Excavation": "Site clearing, excavation, temporary site office setup",
    "Foundation & Plinth Work": "Footing concreting, foundation walls, plinth beam",
    "Ground Floor Structure": "RCC columns, slab, and brickwork up to 1st floor",
    "Superstructure (Up to 3rd Floor)": "Columns, slabs, and beams up to 3rd floor",
    "Superstructure Completion": "Remaining RCC structure and parapet",
    "Brickwork & Internal Plastering": "Internal partition walls, internal plaster",
    "External Plastering & Waterproofing": "External walls, terrace work",
    "Flooring & Tiling Work": "Internal flooring, skirting, bathroom tiling",
    "Electrical, Plumbing & Fixtures": "MEP installations, switches, sanitary fittings",
    "Painting & Final Finishes": "Internal & external painting, final finishes",
    "Site Development & Landscaping": "Road, compound wall, amenities",
    "Possession & Handover": "Final inspection, OC, handover",
};

function getQuarterFromDate(d) {
    const m = d.getMonth() + 1;
    if (m <= 3) return 1;
    if (m <= 6) return 2;
    if (m <= 9) return 3;
    return 4;
}

function addMonths(date, months) {
    const d = new Date(date.getTime());
    const targetMonth = d.getMonth() + months;
    d.setMonth(targetMonth);
    return d;
}

function yearQuarterFromOffset(startDate, qOffset) {
    const qDate = addMonths(startDate, 3 * qOffset);
    const startQuarter = getQuarterFromDate(startDate);
    const startYear = startDate.getFullYear();
    const totalQuarters = (startQuarter - 1) + qOffset;
    const actualYear = startYear + Math.floor(totalQuarters / 4);
    const actualQuarter = (totalQuarters % 4) + 1;
    return [String(actualYear), `Q${actualQuarter}`, qDate];
}

function ensureUniqueSelection(rows, currentRowIdx) {
    const selectedElsewhere = new Set();
    rows.forEach((row, idx) => {
        if (idx === currentRowIdx) return;
        (row.stages || []).forEach(s => selectedElsewhere.add(s));
    });
    return Object.keys(STAGES).filter(s => !selectedElsewhere.has(s));
}

function buildData(rows, startDate) {
    const data = [];
    let cumulative = 0;
    rows.forEach((row, i) => {
        const [yearLabel, quarterLabel] = yearQuarterFromOffset(startDate, i);
        const stages = row.stages || [];
        const rowPct = stages.reduce((acc, s) => acc + (STAGES[s] || 0), 0);
        cumulative += rowPct;
        const desc = stages.map(s => DESCRIPTIONS[s]).filter(Boolean).join(", ");
        data.push({
            Year: yearLabel,
            Quarter: quarterLabel,
            StageActivity: stages.join(", "),
            Description: desc,
            QuarterPct: rowPct,
            CumulativePct: cumulative,
        });
    });
    return [data, cumulative];
}

const getDefaultStartDate = () => {
    try {
        // If construction table already saved something, let the later effect handle it.
        // For initial default, look at Construction Timetable state.
        const timetableState = localStorage.getItem("constructionTimetableState");
        if (timetableState) {
            const parsed = JSON.parse(timetableState);
            if (parsed.mode === "auto" && parsed.formData?.startDate) {
                return parsed.formData.startDate;
            }
            if (parsed.manualDates?.startDate) {
                return parsed.manualDates.startDate;
            }
        }
    } catch (error) {
        console.error("Failed to derive default start date from construction timetable:", error);
    }

    // fallback to today
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const formatDateForInput = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const getMeanCompletionDateFromTimetable = () => {
    try {
        const timetableState = localStorage.getItem("constructionTimetableState");
        const results = localStorage.getItem("constructionTimetableResults");
        if (!timetableState || !results) return null;
        const parsedState = JSON.parse(timetableState);
        if (parsedState.mode !== "auto") return null;
        const startDateStr = parsedState.formData?.startDate;
        if (!startDateStr) return null;
        const calc = JSON.parse(results);
        const low = Number(calc.low);
        const high = Number(calc.high);
        if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
        const meanDays = Math.round((low + high) / 2);
        const startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) return null;
        startDate.setDate(startDate.getDate() + meanDays);
        return startDate;
    } catch (error) {
        console.error("Failed to derive mean completion date:", error);
        return null;
    }
};

const getSelloutDateFromProjection = () => {
    try {
        const summaryStr = localStorage.getItem("salesVelocityProjectionSummary");
        if (!summaryStr) return null;
        const summary = JSON.parse(summaryStr);
        if (summary.meanSelloutDateISO) {
            const isoDate = new Date(summary.meanSelloutDateISO);
            if (!isNaN(isoDate.getTime())) return isoDate;
        }
        if (summary.meanSelloutDateFormatted) {
            const formattedDate = new Date(summary.meanSelloutDateFormatted);
            if (!isNaN(formattedDate.getTime())) return formattedDate;
        }
        return null;
    } catch (error) {
        console.error("Failed to derive sell-out date:", error);
        return null;
    }
};

const getDefaultEstimatedEndDate = () => {
    const completionDate = getMeanCompletionDateFromTimetable();
    const selloutDate = getSelloutDateFromProjection();
    let chosen = completionDate;
    if (!chosen || (selloutDate && selloutDate > chosen)) {
        chosen = selloutDate;
    }
    if (chosen) {
        return formatDateForInput(chosen);
    }
    // fallback to start date if available
    const fallback = getDefaultStartDate();
    return fallback || formatDateForInput(new Date());
};

const ConstructionTable = () => {
    const navigate = useNavigate();

    const [startDate, setStartDate] = useState(getDefaultStartDate);
    const [endDate, setEndDate] = useState(getDefaultEstimatedEndDate);

    const [rows, setRows] = useState([{ stages: [] }]);

    // Derived: start year/quarter display
    const startDateObj = useMemo(() => {
        const [y, m, d] = startDate.split("-").map(Number);
        return new Date(y || 0, (m || 1) - 1, d || 1);
    }, [startDate]);

    const startYear = useMemo(() => startDateObj.getFullYear(), [startDateObj]);
    const startQuarter = useMemo(() => getQuarterFromDate(startDateObj), [startDateObj]);

    // Derived: end year/quarter display
    const endDateObj = useMemo(() => {
        if (!endDate) return null;
        const [y, m, d] = endDate.split("-").map(Number);
        if (!y) return null;
        return new Date(y, (m || 1) - 1, d || 1);
    }, [endDate]);

    const endYear = useMemo(
        () => (endDateObj ? endDateObj.getFullYear() : null),
        [endDateObj]
    );

    const endQuarter = useMemo(
        () => (endDateObj ? getQuarterFromDate(endDateObj) : null),
        [endDateObj]
    );

    // Quarter and cumulative percentages for live display
    const percentages = useMemo(() => {
        const quarterPercentages = [];
        const cumulativePercentages = [];
        rows.forEach((row, i) => {
            const sel = row.stages || [];
            const rowPct = sel.reduce((acc, s) => acc + (STAGES[s] || 0), 0);
            quarterPercentages.push(rowPct);
            const prev = cumulativePercentages[i - 1] || 0;
            cumulativePercentages.push(prev + rowPct);
        });
        return { quarterPercentages, cumulativePercentages };
    }, [rows]);

    const quarterTotal = useMemo(() => {
        return (percentages.quarterPercentages || []).reduce((a, b) => a + b, 0);
    }, [percentages]);

    const finalCumulative = useMemo(() => {
        const arr = percentages.cumulativePercentages || [];
        return arr.length ? arr[arr.length - 1] : 0;
    }, [percentages]);

    const [tableData, totalCum] = useMemo(() => buildData(rows, startDateObj), [rows, startDateObj]);

    const addQuarter = () => {
        setRows(prev => [...prev, { stages: [] }]);
    };

    const resetAll = () => {
        setRows([{ stages: [] }]);
    };

    const removeRow = (idx) => {
        setRows(prev => prev.filter((_, i) => i !== idx));
    };

    const handleStageChange = (idx, newSelected) => {
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, stages: newSelected } : r)));
    };

    // Generate CSV and trigger download
    const handleDownloadCsv = () => {
        const header = ["Year", "Quarter", "Stage / Activity completion", "Description", "% of Work Completed (Quarter)", "% of Work Completed (Cumulative)"];
        const rowsCsv = tableData.map(r => [
            r.Year,
            r.Quarter,
            r.StageActivity,
            r.Description,
            r.QuarterPct,
            r.CumulativePct,
        ]);
        const encode = (val) => {
            if (val == null) return "";
            const s = String(val);
            if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const csv = [header, ...rowsCsv].map(row => row.map(encode).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "construction_schedule.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Persist minimal state for user convenience
    useEffect(() => {
        localStorage.setItem("constructionTable_startDate", startDate);
        localStorage.setItem("constructionTable_endDate", endDate);
        localStorage.setItem("constructionTable_rows", JSON.stringify(rows));
    }, [startDate, endDate, rows]);

    useEffect(() => {
        const sd = localStorage.getItem("constructionTable_startDate");
        const ed = localStorage.getItem("constructionTable_endDate");
        const rs = localStorage.getItem("constructionTable_rows");
        if (sd) setStartDate(sd);
        if (ed) setEndDate(ed);
        if (rs) {
            try {
                const parsed = JSON.parse(rs);
                if (Array.isArray(parsed)) setRows(parsed.map(r => ({ stages: Array.isArray(r.stages) ? r.stages : [] })));
            } catch { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectStyles = {
        control: (base) => ({
            ...base,
            minHeight: 38,
            borderColor: "#ced4da",
            boxShadow: "none",
            "&:hover": { borderColor: "#aeb6be" },
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
        }),
        menu: (base) => ({
            ...base,
            zIndex: 9999,
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: "#e9f0ff",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "#0d6efd",
            fontWeight: 500,
        }),
    };

    return (
        <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
            <main className="container-fluid py-5 px-4">
                {/* Header Section */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                    <div>
                        <div className="d-flex align-items-center mb-2">
                            <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3" onClick={() => navigate(-1)}>
                                <FaArrowLeft className="me-1" /> Back
                            </button>
                            <h1 className="display-6 fw-bold text-dark mb-0">
                                <FaHardHat className="text-primary me-3" />Construction Schedule
                            </h1>
                        </div>
                        <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Quarter-wise construction planning and scheduling.</p>
                    </div>
                    <div className="text-end mt-3 mt-md-0">
                        <div className="badge bg-white text-dark shadow-sm px-3 py-2 border rounded-pill">
                            <i className="far fa-calendar-alt me-2 text-primary"></i>
                            Start: <span className="fw-bold">{startYear} Q{startQuarter}</span>
                        </div>
                    </div>
                </div>

                <div className="row g-4 mb-5">
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label htmlFor="startDate" className="form-label fw-semibold">Project Start Date</label>
                                        <input
                                            id="startDate"
                                            type="date"
                                            className="form-control"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="estimatedEndDate" className="form-label fw-semibold">Estimated End Date</label>
                                        <input
                                            id="estimatedEndDate"
                                            type="date"
                                            className="form-control"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <div className="form-text mt-0">
                                            Default uses the later of estimator's mean completion date and saved sales-velocity sell-out date.
                                        </div>
                                    </div>
                                    <div className="col-12 d-flex gap-2 mt-2">
                                        <button className="btn btn-primary rounded-pill px-4" onClick={addQuarter}>
                                            <i className="fa-solid fa-plus me-2"></i>
                                            Add Quarter
                                        </button>
                                        <button className="btn btn-outline-secondary rounded-pill px-4" onClick={resetAll}>
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-lg-4">
                        <div className="card h-100 border-0 shadow-sm rounded-4">
                            <div className="card-body d-flex flex-column">
                                <h5 className="card-title fw-bold text-dark mb-3">Schedule Summary</h5>
                                <div className="d-flex flex-column gap-3 flex-grow-1 justify-content-center">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted">Start Year:</span>
                                        <span className="fw-bold text-dark">{startYear}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted">Start Quarter:</span>
                                        <span className="fw-bold text-dark">Q{startQuarter}</span>
                                    </div>
                                    {endYear && (
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-muted">End Year:</span>
                                            <span className="fw-bold text-dark">{endYear}</span>
                                        </div>
                                    )}
                                    {endQuarter && (
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-muted">End Quarter:</span>
                                            <span className="fw-bold text-dark">Q{endQuarter}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Alerts */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="alert alert-success rounded-3 border-0 shadow-sm h-100 mb-0">
                            <div className="d-flex align-items-center">
                                <FaCheckCircle className="me-2" />
                                <span>Start year: {startYear}</span>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="alert alert-success rounded-3 border-0 shadow-sm h-100 mb-0">
                            <div className="d-flex align-items-center">
                                <FaCheckCircle className="me-2" />
                                <span>Start Quarter: Q{startQuarter}</span>
                            </div>
                        </div>
                    </div>
                    {endYear && (
                        <div className="col-md-3">
                            <div className="alert alert-success rounded-3 border-0 shadow-sm h-100 mb-0">
                                <div className="d-flex align-items-center">
                                    <FaCheckCircle className="me-2" />
                                    <span>End year: {endYear}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {endQuarter && (
                        <div className="col-md-3">
                            <div className="alert alert-success rounded-3 border-0 shadow-sm h-100 mb-0">
                                <div className="d-flex align-items-center">
                                    <FaCheckCircle className="me-2" />
                                    <span>End Quarter: Q{endQuarter}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ----------------------------- LOGIC 2 ----------------------------- */}
                <div className="mt-5">
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-primary">Construction Time Table Logic 2</h2>
                        <p className="text-muted mb-0">Stages are fixed one per row. Select Year-Quarter for each stage.</p>
                    </div>

                    <LogicTwo startDateObj={startDateObj} endDateObj={endDateObj} />
                </div>

                {/* Revenue calculation button moved here to remain accessible */}
                <div className="mt-4 text-center">
                    <button
                        className="btn btn-primary btn-lg rounded-pill px-5 fw-semibold shadow-sm"
                        onClick={() => navigate("/revenue-projection")}
                    >
                        <FaCalculator className="me-2" />
                        Revenue calculation
                    </button>
                </div>
            </main>

            <style>{`
                .ls-1 { letter-spacing: 1px; }
                .card-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .card-hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
                .form-control:focus { box-shadow: none; border-color: var(--bs-primary) !important; }
                /* Scrollbar styling for tables */
                .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
                .table-responsive::-webkit-scrollbar-track { background: #f1f1f1; }
                .table-responsive::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
                .table-responsive::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
                
                /* Enhanced UI Styles */
                .icon-shape {
                    width: 40px;
                    height: 40px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .table-hover tbody tr {
                    transition: background-color 0.2s ease;
                }
                
                .table-hover tbody tr:hover {
                    background-color: rgba(0,0,0,0.02);
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                    transition: all 0.2s ease;
                }
                
                .btn:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>

    );
};

// ----------------------------- Logic 2 component (independent) -----------------------------
function LogicTwo({ startDateObj, endDateObj }) {
    // Fallback window (if no end date info is available)
    const FALLBACK_QUARTERS = 40;
    const calculateQuartersSpan = (startDate, endDate) => {
        if (!(startDate instanceof Date) || isNaN(startDate.getTime())) return null;
        if (!(endDate instanceof Date) || isNaN(endDate.getTime())) return null;
        // Ensure end is not before start
        if (endDate <= startDate) return null;

        const startYear = startDate.getFullYear();
        const startQuarter = getQuarterFromDate(startDate);
        const endYear = endDate.getFullYear();
        const endQuarter = getQuarterFromDate(endDate);

        const startIndex = startYear * 4 + (startQuarter - 1);
        const endIndex = endYear * 4 + (endQuarter - 1);
        const diff = endIndex - startIndex + 1;
        return diff > 0 ? diff : null;
    };

    const initialQuarters = calculateQuartersSpan(startDateObj, endDateObj) || FALLBACK_QUARTERS;

    const [quartersCount, setQuartersCount] = useState(initialQuarters);
    const [missingStages, setMissingStages] = useState([]);
    const [saveError, setSaveError] = useState("");

    // When start/end dates change, keep quarters window aligned with end date by default
    useEffect(() => {
        const span = calculateQuartersSpan(startDateObj, endDateObj);
        if (span && span > 0 && span !== quartersCount) {
            setQuartersCount(span);
        }
    }, [startDateObj, endDateObj]); // eslint-disable-line react-hooks/exhaustive-deps
    
    const [assignments, setAssignments] = useState(() => {
        const init = {};
        Object.keys(STAGES).forEach(s => { init[s] = []; });
        return init;
    });

    // Load saved data from localStorage when component mounts
    useEffect(() => {
        try {
            const savedData = localStorage.getItem("constructionTableLogic2");
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData)) {
                    // Convert saved data back to assignments format
                    const newAssignments = {};
                    Object.keys(STAGES).forEach(s => { newAssignments[s] = []; });
                    
                    // Create a map of quarter labels to indices
                    const quarterLabels = [];
                    const totalQ = quartersCount;
                    for (let i = 0; i < totalQ; i++) {
                        const [yearLabel, quarterLabel] = yearQuarterFromOffset(startDateObj, i);
                        quarterLabels.push({ idx: i, label: `${yearLabel} ${quarterLabel}` });
                    }
                    
                    // Create a map for quick lookup of quarter index by label
                    const quarterIndexMap = {};
                    quarterLabels.forEach(q => {
                        quarterIndexMap[q.label] = q.idx;
                    });
                    
                    // Populate assignments from saved data
                    parsedData.forEach(item => {
                        const stage = item.Stage;
                        const quartersString = item["Year-Quarter (multi-select)"] || "";
                        if (stage && quartersString) {
                            const quarters = quartersString.split(",").map(q => q.trim());
                            const indices = quarters
                                .map(q => quarterIndexMap[q])
                                .filter(idx => idx !== undefined && idx !== null);
                            if (indices.length > 0) {
                                newAssignments[stage] = indices;
                            }
                        }
                    });
                    
                    setAssignments(newAssignments);
                }
            }
        } catch (error) {
            console.error("Failed to load saved construction table logic 2 data:", error);
        }
    }, []); // Run only once on mount

    const quarterLabels = useMemo(() => {
        const list = [];
        const totalQ = quartersCount;
        for (let i = 0; i < totalQ; i++) {
            const [yearLabel, quarterLabel] = yearQuarterFromOffset(startDateObj, i);
            list.push({ idx: i, label: `${yearLabel} ${quarterLabel}` });
        }
        return list;
    }, [startDateObj, quartersCount]);

    const { quarterPercentages, cumulativePercentages } = useMemo(() => {
        const totalQ = quartersCount;
        const q = Array(totalQ).fill(0);
        Object.entries(assignments).forEach(([stage, qIdxs]) => {
            const pct = STAGES[stage] || 0;
            qIdxs.forEach(idx => {
                if (idx >= 0 && idx < q.length) q[idx] += pct;
            });
        });
        const cum = [];
        q.forEach((val, i) => {
            const prev = cum[i - 1] || 0;
            cum.push(prev + val);
        });
        return { quarterPercentages: q, cumulativePercentages: cum };
    }, [assignments, quartersCount]);

    const finalCumulative = useMemo(() => cumulativePercentages[cumulativePercentages.length - 1] || 0, [cumulativePercentages]);

    const tableData = useMemo(() => {
        const data = [];
        const totalQ = quartersCount;
        for (let i = 0; i < totalQ; i++) {
            const [yearLabel, quarterLabel] = yearQuarterFromOffset(startDateObj, i);
            const rowPct = quarterPercentages[i] || 0;
            const includedStages = Object.keys(assignments).filter(s => (assignments[s] || []).includes(i));
            const descriptions = includedStages.map(s => DESCRIPTIONS[s]).join(", ");
            // Only push rows where at least one stage is selected for this quarter
            if (includedStages.length > 0) {
                data.push({
                    Year: yearLabel,
                    Quarter: quarterLabel,
                    StageActivity: includedStages.join(", "),
                    Description: descriptions,
                    QuarterPct: rowPct,
                });
            }
        }
        return data;
    }, [quartersCount, startDateObj, quarterPercentages, assignments]);

    const getSelectStyles = (hasError = false) => ({
        control: (base) => ({
            ...base,
            minHeight: 38,
            borderColor: hasError ? "#dc3545" : "#ced4da",
            boxShadow: "none",
            "&:hover": { borderColor: hasError ? "#dc3545" : "#aeb6be" },
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, zIndex: 9999 }),
        multiValue: (base) => ({ ...base, backgroundColor: "#e9f0ff" }),
        multiValueLabel: (base) => ({ ...base, color: "#0d6efd", fontWeight: 500 }),
    });

    const handleStageAssignChange = (stage, opts) => {
        // Deduplicate selections within the same stage cell
        const selectedIdxs = Array.from(new Set(opts ? opts.map(o => o.value) : []));
        setAssignments(prev => ({ ...prev, [stage]: selectedIdxs }));
    };

    const handleDownloadCsv = () => {
        const header = ["Year", "Quarter", "Stage / Activity completion", "Description", "% of Work Completed (Quarter)", "% of Work Completed (Cumulative)"];
        const rowsCsv = tableData.map(r => [r.Year, r.Quarter, r.StageActivity, r.Description, r.QuarterPct, r.CumulativePct]);
        const encode = (val) => {
            if (val == null) return "";
            const s = String(val);
            if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const csv = [header, ...rowsCsv].map(row => row.map(encode).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "construction_schedule_logic2.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="row g-4 mb-4">
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-md-12">
                                    <label className="form-label fw-semibold">Number of Quarters (auto from dates, editable)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={1}
                                        step={1}
                                        value={quartersCount}
                                        onChange={(e) => setQuartersCount(Math.max(1, Number(e.target.value) || 1))}
                                    />
                                </div>
                                <div className="col-md-12 mt-3">
                                    <div className="alert alert-info mb-0 rounded-3">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-semibold">Quarters Window:</span>
                                            <span>{quarterLabels[0]?.label} → {quarterLabels[quarterLabels.length - 1]?.label}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
                            <h6 className="text-uppercase text-muted fw-bold small mb-2 ls-1">Final Cumulative %</h6>
                            <h3 className="fw-bold text-dark mb-0">{finalCumulative}</h3>
                            <small className="text-muted">(Should be 100)</small>
                            <div className="mt-3">
                                {finalCumulative < 100 && (
                                    <span className="badge bg-warning text-dark rounded-pill px-3 py-2">
                                        <FaExclamationTriangle className="me-1" /> Below 100%
                                    </span>
                                )}
                                {finalCumulative > 100 && (
                                    <span className="badge bg-danger rounded-pill px-3 py-2">
                                        <FaTimesCircle className="me-1" /> Above 100%
                                    </span>
                                )}
                                {finalCumulative === 100 && (
                                    <span className="badge bg-success rounded-pill px-3 py-2">
                                        <FaCheckCircle className="me-1" /> Complete
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {finalCumulative < 100 && (
                <div className="alert alert-warning rounded-3 border-0 shadow-sm mb-4">
                    <div className="d-flex align-items-center">
                        <FaExclamationTriangle className="me-2" />
                        <span>⚠️ Cumulative % is {finalCumulative} (less than 100). Assign remaining stages to reach 100.</span>
                    </div>
                </div>
            )}
            {finalCumulative > 100 && (
                <div className="alert alert-danger rounded-3 border-0 shadow-sm mb-4">
                    <div className="d-flex align-items-center">
                        <FaTimesCircle className="me-2" />
                        <span>❌ Cumulative % is {finalCumulative} (exceeds 100). Remove some assignments or adjust selections.</span>
                    </div>
                </div>
            )}
            {finalCumulative === 100 && (
                <div className="alert alert-success rounded-3 border-0 shadow-sm mb-4">
                    <div className="d-flex align-items-center">
                        <FaCheckCircle className="me-2" />
                        <span>✅ Cumulative % is exactly {finalCumulative}. Schedule is complete.</span>
                    </div>
                </div>
            )}

            <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="fw-bold text-dark mb-1">Stage Assignments</h5>
                            <p className="text-muted small mb-0">Assign stages to quarters for construction scheduling</p>
                        </div>
                    </div>
                </div>
                <div className="card-body p-4">
                    <div className="table-responsive rounded-3 border bg-white">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="bg-light text-secondary">
                                <tr>
                                    <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ width: "40%", letterSpacing: "0.5px" }}>Stage</th>
                                    <th className="py-3 px-4 fw-semibold small text-uppercase text-center" style={{ width: "15%", letterSpacing: "0.5px" }}>Weightage %</th>
                                    <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ width: "45%", letterSpacing: "0.5px" }}>Year-Quarter (multi-select)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(STAGES).map((stage) => {
                                    const value = (assignments[stage] || []).map(idx => ({
                                        value: idx,
                                        label: quarterLabels[idx]?.label || `Q${idx + 1}`,
                                    }));
                                    const options = quarterLabels.map(q => ({ value: q.idx, label: q.label }));
                                    const hasError = missingStages.includes(stage);
                                    return (
                                        <tr key={stage} className="border-bottom">
                                            <td className="py-3 px-4 fw-semibold text-dark">
                                                <div className="d-flex align-items-center">
                                                    {hasError && (
                                                        <FaExclamationTriangle className="text-danger me-2" title="Please select at least one Year-Quarter" />
                                                    )}
                                                    {stage}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center fw-bold text-dark">{STAGES[stage]}%</td>
                                            <td className="py-3 px-4">
                                                <Select
                                                    options={options}
                                                    value={value}
                                                    onChange={(opts) => handleStageAssignChange(stage, opts)}
                                                    isMulti
                                                    isClearable
                                                    placeholder="— Select multiple Year-Quarter —"
                                                    styles={getSelectStyles(hasError)}
                                                    aria-label={`Select quarters for ${stage}`}
                                                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                                    menuPosition="fixed"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold text-dark mb-1">Schedule Table (Logic 2)</h5>
                        <p className="text-muted small mb-0">Generated construction schedule based on stage assignments</p>
                    </div>
                    <div className="icon-shape bg-info bg-opacity-10 text-info rounded-circle p-2">
                        <FaTable />
                    </div>
                </div>
                <div className="card-body p-4">
                    <div className="table-responsive rounded-3 border bg-white">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">Year</th>
                                    <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">Quarter</th>
                                    <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">Stage / Activity completion</th>
                                    <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">Description</th>
                                    <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">% of Work Completed (Quarter)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((r, idx) => (
                                    <tr key={`l2-${idx}`} className="border-bottom">
                                        <td className="px-4 fw-medium text-dark">{r.Year}</td>
                                        <td className="px-4 fw-medium text-dark">{r.Quarter}</td>
                                        <td className="px-4 fw-medium text-dark">{r.StageActivity}</td>
                                        <td className="px-4 text-muted">{r.Description}</td>
                                        <td className="px-4 fw-bold text-dark">{r.QuarterPct}</td>
                                    </tr>
                                ))}
                                {tableData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-muted">
                                            <FaInbox className="fa-2x mb-3 d-block" />
                                            <p className="mb-0">No schedule data available. Assign stages to quarters to generate the schedule.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 d-flex justify-content-end">
                        <button className="btn btn-primary rounded-pill px-4" onClick={handleDownloadCsv}>
                            <i className="fa-solid fa-file-csv me-2"></i>
                            Download CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-center mb-5">
                <button
                    className="btn btn-success btn-lg rounded-pill px-5 fw-semibold shadow-sm"
                    onClick={() => {
                        // Validate that each stage has at least one Year-Quarter selected
                        const missingStages = [];
                        Object.keys(STAGES).forEach(stage => {
                            const selectedQuarters = assignments[stage] || [];
                            if (selectedQuarters.length === 0) {
                                missingStages.push(stage);
                            }
                        });

                        if (missingStages.length > 0) {
                            setMissingStages(missingStages);
                            setSaveError("Missing fields: please select at least one Year-Quarter for each stage.");
                            return;
                        }

                        setMissingStages([]);
                        setSaveError("");

                        // Prepare Logic 2 Data
                        const dataToSave = Object.keys(STAGES).map(stage => {
                            const selectedQuarters = (assignments[stage] || [])
                                .map(idx => quarterLabels[idx]?.label || `Q${idx + 1}`)
                                .join(", ");
                            return {
                                Stage: stage,
                                "Weightage %": STAGES[stage],
                                "Year-Quarter (multi-select)": selectedQuarters || ""
                            };
                        });
                        localStorage.setItem("constructionTableLogic2", JSON.stringify(dataToSave));

                        // -----------------------------------------------------------------
                        // Calculate Year-wise Weightage Logic
                        // 1. Map to hold combined weightage per year
                        const yearWeightageMap = {};

                        Object.keys(STAGES).forEach(stage => {
                            const stageWeight = STAGES[stage] || 0;
                            const selectedQuartersIdxs = assignments[stage] || [];

                            // Get unique years from the selected quarters for this stage
                            const uniqueYears = new Set();
                            selectedQuartersIdxs.forEach(idx => {
                                const qLabel = quarterLabels[idx]?.label || "";
                                // Extract year from label (e.g. "2024 Q1" -> 2024)
                                const match = qLabel.match(/(\d{4})/);
                                if (match) {
                                    uniqueYears.add(match[1]);
                                }
                            });

                            const yearsArr = Array.from(uniqueYears);
                            if (yearsArr.length > 0) {
                                // Divide weightage equally among the years
                                const weightPerYear = stageWeight / yearsArr.length;

                                yearsArr.forEach(year => {
                                    if (!yearWeightageMap[year]) {
                                        yearWeightageMap[year] = 0;
                                    }
                                    yearWeightageMap[year] += weightPerYear;
                                });
                            }
                        });

                        // Convert map to array for saving only (optional, map is easier to read later)
                        localStorage.setItem("constructionTableLogic2YearlyWeights", JSON.stringify(yearWeightageMap));
                        // -----------------------------------------------------------------

                        alert("Construction Table Logic 2 data (and year-wise weightages) has been saved successfully.");
                    }}
                >
                    <FaSave className="me-2" />
                    Save Construction Table Logic 2
                </button>
                {saveError && (
                    <div className="mt-3 alert alert-danger rounded-3 border-0 shadow-sm d-inline-block">
                        {saveError}
                    </div>
                )}
            </div>
        </>
    );
}

// ----------------------------- Logic 3 component (independent) -----------------------------
function LogicThree({ startDateObj, endDateObj }) {
    // rowsAssignments: array length quarters, each item { w1: string|null, w2: string|null, w3: string|null, w4: string|null }

    const calculateRowsFromDates = (startDate, endDate) => {
        if (!(startDate instanceof Date) || isNaN(startDate.getTime())) return 4;
        if (!(endDate instanceof Date) || isNaN(endDate.getTime())) return 4;
        if (endDate <= startDate) return 4;

        const startYear = startDate.getFullYear();
        const startQuarter = getQuarterFromDate(startDate);
        const endYear = endDate.getFullYear();
        const endQuarter = getQuarterFromDate(endDate);

        const startIndex = startYear * 4 + (startQuarter - 1);
        const endIndex = endYear * 4 + (endQuarter - 1);
        const diff = endIndex - startIndex + 1;
        return diff > 0 ? diff : 4;
    };

    const initialRows = calculateRowsFromDates(startDateObj, endDateObj);

    const [rowsAssignments, setRowsAssignments] = useState(() =>
        Array.from({ length: initialRows }, () => ({ w1: null, w2: null, w3: null, w4: null }))
    );

    // Keep rows aligned with date range when dates change
    useEffect(() => {
        const targetLength = calculateRowsFromDates(startDateObj, endDateObj);
        setRowsAssignments((prev) => {
            if (prev.length === targetLength) return prev;
            if (prev.length < targetLength) {
                const extra = Array.from({ length: targetLength - prev.length }, () => ({
                    w1: null,
                    w2: null,
                    w3: null,
                    w4: null,
                }));
                return [...prev, ...extra];
            }
            // prev.length > targetLength
            return prev.slice(0, targetLength);
        });
    }, [startDateObj, endDateObj]);

    const quarterLabels = useMemo(() => {
        const list = [];
        for (let i = 0; i < rowsAssignments.length; i++) {
            const [yearLabel, quarterLabel] = yearQuarterFromOffset(startDateObj, i);
            list.push({ idx: i, yearLabel, quarterLabel });
        }
        return list;
    }, [startDateObj, rowsAssignments.length]);

    const selectStyles = {
        control: (base) => ({
            ...base,
            minHeight: 38,
            borderColor: "#ced4da",
            boxShadow: "none",
            "&:hover": { borderColor: "#aeb6be" },
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, zIndex: 9999 }),
    };

    const allStageOptions = useMemo(() => Object.keys(STAGES).map(opt => ({
        value: opt,
        label: `${opt} (${STAGES[opt]}%)`,
    })), []);

    const setCell = (rowIdx, key, value) => {
        setRowsAssignments(prev => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));
    };

    const getOptionsForCell = (rowIdx, cellKey) => {
        const row = rowsAssignments[rowIdx] || { w1: null, w2: null, w3: null, w4: null };
        const used = new Set([row.w1, row.w2, row.w3, row.w4].filter(Boolean));
        // Allow currently selected value to remain visible
        const current = row[cellKey];
        return allStageOptions.filter(o => o.value === current || !used.has(o.value));
    };

    return (
        <div className="card">
            <div className="card-body">
                <div className="table-responsive">
                    <table className="table align-middle">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: "10%" }}>Year</th>
                                <th style={{ width: "10%" }}>Quarter</th>
                                <th style={{ width: "20%" }}>Work1</th>
                                <th style={{ width: "20%" }}>Work2</th>
                                <th style={{ width: "20%" }}>Work3</th>
                                <th style={{ width: "20%" }}>Work4</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quarterLabels.map(({ idx, yearLabel, quarterLabel }) => {
                                const row = rowsAssignments[idx] || { w1: null, w2: null, w3: null, w4: null };
                                const val = (v) => v ? { value: v, label: `${v} (${STAGES[v]}%)` } : null;
                                return (
                                    <tr key={`l3-${idx}`}>
                                        <td><input className="form-control" value={yearLabel} disabled /></td>
                                        <td><input className="form-control" value={quarterLabel} disabled /></td>
                                        <td>
                                            <label className="form-label fw-semibold text-dark mb-2">Stage selection</label>
                                            <Select
                                                options={getOptionsForCell(idx, "w1")}
                                                value={val(row.w1)}
                                                onChange={(opt) => setCell(idx, "w1", opt ? opt.value : null)}
                                                isClearable
                                                placeholder="— Select one —"
                                                styles={selectStyles}
                                                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                        </td>
                                        <td>
                                            <label className="form-label fw-semibold text-dark mb-2">Stage selection</label>
                                            <Select
                                                options={getOptionsForCell(idx, "w2")}
                                                value={val(row.w2)}
                                                onChange={(opt) => setCell(idx, "w2", opt ? opt.value : null)}
                                                isClearable
                                                placeholder="— Select one —"
                                                styles={selectStyles}
                                                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                        </td>
                                        <td>
                                            <label className="form-label fw-semibold text-dark mb-2">Stage selection</label>
                                            <Select
                                                options={getOptionsForCell(idx, "w3")}
                                                value={val(row.w3)}
                                                onChange={(opt) => setCell(idx, "w3", opt ? opt.value : null)}
                                                isClearable
                                                placeholder="— Select one —"
                                                styles={selectStyles}
                                                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                        </td>
                                        <td>
                                            <label className="form-label fw-semibold text-dark mb-2">Stage selection</label>
                                            <Select
                                                options={getOptionsForCell(idx, "w4")}
                                                value={val(row.w4)}
                                                onChange={(opt) => setCell(idx, "w4", opt ? opt.value : null)}
                                                isClearable
                                                placeholder="— Select one —"
                                                styles={selectStyles}
                                                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
export default ConstructionTable;