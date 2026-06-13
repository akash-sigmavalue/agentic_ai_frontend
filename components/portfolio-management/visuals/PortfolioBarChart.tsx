'use client';

import type { PortfolioChartSpec } from '@/types/portfolio-visuals';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PortfolioVisualEmptyState from './PortfolioVisualEmptyState';
import { axisStyle, chartData, chartMargin, formatVisualValue, VISUAL_COLORS } from './chart-utils';

type PortfolioBarChartProps = {
  chart: PortfolioChartSpec;
  height?: number;
};

export default function PortfolioBarChart({ chart, height = 340 }: PortfolioBarChartProps) {
  const data = chartData(chart);
  if (!data.length) return <PortfolioVisualEmptyState />;

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ height, minWidth: Math.max(560, data.length * 72) }}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey={chart.x_key} interval={0} tick={axisStyle} tickLine={false} tickMargin={10} />
            <YAxis axisLine={false} tick={axisStyle} tickFormatter={(value) => formatVisualValue(value, chart.value_format)} tickLine={false} width={70} />
            <Tooltip
              cursor={{ fill: 'rgba(37,99,235,0.08)' }}
              formatter={(value) => [formatVisualValue(value, chart.value_format), chart.y_axis_label || chart.y_key]}
              labelClassName="font-black text-slate-900"
              contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', boxShadow: '0 18px 45px rgba(15,23,42,0.15)' }}
            />
            <Bar dataKey={chart.y_key} fill={VISUAL_COLORS[0]} name={chart.y_axis_label || chart.y_key} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
