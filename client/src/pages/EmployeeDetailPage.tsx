import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { EmployeeDetail, LookupsResponse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SalaryHistory } from "@/components/employees/SalaryHistory";
import { RecordSalaryForm } from "@/components/employees/RecordSalaryForm";
import { formatDate, formatMoney } from "@/lib/utils";

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  level: z.string().min(1, "Level is required"),
  managerId: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [lookups, setLookups] = useState<LookupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState("");
  const [terminating, setTerminating] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    api.getLookups().then(setLookups).catch(() => setLookups(null));
  }, []);

  async function loadEmployee() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEmployee(id);
      setEmployee(data);
      reset({
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        department: data.department,
        level: data.level,
        managerId: data.managerId ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values: EditFormValues) {
    if (!id) return;
    setSaveError(null);
    try {
      const updated = await api.updateEmployee(id, {
        ...values,
        managerId: values.managerId || undefined,
      });
      setEmployee(updated);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save changes");
    }
  }

  async function handleTerminate() {
    if (!id) return;
    setTerminating(true);
    try {
      const updated = await api.updateEmployee(id, {
        employmentStatus: "TERMINATED",
        terminationDate: terminationDate || new Date().toISOString().slice(0, 10),
      });
      setEmployee(updated);
      setTerminateOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to terminate employee");
    } finally {
      setTerminating(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading employee...</p>;
  if (error && !employee) return <p className="text-destructive">{error}</p>;
  if (!employee) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {employee.employeeCode} &middot; {employee.email}
          </p>
        </div>
        <Badge variant={employee.employmentStatus === "ACTIVE" ? "success" : "secondary"}>
          {employee.employmentStatus}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Country</p>
              <p>{employee.country}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Manager</p>
              <p>
                {employee.manager
                  ? `${employee.manager.firstName} ${employee.manager.lastName}`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Hire date</p>
              <p>{formatDate(employee.hireDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current salary</p>
              <p>
                {formatMoney(employee.currentSalary, employee.currentSalaryCurrency)}{" "}
                <span className="text-xs text-muted-foreground">
                  ({employee.currentSalaryCurrency})
                </span>
              </p>
            </div>
            {employee.terminationDate && (
              <div>
                <p className="text-muted-foreground">Termination date</p>
                <p>{formatDate(employee.terminationDate)}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
              {errors.jobTitle && (
                <p className="text-xs text-destructive">{errors.jobTitle.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups?.departments ?? [employee.department]).map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Controller
                  control={control}
                  name="level"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups?.levels ?? [employee.level]).map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerId">Manager employee ID</Label>
              <Input id="managerId" {...register("managerId")} />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>

              {employee.employmentStatus === "ACTIVE" && (
                <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="destructive">
                      Terminate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Terminate employee</DialogTitle>
                      <DialogDescription>
                        This will mark {employee.firstName} {employee.lastName} as
                        terminated. This action can affect payroll and reporting.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="terminationDate">Termination date</Label>
                      <Input
                        id="terminationDate"
                        type="date"
                        value={terminationDate}
                        onChange={(e) => setTerminationDate(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTerminateOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleTerminate}
                        disabled={terminating}
                      >
                        {terminating ? "Terminating..." : "Confirm termination"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Button type="button" variant="ghost" onClick={() => navigate("/employees")}>
                Back to directory
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardContent>
          <SalaryHistory
            records={employee.salaryRecords}
            currency={employee.currentSalaryCurrency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record salary change</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordSalaryForm
            employeeId={employee.id}
            reasons={lookups?.reasons}
            onSuccess={(record) =>
              setEmployee((prev) =>
                prev
                  ? {
                      ...prev,
                      salaryRecords: [record, ...prev.salaryRecords],
                      currentSalary: record.amount,
                    }
                  : prev
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
