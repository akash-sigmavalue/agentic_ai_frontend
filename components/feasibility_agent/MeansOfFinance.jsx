import { useEffect, useState } from "react";

const FINANCE_ROWS = [
  {
    key: "promoterEquityUnsecuredLoan",
    label: "Promoter Equity and Unsecured Loan",
  },
  {
    key: "bankFinance",
    label: "Bank Finance",
  },
  {
    key: "salesCollection",
    label: "Sales Collection",
  },
];

const EMPTY_FINANCE_DATA = {
  promoterEquityUnsecuredLoan: "",
  bankFinance: "",
  salesCollection: "",
};

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
  const [formData, setFormData] = useState(EMPTY_FINANCE_DATA);
  const [savedData, setSavedData] = useState(null);
  const [savedValuesData, setSavedValuesData] = useState(null);
  const [costTotals, setCostTotals] = useState({ permissible: 0, proposed: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("meansOfFinanceData");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const normalized = {
        promoterEquityUnsecuredLoan: parsed.promoterEquityUnsecuredLoan || "",
        bankFinance: parsed.bankFinance || "",
        salesCollection: parsed.salesCollection || "",
      };
      setFormData(normalized);
      setSavedData(normalized);
    } catch (err) {
      setSavedData(null);
    }

    const savedValues = localStorage.getItem("meansOfFinanceValues");
    if (!savedValues) return;

    try {
      setSavedValuesData(JSON.parse(savedValues));
    } catch (err) {
      setSavedValuesData(null);
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

  const getTotal = (values = formData) =>
    (parseFloat(values.promoterEquityUnsecuredLoan) || 0) +
    (parseFloat(values.bankFinance) || 0) +
    (parseFloat(values.salesCollection) || 0);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) {
      setError("");
    }
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
    rows: FINANCE_ROWS.map((row) => ({
      key: row.key,
      label: row.label,
      percentage: parseFloat(values[row.key]) || 0,
      permissible: getFinanceValue(values[row.key], totals.permissible),
      proposed: getFinanceValue(values[row.key], totals.proposed),
    })),
  });

  const hasCostTotals = costTotals.permissible > 0 || costTotals.proposed > 0;
  const displayValues =
    savedData && hasCostTotals
      ? buildMeansOfFinanceValues(savedData, costTotals)
      : savedValuesData;

  const handleSave = () => {
    const total = getTotal();

    if (Math.abs(total - 100) > 0.001) {
      setError(`Means of Finance total must be 100%. Current total is ${total.toFixed(2)}%.`);
      return;
    }

    const valuesData = buildMeansOfFinanceValues(formData, costTotals);

    localStorage.setItem("meansOfFinanceData", JSON.stringify(formData));
    localStorage.setItem("meansOfFinanceValues", JSON.stringify(valuesData));
    setSavedData(formData);
    setSavedValuesData(valuesData);
    setError("");
    window.dispatchEvent(new CustomEvent("meansOfFinanceUpdated"));
  };

  return (
    <div className="means-finance-shell mt-1">
      <style>{`
        .means-finance-shell {
          position: relative;
        }

        .mean-finance-panel {
          border: 1px solid #e6ebf2;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .mean-finance-panel-header {
          padding: 22px 26px 14px;
          border-bottom: 1px solid #e6ebf2;
          background: #f7f9fc;
        }

        .mean-finance-panel-eyebrow {
          color: #768396;
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

        .mean-finance-panel-body {
          padding: 20px 22px 22px;
          background: #ffffff;
          min-height: 280px;
        }

        .mean-finance-field {
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
        }

        .mean-finance-label {
          color: #3f4a5a;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .mean-finance-input-wrap {
          position: relative;
        }

        .mean-finance-input {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid #dfe5ee;
          color: #111827;
          font-weight: 600;
          padding-right: 36px;
        }

        .mean-finance-percent {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          font-size: 13px;
          font-weight: 800;
          pointer-events: none;
        }

        .mean-finance-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f7f9fc;
          padding: 12px 14px;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
        }

        .mean-finance-error {
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fff1f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 12px;
        }

        .mean-finance-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .mean-finance-btn {
          border: 0;
          border-radius: 999px;
          min-height: 42px;
          font-size: 13px;
          font-weight: 800;
          padding: 10px 16px;
        }

        .mean-finance-btn-save {
          background: #3f967b;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(63, 150, 123, 0.18);
        }

        .mean-finance-btn-update {
          background: #eef2f7;
          color: #334155;
        }

        .mean-finance-values-list {
          display: grid;
          gap: 10px;
        }

        .mean-finance-value-row {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(92px, 0.8fr);
          align-items: center;
          gap: 12px;
          border: 1px solid #e5eaf2;
          border-radius: 14px;
          background: #fbfcff;
          padding: 12px 14px;
        }

        .mean-finance-value-label {
          color: #3f4a5a;
          font-size: 13px;
          font-weight: 800;
        }

        .mean-finance-value {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
          text-align: right;
        }

        .mean-finance-value-header {
          background: #f4f7fb;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 11px;
        }

        .mean-finance-value-total {
          background: #eaf5f1;
          border-color: #d4ebe2;
        }

        .mean-finance-panel-placeholder {
          min-height: 160px;
          display: grid;
          place-items: center;
          border: 1px dashed #d8e0ea;
          border-radius: 14px;
          background: #fbfcff;
          color: #7b8796;
          font-weight: 600;
          text-align: center;
          padding: 16px;
        }

        @media (max-width: 576px) {
          .mean-finance-panel-header,
          .mean-finance-panel-body {
            padding-left: 16px;
            padding-right: 16px;
          }

          .mean-finance-panel-title {
            font-size: 24px;
          }

          .mean-finance-actions {
            grid-template-columns: 1fr;
          }

          .mean-finance-value-row {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .mean-finance-value {
            text-align: left;
          }
        }
      `}</style>

      <div className="row g-4">
        <div className="col-lg-8">
        <div className="mean-finance-panel h-100">
          <div className="mean-finance-panel-header">
            <div className="mean-finance-panel-eyebrow">Selected Section</div>
            <h1 className="mean-finance-panel-title">Means Of Finance</h1>
          </div>
          <div className="mean-finance-panel-body">
            <div className="d-grid gap-3">
              {FINANCE_ROWS.map((row) => (
                <div className="mean-finance-field" key={row.key}>
                  <label className="mean-finance-label">{row.label}</label>
                  <div className="mean-finance-input-wrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="form-control mean-finance-input"
                      value={formData[row.key]}
                      onChange={(event) => handleInputChange(row.key, event.target.value)}
                      placeholder="Enter percentage"
                    />
                    <span className="mean-finance-percent">%</span>
                  </div>
                </div>
              ))}

              <div className="mean-finance-total">
                <span>Total</span>
                <span>{getTotal().toFixed(2)}%</span>
              </div>

              {error && <div className="mean-finance-error">{error}</div>}

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
      </div>

        <div className="col-lg-4">
            <div className="mean-finance-panel h-100">
              <div className="mean-finance-panel-header">
                <div className="mean-finance-panel-eyebrow">Selected Section</div>
                <h1 className="mean-finance-panel-title">Means of Finance Values</h1>
              </div>
              <div className="mean-finance-panel-body">
                {savedData && displayValues ? (
                  <div className="mean-finance-values-list">
                    <div className="mean-finance-value-row mean-finance-value-header">
                      <span>Source</span>
                      <span className="text-end">Proposed</span>
                    </div>
                    {displayValues.rows.map((row) => (
                      <div className="mean-finance-value-row" key={row.key}>
                        <span className="mean-finance-value-label">{row.label}</span>
                        <span className="mean-finance-value">
                          Rs {formatNumber(row.proposed)}
                        </span>
                      </div>
                    ))}
                    <div className="mean-finance-value-row mean-finance-value-total">
                      <span className="mean-finance-value-label">Total Cost of Project</span>
                      <span className="mean-finance-value">
                        Rs {formatNumber(displayValues.totalCostOfProject.proposed)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mean-finance-panel-placeholder">
                    {savedData
                      ? "Save Cost Details to calculate Means of Finance values."
                      : "No means of finance values saved."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default MeansOfFinance;
