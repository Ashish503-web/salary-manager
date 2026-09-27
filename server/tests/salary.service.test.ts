import { describe, expect, it } from "vitest";
import type { SalaryRecord } from "@prisma/client";
import {
  getCurrentSalary,
  validateAddSalaryRecordInput,
} from "../src/modules/salary/salary.service.js";
import { HttpError } from "../src/lib/http-error.js";

function makeRecord(overrides: Partial<SalaryRecord>): SalaryRecord {
  return {
    id: "rec-1",
    employeeId: "emp-1",
    amount: 50000,
    currency: "USD",
    effectiveDate: new Date("2020-01-01"),
    reason: "HIRE",
    createdAt: new Date("2020-01-01"),
    ...overrides,
  };
}

describe("getCurrentSalary", () => {
  it("returns undefined for an empty array", () => {
    expect(getCurrentSalary([])).toBeUndefined();
  });

  it("picks the record with the max effectiveDate regardless of insertion order", () => {
    const oldest = makeRecord({ id: "a", effectiveDate: new Date("2019-01-01"), amount: 40000 });
    const newest = makeRecord({ id: "b", effectiveDate: new Date("2023-06-15"), amount: 90000 });
    const middle = makeRecord({ id: "c", effectiveDate: new Date("2021-03-01"), amount: 60000 });

    expect(getCurrentSalary([oldest, newest, middle])?.id).toBe("b");
    expect(getCurrentSalary([newest, middle, oldest])?.id).toBe("b");
    expect(getCurrentSalary([middle, oldest, newest])?.id).toBe("b");
  });

  it("breaks ties consistently (first among tied max-date records)", () => {
    const date = new Date("2022-01-01");
    const first = makeRecord({ id: "first", effectiveDate: date, amount: 70000 });
    const second = makeRecord({ id: "second", effectiveDate: date, amount: 75000 });

    expect(getCurrentSalary([first, second])?.id).toBe("first");
    expect(getCurrentSalary([second, first])?.id).toBe("second");
  });
});

describe("validateAddSalaryRecordInput", () => {
  const validBase = {
    amount: 75000,
    effectiveDate: new Date().toISOString(),
    reason: "MERIT_INCREASE",
  };

  it("accepts a valid manual salary change", () => {
    const result = validateAddSalaryRecordInput(validBase);
    expect(result.amount).toBe(75000);
    expect(result.reason).toBe("MERIT_INCREASE");
  });

  it("rejects amount <= 0", () => {
    expect(() => validateAddSalaryRecordInput({ ...validBase, amount: 0 })).toThrow(HttpError);
    expect(() => validateAddSalaryRecordInput({ ...validBase, amount: -100 })).toThrow(HttpError);
  });

  it("rejects an effectiveDate more than 1 day in the future", () => {
    const farFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(() =>
      validateAddSalaryRecordInput({ ...validBase, effectiveDate: farFuture })
    ).toThrow(HttpError);
  });

  it("rejects HIRE as a manual reason", () => {
    expect(() => validateAddSalaryRecordInput({ ...validBase, reason: "HIRE" })).toThrow(
      HttpError
    );
  });

  it("rejects an unknown reason", () => {
    expect(() =>
      validateAddSalaryRecordInput({ ...validBase, reason: "NOT_A_REASON" })
    ).toThrow(HttpError);
  });
});
