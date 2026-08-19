/**
 * CostOutflowSimulationModal.jsx
 *
 * 4-step wizard modal:
 *   Step 1 — View Data
 *   Step 2 — Validate
 *   Step 3 — Simulate
 *   Step 4 — Review & Apply
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { FaChartBar, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSpinner, FaEdit, FaSave, FaUndo, FaArrowRight, FaArrowLeft, FaCode, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { apiUrl } from "@/lib/api-client";
import { buildCostOutflowPayload, convertResultToIrrFormData } from "../utils/buildCostOutflowPayload";
import { useLedger } from "../hooks/useLedger";

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = ["View Data", "Validate", "Simulate", "Review & Apply"];

const PROGRESS_MESSAGES = [
  "Validating project data…",
  "Classifying project costs…",
  "Checking location context…",
  "Generating year-wise percentages…",
  "Calculating cost amounts…",
  "Reconciling totals…",
  "Preparing results…",
];

const FIXED_COST_LABELS = {
  landAcquisition:    "Land Acquisition",
  landLeveling:       "Land Leveling",
  constructionCost:   "Construction Cost",
  marketingCost:      "Marketing & Selling Cost",
  approvalCost:       "Approval Cost",
  administrativeCost: "Administrative Cost",
  tdrCost:            "TDR Cost",
  financeCost:        "Finance Cost",
  miscellaneousCost:  "Miscellaneous Cost",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val, currency = "INR") => {
  if (!val && val !== 0) return "—";
  const n = Number(val);
  if (n >= 10_000_000) return `${currency} ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `${currency} ${(n / 100_000).toFixed(2)} L`;
  return `${currency} ${n.toLocaleString("en-IN")}`;
};

const pct = (v) => `${Number(v).toFixed(1)}%`;

// ─── Main Component ───────────────────────────────────────────────────────────
const CostOutflowSimulationModal = ({ isOpen, onClose, onApply, selectedScenario }) => {
  const { recordLlmCall } = useLedger();
  const [step, setStep] = useState(1);
  const [payload, setPayload] = useState(null);
  const [buildErrors, setBuildErrors] = useState([]);
  const [buildWarnings, setBuildWarnings] = useState([]);
  const [isRawOpen, setIsRawOpen] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedPct, setEditedPct] = useState({});

  // Build payload every time modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSimResult(null);
    setSimError(null);
    setEditMode(false);
    setEditedPct({});
    const { payload: p, errors: e, warnings: w } = buildCostOutflowPayload(selectedScenario);
    setPayload(p);
    setBuildErrors(e);
    setBuildWarnings(w);
  }, [isOpen, selectedScenario]);

  // Animate progress messages during simulation
  useEffect(() => {
    if (!simLoading) return;
    setProgressIdx(0);
    const interval = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [simLoading]);

  // ── Simulate ──────────────────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    if (!payload) return;
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const res = await fetch(
        apiUrl("/new_rate_simulator/simulator/cost-outflow-simulation"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
        recordLlmCall(
          "mistral.mistral-large-3-675b-instruct",
          "Cost Outflow Simulation",
          { apiCalls: 1 }
        );
        setStep(4);
        // Initialise editable percentages from result
        const init = {};
        for (const row of data.cost_rows) {
          init[row.cost_code] = {};
          for (const alloc of row.allocations) {
            init[row.cost_code][alloc.year_index] = alloc.percentage;
          }
        }
        setEditedPct(init);
      } else {
        setSimError(
          data.error ||
            (data.blocking_errors || []).join(" ") ||
            "Simulation failed."
        );
      }
    } catch (err) {
      setSimError(err.message || "Network error.");
    } finally {
      setSimLoading(false);
    }
  }, [payload]);

  // ── Edit mode helpers ─────────────────────────────────────────────────────
  const handlePctChange = (costCode, yearIdx, value) => {
    setEditedPct((prev) => ({
      ...prev,
      [costCode]: { ...(prev[costCode] || {}), [yearIdx]: value === "" ? "" : Number(value) },
    }));
  };

  const rowTotal = (costCode) =>
    Object.values(editedPct[costCode] || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  const computedAmount = (costCode, yearIdx) => {
    const row = simResult?.cost_rows?.find((r) => r.cost_code === costCode);
    if (!row) return 0;
    const pctVal = editedPct[costCode]?.[yearIdx] ?? 0;
    return Math.round((row.total_amount * Number(pctVal)) / 100);
  };

  const allRowsValid = useMemo(() => {
    if (!simResult) return false;
    return simResult.cost_rows.every(
      (row) => row.total_amount === 0 || Math.abs(rowTotal(row.cost_code) - 100) < 0.01
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedPct, simResult]);

  const handleSaveDistribution = () => {
    if (!simResult || !allRowsValid) return;
    const updatedResult = JSON.parse(JSON.stringify(simResult));
    
    for (const row of updatedResult.cost_rows) {
      const code = row.cost_code;
      if (editedPct[code]) {
        for (const [idxStr, pctVal] of Object.entries(editedPct[code])) {
          const idx = parseInt(idxStr, 10);
          if (row.allocations[idx] && typeof pctVal === 'number') {
            row.allocations[idx].percentage = pctVal;
            row.allocations[idx].amount = (pctVal / 100) * row.total_amount;
          }
        }
      }
    }
    
    if (updatedResult.annual_totals) {
      const grandTotal = updatedResult.cost_rows.reduce((sum, r) => sum + r.total_amount, 0);
      const newAnnualTotals = [];
      for (let i = 0; i < updatedResult.year_labels.length; i++) {
        let yearTotal = 0;
        for (const row of updatedResult.cost_rows) {
          if (row.allocations[i]) {
            yearTotal += row.allocations[i].amount;
          }
        }
        // Retain existing project stage if any
        const existingStage = updatedResult.annual_totals[i]?.project_stage || "";
        newAnnualTotals.push({
          year_label: updatedResult.year_labels[i],
          year_index: i,
          total_outflow: yearTotal,
          share_of_total_cost: grandTotal > 0 ? (yearTotal / grandTotal) * 100 : 0,
          project_stage: existingStage,
        });
      }
      updatedResult.annual_totals = newAnnualTotals;
    }
    
    setSimResult(updatedResult);
    setEditMode(false);
  };

  const handleAddYear = () => {
    if (!simResult) return;
    const updatedResult = JSON.parse(JSON.stringify(simResult));
    const nextIdx = updatedResult.year_labels.length;
    const nextLabel = `Year ${nextIdx}`;
    
    updatedResult.year_labels.push(nextLabel);
    
    updatedResult.cost_rows.forEach((row) => {
      row.allocations.push({
        year_label: nextLabel,
        year_index: nextIdx,
        percentage: 0,
        amount: 0,
      });
    });
    
    // We intentionally DO NOT update annual_totals here. It will be rebuilt on save.
    
    setSimResult(updatedResult);
  };

  const handleDeleteLastYear = () => {
    if (!simResult || simResult.year_labels.length <= 1) return;
    const updatedResult = JSON.parse(JSON.stringify(simResult));
    
    updatedResult.year_labels.pop();
    
    updatedResult.cost_rows.forEach((row) => {
      row.allocations.pop();
    });
    
    // We intentionally DO NOT update annual_totals here. It will be rebuilt on save.
    
    setSimResult(updatedResult);
  };

  // ── Apply to IRR ──────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!simResult || !allRowsValid) return;
    if (!window.confirm("Apply this cost distribution to the IRR table? This will overwrite existing year percentages for cost rows.")) return;
    // Build modified result using editedPct
    const modifiedRows = simResult.cost_rows.map((row) => ({
      ...row,
      allocations: row.allocations.map((alloc) => ({
        ...alloc,
        percentage: editedPct[row.cost_code]?.[alloc.year_index] ?? alloc.percentage,
        amount:     computedAmount(row.cost_code, alloc.year_index),
      })),
    }));
    const irrFormData = convertResultToIrrFormData({ ...simResult, cost_rows: modifiedRows });
    onApply(irrFormData);
    onClose();
  };

  const currency = payload?.location?.currency || "INR";

  if (!isOpen) return null;

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FaChartBar style={{ color: "#6366f1" }} />
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              Predict Cost Cash Outflow
            </span>
            {simResult?.data_source === "BASELINE_FALLBACK" && (
              <span style={styles.badge("#f59e0b", "#fffbeb")}>Baseline Fallback</span>
            )}
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <FaTimes />
          </button>
        </div>

        {/* ── Stepper ──────────────────────────────────────────────────────── */}
        <div style={styles.stepper}>
          {STEPS.map((label, idx) => {
            const num = idx + 1;
            const active = step === num;
            const done = step > num;
            return (
              <React.Fragment key={num}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: done ? "#10b981" : active ? "#6366f1" : "#e2e8f0",
                    color: done || active ? "#fff" : "#94a3b8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 13, transition: "all 0.3s",
                  }}>
                    {done ? "✓" : num}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#6366f1" : done ? "#10b981" : "#94a3b8" }}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? "#10b981" : "#e2e8f0", margin: "14px 4px 0", transition: "background 0.3s" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={styles.content}>
          {step === 1 && payload && (
            <StepViewData
              payload={payload}
              currency={currency}
              isRawOpen={isRawOpen}
              setIsRawOpen={setIsRawOpen}
            />
          )}
          {step === 2 && (
            <StepValidate errors={buildErrors} warnings={buildWarnings} />
          )}
          {step === 3 && (
            <StepSimulate
              simLoading={simLoading}
              simError={simError}
              progressMsg={PROGRESS_MESSAGES[progressIdx]}
              onSimulate={runSimulation}
              hasErrors={buildErrors.length > 0}
            />
          )}
          {step === 4 && simResult && (
            <StepReview
              result={simResult}
              currency={currency}
              editMode={editMode}
              setEditMode={setEditMode}
              editedPct={editedPct}
              handlePctChange={handlePctChange}
              rowTotal={rowTotal}
              computedAmount={computedAmount}
              allRowsValid={allRowsValid}
              onApply={handleApply}
              onSaveDistribution={handleSaveDistribution}
              onReSimulate={runSimulation}
              onAddYear={handleAddYear}
              onDeleteLastYear={handleDeleteLastYear}
            />
          )}
        </div>

        {/* ── Footer navigation ─────────────────────────────────────────────── */}
        <div style={styles.footer}>
          {step > 1 && step < 4 && (
            <button style={styles.btnSecondary} onClick={() => setStep((s) => s - 1)}>
              <FaArrowLeft size={11} style={{ marginRight: 5 }} /> Back
            </button>
          )}
          {step === 4 && (
            <button style={styles.btnSecondary} onClick={() => setStep(1)}>
              <FaArrowLeft size={11} style={{ marginRight: 5 }} /> Start Over
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button
              style={step === 2 && buildErrors.length > 0 ? styles.btnDisabled : styles.btnPrimary}
              disabled={step === 2 && buildErrors.length > 0}
              onClick={() => setStep((s) => s + 1)}
            >
              {step === 2 ? "Go to Simulate" : "Next"} <FaArrowRight size={11} style={{ marginLeft: 5 }} />
            </button>
          )}
        </div>
      </div>

      <style>{modalCss}</style>
    </div>,
    document.body
  );
};

