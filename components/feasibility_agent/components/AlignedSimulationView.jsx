import React, { useState, useEffect } from 'react';
import { SimulationTable } from './TicketSizeSimulation';
import { BayesianOptimizerCard } from '../BayesianOptimizer';
import useTicketSizeSimulation, { UNIT_TYPES } from '../hooks/useTicketSizeSimulation';
import useBayesianOptimizer from '../hooks/useBayesianOptimizer';
import { FaSearchDollar, FaPlay, FaSave, FaUndo, FaCheckCircle, FaRegCircle, FaBrain ,FaDatabase} from 'react-icons/fa';


// Map TSS unit types to BO bhk types
const TSS_TO_BO_MAP = {
    '1 BHK': '1Bhk',
    '2 BHK': '2Bhk',
    '3 BHK': '3Bhk',
    '>3BHK': '>3Bhk',
    'Shop': 'Shop',
    'Office': 'Office',
};

const readLandDetailsForm = () => {
    try {
        const raw = localStorage.getItem('landDetailsForm');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
};

const AlignedSimulationView = ({ showTicketSizeSimulation = true, showBayesianOptimization = true }) => {
    // Resolve villageId from village name (same pattern as RevSimulation)
    const [villageId, setVillageId] = useState(null);

    useEffect(() => {
        const resolveVillageId = async () => {
            const village = readLandDetailsForm()?.village || '';
            const name = (village || '').trim();
            if (!name) { setVillageId(null); return; }
            try {
                const params = new URLSearchParams({ name });
                const resp = await fetch(`/data_db/get_village_id_by_name/?${params.toString()}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data?.ok && data?.village?.id != null) {
                        setVillageId(data.village.id);
                    }
                }
            } catch (err) {
                console.error('AlignedSimulationView: Failed to resolve village ID:', err);
            }
        };

        resolveVillageId();

        const sync = () => resolveVillageId();
        window.addEventListener('landDetailsUpdated', sync);
        return () => window.removeEventListener('landDetailsUpdated', sync);
    }, []);

    const tss = useTicketSizeSimulation(villageId);
    const bo = useBayesianOptimizer();

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
        min-width: max-content;
        overflow: visible;
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
      .aligned-section-col {
        display: flex;
        flex-direction: column;
      }
      .sim-selected-panel {
        background: #ffffff;
        border: 1px solid #e7ebf1;
        border-radius: 24px;
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        overflow: hidden;
        height: 100%;
      }
      .sim-selected-header {
        padding: 24px 26px 16px;
        border-bottom: 1px solid #edf1f6;
        background: #ffffff;
      }
      .sim-selected-eyebrow {
        color: #8b95a5;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .sim-selected-title {
        color: #111827;
        font-size: 32px;
        line-height: 1;
        font-weight: 800;
        margin: 0;
      }
      .sim-selected-copy {
        color: #687384;
        font-size: 13px;
        font-weight: 600;
        margin: 10px 0 0;
      }
      .sim-selected-body {
        padding: 24px 26px 26px;
        background: #ffffff;
      }
      .sim-tool-card {
        border: 1px solid #e5eaf2 !important;
        background: #fbfcff !important;
        border-radius: 18px !important;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035) !important;
      }
      .sim-selected-panel .btn,
      .tss-simulation-card .btn {
        min-height: 40px;
        border-radius: 999px;
        font-weight: 800;
      }
      .tss-simulation-card {
        border: 1px solid #dfe7f1 !important;
        border-radius: 20px !important;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07) !important;
        overflow: hidden;
        background: #ffffff !important;
      }
      .tss-simulation-card-header {
        background: #f8fafc !important;
        border-bottom: 1px solid #e2e8f0 !important;
        padding: 18px 20px !important;
      }
      .tss-simulation-card-body {
        background: #ffffff;
      }
      .tss-grid-shell {
        background: #f8fafc;
        border: 1px solid #e4ebf5;
        border-radius: 16px;
        padding: 14px;
        display: flex;
        justify-content: center;
      }
      .tss-grid-shell .tss-grid {
        gap: 8px;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        background: transparent;
      }
      .tss-grid-shell .tss-cell {
        min-height: 58px;
        padding: 10px 12px;
        background: #ffffff;
        border: 1px solid #e1e8f2;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.035);
        color: #273242;
        line-height: 1.25;
      }
      .tss-grid-shell .tss-header {
        background: #eef3f8 !important;
        border-color: #dbe4ef !important;
        color: #334155;
        font-weight: 800;
      }
      .tss-grid-shell .tss-formula {
        background: #ffffff !important;
        color: #273242;
      }
      .tss-grid-shell .tss-input {
        min-height: 36px;
        border: 1px solid #d8e1ec;
        border-radius: 10px;
      }
      .bo-optimizer-card {
        border: 1px solid #dfe7f1 !important;
        border-radius: 20px !important;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07) !important;
        overflow: hidden;
        background: #ffffff !important;
      }
      .bo-optimizer-card-header {
        background: #f8fafc !important;
        border-bottom: 1px solid #e2e8f0 !important;
        padding: 18px 20px !important;
      }
      .bo-optimizer-card-body {
        background: #ffffff;
      }
      .bo-optimizer-card .btn {
        min-height: 40px;
        border-radius: 999px;
        font-weight: 800;
      }
      .bo-optimizer-card .table {
        border-color: #e2e8f0;
      }
      .bo-optimizer-card .table thead th {
        background: #f4f7fb !important;
        color: #3f4a5a !important;
        border-color: #e2e8f0 !important;
        font-size: 11px;
        font-weight: 800;
      }
      .bo-optimizer-card .table tbody td {
        border-color: #e2e8f0 !important;
        color: #273242;
      }
  `;

    return (
        <div className="tss-container mt-2 fade-in-up">
            <style>{css}</style>

            {/* ═══════════════ ROW 0: Controls & Inputs ═══════════════ */}
            <div className="row g-4 mb-4">
                {/* LEFT: Ticket Size Simulation Controls */}
                {showTicketSizeSimulation && (
                    <div className="col-lg-6 aligned-section-col">
                        <div className="sim-selected-panel">
                            <div className="sim-selected-header">
                                <div className="sim-selected-eyebrow">Selected Section</div>
                                <h2 className="sim-selected-title">Ticket Size Simulation</h2>
                                <p className="sim-selected-copy">
                                    Simulate transaction volume based on average ticket size. Green cells are calculated automatically.
                                </p>
                            </div>
                            <div className="sim-selected-body">
                                {/* Buttons */}
                                <div className="card border-0 shadow-sm rounded-4 mb-3 sim-tool-card">
                                    <div className="card-body p-3 d-flex flex-wrap gap-3 align-items-center">
                                        <button className="btn btn-info rounded-pill px-4 shadow-sm tss-btn text-white" onClick={tss.handleSave}>
                                            <FaSave className="me-2" />Save All
                                        </button>
                                        <button className="btn btn-warning rounded-pill px-4 shadow-sm tss-btn text-dark fw-bold" onClick={tss.handleSimulate}>
                                            <FaPlay className="me-2" />Simulate
                                        </button>
                                        <button className="btn btn-primary rounded-pill px-4 shadow-sm tss-btn" onClick={tss.resetToDefault}>
                                            <FaUndo className="me-2" />Reset All
                                        </button>
                                        <div className="ms-auto text-muted small">
                                           <FaDatabase className="me-1" />Data Simulation Removed
                                        </div>
                                    </div>
                                </div>

                                {/* Unit Type Selection */}
                                <div className="card border-0 shadow-sm rounded-4 bg-white flex-grow-1 sim-tool-card">
                                    <div className="card-body p-3">
                                        <label className="small text-uppercase fw-bold text-muted mb-2 d-block ls-1">Select Unit Types to Simulate</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {UNIT_TYPES.map(type => (
                                                <button
                                                    key={type}
                                                    className={`btn rounded-pill px-3 py-2 text-sm fw-medium transition-all shadow-sm ${tss.selectedUnitTypes.includes(type) ? 'btn-primary text-white border-0' : 'btn-light text-secondary bg-white border'}`}
                                                    style={{ fontSize: '0.85rem' }}
                                                    onClick={() => tss.toggleUnitType(type)}
                                                >
                                                    {tss.selectedUnitTypes.includes(type) ?
                                                        <FaCheckCircle className="me-2" /> :
                                                        <FaRegCircle className="me-2 text-muted opacity-50" />
                                                    }
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RIGHT: Bayesian Optimizer Controls */}
                {showBayesianOptimization && (
                    <div className="col-lg-6 aligned-section-col">
                        <div className="sim-selected-panel">
                            <div className="sim-selected-header">
                                <div className="sim-selected-eyebrow">Selected Section</div>
                                <h2 className="sim-selected-title">Bayesian Optimization</h2>
                                <p className="sim-selected-copy">
                                    Find the price range (±10%) that maximizes transaction volume for each unit type.
                                </p>
                            </div>
                            <div className="sim-selected-body">
                                <div className="card border-0 shadow-sm rounded-4 bg-white sim-tool-card">
                                    <div className="card-body p-4">
                                        <div className="d-flex align-items-center mb-4">
                                            <div
                                                className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                                                style={{ width: "40px", height: "40px" }}
                                            >
                                                <FaBrain />
                                            </div>
                                            <div>
                                                <h4 className="fw-bold mb-0 text-dark">
                                                    Transaction Optimizer
                                                </h4>
                                                <small className="text-muted">
                                                    Configure optimizer inputs for each selected unit type.
                                                </small>
                                            </div>
                                        </div>

                                        {/* Global Controls Row */}
                                        <div className="row g-3 mb-3 align-items-end">
                                            <div className="col-md-4">
                                                <label className="form-label fw-semibold small text-uppercase text-muted">Select Village</label>
                                                <select
                                                    className="form-select"
                                                    value={bo.selectedVillageId || ""}
                                                    onChange={(e) => {
                                                        const vid = parseInt(e.target.value);
                                                        const village = bo.villages.find((v) => v.id === vid);
                                                        if (village) {
                                                            bo.setSelectedVillageId(village.id);
                                                            bo.setSelectedVillageName(village.name);
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Select a village</option>
                                                    {bo.villages.map((v) => (
                                                        <option key={v.id} value={v.id}>
                                                            {v.name} (ID: {v.id})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-semibold small text-uppercase text-muted">Number of Trials</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    min={10} max={500} step={5}
                                                    value={bo.nTrials}
                                                    onChange={(e) => bo.setNTrials(Number(e.target.value || 10))}
                                                    placeholder="e.g. 100"
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-semibold small text-uppercase text-muted">Random Seed</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    min={0} max={1000}
                                                    value={bo.randomSeed}
                                                    onChange={(e) => bo.setRandomSeed(Number(e.target.value || 0))}
                                                    placeholder="e.g. 42"
                                                />
                                            </div>
                                        </div>

                                        {bo.metaError && (
                                            <div className="alert alert-danger mb-0">{bo.metaError}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════ ROWS 1-6: Per Unit Type Cards ═══════════════ */}
            {UNIT_TYPES.map(tssType => {
                const boType = TSS_TO_BO_MAP[tssType];
                const isSelected = tss.selectedUnitTypes.includes(tssType);

                if (!isSelected) return null;

                return (
                    <div className="row g-4 mb-4" key={tssType}>
                        {/* LEFT: SimulationTable */}
                        {showTicketSizeSimulation && (
                            <div className="col-lg-6">
                                <SimulationTable
                                    type={tssType}
                                    avgTicketSize={tss.avgTicketSizes[tssType]}
                                    onAvgTicketSizeChange={(val) => tss.handleAvgTicketSizeChange(tssType, val)}
                                    velocityData={tss.simulationResults[tssType] || {}}
                                    onSimulate={() => tss.handleSimulateSingle(tssType)}
                                    noOfUnits={tss.getUnitCount(tssType)}
                                />
                            </div>
                        )}

                        {/* RIGHT: BayesianOptimizerCard */}
                        {showBayesianOptimization && (
                            <div className="col-lg-6">
                                <BayesianOptimizerCard
                                    villageId={bo.selectedVillageId}
                                    villageName={bo.selectedVillageName}
                                    bhk={boType}
                                    nTrials={bo.nTrials}
                                    randomSeed={bo.randomSeed}
                                    unitCount={bo.getUnitCount(boType)}
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {tss.selectedUnitTypes.length === 0 && (
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

export default AlignedSimulationView;
