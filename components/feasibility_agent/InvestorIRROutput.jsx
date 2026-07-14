import { useMemo, useState } from "react";
import { get_data } from "@/components/AppUtils";
import { FaArrowDown, FaArrowUp, FaChartLine, FaInfoCircle, FaCalculator, FaExclamationCircle } from 'react-icons/fa';

const InvestorIRROutput = ({ totalYears, investorData }) => {
  const [irrResult, setIrrResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  const cashFlows = useMemo(() => {
    const flows = Array(totalYears + 1).fill(0);

    // Set entry year (negative investment amount)
    if (investorData.entryYear >= 0 && investorData.entryYear <= totalYears) {
      flows[investorData.entryYear] = -investorData.investmentAmount;
    }

    // Set exit year (positive exit value)
    if (investorData.exitYear >= 0 && investorData.exitYear <= totalYears) {
      let exitValue = 0;

      switch (investorData.exitType) {
        case "Fixed payout":
          exitValue = investorData.fixedPayout;
          break;
        case "Percentage return":
          exitValue = investorData.investmentAmount * (1 + (investorData.returnPercentage || 0) / 100);
          break;
        case "Market value":
          exitValue = investorData.marketValue || 0;
          break;
        default:
          exitValue = 0;
      }

      flows[investorData.exitYear] = exitValue;
    }

    return flows;
  }, [totalYears, investorData]);

  const calculateExitValue = () => {
    switch (investorData.exitType) {
      case "Fixed payout":
        return investorData.fixedPayout;
      case "Percentage return":
        return investorData.investmentAmount * (1 + (investorData.returnPercentage || 0) / 100);
      case "Market value":
        return investorData.marketValue || 0;
      default:
        return 0;
    }
  };

  const exitValue = calculateExitValue();

  const calculateIRR = async () => {
    if (investorData.entryYear === "" || investorData.exitYear === "" || investorData.investmentAmount <= 0) {
      setError("Please complete all required fields before calculating IRR");
      return;
    }

    setIsCalculating(true);
    setError(null);
    setIrrResult(null);

    try {
      // Prepare cash flows data for backend - send as simple array
      const requestBody = {
        cash_flows: cashFlows,
        project_duration: totalYears
      };

      // console.log('Sending cash flows to backend:', requestBody);
      // console.log('Cash flows array:', cashFlows);

      const result = await get_data('/new_rate_simulator/simulator/calculate-irr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', // Request JSON response
        },
        body: JSON.stringify(requestBody),
      });

      // console.log('Backend response:', result);
      setIrrResult(result);
    } catch (err) {
      setError(err.message || 'Failed to calculate IRR');
    } finally {
      setIsCalculating(false);
    }
  };

  console.log("irrResult...................", irrResult)

  return (
    <div className="card border-0 shadow-sm rounded-4 card-hover-lift">
      <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
        <h5 className="fw-bold text-dark mb-3">
          <div className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <FaChartLine />
            </div>
            Investor IRR Output
          </div>
        </h5>
      </div>

      <style>
        {`
           .table th {
             font-weight: 600;
             text-transform: uppercase;
             letter-spacing: 0.5px;
             font-size: 0.75rem;
             color: #6c757d;
             background-color: #f8f9fa;
             border-bottom: 2px solid #e9ecef;
           }
           
           .badge {
             font-weight: 600;
             letter-spacing: 0.3px;
           }
           
           .table td {
             vertical-align: middle;
             color: #495057;
             font-size: 0.9rem;
           }

           .table-hover tbody tr:hover {
             background-color: rgba(13, 110, 253, 0.02);
             transform: translateY(-2px);
             transition: all 0.2s ease;
             box-shadow: 0 4px 6px rgba(0,0,0,0.02);
           }
         `}
      </style>
      <div className="card-body p-4">
        {/* Cash Flow Table */}
        <div className="table-responsive mb-5 rounded-3 border border-light">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="text-center py-3" style={{ width: '60px' }}>#</th>
                <th className="py-3" style={{ width: '180px' }}>Metric</th>
                {Array.from({ length: totalYears + 1 }, (_, i) => (
                  <th key={i} className="text-center py-3" style={{ minWidth: '100px' }}>Year {i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center text-muted">1</td>
                <td className="fw-semibold">Investment (Entry)</td>
                {Array.from({ length: totalYears + 1 }, (_, i) => (
                  <td key={i} className="text-center">
                    {i === investorData.entryYear ? (
                      <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2 rounded-pill">
                        <FaArrowDown className="me-1" />
                        ₹{investorData.investmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-center text-muted">2</td>
                <td className="fw-semibold">Exit Value</td>
                {Array.from({ length: totalYears + 1 }, (_, i) => (
                  <td key={i} className="text-center">
                    {i === investorData.exitYear ? (
                      <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 rounded-pill">
                        <FaArrowUp className="me-1" />
                        ₹{exitValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <td className="text-center text-muted">3</td>
                <td className="fw-bold text-dark">Net Cash Flow</td>
                {Array.from({ length: totalYears + 1 }, (_, i) => (
                  <td key={i} className="text-center fw-bold">
                    {cashFlows[i] !== 0 ? (
                      <div className={`d-inline-flex align-items-center ${cashFlows[i] > 0 ? 'text-success' : 'text-danger'}`}>
                        {cashFlows[i] > 0 ? '+' : ''}₹{cashFlows[i].toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    ) : (
                      <span className="text-muted small opacity-50">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculate IRR Button */}
        <div className="row mb-5">
          <div className="col-12 text-center">
            <div className="position-relative">
              <button
                className="btn btn-primary rounded-pill px-5 py-3 shadow-sm card-hover-lift fw-bold"
                onClick={calculateIRR}
                disabled={isCalculating || investorData.entryYear === "" || investorData.exitYear === "" || investorData.investmentAmount <= 0}
                style={{
                  minWidth: '220px',
                  fontSize: '1.1rem',
                  letterSpacing: '0.5px'
                }}
              >
                {isCalculating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Calculating...
                  </>
                ) : (
                  <>
                    <FaCalculator className="me-2" />
                    Calculate Investor IRR
                  </>
                )}
              </button>

              {!isCalculating && (investorData.entryYear === "" || investorData.exitYear === "" || investorData.investmentAmount <= 0) && (
                <div className="mt-3 fade-in-up">
                  <span className="badge bg-light text-secondary border fw-normal">
                    <FaInfoCircle className="me-1" />
                    Complete all fields to enable calculation
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* IRR Result Display */}
        {irrResult && (
          <div className="row justify-content-center fade-in-up">
            <div className="col-md-10 col-lg-8">
              <div className="card border-0 shadow bg-success bg-opacity-10 position-relative overflow-hidden rounded-4">
                <div className="position-absolute top-0 end-0 p-3 opacity-10">
                  <FaChartLine className="fa-5x text-success" />
                </div>
                <div className="card-body text-center p-5 position-relative">
                  <h6 className="text-uppercase text-success opacity-75 fw-bold ls-1 mb-2">Internal Rate of Return</h6>
                  <div className="display-4 fw-bold text-success mb-4 pulse-animation d-inline-block">
                    {irrResult?.length ? `${irrResult[0].toFixed(2)}%` : 'N/A'}
                  </div>

                  <div className="row g-3 justify-content-center mt-2">
                    <div className="col-sm-6">
                      <div className="bg-white p-3 rounded-3 shadow-sm h-100 border border-success border-opacity-25">
                        <div className="text-muted small text-uppercase fw-bold mb-1">Investment</div>
                        <div className="text-danger fw-bold fs-5">₹{investorData.investmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="bg-white p-3 rounded-3 shadow-sm h-100 border border-success border-opacity-25">
                        <div className="text-muted small text-uppercase fw-bold mb-1">Exit Value</div>
                        <div className="text-success fw-bold fs-5">₹{exitValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="row justify-content-center fade-in-up">
            <div className="col-md-8">
              <div className="alert alert-danger border-0 shadow-sm rounded-4 text-center p-4">
                <div className="text-danger mb-2">
                  <FaExclamationCircle className="fa-2x" />
                </div>
                <h5 className="fw-bold">Calculation Error</h5>
                <p className="mb-0 text-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default InvestorIRROutput;

