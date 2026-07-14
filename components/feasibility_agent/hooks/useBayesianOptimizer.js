import { useState, useEffect, useCallback } from 'react';

const BHK_TYPES = ['1Bhk', '2Bhk', '3Bhk', '>3Bhk', 'Shop', 'Office'];

const useBayesianOptimizer = () => {
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [metaError, setMetaError] = useState(null);
    const [overview, setOverview] = useState(null);
    const [villages, setVillages] = useState([]);
    const [selectedVillageId, setSelectedVillageId] = useState(null);
    const [selectedVillageName, setSelectedVillageName] = useState("");
    const [nTrials, setNTrials] = useState(100);
    const [randomSeed, setRandomSeed] = useState(42);
    const [unitCounts, setUnitCounts] = useState({});

    // Load saved unit mix counts
    useEffect(() => {
        const loadUnitCounts = () => {
            try {
                const saved = localStorage.getItem("revenuep2_unitMix");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const counts = {};
                    if (parsed.unitCountData && Array.isArray(parsed.unitCountData)) {
                        parsed.unitCountData.forEach((item) => {
                            if (item.Unit_Type && item.No_Of_Units != null) {
                                const key = String(item.Unit_Type).replace(/\s+/g, "").toLowerCase();
                                counts[key] = item.No_Of_Units;
                            }
                        });
                    }
                    setUnitCounts(counts);
                }
            } catch (e) {
                console.error("Failed to load unit counts", e);
            }
        };

        loadUnitCounts();

        const handleUnitCountUpdate = (event) => {
            if (event.detail && Array.isArray(event.detail)) {
                const counts = {};
                event.detail.forEach((item) => {
                    if (item.Unit_Type && item.No_Of_Units != null) {
                        const key = String(item.Unit_Type).replace(/\s+/g, "").toLowerCase();
                        counts[key] = item.No_Of_Units;
                    }
                });
                setUnitCounts(counts);
            }
        };

        window.addEventListener("unitCountDataUpdated", handleUnitCountUpdate);
        return () => window.removeEventListener("unitCountDataUpdated", handleUnitCountUpdate);
    }, []);

    // Load metadata once
    useEffect(() => {
        const loadMeta = async () => {
            setLoadingMeta(true);
            setMetaError(null);
            try {
                const resp = await fetch("/new_rate_simulator/simulator/bayesian-optimizer/meta");
                if (!resp.ok) throw new Error(`Meta request failed: ${resp.status}`);
                const data = await resp.json();
                if (!data.success) throw new Error(data.error || "Failed to load metadata");
                setOverview(data.overview);
                const villagesList = data.villages || [];
                setVillages(villagesList);

                if (villagesList.length > 0) {
                    let defaultVillage = null;
                    try {
                        const savedData = localStorage.getItem('Market Analysis Payload');
                        if (savedData) {
                            const parsed = JSON.parse(savedData);
                            if (parsed.villageId) {
                                defaultVillage = villagesList.find((v) => v.id === parsed.villageId);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse Market Analysis Payload", e);
                    }
                    const villageToSelect = defaultVillage || villagesList[0];
                    setSelectedVillageId(villageToSelect.id);
                    setSelectedVillageName(villageToSelect.name);
                }
            } catch (err) {
                setMetaError(err.message || "Failed to load metadata");
            } finally {
                setLoadingMeta(false);
            }
        };
        loadMeta();
    }, []);

    // Listen for market analysis updates
    useEffect(() => {
        const handleMarketAnalysisUpdate = (event) => {
            if (event.detail && event.detail.villageId) {
                const newVillageId = event.detail.villageId;
                const newVillageName = event.detail.villageName;
                if (villages.length > 0) {
                    const villageExists = villages.some(v => v.id === newVillageId);
                    if (villageExists) {
                        setSelectedVillageId(newVillageId);
                        if (newVillageName) setSelectedVillageName(newVillageName);
                        else {
                            const v = villages.find(v => v.id === newVillageId);
                            if (v) setSelectedVillageName(v.name);
                        }
                    }
                } else {
                    setSelectedVillageId(newVillageId);
                    if (newVillageName) setSelectedVillageName(newVillageName);
                }
            }
        };
        window.addEventListener('marketAnalysisUpdated', handleMarketAnalysisUpdate);
        return () => window.removeEventListener('marketAnalysisUpdated', handleMarketAnalysisUpdate);
    }, [villages]);

    const getUnitCount = useCallback((bhk) => {
        return unitCounts[bhk.replace(/\s+/g, "").toLowerCase()];
    }, [unitCounts]);

    return {
        BHK_TYPES,
        loadingMeta,
        metaError,
        overview,
        villages,
        selectedVillageId,
        selectedVillageName,
        setSelectedVillageId,
        setSelectedVillageName,
        nTrials,
        setNTrials,
        randomSeed,
        setRandomSeed,
        unitCounts,
        getUnitCount,
    };
};

export { BHK_TYPES };
export default useBayesianOptimizer;
