import React, { useEffect, useMemo, useState } from "react";
import { FaTable, FaInfoCircle } from 'react-icons/fa';

// Shared unit type order used across other components
const UNIT_TYPES = ["1BHK", "2BHK", "3BHK", ">3BHK", "Shop", "Office"];

const normalizeKey = (key) => {
  if (!key) return "";
  return String(key)
    .trim()
    .replace(/\s+/g, "")
    .replace(/Bhk/i, "BHK");
};

const LS_KEY = "ticketSizeSummary";

const TicketSizeSummary = () => {
  // Hydrate from localStorage on mount so data persists across page visits
  const [unitSummary, setUnitSummary] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) return JSON.parse(saved).unitSummary || {};
      }
    } catch { }
    return {};
  });
  const [expectedRevenueBase, setExpectedRevenueBase] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) return JSON.parse(saved).expectedRevenueBase || {};
      }
    } catch { }
    return {};
  });
  const [expectedRevenueBayes, setExpectedRevenueBayes] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) return JSON.parse(saved).expectedRevenueBayes || {};
      }
    } catch { }
    return {};
  });

  // Listen for unit count + area / total area info from revenuep2 (unitCountDataUpdated)
  useEffect(() => {
    const handleUnitCountUpdate = (event) => {
      const payload = event.detail;
      if (!Array.isArray(payload)) return;

      // payload is unitCountData; we also need area/total-area from localStorage
      try {
        const raw = localStorage.getItem("revenuep2_unitMix");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const grid = parsed?.unitMixGrid;
        if (!Array.isArray(grid)) return;

        const summary = {};
        // Rows 4–9 (0‑indexed) contain unit mix (same indices as Product Mix Summary)
        [4, 5, 6, 7, 8, 9].forEach((rowIdx, idx) => {
          const unitType = String(grid?.[rowIdx]?.[0]?.value ?? "").trim();
          if (!unitType) return;
          const key = normalizeKey(unitType);
          const totalArea = Number(grid?.[rowIdx]?.[5]?.value ?? 0); // F: Total Area Allotted
          const areaPerUnit = Number(grid?.[rowIdx]?.[2]?.value ?? 0); // C: Area per Unit
          const unitsEntry = payload[idx]; // same ordering as 1BHK..Office when saved
          const numUnits =
            unitsEntry && unitsEntry.No_Of_Units != null
              ? Number(unitsEntry.No_Of_Units)
              : Number(grid?.[rowIdx + 11]?.[1]?.value ?? 0); // fallback from grid

          if (!summary[key]) {
            summary[key] = {
              unitType,
              totalArea: 0,
              areaPerUnit: 0,
              numUnits: 0,
            };
          }
          summary[key].totalArea += Number.isFinite(totalArea) ? totalArea : 0;
          summary[key].areaPerUnit =
            Number.isFinite(areaPerUnit) && areaPerUnit > 0
              ? areaPerUnit
              : summary[key].areaPerUnit;
          summary[key].numUnits += Number.isFinite(numUnits) ? numUnits : 0;
        });

        setUnitSummary(summary);
      } catch (err) {
        console.error("TicketSizeSummary: failed to derive unit summary:", err);
      }
    };

    window.addEventListener("unitCountDataUpdated", handleUnitCountUpdate);
    return () =>
      window.removeEventListener("unitCountDataUpdated", handleUnitCountUpdate);
  }, []);

  // Listen for expected revenue per unit type (Base Logic)
  useEffect(() => {
    const handler = (event) => {
      const { unitType, expectedRevenue } = event.detail || {};
      const key = normalizeKey(unitType);
      if (!key) return;
      setExpectedRevenueBase((prev) => ({
        ...prev,
        [key]: Number(expectedRevenue) || 0,
      }));
    };

    window.addEventListener("excelSimulationUpdated", handler);
    return () => window.removeEventListener("excelSimulationUpdated", handler);
  }, []);

  // Listen for expected revenue per unit type (Bayesian Opt)
  useEffect(() => {
    const handler = (event) => {
      const { unitType, expectedRevenue } = event.detail || {};
      const key = normalizeKey(unitType);
      if (!key) return;
      setExpectedRevenueBayes((prev) => ({
        ...prev,
        [key]: Number(expectedRevenue) || 0,
      }));
    };

    window.addEventListener("bayesianSimulationUpdated", handler);
    return () =>
      window.removeEventListener("bayesianSimulationUpdated", handler);
  }, []);

  // Auto-save to localStorage whenever any source data changes
  useEffect(() => {
    try {
      const payload = { unitSummary, expectedRevenueBase, expectedRevenueBayes };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("ticketSizeSummaryUpdated", { detail: payload }));
    } catch (err) {
      console.error("TicketSizeSummary: failed to save to localStorage:", err);
    }
  }, [unitSummary, expectedRevenueBase, expectedRevenueBayes]);

  const rows = useMemo(() => {
    return UNIT_TYPES.map((rawType) => {
      const key = normalizeKey(rawType);
      const base = unitSummary[key];
      if (!base) return null;

      const totalArea = Number(base.totalArea) || 0;
      const areaPerUnit = Number(base.areaPerUnit) || 0;
      const numUnits = Number(base.numUnits) || 0;
      const expBase = Number(expectedRevenueBase[key]) || 0;
      const expBayes = Number(expectedRevenueBayes[key]) || 0;

      if (
        totalArea <= 0 ||
        areaPerUnit <= 0 ||
        numUnits <= 0 ||
        (expBase <= 0 && expBayes <= 0)
      )
        return null;
      const ticketBase = expBase > 0 ? expBase / numUnits : 0;
      const ticketBayes = expBayes > 0 ? expBayes / numUnits : 0;
      const rate =
        ticketBase > 0 && areaPerUnit > 0 ? ticketBase / areaPerUnit : 0;

      const fmt = (val, digits = 0) =>
        Number(val).toLocaleString("en-IN", {
          maximumFractionDigits: digits,
        });

      return {
        key,
        unitType: base.unitType || rawType,
        totalArea,
        areaPerUnit,
        numUnits,
        ticketBase,
        ticketBayes,
        rate,
        fmt,
      };
    }).filter(Boolean);
  }, [unitSummary, expectedRevenueBase, expectedRevenueBayes]);


  return (
    <div className="nr-selected-panel mt-4">
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
        .nr-table-card {
          border: 1px solid #e5eaf2;
          background: #fbfcff;
          border-radius: 18px;
          overflow: hidden;
        }
        .nr-selected-panel .table thead th {
          background: #f4f7fb !important;
          color: #3f4a5a !important;
          border-color: #e2e8f0 !important;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .nr-selected-panel .table tbody td {
          border-color: #e2e8f0 !important;
          color: #273242;
        }
      `}</style>
      <div className="nr-selected-header">
        <div className="nr-selected-eyebrow">Selected Section</div>
        <h4 className="nr-selected-title">
          <FaTable className="me-2 text-primary" />
          Ticket Size Summary
        </h4>
      </div>
      <div className="nr-selected-body">
        {rows.length === 0 ? (
          <p className="text-muted small mb-0">
            <FaInfoCircle className="me-1" />
            No ticket size data available yet. Run a simulation to populate this table.
          </p>
        ) : (
          <div className="table-responsive nr-table-card">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Unit Type</th>
                  {/*<th className="text-end">Total Area Allotted (sqft)</th>*/}
                  <th className="text-end">Area per Unit (sqft)</th>
                  <th className="text-end">Ticket Size (Base logic) (₹)</th>
                  <th className="text-end">Ticket Size (Bayesian opti) (₹)</th>
                  {/*<th className="text-end">Rate (₹ / sqft)</th>*/}

                  <th className="text-end">Number of Units</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.unitType}</td>
                    {/*<td className="text-end">{row.fmt(row.totalArea)}</td>*/}
                    <td className="text-end">{row.fmt(row.areaPerUnit)}</td>
                    <td className="text-end">{row.fmt(row.ticketBase)}</td>
                    <td className="text-end">
                      {row.ticketBayes > 0 ? row.fmt(row.ticketBayes) : "—"}
                    </td>
                    {/*<td className="text-end">{row.fmt(row.rate, 0)}</td>*/}

                    <td className="text-end">{row.fmt(row.numUnits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketSizeSummary;
