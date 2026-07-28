import { useState, useEffect } from "react";
import { FaUserTag, FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';

const InvestorIRRInput = ({ totalYears, investorData, onDataChange }) => {
  const [localData, setLocalData] = useState(investorData);

  useEffect(() => {
    setLocalData(investorData);
  }, [investorData]);

  const handleInputChange = (field, value) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onDataChange(newData);
  };

  const handleExitTypeChange = (exitType) => {
    const newData = {
      ...localData,
      exitType,
      // Reset fixed payout if not "Fixed payout"
      fixedPayout: exitType === "Fixed payout" ? localData.fixedPayout : 0
    };
    setLocalData(newData);
    onDataChange(newData);
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift">
      <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
        <h5 className="fw-bold text-dark mb-3">
          <div className="d-flex align-items-center">
            <div className="bg-success bg-opacity-10 text-success rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <FaUserTag className="fs-5" />
            </div>
            Investor IRR Input
          </div>
        </h5>
      </div>
      <div className="card-body p-4">
        <div className="row g-4">
          <div className="col-md-6 border-end border-light">
            <div className="mb-4">
              <label className="form-label fw-bold small text-uppercase text-secondary ls-1 text-dark">Investment Amount (₹)</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0"><i className="fa-solid fa-indian-rupee-sign"></i></span>
                <input
                  type="number"
                  className="form-control bg-light border-0 fw-semibold"
                  value={localData.investmentAmount}
                  onChange={(e) => handleInputChange('investmentAmount', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-6">
                <div className="mb-3">
                  <label className="form-label fw-bold small text-uppercase text-secondary ls-1 text-dark">Entry Year</label>
                  <select
                    className="form-select bg-light border-0 fw-medium"
                    value={localData.entryYear}
                    onChange={(e) => handleInputChange('entryYear', parseInt(e.target.value) || 0)}
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: totalYears + 1 }, (_, i) => (
                      <option key={i} value={i}>Year {i}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-6">
                <div className="mb-3">
                  <label className="form-label fw-bold small text-uppercase text-secondary ls-1 text-dark">Exit Year</label>
                  <select
                    className="form-select bg-light border-0 fw-medium"
                    value={localData.exitYear}
                    onChange={(e) => handleInputChange('exitYear', parseInt(e.target.value) || 0)}
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: totalYears + 1 }, (_, i) => (
                      <option key={i} value={i}>Year {i}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 ps-md-4">
            <div className="mb-4">
              <label className="form-label fw-bold small text-uppercase text-secondary ls-1 mb-3 text-dark">Exit Strategy Configuration</label>

              <div className="d-flex flex-column gap-3">
                <div className={`p-3 rounded-3 border transition-all ${localData.exitType === "Fixed payout" ? "border-primary bg-primary bg-opacity-10" : "border-light bg-light"}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleExitTypeChange("Fixed payout")}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exitType"
                      id="fixedPayout"
                      value="Fixed payout"
                      checked={localData.exitType === "Fixed payout"}
                      onChange={(e) => handleExitTypeChange(e.target.value)}
                    />
                    <label className="form-check-label fw-semibold text-dark w-100" htmlFor="fixedPayout">
                      Fixed Payout
                    </label>
                  </div>
                  {localData.exitType === "Fixed payout" && (
                    <div className="mt-3 ps-4 fade-in-up">
                      <label className="form-label small text-secondary">Payout Amount (₹)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm bg-white border-0 shadow-sm"
                        value={localData.fixedPayout}
                        onChange={(e) => handleInputChange('fixedPayout', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="Enter fixed amount"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>

                <div className={`p-3 rounded-3 border transition-all ${localData.exitType === "Percentage return" ? "border-primary bg-primary bg-opacity-10" : "border-light bg-light"}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleExitTypeChange("Percentage return")}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exitType"
                      id="percentageReturn"
                      value="Percentage return"
                      checked={localData.exitType === "Percentage return"}
                      onChange={(e) => handleExitTypeChange(e.target.value)}
                    />
                    <label className="form-check-label fw-semibold text-dark w-100" htmlFor="percentageReturn">
                      Percentage Return (ROI)
                    </label>
                  </div>
                  {localData.exitType === "Percentage return" && (
                    <div className="mt-3 ps-4 fade-in-up">
                      <label className="form-label small text-secondary">Return Percentage (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm bg-white border-0 shadow-sm"
                        value={localData.returnPercentage || 0}
                        onChange={(e) => handleInputChange('returnPercentage', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="1000"
                        step="0.01"
                        placeholder="Enter %"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>

                <div className={`p-3 rounded-3 border transition-all ${localData.exitType === "Market value" ? "border-primary bg-primary bg-opacity-10" : "border-light bg-light"}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleExitTypeChange("Market value")}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="exitType"
                      id="marketValue"
                      value="Market value"
                      checked={localData.exitType === "Market value"}
                      onChange={(e) => handleExitTypeChange(e.target.value)}
                    />
                    <label className="form-check-label fw-semibold text-dark w-100" htmlFor="marketValue">
                      Market Value
                    </label>
                  </div>
                  {localData.exitType === "Market value" && (
                    <div className="mt-3 ps-4 fade-in-up">
                      <label className="form-label small text-secondary">Market Value (₹)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm bg-white border-0 shadow-sm"
                        value={localData.marketValue || 0}
                        onChange={(e) => handleInputChange('marketValue', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="Enter value"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        <div className="mt-4">
          {localData.entryYear >= localData.exitYear && localData.entryYear !== "" && localData.exitYear !== "" && (
            <div className="alert alert-warning border-0 shadow-sm rounded-3 d-flex align-items-center">
              <FaExclamationTriangle className="me-3 fs-5" />
              <div>Exit year must be <strong>after</strong> entry year.</div>
            </div>
          )}

          {localData.investmentAmount <= 0 && (
            <div className="alert alert-danger border-0 shadow-sm rounded-3 d-flex align-items-center">
              <FaExclamationCircle className="me-3 fs-5" />
              <div>Investment amount must be greater than 0.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestorIRRInput;
