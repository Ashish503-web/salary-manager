import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsGroup } from "@/lib/types";
import { CHART_INK, SEQUENTIAL_BLUE } from "@/lib/chart-colors";
import { formatUsd } from "@/lib/utils";

export interface AvgSalaryBarChartProps {
  data: AnalyticsGroup[];
  title: string;
}

export function AvgSalaryBarChart({ data, title }: AvgSalaryBarChartProps) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
          <XAxis
            dataKey="key"
            tick={{ fontSize: 12, fill: CHART_INK.muted }}
            axisLine={{ stroke: CHART_INK.baseline }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: CHART_INK.muted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatUsd(v)}
            width={80}
          />
          <Tooltip
            formatter={(value: number) => formatUsd(value)}
            labelFormatter={(label) => label}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="avgSalaryUsd"
            name="Avg salary (USD)"
            fill={SEQUENTIAL_BLUE}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