// ─── Step 1: View Data ────────────────────────────────────────────────────────
const StepViewData = ({ payload, currency, isRawOpen, setIsRawOpen }) => {
  const loc = payload.location || {};
  const dm  = payload.derived_metrics || {};
  const unitMix = payload.product_mix_rows || [];
  const fi  = payload.fixed_inputs || {};
  const cf  = payload.custom_fields || [];
  const dur = payload.timeline?.duration_years;

  const allCosts = [
    ...Object.entries(FIXED_COST_LABELS).map(([key, label]) => ({
      label, amount: parseFloat(fi[key]) || 0,
    })),
    ...cf.map((f) => ({ label: f.name || "Custom", amount: parseFloat(f.value) || 0 })),
  ].filter((c) => c.amount > 0);

  const totalCost = allCosts.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="co-step-body">
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', marginBottom: '24px' }}>
        <FaCheckCircle size={56} color="#10b981" style={{ marginBottom: '20px' }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Simulation Data Ready</h3>
        <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '450px', margin: '0 auto', lineHeight: '1.5' }}>
          We have successfully compiled the project context, unit mix, and cost outflow payloads from your previous steps. Click <strong>Next</strong> to proceed with the cash outflow prediction.
        </p>
      </div>

      {/* Raw Payload */}
      <div
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6366f1", marginTop: 8, userSelect: "none" }}
        onClick={() => setIsRawOpen(!isRawOpen)}
      >
        <FaCode size={12} /> View Raw Payload {isRawOpen ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
      </div>
      {isRawOpen && (
        <pre style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 10, maxHeight: 220, overflowY: "auto", color: "#334155", marginTop: 6 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
};

// ─── Step 2: Validate ─────────────────────────────────────────────────────────
const StepValidate = ({ errors, warnings }) => {
  const allChecks = [
    ...errors.map((msg) => ({ type: "error", msg })),
    ...warnings.map((msg) => ({ type: "warning", msg })),
  ];
  const passed = allChecks.length === 0;

  return (
    <div className="co-step-body">
      <SectionCard title="🔍 Validation Results">
        {passed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 600 }}>
            <FaCheckCircle /> All checks passed! You can proceed to simulation.
          </div>
        )}
        {allChecks.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            {c.type === "error" ? (
              <FaTimesCircle style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
            ) : (
              <FaExclamationTriangle style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
            )}
            <span style={{ fontSize: 13, color: c.type === "error" ? "#991b1b" : "#92400e" }}>{c.msg}</span>
          </div>
        ))}
        {errors.length > 0 && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 12, color: "#991b1b" }}>
            ❌ {errors.length} blocking error{errors.length > 1 ? "s" : ""} must be resolved before simulation.
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ─── Step 3: Simulate ─────────────────────────────────────────────────────────
const StepSimulate = ({ simLoading, simError, progressMsg, onSimulate, hasErrors }) => (
  <div className="co-step-body" style={{ textAlign: "center", padding: "20px 0" }}>
    {!simLoading && !simError && (
      <>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
          Ready to simulate year-wise cost distribution using Mistral AI and your project data.
        </p>
        <button
          style={hasErrors ? styles.btnDisabled : { ...styles.btnPrimary, padding: "12px 32px", fontSize: 15 }}
          disabled={hasErrors}
          onClick={onSimulate}
        >
          <FaChartBar style={{ marginRight: 8 }} /> Simulate Cost Outflow
        </button>
      </>
    )}
    {simLoading && (
      <div style={{ padding: "32px 0" }}>
        <FaSpinner className="co-spin" style={{ fontSize: 36, color: "#6366f1", marginBottom: 16 }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
          Analysing Project Data
        </div>
        <div style={{ fontSize: 13, color: "#6366f1", minHeight: 20, transition: "all 0.5s" }}>
          {progressMsg}
        </div>
      </div>
    )}
    {simError && !simLoading && (
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: 20, maxWidth: 480, margin: "0 auto" }}>
        <FaTimesCircle style={{ color: "#ef4444", fontSize: 24, marginBottom: 8 }} />
        <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: 8 }}>Simulation Failed</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{simError}</div>
        <button style={styles.btnPrimary} onClick={onSimulate}>Retry</button>
      </div>
    )}
  </div>
);

