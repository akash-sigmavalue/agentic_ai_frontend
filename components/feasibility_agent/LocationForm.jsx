import { useState, useEffect } from "react";
import { FaTable, FaBrain, FaExclamationTriangle } from "react-icons/fa";

const RevenueForm = ({ onSave }) => {
  const [revenueMethod, setRevenueMethod] = useState("bayesian"); // 'basic' or 'bayesian'
  const [expectedRevenueData, setExpectedRevenueData] = useState(null);
  const [landFormData, setLandFormData] = useState(null);

  useEffect(() => {
    // Load saved method selection
    const saved = localStorage.getItem("revenueForm");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.revenueMethod) {
        setRevenueMethod(parsed.revenueMethod);
      }
    }

    const savedLandForm = localStorage.getItem("landDetailsForm");
    if (savedLandForm) {
      setLandFormData(JSON.parse(savedLandForm));
    }

    const savedExpectedRevenue = localStorage.getItem("expectedRevenueData");
    if (savedExpectedRevenue) {
      setExpectedRevenueData(JSON.parse(savedExpectedRevenue));
    }
  }, []);

  useEffect(() => {
    const handleLandUpdate = () => {
      const savedLandForm = localStorage.getItem("landDetailsForm");
      if (savedLandForm) setLandFormData(JSON.parse(savedLandForm));
    };
    const handleRevenueUpdate = () => {
      const saved = localStorage.getItem("expectedRevenueData");
      if (saved) setExpectedRevenueData(JSON.parse(saved));
    };

    window.addEventListener("landDetailsUpdated", handleLandUpdate);
    window.addEventListener("expectedRevenueSaved", handleRevenueUpdate);
    return () => {
      window.removeEventListener("landDetailsUpdated", handleLandUpdate);
      window.removeEventListener("expectedRevenueSaved", handleRevenueUpdate);
    };
  }, []);

  const getPreviewRevenue = () => {
    if (!expectedRevenueData) return null;
    if (revenueMethod === "bayesian") {
      return expectedRevenueData?.bayesianOpt?.total;
    } else {
      return expectedRevenueData?.excelLogic?.total;
    }
  };

  const handleSave = () => {
    const selectedRevenue = getPreviewRevenue();
    const enhanced = {
      revenueMethod,
      selectedRevenue: selectedRevenue || 0,
    };

    localStorage.setItem("revenueForm", JSON.stringify(enhanced));
    onSave(enhanced);

    window.dispatchEvent(new CustomEvent("revenueFormUpdated"));
    window.dispatchEvent(new CustomEvent("costFormUpdated"));

    alert("Revenue selection saved successfully.");
  };

  const formatNum = (v) =>
    v != null ? `₹ ${Number(v).toLocaleString("en-IN")}` : "—";

  const basicTotal = expectedRevenueData?.excelLogic?.total;
  const bayesTotal = expectedRevenueData?.bayesianOpt?.total;

  return (
    <div className="nr-selected-panel h-100">
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
        .nr-selected-panel .btn {
          min-height: 40px;
          border-radius: 999px;
          font-weight: 800;
        }
      `}</style>
      <div className="nr-selected-header">
        <div className="nr-selected-eyebrow">Selected Section</div>
        <h1 className="nr-selected-title">
          Revenue (On Saleable )
        </h1>
      </div>
      <div className="nr-selected-body">
        <div className="row g-3">
          {/* Select the Revenue toggle */}
          <div className="col-12">
            <label className="form-label fw-bold text-uppercase small text-muted mb-3" style={{ letterSpacing: "0.5px" }}>
              Select the Revenue
            </label>
            <div className="d-flex gap-3">
              {/* Basic Logic Button */}
              <button
                type="button"
                onClick={() => setRevenueMethod("basic")}
                className={`btn flex-fill rounded-pill fw-bold py-3 ${revenueMethod === "basic"
                  ? "btn-primary shadow"
                  : "btn-outline-secondary"
                  }`}
                style={{ transition: "all 0.2s ease" }}
              >
                <FaTable className={`me-2 ${revenueMethod === "basic" ? "text-white" : "text-muted"}`} />
                Basic Logic
                {basicTotal != null && (
                  <div
                    className={`small mt-1 fw-normal ${revenueMethod === "basic" ? "text-white-50" : "text-muted"}`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {formatNum(basicTotal)}
                  </div>
                )}
              </button>

              {/* Bayesian Opt Button */}
              <button
                type="button"
                onClick={() => setRevenueMethod("bayesian")}
                className={`btn flex-fill rounded-pill fw-bold py-3 ${revenueMethod === "bayesian"
                  ? "btn-success shadow"
                  : "btn-outline-secondary"
                  }`}
                style={{ transition: "all 0.2s ease" }}
              >
                <FaBrain className={`me-2 ${revenueMethod === "bayesian" ? "text-white" : "text-muted"}`} />
                Bayesian Opt
                {bayesTotal != null && (
                  <div
                    className={`small mt-1 fw-normal ${revenueMethod === "bayesian" ? "text-white-50" : "text-muted"}`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {formatNum(bayesTotal)}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Preview of selected revenue */}
          {getPreviewRevenue() != null && (
            <div className="col-12">
              <div className={`alert ${revenueMethod === "bayesian" ? "alert-success" : "alert-primary"} rounded-3 py-3 mb-0`}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="small fw-bold text-uppercase" style={{ letterSpacing: "0.5px", opacity: 0.75 }}>
                      Selected Revenue ({revenueMethod === "bayesian" ? "Bayesian Opt" : "Basic Logic"})
                    </div>
                    <div className="fs-5 fw-bold mt-1">
                      {formatNum(getPreviewRevenue())}
                    </div>
                  </div>
                  {revenueMethod === "bayesian" ? (
                    <FaBrain className="fa-2x opacity-50" />
                  ) : (
                    <FaTable className="fa-2x opacity-50" />
                  )}
                </div>
              </div>
            </div>
          )}

          {!expectedRevenueData && (
            <div className="col-12">
              <div className="alert alert-warning rounded-3 small py-2">
                <FaExclamationTriangle className="me-2" />
                No Expected Revenue data available yet. Please run a simulation first.
              </div>
            </div>
          )}

          {/* Save / Update buttons */}
          <div className="col-12 pt-3">
            <div className="row g-3">
              <div className="col-6">
                <button onClick={handleSave} className="btn btn-primary w-100">
                  Save
                </button>
              </div>
              <div className="col-6">
                <button onClick={handleSave} className="btn btn-secondary w-100">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueForm;
