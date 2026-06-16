'use client';

import type { PortfolioChartSpec } from '@/types/portfolio-visuals';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import { axisStyle, chartData, chartMargin, formatVisualValue, tooltipLabel, VISUAL_COLORS } from './chart-utils';

type PortfolioScatterChartProps = {
  chart: PortfolioChartSpec;
  height?: number;
};

export default function PortfolioScatterChart({ chart, height = 340 }: PortfolioScatterChartProps) {
  const data = chartData(chart);
  if (!data.length) return <PortfolioVisualEmptyState />;

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <ScatterChart data={data} margin={chartMargin}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            axisLine={false}
            dataKey={chart.x_key}
            name={chart.x_axis_label || chart.x_key}
            tick={axisStyle}
            tickFormatter={(value) => formatVisualValue(value, chart.value_format)}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey={chart.y_key}
            name={chart.y_axis_label || chart.y_key}
            tick={axisStyle}
            tickFormatter={(value) => formatVisualValue(value, chart.value_format)}
            tickLine={false}
            type="number"
            width={70}
          />
          <ZAxis range={[80, 80]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, name) => [formatVisualValue(value, chart.value_format), name]}
            labelFormatter={(_, payload) => tooltipLabel(chart, payload?.[0]?.payload)}
            contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', boxShadow: '0 18px 45px rgba(15,23,42,0.15)' }}
          />
          <Scatter data={data} fill={VISUAL_COLORS[0]} name={chart.title} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