// ─── Step 4: Review & Apply ───────────────────────────────────────────────────
const StepReview = ({ result, currency, editMode, setEditMode, editedPct, handlePctChange, rowTotal, computedAmount, allRowsValid, onApply, onSaveDistribution, onReSimulate, onAddYear, onDeleteLastYear }) => {
  const yearLabels = result.year_labels || [];
  const confidence = Math.round((result.overall_confidence || 0) * 100);
  const confColor = confidence >= 75 ? "#10b981" : confidence >= 50 ? "#f59e0b" : "#ef4444";

  const [isChartOpen, setIsChartOpen] = useState(false);
  const [selectedChartCosts, setSelectedChartCosts] = useState(
    result.cost_rows ? result.cost_rows.map(a => a.cost_name) : []
  );

  const chartData = useMemo(() => {
    if (!result || !result.year_labels || !result.cost_rows) return [];
    return result.year_labels.map(yearLabel => {
      const dataPoint = { name: yearLabel };
      result.cost_rows.forEach(row => {
        const yearAlloc = row.allocations.find(a => a.year_label === yearLabel);
        dataPoint[row.cost_name] = yearAlloc ? Number(yearAlloc.percentage) : 0;
      });
      return dataPoint;
    });
  }, [result]);

  const toggleChartCost = (costName) => {
    setSelectedChartCosts(prev =>
      prev.includes(costName) ? prev.filter(c => c !== costName) : [...prev, costName]
    );
  };
  
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#3b82f6", "#eab308", "#84cc16"];


  return (
    <div className="co-step-body">
      {/* Confidence */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Simulation Confidence:
          <span style={{ fontWeight: 800, color: confColor, fontSize: 18, marginLeft: 6 }}>
            {confidence}%
          </span>
        </div>
        {result.data_source === "BASELINE_FALLBACK" && (
          <span style={styles.badge("#f59e0b", "#fffbeb")}>Baseline Fallback</span>
        )}
        {result.web_research_used && (
          <span style={styles.badge("#6366f1", "#eef2ff")}>🌐 Web Research Used</span>
        )}
      </div>

      {/* Main cost table */}
      <SectionCard 
        title="📊 Year-wise Cost Distribution"
        headerRight={editMode && (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.btnSecondary, padding: "4px 8px", fontSize: 11 }} onClick={onAddYear}>
               + Add Year
            </button>
            <button style={{ ...styles.btnSecondary, padding: "4px 8px", fontSize: 11, color: "#ef4444", borderColor: "#fecaca", background: "#fef2f2" }} onClick={onDeleteLastYear}>
               - Delete Last Year
            </button>
          </div>
        )}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, minWidth: 160 }}>Cost Head</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
                {yearLabels.map((y) => (
                  <th key={y} style={{ ...styles.th, textAlign: "center", minWidth: 100 }}>{y}</th>
                ))}
                {editMode && <th style={styles.th}>Row Total</th>}
              </tr>
            </thead>
            <tbody>
              {result.cost_rows.map((row) => {
                const total = rowTotal(row.cost_code);
                const rowOk = row.total_amount === 0 || Math.abs(total - 100) < 0.01;
                return (
                  <tr key={row.cost_code} style={{ background: editMode && !rowOk ? "#fef2f2" : "transparent" }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{row.cost_name}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{row.cost_behaviour}</div>
                    </td>
                    <td style={{ ...styles.tdR, fontWeight: 600 }}>{fmt(row.total_amount, currency)}</td>
                    {yearLabels.map((y, idx) => {
                      const alloc = row.allocations.find((a) => a.year_label === y);
                      if (!alloc) return <td key={y} style={styles.td}>—</td>;
                      const amt = computedAmount(row.cost_code, idx);
                      const pctVal = editedPct[row.cost_code]?.[idx] ?? alloc.percentage;
                      return (
                        <td key={y} style={{ ...styles.tdC, verticalAlign: "middle" }}>
                          {editMode ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={pctVal}
                                onChange={(e) => handlePctChange(row.cost_code, idx, e.target.value)}
                                style={{ width: 58, textAlign: "right", fontSize: 11, padding: "2px 4px", border: "1px solid #c7d2fe", borderRadius: 4 }}
                              />
                              <span style={{ fontSize: 9, color: "#6366f1" }}>{fmt(amt, currency)}</span>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: 12 }}>{pct(alloc.percentage)}</span>
                              <span style={{ fontSize: 10, color: "#64748b" }}>{fmt(alloc.amount, currency)}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {editMode && (
                      <td style={{ ...styles.tdC, fontWeight: 700, color: rowOk ? "#10b981" : "#ef4444" }}>
                        {total.toFixed(1)}%
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Annual summary */}
      <SectionCard title="📅 Annual Summary">
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Year", "Annual Outflow", "Share of Total", "Project Stage"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.annual_totals.map((t) => (
                <tr key={t.year_label}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{t.year_label}</td>
                  <td style={styles.tdR}>{fmt(t.total_outflow, currency)}</td>
                  <td style={styles.tdR}>{pct(t.share_of_total_cost)}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: "#64748b" }}>{t.project_stage || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Assumptions & Warnings */}
      {result.assumptions?.length > 0 && (
        <SectionCard title="📝 Assumptions">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {result.assumptions.map((a, i) => (
              <li key={i} style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{a}</li>
            ))}
          </ul>
        </SectionCard>
      )}
      {result.warnings?.length > 0 && (
        <SectionCard title="⚠️ Warnings">
          {result.warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <FaExclamationTriangle style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: "#92400e" }}>{w.message}</span>
            </div>
          ))}
        </SectionCard>
      )}

      {/* Chart Section */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 14 }}>
        <div 
          onClick={() => setIsChartOpen(!isChartOpen)}
          style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <FaChartBar style={{ color: "#6366f1" }} /> Cost Distribution Curves
          </div>
          {isChartOpen ? <FaChevronUp size={12} color="#64748b" /> : <FaChevronDown size={12} color="#64748b" />}
        </div>
        {isChartOpen && (
          <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 16 }}>
              {result.cost_rows.map((row, i) => {
                const isSelected = selectedChartCosts.includes(row.cost_name);
                const color = colors[i % colors.length];
                return (
                  <label key={row.cost_code} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", cursor: "pointer", background: isSelected ? `${color}15` : "#f8fafc", border: `1px solid ${isSelected ? color : "#e2e8f0"}`, padding: "4px 8px", borderRadius: 6, transition: "all 0.2s" }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleChartCost(row.cost_name)}
                      style={{ accentColor: color, cursor: "pointer", margin: 0 }}
                    />
                    {row.cost_name}
                  </label>
                );
              })}
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", fontSize: 12 }}
                    itemStyle={{ fontSize: 12, fontWeight: 500 }}
                  />
                  {result.cost_rows.map((row, i) => {
                    if (!selectedChartCosts.includes(row.cost_name)) return null;
                    return (
                      <Line 
                        key={row.cost_code} 
                        type="monotone" 
                        dataKey={row.cost_name} 
                        stroke={colors[i % colors.length]} 
                        strokeWidth={2} 
                        dot={{ r: 3, strokeWidth: 1 }}
                        activeDot={{ r: 5 }} 
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {!editMode ? (
          <button style={styles.btnSecondary} onClick={() => setEditMode(true)}>
            <FaEdit size={12} style={{ marginRight: 5 }} /> Edit Distribution
          </button>
        ) : (
          <>
            <button style={allRowsValid ? styles.btnSuccess : styles.btnDisabled} disabled={!allRowsValid} onClick={onSaveDistribution}>
              <FaSave size={12} style={{ marginRight: 5 }} /> Save Distribution
            </button>
            <button style={styles.btnSecondary} onClick={() => { setEditMode(false); }}>
              <FaUndo size={12} style={{ marginRight: 5 }} /> Cancel
            </button>
          </>
        )}
        <button style={styles.btnSecondary} onClick={onReSimulate}>
          Re-Simulate
        </button>
        <button
          style={allRowsValid ? { ...styles.btnPrimary, background: "linear-gradient(135deg, #10b981, #059669)" } : styles.btnDisabled}
          disabled={!allRowsValid}
          onClick={onApply}
        >
          ✅ Apply to IRR
        </button>
      </div>
    </div>
  );
};

// ─── Small reusable bits ──────────────────────────────────────────────────────
const SectionCard = ({ title, headerRight, children }) => (
  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </div>
      {headerRight && <div>{headerRight}</div>}
    </div>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", marginBottom: 8 }}>
    <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{value}</span>
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)",
    backdropFilter: "blur(4px)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    background: "#f8fafc", borderRadius: 16, width: "100%", maxWidth: 880,
    maxHeight: "92vh", display: "flex", flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden",
  },
  header: {
    background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 20px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexShrink: 0,
  },
  stepper: {
    display: "flex", alignItems: "flex-start", padding: "16px 24px",
    background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
  },
  content: {
    flex: 1, overflowY: "auto", padding: "16px 20px",
  },
  footer: {
    background: "#fff", borderTop: "1px solid #e2e8f0", padding: "12px 20px",
    display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16,
    padding: 4,
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff",
    border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
  },
  btnSecondary: {
    background: "#fff", color: "#334155", border: "1px solid #e2e8f0",
    borderRadius: 10, padding: "8px 18px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
  },
  btnSuccess: {
    background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
    border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
  },
  btnDisabled: {
    background: "#e2e8f0", color: "#94a3b8", border: "none",
    borderRadius: 10, padding: "8px 18px", fontSize: 13,
    fontWeight: 600, cursor: "not-allowed", display: "flex", alignItems: "center",
  },
  badge: (bg, text) => ({
    background: bg, color: text, fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 20,
  }),
  twoCol: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px",
  },
  table: {
    width: "100%", borderCollapse: "collapse", fontSize: 12,
  },
  th: {
    background: "#f1f5f9", color: "#475569", fontWeight: 700,
    textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em",
    padding: "8px 12px", borderBottom: "1px solid #e2e8f0", textAlign: "left",
  },
  td: {
    padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155",
  },
  tdR: {
    padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155",
    textAlign: "right",
  },
  tdC: {
    padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#334155",
    textAlign: "center",
  },
};

const modalCss = `
  .co-step-body { animation: co-fadein 0.2s ease; }
  @keyframes co-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .co-spin { animation: co-rotate 1s linear infinite; }
  @keyframes co-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

export default CostOutflowSimulationModal;
