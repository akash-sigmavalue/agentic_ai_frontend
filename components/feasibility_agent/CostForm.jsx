import { useState, useEffect } from "react";
// import { Info, ExternalLinkAlt } from "lucide-react";
import { FaInfo, FaExternalLinkAlt } from "react-icons/fa";


const CostForm = ({ onSave }) => {
  const [formData, setFormData] = useState({
    landCost: "",
    approvalCost: "",
    constructionRate: "",
    administrativeCost: "",
    governmentLandRate: "",
    tdrCost: "",
    financeCost: "",
    miscellaneousCost: "",
    marketingCoefficient: "",
    constructionTimeline: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("costForm");
    if (saved) {
      setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConstructionTimelineChange = (value) => {
    const sanitizedValue = value.replace(/\D/g, "").slice(0, 2);
    handleInputChange("constructionTimeline", sanitizedValue);
  };

  const handleSave = () => {
    if (!formData.landCost || !formData.approvalCost || !formData.constructionRate ||
      !formData.administrativeCost || !formData.governmentLandRate ||
      !formData.tdrCost || !formData.financeCost || !formData.miscellaneousCost ||
      !formData.marketingCoefficient) {
      alert("Please fill in all required fields.");
      return;
    }
    const coeff = parseFloat(formData.marketingCoefficient);
    if (isNaN(coeff) || coeff < 0.05 || coeff > 0.08) {
      alert("Marketing Coefficient must be between 0.05 and 0.08 (inclusive)");
      return;
    }

    localStorage.setItem("costForm", JSON.stringify(formData));
    onSave(formData);

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('costFormUpdated'));

    alert("Cost details have been saved successfully.");
  };

  const handleUpdate = () => {
    if (!formData.marketingCoefficient) {
      alert("Please fill in the Marketing Coefficient field.");
      return;
    }
    const coeff = parseFloat(formData.marketingCoefficient);
    if (isNaN(coeff) || coeff < 0.05 || coeff > 0.08) {
      alert("Marketing Coefficient must be between 0.05 and 0.08 (inclusive)");
      return;
    }
    localStorage.setItem("costForm", JSON.stringify(formData));
    onSave(formData);

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('costFormUpdated'));

    alert("Cost details have been updated successfully.");
  };

  const openGovernmentLandRate = () => {
    window.open("https://igreval.maharashtra.gov.in/eASR2.0/", "_blank");
  };


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
        .nr-selected-panel .form-label {
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }
        .nr-selected-panel .form-control {
          border: 1px solid #d8e1ec;
          border-radius: 12px;
          min-height: 42px;
          box-shadow: none;
        }
        .nr-selected-panel .form-control:focus {
          border-color: #94a3b8;
          box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.18);
        }
        .nr-selected-panel .btn {
          min-height: 40px;
          border-radius: 999px;
          font-weight: 800;
        }
      `}</style>
      <div className="nr-selected-header">
        <div className="nr-selected-eyebrow">Selected Section</div>
        <h1 className="nr-selected-title">Cost Details For Proposed FSI</h1>
      </div>
      <div className="nr-selected-body">
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="landCost" className="form-label d-flex align-items-center gap-2">
              Land Cost *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Land Purchase price (including brokerage, stamp duty, registration), TDR (Transfer of Development Rights) or FSI premium cost, Land acquisition charges (if under development authority)"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="landCost"
              value={formData.landCost}
              onChange={(e) => handleInputChange("landCost", e.target.value)}
              placeholder="Enter land cost"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="approvalCost" className="form-label d-flex align-items-center gap-2">
              Approval Cost *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="NA Conversion Charges (in case of Agriculture Land), Building plan approval fees (local authority, municipal), Environment clearance & fees, Fire NOC, Airport NOC, Tree Authority NOC, etc., External development charges (EDC) or Infrastructure charges, Labour cess, construction taxes, Legal and liaisoning consultant fees"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="approvalCost"
              value={formData.approvalCost}
              onChange={(e) => handleInputChange("approvalCost", e.target.value)}
              placeholder="Enter approval cost"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="constructionRate" className="form-label d-flex align-items-center gap-2">
              Construction Rate on ₹ Per Sq Ft *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Civil works (materials + labour), Foundation and structure (RCC, steel, excavation), Masonry, plastering, waterproofing, Internal finishing (flooring, doors/windows, painting), External finishing (elevation, compound, facade), Plumbing, electricals, HVAC, Firefighting and safety systems, Elevators/lifts, DG set, STP, WTP, solar systems (if applicable)"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="constructionRate"
              value={formData.constructionRate}
              onChange={(e) => handleInputChange("constructionRate", e.target.value)}
              placeholder="Enter construction rate"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="administrativeCost" className="form-label d-flex align-items-center gap-2">
              Administrative Cost *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Salaries & Wages, Office Rent & Utilities, Stationery & Supplies, Communication, Software & Licenses, Audit & Accounting Fees, Transportation & Travel, Security & Housekeeping, Miscellaneous"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="administrativeCost"
              value={formData.administrativeCost}
              onChange={(e) => handleInputChange("administrativeCost", e.target.value)}
              placeholder="Enter administrative cost"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="governmentLandRate" className="form-label d-flex align-items-center gap-2">
              Government Land Rate on ₹ Per Sq Ft *
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1"
                onClick={openGovernmentLandRate}
                style={{ textDecoration: 'none' }}
              >
                <FaExternalLinkAlt style={{ width: '16px', height: '16px' }} />
              </button>
            </label>
            <input
              type="number"
              className="form-control"
              id="governmentLandRate"
              value={formData.governmentLandRate}
              onChange={(e) => handleInputChange("governmentLandRate", e.target.value)}
              placeholder="Enter government land rate"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="tdrCost" className="form-label d-flex align-items-center gap-2">
              TDR Rate on ₹ Per Sq Ft *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="TDR Rate Per Sq Ft"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="tdrCost"
              value={formData.tdrCost}
              onChange={(e) => handleInputChange("tdrCost", e.target.value)}
              placeholder="Enter TDR rate"
            />
          </div>

          <div className="col-12">
            <label htmlFor="financeCost" className="form-label d-flex align-items-center gap-2">
              Finance Cost *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Interest during construction (IDC), Processing fees for loans, Pre-EMI interest, Other financing charges (legal vetting, valuation, etc.)"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="financeCost"
              value={formData.financeCost}
              onChange={(e) => handleInputChange("financeCost", e.target.value)}
              placeholder="Enter finance cost"
            />
          </div>

          <div className="col-12">
            <label htmlFor="miscellaneousCost" className="form-label d-flex align-items-center gap-2">
              Miscellaneous Cost *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Any other costs not covered in the above categories"
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              id="miscellaneousCost"
              value={formData.miscellaneousCost}
              onChange={(e) => handleInputChange("miscellaneousCost", e.target.value)}
              placeholder="Enter miscellaneous cost"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="marketingCoefficient" className="form-label d-flex align-items-center gap-2">
              Marketing and Sales cost Coefficient (Enter value from 0.05 to 0.08) *
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Enter a value between 0.05 and 0.08 (inclusive) for marketing and selling cost coefficient."
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.05"
              max="0.08"
              className="form-control"
              id="marketingCoefficient"
              value={formData.marketingCoefficient || ''}
              onChange={(e) => handleInputChange("marketingCoefficient", e.target.value)}
              placeholder="Enter marketing coefficient (0.05 - 0.08)"
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="constructionTimeline" className="form-label d-flex align-items-center gap-2">
              Construction Timeline
              <span
                className="text-muted position-relative"
                style={{ cursor: 'help' }}
                title="Construction duration in years. Enter a maximum two digit number."
              >
                <FaInfo style={{ width: '16px', height: '12px' }} />
              </span>
            </label>
            <div className="position-relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                className="form-control pe-5"
                id="constructionTimeline"
                value={formData.constructionTimeline || ''}
                onChange={(e) => handleConstructionTimelineChange(e.target.value)}
                placeholder="Enter timeline"
              />
              <span
                className="position-absolute top-50 translate-middle-y text-muted fw-bold"
                style={{ right: 14, fontSize: 13, pointerEvents: "none" }}
              >
                years
              </span>
            </div>
          </div>

          <div className="col-12 pt-3">
            <div className="row g-3">
              <div className="col-6">
                <button onClick={handleSave} className="btn btn-primary w-100">
                  Save
                </button>
              </div>
              <div className="col-6">
                <button onClick={handleUpdate} className="btn btn-secondary w-100">
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

export default CostForm; 
