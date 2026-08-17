import React, { useState, useMemo } from 'react';
import { apiUrl } from "@/lib/api-client";
import { FaChartLine, FaSpinner, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const CashflowAnalysis = ({ formData, projectDuration, selectedScenario, dynamicRows }) => {
  const [irrValue, setIrrValue] = React.useState(() => {
    try {
      const raw = localStorage.getItem("irrFormV2");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.calculatedIrr?.[selectedScenario] ?? null;
      }
    } catch {}
    return null;
  });
  const [irrLoading, setIrrLoading] = React.useState(false);
  const [irrError, setIrrError] = React.useState("");
  
  const [currency, setCurrency] = React.useState("₹");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("Land Identification");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.currency) {
          setCurrency(parsed.currency);
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("irrFormV2");
      if (raw) {
        const parsed = JSON.parse(raw);
        setIrrValue(parsed?.calculatedIrr?.[selectedScenario] ?? null);
      } else {
        setIrrValue(null);
      }
    } catch {
      setIrrValue(null);
    }
  }, [selectedScenario]);

  const scenarioData = formData[selectedScenario] || {};

  const revenueRow = dynamicRows.find(r => r.key === "sales_cash_inflow");
  const activeTotalRevenue = revenueRow ? revenueRow.totalAmount : 0;
  const costRows = dynamicRows.filter(r => r.key !== "sales_cash_inflow");

  const yearsArray = Array.from({ length: projectDuration + 1 }, (_, i) => i);

  const calculateYearlyValue = (rowKey, year, totalAmount) => {
    const pct = scenarioData[rowKey]?.[year] || 0;
    return (parseFloat(pct) / 100) * (totalAmount || 0);
  };

  // Build Revenue Data
  const revenueData = useMemo(() => {
    const yearly = yearsArray.map(y => calculateYearlyValue("sales_cash_inflow", y, activeTotalRevenue));
    const total = yearly.reduce((a, b) => a + b, 0);
    return { yearly, total };
  }, [yearsArray, scenarioData, activeTotalRevenue]);

  // Build Cost Data
  const costData = useMemo(() => {
    const rows = costRows.map(row => {
      const yearly = yearsArray.map(y => calculateYearlyValue(row.key, y, row.totalAmount));
      const total = yearly.reduce((a, b) => a + b, 0);
      return { label: row.label, yearly, total };
    });

    const yearlyTotals = yearsArray.map(y => rows.reduce((sum, r) => sum + r.yearly[y], 0));
    const grandTotal = yearlyTotals.reduce((a, b) => a + b, 0);

    return { rows, yearlyTotals, grandTotal };
  }, [yearsArray, scenarioData, costRows]);

  // Build Net Cash Generation
  const netCashData = useMemo(() => {
    const yearly = yearsArray.map(y => revenueData.yearly[y] - costData.yearlyTotals[y]);
    const total = yearly.reduce((a, b) => a + b, 0);
    return { yearly, total };
  }, [yearsArray, revenueData, costData]);

  const calculateIRR = async () => {
    if (netCashData.yearly.length === 0) return;
    setIrrLoading(true);
    setIrrError("");
    setIrrValue(null);

    try {
      const res = await fetch(apiUrl('/new_rate_simulator/simulator/calculate-irr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash_flows: netCashData.yearly,
          project_duration: projectDuration,
        }),
      });

      const data = await res.json();
      if (Array.isArray(data) && data.length === 3 && typeof data[0] === 'number' && !isNaN(data[0])) {
        const val = data[0];
        setIrrValue(val);
        
        try {
          const raw = localStorage.getItem("irrFormV2");
          const parsed = raw ? JSON.parse(raw) : { projectDurations: {}, formData: {} };
          if (!parsed.calculatedIrr) parsed.calculatedIrr = {};
          parsed.calculatedIrr[selectedScenario] = val;
          localStorage.setItem("irrFormV2", JSON.stringify(parsed));
          window.dispatchEvent(new Event('irrFormV2Updated'));
        } catch (e) {
          console.error("Failed to save IRR value to localStorage", e);
        }
      } else {
        setIrrError("Failed to calculate IRR from API response.");
      }
    } catch (err) {
      setIrrError(err.message || "An unexpected error occurred.");
    } finally {
      setIrrLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return "0.00";
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const handleDownloadExcel = () => {
    const wsData = [];
    
    // Header
    wsData.push(["Cashflow Analysis & IRR"]);
    wsData.push([]);
    
    const yearHeaders = yearsArray.map(y => `Year ${y}`);
    
    // Revenue Data
    wsData.push(["REVENUE TYPE", ...yearHeaders, "TOTAL"]);
    wsData.push(["Cashflow", ...revenueData.yearly, revenueData.total]);
    wsData.push(["Total sales in flow", ...revenueData.yearly, revenueData.total]);
    wsData.push([]);
    
    // Cost Data
    wsData.push(["COST TYPE", ...yearHeaders, "TOTAL"]);
    costData.rows.forEach(row => {
      wsData.push([row.label, ...row.yearly, row.total]);
    });
    wsData.push(["Cost of project", ...costData.yearlyTotals, costData.grandTotal]);
    wsData.push([]);
    
    // IRR Data
    wsData.push(["IRR CALCULATION", ...yearHeaders, "TOTAL"]);
    wsData.push(["Net Cash Generation", ...netCashData.yearly, netCashData.total]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashflow & IRR");
    
    XLSX.writeFile(wb, `Cashflow_Analysis_${selectedScenario || 'scenario'}.xlsx`);
  };

  if (!selectedScenario) return null;

  return (
    <div className="mt-5 border-top pt-4">
      <style>{`
        .cf-table-wrap {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          margin-bottom: 24px;
        }
        .cf-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          table-layout: fixed;
        }
        .cf-table th {
          background: #fff;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          text-align: right;
        }
        .cf-table th:first-child {
          text-align: left;
          width: 220px;
        }
        .cf-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #64748b;
          text-align: right;
        }
        .cf-table td:first-child {
          text-align: left;
          font-weight: 600;
          color: #334155;
          width: 220px;
        }
        .cf-table tr:last-child td {
          border-bottom: none;
        }
        .cf-total-row td {
          font-weight: 700 !important;
          color: #0f172a !important;
        }
        .cf-text-green { color: #10b981 !important; }
        .cf-text-dark-green { color: #059669 !important; font-weight: 700 !important; }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h5 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
             <FaChartLine className="text-success" />
             Cashflow Analysis & IRR
           </h5>
           <p className="text-muted small mb-0 mt-1">Yearly projection based on the active scenario's breakdown.</p>
        </div>
        <div className="d-flex gap-2">
           <button onClick={calculateIRR} disabled={irrLoading} className="btn rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', transition: 'all 0.2s' }}>
             {irrLoading ? <FaSpinner className="fa-spin" /> : <FaChartLine />}
             {irrLoading ? "Calculating..." : "Calculate IRR"}
           </button>
           <button onClick={handleDownloadExcel} className="btn rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2" style={{ backgroundColor: '#fff', color: '#10b981', border: '2px solid #10b981', transition: 'all 0.2s' }} title="Download as Excel">
             <FaFileExcel />
             Download Excel
           </button>
        </div>
      </div>
      
      {irrError && <div className="alert alert-danger py-2">{irrError}</div>}
      
      {irrValue !== null && (
        <div className="mb-4 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-4 p-3 d-flex justify-content-between align-items-center shadow-sm">
          <span className="text-success fw-bold text-uppercase" style={{ letterSpacing: "1px", fontSize: "14px" }}>Project Internal Rate of Return (IRR)</span>
          <span className="fw-bolder text-success m-0" style={{ fontSize: "32px", lineHeight: 1 }}>{irrValue.toFixed(2)}%</span>
        </div>
      )}

      {/* REVENUE TYPE TABLE */}
      <div className="cf-table-wrap shadow-sm">
        <div className="table-responsive">
          <table className="cf-table">
            <thead>
              <tr>
                <th>REVENUE TYPE</th>
                {yearsArray.map(y => <th key={y}>Year {y}</th>)}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cashflow</td>
                {revenueData.yearly.map((val, i) => <td key={i}>{currency}{formatCurrency(val)}</td>)}
                <td className="cf-text-green fw-bold">{currency}{formatCurrency(revenueData.total)}</td>
              </tr>
              <tr>
                <td>Total sales in flow</td>
                {revenueData.yearly.map((val, i) => <td key={i}>{currency}{formatCurrency(val)}</td>)}
                <td className="cf-text-green fw-bold">{currency}{formatCurrency(revenueData.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* COST TYPE TABLE */}
      <div className="cf-table-wrap shadow-sm">
        <div className="table-responsive">
          <table className="cf-table">
            <thead>
              <tr>
                <th>COST TYPE</th>
                {yearsArray.map(y => <th key={y}>Year {y}</th>)}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {costData.rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.label}</td>
                  {row.yearly.map((val, i) => <td key={i}>{currency}{formatCurrency(val)}</td>)}
                  <td className="fw-bold" style={{ color: '#0f172a' }}>{currency}{formatCurrency(row.total)}</td>
                </tr>
              ))}
              <tr className="cf-total-row">
                <td className="cf-text-dark-green">Cost of project</td>
                {costData.yearlyTotals.map((val, i) => <td key={i} className="cf-text-dark-green">{currency}{formatCurrency(val)}</td>)}
                <td className="cf-text-dark-green">{currency}{formatCurrency(costData.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* IRR CALCULATION TABLE */}
      <div className="cf-table-wrap shadow-sm">
        <div className="table-responsive">
          <table className="cf-table">
            <thead>
              <tr>
                <th>IRR CALCULATION</th>
                {yearsArray.map(y => <th key={y}>Year {y}</th>)}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cf-total-row">
                <td>Net Cash Generation</td>
                {netCashData.yearly.map((val, i) => <td key={i}>{currency}{formatCurrency(val)}</td>)}
                <td>{currency}{formatCurrency(netCashData.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default CashflowAnalysis;
