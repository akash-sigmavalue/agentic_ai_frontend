export type PortfolioChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'kpi';

export type PortfolioChartAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export type PortfolioChartValueFormat = 'currency' | 'percentage' | 'ratio' | 'integer' | 'decimal' | 'compact';

export type PortfolioChartSort = 'asc' | 'desc' | 'none';

export type PortfolioChartSpec = {
  chart_id: string;
  chart_type: PortfolioChartType;
  title: string;
  description?: string;
  x_key: string;
  y_key: string;
  series_key?: string | null;
  aggregation: PortfolioChartAggregation;
  sort: PortfolioChartSort;
  limit: number;
  x_axis_label?: string;
  y_axis_label?: string;
  value_format: PortfolioChartValueFormat;
  reason?: string;
  confidence?: number;
  data?: Record<string, unknown>[];
};

export type PortfolioVisualSpec = {
  visual_available: boolean;
  mode: 'single' | 'dashboard' | 'no_visual';
  charts: PortfolioChartSpec[];
  reason?: string;
};
