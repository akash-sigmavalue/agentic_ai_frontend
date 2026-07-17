import { useEffect, useState } from "react";
import { FaCopy, FaTimes } from "react-icons/fa";

const formatTokenCount = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const CashflowSimulationModal = ({
  isOpen,
  onClose,
  isLoading,
  result,
  error,
  inputPayload,
  tokenLedger,
}) => {
  const [copyStatus, setCopyStatus] = useState("");
  const [activeTab, setActiveTab] = useState("output");

  useEffect(() => {
    if (!isOpen) {
      setCopyStatus("");
      setActiveTab("output");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const outputJson =
    result != null
      ? JSON.stringify(result, null, 2)
      : error || "No output available.";

  const inputJson = inputPayload
    ? JSON.stringify(inputPayload, null, 2)
    : "No metric list input captured.";

  const displayJson = activeTab === "input" ? inputJson : outputJson;
  const canCopy = activeTab === "output" ? result : inputPayload;

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(canCopy, null, 2)
      );
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1500);
    } catch (err) {
      console.error("Failed to copy JSON", err);
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cashflow-simulation-modal-title"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-0 pb-0">
            <h5
              id="cashflow-simulation-modal-title"
              className="modal-title fw-bold text-dark"
            >
              Cashflow Simulation
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={isLoading}
            />
          </div>
          <div className="modal-body pt-3">
            {isLoading ? (
              <div className="text-center py-5 text-secondary">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mb-0 fw-medium">Running cashflow simulation…</p>
              </div>
            ) : (
              <>
                <div
                  className="rounded-3 border mb-3 overflow-hidden"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <div
                    className="px-3 py-2 fw-bold text-dark"
                    style={{
                      backgroundColor: "#f1f5f9",
                      fontSize: "12px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Token Ledger (this LLM call)
                  </div>
                  <div className="p-3 bg-white">
                    {tokenLedger ? (
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr>
                            <td className="text-secondary">Model</td>
                            <td className="text-end fw-semibold text-dark">
                              {tokenLedger.model || "gpt-4o-mini"}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-secondary">Prompt tokens</td>
                            <td className="text-end fw-semibold text-dark">
                              {formatTokenCount(tokenLedger.promptTokens)}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-secondary">Completion tokens</td>
                            <td className="text-end fw-semibold text-dark">
                              {formatTokenCount(tokenLedger.completionTokens)}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-secondary fw-bold">Total tokens</td>
                            <td className="text-end fw-bold text-primary">
                              {formatTokenCount(tokenLedger.totalTokens)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p className="mb-0 text-muted small">
                        Token usage is not available for this run.
                      </p>
                    )}
                  </div>
                </div>

                <ul className="nav nav-tabs mb-2 border-0">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "output" ? "active fw-semibold" : ""}`}
                      onClick={() => setActiveTab("output")}
                    >
                      Simulation Output
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "input" ? "active fw-semibold" : ""}`}
                      onClick={() => setActiveTab("input")}
                    >
                      Metric List Input
                    </button>
                  </li>
                </ul>

                <pre
                  className="mb-0 p-3 rounded-3"
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    maxHeight: "45vh",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color:
                      activeTab === "output" && error ? "#b91c1c" : "#0f172a",
                  }}
                >
                  {displayJson}
                </pre>
              </>
            )}
          </div>
          <div className="modal-footer border-0 pt-0">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              <FaTimes className="me-1" />
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCopy}
              disabled={isLoading || !canCopy}
            >
              <FaCopy className="me-1" />
              {copyStatus || "Copy JSON"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashflowSimulationModal;
