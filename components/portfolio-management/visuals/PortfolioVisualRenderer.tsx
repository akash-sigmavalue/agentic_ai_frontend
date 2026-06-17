'use client';

import type { PortfolioChartSpec } from '@/types/portfolio-visuals';
import PortfolioAreaChart from './PortfolioAreaChart';
import PortfolioBarChart from './PortfolioBarChart';
import PortfolioKpiMetric from './PortfolioKpiMetric';
import PortfolioLineChart from './PortfolioLineChart';
import PortfolioPieChart from './PortfolioPieChart';
import PortfolioScatterChart from './PortfolioScatterChart';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';

type PortfolioVisualRendererProps = {
  chart: PortfolioChartSpec;
  height?: number;
};

export default function PortfolioVisualRenderer({ chart, height }: PortfolioVisualRendererProps) {
  if (chart.chart_type === 'bar') return <PortfolioBarChart chart={chart} height={height} />;
  if (chart.chart_type === 'line') return <PortfolioLineChart chart={chart} height={height} />;
  if (chart.chart_type === 'area') return <PortfolioAreaChart chart={chart} height={height} />;
  if (chart.chart_type === 'pie') return <PortfolioPieChart chart={chart} height={height} />;
  if (chart.chart_type === 'scatter') return <PortfolioScatterChart chart={chart} height={height} />;
  if (chart.chart_type === 'kpi') return <PortfolioKpiMetric chart={chart} height={height} />;
  return <PortfolioVisualEmptyState message="This visual type is not supported yet." />;
}
