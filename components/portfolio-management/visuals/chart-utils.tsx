import type { PortfolioChartSpec, PortfolioChartValueFormat } from '@/types/portfolio-visuals';

export const VISUAL_COLORS = ['#2563eb', '#0f172a', '#14b8a6', '#f97316', '#e11d48', '#7c3aed', '#0891b2', '#65a30d'];

export const axisStyle = {
  fontSize: 11,
  fontWeight: 700,
  fill: '#64748b',
};

export const chartMargin = { top: 16, right: 20, left: 8, bottom: 12 };

export const toNumericValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatVisualValue = (value: unknown, format: PortfolioChartValueFormat = 'decimal') => {
  const number = toNumericValue(value);
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', {
      currency: 'INR',
      maximumFractionDigits: 1,
      notation: 'compact',
      style: 'currency',
    }).format(number);
  }
  if (format === 'percentage') return `${number.toFixed(1)}%`;
  if (format === 'ratio') return number.toFixed(2);
  if (format === 'integer') return Math.round(number).toLocaleString('en-IN');
  if (format === 'compact') {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(number);
  }
  return number.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const chartData = (chart: PortfolioChartSpec) => chart.data || [];

export const tooltipLabel = (chart: PortfolioChartSpec, payload?: Record<string, unknown>) => {
  const label = payload?.label || payload?.asset_name || payload?.asset_code || payload?.property_name;
  return label ? String(label) : '';
};
