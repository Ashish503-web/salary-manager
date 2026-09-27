import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PayEquityRow } from "@/lib/types";
import { CHART_INK, GENDER_COLORS } from "@/lib/chart-colors";
import { formatUsd } from "@/lib/utils";

interface ChartRow {
  department: string;
  [gender: string]: string | number;
}

function toChartRows(rows: PayEquityRow[]): { data: ChartRow[]; genders: string[] } {
  const byDept = new Map<string, ChartRow>();
  const genders = new Set<string>();
  for (const row of rows) {
    genders.add(row.gender);
    const existing = byDept.get(row.department) ?? { department: row.department };
    existing[row.gender] = row.avgSalaryUsd;
    byDept.set(row.department, existing);
  }
  return { data: Array.from(byDept.values()), genders: Array.from(genders) };
}

export function PayEquityChart({ data }: { data: PayEquityRow[] }) {
  const { data: chartData, genders } = toChartRows(data);

  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-medium">Pay equity by department &amp; gender</h3>
        <p className="text-xs text-muted-foreground">
          Illustrative / synthetic data — not derived from real compensation
          equity analysis.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 11, fill: CHART_INK.muted }}
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
          <Tooltip formatter={(value: number) => formatUsd(value)} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {genders.map((gender) => (
            <Bar
              key={gender}
              dataKey={gender}
              name={gender.charAt(0) + gender.slice(1).toLowerCase()}
              fill={GENDER_COLORS[gender] ?? CHART_INK.muted}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
