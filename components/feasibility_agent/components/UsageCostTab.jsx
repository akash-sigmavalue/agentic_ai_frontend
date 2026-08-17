import { useMemo, useState } from "react";
import { useTokenLedger } from "../contexts/TokenLedgerContext";
import {
  FaChartBar,
  FaDatabase,
  FaRobot,
  FaInbox,
  FaRotateRight,
  FaTowerBroadcast,
  FaArrowDownLong,
  FaArrowUpLong,
  FaDollarSign,
} from "react-icons/fa6";

const fmt = (n) => {
  if (n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

const fmtCost = (n) => {
  if (n === 0) return "—";
  if (n < 0.0001) return "< $0.0001";
  return "$" + n.toFixed(4);
};

const SECTION_COLORS = {
  "Land Identification":         "#4f46e5",
  "Regulatory Intelligence":     "#0891b2",
  "Land & FSI Details":          "#059669",
  "Comparable Projects":         "#d97706",
  "Cash Inflow Simulation":      "#dc2626",
  "IRR Simulation":              "#7c3aed",
  "Cost Outflow Simulation":     "#0f766e",
  "Market Analysis":             "#1d4ed8",
  "Sales Velocity":              "#be185d",
  "Product Mix":                 "#92400e",
};

function SectionBadge({ section }) {
  const color = SECTION_COLORS[section] || "#64748b";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      color,
      background: color + "18",
      border: `1px solid ${color}30`,
      whiteSpace: "nowrap",
    }}>
      {section}
    </span>
  );
}

function ModelChip({ model, isDbCall }) {
  const short = model.length > 32 ? model.slice(0, 30) + "…" : model;
  return (
    <span
      title={model}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: "11px",
        fontWeight: 600,
        color: isDbCall ? "#0f766e" : "#1e293b",
        background: isDbCall ? "#ccfbf120" : "#f1f5f9",
        border: `1px solid ${isDbCall ? "#99f6e4" : "#e2e8f0"}`,
        borderRadius: "6px",
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {isDbCall ? <FaDatabase size={11} color="#0d9488" /> : <FaRobot size={12} color="#6366f1" />} {short}
    </span>
  );
}

