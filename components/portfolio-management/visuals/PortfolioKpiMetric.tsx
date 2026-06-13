'use client';

import type { PortfolioChartSpec } from '@/types/portfolio-visuals';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import { chartData, formatVisualValue } from './chart-utils';

type PortfolioKpiMetricProps = {
  chart: PortfolioChartSpec;
  height?: number;
};

export default function PortfolioKpiMetric({ chart, height = 340 }: PortfolioKpiMetricProps) {
  const data = chartData(chart);
  const row = data[0];
  if (!row) return <PortfolioVisualEmptyState />;

  const value = row[chart.y_key];
  const label = typeof row.label === 'string' && row.label ? row.label : chart.title || chart.y_axis_label || chart.y_key;
  const aggregation = typeof row.aggregation === 'string' && row.aggregation ? row.aggregation : chart.aggregation;

  return (
    <div className="flex w-full items-center justify-center" style={{ minHeight: height }}>
      <div className="w-full rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-slate-50 p-7 shadow-[0_18px_50px_rgba(37,99,235,0.11)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black uppercase text-blue-700">KPI</p>
            <h4 className="m-0 mt-2 text-lg font-black text-slate-900">{label}</h4>
          </div>
          {aggregation && aggregation !== 'none' && (
            <span className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black uppercase text-blue-700">
              {aggregation}
            </span>
          )}
        </div>

        <div className="text-[clamp(2.25rem,6vw,4.75rem)] font-black leading-none tracking-normal text-slate-950">
          {formatVisualValue(value, chart.value_format)}
        </div>

        {chart.description && (
          <p className="m-0 mt-5 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">{chart.description}</p>
        )}
      </div>
    </div>
  );
}
