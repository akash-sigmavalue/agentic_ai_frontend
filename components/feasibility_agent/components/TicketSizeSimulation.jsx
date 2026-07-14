import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaSearchDollar, FaPlay, FaSave, FaUndo, FaDatabase, FaCheckCircle, FaChartLine, FaLayerGroup, FaTrophy } from 'react-icons/fa';

const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const normalizeMetricKey = (value) =>
    String(value || "").toLowerCase().replace(/\s+/g, "");

// Helper for number formatting (same as HTML logic: commas, max 2 decimals)
const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value !== 'number') return value;

    // Format with commas for thousands and maximum 2 decimal places
    if (value % 1 === 0) {
        return value.toLocaleString('en-US');
    } else {
        const rounded = Math.round(value * 100) / 100;
        return rounded.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }
};

const UNIT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '>3BHK', 'Shop', 'Office'];

const SimulationTable = React.memo(({ type, avgTicketSize, onAvgTicketSizeChange, velocityData, onSimulate, noOfUnits }) => {

    // Compute table data for this specific table
    const gridData = useMemo(() => {
        const baseVal = Number(avgTicketSize) || 0;
        const configLower = baseVal * 0.9;
        const configHigh = baseVal * 1.1;
        const configRange = configHigh - configLower;

        let currentTicketSize = configLower;
        const simRows = [];

        for (let i = 0; i < 11; i++) {
            const rowTicketSize = currentTicketSize;
            const rowLow = rowTicketSize * 0.9;
            const rowHigh = rowTicketSize * 1.1;

            const count = velocityData[i] || 0;       // raw API value (total transactions)
            const perMonth = count / 12;              // divide by 12
            const expectedRevenue = rowTicketSize * (noOfUnits || 0); // ticket size * No_Of_Units from saved data

            simRows.push({
                bhk: type.replace(' ', ''),
                ticketSize: rowTicketSize,
                low: rowLow,
                high: rowHigh,
                count: Math.round(count),
                perMonth: perMonth,
                expectedRevenue: expectedRevenue
            });
            // Increment by configRange/10 (F6 value) for all types
            currentTicketSize += configRange / 10;
        }

        return {
            config: { avgTicketSize: baseVal, lower: configLower, higher: configHigh, range: configRange },
            simRows
        };
    }, [avgTicketSize, velocityData, type, noOfUnits]);

    // Dispatch event with max expected revenue whenever gridData changes
    useEffect(() => {
        if (gridData && gridData.simRows && gridData.simRows.length > 0) {
            const maxPerMonth = Math.max(...gridData.simRows.map(r => r.perMonth));

            // Only update the Expected Revenue Calculation if a simulation has run
            if (maxPerMonth > 0) {
                const bestRow = gridData.simRows.find(r => r.perMonth === maxPerMonth);

                if (bestRow) {
                    const event = new CustomEvent('excelSimulationUpdated', {
                        detail: {
                            unitType: type,
                            expectedRevenue: bestRow.expectedRevenue
                        }
                    });
                    window.dispatchEvent(event);
                }
            }
        }
    }, [gridData, type]);

    return (
        <div className="card shadow-sm border-0 h-100 rounded-4 tss-simulation-card" style={{ transition: 'all 0.3s' }}>{/* ... */}

            <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center tss-simulation-card-header">
                <h5 className="fw-bold text-dark m-0 d-flex align-items-center">
                    <span className="badge bg-primary bg-opacity-10 text-primary me-2 rounded-3 p-2">
                        <FaChartLine />
                    </span>
                    {type} Simulation
                </h5>
                <button
                    className="btn btn-warning btn-sm rounded-pill px-3 shadow-sm"
                    onClick={onSimulate}
                >
                   <FaPlay/>Simulate
                </button>
            </div>
            <div className="card-body p-4 tss-simulation-card-body">
                <div className="tss-grid-shell" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px' }}>
                    <div className="tss-grid">
                        {/* ----- TOP HEADER ROW (A5) ----- */}
                        <div className="tss-cell tss-header">A5</div>
                        <div className="tss-cell tss-header">B5</div>
                        <div className="tss-cell tss-header">Average Ticket Size</div>
                        <div className="tss-cell tss-header">Lower range</div>
                        <div className="tss-cell tss-header">Higher range</div>
                        <div className="tss-cell tss-header">Per simulation</div>
                        <div className="tss-cell tss-header bg-light"></div> {/* was column G, now empty */}
                        <div className="tss-cell tss-header bg-light"></div> {/* new column H – empty */}

                        {/* ----- CONFIG ROW (row 6) ----- */}
                        <div className="tss-cell tss-header">6</div>
                        <div className="tss-cell"></div>
                        <div className="tss-cell p-1">
                            <input
                                type="number"
                                className="tss-input fw-bold text-primary"
                                value={avgTicketSize}
                                onChange={(e) => onAvgTicketSizeChange(e.target.value)}
                            />
                        </div>
                        <div className="tss-cell tss-formula justify-content-center">{formatNumber(gridData.config.lower)}</div>
                        <div className="tss-cell tss-formula justify-content-center">{formatNumber(gridData.config.higher)}</div>
                        <div className="tss-cell tss-formula justify-content-center">
                            {formatNumber(gridData.config.range / 10)}
                        </div>
                        <div className="tss-cell bg-light"></div> {/* empty column G */}
                        <div className="tss-cell bg-light"></div> {/* empty column H */}

                        {/* ----- SPACER (empty rows) ----- */}
                        {Array(8).fill(null).map((_, i) => <div key={`spacer-${i}`} className="tss-cell bg-light" style={{ minHeight: '10px' }}></div>)}

                        {/* ----- TABLE HEADERS (row 8) ----- */}
                        <div className="tss-cell tss-header">A8</div>
                        <div className="tss-cell tss-header">Bhk</div>
                        <div className="tss-cell tss-header">Ticket size</div>
                        <div className="tss-cell tss-header">low</div>
                        <div className="tss-cell tss-header">high</div>
                        <div className="tss-cell tss-header">Expected revenue</div> {/* NEW */}
                        <div className="tss-cell tss-header">Total transactions</div>
                        <div className="tss-cell tss-header">Per month</div>

                        {/* ----- DATA ROWS (9..19) ----- */}
                        {(() => {
                            const maxPerMonth = Math.max(...gridData.simRows.map(r => r.perMonth));
                            return gridData.simRows.map((row, idx) => {
                                const rowNum = 9 + idx;
                                const isMax = row.perMonth === maxPerMonth && maxPerMonth > 0;
                                // Highlight style: light green background + dark green border
                                const highlightStyle = isMax ? { backgroundColor: '#e8f5e9', borderTop: '2px solid #4caf50', borderBottom: '2px solid #4caf50' } : {};

                                // Text styles
                                const textStyle = isMax ? "fw-bold text-dark" : "text-secondary";
                                // For highlighted row, we MUST NOT use 'tss-formula' class because it has !important white background.
                                const cellClass = isMax ? 'tss-cell justify-content-end pe-3' : 'tss-cell tss-formula justify-content-end pe-3';

                                return (
                                    <React.Fragment key={idx}>
                                        <div className={`tss-cell tss-header small ${isMax ? 'fw-bold text-success' : 'text-muted'}`} style={highlightStyle}>{rowNum}</div>
                                        <div className={`tss-cell justify-content-center fw-medium ${isMax ? 'fw-bold text-success' : ''}`} style={highlightStyle}>{type}</div>
                                        <div className={`${cellClass} ${textStyle}`} style={highlightStyle}>{formatNumber(row.ticketSize)}</div>
                                        <div className={`${cellClass} ${textStyle}`} style={highlightStyle}>{formatNumber(row.low)}</div>
                                        <div className={`${cellClass} ${textStyle}`} style={highlightStyle}>{formatNumber(row.high)}</div>
                                        {/* EXPECTED REVENUE COLUMN */}
                                        <div className={`${cellClass} fw-bold ${isMax ? 'text-success' : 'text-primary'}`} style={highlightStyle}>
                                            {formatNumber(row.expectedRevenue)}
                                        </div>
                                        {/* TOTAL TRANSACTIONS */}
                                        <div className={`${cellClass} fw-bold ${isMax ? 'text-success' : 'text-dark'}`} style={highlightStyle}>
                                            {formatNumber(row.count)}
                                        </div>
                                        {/* PER MONTH */}
                                        <div className={`${cellClass} fw-bold ${isMax ? 'text-success' : 'text-primary'}`} style={highlightStyle}>
                                            {formatNumber(row.perMonth)}
                                            {isMax && <FaTrophy className="ms-1 text-warning" />}
                                        </div>
                                    </React.Fragment>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
});

const TicketSizeSimulation = ({ villageId }) => {
    // Initialize avgTicketSizes for all types
    const [avgTicketSizes, setAvgTicketSizes] = useState(() => {
        const initial = {};
        UNIT_TYPES.forEach(t => initial[t] = 7500000);
        return initial;
    });

    const [selectedUnitTypes, setSelectedUnitTypes] = useState(UNIT_TYPES);
    const [simulationResults, setSimulationResults] = useState({}); // { '1 BHK': { 0: val, ... }, ... }
    const [unitCountData, setUnitCountData] = useState({}); // { '1 BHK': 123, '2 BHK': 456, ... }

    // Load unit count data from localStorage
    useEffect(() => {
        try {
            const savedData = localStorage.getItem('revenuep2_unitMix');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed?.unitCountData && Array.isArray(parsed.unitCountData)) {
                    const unitCounts = {};
                    parsed.unitCountData.forEach(item => {
                        if (item.Unit_Type && item.No_Of_Units !== null) {
                            unitCounts[item.Unit_Type] = item.No_Of_Units;
                        }
                    });
                    setUnitCountData(unitCounts);
                    console.log("TicketSizeSimulation: Loaded unit count data:", unitCounts);
                }
            }
        } catch (error) {
            console.error("Failed to load unit count data", error);
        }
    }, []);

    // Listen for unit count data updates from revenuep2
    useEffect(() => {
        const handleUnitCountUpdate = (event) => {
            console.log("TicketSizeSimulation: Received unit count update event", event.detail);
            if (event.detail && Array.isArray(event.detail)) {
                const unitCounts = {};
                event.detail.forEach(item => {
                    if (item.Unit_Type && item.No_Of_Units !== null) {
                        unitCounts[item.Unit_Type] = item.No_Of_Units;
                    }
                });
                setUnitCountData(unitCounts);
                console.log("TicketSizeSimulation: Updated unit count data:", unitCounts);
            }
        };

        window.addEventListener('unitCountDataUpdated', handleUnitCountUpdate);

        return () => {
            window.removeEventListener('unitCountDataUpdated', handleUnitCountUpdate);
        };
    }, []);

    const toggleUnitType = (type) => {
        setSelectedUnitTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const handleAvgTicketSizeChange = (type, value) => {
        setAvgTicketSizes(prev => ({ ...prev, [type]: value }));
    };

    const resetToDefault = () => {
        const resetSizes = {};
        UNIT_TYPES.forEach(t => resetSizes[t] = 7500000);
        setAvgTicketSizes(resetSizes);
        setSimulationResults({});
    };

    // Helper to generate grid data logic (unchanged – only the fields required for saving)
    const generateGridRows = (type, avgSize) => {
        const baseVal = Number(avgSize) || 0;
        const configLower = baseVal * 0.9;
        const configHigh = baseVal * 1.1;
        const configRange = configHigh - configLower;

        let currentTicketSize = configLower;
        const rows = [];
        for (let i = 0; i < 11; i++) {
            rows.push({
                BHK_Type: type,
                AVG_TICKET_SIZE: Math.round(currentTicketSize),
                Lowrange: Math.round(currentTicketSize * 0.9),
                Highrange: Math.round(currentTicketSize * 1.1)
            });
            currentTicketSize += configRange / 10;
        }
        return rows;
    };

    // Fetch default Average Ticket Sizes when villageId changes
    useEffect(() => {
        if (!villageId) {
            console.log("TicketSizeSimulation: No villageId provided");
            return;
        }

        const fetchDefaultTicketSizes = async () => {
            console.log(`TicketSizeSimulation: Fetching defaults for villageId: ${villageId}`);
            try {
                const payload = UNIT_TYPES.map(type => ({ BHK_Type: type }));
                const params = new URLSearchParams({ igr_village_id: String(villageId) });
                const response = await fetch(`/new_rate_simulator/simulator/average-ticket-size?${params.toString()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log("TicketSizeSimulation: Data:", data);
                    if (data?.success && Array.isArray(data?.data)) {
                        setAvgTicketSizes(prev => {
                            const next = { ...prev };
                            let updated = false;

                            data.data.forEach(item => {
                                const apiType = item.bhk_type || item.BHK_Type;
                                const price = Number(item.price_statistics?.avg_price ?? item.avg_price);
                                console.log(`TicketSizeSimulation: Processing ${apiType}, Price: ${price}`);

                                if (apiType && !isNaN(price)) {
                                    const normalizedApi = String(apiType).toLowerCase().replace(/\s+/g, '');
                                    const match = UNIT_TYPES.find(t => {
                                        const normalizedLocal = t.toLowerCase().replace(/\s+/g, '');
                                        if (normalizedLocal.includes('>3') && normalizedApi.includes('>3')) return true;
                                        return normalizedLocal === normalizedApi;
                                    });

                                    if (match) {
                                        next[match] = price;
                                        updated = true;
                                    }
                                }
                            });
                            return updated ? next : prev;
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch default ticket sizes", error);
            }
        };

        fetchDefaultTicketSizes();
    }, [villageId]);

    const fetchSalesVelocity = async (typesToFetch) => {
        if (!villageId) {
            alert("No Village ID found.");
            return;
        }

        try {
            let combinedPayload = [];
            const typeIndexMap = {};
            let currentIndex = 0;

            for (const type of typesToFetch) {
                const savedKey = `${type} simulation`;
                const savedData = localStorage.getItem(savedKey);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        combinedPayload = [...combinedPayload, ...parsed];
                        typeIndexMap[type] = { start: currentIndex, count: parsed.length };
                        currentIndex += parsed.length;
                    }
                }
            }

            if (combinedPayload.length === 0) {
                console.warn("No simulation data found to fetch.");
                return;
            }

            console.log("TicketSizeSimulation: Simulate payload:", combinedPayload);
            const params = new URLSearchParams({ igr_village_id: String(villageId) });
            const response = await fetch(`/new_rate_simulator/simulator/simulation-transaction-counts-detailed?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(combinedPayload),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("TicketSizeSimulation: Simulate response:", data);
                if (data?.success && Array.isArray(data?.data)) {
                    const newResults = {};

                    const responseData = data.data;
                    const metricUpdates = {};
                    const transactionRows = {};

                    for (const type of typesToFetch) {
                        if (typeIndexMap[type]) {
                            const { start, count } = typeIndexMap[type];
                            const typeResults = {};
                            const segment = responseData.slice(start, start + count);

                            const avgSize = avgTicketSizes[type];
                            const uiRows = generateGridRows(type, avgSize);

                            segment.forEach((apiItem) => {
                                if (apiItem && apiItem.transaction_count !== undefined) {
                                    const apiLowrange = Number(apiItem.Lowrange);
                                    const apiHighrange = Number(apiItem.Highrange);

                                    const matchingRowIndex = uiRows.findIndex(uiRow => {
                                        const uiLow = Number(uiRow.Lowrange);
                                        const uiHigh = Number(uiRow.Highrange);
                                        return uiLow === apiLowrange && uiHigh === apiHighrange;
                                    });

                                    if (matchingRowIndex !== -1) {
                                        typeResults[matchingRowIndex] = Number(apiItem.transaction_count);
                                        console.log(`TicketSizeSimulation: Matched ${type} row ${matchingRowIndex}: Low=${apiLowrange}, High=${apiHighrange}, Count=${apiItem.transaction_count}`);
                                    } else {
                                        console.warn(`TicketSizeSimulation: No match found for ${type}: Low=${apiLowrange}, High=${apiHighrange}`);
                                    }
                                    }
                                });
                            newResults[type] = typeResults;
                            transactionRows[normalizeMetricKey(type)] = uiRows.map((row, rowIndex) => ({
                                bhk: type,
                                ticketSize: Number(row?.AVG_TICKET_SIZE) || 0,
                                lowRange: Number(row?.Lowrange) || 0,
                                highRange: Number(row?.Highrange) || 0,
                                totalTransactions: Number(typeResults[rowIndex]) || 0,
                            }));

                            const bestIndex = Object.entries(typeResults).reduce((best, [rowIndex, transactions]) => {
                                const txnCount = Number(transactions) || 0;
                                if (!best || txnCount > best.transactions) {
                                    const row = uiRows[Number(rowIndex)];
                                    return {
                                        transactions: txnCount,
                                        avgTicketSize: Number(row?.ticketSize) || 0,
                                        perMonth: Number(row?.perMonth) || 0,
                                    };
                                }
                                return best;
                            }, null);

                            if (bestIndex) {
                                metricUpdates[normalizeMetricKey(type)] = {
                                    bhk: type,
                                    avgTicketSize: bestIndex.avgTicketSize,
                                    totalTransactions: bestIndex.transactions,
                                    transactionsPerMonth: bestIndex.perMonth,
                                };
                            }
                        }
                    }

                    setSimulationResults(prev => ({ ...prev, ...newResults }));

                    try {
                        const existingTransactions = JSON.parse(localStorage.getItem("ticketSizeSimulationTransactions") || "{}");
                        const transactionPayload = {
                            rows: { ...(existingTransactions.rows || {}), ...transactionRows },
                            updatedAt: new Date().toISOString(),
                        };
                        localStorage.setItem("ticketSizeSimulationTransactions", JSON.stringify(transactionPayload));
                        window.dispatchEvent(new CustomEvent("ticketSizeSimulationTransactionsUpdated", { detail: transactionPayload }));

                        const existing = JSON.parse(localStorage.getItem("ticketSizeMetrics") || "{}");
                        const merged = { ...existing, ...metricUpdates };
                        localStorage.setItem("ticketSizeMetrics", JSON.stringify(merged));
                        window.dispatchEvent(new CustomEvent("ticketSizeMetricsUpdated", { detail: merged }));
                    } catch (storageError) {
                        console.error("Failed to save ticket size metrics", storageError);
                    }

                    alert("Analysis updated with latest sales velocity data!");
                }
            } else {
                console.error("Sales velocity fetch failed", response.status);
                alert("Failed to fetch sales velocity data.");
            }
        } catch (error) {
            console.error("Error fetching sales velocity", error);
            alert("Error updating sales velocity.");
        }
    };

    const handleSimulate = async () => {
        await fetchSalesVelocity(selectedUnitTypes);
    };

    const handleSimulateSingle = async (type) => {
        await fetchSalesVelocity([type]);
    };

    const handleSave = async () => {
        try {
            const typesToSave = selectedUnitTypes;
            for (const type of typesToSave) {
                const avgSize = avgTicketSizes[type];
                const formattedData = generateGridRows(type, avgSize);
                localStorage.setItem(`${type} simulation`, JSON.stringify(formattedData));
            }
            alert("Configuration saved locally.");
        } catch (error) {
            console.error("Failed to save simulation data", error);
            alert("Failed to save data.");
        }
    };

    useEffect(() => {
        try {
            const metricUpdates = {};

            selectedUnitTypes.forEach((type) => {
                const typeResults = simulationResults[type];
                if (!typeResults || typeof typeResults !== "object") return;

                const avgTicketSize = Number(avgTicketSizes[type]) || 0;
                const highestEntry = Object.entries(typeResults).reduce((best, [rowIndex, transactions]) => {
                    const txnCount = Number(transactions) || 0;
                    if (!best || txnCount > best.transactions) {
                        return {
                            transactions: txnCount,
                            rowIndex: Number(rowIndex),
                        };
                    }
                    return best;
                }, null);

                if (!highestEntry) return;

                const bestRow = generateGridRows(type, avgTicketSizes[type])[highestEntry.rowIndex];
                const bestTicketSize = Number(bestRow?.AVG_TICKET_SIZE ?? bestRow?.ticketSize ?? 0) || 0;

                metricUpdates[normalizeMetricKey(type)] = {
                    bhk: type,
                    avgTicketSize,
                    totalTransactions: highestEntry.transactions,
                    transactionsPerMonth: highestEntry.transactions / 12,
                    highlightedRowIndex: highestEntry.rowIndex,
                    bestTicketSize,
                };
            });

            if (Object.keys(metricUpdates).length > 0) {
                const cachedPayload = {
                    rows: metricUpdates,
                    avgTicketSizes,
                    simulationResults,
                    selectedUnitTypes,
                };
                localStorage.setItem("ticketSizeMetrics", JSON.stringify(cachedPayload));
                window.dispatchEvent(new CustomEvent("ticketSizeMetricsUpdated", { detail: cachedPayload }));
            }
        } catch (error) {
            console.error("Failed to cache ticket size metrics", error);
        }
    }, [simulationResults, avgTicketSizes, selectedUnitTypes]);

    const css = `
      .tss-container { 
        max-width: 100%; 
        width: 100%;
        margin: 0 auto; 
        background: transparent; 
        padding-top: 20px;
      }
      .tss-header-section {
        background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(74, 144, 226, 0.05) 100%);
        padding: 15px 20px; 
        margin: 25px 0 15px 0; 
        border-left: 4px solid #4a90e2; 
        font-weight: bold;
        border-radius: 8px;
        color: #1a1a1a;
        font-size: 1.1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        background: white;
      }
      .tss-grid {
        display: grid;
        gap: 1px;
        background-color: transparent;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        width: fit-content;
        overflow: visible;
        /* Columns: A(ID), B(Bhk), C(Ticket), D(Low), E(High), F(Expected revenue), G(Total), H(PerMonth) */
        grid-template-columns: 35px 60px 110px 100px 100px 120px 110px 90px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.03);
      }
      .tss-cell {
        background-color: white;
        padding: 8px 6px;
        min-height: 45px;
        display: flex;
        align-items: center;
        font-size: 12px;
        transition: background-color 0.2s ease;
      }
      .tss-cell:hover {
        background-color: #f8f9fa;
      }
      .tss-header {
        background: #f1f3f5;
        font-weight: 600;
        text-align: center;
        color: #495057;
        border-bottom: 1px solid #dee2e6;
        justify-content: center;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.5px;
      }
      .tss-formula {
        background: #ffffffff !important;
        color: #2e7d32;
        font-weight: 500;
      }
      .tss-input {
        width: 100%;
        border: 1px solid #ced4da;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
        background: #fff;
        transition: all 0.2s;
      }
      .tss-input:focus {
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        outline: none;
      }
      .tss-btn {
        transition: all 0.2s;
      }
      .tss-btn:active {
        transform: scale(0.98);
      }
      .shimmer {
        animation: shimmer 2s infinite linear;
        background: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
        background-size: 1000px 100%;
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
  `;

    return (
        <div className="tss-container mt-2 fade-in-up">
            <style>{css}</style>

            <div className="tss-header-section">
                <FaSearchDollar className="me-2" />Ticket Size Simulation
            </div>

            <p className="small text-muted mb-4 px-1">
                Simulate transaction volume based on average ticket size. Change the average ticket size to see how it affects the distribution.
                Green cells are calculated automatically.
            </p>

            {/* Controls */}
            <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ backgroundColor: 'white' }}>
                <div className="card-body p-3 d-flex flex-wrap gap-3 align-items-center">
                    <button
                        className="btn btn-info rounded-pill px-4 shadow-sm tss-btn text-white"
                        onClick={handleSave}
                    >
                        <FaSave className="me-2" />Save All
                    </button>
                    <button
                        className="btn btn-warning rounded-pill px-4 shadow-sm tss-btn text-dark fw-bold"
                        onClick={handleSimulate}
                    >
                        <FaPlay className="me-2" />Simulate all
                    </button>
                    <button
                        className="btn btn-primary rounded-pill px-4 shadow-sm tss-btn"
                        onClick={resetToDefault}
                    >
                        <FaUndo className="me-2" />Reset All
                    </button>
                    <div className="ms-auto text-muted small">
                        <FaDatabase className="me-1" /> Data Simulation Removed
                    </div>
                </div>
            </div>

            {/* Unit Type Selection */}
            <div className="card border-0 shadow-sm rounded-4 mb-5 bg-white">
                <div className="card-body p-3">
                    <label className="small text-uppercase fw-bold text-muted mb-2 d-block ls-1">Select Unit Types to Simulate</label>
                    <div className="d-flex flex-wrap gap-2">
                        {UNIT_TYPES.map(type => (
                            <button
                                key={type}
                                className={`btn rounded-pill px-3 py-2 text-sm fw-medium transition-all shadow-sm ${selectedUnitTypes.includes(type)
                                    ? 'btn-primary text-white border-0'
                                    : 'btn-light text-secondary bg-white border'
                                    }`}
                                style={{ fontSize: '0.85rem' }}
                                onClick={() => toggleUnitType(type)}
                            >
                                {selectedUnitTypes.includes(type) ?
                                    <FaCheckCircle className="me-2" /> :
                                    <FaRegCircle className="me-2 text-muted opacity-50" />
                                }
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Tables */}
            <div className="row g-4 pb-5">
                {selectedUnitTypes.map(type => (
                    <div className="col-12" key={type}>
                        <SimulationTable
                            type={type}
                            avgTicketSize={avgTicketSizes[type]}
                            onAvgTicketSizeChange={(val) => handleAvgTicketSizeChange(type, val)}
                            velocityData={simulationResults[type] || {}}
                            onSimulate={() => handleSimulateSingle(type)}
                            noOfUnits={unitCountData[type] || unitCountData[type.toLowerCase()] || 0}
                        />
                    </div>
                ))}
            </div>

            {selectedUnitTypes.length === 0 && (
                <div className="text-center py-5 text-muted bg-white rounded-4 shadow-sm border border-dashed">
                    <div className="py-5">
                        <FaLayerGroup className="fa-3x mb-3 text-muted opacity-25" />
                        <h6 className="fw-bold text-secondary">No Unit Types Selected</h6>
                        <p className="small mb-0">Select at least one unit type above to view and edit simulation parameters.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export { SimulationTable };
export default TicketSizeSimulation;
