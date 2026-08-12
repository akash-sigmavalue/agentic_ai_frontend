import { useState, useEffect } from "react";
import Header from "./Header";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import { FaArrowLeft, FaCalendarAlt, FaSave, FaTable, FaChartLine } from "react-icons/fa";

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const SQFT_TO_SQM = 10.764; // 1 sqm = 10.764 sqft

// Helper function to calculate Max Permissible Area from Proposed FSI (in sqft) and convert to sqm
const calculateProposedMaxPermissibleAreaInSqm = () => {
  if (typeof window === 'undefined') return null;
  try {
    const fsiProposalData = JSON.parse(localStorage.getItem('fsiProposalData') || '{}');
    const landFormData = JSON.parse(localStorage.getItem('landDetailsForm') || '{}');
    
    if (!fsiProposalData || !fsiProposalData.Proposed_Max_Building_Potential) {
      return null;
    }
    
    const proposedMaxBuilding = parseFloat(fsiProposalData.Proposed_Max_Building_Potential) || 0;
    const zoningType = (landFormData.zoningType || '').toLowerCase();
    
    let maxPermissibleAreaSqft = proposedMaxBuilding;
    
    if (zoningType === 'commercial' && fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) {
      maxPermissibleAreaSqft += proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant);
    } else if (zoningType === 'residential' && fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) {
      maxPermissibleAreaSqft += proposedMaxBuilding * parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant);
    } else if (zoningType === 'mixed') {
      const commercialSplit = (parseFloat(landFormData.commercialSplit) || 0) / 100;
      const residentialSplit = (parseFloat(landFormData.residentialSplit) || 0) / 100;
      const commercialAncillaryConstant = parseFloat(fsiProposalData.Proposed_Commercial_Ancillary_Area_Constant) || 0;
      const residentialAncillaryConstant = parseFloat(fsiProposalData.Proposed_Residential_Ancillary_Area_Constant) || 0;
      
      maxPermissibleAreaSqft += 
        (proposedMaxBuilding * commercialSplit * commercialAncillaryConstant) +
        (proposedMaxBuilding * residentialSplit * residentialAncillaryConstant);
    }
    
    // Convert from sqft to sqm
    const maxPermissibleAreaSqm = maxPermissibleAreaSqft / SQFT_TO_SQM;
    return maxPermissibleAreaSqm > 0 ? Math.round(maxPermissibleAreaSqm) : null;
  } catch (error) {
    console.error('Error calculating Proposed Max Permissible Area:', error);
    return null;
  }
};

const computeTimetable = (formData) => {
  const { fsiArea, noBasements, noGround, noPodiums, areaPerFloor } = formData;

  // Construction Area = FSI * 1.35
  const constructionArea = fsiArea * 1.35;

  // perday_b = 0.0006186*(Construction Area) + 5.1187
  const perday_b = 0.0006186 * constructionArea + 5.1187;

  // perday_c = 0.0149072582731196 * (Construction Area ^ 0.717849518876567)
  const perday_c = 0.0149072582731196 * Math.pow(constructionArea, 0.717849518876567);

  // totaldays_* = Construction Area / perday_*
  const totaldays_b = perday_b > 0 ? constructionArea / perday_b : Infinity;
  const totaldays_c = perday_c > 0 ? constructionArea / perday_c : Infinity;

  // Buffers per rules
  let days_with_buffer_b, days_with_buffer_c;

  if (totaldays_b < totaldays_c) {
    days_with_buffer_b = totaldays_b * 1.10;
    days_with_buffer_c = totaldays_c * 0.90;
  } else if (totaldays_c < totaldays_b) {
    days_with_buffer_b = totaldays_b * 0.90;
    days_with_buffer_c = totaldays_c * 1.10;
  } else {
    // Equal case: apply symmetric 10%/−10% around the same value
    days_with_buffer_b = totaldays_b * 1.10;
    days_with_buffer_c = totaldays_c * 0.90;
  }

  // Determine printable range
  const low = Math.min(days_with_buffer_b, days_with_buffer_c);
  const high = Math.max(days_with_buffer_b, days_with_buffer_c);

  // Total Floors calculation
  const totalFloors =
    areaPerFloor > 0
      ? fsiArea / areaPerFloor + (noBasements || 0) + (noGround || 0) + (noPodiums || 0)
      : 0;

  return {
    constructionArea,
    perday_b,
    perday_c,
    totaldays_b,
    totaldays_c,
    days_with_buffer_b,
    days_with_buffer_c,
    low,
    high,
    totalFloors,
  };
};