export default function UsageCostTab() {
  const { summary, resetLedger } = useTokenLedger();
  const [sortBy, setSortBy] = useState("section"); // "section" | "cost" | "calls" | "tokens"

  const sorted = useMemo(() => {
    const rows = [...summary];
    if (sortBy === "cost")   rows.sort((a, b) => b.costUsd - a.costUsd);
    if (sortBy === "calls")  rows.sort((a, b) => b.apiCalls - a.apiCalls);
    if (sortBy === "tokens") rows.sort((a, b) => b.totalTokens - a.totalTokens);
    if (sortBy === "section") rows.sort((a, b) => a.section.localeCompare(b.section));
    return rows;
  }, [summary, sortBy]);

  const totals = useMemo(() => ({
    apiCalls:     summary.reduce((s, r) => s + r.apiCalls, 0),
    inputTokens:  summary.reduce((s, r) => s + r.inputTokens, 0),
    outputTokens: summary.reduce((s, r) => s + r.outputTokens, 0),
    totalTokens:  summary.reduce((s, r) => s + r.totalTokens, 0),
    costUsd:      summary.reduce((s, r) => s + r.costUsd, 0),
  }), [summary]);

  const SortBtn = ({ id, label }) => (
    <button
      onClick={() => setSortBy(id)}
      style={{
        background: sortBy === id ? "#4f46e5" : "transparent",
        color: sortBy === id ? "#fff" : "#64748b",
        border: `1px solid ${sortBy === id ? "#4f46e5" : "#e2e8f0"}`,
        borderRadius: "6px",
        padding: "3px 10px",
        fontSize: "11px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >{label}</button>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: "17px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaChartBar size={16} color="#4f46e5" /> Usage &amp; Cost
          </h5>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
            Session-scoped — resets on page refresh. Costs are estimates based on published Bedrock pricing.
          </p>
        </div>
        <button
          onClick={resetLedger}
          style={{
            background: "transparent", border: "1px solid #e2e8f0", borderRadius: "8px",
            padding: "6px 14px", fontSize: "12px", color: "#64748b", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "6px", fontWeight: 600,
          }}
        >
          <FaRotateRight size={11} /> Reset Session
        </button>
      </div>

      {/* Summary tiles */}
      {summary.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total API Calls", value: totals.apiCalls, icon: <FaTowerBroadcast size={18} color="#0284c7" /> },
            { label: "Input Tokens",    value: fmt(totals.inputTokens),  icon: <FaArrowDownLong size={18} color="#16a34a" /> },
            { label: "Output Tokens",   value: fmt(totals.outputTokens), icon: <FaArrowUpLong size={18} color="#ea580c" /> },
            { label: "Est. Cost (USD)", value: fmtCost(totals.costUsd),  icon: <FaDollarSign size={18} color="#7c3aed" /> },
          ].map((tile) => (
            <div key={tile.label} style={{
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px",
              padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ marginBottom: "6px" }}>{tile.icon}</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{tile.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{tile.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sort controls */}
      {summary.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8", marginRight: "4px" }}>Sort by:</span>
          <SortBtn id="section" label="Section" />
          <SortBtn id="cost"    label="Cost ↓" />
          <SortBtn id="calls"   label="Calls ↓" />
          <SortBtn id="tokens"  label="Tokens ↓" />
        </div>
      )}

      {/* Table */}
      {summary.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "#f8fafc", borderRadius: "16px",
          border: "1px dashed #e2e8f0",
        }}>
          <div style={{ marginBottom: "12px" }}><FaInbox size={36} color="#94a3b8" /></div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>No API calls recorded yet</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            Start using the agent — calls to LLM models and databases will appear here.
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Model / DB Call", "Section", "API Calls", "Input Tokens", "Output Tokens", "Total Tokens", "Est. Cost"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontWeight: 700, fontSize: "11px", color: "#64748b",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={`${row.model}-${row.section}-${i}`} style={{
                  background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  borderBottom: "1px solid #f1f5f9",
                  transition: "background 0.1s",
                }}>
                  <td style={{ padding: "10px 14px" }}><ModelChip model={row.model} isDbCall={row.isDbCall} /></td>
                  <td style={{ padding: "10px 14px" }}><SectionBadge section={row.section} /></td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{row.apiCalls}</td>
                  <td style={{ padding: "10px 14px", color: row.isDbCall ? "#94a3b8" : "#334155" }}>{row.isDbCall ? "—" : fmt(row.inputTokens)}</td>
                  <td style={{ padding: "10px 14px", color: row.isDbCall ? "#94a3b8" : "#334155" }}>{row.isDbCall ? "—" : fmt(row.outputTokens)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: row.isDbCall ? "#94a3b8" : "#0f172a" }}>{row.isDbCall ? "—" : fmt(row.totalTokens)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: row.costUsd > 0 ? "#4f46e5" : "#94a3b8" }}>{fmtCost(row.costUsd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                <td colSpan={2} style={{ padding: "11px 14px", fontWeight: 700, fontSize: "12px", color: "#0f172a" }}>
                  TOTAL ({summary.length} rows)
                </td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0f172a" }}>{totals.apiCalls}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0f172a" }}>{fmt(totals.inputTokens)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0f172a" }}>{fmt(totals.outputTokens)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0f172a" }}>{fmt(totals.totalTokens)}</td>
                <td style={{ padding: "11px 14px", fontWeight: 800, color: "#4f46e5", fontSize: "14px" }}>{fmtCost(totals.costUsd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "12px", textAlign: "right" }}>
        * Costs are estimates only. Actual billing depends on your AWS Bedrock contract.
      </p>
    </div>
  );
}

