import type { RecentChange } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, formatReason } from "@/lib/utils";

export function RecentChangesTable({ data }: { data: RecentChange[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Recent salary changes</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Previous</TableHead>
            <TableHead>New amount</TableHead>
            <TableHead>Effective date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No recent changes.
              </TableCell>
            </TableRow>
          )}
          {data.map((row, idx) => (
            <TableRow key={`${row.employeeId}-${row.effectiveDate}-${idx}`}>
              <TableCell>{row.employeeName}</TableCell>
              <TableCell>{row.department}</TableCell>
              <TableCell>{formatReason(row.reason)}</TableCell>
              <TableCell>
                {row.previousAmount != null
                  ? formatMoney(row.previousAmount, row.currency)
                  : "-"}
              </TableCell>
              <TableCell>{formatMoney(row.amount, row.currency)}</TableCell>
              <TableCell>{formatDate(row.effectiveDate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
