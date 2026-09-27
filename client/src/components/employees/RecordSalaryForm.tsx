import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { SalaryRecord } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatReason } from "@/lib/utils";

const NON_HIRE_REASONS = [
  "PROMOTION",
  "MERIT_INCREASE",
  "MARKET_ADJUSTMENT",
  "DEMOTION",
] as const;

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  reason: z.enum(NON_HIRE_REASONS, {
    errorMap: () => ({ message: "Reason is required" }),
  }),
});

type FormValues = z.infer<typeof schema>;

export interface RecordSalaryFormProps {
  employeeId: string;
  reasons?: readonly string[];
  onSuccess: (record: SalaryRecord) => void;
}

export function RecordSalaryForm({ employeeId, reasons, onSuccess }: RecordSalaryFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const availableReasons = (reasons?.filter((r) => r !== "HIRE") ?? NON_HIRE_REASONS) as string[];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const record = await api.addSalaryRecord(employeeId, values);
      reset();
      onSuccess(record);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to record salary change");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register("amount")} />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveDate">Effective date</Label>
          <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
          {errors.effectiveDate && (
            <p className="text-xs text-destructive">{errors.effectiveDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {availableReasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {formatReason(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.reason && (
            <p className="text-xs text-destructive">{errors.reason.message}</p>
          )}
        </div>
      </div>
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Record Salary Change"}
      </Button>
    </form>
  );
}
