import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalaryRecord } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHART_INK, SEQUENTIAL_BLUE } from "@/lib/chart-colors";
import { formatDate, formatMoney, formatReason } from "@/lib/utils";

export interface SalaryHistoryProps {
  records: SalaryRecord[]; // expected sorted newest first, per API contract
  currency: string;
}

export function currentSalaryFromRecords(records: SalaryRecord[]): SalaryRecord | null {
  if (records.length === 0) return null;
  // Records are sorted newest first; the current salary is the one with the
  // most recent effectiveDate (defensive: don't assume array order in case
  // upstream ordering changes, sort explicitly by effectiveDate).
  return [...records].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  )[0];
}

export function SalaryHistory({ records, currency }: SalaryHistoryProps) {
  const current = currentSalaryFromRecords(records);
  const chartData = [...records]
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
    .map((r) => ({ date: formatDate(r.effectiveDate), amount: r.amount }));

  return (
    <div className="space-y-4">
      {current && (
        <p className="text-sm">
          Current salary:{" "}
          <span className="font-semibold">{formatMoney(current.amount, currency)}</span>
        </p>
      )}

      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: CHART_INK.muted }}
              axisLine={{ stroke: CHART_INK.baseline }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_INK.muted }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={(v) => formatMoney(v, currency)}
            />
            <Tooltip
              formatter={(value: number) => formatMoney(value, currency)}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={SEQUENTIAL_BLUE}
              strokeWidth={2}
              dot={{ r: 4, fill: SEQUENTIAL_BLUE }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Amount</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Effective date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No salary records yet.
              </TableCell>
            </TableRow>
          )}
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatMoney(r.amount, r.currency)}</TableCell>
              <TableCell>{formatReason(r.reason)}</TableCell>
              <TableCell>{formatDate(r.effectiveDate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
