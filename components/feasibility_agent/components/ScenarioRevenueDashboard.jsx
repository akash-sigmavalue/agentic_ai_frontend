import React, { useState, useEffect } from 'react';
import { FaChartLine, FaChevronDown, FaChevronUp } from 'react-icons/fa6';

const getScenarioColor = (idx) => {
    const colors = ['#448C74', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
    return colors[idx % colors.length];
};

const ScenarioRevenueDashboard = () => {
    const [scenarios, setScenarios] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [isTableExpanded, setIsTableExpanded] = useState(false);
    const [currency, setCurrency] = useState("INR");

    const loadData = () => {
        try {
            const savedLand = localStorage.getItem("Land Identification");
            if (savedLand) {
                const parsedLand = JSON.parse(savedLand);
                if (parsedLand.currency) {
                    setCurrency(parsedLand.currency);
                }
            }

            const saved = localStorage.getItem('ProductMixScenarios');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.scenarios && parsed.scenarios.length > 0) {
                    setScenarios(parsed.scenarios);
                    setActiveScenarioId(parsed.activeScenarioId || parsed.scenarios[0].id);
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        loadData();
        window.addEventListener('productMixScenariosUpdated', loadData);
        return () => window.removeEventListener('productMixScenariosUpdated', loadData);
    }, []);

    const handleScenarioSelect = (id) => {
        setActiveScenarioId(id);
        try {
            localStorage.setItem('ProductMixScenarios', JSON.stringify({
                scenarios,
                activeScenarioId: id
            }));
            window.dispatchEvent(new Event('productMixScenariosUpdated'));
        } catch (e) {}
    };

    // Calculate revenue for all scenarios and save to RevenueV2
    useEffect(() => {
        if (scenarios.length === 0) return;
        
        const allRevenues = scenarios.map(scenario => {
            let totalRevenue = 0;
            const rowRevenues = [];
            if (scenario.productMixRows) {
                scenario.productMixRows.forEach(row => {
                    const ticketSize = Number(row.pointArea || 0) * Number(row.rate || 0);
                    const inventory = Number(row.totalInventory || 0);
                    const rowRevenue = ticketSize * inventory;
                    totalRevenue += rowRevenue;
                    rowRevenues.push({
                        ...row,
                        ticketSize,
                        inventory,
                        rowRevenue
                    });
                });
            }
            return {
                scenarioId: scenario.id,
                totalRevenue,
                rowRevenues
            };
        });

        try {
            localStorage.setItem('RevenueV2', JSON.stringify({
                scenarios: allRevenues,
                activeScenarioId
            }));
        } catch (e) {}
    }, [scenarios, activeScenarioId]);

    const activeScenario = scenarios.find(s => s.id === activeScenarioId);
    
    // Revenue Calculation for UI (current active)
    let totalRevenue = 0;
    const rowRevenues = [];
    
    if (activeScenario && activeScenario.productMixRows) {
        activeScenario.productMixRows.forEach(row => {
            const ticketSize = Number(row.pointArea || 0) * Number(row.rate || 0);
            const inventory = Number(row.totalInventory || 0);
            const rowRevenue = ticketSize * inventory;
            totalRevenue += rowRevenue;
            
            rowRevenues.push({
                ...row,
                ticketSize,
                inventory,
                rowRevenue
            });
        });
    }

    const formatCurrencyLocal = (value) => {
        if (!value) return "0";
        if (value >= 10000000) return (value / 10000000).toFixed(2) + " Cr";
        if (value >= 100000) return (value / 100000).toFixed(2) + " L";
        return value.toLocaleString();
    };

    if (scenarios.length === 0) {
        return (
            <div className="text-center p-5 text-muted">
                No product mix scenarios found. Please configure scenarios in the Product Mix section first.
            </div>
        );
    }

    return (
        <div className="unit-design-panel w-100 p-4" style={{
            background: "#ffffff",
            border: "1px solid #e7ebf1",
            borderRadius: "24px",
            boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
            marginBottom: "2rem"
        }}>
            <style>
                {`
                .scenario-strip {
                    display: flex;
                    align-items: stretch;
                    gap: 10px;
                    overflow-x: auto;
                    padding: 4px 2px 10px;
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f8fafc;
                }
                .scenario-strip::-webkit-scrollbar {
                    height: 6px;
                }
                .scenario-strip::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .scenario-strip::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 4px;
                }
                .scenario-strip::-webkit-scrollbar-thumb:hover {
                    background-color: #448C74;
                }
                .scenario-card {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    min-width: 170px;
                    max-width: 220px;
                    padding: 12px 16px 12px 18px;
                    border-radius: 14px;
                    border: 2px solid #e2e8f0;
                    background: #ffffff;
                    cursor: pointer;
                    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                    user-select: none;
                    overflow: hidden;
                }
                .scenario-card::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 5px;
                    border-radius: 14px 0 0 14px;
                    background: #e2e8f0;
                    transition: background 0.22s;
                }
                .scenario-card.active::before {
                    background: var(--sc-color, #448C74);
                }
                .scenario-card:hover:not(.active) {
                    border-color: #94a3b8;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 18px rgba(0,0,0,0.07);
                }
                .scenario-card.active {
                    border-color: var(--sc-color, #448C74);
                    box-shadow: 0 4px 16px rgba(68,140,116,0.18);
                    background: #f8fffe;
                }
                .scenario-card-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 800;
                    color: #fff;
                    flex-shrink: 0;
                    margin-bottom: 6px;
                }
                .scenario-card-name {
                    font-size: 12.5px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 160px;
                }
                .scenario-card-subtitle {
                    font-size: 10.5px;
                    color: #94a3b8;
                    font-weight: 500;
                    margin-top: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 160px;
                    min-height: 14px;
                }
                .table-container-custom {
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    overflow: hidden;
                    background: #fff;
                }
                .table-custom-hover tbody tr:hover {
                    background-color: #f8fafc !important;
                }
                .pm-section-header {
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    background: transparent;
                    transition: background 0.2s;
                    border-radius: 16px 16px 0 0;
                }
                .pm-section-header:hover {
                    background: #f8fafc;
                }
                .pm-section-eyebrow {
                    font-size: 11px;
                    letter-spacing: 0.1em;
                    color: #64748b;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }
                .pm-section-maintitle {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
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
                    background: #f1f5f9;
                    color: #475569;
                    transition: all 0.2s;
                }
                .pm-chevron-btn:hover {
                    background: #e2e8f0;
                }
                `}
            </style>

            {/* Scenario Tabs (Read Only) */}
            <div className="mb-4 pb-3 border-bottom">
                <div className="fw-bold text-muted mb-3 text-uppercase" style={{ fontSize: '13px', letterSpacing: '1px' }}>
                    Scenarios
                </div>
                <div className="scenario-strip">
                    {scenarios.map((scenario, idx) => {
                        const isActive = scenario.id === activeScenarioId;
                        const color = getScenarioColor(idx);
                        return (
                            <div
                                key={scenario.id}
                                className={`scenario-card${isActive ? ' active' : ''}`}
                                style={{ '--sc-color': color }}
                                onClick={() => handleScenarioSelect(scenario.id)}
                                title={`Click to switch to ${scenario.name}`}
                            >
                                <div className="scenario-card-icon" style={{ background: color }}>
                                    {idx + 1}
                                </div>
                                <div className="scenario-card-name">
                                    {scenario.name}
                                </div>
                                <div className="scenario-card-subtitle">
                                    {scenario.subtitle || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No description</span>}
                                </div>
                                {isActive && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                                        <span style={{ fontSize: '9.5px', fontWeight: 700, color: color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Total Revenue KPI */}
            <div className="d-flex flex-column align-items-center justify-content-center mb-4 mt-4">
                <h5 className="text-muted fw-semibold mb-2 text-uppercase" style={{ letterSpacing: '1px' }}>Total Projected Revenue</h5>
                <h1 className="display-4 fw-bold mb-0" style={{ color: '#448C74' }}>
                    {currency} {formatCurrencyLocal(totalRevenue)}
                </h1>
                <div className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 mt-3 mb-3" style={{ fontSize: '14px' }}>
                    <FaChartLine className="me-2" />
                    Based on {activeScenario?.productMixRows?.length || 0} product lines
                </div>
            </div>

            {/* Breakdown Table (Expandable) */}
            <div className="mt-4 border overflow-hidden fade-in-up" style={{ borderRadius: '16px', borderColor: '#e2e8f0' }}>
                <div 
                    className="pm-section-header" 
                    onClick={() => setIsTableExpanded(!isTableExpanded)}
                >
                    <div>
                        <h4 className="pm-section-maintitle mb-0">View Breakdown</h4>
                    </div>
                    <div className="pm-chevron-btn">
                        {isTableExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </div>
                </div>
                
                {isTableExpanded && rowRevenues.length > 0 && (
                    <div className="pm-section-body pt-0">
                        <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            <table className="table table-custom-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                                <thead style={{ backgroundColor: '#f8fafc' }}>
                                    <tr>
                                        <th className="text-secondary fw-semibold border-0 py-3 ps-4">Asset Class</th>
                                        <th className="text-secondary fw-semibold border-0 py-3">Property Type</th>
                                        <th className="text-secondary fw-semibold border-0 py-3 text-end">Ticket Size</th>
                                        <th className="text-secondary fw-semibold border-0 py-3 text-center">Total Inventory</th>
                                        <th className="text-secondary fw-semibold border-0 py-3 text-end pe-4">Total Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rowRevenues.map((row, idx) => (
                                        <tr key={row.id || idx} style={{ borderBottom: idx === rowRevenues.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                            <td className="py-3 ps-4 fw-medium text-dark border-0">{row.assetClass}</td>
                                            <td className="py-3 text-muted border-0">{row.propertyType}</td>
                                            <td className="py-3 text-end text-muted border-0">{currency} {formatCurrencyLocal(row.ticketSize)}</td>
                                            <td className="py-3 text-center fw-semibold border-0" style={{ color: '#0f172a' }}>{row.inventory || '-'}</td>
                                            <td className="py-3 text-end fw-bold pe-4 border-0" style={{ color: '#448C74' }}>{currency} {formatCurrencyLocal(row.rowRevenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioRevenueDashboard;
