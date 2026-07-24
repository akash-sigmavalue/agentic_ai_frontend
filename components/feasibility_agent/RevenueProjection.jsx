import React, { useEffect, useState } from "react";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
import {
  FaArrowLeft,
  FaChartLine,
  FaCalendarAlt,          // replaces far fa-calendar-alt
  FaSyncAlt,
  FaRulerCombined,
  FaBolt,
  FaHardHat,
  FaBalanceScale,
  FaTable,
  FaPrint,
  FaDownload,
  FaChartBar,
  FaListOl,
  FaExclamationCircle,
  FaHome,
  FaBuilding,
  FaChartArea
} from 'react-icons/fa';

const RevenueProjection = () => {
  const [revenueData, setRevenueData] = useState(null);
  const navigate = useNavigate();
  const [projectionSummary, setProjectionSummary] = useState(null);
  const [constructionLogic2, setConstructionLogic2] = useState([]);
  const [timetableState, setTimetableState] = useState(null);
  const [timetableResults, setTimetableResults] = useState(null);
  const [yearlyWeights, setYearlyWeights] = useState(null);
  // Simulator (A5:T23) inputs
  const [simBaseRevenue, setSimBaseRevenue] = useState(100); // C6
  const [simSalesVelocity, setSimSalesVelocity] = useState([
    0.32, 0.2, 0.15, 0.06, 0.07, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0,
  ]); // C8..Q8
  const [simBooking, setSimBooking] = useState([
    0.35, 0.4, 0.6, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  ]); // E15..S15

  // Animation states
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const rev = localStorage.getItem("revenueForm");
      if (rev) setRevenueData(JSON.parse(rev));
    } catch (error) {
      console.error("Failed to load revenue form data", error);
    }

    try {
      const proj = localStorage.getItem("salesVelocityProjectionSummary");
      if (proj) setProjectionSummary(JSON.parse(proj));
    } catch (error) {
      console.error("Failed to load sales velocity projection summary", error);
    }

    try {
      const logic2 = localStorage.getItem("constructionTableLogic2");
      if (logic2) setConstructionLogic2(JSON.parse(logic2));
    } catch (error) {
      console.error("Failed to load construction table logic 2", error);
    }

    try {
      const yw = localStorage.getItem("constructionTableLogic2YearlyWeights");
      if (yw) setYearlyWeights(JSON.parse(yw));
    } catch (error) {
      console.error("Failed to load yearly weights", error);
    }

    try {
      const tState = localStorage.getItem("constructionTimetableState");
      if (tState) setTimetableState(JSON.parse(tState));
      const tResults = localStorage.getItem("constructionTimetableResults");
      if (tResults) setTimetableResults(JSON.parse(tResults));
    } catch (error) {
      console.error("Failed to load construction timetable data", error);
    }

    // Simulate loading delay for better UX
    setTimeout(() => {
      setIsLoading(false);

      // Trigger animations after loading
      if (animationsEnabled) {
        setTimeout(() => {
          animateCounters();
        }, 300);
      }
    }, 800);
  }, []);

  // Refresh animations
  const refreshAnimations = () => {
    setAnimationsEnabled(false);
    setTimeout(() => {
      setAnimationsEnabled(true);
      animateCounters();
    }, 50);
  };

  // Counter animation function
  const animateCounters = () => {
    const counters = document.querySelectorAll('.animated-counter');
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-value');
      if (isNaN(target) || target === 0) return;

      const increment = target / 100;
      let current = 0;

      const updateCounter = () => {
        current += increment;
        if (current < target) {
          counter.innerText = Math.ceil(current).toLocaleString();
          setTimeout(updateCounter, 20);
        } else {
          counter.innerText = target.toLocaleString();
        }
      };

      updateCounter();
    });
  };

  const renderKeyValues = (dataObj) => {
    if (!dataObj || typeof dataObj !== "object") return null;
    return (
      <div className="table-responsive rounded-3 border bg-white">
        <table className="table table-hover mb-0 align-middle">
          <thead className="bg-light text-secondary">
            <tr>
              <th className="py-2 px-3 fw-semibold small text-uppercase" style={{ width: "40%", letterSpacing: "0.5px" }}>Metric</th>
              <th className="py-2 px-3 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(dataObj).map(([k, v]) => (
              <tr key={k}>
                <td className="py-2 px-3 text-dark fw-medium">{k.replace(/_/g, ' ')}</td>
                <td className="py-2 px-3 text-end fw-bold text-dark">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAreaRateSummary = () => {
    if (!revenueData || typeof revenueData !== "object") return null;
    const getVal = (...keys) => {
      for (const k of keys) {
        if (revenueData[k] !== undefined && revenueData[k] !== null && revenueData[k] !== "") {
          return revenueData[k];
        }
      }
      return null;
    };

    const residentialRate = getVal("residentialRate", "residential_rate", "resRate");
    const commercialRate = getVal("commercialRate", "commercial_rate", "comRate");
    const carpetArea = getVal("carpetArea", "carpet_area", "carpet");
    const saleableArea = getVal("saleableArea", "saleable_area", "saleable");

    const rows = [
      { label: "Residential Rate", value: residentialRate, icon: <FaHome className="me-2 text-secondary opacity-75" style={{ color: '#448C74' }} /> },
      { label: "Commercial Rate", value: commercialRate, icon: <FaBuilding className="me-2 text-secondary opacity-75" style={{ color: '#448C74' }} /> },
      { label: "Carpet Area", value: carpetArea, icon: <FaRulerCombined className="me-2 text-secondary opacity-75" style={{ color: '#448C74' }} /> },
      { label: "Saleable Area", value: saleableArea, icon: <FaChartArea className="me-2 text-secondary opacity-75" style={{ color: '#448C74' }} /> },
    ].filter(r => r.value !== null && r.value !== undefined && r.value !== "");

    if (!rows.length) return null;

    return (
      <div className="table-responsive rounded-3 border bg-white mb-3 interactive-summary-table">
        <table className="table table-hover mb-0 align-middle">
          <thead className="bg-light text-dark">
            <tr>
              <th className="py-2 px-3 fw-semibold small text-uppercase" style={{ width: "40%", letterSpacing: "0.5px" }}>Category</th>
              <th className="py-2 px-3 fw-semibold small text-uppercase text-end" style={{ letterSpacing: "0.5px" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="interactive-summary-row">
                <td className="py-2 px-3 text-dark fw-medium">
                  {r.icon}
                  {r.label}
                </td>
                <td className="py-2 px-3 text-end fw-bold text-dark interactive-summary-value">{String(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const toNumber = (val) => {
    if (val === undefined || val === null || val === "") return 0;
    if (typeof val === "number") return val;
    const cleaned = String(val).replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getSaleableArea = () => {
    if (!revenueData) return null;
    const saleable = revenueData.saleableArea ?? revenueData.saleable_area ?? revenueData.saleable;
    const num = toNumber(saleable);
    return num > 0 ? num : null;
  };

  const quarterDiffInclusive = (startDate, endDate) => {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) return null;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    if (endDate < startDate) return null;
    const qIndex = (d) => d.getFullYear() * 4 + Math.floor(d.getMonth() / 3);
    return qIndex(endDate) - qIndex(startDate) + 1;
  };

  const getQuartersBySalesVelocity = () => {
    const entries = projectionSummary?.quarterVelocityMap
      ? Object.keys(projectionSummary.quarterVelocityMap)
      : projectionSummary?.projectionTable?.map((r) => r.Quarter) || [];
    const uniq = Array.from(new Set(entries.filter(Boolean)));
    return uniq.length || null;
  };

  const quarterLabelToIndex = (label) => {
    if (!label || typeof label !== "string") return null;
    const match =
      label.match(/Q([1-4])\s*[- ]\s*(\d{4})/) || // Q1-2027
      label.match(/(\d{4})\s*[- ]\s*Q([1-4])/) || // 2027-Q1
      label.match(/(\d{4})\s*Q([1-4])/) || // 2027Q1
      label.match(/Q([1-4])(\d{4})/); // Q12027
    if (!match) return null;
    const quarter = Number(match[1] || match[2]);
    const year = Number(match[2] || match[1]);
    if (!year || !quarter) return null;
    return year * 4 + (quarter - 1);
  };

  const getSalesVelocityYearSpan = () => {
    const quarters =
      projectionSummary?.quarterVelocityMap
        ? Object.keys(projectionSummary.quarterVelocityMap)
        : projectionSummary?.projectionTable?.map((r) => r.Quarter) || [];
    const idxs = quarters
      .map(quarterLabelToIndex)
      .filter((n) => Number.isInteger(n));
    if (!idxs.length) return null;
    const minIdx = Math.min(...idxs);
    const maxIdx = Math.max(...idxs);
    const quarterSpan = maxIdx - minIdx + 1;
    return quarterSpan > 0 ? quarterSpan / 4 : null;
  };

  const getQuartersByConstruction = () => {
    if (!timetableState) return null;
    if (timetableState.mode === "auto") {
      const startStr = timetableState.formData?.startDate;
      if (!startStr || !timetableResults) return null;
      const start = new Date(startStr);
      const low = toNumber(timetableResults.low);
      const high = toNumber(timetableResults.high);
      if (!low && !high) return null;
      const meanDays = Math.round((low + high) / 2 || 0);
      if (!meanDays) return null;
      const end = new Date(start);
      end.setDate(end.getDate() + meanDays);
      return quarterDiffInclusive(start, end);
    }
    // manual mode
    const startStr = timetableState.manualDates?.startDate;
    const endStr = timetableState.manualDates?.endDate;
    if (!startStr || !endStr) return null;
    return quarterDiffInclusive(new Date(startStr), new Date(endStr));
  };

  const saleableAreaVal = getSaleableArea();
  const quartersByVelocity = getQuartersBySalesVelocity();
  const yearsByVelocity = getSalesVelocityYearSpan();
  const perYearSaleable =
    saleableAreaVal && yearsByVelocity ? saleableAreaVal / yearsByVelocity : null;
  const quartersByConstruction = getQuartersByConstruction();

  // Get start year from construction timetable
  const getProjectStartYear = () => {
    try {
      if (timetableState) {
        if (timetableState.mode === "auto" && timetableState.formData?.startDate) {
          const startDate = new Date(timetableState.formData.startDate);
          if (!isNaN(startDate.getTime())) {
            return startDate.getFullYear();
          }
        }
        if (timetableState.manualDates?.startDate) {
          const startDate = new Date(timetableState.manualDates.startDate);
          if (!isNaN(startDate.getTime())) {
            return startDate.getFullYear();
          }
        }
      }
    } catch (error) {
      console.error("Failed to get project start year:", error);
    }
    // Fallback to current year
    return new Date().getFullYear();
  };

  const projectStartYear = getProjectStartYear();

  // Extract year from quarter label
  const extractYearFromQuarter = (label) => {
    if (!label || typeof label !== "string") return null;
    const match =
      label.match(/Q([1-4])\s*[- ]\s*(\d{4})/) || // Q1-2027
      label.match(/(\d{4})\s*[- ]\s*Q([1-4])/) || // 2027-Q1
      label.match(/(\d{4})\s*Q([1-4])/) || // 2027Q1
      label.match(/Q([1-4])(\d{4})/); // Q12027
    if (!match) return null;
    const year = Number(match[2] || match[1]);
    return Number.isInteger(year) && year > 0 ? year : null;
  };

  const enforceCumulativeCap = (values) => {
    let cumulative = 0;
    return values.map((val) => {
      const current = Number.isFinite(val) ? val : 0;
      const remaining = Math.max(0, 1 - cumulative);
      const adjusted = Math.min(current, remaining);
      cumulative += adjusted;
      return adjusted;
    });
  };

  // Update simSalesVelocity when projectionSummary or projectStartYear changes
  useEffect(() => {
    if (!projectionSummary) return;

    // Get quarter velocity map or projection table
    const quarterMap = projectionSummary.quarterVelocityMap || {};
    const projectionTable = projectionSummary.projectionTable || [];

    // Build a map of year -> sum of velocities
    const yearVelocityMap = {};

    // Process quarterVelocityMap if available
    if (Object.keys(quarterMap).length > 0) {
      Object.entries(quarterMap).forEach(([quarterLabel, velocity]) => {
        const year = extractYearFromQuarter(quarterLabel);
        if (year !== null) {
          const velocityNum = typeof velocity === "number" ? velocity : parseFloat(velocity) || 0;
          // Divide by 100 to convert from percentage to decimal
          yearVelocityMap[year] = (yearVelocityMap[year] || 0) + (velocityNum / 100);
        }
      });
    } else if (projectionTable.length > 0) {
      // Process projectionTable
      projectionTable.forEach((row) => {
        const quarterLabel = row.Quarter || row["Quarter"];
        const velocity = row["Predicted Velocity %"] || 0;
        const year = extractYearFromQuarter(quarterLabel);
        if (year !== null) {
          const velocityNum = typeof velocity === "number" ? velocity : parseFloat(velocity) || 0;
          // Divide by 100 to convert from percentage to decimal
          yearVelocityMap[year] = (yearVelocityMap[year] || 0) + (velocityNum / 100);
        }
      });
    }

    // Map to 15 years starting from projectStartYear
    const yearlyVelocities = Array.from({ length: 15 }, (_, i) => {
      const year = projectStartYear + i;
      return yearVelocityMap[year] || 0;
    });

    setSimSalesVelocity(enforceCumulativeCap(yearlyVelocities));
  }, [projectionSummary, projectStartYear]);

  // Update simBooking based on yearlyWeights (Construction Table Logic 2)
  useEffect(() => {
    if (!yearlyWeights) return;

    const newBooking = [];
    let cumulative = 0;

    for (let i = 0; i < 15; i++) {
      const year = projectStartYear + i;
      const weight = yearlyWeights[year] || 0;
      // weight is in percentage (e.g., 15 for 15%), convert to decimal if needed or keep as is?
      // simBooking seems to use 0-1 range (e.g. 0.35, 1.0) based on default state.

      cumulative += weight;

      // Convert percentage (0-100) to decimal (0-1)
      const val = cumulative / 100;

      // Cap at 1.0
      newBooking.push(Math.min(val, 1.0));
    }

    setSimBooking(newBooking);
  }, [yearlyWeights, projectStartYear]);

  // Update simBaseRevenue based on revenueForm data
  useEffect(() => {
    if (revenueData && revenueData.revenue) {
      const val = parseFloat(revenueData.revenue);
      if (!isNaN(val)) {
        setSimBaseRevenue(val);
      }
    }
  }, [revenueData]);

  // ----- Simulator calculations (A5:T23 replica) -----
  const simSalesYearly = simSalesVelocity.slice(0, 15); // row 13 E..S

  // row16-row20 partials using first 5 booking values (E..J)
  const simRow16 = (() => {
    const F = simBooking[1] ?? 0;
    const G = simBooking[2] ?? 0;
    const H = simBooking[3] ?? 0;
    const I = simBooking[4] ?? 0;
    const J = simBooking[5] ?? 0;
    return [
      null,
      F - (simBooking[0] ?? 0),
      G - F,
      H - G,
      I - H,
      J - I,
    ];
  })();
  const simRow17 = (() => {
    const F = simBooking[1] ?? 0;
    const G = simBooking[2] ?? 0;
    const H = simBooking[3] ?? 0;
    const I = simBooking[4] ?? 0;
    const J = simBooking[5] ?? 0;
    return [null, null, G - F, H - G, I - H, J - I];
  })();
  const simRow18 = (() => {
    const [, , , H17, I17, J17] = simRow17;
    return [null, null, null, H17, I17, J17];
  })();
  const simRow19 = (() => {
    const [, , , , I18, J18] = simRow18;
    return [null, null, null, null, I18, J18];
  })();
  const simRow20 = (() => {
    const [, , , , , J19] = simRow19;
    return [null, null, null, null, null, J19];
  })();

  const simActualSold = simSalesYearly.map((v) => simBaseRevenue * v); // row21

  const simRevenueBooking = (() => {
    const out = [];
    for (let i = 0; i < simSalesYearly.length; i++) {
      const prevBooking = i === 0 ? 0 : simBooking[i - 1];
      const delta = simBooking[i] - prevBooking;
      if (Math.abs(delta) < 1e-9) {
        out.push(simActualSold[i]);
      } else {
        const sumPrevSales = simSalesYearly.slice(0, i).reduce((a, b) => a + b, 0);
        const val = simActualSold[i] * simBooking[i] + delta * simBaseRevenue * sumPrevSales;
        out.push(val);
      }
    }
    return out;
  })();

  const renderSimTable = () => {
    // Determine how many columns to show based on cumulative 100% cap
    const cumulativeCapIndex = (() => {
      let cumulative = 0;
      for (let i = 0; i < simSalesYearly.length; i++) {
        cumulative += Number.isFinite(simSalesYearly[i]) ? simSalesYearly[i] : 0;
        if (cumulative >= 1) {
          return i; // inclusive index where we hit 100%
        }
      }
      return simSalesYearly.length - 1; // default show all
    })();

    const visibleCount = Math.min(simSalesYearly.length, (cumulativeCapIndex ?? simSalesYearly.length - 1) + 1);
    const yearHeaders = Array.from({ length: visibleCount }, (_, i) => projectStartYear + i);

    const sliceToVisible = (arr) => arr.slice(0, visibleCount);
    const renderRow = (label, values, isSuccess = false) => (
      <tr className={isSuccess ? "table-success" : ""}>
        <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10, minWidth: '280px' }}>
          {label}
        </td>
        {yearHeaders.map((_, idx) => {
          const v = values[idx] ?? "";
          return <td key={idx} className="text-end text-muted font-monospace bg-white">{v === "" || v === null ? "" : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>;
        })}
      </tr>
    );

    return (
      <div className="table-responsive border rounded-3 bg-white shadow-sm interactive-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table className="table table-bordered table-hover mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
          <thead className="bg-light sticky-top" style={{ zIndex: 20 }}>
            <tr>
              <th className="bg-light border-end sticky-col p-3 shadow-sm text-center" style={{ position: 'sticky', left: 0, zIndex: 30, minWidth: '280px' }}>
                <span className="fw-bold text-dark text-uppercase small ls-1">Metrics / Years</span>
              </th>
              {yearHeaders.map((y) => (
                <th key={y} className="text-center py-3 px-2 bg-light text-secondary fw-bold shadow-sm interactive-header" style={{ minWidth: '100px' }}>{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="interactive-row">
              <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                Revenue on saleable area (C6)
              </td>
              <td colSpan={visibleCount} className="bg-white p-2">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-0 fw-bold text-muted">₹</span>
                  <input
                    type="number"
                    className="form-control form-control-sm text-end border-0 bg-light fw-bold text-dark fs-6 interactive-input"
                    value={simBaseRevenue}
                    onChange={(e) => setSimBaseRevenue(Number(e.target.value) || 0)}
                    style={{ boxShadow: 'none' }}
                  />
                </div>
              </td>
            </tr>

            {/* Row 7: Year */}
            <tr className="interactive-row">
              <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                Year (row 7)
              </td>
              {yearHeaders.map((y) => (
                <td key={y} className="text-center fw-bold text-primary bg-light interactive-cell">{y}</td>
              ))}
            </tr>

            {/* Row 8: Sales Velocity */}
            <tr className="interactive-row">
              <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                Sales Velocity % (row 8)
              </td>
              {sliceToVisible(simSalesYearly).map((v, idx) => (
                <td key={idx} className="p-1 interactive-cell">
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm text-center border-0 fw-semibold text-primary interactive-input"
                    value={(Number.isFinite(v) ? v * 100 : 0).toFixed(2)}
                    onChange={(e) => {
                      const next = [...simSalesVelocity];
                      next[idx] = (Number(e.target.value) || 0) / 100;
                      setSimSalesVelocity(enforceCumulativeCap(next));
                    }}
                    style={{ backgroundColor: 'rgba(var(--bs-primary-rgb), 0.05)' }}
                  />
                </td>
              ))}
            </tr>

            {/* Row 11: Projections 
            <tr className="interactive-row">
              <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                Projections (Years) (row 11)
              </td>
              {yearHeaders.map((y) => (
                <td key={y} className="text-center fw-bold text-secondary bg-light">{y}</td>
              ))}
            </tr>
*/}

            {/* Row 13: From Sales Velocity */}
            <tr className="interactive-row">
              <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                From Sales Velocity (row 13)
              </td>
              {sliceToVisible(simSalesYearly).map((val, idx) => (
                <td key={idx} className="text-end text-muted font-monospace bg-white interactive-cell">
                  {val ? (val * 100).toFixed(2) + '%' : '-'}
                </td>
              ))}
            </tr>

            {/* Row 15: Booking Schedule */}
            <tr className="interactive-row">
              <td className="fw-semibold text-start text-dark bg-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                Booking Schedule (row 15)
              </td>
              {sliceToVisible(simBooking).map((v, idx) => (
                <td key={idx} className="p-1 interactive-cell">
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control form-control-sm text-center border-0 fw-semibold text-success interactive-input"
                    value={v}
                    onChange={(e) => {
                      const next = [...simBooking];
                      next[idx] = Number(e.target.value) || 0;
                      setSimBooking(next);
                    }}
                    style={{ backgroundColor: 'rgba(var(--bs-success-rgb), 0.05)' }}
                  />
                </td>
              ))}
            </tr>

            {/* Row 22: Revenue based on booking */}
            <tr className="interactive-row">
              <td className="fw-bold text-start text-white border-end shadow-sm sticky-col" style={{ position: 'sticky', left: 0, zIndex: 10, background: 'linear-gradient(135deg, #166942ff 0%, #54995dff 100%)' }}>
                Revenue based on booking schedule (row 22)
              </td>
              {sliceToVisible(simRevenueBooking).map((val, idx) => (
                <td key={idx} className="text-end fw-bold font-monospace text-dark interactive-revenue-cell" style={{ backgroundColor: '#f0f9ff' }}>
                  {val ? Math.round(val).toLocaleString('en-IN') : '-'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Export data to CSV
  const exportToCSV = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add headers
    csvContent += "Metric,Value\\n";

    // Add key metrics
    csvContent += `Saleable Area,${saleableAreaVal || "N/A"}\\n`;
    csvContent += `Sales Velocity Duration,${quartersByVelocity || "N/A"} Quarters\\n`;
    csvContent += `Construction Duration,${quartersByConstruction || "N/A"} Quarters\\n`;
    csvContent += `Total Years (Sales Velocity),${yearsByVelocity || "N/A"}\\n`;
    csvContent += `Per Year Saleable,${perYearSaleable || "N/A"}\\n`;

    // Add simulator data
    csvContent += "\\nSimulator Data\\n";
    csvContent += "Year,";
    for (let i = 0; i < 15; i++) {
      csvContent += `${projectStartYear + i}${i < 14 ? "," : ""}`;
    }
    csvContent += "\\n";

    csvContent += "Sales Velocity %,";
    for (let i = 0; i < simSalesVelocity.length; i++) {
      csvContent += `${(simSalesVelocity[i] * 100).toFixed(2)}${i < simSalesVelocity.length - 1 ? "," : ""}`;
    }
    csvContent += "\\n";

    csvContent += "Booking Schedule,";
    for (let i = 0; i < simBooking.length; i++) {
      csvContent += `${simBooking[i].toFixed(4)}${i < simBooking.length - 1 ? "," : ""}`;
    }
    csvContent += "\\n";

    csvContent += "Revenue Based on Booking,";
    for (let i = 0; i < simRevenueBooking.length; i++) {
      csvContent += `${Math.round(simRevenueBooking[i]).toLocaleString()}${i < simRevenueBooking.length - 1 ? "," : ""}`;
    }

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `revenue_projection_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Preparing your revenue projection dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f3f5f9", fontFamily: "'Inter', sans-serif" }}>
      <main className="container-fluid py-5 px-4">

        {/* Header Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 pb-3 border-bottom border-2" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div>
            <div className="d-flex align-items-center mb-2">
              <button className="btn btn-outline-secondary btn-sm me-3 shadow-sm rounded-pill px-3" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-1" /> Back
              </button>
              <h1 className="display-6 fw-bold text-dark mb-0">
                <FaChartLine className="text-primary me-3" />Revenue Projection
              </h1>
            </div>
            <p className="text-secondary mb-0 ms-1 fw-medium text-dark">Consolidated financial analysis and revenue forecasting model.</p>
          </div>
          <div className="d-flex align-items-center mt-3 mt-md-0">
            <button
              className="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm me-3"
              onClick={() => navigate('/revenuep2')}
            >
              Revenue Projections Logic 2
            </button>
            <div className="badge bg-white text-dark shadow-sm px-3 py-2 border rounded-pill me-3">
             <FaCalendarAlt className="me-2 text-primary" />
              Project Start: <span className="fw-bold">{projectStartYear}</span>
            </div>
            <button
              className="btn btn-outline-primary btn-sm rounded-pill px-3 interactive-btn pulse-animation"
              onClick={refreshAnimations}
              title="Refresh Animations"
            >
              <FaSyncAlt className="me-1" /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="row g-4 mb-5 fade-in-up">
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden card-hover-lift interactive-card">
              <div className="card-body p-4 position-relative">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-uppercase text-muted fw-bold small mb-2" style={{ letterSpacing: '1px' }}>Saleable Area</p>
                    <h3 className="fw-bold text-dark mb-0 animated-counter" data-value={saleableAreaVal ? saleableAreaVal : 0}>{saleableAreaVal ? saleableAreaVal.toLocaleString() : "N/A"}</h3>
                    <small className="text-muted">sq. ft.</small>
                  </div>
                  <div className="icon-shape bg-primary bg-opacity-10 text-primary rounded-3 p-3 interactive-icon">
                    <FaRulerCombined className="fa-lg" />
                  </div>
                </div>
                <div className="card-hover-effect"></div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden card-hover-lift interactive-card">
              <div className="card-body p-4 position-relative">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-uppercase text-muted fw-bold small mb-2" style={{ letterSpacing: '1px' }}>Sales Velocity Duration</p>
                    <h3 className="fw-bold text-dark mb-0 animated-counter" data-value={quartersByVelocity ?? 0}>{quartersByVelocity ?? "N/A"}</h3>
                    <small className="text-muted">Quarters</small>
                  </div>
                  <div className="icon-shape bg-info bg-opacity-10 text-info rounded-3 p-3 interactive-icon">
                    <FaBolt className="fa-lg" />
                  </div>
                </div>
                <div className="card-hover-effect"></div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden card-hover-lift interactive-card">
              <div className="card-body p-4 position-relative">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-uppercase text-muted fw-bold small mb-2" style={{ letterSpacing: '1px' }}>Construction Duration</p>
                    <h3 className="fw-bold text-dark mb-0 animated-counter" data-value={quartersByConstruction ?? 0}>{quartersByConstruction ?? "N/A"}</h3>
                    <small className="text-muted">Quarters</small>
                  </div>
                  <div className="icon-shape bg-success bg-opacity-10 text-success rounded-3 p-3 interactive-icon">
                    <FaHardHat className="fa-lg" />
                  </div>
                </div>
                <div className="card-hover-effect"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">

          {/* Revenue breakdown */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                <h5 className="fw-bold text-dark mb-1">Detailed Revenue Breakdown</h5>
                <p className="text-muted small">Input metrics sourced from saved data.</p>
              </div>
              <div className="card-body p-4">
                <h6 className="text-uppercase text-muted fw-bold small mb-3 ls-1">Project Metrics</h6>
                <div className="table-responsive rounded-3 border bg-white mb-4">
                  <table className="table table-hover mb-0 align-middle">
                    <tbody>
                      <tr>
                        <td className="py-2 px-3 text-secondary fw-medium text-dark">Total years (sales velocity)</td>
                        <td className="py-2 px-3 text-end fw-bold text-dark">{yearsByVelocity ? yearsByVelocity.toFixed(2) : "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-secondary fw-medium text-dark">Per year saleable</td>
                        <td className="py-2 px-3 text-end fw-bold text-dark">{perYearSaleable ? perYearSaleable.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h6 className="text-uppercase text-muted fw-bold small mb-3 ls-1">Revenue Data</h6>
                {revenueData ? (
                  <>
                    {renderAreaRateSummary() || <div className="alert alert-light text-center border-0 small text-muted">No rate/area fields found.</div>}
                  </>
                ) : (
                  <div className="alert alert-light text-center border-0 small text-muted">No saved revenue data found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Year-wise Weightage */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold text-dark mb-1">Construction Weightage</h5>
                  <p className="text-muted small mb-0">Year-wise distribution calculated from Logic 2.</p>
                </div>
                <div className="icon-shape bg-warning bg-opacity-10 text-warning rounded-circle p-2">
                  <FaBalanceScale className="me-1" />
                </div>
              </div>
              <div className="card-body p-4">
                {yearlyWeights ? (
                  <div className="table-responsive rounded-3 border border-light">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th className="py-3 px-4 fw-bold text-secondary text-uppercase small" style={{ width: "30%" }}>Year</th>
                          <th className="py-3 px-4 fw-bold text-secondary text-uppercase small">Weightage</th>
                          <th className="py-3 px-4 fw-bold text-secondary text-uppercase small text-end">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(yearlyWeights)
                          .sort(([y1], [y2]) => Number(y1) - Number(y2))
                          .map(([year, weight]) => (
                            <tr key={year}>
                              <td className="px-4 fw-bold text-dark">{year}</td>
                              <td className="px-4">
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1 me-3" style={{ height: '6px' }}>
                                    <div className="progress-bar bg-info" role="progressbar" style={{ width: `${weight}%` }}></div>
                                  </div>
                                  <span className="fw-bold text-dark">{weight.toFixed(2)}%</span>
                                </div>
                              </td>
                              <td className="px-4 text-end">
                                <span className="badge bg-light text-success border border-success px-2 py-1 rounded-pill">Active</span>
                              </td>
                            </tr>
                          ))}
                        <tr className="bg-warning bg-opacity-10">
                          <td className="px-4 fw-bold text-dark">Total</td>
                          <td className="px-4 fw-bold text-dark">
                            {Object.values(yearlyWeights)
                              .reduce((acc, val) => acc + val, 0)
                              .toFixed(2)}%
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                    <FaExclamationCircle className="fa-2x mb-3 text-secondary opacity-50" />
                    <p>No year-wise weightage data found.</p>
                    <small>Save Logic 2 in Construction Table to populate this view.</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real Estate Revenue Simulator */}
        <div className="card border-0 shadow-lg rounded-4 my-5 overflow-hidden interactive-card fade-in-up delay-2">
          <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, var(--title-cyan) 0%, var(--highlight-cyan) 100%)' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h4 className="fw-bold mb-1"><FaTable className="me-2" />Real Estate Revenue Simulator</h4>
                <p className="mb-0 text-black small">Interactive financial model replicating Excel block</p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-light text-primary fw-bold shadow-sm interactive-btn" onClick={() => window.print()}>
                  <FaPrint className="me-2" />Print Report
                </button>
                <button className="btn btn-sm btn-dark fw-bold shadow-sm interactive-btn" onClick={exportToCSV}>
                  <FaDownload className="me-2" />Export Data
                </button>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {renderSimTable()}
          </div>
        </div>

        {/* Projection Data & Logic 2 (Collapsed/Secondary) */}
        <div className="row g-4">
          <div className="col-12">
            <div className="accordion shadow-sm rounded-4 overflow-hidden" id="accordionSecondaryTables">

              {/* Projection Table Item */}
              <div className="accordion-item border-0">
                <h2 className="accordion-header" id="headingProjection">
                  <button className="accordion-button collapsed fw-bold bg-white text-dark py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseProjection">
                    <FaChartBar className="me-2 text-info" /> Subject Projection Table
                  </button>
                </h2>
                <div id="collapseProjection" className="accordion-collapse collapse" data-bs-parent="#accordionSecondaryTables">
                  <div className="accordion-body bg-light">
                    {projectionSummary?.projectionTable?.length ? (
                      <div className="table-responsive bg-white rounded-3 shadow-sm border p-3">
                        <table className="table table-hover table-sm mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Quarter</th>
                              <th>Predicted Velocity %</th>
                              <th>Predicted Units</th>
                              <th>Cumulative Sold</th>
                              <th>Remaining Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectionSummary.projectionTable.map((row, idx) => (
                              <tr key={`proj-${idx}`}>
                                <td>{row["Quarter"]}</td>
                                <td>{row["Predicted Velocity %"]}</td>
                                <td>{row["Predicted Units"]}</td>
                                <td>{row["Cumulative Sold"]}</td>
                                <td>{row["Remaining Units"]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-light border text-muted">No saved projection table found.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Logic 2 Table Item */}
              <div className="accordion-item border-0 border-top">
                <h2 className="accordion-header" id="headingLogic2">
                  <button className="accordion-button collapsed fw-bold bg-white text-dark py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseLogic2">
                    <FaListOl className="me-2 text-warning" /> Construction Schedule (Logic 2)
                  </button>
                </h2>
                <div id="collapseLogic2" className="accordion-collapse collapse" data-bs-parent="#accordionSecondaryTables">
                  <div className="accordion-body bg-light">
                    {constructionLogic2?.length ? (
                      <div className="table-responsive bg-white rounded-3 shadow-sm border p-3">
                        <table className="table table-hover table-sm mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Stage</th>
                              <th>Weightage %</th>
                              <th>Year-Quarter (multi-select)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {constructionLogic2.map((row, idx) => (
                              <tr key={`logic2-${idx}`}>
                                <td>{row["Stage"]}</td>
                                <td>{row["Weightage %"]}</td>
                                <td>{row["Year-Quarter (multi-select)"]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-light border text-muted">No saved Construction Table Logic 2 data found.</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>

      <style>{`
        .ls-1 { letter-spacing: 1px; }
        .card-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .sticky-col { position: sticky; left: 0; background-clip: padding-box; }
        .form-control:focus { box-shadow: none; border-bottom: 2px solid var(--bs-primary) !important; background-color: #fff; }
        /* Scrollbar styling for tables */
        .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
        .table-responsive::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-responsive::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        
        /* Enhanced UI Styles */
        .interactive-card {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05) !important;
        }
        
        .interactive-card:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: 0.5s;
        }
        
        .interactive-card:hover:before {
          left: 100%;
        }
        
        .interactive-icon {
          transition: all 0.3s ease;
          transform: scale(1);
        }
        
        .interactive-card:hover .interactive-icon {
          transform: scale(1.1);
          filter: brightness(1.2);
        }
        
        .card-hover-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        
        .interactive-card:hover .card-hover-effect {
          opacity: 1;
        }
        
        .interactive-btn {
          transition: all 0.2s ease;
          transform: translateY(0);
        }
        
        .interactive-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        }
        
        .interactive-btn:active {
          transform: translateY(0);
        }
        
        .accordion-button:not(.collapsed) {
          background-color: #f8f9fa;
          color: var(--bs-primary);
          font-weight: 600;
        }
        
        .accordion-button::after {
          transition: transform 0.2s ease;
        }
        
        .accordion-button:not(.collapsed)::after {
          transform: rotate(90deg);
        }
        
        .table-hover tbody tr {
          transition: background-color 0.2s ease;
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        .progress {
          transition: all 0.3s ease;
        }
        
        .progress-bar {
          transition: width 0.5s ease-in-out;
        }
        
        .interactive-table-container {
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .interactive-header, .interactive-cell, .interactive-revenue-cell {
          transition: all 0.2s ease;
        }
        
        .interactive-row:hover .interactive-cell, 
        .interactive-row:hover .interactive-revenue-cell {
          background-color: rgba(0,0,0,0.02) !important;
        }
        
        .interactive-input:focus {
          transform: scale(1.02);
          box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25) !important;
        }
        
        .interactive-summary-row:hover {
          background-color: rgba(0,0,0,0.02);
        }
        
        .interactive-summary-value {
          transition: all 0.2s ease;
        }
        
        .interactive-summary-row:hover .interactive-summary-value {
          transform: translateX(5px);
          font-weight: 800 !important;
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
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .fade-in-up {
          animation: fadeInUp 0.5s ease forwards;
        }
        
        .delay-1 {
          animation-delay: 0.1s;
        }
        
        .delay-2 {
          animation-delay: 0.2s;
        }
        
        .delay-3 {
          animation-delay: 0.3s;
        }
        
        .animated-counter {
          position: relative;
        }
        
        .animated-counter::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--bs-primary), var(--bs-info));
          transition: width 1s ease;
        }
        
        .interactive-card:hover .animated-counter::after {
          width: 100%;
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );

};

export default RevenueProjection;