import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaCoins, FaCalculator, FaChartLine, FaSave } from 'react-icons/fa';
const UNIT_TYPES = ['1BHK', '2BHK', '3BHK', '>3BHK', 'Shop', 'Office'];

// Helper to normalize unit type keys (remove spaces, uppercase except BHK)
// e.g. "1 BHK" -> "1BHK", "1 Bhk" -> "1BHK", "Shop" -> "Shop"
const normalizeKey = (key) => {
    if (!key) return '';
    return key.replace(/\s+/g, '').replace(/Bhk/i, 'BHK');
};

// Number ticker hook – counts from 0 to `target` when the ref enters viewport
const useTickerAnimation = (target, duration = 1500) => {
    const [display, setDisplay] = useState(0);
    const ref = useRef(null);
    const hasAnimated = useRef(false);

    const animate = useCallback((to) => {
        if (to === 0) { setDisplay(0); return; }
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * to));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [duration]);

    useEffect(() => {
        hasAnimated.current = false;
        setDisplay(0);
    }, [target]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    animate(target);
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [target, animate]);

    return { ref, display };
};

const ExpectedRevenueComparison = () => {
    const [excelData, setExcelData] = useState({});
    const [bayesianData, setBayesianData] = useState({});

    // Helper to apply a saved payload into state
    const applySavedData = useCallback((payload) => {
        if (!payload) return;
        if (payload.excelLogic?.data) {
            const normalized = {};
            Object.entries(payload.excelLogic.data).forEach(([k, v]) => {
                const key = normalizeKey(k);
                if (UNIT_TYPES.includes(key)) normalized[key] = v;
            });
            setExcelData(normalized);
        }
        if (payload.bayesianOpt?.data) {
            const normalized = {};
            Object.entries(payload.bayesianOpt.data).forEach(([k, v]) => {
                const key = normalizeKey(k);
                if (UNIT_TYPES.includes(key)) normalized[key] = v;
            });
            setBayesianData(normalized);
        }
    }, []);

    useEffect(() => {
        // ── 1. Seed from localStorage on mount ──────────────────────────────
        try {
            const saved = localStorage.getItem('expectedRevenueData');
            if (saved) applySavedData(JSON.parse(saved));
        } catch (e) {
            console.warn('Failed to load expectedRevenueData from localStorage', e);
        }

        // ── 2. Live updates from deciding factors ───────────────────────────
        const handleExcelUpdate = (event) => {
            const { unitType, expectedRevenue } = event.detail;
            const key = normalizeKey(unitType);
            if (UNIT_TYPES.includes(key)) {
                setExcelData(prev => ({ ...prev, [key]: expectedRevenue }));
            }
        };

        const handleBayesianUpdate = (event) => {
            const { unitType, expectedRevenue } = event.detail;
            const key = normalizeKey(unitType);
            if (UNIT_TYPES.includes(key)) {
                setBayesianData(prev => ({ ...prev, [key]: expectedRevenue }));
            }
        };

        // ── 3. Re-hydrate whenever the Save button persists new data ────────
        const handleSaved = (event) => applySavedData(event.detail);

        window.addEventListener('excelSimulationUpdated', handleExcelUpdate);
        window.addEventListener('bayesianSimulationUpdated', handleBayesianUpdate);
        window.addEventListener('expectedRevenueSaved', handleSaved);

        return () => {
            window.removeEventListener('excelSimulationUpdated', handleExcelUpdate);
            window.removeEventListener('bayesianSimulationUpdated', handleBayesianUpdate);
            window.removeEventListener('expectedRevenueSaved', handleSaved);
        };
    }, [applySavedData]);

    const excelTotal = useMemo(() => {
        return Object.values(excelData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }, [excelData]);

    const bayesianTotal = useMemo(() => {
        return Object.values(bayesianData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }, [bayesianData]);

    // Ticker hooks for summary cards
    const { ref: excelCardRef, display: excelTicker } = useTickerAnimation(excelTotal);
    const { ref: bayesCardRef, display: bayesianTicker } = useTickerAnimation(bayesianTotal);

    const formatCurrency = (val) => {
        if (val === undefined || val === null) return '-';
        return val.toLocaleString('en-IN');
    };

    return (
        <div className="nr-selected-panel mt-5 fade-in-up">
            <style>{`
                .nr-selected-panel {
                    background: #ffffff;
                    border: 1px solid #e7ebf1;
                    border-radius: 24px;
                    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
                    overflow: hidden;
                }
                .nr-selected-header {
                    padding: 24px 26px 16px;
                    background: #ffffff;
                    border-bottom: 1px solid #edf1f6;
                }
                .nr-selected-eyebrow {
                    color: #8b95a5;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }
                .nr-selected-title {
                    color: #111827;
                    font-size: 32px;
                    line-height: 1;
                    font-weight: 800;
                    margin: 0;
                }
                .nr-selected-body {
                    padding: 26px;
                    background: #ffffff;
                }
                .nr-inner-card {
                    border: 1px solid #e5eaf2 !important;
                    background: #fbfcff !important;
                    border-radius: 18px !important;
                    overflow: hidden;
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035) !important;
                }
                .nr-inner-card .card-header {
                    background: #f4f7fb !important;
                    color: #273242 !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                }
                .nr-selected-panel .table thead th {
                    background: #f4f7fb !important;
                    color: #3f4a5a !important;
                    border-color: #e2e8f0 !important;
                    font-size: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .nr-selected-panel .table tbody td {
                    border-color: #e2e8f0 !important;
                    color: #273242;
                }
                .nr-selected-panel .btn {
                    min-height: 40px;
                    border-radius: 999px;
                    font-weight: 800;
                }
            `}</style>
            <div className="nr-selected-header">
                <div className="nr-selected-eyebrow">Selected Section</div>
                <h4 className="nr-selected-title">
                    <FaCoins className="me-2 text-warning" />
                     Maximum Potential Revenue
                </h4>
            </div>
            <div className="nr-selected-body">
                <div className="row g-4">
                    {/* Excel Logic Table */}
                    <div className="col-lg-6">
                        <div className="card border h-100 nr-inner-card">
                            <div className="card-header bg-light py-2">
                                <h6 className="fw-bold mb-0 text-primary">Expected Revenue (Base Logic)</h6>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-striped table-hover mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Unit Type</th>
                                            <th className="text-end">Expected Revenue (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {UNIT_TYPES.map(type => (
                                            <tr key={type}>
                                                <td>{type}</td>
                                                <td className="text-end fw-medium">
                                                    {formatCurrency(excelData[type])}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-info fw-bold">
                                        <tr>
                                            <td>Total Expected Revenue</td>
                                            <td className="text-end">{formatCurrency(excelTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Bayesian Optimization Table */}
                    <div className="col-lg-6">
                        <div className="card border h-100 nr-inner-card">
                            <div className="card-header bg-light py-2">
                                <h6 className="fw-bold mb-0 text-success">Expected Revenue (Bayesian Opt)</h6>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-striped table-hover mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Unit Type</th>
                                            <th className="text-end">Expected Revenue (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {UNIT_TYPES.map(type => (
                                            <tr key={type}>
                                                <td>{type}</td>
                                                <td className="text-end fw-medium">
                                                    {formatCurrency(bayesianData[type])}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-success fw-bold">
                                        <tr>
                                            <td>Total Expected Revenue</td>
                                            <td className="text-end">{formatCurrency(bayesianTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="row g-4 mt-2">
                    {/* Base Logic Card */}
                    <div className="col-lg-6">
                        <div
                            ref={excelCardRef}
                            className="rounded-4 p-4 text-white d-flex flex-column align-items-center justify-content-center"
                            style={{
                                background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
                                boxShadow: '0 8px 24px rgba(13,110,253,0.35)',
                                minHeight: '140px'
                            }}
                        >
                            <div className="mb-2 opacity-90" style={{ fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                                <FaCalculator className="me-2" />
                                Total Expected Revenue using Base Logic
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                                ₹ {excelTicker.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    {/* Bayesian Opt Card */}
                    <div className="col-lg-6">
                        <div
                            ref={bayesCardRef}
                            className="rounded-4 p-4 text-white d-flex flex-column align-items-center justify-content-center"
                            style={{
                                background: 'linear-gradient(135deg, #198754 0%, #0f5132 100%)',
                                boxShadow: '0 8px 24px rgba(25,135,84,0.35)',
                                minHeight: '140px'
                            }}
                        >
                            <div className="mb-2 opacity-90" style={{ fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                                <FaChartLine className="me-2" />
                                Total Expected Revenue using Bayesian Opt
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                                ₹ {bayesianTicker.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Section */}
                <div className="d-flex justify-content-center mt-4">
                    <button
                        className="btn btn-primary rounded-pill px-5 py-2 fw-bold shadow-sm interactive-btn"
                        onClick={() => {
                            const payload = {
                                excelLogic: {
                                    data: excelData,
                                    total: excelTotal
                                },
                                bayesianOpt: {
                                    data: bayesianData,
                                    total: bayesianTotal
                                },
                                timestamp: new Date().toISOString()
                            };

                            try {
                                localStorage.setItem('expectedRevenueData', JSON.stringify(payload));
                                // Dispatch event in case other components need to know
                                window.dispatchEvent(new CustomEvent('expectedRevenueSaved', { detail: payload }));
                                alert('Expected Revenue data saved successfully!');
                            } catch (err) {
                                console.error('Failed to save expected revenue:', err);
                                alert('Failed to save data. Please try again.');
                            }
                        }}
                    >
                        <FaSave className="me-2" />
                        Save Revenue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpectedRevenueComparison;
