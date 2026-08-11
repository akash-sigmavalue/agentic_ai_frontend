import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlus, FaTrash, FaInfoCircle, FaSyncAlt, FaExternalLinkAlt, FaFileUpload, FaTimes, FaChevronDown, FaChevronUp, FaRobot, FaCheckCircle } from 'react-icons/fa';
import { apiUrl } from "@/lib/api-client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CostOfProjectDetails = () => {
    const [currency, setCurrency] = useState("INR");
    const [scenarios, setScenarios] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [scenarioData, setScenarioData] = useState({});
    const [constructionCostData, setConstructionCostData] = useState(null);
    const [constructionCostMinimized, setConstructionCostMinimized] = useState(false);
    // UI states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldDesc, setNewFieldDesc] = useState("");
    const [isFetchingConstruction, setIsFetchingConstruction] = useState(false);

    // Document Agent - Approval Cost
    const [approvalDocModal, setApprovalDocModal] = useState(false);
    const [approvalDocMinimized, setApprovalDocMinimized] = useState(false);
    const [approvalFiles, setApprovalFiles] = useState([]);
    const [approvalQuery, setApprovalQuery] = useState("What is the total approval cost including government fees, NOC charges, and related regulatory costs? Provide the amount in local currency.");
    const [approvalDocResult, setApprovalDocResult] = useState(null);
    const [isProcessingApproval, setIsProcessingApproval] = useState(false);
    const approvalFileRef = useRef(null);

    // Document Agent - TDR Cost
    const [tdrDocModal, setTdrDocModal] = useState(false);
    const [tdrDocMinimized, setTdrDocMinimized] = useState(false);
    const [tdrFiles, setTdrFiles] = useState([]);
    const [tdrQuery, setTdrQuery] = useState("What is the TDR (Transfer of Development Rights) cost per sqft and total TDR cost? Provide the amount in local currency.");
    const [tdrDocResult, setTdrDocResult] = useState(null);
    const [isProcessingTdr, setIsProcessingTdr] = useState(false);
    const tdrFileRef = useRef(null);

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
        setConstructionCostMinimized(false);
        setConstructionCostData(null);
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
            if (data.success && (data.low_range || data.mid_range || data.high_range)) {
                if (data.currency_symbol) {
                    setCurrency(data.currency_symbol);
                }
                setConstructionCostData({
                    currency: data.currency_symbol || currency,
                    low_range: data.low_range || {},
                    mid_range: data.mid_range || {},
                    high_range: data.high_range || {},
                    sources: data.sources || [],
                    location: data.location_resolved || location || city || country || 'the specified location',
                    data_freshness: data.data_freshness || null,
                });
                setConstructionCostMinimized(false);
            } else {
                setConstructionCostData({ error: data.error || 'Could not retrieve construction cost data.' });
                setConstructionCostMinimized(false);
            }
        } catch (error) {
            console.error("Fetch construction cost error:", error);
            setConstructionCostData({ error: 'Network error. Please try again.' });
            setConstructionCostMinimized(false);
        } finally {
            setIsFetchingConstruction(false);
        }
    };

    // --- Document Agent Handlers ---
    const handleDocumentProceed = async (type) => {
        const files = type === 'approval' ? approvalFiles : tdrFiles;
        const query = type === 'approval' ? approvalQuery : tdrQuery;
        const setProcessing = type === 'approval' ? setIsProcessingApproval : setIsProcessingTdr;
        const setResult = type === 'approval' ? setApprovalDocResult : setTdrDocResult;

        if (!files || files.length === 0) {
            alert("Please upload at least one document.");
            return;
        }
        setProcessing(true);
        setResult(null);
        try {
            // 1. Upload Documents
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));

            const uploadRes = await fetch(apiUrl("/user-input/documents"), {
                method: "POST",
                body: formData,
            });
            
            if (!uploadRes.ok) {
                setResult({ value: null, type: 'error', context: 'Failed to upload documents.' });
                return;
            }
            await uploadRes.json();

            // 2. Ask Question
            const enhancedQuery = `${query}\nIMPORTANT: If you find a numeric cost, include it in your response exactly like this: [COST: 12345] (replace 12345 with the numeric value).`;
            
            const askRes = await fetch(apiUrl("/user-input/ask"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: enhancedQuery,
                    session_id: `cost-extraction-${type}-${Date.now()}`,
                }),
            });
            
            if (!askRes.ok) {
                setResult({ value: null, type: 'error', context: 'Failed to extract cost from documents.' });
                return;
            }
            
            const data = await askRes.json();
            const answerText = data.answer || data.response || data.output || data.content || (typeof data === 'string' ? data : JSON.stringify(data));
            
            // Try to extract [COST: 12345]
            const costMatch = answerText.match(/\[COST:\s*([0-9.,]+)\]/i);
            
            if (costMatch && costMatch[1]) {
                const val = costMatch[1].replace(/[^0-9.]/g, '');
                setResult({ value: val, type: 'cost', context: answerText.replace(costMatch[0], '').trim() });
                const field = type === 'approval' ? 'approvalCost' : 'tdrCost';
                handleFixedInputChange(field, val);
            } else {
                setResult({ value: null, type: 'info', context: answerText });
            }
        } catch (err) {
            setResult({ value: null, context: 'Error processing documents. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleFileChange = (type, e) => {
        const newFiles = Array.from(e.target.files);
        if (type === 'approval') {
            setApprovalFiles(prev => [...prev, ...newFiles]);
        } else {
            setTdrFiles(prev => [...prev, ...newFiles]);
        }
        e.target.value = '';
    };

    const removeFile = (type, idx) => {
        if (type === 'approval') {
            setApprovalFiles(prev => prev.filter((_, i) => i !== idx));
        } else {
            setTdrFiles(prev => prev.filter((_, i) => i !== idx));
        }
    };

    const openDocModal = (type) => {
        if (type === 'approval') {
            setApprovalDocModal(true);
            setApprovalDocMinimized(false);
            setApprovalDocResult(null);
        } else {
            setTdrDocModal(true);
            setTdrDocMinimized(false);
            setTdrDocResult(null);
        }
    };

    const closeDocModal = (type) => {
        if (type === 'approval') {
            setApprovalDocModal(false);
            setApprovalFiles([]);
            setApprovalDocResult(null);
        } else {
            setTdrDocModal(false);
            setTdrFiles([]);
            setTdrDocResult(null);
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
                /* Document Agent Popup */
                .doc-agent-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15,23,42,0.55);
                    z-index: 9998;
                    backdrop-filter: blur(3px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .doc-agent-popup {
                    background: #fff;
                    border-radius: 20px;
                    width: 560px;
                    max-width: 96vw;
                    box-shadow: 0 24px 48px -12px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.06);
                    overflow: hidden;
                    animation: popupIn 0.22s cubic-bezier(0.4,0,0.2,1);
                    display: flex;
                    flex-direction: column;
                }
                .doc-agent-popup.minimized {
                    width: 340px;
                    border-radius: 16px;
                    position: fixed;
                    bottom: 28px;
                    right: 28px;
                    z-index: 9999;
                }
                @keyframes popupIn {
                    from { opacity: 0; transform: scale(0.93) translateY(12px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .doc-agent-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 18px 20px 14px;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    color: #fff;
                }
                .doc-agent-header-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 15px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                }
                .doc-agent-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .doc-agent-icon-btn {
                    background: rgba(255,255,255,0.12);
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.15s;
                    flex-shrink: 0;
                }
                .doc-agent-icon-btn:hover { background: rgba(255,255,255,0.22); }
                .doc-agent-body {
                    padding: 22px 22px 18px;
                    flex: 1;
                    overflow-y: auto;
                    max-height: 72vh;
                }
                .doc-agent-section-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                }
                .doc-upload-zone {
                    border: 2px dashed #cbd5e1;
                    border-radius: 14px;
                    padding: 22px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #f8fafc;
                    margin-bottom: 14px;
                }
                .doc-upload-zone:hover {
                    border-color: #448C74;
                    background: #f0fdf8;
                }
                .doc-file-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 4px 10px 4px 8px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #334155;
                    margin: 3px;
                }
                .doc-file-chip button {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                }
                .doc-file-chip button:hover { color: #ef4444; }
                .doc-query-textarea {
                    width: 100%;
                    border: 1px solid #dee2e6;
                    border-radius: 12px;
                    padding: 12px 14px;
                    font-size: 13.5px;
                    color: #334155;
                    resize: vertical;
                    min-height: 80px;
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }
                .doc-query-textarea:focus { border-color: #448C74; box-shadow: 0 0 0 3px rgba(68,140,116,0.1); }
                .doc-agent-footer {
                    padding: 14px 22px 18px;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    border-top: 1px solid #f1f5f9;
                }
                .doc-agent-result {
                    background: linear-gradient(135deg, #f0fdf8 0%, #ecfdf5 100%);
                    border: 1px solid #bbf7d0;
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-top: 14px;
                    font-size: 13px;
                    color: #064e3b;
                    line-height: 1.6;
                }
                .doc-agent-result.error {
                    background: #fff7ed;
                    border-color: #fed7aa;
                    color: #7c2d12;
                }
                .doc-agent-result.info {
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border-color: #bfdbfe;
                    color: #1e3a5f;
                }
                .doc-proceed-btn {
                    background: linear-gradient(135deg, #448C74 0%, #2d7a62 100%);
                    color: #fff;
                    border: none;
                    border-radius: 22px;
                    padding: 10px 26px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    transition: all 0.18s;
                    box-shadow: 0 4px 12px rgba(68,140,116,0.25);
                }
                .doc-proceed-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(68,140,116,0.35);
                }
                .doc-proceed-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .doc-cancel-btn {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    border-radius: 22px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .doc-cancel-btn:hover { background: #e2e8f0; }
                .doc-minimized-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                }
                .doc-agent-markdown p { margin-bottom: 8px; }
                .doc-agent-markdown p:last-child { margin-bottom: 0; }
                .doc-agent-markdown table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; font-size: 12px; }
                .doc-agent-markdown th, .doc-agent-markdown td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
                .doc-agent-markdown th { background: #f8fafc; font-weight: 700; color: #334155; }
                .doc-agent-markdown ul, .doc-agent-markdown ol { padding-left: 20px; margin-bottom: 8px; }
                .doc-agent-markdown code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 11px; color: #e11d48; }
                .construction-cost-result-card {
                    background: linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%);
                    border: 1px solid #e0f2fe;
                    border-radius: 14px;
                    padding: 14px 16px;
                }
                .const-rate-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 12px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }
                .const-rate-table thead tr {
                    background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
                    color: #fff;
                }
                .const-rate-table th {
                    padding: 8px 10px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
                .const-rate-table tbody tr {
                    border-bottom: 1px solid #f1f5f9;
                    transition: background 0.15s;
                }
                .const-rate-table tbody tr:hover { background: #f8fafc; }
                .const-rate-table td { padding: 9px 10px; vertical-align: middle; }
                .const-rate-sources {
                    padding: 10px 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    margin-top: 4px;
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
                    {renderInput(<span>Land Acquisition <span className="text-danger">*</span></span>, fixedInputs.landAcquisition, (v) => handleFixedInputChange('landAcquisition', v))}
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
                <div className="col-md-6" style={{ position: 'relative' }}>
                    {renderInput(
                        <div className="d-flex align-items-center gap-2">
                            <span>Construction Cost <span className="text-danger">*</span></span>
                            {constructionCostMinimized && constructionCostData && !constructionCostData.error && (
                                <button
                                    className="btn btn-sm d-flex align-items-center gap-1"
                                    onClick={() => setConstructionCostMinimized(false)}
                                    style={{
                                        fontSize: '10px',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        border: '1px solid #bae6fd',
                                        fontWeight: '600'
                                    }}
                                    title="View Estimated Rates"
                                >
                                    <FaRobot size={10} /> View Estimated Rates
                                </button>
                            )}
                        </div>,
                        fixedInputs.constructionCost, 
                        (v) => handleFixedInputChange('constructionCost', v), 
                        "0", 
                        (
                        <button 
                            className="btn-fetch-pill" 
                            onClick={handleFetchConstructionCost}
                            disabled={isFetchingConstruction || !activeScenarioId}
                        >
                            <><FaSyncAlt size={10} /> Fetch</>
                        </button>
                    ))}
                    
                    {(isFetchingConstruction || (constructionCostData && !constructionCostMinimized)) && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            zIndex: 1040,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(3px)'
                        }}>
                            <div className="fade-in-up" style={{
                                width: '100%',
                                maxWidth: '600px',
                                background: '#fff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                padding: '24px',
                                position: 'relative',
                                maxHeight: '90vh',
                                overflowY: 'auto'
                            }}>
                                {isFetchingConstruction ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: 16 }}>
                                        <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: '#0369a1' }} role="status"></div>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Analyzing Live Market Data...</div>
                                        <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>Searching construction rates for the selected location and crawling trusted real estate sources. This takes a few seconds...</div>
                                    </div>
                                ) : constructionCostData.error ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 12, color: '#92400e', flex: 1 }}>
                                            <FaInfoCircle />
                                            <span>{constructionCostData.error}</span>
                                        </div>
                                        <button 
                                            className="btn btn-link text-muted p-0 ms-3" 
                                            onClick={() => setConstructionCostData(null)}
                                        >
                                            <FaTimes size={18} />
                                        </button>
                                    </div>
                                ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏗️ AI Estimated Rates — {constructionCostData.location}</span>
                                            {constructionCostData.data_freshness && (
                                                <span style={{ fontSize: 10, fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                                    🟢 Live Data · {constructionCostData.data_freshness}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <button 
                                                className="btn btn-link text-muted p-0" 
                                                onClick={() => setConstructionCostMinimized(true)}
                                            >
                                                <FaTimes size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <table className="const-rate-table">
                                        <thead>
                                            <tr>
                                                <th>Range</th>
                                                <th>Rate / sqft</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { key: 'low_range', label: '🟢 Low', badge: '#dcfce7', badgeText: '#166534', data: constructionCostData.low_range },
                                                { key: 'mid_range', label: '🟡 Mid', badge: '#fef9c3', badgeText: '#854d0e', data: constructionCostData.mid_range },
                                                { key: 'high_range', label: '🔴 High', badge: '#fee2e2', badgeText: '#991b1b', data: constructionCostData.high_range },
                                            ].map(({ key, label, badge, badgeText, data }) => data && data.rate ? (
                                                <tr key={key}>
                                                    <td><span style={{ background: badge, color: badgeText, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{label}</span></td>
                                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{constructionCostData.currency} {Number(data.rate).toLocaleString()}</td>
                                                    <td style={{ color: '#64748b', fontSize: 12 }}>{data.description}</td>
                                                </tr>
                                            ) : null)}
                                        </tbody>
                                    </table>
                                    {constructionCostData.sources && constructionCostData.sources.length > 0 && (
                                        <div className="const-rate-sources" style={{ marginTop: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📎 Sources — Live Crawled Pages</div>
                                            {constructionCostData.sources.map((src, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, marginBottom: 4 }}>
                                                    <span title="Live-crawled page" style={{ flexShrink: 0, marginTop: 1 }}>✅</span>
                                                    <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all', lineHeight: 1.4 }}>{src.title || src.url}</a>
                                                    {src.trust_score && <span style={{ flexShrink: 0, fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>({Math.round(src.trust_score * 100)}% trust)</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="col-md-6">
                    {renderInput("Marketing Cost", fixedInputs.marketingCost, (v) => handleFixedInputChange('marketingCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("Approval Cost", fixedInputs.approvalCost, (v) => handleFixedInputChange('approvalCost', v), "0", (
                        <button
                            className="btn-fetch-pill"
                            onClick={() => openDocModal('approval')}
                            disabled={!activeScenarioId}
                        >
                            <FaRobot size={10} /> Fetch
                        </button>
                    ))}
                </div>
                <div className="col-md-6">
                    {renderInput("Administrative Cost", fixedInputs.administrativeCost, (v) => handleFixedInputChange('administrativeCost', v))}
                </div>
                <div className="col-md-6">
                    {renderInput("TDR Cost", fixedInputs.tdrCost, (v) => handleFixedInputChange('tdrCost', v), "0", (
                        <button
                            className="btn-fetch-pill"
                            onClick={() => openDocModal('tdr')}
                            disabled={!activeScenarioId}
                        >
                            <FaRobot size={10} /> Fetch
                        </button>
                    ))}
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

            {/* Document Agent Popup - Approval Cost */}
            {approvalDocModal && (
                approvalDocMinimized ? (
                    <div className="doc-agent-popup minimized" style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
                        <div className="doc-agent-header" style={{ borderRadius: '16px' }}>
                            <div className="doc-agent-header-title">
                                <FaRobot size={14} />
                                <span>Approval Cost — Document Agent</span>
                            </div>
                            <div className="doc-agent-header-actions">
                                <button className="doc-agent-icon-btn" title="Maximize" onClick={() => setApprovalDocMinimized(false)}><FaChevronUp size={11} /></button>
                                <button className="doc-agent-icon-btn" title="Close" onClick={() => closeDocModal('approval')}><FaTimes size={11} /></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="doc-agent-overlay">
                        <div className="doc-agent-popup">
                            <div className="doc-agent-header">
                                <div className="doc-agent-header-title">
                                    <FaRobot size={15} />
                                    <span>Approval Cost — Document Agent</span>
                                </div>
                                <div className="doc-agent-header-actions">
                                    <button className="doc-agent-icon-btn" title="Minimize" onClick={() => setApprovalDocMinimized(true)}><FaChevronDown size={11} /></button>
                                    <button className="doc-agent-icon-btn" title="Close" onClick={() => closeDocModal('approval')}><FaTimes size={12} /></button>
                                </div>
                            </div>
                            <div className="doc-agent-body">
                                {/* Section 1: Upload Documents */}
                                <div className="mb-4">
                                    <div className="doc-agent-section-label">📂 Section 1 — Upload Documents</div>
                                    <div className="doc-upload-zone" onClick={() => approvalFileRef.current && approvalFileRef.current.click()}>
                                        <FaFileUpload size={24} style={{ color: '#94a3b8', marginBottom: 8 }} />
                                        <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Click to upload documents</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, Word, Excel, Images — Multiple files allowed</div>
                                    </div>
                                    <input
                                        ref={approvalFileRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange('approval', e)}
                                    />
                                    {approvalFiles.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            {approvalFiles.map((f, i) => (
                                                <span key={i} className="doc-file-chip">
                                                    📄 {f.name}
                                                    <button onClick={() => removeFile('approval', i)} title="Remove"><FaTimes /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Section 2: User Query */}
                                <div>
                                    <div className="doc-agent-section-label">💬 Section 2 — Your Query</div>
                                    <textarea
                                        className="doc-query-textarea"
                                        value={approvalQuery}
                                        onChange={e => setApprovalQuery(e.target.value)}
                                        placeholder="Enter your query about approval costs..."
                                        rows={3}
                                    />
                                </div>
                                {/* Result */}
                                {approvalDocResult && (
                                    <div className={`doc-agent-result${
                                        approvalDocResult.type === 'cost' ? '' :
                                        approvalDocResult.type === 'info' ? ' info' : ' error'
                                    }`}>
                                        {approvalDocResult.type === 'cost' ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                    <FaCheckCircle style={{ color: '#059669', flexShrink: 0 }} />
                                                    <strong>Extracted Value: {currency} {approvalDocResult.value}</strong>
                                                </div>
                                                {approvalDocResult.context && (
                                                    <div className="doc-agent-markdown" style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{approvalDocResult.context}</ReactMarkdown>
                                                    </div>
                                                )}
                                                <div style={{ marginTop: 6, fontSize: 11, color: '#059669', fontStyle: 'italic' }}>✅ Auto-filled in Approval Cost field</div>
                                            </>
                                        ) : approvalDocResult.type === 'info' ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                    <FaRobot style={{ color: '#3b82f6', flexShrink: 0 }} />
                                                    <strong style={{ color: '#1e40af' }}>Document Answer</strong>
                                                </div>
                                                <div className="doc-agent-markdown" style={{ fontSize: 13, color: '#1e3a5f', lineHeight: 1.65 }}>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{approvalDocResult.context}</ReactMarkdown>
                                                </div>
                                            </>
                                        ) : (
                                            <><FaInfoCircle style={{ marginRight: 6, color: '#d97706' }} />{approvalDocResult.context}</>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="doc-agent-footer">
                                <button className="doc-cancel-btn" onClick={() => closeDocModal('approval')}>Cancel</button>
                                <button
                                    className="doc-proceed-btn"
                                    onClick={() => handleDocumentProceed('approval')}
                                    disabled={isProcessingApproval || approvalFiles.length === 0}
                                >
                                    {isProcessingApproval ? (
                                        <><div className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14, borderWidth: '0.15em' }} /> Processing...</>
                                    ) : (
                                        <><FaRobot size={12} /> Proceed</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* Document Agent Popup - TDR Cost */}
            {tdrDocModal && (
                tdrDocMinimized ? (
                    <div className="doc-agent-popup minimized" style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
                        <div className="doc-agent-header" style={{ borderRadius: '16px' }}>
                            <div className="doc-agent-header-title">
                                <FaRobot size={14} />
                                <span>TDR Cost — Document Agent</span>
                            </div>
                            <div className="doc-agent-header-actions">
                                <button className="doc-agent-icon-btn" title="Maximize" onClick={() => setTdrDocMinimized(false)}><FaChevronUp size={11} /></button>
                                <button className="doc-agent-icon-btn" title="Close" onClick={() => closeDocModal('tdr')}><FaTimes size={11} /></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="doc-agent-overlay">
                        <div className="doc-agent-popup">
                            <div className="doc-agent-header">
                                <div className="doc-agent-header-title">
                                    <FaRobot size={15} />
                                    <span>TDR Cost — Document Agent</span>
                                </div>
                                <div className="doc-agent-header-actions">
                                    <button className="doc-agent-icon-btn" title="Minimize" onClick={() => setTdrDocMinimized(true)}><FaChevronDown size={11} /></button>
                                    <button className="doc-agent-icon-btn" title="Close" onClick={() => closeDocModal('tdr')}><FaTimes size={12} /></button>
                                </div>
                            </div>
                            <div className="doc-agent-body">
                                {/* Section 1: Upload Documents */}
                                <div className="mb-4">
                                    <div className="doc-agent-section-label">📂 Section 1 — Upload Documents</div>
                                    <div className="doc-upload-zone" onClick={() => tdrFileRef.current && tdrFileRef.current.click()}>
                                        <FaFileUpload size={24} style={{ color: '#94a3b8', marginBottom: 8 }} />
                                        <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Click to upload documents</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, Word, Excel, Images — Multiple files allowed</div>
                                    </div>
                                    <input
                                        ref={tdrFileRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange('tdr', e)}
                                    />
                                    {tdrFiles.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            {tdrFiles.map((f, i) => (
                                                <span key={i} className="doc-file-chip">
                                                    📄 {f.name}
                                                    <button onClick={() => removeFile('tdr', i)} title="Remove"><FaTimes /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Section 2: User Query */}
                                <div>
                                    <div className="doc-agent-section-label">💬 Section 2 — Your Query</div>
                                    <textarea
                                        className="doc-query-textarea"
                                        value={tdrQuery}
                                        onChange={e => setTdrQuery(e.target.value)}
                                        placeholder="Enter your query about TDR costs..."
                                        rows={3}
                                    />
                                </div>
                                {/* Result */}
                                {tdrDocResult && (
                                    <div className={`doc-agent-result${
                                        tdrDocResult.type === 'cost' ? '' :
                                        tdrDocResult.type === 'info' ? ' info' : ' error'
                                    }`}>
                                        {tdrDocResult.type === 'cost' ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                    <FaCheckCircle style={{ color: '#059669', flexShrink: 0 }} />
                                                    <strong>Extracted Value: {currency} {tdrDocResult.value}</strong>
                                                </div>
                                                {tdrDocResult.context && (
                                                    <div className="doc-agent-markdown" style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{tdrDocResult.context}</ReactMarkdown>
                                                    </div>
                                                )}
                                                <div style={{ marginTop: 6, fontSize: 11, color: '#059669', fontStyle: 'italic' }}>✅ Auto-filled in TDR Cost field</div>
                                            </>
                                        ) : tdrDocResult.type === 'info' ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                    <FaRobot style={{ color: '#3b82f6', flexShrink: 0 }} />
                                                    <strong style={{ color: '#1e40af' }}>Document Answer</strong>
                                                </div>
                                                <div className="doc-agent-markdown" style={{ fontSize: 13, color: '#1e3a5f', lineHeight: 1.65 }}>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{tdrDocResult.context}</ReactMarkdown>
                                                </div>
                                            </>
                                        ) : (
                                            <><FaInfoCircle style={{ marginRight: 6, color: '#d97706' }} />{tdrDocResult.context}</>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="doc-agent-footer">
                                <button className="doc-cancel-btn" onClick={() => closeDocModal('tdr')}>Cancel</button>
                                <button
                                    className="doc-proceed-btn"
                                    onClick={() => handleDocumentProceed('tdr')}
                                    disabled={isProcessingTdr || tdrFiles.length === 0}
                                >
                                    {isProcessingTdr ? (
                                        <><div className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14, borderWidth: '0.15em' }} /> Processing...</>
                                    ) : (
                                        <><FaRobot size={12} /> Proceed</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default CostOfProjectDetails;
