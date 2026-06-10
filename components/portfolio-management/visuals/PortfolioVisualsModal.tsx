'use client';

import type { PortfolioChartSpec, PortfolioVisualSpec } from '@/types/portfolio-visuals';
import { BarChart3, Gauge, Layers3, X, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import PortfolioVisualRenderer from './PortfolioVisualRenderer';

type PortfolioResultSet = {
  title?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
};

type PortfolioVisualsModalProps = {
  visualSpec: PortfolioVisualSpec | null;
  resultSet?: PortfolioResultSet | null;
  onClose: () => void;
};

const toText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value, null, 2);
};

const resultSetColumns = (resultSet: PortfolioResultSet) => {
  if (resultSet.columns?.length) return resultSet.columns;
  const rows = resultSet.rows || [];
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
};

const formatConfidence = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
};

const fieldMeta = (chart: PortfolioChartSpec) => {
  if (chart.chart_type === 'kpi') {
    return [
      ['Metric', chart.y_key],
      ['Aggregation', chart.aggregation],
    ].filter(([, value]) => value);
  }

  return [
    ['X', chart.x_key],
    ['Y', chart.y_key],
    ['Aggregation', chart.aggregation],
  ].filter(([, value]) => value);
};

function ChartCard({ chart, compact = false }: { chart: PortfolioChartSpec; compact?: boolean }) {
  const confidence = formatConfidence(chart.confidence);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-lg font-black text-slate-900">{chart.title || 'Portfolio Visual'}</h3>
          {chart.description && <p className="m-0 mt-1 text-sm font-semibold leading-relaxed text-slate-500">{chart.description}</p>}
        </div>
        {confidence && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            <Gauge size={13} /> {confidence}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 p-3">
        <PortfolioVisualRenderer chart={chart} height={compact ? 260 : 380} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {fieldMeta(chart).map(([label, value]) => (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600" key={`${chart.chart_id}-${label}`}>
            {label}: {value}
          </span>
        ))}
      </div>

      {chart.reason && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold leading-relaxed text-blue-900">
          <b>Why this visual:</b> {chart.reason}
        </div>
      )}
    </section>
  );
}

export default function PortfolioVisualsModal({ visualSpec, resultSet, onClose }: PortfolioVisualsModalProps) {
  const [tableMinimized, setTableMinimized] = useState(false);
  
  if (!visualSpec) return null;
  if (typeof document === 'undefined') return null;

  const charts = visualSpec.charts || [];
  const isDashboard = visualSpec.mode === 'dashboard';
  const rows = resultSet?.rows || [];
  const columns = resultSet ? resultSetColumns(resultSet) : [];
  const hasTable = rows.length > 0 && columns.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-50 shadow-[0_30px_100px_rgba(15,23,42,0.4)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
              {isDashboard ? <Layers3 size={19} /> : <BarChart3 size={19} />}
            </div>
            <div className="min-w-0">
              <h2 className="m-0 text-xl font-black text-slate-900">Visuals</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
                {isDashboard ? `${Math.min(charts.length, 4)} chart dashboard` : 'Portfolio analytics preview'}
              </p>
            </div>
          </div>
          <button
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
            type="button"
            onClick={onClose}
            title="Close visuals"
            aria-label="Close visuals"
          >
            <X size={18} />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-5">
            {/* Data Table Section */}
            {hasTable && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Database size={16} className="shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <h3 className="m-0 text-sm font-black text-slate-900">{resultSet?.title || 'Retrieved Data'}</h3>
                      <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">{rows.length} row(s) • {columns.length} column(s)</p>
                    </div>
                  </div>
                  <button
                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                    type="button"
                    onClick={() => setTableMinimized(!tableMinimized)}
                    title={tableMinimized ? 'Show table' : 'Minimize table'}
                    aria-label={tableMinimized ? 'Show table' : 'Minimize table'}
                  >
                    {tableMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>

                {!tableMinimized && (
                  <div className="p-4">
                    <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white whitespace-normal">
                      <table className="min-w-full border-collapse text-left text-[12px]">
                        <thead className="sticky top-0 bg-slate-50 text-slate-500">
                          <tr>
                            {columns.map((column) => (
                              <th className="border-b border-slate-200 px-4 py-2.5 font-black whitespace-nowrap" key={column}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, rowIndex) => (
                            <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50" key={`row-${rowIndex}`}>
                              {columns.map((column) => (
                                <td className="max-w-xs break-words px-4 py-2.5 align-top font-semibold text-slate-700" key={`${rowIndex}-${column}`}>
                                  {toText(row?.[column]) || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Visual Section */}
            <div>
              {!visualSpec.visual_available ? (
                <PortfolioVisualEmptyState message={visualSpec.reason || 'No meaningful visual could be generated for this response.'} />
              ) : isDashboard ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {charts.slice(0, 4).map((chart) => (
                    <ChartCard chart={chart} compact key={chart.chart_id} />
                  ))}
                </div>
              ) : charts[0] ? (
                <ChartCard chart={charts[0]} />
              ) : (
                <PortfolioVisualEmptyState />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>,
    document.body
  );
}
