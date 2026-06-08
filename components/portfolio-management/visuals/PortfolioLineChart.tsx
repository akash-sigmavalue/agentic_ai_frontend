'use client';

import type { PortfolioChartSpec } from '@/types/portfolio-visuals';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import { axisStyle, chartData, chartMargin, formatVisualValue, VISUAL_COLORS } from './chart-utils';

type PortfolioLineChartProps = {
  chart: PortfolioChartSpec;
  height?: number;
};

export default function PortfolioLineChart({ chart, height = 340 }: PortfolioLineChartProps) {
  const data = chartData(chart);
  if (!data.length) return <PortfolioVisualEmptyState />;

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={chartMargin}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey={chart.x_key} tick={axisStyle} tickLine={false} tickMargin={10} />
          <YAxis axisLine={false} tick={axisStyle} tickFormatter={(value) => formatVisualValue(value, chart.value_format)} tickLine={false} width={70} />
          <Tooltip
            formatter={(value) => [formatVisualValue(value, chart.value_format), chart.y_axis_label || chart.y_key]}
            labelClassName="font-black text-slate-900"
            contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', boxShadow: '0 18px 45px rgba(15,23,42,0.15)' }}
          />
          <Line
            activeDot={{ r: 6, strokeWidth: 0 }}
            dataKey={chart.y_key}
            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
            name={chart.y_axis_label || chart.y_key}
            stroke={VISUAL_COLORS[0]}
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
