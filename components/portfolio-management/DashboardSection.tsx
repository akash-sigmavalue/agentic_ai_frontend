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
  Legend,
  Area
} from 'recharts';

const CHART_THEME = {
  navy: '#0f172a',
  primary: '#6366f1',
  blue: '#60a5fa',
  sky: '#38bdf8',
  green: '#34d399',
  orange: '#fb923c',
  rose: '#fb7185',
  muted: '#64748b',
  grid: '#e5e7eb',
  border: '#e2e8f0',
  background: '#f8fafc'
};

const fmt = (value, digits = 2) => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(digits);
};

const compactNumber = (value) => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value));
};

const tooltipNumber = (value, name) => {
  const label = String(name || '');
  const suffix = label.includes('%') || label.toLowerCase().includes('efficiency') ? '%' : '';
  return `${compactNumber(value)}${suffix}`;
};

const axisStyle = {
  fontSize: 11,
  fontWeight: 700,
  fill: CHART_THEME.muted
};

const legendStyle = {
  color: CHART_THEME.muted,
  fontSize: 12,
  fontWeight: 700
};

const chartMargin = { top: 14, right: 18, left: 4, bottom: 8 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[190px] rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="mb-2 font-black text-white">{label}</div>
      <div className="grid gap-1.5">
        {payload.map((entry) => (
          <div className="flex items-center justify-between gap-5" key={`${entry.name}-${entry.dataKey}`}>
            <span className="inline-flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <b className="text-white">{tooltipNumber(entry.value, entry.name)}</b>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartEmptyState = () => (
  <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
    <div>
      <div className="mx-auto mb-3 h-2 w-24 rounded-full bg-slate-200" />
      <p className="m-0 text-sm font-black text-slate-900">No chart data yet</p>
      <p className="m-0 mt-1 text-xs font-semibold text-slate-500">Save or refresh portfolio records to populate this view.</p>
    </div>
  </div>
);

const ChartShell = ({ children, height = 280 }) => (
  <div className="mt-4 rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition-shadow duration-300 hover:shadow-[0_22px_55px_rgba(15,23,42,0.1)]">
    <div className="w-full" style={{ height }}>
      {children}
    </div>
  </div>
);

const ChartDefs = ({ id, start, end }) => (
  <defs>
    <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
      <stop offset="5%" stopColor={start} stopOpacity={0.34} />
      <stop offset="95%" stopColor={end || start} stopOpacity={0.04} />
    </linearGradient>
    <linearGradient id={`${id}-bar`} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor={start} stopOpacity={0.98} />
      <stop offset="100%" stopColor={end || start} stopOpacity={0.78} />
    </linearGradient>
  </defs>
);

const sharedChartProps = {
  margin: chartMargin,
  barCategoryGap: '24%',
  barGap: 6
};

const SharedGrid = () => <CartesianGrid stroke={CHART_THEME.grid} strokeDasharray="3 3" vertical={false} />;
const SharedXAxis = () => <XAxis axisLine={false} dataKey="assetId" tick={axisStyle} tickLine={false} />;
const SharedYAxis = () => <YAxis axisLine={false} tick={axisStyle} tickFormatter={compactNumber} tickLine={false} width={48} />;
const SharedTooltip = () => <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />;
const SharedLegend = () => <Legend iconSize={9} iconType="circle" wrapperStyle={legendStyle} />;

export default function DashboardSection({ dashboardRows }) {
  const chartRows = dashboardRows.map((row) => ({
    ...row,
    appreciationLabel: row.appreciation ? `${fmt(row.appreciation)}%` : ''
  }));
  const hasChartRows = chartRows.length > 0;
  const card = 'rounded-[24px] border border-slate-200 bg-white p-[18px] shadow-[0_12px_34px_rgba(15,23,42,0.055)]';
  const wideCard = `${card} col-span-2 max-[980px]:col-span-1`;
  const cardTitle = 'mb-1.5 mt-0 text-[18px] font-black text-slate-900';
  const cardText = 'mb-3.5 mt-0 text-[13px] font-semibold leading-relaxed text-slate-500';
  const tableWrap = 'mt-3 w-full overflow-auto rounded-[14px] border border-[#eef0f3]';
  const table = 'w-full border-collapse text-[13px]';
  const th = 'border-b border-gray-200 bg-slate-50 p-2.5 text-left text-slate-700';
  const td = 'border-b border-[#eef0f3] p-2.5 text-slate-600';

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
          <ChartShell height={285}>
            {hasChartRows ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} {...sharedChartProps}>
                  <ChartDefs id="valuation-market" start={CHART_THEME.primary} end={CHART_THEME.blue} />
                  <ChartDefs id="valuation-cost" start={CHART_THEME.navy} end={CHART_THEME.primary} />
                  <SharedGrid />
                  <SharedXAxis />
                  <SharedYAxis />
                  <SharedTooltip />
                  <SharedLegend />
                  <Area dataKey="currentMarketValue" fill="url(#valuation-market-fill)" name="Current Market Value" stroke={CHART_THEME.primary} strokeWidth={3} type="monotone" />
                  <Bar dataKey="acquisitionCost" fill="url(#valuation-cost-bar)" name="Acquisition Cost" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="bookValue" fill={CHART_THEME.orange} name="Book Value" radius={[8, 8, 0, 0]} />
                  <Line activeDot={{ r: 6, strokeWidth: 0 }} dataKey="currentMarketValue" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} name="Market Value Trend" stroke={CHART_THEME.sky} strokeWidth={3} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState />}
          </ChartShell>
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
          <ChartShell height={285}>
            {hasChartRows ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} {...sharedChartProps}>
                  <ChartDefs id="income-rental" start={CHART_THEME.primary} end={CHART_THEME.sky} />
                  <ChartDefs id="income-occupancy" start={CHART_THEME.green} end={CHART_THEME.sky} />
                  <SharedGrid />
                  <SharedXAxis />
                  <SharedYAxis />
                  <SharedTooltip />
                  <SharedLegend />
                  <Bar dataKey="rentalIncome" fill="url(#income-rental-bar)" name="Rental Income" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="occupancyIncome" fill="url(#income-occupancy-bar)" name="Occupancy Income" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="otherIncome" fill={CHART_THEME.orange} name="Other Income" radius={[8, 8, 0, 0]} />
                  <Line activeDot={{ r: 6, strokeWidth: 0 }} dataKey="collectionEfficiency" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} name="Collection Efficiency %" stroke={CHART_THEME.rose} strokeWidth={3} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState />}
          </ChartShell>
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
          <ChartShell height={305}>
            {hasChartRows ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} {...sharedChartProps}>
                  <ChartDefs id="expense-core" start={CHART_THEME.navy} end={CHART_THEME.primary} />
                  <ChartDefs id="expense-ops" start={CHART_THEME.rose} end={CHART_THEME.orange} />
                  <SharedGrid />
                  <SharedXAxis />
                  <SharedYAxis />
                  <SharedTooltip />
                  <SharedLegend />
                  <Bar dataKey="maintenance" fill="url(#expense-core-bar)" name="Maintenance" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="propertyTax" fill={CHART_THEME.primary} name="Property Tax" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="insurance" fill={CHART_THEME.blue} name="Insurance" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="utilities" fill={CHART_THEME.sky} name="Utilities" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="repairs" fill={CHART_THEME.rose} name="Repairs" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="capex" fill={CHART_THEME.green} name="Capex" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="opex" fill="url(#expense-ops-bar)" name="Opex" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState />}
          </ChartShell>
        </div>

        <div className={wideCard}>
          <h3 className={cardTitle}>5. EMI</h3>
          <p className={cardText}>Asset-wise monthly EMI from Loan / Debt section.</p>
          <ChartShell height={260}>
            {hasChartRows ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} {...sharedChartProps}>
                  <ChartDefs id="emi" start={CHART_THEME.primary} end={CHART_THEME.navy} />
                  <SharedGrid />
                  <SharedXAxis />
                  <SharedYAxis />
                  <SharedTooltip />
                  <SharedLegend />
                  <Bar dataKey="emi" fill="url(#emi-bar)" name="EMI" radius={[10, 10, 0, 0]} />
                  <Line activeDot={{ r: 6, strokeWidth: 0 }} dataKey="emi" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} name="EMI Trend" stroke={CHART_THEME.sky} strokeWidth={3} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState />}
          </ChartShell>
        </div>
      </div>
    </div>
  );
}
