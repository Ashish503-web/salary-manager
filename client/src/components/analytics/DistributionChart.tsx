import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistributionBucket } from "@/lib/types";
import { CHART_INK, SEQUENTIAL_BLUE } from "@/lib/chart-colors";
import { formatNumber } from "@/lib/utils";

export function DistributionChart({ data }: { data: DistributionBucket[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Salary distribution</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
          <XAxis
            dataKey="bucketLabel"
            tick={{ fontSize: 11, fill: CHART_INK.muted }}
            axisLine={{ stroke: CHART_INK.baseline }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: CHART_INK.muted }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={48}
          />
          <Tooltip
            formatter={(value: number) => [formatNumber(value), "Employees"]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" name="Employees" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
