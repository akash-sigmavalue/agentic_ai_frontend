'use client';

import type { PortfolioChartSpec } from '@/types/portfolio-visuals';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import { chartData, formatVisualValue, VISUAL_COLORS } from './chart-utils';

type PortfolioPieChartProps = {
  chart: PortfolioChartSpec;
  height?: number;
};

export default function PortfolioPieChart({ chart, height = 340 }: PortfolioPieChartProps) {
  const data = chartData(chart);
  if (!data.length) return <PortfolioVisualEmptyState />;

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Tooltip
            formatter={(value) => [formatVisualValue(value, chart.value_format), chart.y_axis_label || chart.y_key]}
            contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', boxShadow: '0 18px 45px rgba(15,23,42,0.15)' }}
          />
          <Legend iconSize={9} iconType="circle" wrapperStyle={{ color: '#64748b', fontSize: 12, fontWeight: 700 }} />
          <Pie
            cx="50%"
            cy="48%"
            data={data}
            dataKey={chart.y_key}
            innerRadius="48%"
            nameKey={chart.x_key}
            outerRadius="76%"
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell fill={VISUAL_COLORS[index % VISUAL_COLORS.length]} key={`${chart.chart_id}-slice-${index}`} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
