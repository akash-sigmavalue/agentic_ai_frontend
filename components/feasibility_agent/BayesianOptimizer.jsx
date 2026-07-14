import React, { useEffect, useState } from "react";
import { FaBrain, FaRocket, FaSave, FaUndo, FaDatabase, FaCheckCircle, FaCircle, FaLayerGroup, FaTrophy, FaBullseye, FaDownload } from 'react-icons/fa';
import { Line, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const normalizeMetricKey = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, "");

// Individual Card Component
const BayesianOptimizerCard = ({ villageId, villageName, bhk, nTrials, randomSeed, unitCount }) => {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    if (!villageId || !bhk) {
      setRunError("Village or BHK missing.");
      return;
    }
    setRunError(null);
    setRunning(true);
    setResult(null);
    try {
      const payload = {
        village_id: villageId,
        village: villageName,
        bhk: bhk,
        n_trials: nTrials,
        random_seed: randomSeed,
      };
      const resp = await fetch(
        "/new_rate_simulator/simulator/bayesian-optimizer/run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!resp.ok) {
        throw new Error(`Run request failed: ${resp.status}`);
      }
      const data = await resp.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to run optimization");
      }
      setResult(data);
    } catch (err) {
      setRunError(err.message || "Failed to run optimization");
    } finally {
      setRunning(false);
    }
  };

  const stats = result?.stats;
  const best = result?.optimization?.best;
  const comparison = result?.comparison;

  /* Dispatch event on result update */
  useEffect(() => {
    if (result && result.optimization && result.optimization.best) {
      const best = result.optimization.best;
      // Calculate Expected Revenue: Base Price * Unit Count (if available)
      const expectedRevenue = unitCount ? Math.round(best.base_price * unitCount) : 0;

      const event = new CustomEvent('bayesianSimulationUpdated', {
        detail: {
          unitType: bhk, // e.g. "1 Bhk" - listener will normalize it
          expectedRevenue: expectedRevenue
        }
      });
      window.dispatchEvent(event);

      try {
        const metricKey = normalizeMetricKey(bhk);
        const existing = JSON.parse(localStorage.getItem("bayesianOptimizerMetrics") || "{}");
        existing[metricKey] = {
          bhk,
          currentAvgPrice: Number(stats?.avg_price) || 0,
          currentTxns: Number(stats?.current_transactions) || 0,
          bestBasePrice: Number(best?.base_price) || 0,
          bestTxns: Number(best?.total_transactions) || 0,
          expectedRevenue,
        };
        localStorage.setItem("bayesianOptimizerMetrics", JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent("bayesianOptimizerMetricsUpdated", { detail: existing }));

        const existingTransactions = JSON.parse(localStorage.getItem("bayesianOptimizerTransactions") || "{}");
        const transactionRows = (result.optimization?.trials || []).map((trial) => ({
          bhk,
          ticketSize: Number(trial?.base_price) || 0,
          lowRange: Number(trial?.low_price) || 0,
          highRange: Number(trial?.high_price) || 0,
          totalTransactions: Number(trial?.total_transactions) || 0,
          transactionsPerMonth: Number(trial?.transactions_per_month) || 0,
          isBest: Number(trial?.trial_number) === Number(best?.trial_number),
        }));
        const transactionPayload = {
          rows: {
            ...(existingTransactions.rows || {}),
            [metricKey]: transactionRows,
          },
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bayesianOptimizerTransactions", JSON.stringify(transactionPayload));
        window.dispatchEvent(new CustomEvent("bayesianOptimizerTransactionsUpdated", { detail: transactionPayload }));
      } catch (error) {
        console.error("Failed to save Bayesian metrics", error);
      }
    }
  }, [result, unitCount, bhk]);

  return (
    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white bo-optimizer-card">
      <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4 bo-optimizer-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="fw-bold mb-0 text-dark">{bhk}</h5>
            {unitCount && <small className="text-muted" style={{ fontSize: '11px' }}>({unitCount} Units)</small>}
          </div>
          {!result && !running && (
            <span className="badge bg-light text-muted border">Idle</span>
          )}
          {running && (
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Running...</span>
          )}
          {result && !running && (
            <span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span>
          )}
        </div>
      </div>
      <div className="card-body px-4 pb-4 pt-2 bo-optimizer-card-body">
        <div className="mb-3">
          <button
            className="btn btn-primary w-100 rounded-pill"
            onClick={handleRun}
            disabled={running || !villageId}
          >
            {running ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Optimizing...
              </>
            ) : (
              <>
                <FaRocket className="me-2" />
                Run Optimization
              </>
            )}
          </button>
          {runError && (
            <div className="alert alert-danger mt-3 mb-0 py-2 small">{runError}</div>
          )}
        </div>

        {result && !result.empty && stats && (
          <div className="fade-in-up">
            {/* Mini Stats Grid */}
            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="p-2 border rounded bg-light text-center">
                  <div className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Current Avg Price</div>
                  <div className="fw-bold text-dark">₹{Math.round(stats.avg_price).toLocaleString("en-IN")}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2 border rounded bg-light text-center">
                  <div className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Current Txns</div>
                  <div className="fw-bold text-dark">{stats.current_transactions.toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>

            {best && (
              <>
                <hr className="my-3" />
                <h6 className="fw-semibold text-primary mb-2 small text-uppercase">
                  <FaBullseye className="me-1" /> Best Found
                </h6>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <div className="p-2 border border-primary border-opacity-25 bg-primary bg-opacity-10 rounded text-center">
                      <div className="text-primary small" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Best Base Price</div>
                      <div className="fw-bold text-primary">₹{Math.round(best.base_price).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 border border-success border-opacity-25 bg-success bg-opacity-10 rounded text-center">
                      <div className="text-success small" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Max Txns</div>
                      <div className="fw-bold text-success">{best.total_transactions.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-2 border border-info border-opacity-25 bg-info bg-opacity-10 rounded text-center">
                      <div className="text-info small" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Expected Revenue</div>
                      <div className="fw-bold text-info">
                        {unitCount ? `₹${Math.round(best.base_price * unitCount).toLocaleString("en-IN")}` : "-"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-muted small mb-1">Optimal Range</div>
                  <div className="badge bg-light text-dark border fw-normal">
                    ₹{Math.round(best.low_price).toLocaleString("en-IN")} - ₹{Math.round(best.high_price).toLocaleString("en-IN")}
                  </div>
                </div>
              </>
            )}

            {comparison && (
              <div className="mt-3 text-center">
                <small className="text-muted d-block mb-1">Improvement vs Input</small>
                <span className={`badge ${comparison.improvement.transactions_pct > 0 ? 'bg-success' : 'bg-secondary'}`}>
                  {comparison.improvement.transactions_pct > 0 ? '+' : ''}{comparison.improvement.transactions_pct.toFixed(1)}% Transactions
                </span>
              </div>
            )}

            {/* All Trials Table */}
            {result.optimization?.trials?.length > 0 && (
              <div className="mt-4">
                <h6 className="fw-semibold text-dark mb-2 small text-uppercase">📋 All Trials</h6>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Total: {result.optimization.trials.length}
                  </small>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      const header = ["Trial #", "Base Price (₹)", "Low (₹)", "High (₹)", "Expected Revenue (₹)", "Total Transactions", "Per Month"];
                      const rows = result.optimization.trials.map((t) => [
                        t.trial_number,
                        Math.round(t.base_price),
                        Math.round(t.low_price),
                        Math.round(t.high_price),
                        unitCount ? Math.round(t.base_price * unitCount) : "-",
                        t.total_transactions,
                        t.transactions_per_month.toFixed(1),
                      ]);
                      const csvLines = [header.join(","), ...rows.map((r) => r.join(","))];
                      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", `optimization_results_${villageName || "village"}_${bhk}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <FaDownload className="me-1" /> CSV
                  </button>
                </div>
                <div className="table-responsive" style={{ maxHeight: 200, fontSize: '11px' }}>
                  <table className="table table-sm table-striped mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>#</th>
                        <th>Base(₹)</th>
                        <th>Low(₹)</th>
                        <th>High(₹)</th>
                        <th>Exp Rev(₹)</th>
                        <th>Txns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.optimization.trials.map((t) => {
                        const isBest =
                          best &&
                          typeof best.trial_number === "number" &&
                          t.trial_number === best.trial_number;
                        const expRev = unitCount
                          ? Math.round(t.base_price * unitCount).toLocaleString(
                            "en-IN"
                          )
                          : "-";
                        // Highlight style matching TicketSizeSimulation
                        const highlightStyle = isBest
                          ? {
                            backgroundColor: "#e8f5e9",
                            borderTop: "2px solid #4caf50",
                            borderBottom: "2px solid #4caf50",
                          }
                          : {};

                        const textClass = isBest ? "text-success" : "";

                        return (
                          <tr
                            key={t.trial_number}
                            className={isBest ? "fw-bold" : ""}
                            style={highlightStyle}
                          >
                            <td className={isBest ? "text-dark" : ""}>{t.trial_number}</td>
                            <td className={textClass}>
                              {Math.round(t.base_price).toLocaleString("en-IN")}
                            </td>
                            <td className={textClass}>
                              {Math.round(t.low_price).toLocaleString("en-IN")}
                            </td>
                            <td className={textClass}>
                              {Math.round(t.high_price).toLocaleString("en-IN")}
                            </td>
                            <td className={textClass}>{expRev}</td>
                            <td className={textClass}>
                              {t.total_transactions.toLocaleString("en-IN")}
                              {isBest && <FaTrophy className="ms-2 text-warning" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
        {result && result.empty && (
          <div className="alert alert-warning mt-3 py-2 small">{result.message}</div>
        )}
      </div>
    </div>
  );
};


const BayesianOptimizer = () => {
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [villages, setVillages] = useState([]); // Array of {id, name, bhks}

  const [selectedVillageId, setSelectedVillageId] = useState(null);
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [nTrials, setNTrials] = useState(100);
  const [randomSeed, setRandomSeed] = useState(42);
  const [unitCounts, setUnitCounts] = useState({});

  const bhkTypes = ['1Bhk', '2Bhk', '3Bhk', '>3Bhk', 'Shop', 'Office'];

  useEffect(() => {
    // Load saved unit mix counts
    const loadUnitCounts = () => {
      try {
        const saved = localStorage.getItem("revenuep2_unitMix");
        if (saved) {
          const parsed = JSON.parse(saved);
          const counts = {};
          if (parsed.unitCountData && Array.isArray(parsed.unitCountData)) {
            parsed.unitCountData.forEach((item) => {
              if (item.Unit_Type && item.No_Of_Units != null) {
                const key = String(item.Unit_Type)
                  .replace(/\s+/g, "")
                  .toLowerCase();
                counts[key] = item.No_Of_Units;
                console.log(`BayesianOptimizer: Loaded unit count ${key}: ${item.No_Of_Units}`);
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
      console.log("BayesianOptimizer: Received unit count update", event.detail);
      if (event.detail && Array.isArray(event.detail)) {
        const counts = {};
        event.detail.forEach((item) => {
          if (item.Unit_Type && item.No_Of_Units != null) {
            const key = String(item.Unit_Type)
              .replace(/\s+/g, "")
              .toLowerCase();
            counts[key] = item.No_Of_Units;
          }
        });
        setUnitCounts(counts);
      }
    };

    window.addEventListener("unitCountDataUpdated", handleUnitCountUpdate);

    return () => {
      window.removeEventListener("unitCountDataUpdated", handleUnitCountUpdate);
    };
  }, []);

  // Load metadata once
  useEffect(() => {
    const loadMeta = async () => {
      setLoadingMeta(true);
      setMetaError(null);
      try {
        const resp = await fetch(
          "/new_rate_simulator/simulator/bayesian-optimizer/meta"
        );
        if (!resp.ok) {
          throw new Error(`Meta request failed: ${resp.status}`);
        }
        const data = await resp.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load metadata");
        }
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

        // If we have villages loaded, verify it exists
        if (villages.length > 0) {
          const villageExists = villages.some(v => v.id === newVillageId);
          if (villageExists) {
            setSelectedVillageId(newVillageId);
            // Use name from event if valid, or find in list
            if (newVillageName) setSelectedVillageName(newVillageName);
            else {
              const v = villages.find(v => v.id === newVillageId);
              if (v) setSelectedVillageName(v.name);
            }
          }
        } else {
          // If villages not loaded yet/empty, just set the ID/Name so it might match later or at least show
          setSelectedVillageId(newVillageId);
          if (newVillageName) setSelectedVillageName(newVillageName);
        }
      }
    };

    window.addEventListener('marketAnalysisUpdated', handleMarketAnalysisUpdate);

    return () => {
      window.removeEventListener('marketAnalysisUpdated', handleMarketAnalysisUpdate);
    };
  }, [villages]);

  return (
    <div className="col-12 fade-in-up stagger-4 mt-5">
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
        <div className="d-flex align-items-center mb-4">
          <div
            className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3"
            style={{ width: "40px", height: "40px" }}
          >
            <FaBrain />
          </div>
          <div>
            <h4 className="fw-bold mb-0 text-dark">
              Bayesian Optimization – Transaction Optimizer
            </h4>
            <small className="text-muted">
              Find the price range (±10%) that maximizes transaction volume for each unit type.
            </small>
          </div>
        </div>

        {/* Global Controls Row */}
        <div className="row g-3 mb-4 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-semibold small text-uppercase text-muted">Select Village</label>
            <select
              className="form-select"
              value={selectedVillageId || ""}
              onChange={(e) => {
                const villageId = parseInt(e.target.value);
                const village = villages.find((v) => v.id === villageId);
                if (village) {
                  setSelectedVillageId(village.id);
                  setSelectedVillageName(village.name);
                }
              }}
            >
              <option value="" disabled>Select a village</option>
              {villages.map((v) => (
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
              min={10}
              max={500}
              step={5}
              value={nTrials}
              onChange={(e) => setNTrials(Number(e.target.value || 10))}
              placeholder="e.g. 100"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold small text-uppercase text-muted">Random Seed</label>
            <input
              type="number"
              className="form-control"
              min={0}
              max={1000}
              value={randomSeed}
              onChange={(e) => setRandomSeed(Number(e.target.value || 0))}
              placeholder="e.g. 42"
            />
          </div>
        </div>

        {metaError && (
          <div className="alert alert-danger mb-4">{metaError}</div>
        )}

        {/* Grid of Optimization Cards */}
        <div className="row g-4">
          {bhkTypes.map((bhk, index) => {
            const unitCount = unitCounts[bhk.replace(/\s+/g, "").toLowerCase()];
            return (
              <div className="col-12" key={bhk}>
                <BayesianOptimizerCard
                  villageId={selectedVillageId}
                  villageName={selectedVillageName}
                  bhk={bhk}
                  nTrials={nTrials}
                  randomSeed={randomSeed}
                  unitCount={unitCount}
                />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export { BayesianOptimizerCard };
export default BayesianOptimizer;
