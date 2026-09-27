import type { PrismaClient, SalaryRecord } from "@prisma/client";
import { z } from "zod";
import { HttpError } from "../../lib/http-error.js";

/** Picks the salary record with the most recent effectiveDate.
 * Returns undefined for an empty array. Ties are broken by picking the
 * record that appears first among those tied for the max effectiveDate
 * (stable, deterministic regardless of input order). */
export function getCurrentSalary(records: SalaryRecord[]): SalaryRecord | undefined {
  if (records.length === 0) return undefined;

  let current = records[0];
  for (const record of records) {
    if (record.effectiveDate.getTime() > current.effectiveDate.getTime()) {
      current = record;
    }
  }
  return current;
}

export const MANUAL_SALARY_REASONS = [
  "PROMOTION",
  "MERIT_INCREASE",
  "MARKET_ADJUSTMENT",
  "DEMOTION",
] as const;

export const addSalaryRecordSchema = z.object({
  amount: z.number().positive(),
  effectiveDate: z.coerce.date().refine(
    (date) => {
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return date.getTime() <= oneDayFromNow.getTime();
    },
    { message: "effectiveDate must not be more than 1 day in the future" }
  ),
  reason: z.enum(MANUAL_SALARY_REASONS),
});

export type AddSalaryRecordInput = z.infer<typeof addSalaryRecordSchema>;

/** Validates the raw input for a manual salary change. Exported separately
 * from addSalaryRecord so validation logic is testable without a DB. */
export function validateAddSalaryRecordInput(input: unknown): AddSalaryRecordInput {
  const parsed = addSalaryRecordSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join("; "));
  }
  return parsed.data;
}

export async function addSalaryRecord(
  prisma: PrismaClient,
  employeeId: string,
  rawInput: unknown
): Promise<SalaryRecord> {
  const input = validateAddSalaryRecordInput(rawInput);

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new HttpError(404, "Employee not found");
  }

  return prisma.salaryRecord.create({
    data: {
      employeeId,
      amount: input.amount,
      currency: employee.currency,
      effectiveDate: input.effectiveDate,
      reason: input.reason,
    },
  });
}
