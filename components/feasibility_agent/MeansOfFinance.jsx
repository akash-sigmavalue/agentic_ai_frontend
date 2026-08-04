import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaInfoCircle } from "react-icons/fa";

const FIXED_FINANCE_ROWS = [
  {
    key: "promoterEquityUnsecuredLoan",
    label: "Promoter Equity and Unsecured Loan",
    isCustom: false,
  },
  {
    key: "bankFinance",
    label: "Bank Finance",
    isCustom: false,
  },
  {
    key: "salesCollection",
    label: "Sales Collection",
    isCustom: false,
  },
];

const COST_KEYS = [
  "landCost",
  "approvalCost",
  "constructionCost",
  "administrativeCost",
  "ancillaryCost",
  "tdrCost",
  "premiumCost",
  "marketingCost",
  "contingencyCost",
  "financeCost",
  "miscellaneousCost",
];

const MeansOfFinance = () => {
  const [formData, setFormData] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [savedData, setSavedData] = useState(null);
  const [savedValuesData, setSavedValuesData] = useState(null);
  const [costTotals, setCostTotals] = useState({ permissible: 0, proposed: 0 });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDesc, setNewFieldDesc] = useState("");

  useEffect(() => {
    // Load Custom Fields
    let loadedCustom = [];
    const savedCustom = localStorage.getItem("meansOfFinanceCustomFields");
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          loadedCustom = parsed;
          setCustomFields(loadedCustom);
        }
      } catch (e) {}
    }

    // Load Percentage Data
    const saved = localStorage.getItem("meansOfFinanceData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed || {});
        setSavedData(parsed || {});
      } catch (err) {
        setSavedData(null);
      }
    }

    // Load Means of Finance Calculated Values
    const savedValues = localStorage.getItem("meansOfFinanceValues");
    if (savedValues) {
      try {
        setSavedValuesData(JSON.parse(savedValues));
      } catch (err) {
        setSavedValuesData(null);
      }
    }
  }, []);

  useEffect(() => {
    const loadCostTotals = () => {
      const saved = localStorage.getItem("calculatedCostValues");
      if (!saved) {
        setCostTotals({ permissible: 0, proposed: 0 });
        return;
      }

      try {
        const parsed = JSON.parse(saved);
        setCostTotals({
          permissible: getTotalProjectCost(parsed.permissible),
          proposed: getTotalProjectCost(parsed.proposed),
        });
      } catch (err) {
        setCostTotals({ permissible: 0, proposed: 0 });
      }
    };

    const handleCostUpdate = () => {
      setTimeout(loadCostTotals, 100);
    };

    loadCostTotals();
    window.addEventListener("costFormUpdated", handleCostUpdate);
    window.addEventListener("storage", loadCostTotals);

    return () => {
      window.removeEventListener("costFormUpdated", handleCostUpdate);
      window.removeEventListener("storage", loadCostTotals);
    };
  }, []);

  const getTotalProjectCost = (costData = {}) =>
    COST_KEYS.reduce((total, key) => total + (parseFloat(costData?.[key]) || 0), 0);

  const allRows = [
    ...FIXED_FINANCE_ROWS,
    ...customFields.map((f) => ({
      key: f.key,
      label: f.name,
      description: f.description,
      isCustom: true,
      id: f.id,
    })),
  ];

  const getTotal = (values = formData) =>
    allRows.reduce(
      (total, row) => total + (parseFloat(values[row.key]) || 0),
      0
    );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
    if (successMsg) setSuccessMsg("");
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.round(parseFloat(value) || 0)
    );

  const getFinanceValue = (percentage, totalCost) =>
    ((parseFloat(percentage) || 0) / 100) * (parseFloat(totalCost) || 0);

  const buildMeansOfFinanceValues = (values = formData, totals = costTotals) => ({
    percentages: values,
    totalPercentage: getTotal(values),
    totalCostOfProject: {
      permissible: parseFloat(totals.permissible) || 0,
      proposed: parseFloat(totals.proposed) || 0,
    },
    rows: allRows.map((row) => ({
      key: row.key,
      label: row.label,
      description: row.description || "",
      isCustom: !!row.isCustom,
      percentage: parseFloat(values[row.key]) || 0,
      permissible: getFinanceValue(values[row.key], totals.permissible),
      proposed: getFinanceValue(values[row.key], totals.proposed),
    })),
  });

  const handleSave = () => {
    const total = getTotal();

    if (Math.abs(total - 100) > 0.001) {
      setError(
        `Means of Finance total must be 100%. Current total is ${total.toFixed(2)}%.`
      );
      setSuccessMsg("");
      return;
    }

    const valuesData = buildMeansOfFinanceValues(formData, costTotals);

    localStorage.setItem(
      "meansOfFinanceCustomFields",
      JSON.stringify(customFields)
    );
    localStorage.setItem("meansOfFinanceData", JSON.stringify(formData));
    localStorage.setItem("meansOfFinanceValues", JSON.stringify(valuesData));

    setSavedData(formData);
    setSavedValuesData(valuesData);
    setError("");
    setSuccessMsg("Means of Finance saved successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);

    window.dispatchEvent(new CustomEvent("meansOfFinanceUpdated"));
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      alert("Field Name is required");
      return;
    }
    if (customFields.length >= 10) {
      alert("Maximum of 10 custom fields allowed.");
      return;
    }

    const fieldId = `custom_${Date.now()}`;
    const newField = {
      id: fieldId,
      key: fieldId,
      name: newFieldName.trim(),
      description: newFieldDesc.trim(),
    };

    const updatedCustom = [...customFields, newField];
    setCustomFields(updatedCustom);
    localStorage.setItem(
      "meansOfFinanceCustomFields",
      JSON.stringify(updatedCustom)
    );

    setNewFieldName("");
    setNewFieldDesc("");
    setIsModalOpen(false);
  };

  const handleDeleteCustomField = (id, key) => {
    const updatedCustom = customFields.filter((f) => f.id !== id);
    setCustomFields(updatedCustom);
    localStorage.setItem(
      "meansOfFinanceCustomFields",
      JSON.stringify(updatedCustom)
    );

    const updatedFormData = { ...formData };
    delete updatedFormData[key];
    setFormData(updatedFormData);
    localStorage.setItem("meansOfFinanceData", JSON.stringify(updatedFormData));
  };

  const totalPercentage = getTotal();
  const isTotal100 = Math.abs(totalPercentage - 100) < 0.001;

  return (
    <div className="means-finance-shell mt-1 fade-in-up">
      <style>{`
        .means-finance-shell {
          position: relative;
        }

        .mean-finance-panel {
          border: 1px solid #e6ebf2;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .mean-finance-panel-header {
          padding: 22px 28px;
          border-bottom: 1px solid #e6ebf2;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .mean-finance-panel-eyebrow {
          color: #868e96;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .mean-finance-panel-title {
          color: #111827;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          margin: 0;
        }

        .btn-dark-pill {
          background-color: #1a1c23;
          color: #fff;
          border-radius: 24px !important;
          padding: 10px 22px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .btn-dark-pill:hover:not(:disabled) {
          background-color: #2c2e31;
          color: #fff;
          transform: translateY(-1px);
        }

        .btn-dark-pill:disabled {
          background-color: #868e96;
          cursor: not-allowed;
        }

        .mean-finance-panel-body {
          padding: 24px 28px 28px;
          background: #ffffff;
        }

        /* Two Section / Column Headers */
        .parts-header-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 1fr 1fr;
          gap: 16px;
          padding: 10px 16px;
          background: #f1f5f9;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mean-finance-item-card {
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.02);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .mean-finance-item-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
        }

        .item-card-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 1fr 1fr;
          gap: 16px;
          align-items: center;
        }

        .mean-finance-label-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mean-finance-label {
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 0;
        }

        .mean-finance-input-wrap {
          position: relative;
        }

        .mean-finance-input {
          min-height: 44px;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          color: #111827;
          font-weight: 600;
          font-size: 14px;
          padding-right: 36px;
          padding-left: 14px;
          background: #ffffff;
          transition: all 0.2s;
        }

        .mean-finance-input:focus {
          border-color: #3f967b;
          box-shadow: 0 0 0 3px rgba(63, 150, 123, 0.12);
          outline: none;
        }

        .mean-finance-percent {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          font-size: 14px;
          font-weight: 800;
          pointer-events: none;
        }

        .amount-display-box {
          min-height: 44px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }

        .amount-currency-tag {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        /* Summary Total Bar */
        .mean-finance-total-bar {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) 1fr 1fr;
          gap: 16px;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: #f8fafc;
          padding: 16px;
          margin-top: 20px;
        }

        .total-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .total-percent-badge {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          border: 1px solid;
          min-height: 44px;
        }

        .total-percent-badge.is-valid {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #047857;
        }

        .total-percent-badge.is-invalid {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
        }

        .total-amount-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: #eaf5f1;
          border: 1px solid #d4ebe2;
          color: #111827;
          font-size: 14px;
          font-weight: 800;
          min-height: 44px;
        }

        .mean-finance-error {
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fff1f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 700;
          padding: 12px 16px;
          margin-top: 16px;
        }

        .mean-finance-success {
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          background: #ecfdf5;
          color: #047857;
          font-size: 13px;
          font-weight: 700;
          padding: 12px 16px;
          margin-top: 16px;
        }

        .mean-finance-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }

        .mean-finance-btn {
          border: 0;
          border-radius: 999px;
          min-height: 44px;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 20px;
          transition: all 0.2s ease;
        }

        .mean-finance-btn-save {
          background: #3f967b;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(63, 150, 123, 0.18);
        }

        .mean-finance-btn-save:hover {
          background: #337a64;
          box-shadow: 0 12px 24px rgba(63, 150, 123, 0.25);
        }

        .mean-finance-btn-update {
          background: #eef2f7;
          color: #334155;
        }

        .mean-finance-btn-update:hover {
          background: #e2e8f0;
          color: #0f172a;
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
          max-width: 220px;
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
          padding: 26px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: scaleIn 0.2s ease-out;
        }

        .pill-modal-input {
          border-radius: 12px;
          border: 1px solid #dee2e6;
          padding: 10px 16px;
          font-size: 14px;
          background-color: #fff;
          width: 100%;
          transition: border-color 0.2s;
        }

        .pill-modal-input:focus {
          outline: none;
          border-color: #3f967b;
          box-shadow: 0 0 0 3px rgba(63, 150, 123, 0.12);
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 768px) {
          .mean-finance-panel-header,
          .mean-finance-panel-body {
            padding-left: 18px;
            padding-right: 18px;
          }

          .parts-header-grid {
            display: none;
          }

          .item-card-grid,
          .mean-finance-total-bar {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>

      <div className="mean-finance-panel">
        <div className="mean-finance-panel-header">
          <div>
            <div className="mean-finance-panel-eyebrow">Selected Section</div>
            <h1 className="mean-finance-panel-title">Means Of Finance</h1>
          </div>
          <button
            type="button"
            className="btn-dark-pill"
            onClick={() => {
              if (customFields.length < 10) setIsModalOpen(true);
            }}
            disabled={customFields.length >= 10}
          >
            <FaPlus />
            {customFields.length >= 10 ? "Max 10 Fields Reached" : "Add Custom Field"}
          </button>
        </div>

        <div className="mean-finance-panel-body">
          {/* Section Dividers / Column Headers */}
          <div className="parts-header-grid">
            <span>Means of Finance Source</span>
            <span>Part 1: Percentage (%)</span>
            <span>Part 2: Amount (₹)</span>
          </div>

          <div className="d-grid gap-3">
            {allRows.map((row) => {
              const percVal = formData[row.key] ?? "";
              const calculatedAmount = getFinanceValue(
                percVal,
                costTotals.proposed
              );

              return (
                <div className="mean-finance-item-card" key={row.key}>
                  <div className="item-card-grid">
                    {/* Item Name / Source */}
                    <div className="mean-finance-label-group">
                      <label className="mean-finance-label">{row.label}</label>
                      {row.description && (
                        <div className="tooltip-custom" style={{ cursor: "help" }}>
                          <FaInfoCircle
                            className="text-primary opacity-75"
                            size={14}
                          />
                          <span className="tooltip-text">{row.description}</span>
                        </div>
                      )}
                      {row.isCustom && (
                        <button
                          type="button"
                          className="btn btn-sm text-danger p-0 border-0 ms-auto me-2 hover-opacity"
                          onClick={() => handleDeleteCustomField(row.id, row.key)}
                          title="Delete this field"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>

                    {/* Part 1: Percentage (%) */}
                    <div className="mean-finance-input-wrap">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="form-control mean-finance-input"
                        value={percVal}
                        onChange={(event) =>
                          handleInputChange(row.key, event.target.value)
                        }
                        placeholder="Enter percentage"
                      />
                      <span className="mean-finance-percent">%</span>
                    </div>

                    {/* Part 2: Amount (₹) */}
                    <div className="amount-display-box">
                      <span className="amount-currency-tag">₹</span>
                      <span>{formatNumber(calculatedAmount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Unified Total Bar */}
            <div className="mean-finance-total-bar">
              <div className="total-title">Total</div>
              <div
                className={`total-percent-badge ${
                  isTotal100 ? "is-valid" : "is-invalid"
                }`}
              >
                <span>Total Percentage</span>
                <span>{totalPercentage.toFixed(2)}%</span>
              </div>
              <div className="total-amount-badge">
                <span className="amount-currency-tag">Total Proposed</span>
                <span>₹ {formatNumber(costTotals.proposed)}</span>
              </div>
            </div>

            {error && <div className="mean-finance-error">{error}</div>}
            {successMsg && <div className="mean-finance-success">{successMsg}</div>}

            <div className="mean-finance-actions">
              <button
                type="button"
                className="mean-finance-btn mean-finance-btn-save"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                type="button"
                className="mean-finance-btn mean-finance-btn-update"
                onClick={handleSave}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Field Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay-custom">
          <div className="modal-content-custom">
            <h5 className="fw-bold mb-3">Add Custom Field</h5>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">
                Field Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="pill-modal-input"
                placeholder="e.g. Mezzanine Debt / Investor Equity"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="form-label small fw-semibold text-muted">
                Field Description (Optional)
              </label>
              <textarea
                className="pill-modal-input"
                style={{ minHeight: "80px" }}
                placeholder="Briefly describe this funding source..."
                rows="2"
                value={newFieldDesc}
                onChange={(e) => setNewFieldDesc(e.target.value)}
              ></textarea>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
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
                type="button"
                className="btn-dark-pill px-4"
                onClick={handleAddCustomField}
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

export default MeansOfFinance;
