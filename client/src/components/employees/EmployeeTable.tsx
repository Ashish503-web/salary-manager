import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { EmployeeListItem } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/utils";

const columnHelper = createColumnHelper<EmployeeListItem>();

const columns = [
  columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
    id: "name",
    header: "Name",
    enableSorting: true,
    cell: (info) => (
      <div>
        <div className="font-medium">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">
          {info.row.original.employeeCode}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("department", {
    id: "department",
    header: "Department",
    enableSorting: true,
  }),
  columnHelper.accessor("country", {
    id: "country",
    header: "Country",
    enableSorting: true,
  }),
  columnHelper.accessor("level", {
    id: "level",
    header: "Level",
    enableSorting: true,
  }),
  columnHelper.accessor("currentSalary", {
    id: "currentSalary",
    header: "Current salary",
    enableSorting: true,
    cell: (info) =>
      formatMoney(info.getValue(), info.row.original.currentSalaryCurrency),
  }),
  columnHelper.accessor("hireDate", {
    id: "hireDate",
    header: "Hire date",
    enableSorting: true,
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor("employmentStatus", {
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: (info) => (
      <Badge variant={info.getValue() === "ACTIVE" ? "success" : "secondary"}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

export interface EmployeeTableProps {
  data: EmployeeListItem[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

export function EmployeeTable({ data, sorting, onSortingChange }: EmployeeTableProps) {
  const navigate = useNavigate();

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    manualSorting: true,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const canSort = header.column.getCanSort();
              const sortDir = header.column.getIsSorted();
              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : canSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 px-2"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortDir === "asc" && <ArrowUp className="ml-1 h-3 w-3" />}
                      {sortDir === "desc" && <ArrowDown className="ml-1 h-3 w-3" />}
                      {!sortDir && <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />}
                    </Button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
              No employees found.
            </TableCell>
          </TableRow>
        )}
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            onClick={() => navigate(`/employees/${row.original.id}`)}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
