import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import { useState } from "react";
import InvestorIRRInput from "./InvestorIRRInput";
import InvestorIRROutput from "./InvestorIRROutput";
import Header from "./Header";
import { FaArrowLeft, FaUserTie, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';


const InvestorIRR = () => {
  const navigate = useNavigate();
  const [totalYears, setTotalYears] = useState(5);
  const [investorData, setInvestorData] = useState({
    investmentAmount: 0,
    entryYear: 0,
    exitYear: 0,
    exitType: "Fixed payout",
    fixedPayout: 0
  });

  const handleGoBack = () => {
    navigate("/irr-comparison");
  };

  const handleInvestorDataChange = (newData) => {
    setInvestorData(newData);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <Header />

      <main className="container-fluid py-5 px-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2 fade-in-up" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3 card-hover-lift" onClick={handleGoBack}>
                <FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaUserTie className="text-primary me-3" />Investor IRR Calculator
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Calculate and analyze Internal Rate of Return for individual investors.</p>
          </div>
        </div>

        <style>{`
            .ls-1 { letter-spacing: 1px; }
            .card-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
            .card-hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
            
            /* Input styling matching IRR page */
            .form-control, .form-select {
                background-color: #f8f9fa;
                border: 1px solid transparent;
                padding: 0.75rem 1rem;
            }
            .form-control:focus, .form-select:focus {
                background-color: #fff;
                box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15); 
                border-color: var(--bs-primary) !important;
            }

            /* Animation Classes */
            .fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
            transform: translateY(20px);
            }
            
            @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
            }
            
            .stagger-1 { animation-delay: 0.1s; }
            .stagger-2 { animation-delay: 0.2s; }
            .stagger-3 { animation-delay: 0.3s; }

            .pulse-animation {
            animation: pulse 2s infinite;
            }

            @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(25, 135, 84, 0); }
            100% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
            }
        `}</style>

        <div className="row justify-content-center fade-in-up stagger-1">
          <div className="col-12 col-xl-10">

            {/* Project Timeline Configuration */}
            <div className="card border-0 shadow-sm rounded-4 card-hover-lift mb-4">
              <div className="card-header bg-white border-bottom border-light pt-4 px-4 pb-0">
                <h5 className="fw-bold text-dark mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                      <FaCalendarAlt />
                    </div>
                    Project Timeline Configuration
                  </div>
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row align-items-center">
                  <div className="col-md-5">
                    <label className="form-label fw-bold text-dark small text-uppercase ls-1">Total Project Years</label>
                    <div className="input-group input-group-lg">
                      <input
                        type="number"
                        className="form-control bg-light border-0 fw-bold text-primary"
                        value={totalYears}
                        onChange={(e) => setTotalYears(parseInt(e.target.value) || 5)}
                        min="1"
                        max="50"
                        step="1"
                      />
                      <span className="input-group-text bg-light border-0 fw-medium text-secondary text-dark">Years</span>
                    </div>
                  </div>
                  <div className="col-md-7 mt-3 mt-md-0">
                    <div className="alert alert-light border-0 bg-primary bg-opacity-10 text-primary mb-0 rounded-3 d-flex align-items-center">
                      <FaInfoCircle className="me-3 fs-5" />
                      <div>
                        <strong>Active Timeline</strong>
                        <div className="small">The calculation will span from Year 0 (Investment) to Year {totalYears}.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Investor IRR Input Component */}
            <div className="fade-in-up stagger-2 mb-4">
              <InvestorIRRInput
                totalYears={totalYears}
                investorData={investorData}
                onDataChange={handleInvestorDataChange}
              />
            </div>

            {/* Investor IRR Output Component */}
            <div className="fade-in-up stagger-3">
              <InvestorIRROutput
                totalYears={totalYears}
                investorData={investorData}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InvestorIRR;