const ConstructionTimetable = () => {
  const navigate = useNavigate();
  
  // Get default FSI Area: check saved data first, then use Proposed Max Permissible Area
  const getDefaultFsiArea = () => {
    if (typeof window === 'undefined') return "";
    // First, check if there's saved construction timetable data
    const savedState = localStorage.getItem("constructionTimetableState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.formData && parsed.formData.fsiArea) {
          return parsed.formData.fsiArea;
        }
      } catch (error) {
        console.error('Error parsing saved construction timetable state:', error);
      }
    }
    
    // Check for saved form data
    const savedFormData = localStorage.getItem("constructionTimetableForm");
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        if (parsed.fsiArea) {
          return parsed.fsiArea;
        }
      } catch (error) {
        console.error('Error parsing saved construction timetable form:', error);
      }
    }
    
    // If no saved data, calculate Proposed Max Permissible Area from Proposed FSI (in sqm)
    const proposedMaxAreaSqm = calculateProposedMaxPermissibleAreaInSqm();
    if (proposedMaxAreaSqm !== null) {
      return proposedMaxAreaSqm;
    }
    
    // Fallback to old method if calculation fails
    const fallbackValue = localStorage.getItem('maxpermissiblearea');
    if (fallbackValue) {
      const numValue = Number(fallbackValue);
      return isNaN(numValue) ? "" : numValue;
    }
    return "";
  };
  
  const [formData, setFormData] = useState({
    startDate: "",
    fsiArea: getDefaultFsiArea(),
    noBasements: "",
    noGround: "",
    noPodiums: "",
    areaPerFloor: "",
    noBuildings: 1,
  });
  const [calculations, setCalculations] = useState(null);
  const [mode, setMode] = useState("auto");
  const [manualDates, setManualDates] = useState({
    startDate: "",
    endDate: "",
    totalDays: null,
  });

  const handleGoBack = () => {
    navigate("/new_rate_simulator/");
  };

  const handleInputChange = (field, value) => {
    let newValue = value === "" ? "" : Number(value);
    // Convert sqft input to sqm for storage (for area fields)
    if ((field === "fsiArea" || field === "areaPerFloor") && newValue !== "") {
      newValue = newValue / SQFT_TO_SQM; // Convert sqft to sqm
    }
    setFormData({ ...formData, [field]: newValue });
  };
  
  // Helper to convert sqm to sqft for display
  const sqmToSqft = (sqm) => {
    if (sqm === "" || sqm === null || sqm === undefined) return "";
    const numValue = Number(sqm);
    if (isNaN(numValue)) return "";
    return numValue * SQFT_TO_SQM;
  };
  
  // Display values (convert from sqm to sqft for area fields)
  const displayFsiArea = sqmToSqft(formData.fsiArea);
  const displayAreaPerFloor = sqmToSqft(formData.areaPerFloor);

  const handleDateChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Calculate whenever form data changes
  useEffect(() => {
    if (mode === "auto" && formData.fsiArea > 0) {
      setCalculations(computeTimetable(formData));
    } else {
      setCalculations(null);
    }
  }, [formData, mode]);

  const handleSave = () => {
    const stateToSave = {
      mode,
      formData,
      manualDates,
    };

    localStorage.setItem("constructionTimetableState", JSON.stringify(stateToSave));

    if (mode === "auto") {
      localStorage.setItem("constructionTimetableForm", JSON.stringify(formData));
      if (calculations) {
        localStorage.setItem("constructionTimetableResults", JSON.stringify(calculations));
      } else {
        localStorage.removeItem("constructionTimetableResults");
      }
      localStorage.removeItem("constructionTimetableManual");
    } else {
      localStorage.setItem("constructionTimetableManual", JSON.stringify(manualDates));
      localStorage.removeItem("constructionTimetableForm");
      localStorage.removeItem("constructionTimetableResults");
    }

    window.dispatchEvent(new CustomEvent("constructionTimetableUpdated"));
    alert("Construction timetable data has been saved successfully.");
  };

  // Load saved data on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("constructionTimetableState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.manualDates) setManualDates(parsed.manualDates);
        return;
      } catch (error) {
        console.error("Failed to parse saved construction timetable state", error);
      }
    }

    const savedFormData = localStorage.getItem("constructionTimetableForm");
    if (savedFormData) {
      setFormData(JSON.parse(savedFormData));
    }

    const savedManual = localStorage.getItem("constructionTimetableManual");
    if (savedManual) {
      setManualDates(JSON.parse(savedManual));
      setMode("manual");
    }
  }, []);

  const buildingsDisabled = !(formData.fsiArea && formData.fsiArea > 2500);
  
  // Calculate completion dates based on start date and day ranges
  const calculateCompletionDates = () => {
    if (!formData.startDate || !calculations) return null;
    
    const startDate = new Date(formData.startDate);
    if (isNaN(startDate.getTime())) return null;
    
    const lowDays = Math.round(calculations.low);
    const highDays = Math.round(calculations.high);
    const meanDays = Math.round((calculations.low + calculations.high) / 2);
    
    const lowerDate = new Date(startDate);
    lowerDate.setDate(lowerDate.getDate() + lowDays);
    
    const meanDate = new Date(startDate);
    meanDate.setDate(meanDate.getDate() + meanDays);
    
    const maxDate = new Date(startDate);
    maxDate.setDate(maxDate.getDate() + highDays);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };
    
    return {
      lower: formatDate(lowerDate),
      mean: formatDate(meanDate),
      max: formatDate(maxDate),
    };
  };
  
  const completionDates = calculateCompletionDates();
  
  const handleManualDateChange = (field, value) => {
    const updated = { ...manualDates, [field]: value };
    if (updated.startDate && updated.endDate) {
      const start = new Date(updated.startDate);
      const end = new Date(updated.endDate);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        updated.totalDays = Math.floor((end - start) / MS_IN_DAY) + 1;
      } else {
        updated.totalDays = null;
      }
    } else {
      updated.totalDays = null;
    }
    setManualDates(updated);
  };

  const manualDatesComplete = manualDates.startDate && manualDates.endDate;
  const manualDateError =
    manualDatesComplete &&
    new Date(manualDates.endDate) < new Date(manualDates.startDate);
  const showActionButtons = mode === "manual" || Boolean(calculations);

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <Header />
      <main className="container-fluid py-5 px-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3" onClick={handleGoBack}>
                < FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaCalendarAlt className="text-primary me-3" />Construction Time Estimator
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Enter project inputs. Number of Buildings becomes active only if FSI Area {'>'} 2500.</p>
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row justify-content-center align-items-start gap-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="scheduleMode"
                  id="modeAuto"
                  value="auto"
                  checked={mode === "auto"}
                  onChange={() => setMode("auto")}
                />
                <label className="form-check-label fw-semibold" htmlFor="modeAuto">
                  Calculate My Construction Schedule
                </label>
                <p className="text-muted small mb-0">
                  Uses automated logic based on the inputs below.
                </p>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="scheduleMode"
                  id="modeManual"
                  value="manual"
                  checked={mode === "manual"}
                  onChange={() => setMode("manual")}
                />
                <label className="form-check-label fw-semibold" htmlFor="modeManual">
                  I Already Have the Schedule
                </label>
                <p className="text-muted small mb-0">
                  Enter a start and end date to store your custom plan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Input Form */}
        {mode === "auto" && (
          <>
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="startDate" className="form-label fw-semibold">Project Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="startDate"
                      value={formData.startDate}
                      onChange={(e) => handleDateChange("startDate", e.target.value)}
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="fsiArea" className="form-label fw-semibold">
                      FSI Area (sq.ft) [integer]
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="fsiArea"
                      value={displayFsiArea}
                      onChange={(e) => handleInputChange("fsiArea", e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="noBasements" className="form-label fw-semibold">
                      Number of Basements (whole number)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="noBasements"
                      value={formData.noBasements}
                      onChange={(e) => handleInputChange("noBasements", e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="noGround" className="form-label fw-semibold">
                      Number of Ground Floors (whole number)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="noGround"
                      value={formData.noGround}
                      onChange={(e) => handleInputChange("noGround", e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="noPodiums" className="form-label fw-semibold">
                      Number of Podiums (whole number)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="noPodiums"
                      value={formData.noPodiums}
                      onChange={(e) => handleInputChange("noPodiums", e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="areaPerFloor" className="form-label fw-semibold">
                      Area per Floor (sq.ft) [integer]
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="areaPerFloor"
                      value={displayAreaPerFloor}
                      onChange={(e) => handleInputChange("areaPerFloor", e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="noBuildings" className="form-label fw-semibold">
                      Number of Buildings (whole number) — active if FSI Area {'>'} 2500
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="noBuildings"
                      value={formData.noBuildings}
                      onChange={(e) => handleInputChange("noBuildings", e.target.value)}
                      min="1"
                      step="1"
                      disabled={buildingsDisabled}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Guard: need a positive FSI area to compute */}
            {formData.fsiArea <= 0 && (
              <div className="alert alert-info rounded-3 border-0 shadow-sm text-center">
                Provide a positive FSI Area to calculate results.
              </div>
            )}

            {/* Results Section */}
            {calculations && (
              <>
                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-body text-center">
                        <h6 className="card-title text-muted fw-semibold mb-3">Construction Area (sq.ft)</h6>
                        <h4 className="text-primary fw-bold">{(calculations.constructionArea * SQFT_TO_SQM).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">  
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-body text-center">
                        <h6 className="card-title text-muted fw-semibold mb-3">Total Floors</h6>
                        <h4 className="text-primary fw-bold">{calculations.totalFloors.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Floors</h4>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-body text-center">
                    <h5 className="card-title fw-bold text-dark mb-3">Completion Days Range</h5>
                    <h3 className="text-primary fw-bold">
                      {calculations.high > calculations.low 
                        ? `${calculations.low.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} to ${calculations.high.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} days`
                        : `${calculations.low.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} days`}
                    </h3>
                    {completionDates && (
                      <div className="mt-4 pt-3 border-top">
                        <h6 className="text-muted fw-semibold mb-3">Projected Completion Dates</h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <div className="card border-0 bg-light rounded-3 shadow-sm">
                              <div className="card-body">
                                <p className="text-muted small mb-1">Lower Completion Date</p>
                                <p className="fw-semibold mb-0 text-primary">{completionDates.lower}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="card border-0 bg-light rounded-3 shadow-sm">
                              <div className="card-body">
                                <p className="text-muted small mb-1">Mean Completion Date</p>
                                <p className="fw-semibold mb-0 text-primary">{completionDates.mean}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="card border-0 bg-light rounded-3 shadow-sm">
                              <div className="card-body">
                                <p className="text-muted small mb-1">Max Completion Date</p>
                                <p className="fw-semibold mb-0 text-primary">{completionDates.max}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {!completionDates && formData.startDate && (
                      <div className="mt-3">
                        <small className="text-muted">Enter a valid start date to see completion dates</small>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="fw-bold text-dark mb-1">Details and Inputs (for record)</h5>
                        <p className="text-muted small mb-0">Input values and calculation results</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive rounded-3 border bg-white">
                      <table className="table table-bordered mb-0">
                        <thead className="bg-light text-secondary">
                          <tr>
                            <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ width: "50%", letterSpacing: "0.5px" }}>Input Values</th>
                            <th className="py-3 px-4 fw-semibold small text-uppercase" style={{ width: "50%", letterSpacing: "0.5px" }}>Calculation Results</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-3 px-4">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">FSI Area (sq.ft):</span>
                                <span className="fw-semibold text-dark">{displayFsiArea !== "" ? Math.round(displayFsiArea).toLocaleString() : ""}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">No. of Basements:</span>
                                <span className="fw-semibold text-dark">{formData.noBasements}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">No. of Ground Floors:</span>
                                <span className="fw-semibold text-dark">{formData.noGround}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">No. of Podiums:</span>
                                <span className="fw-semibold text-dark">{formData.noPodiums}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Area per Floor (sq.ft):</span>
                                <span className="fw-semibold text-dark">{displayAreaPerFloor !== "" ? Math.round(displayAreaPerFloor).toLocaleString() : ""}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Number of Buildings:</span>
                                <span className="fw-semibold text-dark">{buildingsDisabled ? "N/A" : formData.noBuildings}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Construction Area (sq.ft):</span>
                                <span className="fw-semibold text-dark">{(calculations.constructionArea * SQFT_TO_SQM).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Per-day Output B (sq.ft/day):</span>
                                <span className="fw-semibold text-dark">{(calculations.perday_b * SQFT_TO_SQM).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Per-day Output C (sq.ft/day):</span>
                                <span className="fw-semibold text-dark">{(calculations.perday_c * SQFT_TO_SQM).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Total Days B:</span>
                                <span className="fw-semibold text-dark">{calculations.totaldays_b.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Total Days C:</span>
                                <span className="fw-semibold text-dark">{calculations.totaldays_c.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Days with Buffer B:</span>
                                <span className="fw-semibold text-dark">{calculations.days_with_buffer_b.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Days with Buffer C:</span>
                                <span className="fw-semibold text-dark">{calculations.days_with_buffer_c.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {mode === "manual" && (
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="manualStartDate" className="form-label fw-semibold">
                    Project Start Date
                  </label>
                  <input
                    id="manualStartDate"
                    type="date"
                    className="form-control"
                    value={manualDates.startDate}
                    onChange={(e) => handleManualDateChange("startDate", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="manualEndDate" className="form-label fw-semibold">
                    Project End Date
                  </label>
                  <input
                    id="manualEndDate"
                    type="date"
                    className="form-control"
                    value={manualDates.endDate}
                    onChange={(e) => handleManualDateChange("endDate", e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <div className="alert alert-info rounded-3 border-0 shadow-sm text-center mb-0">
                    {manualDates.totalDays !== null
                      ? `Calculated Total Days: ${manualDates.totalDays}`
                      : "Select both start and end dates to calculate total days."}
                  </div>
                  {manualDateError && (
                    <div className="alert alert-warning rounded-3 border-0 shadow-sm text-center mt-3 mb-0">
                      End date must be on or after the start date.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showActionButtons && (
          <div className="text-center pt-4">
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <button className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm" onClick={handleSave}>
                <FaSave className="me-2" />
                Save Construction Timetable 
              </button>

              <button className="btn btn-success btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm" onClick={() => navigate('/construction-table')}>
                <FaTable className="me-2" />
                Create a construction table 
              </button>

              <button className="btn btn-info btn-lg rounded-pill px-5 py-3 fw-semibold shadow-sm" onClick={() => navigate('/predict-sales-velocity/')}>
                <FaChartLine className="me-2" />
                Predict Sales velocity
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .ls-1 { letter-spacing: 1px; }
        .card-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .form-control:focus { box-shadow: none; border-color: var(--bs-primary) !important; }
        /* Scrollbar styling for tables */
        .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-responsive::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-responsive::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Enhanced UI Styles */
        .icon-shape {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .table-hover tbody tr {
          transition: background-color 0.2s ease;
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        .btn:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
        
        .btn:active {
          transform: translateY(0);
        }
        
        .list-group-item:first-child {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
        
        .list-group-item:last-child {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
      `}</style>
    </div>
  );
};

export default ConstructionTimetable;