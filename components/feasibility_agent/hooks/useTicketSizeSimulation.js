import { useState, useEffect, useCallback } from 'react';

const UNIT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '>3BHK', 'Shop', 'Office'];
const normalizeMetricKey = (value) =>
    String(value || "").toLowerCase().replace(/\s+/g, "");

const useTicketSizeSimulation = (villageId) => {
    const [avgTicketSizes, setAvgTicketSizes] = useState(() => {
        const initial = {};
        UNIT_TYPES.forEach(t => initial[t] = 7500000);
        return initial;
    });

    const [selectedUnitTypes, setSelectedUnitTypes] = useState(UNIT_TYPES);
    const [simulationResults, setSimulationResults] = useState({});
    const [unitCountData, setUnitCountData] = useState({});

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
                }
            }
        } catch (error) {
            console.error("Failed to load unit count data", error);
        }
    }, []);

    // Listen for unit count data updates
    useEffect(() => {
        const handleUnitCountUpdate = (event) => {
            if (event.detail && Array.isArray(event.detail)) {
                const unitCounts = {};
                event.detail.forEach(item => {
                    if (item.Unit_Type && item.No_Of_Units !== null) {
                        unitCounts[item.Unit_Type] = item.No_Of_Units;
                    }
                });
                setUnitCountData(unitCounts);
            }
        };
        window.addEventListener('unitCountDataUpdated', handleUnitCountUpdate);
        return () => window.removeEventListener('unitCountDataUpdated', handleUnitCountUpdate);
    }, []);

    const toggleUnitType = useCallback((type) => {
        setSelectedUnitTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    }, []);

    const handleAvgTicketSizeChange = useCallback((type, value) => {
        setAvgTicketSizes(prev => ({ ...prev, [type]: value }));
    }, []);

    const resetToDefault = useCallback(() => {
        const resetSizes = {};
        UNIT_TYPES.forEach(t => resetSizes[t] = 7500000);
        setAvgTicketSizes(resetSizes);
        setSimulationResults({});
    }, []);

    const generateGridRows = useCallback((type, avgSize) => {
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
    }, []);

    // Fetch default Average Ticket Sizes when villageId changes
    useEffect(() => {
        if (!villageId) return;
        const fetchDefaultTicketSizes = async () => {
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
                    if (data?.success && Array.isArray(data?.data)) {
                        setAvgTicketSizes(prev => {
                            const next = { ...prev };
                            let updated = false;
                            data.data.forEach(item => {
                                const apiType = item.bhk_type || item.BHK_Type;
                                const price = Number(item.price_statistics?.avg_price ?? item.avg_price);
                                if (apiType && !isNaN(price)) {
                                    const normalizedApi = String(apiType).toLowerCase().replace(/\s+/g, '');
                                    const match = UNIT_TYPES.find(t => {
                                        const normalizedLocal = t.toLowerCase().replace(/\s+/g, '');
                                        if (normalizedLocal.includes('>3') && normalizedApi.includes('>3')) return true;
                                        return normalizedLocal === normalizedApi;
                                    });
                                    if (match) { next[match] = price; updated = true; }
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

    const fetchSalesVelocity = useCallback(async (typesToFetch) => {
        if (!villageId) { alert("No Village ID found."); return; }
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
            if (combinedPayload.length === 0) { console.warn("No simulation data found."); return; }

            const params = new URLSearchParams({ igr_village_id: String(villageId) });
            const response = await fetch(`/new_rate_simulator/simulator/simulation-transaction-counts-detailed?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(combinedPayload),
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.success && Array.isArray(data?.data)) {
                    const responseData = data.data;

                    // Helper to normalize type strings (lowercase, no spaces)
                    const normalizeType = (t) => {
                        if (!t) return '';
                        return String(t).toLowerCase().replace(/\s+/g, '');
                    };

                    // 1. Group response items by normalized BHK_Type
                    const groupedByNorm = {};
                    responseData.forEach(item => {
                        const norm = normalizeType(item.BHK_Type);
                        if (!groupedByNorm[norm]) groupedByNorm[norm] = [];
                        groupedByNorm[norm].push(item);
                    });

                    // 2. Process each requested type
                    const newResults = {};
                    const transactionRows = {};
                    for (const type of typesToFetch) {
                        const normType = normalizeType(type);
                        const itemsForType = groupedByNorm[normType] || [];

                        if (itemsForType.length === 0) {
                            console.warn(`No data returned for type ${type}`);
                            continue;
                        }

                        const avgSize = avgTicketSizes[type];
                        const uiRows = generateGridRows(type, avgSize);
                        const typeResults = {};

                        itemsForType.forEach(apiItem => {
                            if (apiItem && apiItem.transaction_count !== undefined) {
                                const apiLow = Number(apiItem.Lowrange);
                                const apiHigh = Number(apiItem.Highrange);
                                const matchingRowIndex = uiRows.findIndex(uiRow =>
                                    Number(uiRow.Lowrange) === apiLow &&
                                    Number(uiRow.Highrange) === apiHigh
                                );
                                if (matchingRowIndex !== -1) {
                                    typeResults[matchingRowIndex] = Number(apiItem.transaction_count);
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
                    }

                    setSimulationResults(prev => ({ ...prev, ...newResults }));
                    try {
                        const existing = JSON.parse(localStorage.getItem("ticketSizeSimulationTransactions") || "{}");
                        const payload = {
                            rows: { ...(existing.rows || {}), ...transactionRows },
                            updatedAt: new Date().toISOString(),
                        };
                        localStorage.setItem("ticketSizeSimulationTransactions", JSON.stringify(payload));
                        window.dispatchEvent(new CustomEvent("ticketSizeSimulationTransactionsUpdated", { detail: payload }));
                    } catch (storageError) {
                        console.error("Failed to save ticket size transaction rows", storageError);
                    }
                    alert("Analysis updated with latest sales velocity data!");
                }
            } else {
                alert("Failed to fetch sales velocity data.");
            }
        } catch (error) {
            console.error("Error fetching sales velocity", error);
            alert("Error updating sales velocity.");
        }
    }, [villageId, avgTicketSizes, generateGridRows]);

    const handleSimulate = useCallback(async () => {
        await fetchSalesVelocity(selectedUnitTypes);
    }, [fetchSalesVelocity, selectedUnitTypes]);

    const handleSimulateSingle = useCallback(async (type) => {
        await fetchSalesVelocity([type]);
    }, [fetchSalesVelocity]);

    const handleSave = useCallback(async () => {
        try {
            for (const type of selectedUnitTypes) {
                const avgSize = avgTicketSizes[type];
                const formattedData = generateGridRows(type, avgSize);
                localStorage.setItem(`${type} simulation`, JSON.stringify(formattedData));
            }
            alert("Configuration saved locally.");
        } catch (error) {
            console.error("Failed to save simulation data", error);
            alert("Failed to save data.");
        }
    }, [selectedUnitTypes, avgTicketSizes, generateGridRows]);

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

                const rowTicketSize = Number(
                    generateGridRows(type, avgTicketSizes[type])?.[highestEntry.rowIndex]?.AVG_TICKET_SIZE ??
                    generateGridRows(type, avgTicketSizes[type])?.[highestEntry.rowIndex]?.ticketSize ??
                    0
                ) || 0;

                metricUpdates[normalizeMetricKey(type)] = {
                    bhk: type,
                    avgTicketSize,
                    totalTransactions: highestEntry.transactions,
                    transactionsPerMonth: highestEntry.transactions / 12,
                    highlightedRowIndex: highestEntry.rowIndex,
                    bestTicketSize: rowTicketSize,
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

    const getUnitCount = useCallback((type) => {
        return unitCountData[type] || unitCountData[type.toLowerCase()] || 0;
    }, [unitCountData]);

    return {
        UNIT_TYPES,
        avgTicketSizes,
        selectedUnitTypes,
        simulationResults,
        unitCountData,
        toggleUnitType,
        handleAvgTicketSizeChange,
        resetToDefault,
        handleSimulate,
        handleSimulateSingle,
        handleSave,
        getUnitCount,
    };
};

export { UNIT_TYPES };
export default useTicketSizeSimulation;
