/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
  Legend
} from 'recharts';

const dashboardColors = {
  acquisitionCost: '#2563eb',
  currentMarketValue: '#16a34a',
  bookValue: '#f59e0b',
  rentalIncome: '#7c3aed',
  occupancyIncome: '#06b6d4',
  otherIncome: '#f97316',
  collectionEfficiency: '#dc2626',
  maintenance: '#0f766e',
  propertyTax: '#9333ea',
  insurance: '#0891b2',
  utilities: '#ca8a04',
  repairs: '#be123c',
  capex: '#475569',
  opex: '#ea580c',
  emi: '#1d4ed8'
};

const fmt = (value, digits = 2) => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(digits);
};

export default function DashboardSection({ dashboardRows }) {
  const chartRows = dashboardRows.map((row) => ({
    ...row,
    appreciationLabel: row.appreciation ? `${fmt(row.appreciation)}%` : ''
  }));
  const card = 'rounded-[22px] border border-gray-200 bg-white p-[18px] shadow-[0_10px_30px_rgba(15,23,42,0.05)]';
  const wideCard = `${card} col-span-2 max-[980px]:col-span-1`;
  const cardTitle = 'mb-1.5 mt-0 text-slate-900';
  const cardText = 'mb-3.5 mt-0 text-[13px] text-slate-500';
  const tableWrap = 'mt-3 w-full overflow-auto rounded-[14px] border border-[#eef0f3]';
  const table = 'w-full border-collapse text-[13px]';
  const th = 'border-b border-gray-200 bg-slate-50 p-2.5 text-left text-slate-700';
  const td = 'border-b border-[#eef0f3] p-2.5 text-slate-600';
  const chartBox = 'min-h-60 w-full';

  return (
    <div className="mb-[18px]">
      <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
        <div className={card}>
          <h3 className={cardTitle}>1. Asset Identity</h3>
          <p className={cardText}>Linked asset-wise using Asset ID from Asset Identity section. After field edits, click Save All.</p>
          <div className={tableWrap}>
            <table className={table}>
              <thead><tr><th className={th}>Asset ID</th><th className={th}>Property Name</th><th className={th}>Micromarket</th><th className={th}>City</th></tr></thead>
              <tbody>{chartRows.map((row) => <tr key={row.assetId}><td className={td}>{row.assetId}</td><td className={td}>{row.propertyName}</td><td className={td}>{row.micromarket}</td><td className={td}>{row.city}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className={wideCard}>
          <h3 className={cardTitle}>2. Valuation Snapshot</h3>
          <p className={cardText}>Asset-wise Acquisition Cost, Current Market Value, Book Value and appreciation/depreciation.</p>
          <div className={chartBox}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assetId" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="acquisitionCost" name="Acquisition Cost" fill={dashboardColors.acquisitionCost} />
                <Bar dataKey="currentMarketValue" name="Current Market Value" fill={dashboardColors.currentMarketValue} />
                <Bar dataKey="bookValue" name="Book Value" fill={dashboardColors.bookValue} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={tableWrap}>
            <table className={table}>
              <thead><tr><th className={th}>Asset ID</th><th className={th}>Valuation Date</th><th className={th}>Valuation Method</th><th className={th}>Appreciation / Depreciation</th></tr></thead>
              <tbody>{chartRows.map((row) => <tr key={row.assetId}><td className={td}>{row.assetId}</td><td className={td}>{row.valuationDate}</td><td className={td}>{row.valuationMethod}</td><td className={td}>{row.appreciationLabel}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className={wideCard}>
          <h3 className={cardTitle}>3. Revenue & Income</h3>
          <p className={cardText}>Rental income, occupancy income, other income, escalation clause and collection efficiency.</p>
          <div className={chartBox}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assetId" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rentalIncome" name="Rental Income" fill={dashboardColors.rentalIncome} />
                <Bar dataKey="occupancyIncome" name="Occupancy Income" fill={dashboardColors.occupancyIncome} />
                <Bar dataKey="otherIncome" name="Other Income" fill={dashboardColors.otherIncome} />
                <Line dataKey="collectionEfficiency" name="Collection Efficiency %" stroke={dashboardColors.collectionEfficiency} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className={tableWrap}>
            <table className={table}>
              <thead><tr><th className={th}>Asset ID</th><th className={th}>Escalation Clause</th><th className={th}>Collection Efficiency</th></tr></thead>
              <tbody>{chartRows.map((row) => <tr key={row.assetId}><td className={td}>{row.assetId}</td><td className={td}>{row.escalationClause}</td><td className={td}>{row.collectionEfficiency ? `${fmt(row.collectionEfficiency)}%` : ''}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className={wideCard}>
          <h3 className={cardTitle}>4. Expenses</h3>
          <p className={cardText}>Maintenance cost, property tax, insurance, utilities, repairs, capex and opex.</p>
          <div className={chartBox}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assetId" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="maintenance" name="Maintenance" fill={dashboardColors.maintenance} />
                <Bar dataKey="propertyTax" name="Property Tax" fill={dashboardColors.propertyTax} />
                <Bar dataKey="insurance" name="Insurance" fill={dashboardColors.insurance} />
                <Bar dataKey="utilities" name="Utilities" fill={dashboardColors.utilities} />
                <Bar dataKey="repairs" name="Repairs" fill={dashboardColors.repairs} />
                <Bar dataKey="capex" name="Capex" fill={dashboardColors.capex} />
                <Bar dataKey="opex" name="Opex" fill={dashboardColors.opex} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={wideCard}>
          <h3 className={cardTitle}>5. EMI</h3>
          <p className={cardText}>Asset-wise monthly EMI from Loan / Debt section.</p>
          <div className={chartBox}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assetId" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="emi" name="EMI" fill={dashboardColors.emi} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
