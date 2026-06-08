'use client';

import type { PortfolioChartSpec, PortfolioVisualSpec } from '@/types/portfolio-visuals';
import { BarChart3, Gauge, Layers3, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import PortfolioVisualRenderer from './PortfolioVisualRenderer';

type PortfolioVisualsModalProps = {
  visualSpec: PortfolioVisualSpec | null;
  onClose: () => void;
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

export default function PortfolioVisualsModal({ visualSpec, onClose }: PortfolioVisualsModalProps) {
  if (!visualSpec) return null;
  if (typeof document === 'undefined') return null;

  const charts = visualSpec.charts || [];
  const isDashboard = visualSpec.mode === 'dashboard';

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
        </main>
      </div>
    </div>,
    document.body
  );
}
