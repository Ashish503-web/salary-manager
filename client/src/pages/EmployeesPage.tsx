import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SortingState } from "@tanstack/react-table";
import * as api from "@/lib/api";
import type { EmployeeListItem, LookupsResponse } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { Pagination } from "@/components/employees/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { downloadBlob } from "@/lib/api";

const ALL = "__all__";
const PAGE_SIZE = 20;

export default function EmployeesPage() {
  const [lookups, setLookups] = useState<LookupsResponse | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [department, setDepartment] = useState<string>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [level, setLevel] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [data, setData] = useState<EmployeeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getLookups().then(setLookups).catch(() => setLookups(null));
  }, []);

  // Reset to page 1 whenever filters/search change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, department, country, level, status]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sort = sorting[0];
        const res = await api.listEmployees({
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          department: department === ALL ? undefined : department,
          country: country === ALL ? undefined : country,
          level: level === ALL ? undefined : level,
          status: status === ALL ? undefined : status,
          sortBy: sort?.id,
          sortDir: sort ? (sort.desc ? "desc" : "asc") : undefined,
        });
        if (cancelled) return;
        setData(res.data);
        setTotal(res.total);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load employees");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, department, country, level, status, sorting]);

  async function handleExport() {
    setExporting(true);
    try {
      const sort = sorting[0];
      const blob = await api.exportEmployeesCsv({
        search: debouncedSearch || undefined,
        department: department === ALL ? undefined : department,
        country: country === ALL ? undefined : country,
        level: level === ALL ? undefined : level,
        status: status === ALL ? undefined : status,
        sortBy: sort?.id,
        sortDir: sort ? (sort.desc ? "desc" : "asc") : undefined,
      });
      downloadBlob(blob, "employees.csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button asChild>
            <Link to="/employees/new">Add Employee</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search employees"
        />

        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {lookups?.departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All countries</SelectItem>
            {lookups?.countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All levels</SelectItem>
            {lookups?.levels.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">Loading employees...</p>
      ) : (
        <>
          <EmployeeTable data={data} sorting={sorting} onSortingChange={setSorting} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
