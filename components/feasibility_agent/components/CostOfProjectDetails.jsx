import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTrash, FaInfoCircle, FaSyncAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { apiUrl } from "@/lib/api-client";

const CostOfProjectDetails = () => {
    const [currency, setCurrency] = useState("INR");
    const [scenarios, setScenarios] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [scenarioData, setScenarioData] = useState({});
    const [fetchedConstructionCost, setFetchedConstructionCost] = useState(null);
    
    // UI states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldDesc, setNewFieldDesc] = useState("");
    const [isFetchingConstruction, setIsFetchingConstruction] = useState(false);

    // Default structure for a blank scenario
    const defaultScenarioData = {
        fixedInputs: {
            landAcquisition: "",
            landLeveling: "",
            constructionCost: "",
            marketingCost: "",
            approvalCost: "",
            administrativeCost: "",
            tdrCost: "",
            financeCost: "",
            miscellaneousCost: "",
            constructionTimeline: ""
        },
        customFields: []
    };

    const loadData = useCallback(() => {
        // Load currency
        try {
            const savedLand = localStorage.getItem("Land Identification");
            if (savedLand) {
                const parsedLand = JSON.parse(savedLand);
                if (parsedLand.currency) {
                    setCurrency(parsedLand.currency);
                }
            }
        } catch (e) {}

        // Load scenarios
        let loadedScenarios = [];
        try {
            const savedScenarios = localStorage.getItem('ProductMixScenarios');
            if (savedScenarios) {
                const parsed = JSON.parse(savedScenarios);
                if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
                    loadedScenarios = parsed.scenarios;
                    setScenarios(loadedScenarios);
                    if (parsed.activeScenarioId) {
                        setActiveScenarioId(parsed.activeScenarioId);
                    } else if (loadedScenarios.length > 0) {
                        setActiveScenarioId(loadedScenarios[0].id);
                    }
                }
            }
        } catch (e) {}

        // Load scenario data
        try {
            const savedState = localStorage.getItem("CostProjectDetailsV1");
            if (savedState) {
                const parsed = JSON.parse(savedState);
                setScenarioData(parsed);
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        loadData();
        window.addEventListener('productMixScenariosUpdated', loadData);
        window.addEventListener('storage', loadData);
        return () => {
            window.removeEventListener('productMixScenariosUpdated', loadData);
            window.removeEventListener('storage', loadData);
        };
    }, [loadData]);

    // Save to local storage whenever scenarioData changes
    useEffect(() => {
        if (Object.keys(scenarioData).length > 0) {
            try {
                localStorage.setItem("CostProjectDetailsV1", JSON.stringify(scenarioData));
                window.dispatchEvent(new Event('costProjectDetailsUpdated'));
            } catch (e) {}
        }
    }, [scenarioData]);

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

    // Current active data
    const activeData = scenarioData[activeScenarioId] || defaultScenarioData;
    const fixedInputs = activeData.fixedInputs || defaultScenarioData.fixedInputs;
    const customFields = activeData.customFields || defaultScenarioData.customFields;

    const updateActiveData = (updates) => {
        if (!activeScenarioId) return;
        setScenarioData(prev => {
            const currentScenario = {
                ...defaultScenarioData,
                ...(prev[activeScenarioId] || {}),
                ...updates
            };
            
            const fixedSum = Object.entries(currentScenario.fixedInputs || {})
                .filter(([key]) => key !== 'constructionTimeline')
                .reduce((acc, [_, val]) => acc + (Number(val) || 0), 0);
            const customSum = (currentScenario.customFields || []).reduce((acc, field) => acc + (Number(field.value) || 0), 0);
            currentScenario.totalProjectCost = fixedSum + customSum;

            return {
                ...prev,
                [activeScenarioId]: currentScenario
            };
        });
    };

    const handleFixedInputChange = (field, value) => {
        const numValue = value.replace(/[^0-9.]/g, '');
        updateActiveData({
            fixedInputs: { ...fixedInputs, [field]: numValue }
        });
    };

    const handleCustomInputChange = (id, value) => {
        const numValue = value.replace(/[^0-9.]/g, '');
        updateActiveData({
            customFields: customFields.map(f => f.id === id ? { ...f, value: numValue } : f)
        });
    };

    const handleSaveField = () => {
        if (!newFieldName.trim()) {
            alert("Field Name is required");
            return;
        }
        if (customFields.length >= 10) {
            alert("Maximum of 10 custom fields allowed.");
            return;
        }
        
        const newField = {
            id: Date.now().toString(),
            name: newFieldName.trim(),
            description: newFieldDesc.trim(),
            value: ""
        };

        updateActiveData({ customFields: [...customFields, newField] });
        setNewFieldName("");
        setNewFieldDesc("");
        setIsModalOpen(false);
    };

    const handleDeleteField = (id) => {
        updateActiveData({ customFields: customFields.filter(f => f.id !== id) });
    };

    const handleFetchConstructionCost = async () => {
        setIsFetchingConstruction(true);
        try {
            const savedLand = localStorage.getItem("Land Identification");
            let location = "";
            let city = "";
            let country = "";
            if (savedLand) {
                const parsedLand = JSON.parse(savedLand);
                location = parsedLand.location || "";
                city = parsedLand.village || "";
                country = parsedLand.country || "";
            }

            const res = await fetch(apiUrl("/new_rate_simulator/simulator/construction-cost-estimation"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location, city, country })
            });

            const data = await res.json();
            if (data.success && data.construction_cost_per_sqft) {
                setFetchedConstructionCost(String(data.construction_cost_per_sqft));
                if (data.currency_symbol) {
                    setCurrency(data.currency_symbol);
                }
            } else {
                setFetchedConstructionCost("N/A");
            }
        } catch (error) {
            console.error("Fetch construction cost error:", error);
            setFetchedConstructionCost("N/A");
        } finally {
            setIsFetchingConstruction(false);
        }
    };

    const getScenarioColor = (index) => {
        const colors = ['#448C74', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
        return colors[index % colors.length];
    };

    const renderInput = (label, value, onChange, placeholder = "0", extraHeaderContent = null, extraFooterContent = null, prefix = currency) => (
        <div className="field-wrapper-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="field-label-text mb-0">{label}</div>
                {extraHeaderContent}
            </div>
            <div className="pill-input-container">
                {prefix && <span className="currency-prefix">{prefix}</span>}
                <input
                    type="text"
                    className="pill-input"
                    placeholder={placeholder}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={!activeScenarioId}
                    style={!prefix ? { paddingLeft: '16px' } : undefined}
                />
            </div>
            {extraFooterContent}
        </div>
    );

    if (scenarios.length === 0) {
        return null; // Don't render if no scenarios exist, or show a placeholder
    }

    return (
        <div className="land-section-card fade-in-up">
            <style>
                {`
                .land-section-card {
                  background-color: #fff;
                  border-radius: 16px;
                  border: 1px solid #f1f3f5;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                  padding: 32px;
                  margin-bottom: 24px;
                }
                .land-header-subtitle {
                  font-size: 11px;
                  font-weight: 700;
                  letter-spacing: 1px;
                  color: #868e96;
                  text-transform: uppercase;
                  margin-bottom: 4px;
                }
                .land-header-title {
                  font-size: 28px;
                  font-weight: 800;
                  color: #1a1c23;
                  margin: 0;
                }
                .field-wrapper-card {
                  background: #fff;
                  border: 1px solid #e9ecef;
                  border-radius: 12px;
                  padding: 20px;
                  height: 100%;
                }
                .field-label-text {
                  font-size: 14px;
                  font-weight: 700;
                  color: #1a1c23;
                }
                .pill-input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .currency-prefix {
                    position: absolute;
                    left: 16px;
                    color: #6c757d;
                    font-weight: 600;
                    font-size: 14px;
                    pointer-events: none;
                }
                .pill-input {
                  border-radius: 24px;
                  border: 1px solid #dee2e6;
                  padding: 10px 16px;
                  padding-left: 50px;
                  font-size: 14px;
                  background-color: #fff;
                  width: 100%;
                  transition: border-color 0.2s;
                }
                .pill-input:focus {
                  outline: none;
                  border-color: #adb5bd;
                  box-shadow: 0 0 0 3px rgba(0,0,0,0.03);
                }
                .pill-input:disabled {
                  background-color: #f8f9fa;
                  cursor: not-allowed;
                }
                .btn-dark-pill {
                  background-color: #1a1c23;
                  color: #fff;
                  border-radius: 24px !important;
                  padding: 10px 24px;
                  font-size: 14px;
                  font-weight: 600;
                  border: none;
                  transition: background-color 0.2s;
                }
                .btn-dark-pill:hover:not(:disabled) {
                  background-color: #2c2e31;
                  color: #fff;
                }
                .btn-dark-pill:disabled {
                  background-color: #868e96;
                  cursor: not-allowed;
                }
                .btn-fetch-pill {
                  background-color: #f1f5f9;
                  color: #475569;
                  border-radius: 20px !important;
                  padding: 4px 12px;
                  font-size: 11px;
                  font-weight: 700;
                  border: 1px solid #e2e8f0;
                  transition: all 0.2s;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                }
                .btn-fetch-pill:hover:not(:disabled) {
                  background-color: #e2e8f0;
                  color: #0f172a;
                }
                .btn-fetch-pill:disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
                }
                
                /* Scenario Strip Styles */
                .scenario-strip {
                    display: flex;
                    align-items: stretch;
                    gap: 10px;
                    overflow-x: auto;
                    padding: 4px 2px 10px;
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f8fafc;
                }
                .scenario-strip::-webkit-scrollbar { height: 6px; }
                .scenario-strip::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                .scenario-strip::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
                .scenario-strip::-webkit-scrollbar-thumb:hover { background-color: #448C74; }
                
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
                    left: 0; top: 0; bottom: 0; width: 5px;
                    border-radius: 14px 0 0 14px;
                    background: #e2e8f0;
                    transition: background 0.22s;
                }
                .scenario-card.active::before { background: var(--sc-color, #448C74); }
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
                
                /* Tooltip and Modal Styles */
                .tooltip-custom {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .tooltip-custom .tooltip-text {
                    visibility: hidden;
                    width: max-content;
                    max-width: 200px;
                    background-color: #334155;
                    color: #fff;
                    text-align: center;
                    border-radius: 6px;
                    padding: 6px 10px;
                    font-size: 12px;
                    position: absolute;
                    z-index: 10;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.2s;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    text-transform: none;
                    letter-spacing: normal;
                    font-weight: 500;
                }
                .tooltip-custom .tooltip-text::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: #334155 transparent transparent transparent;
                }
                .tooltip-custom:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }
                .modal-overlay-custom {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                }
                .modal-content-custom {
                    background: #fff;
                    border-radius: 20px;
                    padding: 24px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    animation: scaleIn 0.2s ease-out;
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                `}
            </style>

            <div className="d-flex justify-content-between align-items-center mb-4 pb-2">
                <div>
                    <div className="land-header-subtitle">Selected Section</div>
                    <h2 className="land-header-title">Cost Of Project Details</h2>
                </div>
            </div>

            {/* Scenario Strip */}
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

            <div className="row g-3">
                <div className="col-md-6">
                    {renderInput("Land Acquisition", fixedInputs.landAcquisition, (v) => handleFixedInputChange('landAcquisition', v))}
                </div>
                <div className="col-md-6">
                    {renderInput(
                        <div className="d-flex align-items-center gap-2">
                            <span>Land Leveling</span>
                            <button 
                                className="btn btn-sm d-flex align-items-center gap-1" 
                                style={{ 
                                    fontSize: '10px', 
                                    padding: '2px 8px', 
                                    borderRadius: '12px', 
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                                    color: '#fff', 
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                                    transition: 'all 0.2s ease-in-out',
                                    fontWeight: '600'
                                }}
                                onClick={() => window.open('/elevation', '_blank')}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.3)'; }}
                                title="Open Elevation Agent"
                            >
                                <FaExternalLinkAlt size={9} />
                                Elevation Agent
                            </button>
                        </div>, 
                        fixedInputs.landLeveling, 
                        (v) => handleFixedInputChange('landLeveling', v)
                    )}
                </div>
                <div className="col-md-6">
                    {renderInput("Construction Cost", fixedInputs.constructionCost, (v) => handleFixedInputChange('constructionCost', v), "0", (
                        <button 
                            className="btn-fetch-pill" 
                            onClick={handleFetchConstructionCost}
                            disabled={isFetchingConstruction || !activeScenarioId}
                        >
                            {isFetchingConstruction ? (
                                <><div className="spinner-border spinner-border-sm" role="status" style={{ width: '10px', height: '10px', borderWidth: '0.15em' }} /> Fetching...</>
                            ) : (
                                <><FaSyncAlt size={10} /> Fetch</>
                            )}
                        </button>
                    ), fetchedConstructionCost ? (
                        <div className="mt-2 text-muted fade-in-up" style={{ fontSize: '12px' }}>
                            <FaInfoCircle className="me-1 text-primary" style={{ marginTop: '-2px' }} />
                            AI Estimated Rate: <strong>{fetchedConstructionCost === "N/A" ? "N/A" : `${currency} ${fetchedConstructionCost}`}</strong> / sqft
                        </div>
                    ) : null)}
                </div>
                <div className="col-md-6">
                    {renderInput("Marketing Cost", fixedInputs.marketingCost, (v) => handleFixedInputChange('marketingCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("Approval Cost", fixedInputs.approvalCost, (v) => handleFixedInputChange('approvalCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("Administrative Cost", fixedInputs.administrativeCost, (v) => handleFixedInputChange('administrativeCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("TDR Cost", fixedInputs.tdrCost, (v) => handleFixedInputChange('tdrCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("Finance Cost", fixedInputs.financeCost, (v) => handleFixedInputChange('financeCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("Miscellaneous Cost", fixedInputs.miscellaneousCost, (v) => handleFixedInputChange('miscellaneousCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("Construction Timeline", fixedInputs.constructionTimeline, (v) => handleFixedInputChange('constructionTimeline', v), "e.g. 2.5", null, null, "Years")}
                </div>

                {customFields.map((field) => (
                    <div className="col-md-6" key={field.id}>
                        <div className="field-wrapper-card">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="field-label-text mb-0">{field.name}</div>
                                    {field.description && (
                                        <div className="tooltip-custom" style={{ cursor: 'help' }}>
                                            <FaInfoCircle className="text-primary opacity-75" size={13} />
                                            <span className="tooltip-text">{field.description}</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    className="btn btn-sm text-danger p-0 border-0 hover-opacity" 
                                    onClick={() => handleDeleteField(field.id)}
                                    title="Delete this field"
                                    disabled={!activeScenarioId}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                            <div className="pill-input-container">
                                <span className="currency-prefix">{currency}</span>
                                <input
                                    type="text"
                                    className="pill-input"
                                    placeholder="0"
                                    value={field.value}
                                    onChange={(e) => handleCustomInputChange(field.id, e.target.value)}
                                    disabled={!activeScenarioId}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 text-center">
                <button
                    className="btn-dark-pill d-inline-flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                        if (customFields.length < 10) setIsModalOpen(true);
                    }}
                    disabled={customFields.length >= 10 || !activeScenarioId}
                >
                    <FaPlus />
                    {customFields.length >= 10 ? 'Max 10 Fields Reached' : 'Add Custom Field'}
                </button>
            </div>

            <div className="mt-4 pt-3 border-top text-end">
                <div className="d-inline-block px-4 py-3 rounded-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                    <div className="text-muted small fw-bold text-uppercase tracking-wider mb-1">Total Cost of Project</div>
                    <div className="fs-3 fw-bolder text-dark">
                        {currency} {Number(activeData.totalProjectCost || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Add Field Modal */}
            {isModalOpen && (
                <div className="modal-overlay-custom">
                    <div className="modal-content-custom">
                        <h5 className="fw-bold mb-3">Add Custom Field</h5>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted">Field Name <span className="text-danger">*</span></label>
                            <input 
                                type="text" 
                                className="pill-input" 
                                style={{ paddingLeft: '16px' }}
                                placeholder="e.g. Legal Fees"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-muted">Field Description (Optional)</label>
                            <textarea 
                                className="pill-input" 
                                style={{ paddingLeft: '16px', minHeight: '80px', borderRadius: '16px' }}
                                placeholder="Briefly describe this cost..."
                                rows="2"
                                value={newFieldDesc}
                                onChange={(e) => setNewFieldDesc(e.target.value)}
                            ></textarea>
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                            <button 
                                className="btn btn-light fw-medium px-4 rounded-pill" 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewFieldName("");
                                    setNewFieldDesc("");
                                }}
                            >
                                Exit
                            </button>
                            <button 
                                className="btn-dark-pill px-4" 
                                onClick={handleSaveField}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostOfProjectDetails;
