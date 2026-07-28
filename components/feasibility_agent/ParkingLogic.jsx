import { useState, useEffect } from "react";
import Header from "./Header";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import {
  FaArrowLeft,
  FaCar,
  FaPlus,
  FaTrash,
  FaVectorSquare,
  FaExpandArrowsAlt,
  FaExclamationTriangle,
  FaHome,
  FaBuilding,
  FaHouseUser,
  FaWarehouse,
  FaStore,
  FaListOl,
  FaInfoCircle,
  FaMotorcycle,
  FaCalculator,
  FaCheckCircle,
  FaUserFriends,
  FaParking,
  FaCarSide
} from 'react-icons/fa';

const ParkingLogic = () => {
  const navigate = useNavigate();
  
  // State for form data
  const [totalCarpet, setTotalCarpet] = useState(0);
  const [variations, setVariations] = useState([{ area: 0, count: 0 }]);
  const [factorCar, setFactorCar] = useState(1.0);
  const [visitorPct, setVisitorPct] = useState(5.0);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const MAX_VARIATIONS = 10;

  const handleGoBack = () => {
    navigate("/new_rate_simulator/");
  };

  // UDCPR rounding function
  const roundRuleGtPoint5 = (x) => {
    const frac = x - Math.floor(x);
    return Math.floor(x) + (frac >= 0.5 ? 1 : 0);
  };

  // Compute parking function
  const computeParking = (N150, N80_150, N40_80, N30_40, Nlt30, factor_car = 1.0, visitor_pct = 5.0) => {
    const car_base = 2 * N150 + 1 * N80_150 + 0.5 * N40_80 + 0.5 * N30_40 + 0 * Nlt30;
    const tw_base = 1 * N150 + 1 * N80_150 + 1 * N40_80 + 0.5 * N30_40 + 1 * Nlt30;

    const car_req = roundRuleGtPoint5(car_base * factor_car);
    const tw_req = roundRuleGtPoint5(tw_base);

    const car_total = Math.ceil(car_req + (car_req * visitor_pct / 100));
    const tw_total = Math.ceil(tw_req + (tw_req * visitor_pct / 100));

    return {
      car_base: car_base,
      tw_base: tw_base,
      car_req: car_req,
      tw_req: tw_req,
      car_total: car_total,
      tw_total: tw_total
    };
  };

  // Handle variation changes
  const handleVariationChange = (index, field, value) => {
    const newVariations = [...variations];
    newVariations[index][field] = parseFloat(value) || 0;
    setVariations(newVariations);
  };

  // Add new variation
  const addVariation = () => {
    if (variations.length < MAX_VARIATIONS) {
      setVariations([...variations, { area: 0, count: 0 }]);
    }
  };

  // Remove variation
  const removeVariation = (index) => {
    if (variations.length > 1) {
      const newVariations = [...variations];
      newVariations.splice(index, 1);
      setVariations(newVariations);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalUsed = variations.reduce((sum, v) => sum + (v.area * v.count), 0);
    const remaining = Math.max(0, totalCarpet - totalUsed);
    return { totalUsed, remaining };
  };

  // Calculate bucket counts
  const calculateBuckets = () => {
    let N150 = 0, N80_150 = 0, N40_80 = 0, N30_40 = 0, Nlt30 = 0;
    
    variations.forEach(v => {
      const area = parseFloat(v.area) || 0;
      const count = parseInt(v.count) || 0;
      
      if (count <= 0 || area <= 0) return;
      
      if (area >= 150) N150 += count;
      else if (area >= 80) N80_150 += count;
      else if (area >= 40) N40_80 += count;
      else if (area >= 30) N30_40 += count;
      else Nlt30 += count;
    });
    
    return { N150, N80_150, N40_80, N30_40, Nlt30 };
  };

  // Perform calculations
  const calculateResults = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const { totalUsed } = calculateTotals();
      
      // Check if total used exceeds total carpet
      if (totalCarpet > 0 && totalUsed > totalCarpet) {
        setResults(null);
        setIsCalculating(false);
        return;
      }
      
      const buckets = calculateBuckets();
      const parkingResults = computeParking(
        buckets.N150, buckets.N80_150, buckets.N40_80, 
        buckets.N30_40, buckets.Nlt30, factorCar, visitorPct
      );
      
      setResults(parkingResults);
      setIsCalculating(false);
    }, 300);
  };

  // Run calculations when inputs change
  useEffect(() => {
    calculateResults();
  }, [totalCarpet, variations, factorCar, visitorPct]);

  // Get totals for display
  const { totalUsed, remaining } = calculateTotals();
  const buckets = calculateBuckets();

  // Calculate area requirements
  const carArea = results ? results.car_total * 12.5 : 0;
  const scooterArea = results ? results.tw_total * 2 : 0;
  const totalArea = carArea + scooterArea;

  // Format numbers with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <Header />
      <main className="container-fluid py-5 px-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3" onClick={handleGoBack}>
                      <FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaCar className="text-primary me-3" />UDCPR Parking Calculator – Pune & Thane (Non-Congested)
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">
              Implements Table 8B + Table 8C (factor = 1.00) with 5% visitor parking and UDCPR rounding (≥0.5 up).
            </p>
          </div>
        </div>

        {/* 1) Project inputs */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 animated-card">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-1">1) Project Inputs</h5>
                <p className="text-muted small mb-0">Enter total carpet area and flat variations</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="mb-4">
              <label htmlFor="totalCarpet" className="form-label fw-semibold">Total carpet area for the entire project (sq.m)</label>
              <input
                type="number"
                className="form-control form-control-lg"
                id="totalCarpet"
                value={totalCarpet}
                onChange={(e) => setTotalCarpet(parseFloat(e.target.value) || 0)}
                min="0"
                step="10"
              />
            </div>

            <h6 className="mt-4 fw-bold text-dark">Flat area variations</h6>
            
            <div className="d-flex justify-content-start mb-4">
              <button 
                className="btn btn-primary rounded-pill px-4 shadow-sm btn-hover-lift"
                onClick={addVariation}
                disabled={variations.length >= MAX_VARIATIONS}
              >
                <FaPlus className="me-2" />
                Add variation
              </button>
            </div>

            {variations.map((variation, index) => {
              const rowUsed = variation.area * variation.count;
              return (
                <div className="card border-0 shadow-sm rounded-3 mb-3 animated-card" key={index}>
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Flat area (sq.m) #{index + 1}</label>
                        <input
                          type="number"
                          className="form-control"
                          value={variation.area}
                          onChange={(e) => handleVariationChange(index, "area", e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">No. of flats #{index + 1}</label>
                        <input
                          type="number"
                          className="form-control"
                          value={variation.count}
                          onChange={(e) => handleVariationChange(index, "count", e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold">Used area</label>
                        <div className="form-control-plaintext fw-bold text-primary">{formatNumber(rowUsed.toFixed(2))}</div>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold">Remaining</label>
                        <div className={`form-control-plaintext fw-bold ${totalCarpet > 0 && totalUsed > totalCarpet ? 'text-danger' : 'text-primary'}`}>
                          {totalCarpet > 0 && totalUsed > totalCarpet 
                            ? "Exhausted" 
                            : formatNumber(remaining.toFixed(2))}
                        </div>
                      </div>
                      <div className="col-md-2">
                        {variations.length > 1 && (
                          <button 
                            className="btn btn-outline-danger w-100 rounded-pill btn-hover-lift"
                            onClick={() => removeVariation(index)}
                          >
                            <FaTrash className="me-1" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary row */}
            <div className="row g-4 mt-4">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3">
                      <FaVectorSquare className="me-2" />
                    </div>
                    <h6 className="card-title text-muted fw-semibold mb-3">Total used carpet area (sq.m)</h6>
                    <h4 className="text-primary fw-bold animated-counter" data-value={totalUsed}>{formatNumber(totalUsed.toFixed(2))}</h4>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-3">
                      <FaExpandArrowsAlt className="me-2" />
                    </div>
                    <h6 className="card-title text-muted fw-semibold mb-3">Remaining carpet area (sq.m)</h6>
                    <h4 className={`fw-bold animated-counter ${totalCarpet > 0 && totalUsed > totalCarpet ? 'text-danger' : 'text-success'}`} data-value={remaining}>
                      {formatNumber(remaining.toFixed(2))}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning if exceeded */}
        {totalCarpet > 0 && totalUsed > totalCarpet && (
          <div className="alert alert-warning rounded-3 border-0 shadow-sm d-flex align-items-center animated-fade">
            <FaExclamationTriangle className="me-2 fa-lg" />
            <span>Calculations paused because total used carpet area exceeds the project carpet area.</span>
          </div>
        )}

        {/* 2) Derived bucket counts */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 animated-card">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-1">2) Derived unit counts by UDCPR buckets</h5>
                <p className="text-muted small mb-0">Distribution of units by size categories</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-2 col-6">
                <div className="card border-0 shadow-sm rounded-3 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-info bg-opacity-10 text-info rounded-circle mx-auto mb-2">
                      <FaHome className="me-2" />
                    </div>
                    <p className="text-muted small mb-1">≥150</p>
                    <h5 className="text-info fw-bold mb-0 animated-counter" data-value={buckets.N150}>{buckets.N150}</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6">
                <div className="card border-0 shadow-sm rounded-3 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-2">
                      <FaBuilding className="me-2" />
                    </div>
                    <p className="text-muted small mb-1">80–{'<'}150</p>
                    <h5 className="text-primary fw-bold mb-0 animated-counter" data-value={buckets.N80_150}>{buckets.N80_150}</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6">
                <div className="card border-0 shadow-sm rounded-3 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-2">
                      <FaHouseUser className="me-2" />
                    </div>
                    <p className="text-muted small mb-1">40–{'<'}80</p>
                    <h5 className="text-success fw-bold mb-0 animated-counter" data-value={buckets.N40_80}>{buckets.N40_80}</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6">
                <div className="card border-0 shadow-sm rounded-3 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-2">
                      <FaWarehouse className="me-2" />
                    </div>
                    <p className="text-muted small mb-1">30–{'<'}40</p>
                    <h5 className="text-warning fw-bold mb-0 animated-counter" data-value={buckets.N30_40}>{buckets.N30_40}</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6">
                <div className="card border-0 shadow-sm rounded-3 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-danger bg-opacity-10 text-danger rounded-circle mx-auto mb-2">
                      <FaStore className="me-2" />
                    </div>
                    <p className="text-muted small mb-1">{'<'}30</p>
                    <h5 className="text-danger fw-bold mb-0 animated-counter" data-value={buckets.Nlt30}>{buckets.Nlt30}</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-2 col-6">
                <div className="card border-0 shadow-sm rounded-3 h-100 card-hover-lift">
                  <div className="card-body text-center">
                    <div className="icon-shape bg-dark bg-opacity-10 text-dark rounded-circle mx-auto mb-2">
                      <FaListOl className="me-2" />
                    </div>
                    <p className="text-muted small mb-1">Total Units</p>
                    <h5 className="text-dark fw-bold mb-0 animated-counter" data-value={buckets.N150 + buckets.N80_150 + buckets.N40_80 + buckets.N30_40 + buckets.Nlt30}>
                      {buckets.N150 + buckets.N80_150 + buckets.N40_80 + buckets.N30_40 + buckets.Nlt30}
                    </h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3) Factors */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 animated-card">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-1">3) City factor and visitor percentage</h5>
                <p className="text-muted small mb-0">Adjust factors for parking calculations</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-info rounded-3 border-0 shadow-sm mb-4 animated-fade">
              <div className="d-flex align-items-center">
                <FaInfoCircle className="me-2 fa-lg" />
                <span>City factor (Table 8C): Pune/PCMC/Thane = <strong>1.00</strong></span>
              </div>
            </div>
            
            <div className="row g-4">
              <div className="col-md-6">
                <label htmlFor="factorCar" className="form-label fw-semibold">
                  Car multiplying factor (Table 8C)
                </label>
                <input
                  type="number"
                  className="form-control form-control-lg"
                  id="factorCar"
                  value={factorCar}
                  onChange={(e) => setFactorCar(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="visitorPct" className="form-label fw-semibold">
                  Visitor parking percentage
                </label>
                <input
                  type="number"
                  className="form-control form-control-lg"
                  id="visitorPct"
                  value={visitorPct}
                  onChange={(e) => setVisitorPct(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4) Results */}
        {results && (
          <>
            <div className="card border-0 shadow-sm rounded-4 mb-4 animated-card">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">4) Results</h5>
                    <p className="text-muted small mb-0">Parking requirements calculated</p>
                  </div>
                  {isCalculating && (
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Calculating...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-body">
                <div className="row g-4 mb-4">
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3">
                          <FaCar className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Cars (base)</h6>
                        <h4 className="text-primary fw-bold animated-counter" data-value={results.car_base.toFixed(2)}>{formatNumber(results.car_base.toFixed(2))}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-3">
                          <FaMotorcycle className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Two-wheelers (base)</h6>
                        <h4 className="text-warning fw-bold animated-counter" data-value={results.tw_base.toFixed(2)}>{formatNumber(results.tw_base.toFixed(2))}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-info bg-opacity-10 text-info rounded-circle mx-auto mb-3">
                          <FaCalculator className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Factor (cars)</h6>
                        <h4 className="text-info fw-bold animated-counter" data-value={factorCar.toFixed(2)}>{formatNumber(factorCar.toFixed(2))}</h4>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-3">
                          <FaCheckCircle className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Cars (after rounding, before visitors)</h6>
                        <h4 className="text-success fw-bold animated-counter" data-value={results.car_req}>{formatNumber(results.car_req)}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-danger bg-opacity-10 text-danger rounded-circle mx-auto mb-3">
                          <FaCheckCircle className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Two-wheelers (after rounding, before visitors)</h6>
                        <h4 className="text-danger fw-bold animated-counter" data-value={results.tw_req}>{formatNumber(results.tw_req)}</h4>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3">
                          <FaUserFriends className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Cars – Final (incl. visitors)</h6>
                        <h4 className="text-primary fw-bold animated-counter" data-value={results.car_total}>{formatNumber(results.car_total)}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-3">
                          <FaUserFriends className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Two-wheelers – Final (incl. visitors)</h6>
                        <h4 className="text-warning fw-bold animated-counter" data-value={results.tw_total}>{formatNumber(results.tw_total)}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-dark bg-opacity-10 text-dark rounded-circle mx-auto mb-3">
                          <FaParking className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Total Parkings</h6>
                        <h4 className="text-dark fw-bold animated-counter" data-value={results.car_total + results.tw_total}>
                          {formatNumber(results.car_total + results.tw_total)}
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5) Total area required for parking */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 animated-card">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">5) Total area required for parking</h5>
                    <p className="text-muted small mb-0">Space needed for vehicle parking</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3">
                          <FaCarSide className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Total area for car parking</h6>
                        <h4 className="text-primary fw-bold animated-counter" data-value={carArea.toFixed(2)}>{formatNumber(carArea.toFixed(2))} sq.m</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-warning bg-opacity-10 text-warning rounded-circle mx-auto mb-3">
                          <FaMotorcycle className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Total area for scooter parking</h6>
                        <h4 className="text-warning fw-bold animated-counter" data-value={scooterArea.toFixed(2)}>{formatNumber(scooterArea.toFixed(2))} sq.m</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 card-hover-lift">
                      <div className="card-body text-center">
                        <div className="icon-shape bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-3">
                          <FaVectorSquare className="me-2" />
                        </div>
                        <h6 className="card-title text-muted fw-semibold mb-3">Total area (car + scooter)</h6>
                        <h4 className="text-success fw-bold animated-counter" data-value={totalArea.toFixed(2)}>{formatNumber(totalArea.toFixed(2))} sq.m</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="alert alert-info rounded-3 border-0 shadow-sm animated-fade">
              <div className="d-flex align-items-center">
                <FaInfoCircle className="me-2 fa-lg" />
                <div>
                  <strong>Rounding rule:</strong> fractions ≥ 0.5 round up; {'<'} 0.5 truncate. 
                  Two-wheeler counts are not multiplied by Table 8C factor (per UDCPR Note vii). 
                  Visitor parking added on the rounded requirement.
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        .ls-1 { letter-spacing: 1px; }
        .card-hover-lift { 
          transition: transform 0.3s ease, box-shadow 0.3s ease; 
          cursor: pointer;
        }
        .card-hover-lift:hover { 
          transform: translateY(-8px); 
          box-shadow: 0 12px 24px rgba(0,0,0,0.12) !important; 
        }
        .form-control:focus { 
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important; 
          border-color: #86b7fe !important; 
        }
        .btn-hover-lift {
          transition: all 0.2s ease;
        }
        .btn-hover-lift:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .btn-hover-lift:active {
          transform: translateY(-1px);
        }
        /* Scrollbar styling for tables */
        .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-responsive::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-responsive::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Enhanced UI Styles */
        .icon-shape {
          width: 56px;
          height: 56px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        
        .table-hover tbody tr {
          transition: background-color 0.2s ease;
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animated-card {
          animation: fadeIn 0.5s ease forwards;
        }
        
        .animated-fade {
          animation: fadeIn 0.3s ease forwards;
        }
        
        /* Counter animation */
        .animated-counter {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default ParkingLogic;