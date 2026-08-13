/**
 * FinanceCostCalculatorModal.jsx
 *
 * A full Finance Cost Calculator modal, porting term_loan_schedule_app.py
 * to Next.js + FastAPI. Opened from the Finance Cost field in CostOfProjectDetails.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes, FaSync, FaCalculator, FaDownload, FaCheckCircle,
  FaExclamationTriangle, FaChevronDown, FaMoneyBillWave,
} from "react-icons/fa";
import { apiUrl } from "@/lib/api-client";

// ─── Constants ──────────────────────────────────────────────────────────────

const UNIT_MULTIPLIERS = {
  "Cr":            10000000,
  "Mil":           1000000,
  "Lakhs":         100000,
  "Actual amount": 1,
};
const CURRENCIES = ["INR", "USD", "AED"];
const UNITS      = ["Actual amount", "Lakhs", "Mil", "Cr"];

const fmt = (val, decimals = 2) => {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const MODAL_CSS = `
.fcc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px}
.fcc-modal{background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.22);width:100%;max-width:1100px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}
.fcc-header{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;border-bottom:1px solid #f1f3f5;background:linear-gradient(135deg,#f8fafc,#fff);flex-shrink:0}
.fcc-body{overflow-y:auto;padding:24px 28px;flex:1}
.fcc-footer{padding:16px 28px;border-top:1px solid #f1f3f5;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:12px}
.fcc-section{background:#f8fafc;border:1px solid #e9ecef;border-radius:14px;padding:20px 22px;margin-bottom:20px}
.fcc-section-title{font-size:13px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#868e96;margin-bottom:16px}
.fcc-label{font-size:12px;font-weight:600;color:#495057;margin-bottom:5px;display:block}
.fcc-input,.fcc-select{width:100%;border:1.5px solid #dee2e6;border-radius:10px;padding:9px 13px;font-size:13px;font-weight:600;color:#1e293b;background:#fff;transition:border-color .2s;outline:none}
.fcc-input:focus,.fcc-select:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.08)}
.fcc-kpi-card{background:#fff;border:1px solid #e9ecef;border-radius:14px;padding:18px 20px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.fcc-kpi-label{font-size:11px;font-weight:700;color:#868e96;letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px}
.fcc-kpi-value{font-size:20px;font-weight:800;color:#1e293b}
.fcc-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:30px;font-weight:700;font-size:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,.35);transition:all .2s}
.fcc-btn-primary:hover:not(:disabled){transform:translateY(-1px)}
.fcc-btn-primary:disabled{opacity:.6;cursor:not-allowed}
.fcc-btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:30px;font-weight:600;font-size:13px;border:1.5px solid #dee2e6;cursor:pointer;background:#fff;color:#495057;transition:all .2s}
.fcc-btn-secondary:hover{background:#f8fafc;border-color:#10b981;color:#059669}
.fcc-table-wrap{border-radius:12px;overflow:auto;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.04);max-height:340px}
.fcc-table{width:100%;border-collapse:collapse;font-size:12.5px}
.fcc-table thead th{padding:11px 14px;background:#f8fafc;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#475569;border-bottom:2px solid #cbd5e1;white-space:nowrap;position:sticky;top:0;z-index:1}
.fcc-table tbody td{padding:7px 14px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}
.fcc-table tbody tr:hover td{background:#f0fdf4}
.fcc-table tbody tr:last-child td{border-bottom:none}
.fcc-table-input{border:1.5px solid #e2e8f0;border-radius:8px;padding:5px 8px;font-size:12px;font-weight:600;width:110px;text-align:right;color:#1e293b;background:#fff;transition:border-color .2s}
.fcc-table-input:focus{border-color:#10b981;outline:none;box-shadow:0 0 0 2px rgba(16,185,129,.1)}
.fcc-warn{background:linear-gradient(to right,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:12.5px;color:#92400e;display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}
.fcc-pill-toggle{display:flex;background:#f1f5f9;border-radius:30px;padding:3px;gap:2px}
.fcc-pill-opt{padding:6px 16px;border-radius:30px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;background:transparent;color:#64748b}
.fcc-pill-opt.active{background:#fff;color:#059669;box-shadow:0 2px 6px rgba(0,0,0,.1)}
.fcc-expander{display:flex;justify-content:space-between;align-items:center;width:100%;padding:12px 18px;border:1.5px solid #e2e8f0;border-radius:12px;background:#fff;font-weight:600;font-size:13px;color:#334155;cursor:pointer;transition:all .2s}
.fcc-expander:hover{background:#f8fafc;border-color:#10b981}
@keyframes fcc-spin{to{transform:rotate(360deg)}}
.fcc-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:fcc-spin .7s linear infinite;display:inline-block}
`;

// ─── Group detail rows by period ────────────────────────────────────────────

function groupDetail(rows, freq) {
  if (freq === "Monthly") return rows;
  const div = freq === "Quarterly" ? 3 : 12;
  const key = freq === "Quarterly" ? "Quarter No." : "Year No.";
  const map  = {};
  rows.forEach(r => {
    const gk = Math.floor((r.period - 1) / div) + 1;
    if (!map[gk]) {
      map[gk] = { [key]: gk, opening_balance: r.opening_balance,
        disbursement_amount:0,entered_repayment:0,repayment_used:0,
        interest_pct_annual_roi:0,moratorium_interest:0,
        interest_after_moratorium:0,total_interest:0,closing_balance:0,_n:0};
    }
    const g = map[gk];
    g.disbursement_amount       += r.disbursement_amount;
    g.entered_repayment         += r.entered_repayment;
    g.repayment_used            += r.repayment_used;
    g.interest_pct_annual_roi   += r.interest_pct_annual_roi;
    g.moratorium_interest       += r.moratorium_interest;
    g.interest_after_moratorium += r.interest_after_moratorium;
    g.total_interest            += r.total_interest;
    g.closing_balance            = r.closing_balance;
    g._n += 1;
  });
  return Object.values(map).map(g => ({
    ...g,
    interest_pct_annual_roi: g.interest_pct_annual_roi / g._n,
    debt_before_repayment:   g.opening_balance + g.disbursement_amount,
  }));
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FinanceCostCalculatorModal({ isOpen, onClose, onApply, defaultCurrency = "INR" }) {
  const [loanAmountDisplay, setLoanAmountDisplay] = useState("100");
  const [loanAmountUnit,    setLoanAmountUnit]    = useState("Actual amount");
  const [currency,          setCurrency]          = useState(defaultCurrency || "INR");
  const [tenureMonths,      setTenureMonths]      = useState("60");
  const [annualInterest,    setAnnualInterest]    = useState("12.50");
  const [repayStartMonth,   setRepayStartMonth]   = useState("11");

  const [scheduleRows, setScheduleRows] = useState([]);
  const [detailRows,   setDetailRows]   = useState([]);
  const [totals,       setTotals]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingXls,   setLoadingXls]   = useState(false);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [detailView,   setDetailView]   = useState("Monthly");
  const [isDirty,      setIsDirty]      = useState(false);

  const prevSig = useRef(null);
  const loanAmount = parseFloat(loanAmountDisplay || "0") * (UNIT_MULTIPLIERS[loanAmountUnit] || 1);

  const fetchSchedule = useCallback(async (editedRows = null) => {
    const la = parseFloat(loanAmountDisplay || "0");
    const tm = parseInt(tenureMonths || "1");
    const ai = parseFloat(annualInterest || "0");
    const rs = Math.min(parseInt(repayStartMonth || "1"), tm || 1);
    if (!la || !tm || !ai || !rs) return;

    setLoading(true);
    try {
      const body = {
        loan_amount:           la * (UNIT_MULTIPLIERS[loanAmountUnit] || 1),
        tenure_months:         tm,
        annual_interest_pct:   ai,
        repayment_start_month: rs,
        currency,
      };
      if (editedRows) body.schedule_rows = editedRows;

      const res  = await fetch(apiUrl("/new_rate_simulator/simulator/finance-cost/calculate"), {
        method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleRows(data.schedule);
        setDetailRows(data.detail);
        setTotals(data.totals);
      }
    } catch(e) { console.error("FCC calc error:", e); }
    finally { setLoading(false); }
  }, [loanAmountDisplay, loanAmountUnit, tenureMonths, annualInterest, repayStartMonth, currency]);

  useEffect(() => {
    if (!isOpen) return;
    const sig = `${loanAmountDisplay}-${loanAmountUnit}-${tenureMonths}-${annualInterest}-${repayStartMonth}-${currency}`;
    if (sig !== prevSig.current) {
      prevSig.current = sig;
      setIsDirty(false);
      fetchSchedule(null);
    }
  }, [isOpen, loanAmountDisplay, loanAmountUnit, tenureMonths, annualInterest, repayStartMonth, currency, fetchSchedule]);

  useEffect(() => {
    if (isOpen) {
      setCurrency(defaultCurrency || "INR");
    }
  }, [isOpen, defaultCurrency]);

  const handleReset = () => { setIsDirty(false); fetchSchedule(null); };

  const handleCellChange = (idx, field, value) => {
    setIsDirty(true);
    setScheduleRows(prev => prev.map((r, i) => i === idx ? {...r, [field]: value} : r));
  };

  const handleRecalculate = () => {
    fetchSchedule(scheduleRows.map(r => ({
      period: r.period,
      disbursement_amount: parseFloat(r.disbursement_amount) || 0,
      repayment_amount:    parseFloat(r.repayment_amount) || 0,
      interest_percent:    parseFloat(r.interest_percent) || 0,
    })));
  };

  const handleExport = async () => {
    setLoadingXls(true);
    try {
      const res = await fetch(apiUrl("/new_rate_simulator/simulator/finance-cost/export"), {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          loan_amount:           loanAmount,
          tenure_months:         parseInt(tenureMonths || "1"),
          annual_interest_pct:   parseFloat(annualInterest || "0"),
          repayment_start_month: parseInt(repayStartMonth || "1"),
          currency, loan_amount_unit: loanAmountUnit,
          loan_amount_display: parseFloat(loanAmountDisplay || "0"),
          schedule_rows: scheduleRows.map(r => ({
            period: r.period,
            disbursement_amount: parseFloat(r.disbursement_amount) || 0,
            repayment_amount:    parseFloat(r.repayment_amount) || 0,
            interest_percent:    parseFloat(r.interest_percent) || 0,
          })),
        }),
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), {href: url, download: "finance_cost_calculator.xlsx"});
      a.click(); URL.revokeObjectURL(url);
    } catch(e) { console.error("Export error:", e); }
    finally { setLoadingXls(false); }
  };

  const handleApply = () => {
    if (totals && onApply) {
      onApply(totals.interest, {
        loanAmount: parseFloat(loanAmountDisplay || "0") * (UNIT_MULTIPLIERS[loanAmountUnit] || 1),
        annualInterest: parseFloat(annualInterest || "0"),
        tenureMonths: parseInt(tenureMonths || "0"),
        totalInterest: totals.interest,
        currency
      });
    }
    onClose();
  };

  const warnings = [];
  if (totals) {
    if (Math.abs(totals.disbursement - loanAmount) > 0.0001)
      warnings.push(`Table disbursement (${currency} ${fmt(totals.disbursement)}) differs from Loan Amount (${currency} ${fmt(loanAmount)}). Verify if intentional.`);
    if (totals.over_repay)
      warnings.push("One or more rows try to repay more than available principal. Repayment is capped at outstanding debt.");
    if (totals.closing > 0.0001)
      warnings.push(`Schedule ends with unpaid principal of ${currency} ${fmt(totals.closing)}. Increase repayment if full repayment is needed.`);
  }

  const displayedDetail = groupDetail(detailRows, detailView);
  const periodKey = detailView === "Monthly" ? "period" : detailView === "Quarterly" ? "Quarter No." : "Year No.";
  const unitSuffix = loanAmountUnit !== "Actual amount" ? ` (${loanAmountUnit})` : ` (${currency})`;

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div className="bootstrap-scope">
      <style>{MODAL_CSS}</style>
      <div className="fcc-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="fcc-modal">

          {/* Header */}
          <div className="fcc-header">
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <FaCalculator color="#fff" size={18}/>
              </div>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>Finance Cost Calculator</div>
                <div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>Simple term loan schedule &amp; interest estimator</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:4}}><FaTimes size={20}/></button>
          </div>

          {/* Body */}
          <div className="fcc-body">

            {/* 1. Loan Inputs */}
            <div className="fcc-section">
              <div className="fcc-section-title">1. Loan Inputs</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:16}}>
                <div>
                  <label className="fcc-label">Loan Amount</label>
                  <input type="number" className="fcc-input" min={0.01} step={1} value={loanAmountDisplay} onChange={e=>setLoanAmountDisplay(e.target.value)}/>
                </div>
                <div>
                  <label className="fcc-label">Loan Amount Unit</label>
                  <select className="fcc-select" value={loanAmountUnit} onChange={e=>setLoanAmountUnit(e.target.value)}>
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="fcc-label">Currency</label>
                  <input type="text" className="fcc-input" value={currency} disabled style={{ backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} />
                </div>
                <div>
                  <label className="fcc-label">Tenure (Months)</label>
                  <input type="number" className="fcc-input" min={1} max={1200} step={1} value={tenureMonths} onChange={e=>setTenureMonths(e.target.value)}/>
                </div>
                <div>
                  <label className="fcc-label">Annual Interest (%)</label>
                  <input type="number" className="fcc-input" min={0} max={100} step={0.0001} value={annualInterest} onChange={e=>setAnnualInterest(e.target.value)}/>
                </div>
                <div>
                  <label className="fcc-label">Repayment From Month No.</label>
                  <input type="number" className="fcc-input" min={1} max={parseInt(tenureMonths)||1} step={1} value={repayStartMonth} onChange={e=>setRepayStartMonth(e.target.value)}/>
                </div>
              </div>
              {loanAmount > 0 && (
                <div style={{marginTop:12,fontSize:12,color:"#64748b",fontWeight:500,background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid #e9ecef"}}>
                  <strong>Auto-fill assumption:</strong> 100% disbursed in Month 1. Equal principal repayment from Month {Math.min(parseInt(repayStartMonth)||1, parseInt(tenureMonths)||1)} to maturity. Any row can be edited below.
                </div>
              )}
            </div>

            {/* 2. Editable Finance Schedule */}
            <div className="fcc-section" style={{padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div className="fcc-section-title" style={{marginBottom:0}}>2. Editable Finance Schedule</div>
                <div style={{display:"flex",gap:8}}>
                  {isDirty && (
                    <button className="fcc-btn-primary" style={{padding:"7px 14px",fontSize:12}} onClick={handleRecalculate} disabled={loading}>
                      {loading ? <span className="fcc-spinner"/> : <FaCalculator size={11}/>} Recalculate
                    </button>
                  )}
                  <button className="fcc-btn-secondary" style={{padding:"7px 12px",fontSize:12}} onClick={handleReset} disabled={loading}>
                    <FaSync size={10}/> Reset
                  </button>
                </div>
              </div>

              {loading && !scheduleRows.length ? (
                <div style={{textAlign:"center",padding:"40px 0",color:"#94a3b8"}}>
                  <div style={{fontSize:13,marginTop:8}}>Building schedule…</div>
                </div>
              ) : (
                <div className="fcc-table-wrap">
                  <table className="fcc-table">
                    <thead>
                      <tr>
                        <th>Month No.</th>
                        <th>Disbursement{unitSuffix}</th>
                        <th>Repayment{unitSuffix}</th>
                        <th>Interest % (Ann. ROI)</th>
                        <th>Outstanding Loan{unitSuffix}</th>
                        <th>Total Interest{unitSuffix}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row, idx) => (
                        <tr key={row.period}>
                          <td style={{fontWeight:700,color:"#475569",textAlign:"center"}}>{row.period}</td>
                          <td><input className="fcc-table-input" type="number" min={0} step={0.1} value={row.disbursement_amount} onChange={e=>handleCellChange(idx,"disbursement_amount",e.target.value)}/></td>
                          <td><input className="fcc-table-input" type="number" min={0} step={0.1} value={row.repayment_amount} onChange={e=>handleCellChange(idx,"repayment_amount",e.target.value)}/></td>
                          <td><input className="fcc-table-input" type="number" min={0} max={100} step={0.01} value={row.interest_percent} onChange={e=>handleCellChange(idx,"interest_percent",e.target.value)}/></td>
                          <td style={{textAlign:"right",color:"#94a3b8",fontWeight:500}}>{fmt(row.outstanding_loan, 4)}</td>
                          <td style={{textAlign:"right",color:"#94a3b8",fontWeight:500}}>{fmt(row.total_interest, 4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totals && (
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:10,padding:"10px 16px",background:"#1e293b",borderRadius:10,color:"#fff",fontSize:12,fontWeight:600}}>
                  <span style={{fontWeight:800}}>TABLE TOTAL</span>
                  <span style={{marginLeft:"auto"}}>Disbursement: {currency} {fmt(totals.disbursement,4)}</span>
                  <span>Repayment: {currency} {fmt(totals.entered_repayment,4)}</span>
                  <span style={{color:"#fbbf24"}}>Total Interest: {currency} {fmt(totals.interest,4)}</span>
                </div>
              )}
            </div>

            {/* Warnings */}
            {warnings.map((w,i) => (
              <div key={i} className="fcc-warn">
                <FaExclamationTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
                <span>{w}</span>
              </div>
            ))}

            {/* 3. KPI Cards */}
            {totals && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
                <div className="fcc-kpi-card">
                  <div className="fcc-kpi-label">Principle Amount</div>
                  <div className="fcc-kpi-value" style={{color:"#3b82f6"}}>{currency} {fmt(totals.disbursement)}</div>
                </div>
                <div className="fcc-kpi-card">
                  <div className="fcc-kpi-label">Total Interest</div>
                  <div className="fcc-kpi-value" style={{color:"#f59e0b"}}>{currency} {fmt(totals.interest)}</div>
                </div>
                <div className="fcc-kpi-card">
                  <div className="fcc-kpi-label">Total Amount Payable</div>
                  <div className="fcc-kpi-value" style={{color:"#10b981"}}>{currency} {fmt(totals.disbursement + totals.interest)}</div>
                </div>
              </div>
            )}

            {/* 4. Period-by-period detail */}
            {detailRows.length > 0 && (
              <div style={{marginBottom:20}}>
                <button className="fcc-expander" onClick={()=>setDetailOpen(v=>!v)}>
                  <span style={{display:"flex",alignItems:"center",gap:8}}>
                    <FaMoneyBillWave color="#10b981" size={14}/> View period-by-period finance cost calculation
                  </span>
                  <span style={{transform:detailOpen?"rotate(180deg)":"none",transition:"transform .3s",display:"inline-flex"}}>
                    <FaChevronDown size={13} color="#94a3b8"/>
                  </span>
                </button>

                {detailOpen && (
                  <div style={{marginTop:14,background:"#f8fafc",borderRadius:12,padding:18,border:"1px solid #e9ecef"}}>
                    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
                      <div className="fcc-pill-toggle">
                        {["Monthly","Quarterly","Yearly"].map(v=>(
                          <button key={v} className={`fcc-pill-opt ${detailView===v?"active":""}`} onClick={()=>setDetailView(v)}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="fcc-table-wrap" style={{maxHeight:280}}>
                      <table className="fcc-table">
                        <thead>
                          <tr>
                            <th>{detailView==="Monthly"?"Month":detailView==="Quarterly"?"Quarter":"Year"}</th>
                            <th>Opening Principal Balance</th>
                            <th>Disbursement Amount</th>
                            <th>Principal Before Repayment</th>
                            <th>Scheduled Principal Repayment</th>
                            <th>Annual Interest Rate (%)</th>
                            <th>Total Interest</th>
                            <th>Closing Principal Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedDetail.map((row,i)=>(
                            <tr key={i}>
                              <td style={{fontWeight:700,color:"#475569",textAlign:"center"}}>{row[periodKey]??row.period}</td>
                              <td style={{textAlign:"right"}}>{fmt(row.opening_balance,4)}</td>
                              <td style={{textAlign:"right"}}>{fmt(row.disbursement_amount,4)}</td>
                              <td style={{textAlign:"right"}}>{fmt(row.debt_before_repayment,4)}</td>
                              <td style={{textAlign:"right"}}>{fmt(row.entered_repayment,4)}</td>
                              <td style={{textAlign:"right"}}>{fmt(row.interest_pct_annual_roi,4)}%</td>
                              <td style={{textAlign:"right",fontWeight:700,color:"#f59e0b"}}>{fmt(row.total_interest,4)}</td>
                              <td style={{textAlign:"right"}}>{fmt(row.closing_balance,4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fcc-footer">
            <button className="fcc-btn-secondary" onClick={handleExport} disabled={!totals||loadingXls}>
              {loadingXls?<span className="fcc-spinner" style={{borderTopColor:"#495057",borderColor:"rgba(73,80,87,.2)"}}/>:<FaDownload size={12}/>} Download Excel
            </button>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {totals && (
                <div style={{fontSize:13,color:"#64748b"}}>
                  Total Interest: <strong style={{color:"#1e293b",fontSize:15}}>{currency} {fmt(totals.interest)}</strong>
                </div>
              )}
              <button className="fcc-btn-secondary" onClick={onClose}>Cancel</button>
              <button className="fcc-btn-primary" onClick={handleApply} disabled={!totals}>
                <FaCheckCircle size={13}/> Apply Finance Cost
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
