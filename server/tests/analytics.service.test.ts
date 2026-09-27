import { describe, expect, it } from "vitest";
import {
  computeDistribution,
  computeOverview,
  computePayEquity,
  groupBy,
} from "../src/modules/analytics/analytics.service.js";

const fixture = [
  { status: "ACTIVE", department: "Engineering", gender: "FEMALE", currentSalaryUsd: 100000 },
  { status: "ACTIVE", department: "Engineering", gender: "MALE", currentSalaryUsd: 120000 },
  { status: "ACTIVE", department: "Sales", gender: "MALE", currentSalaryUsd: 80000 },
  { status: "ACTIVE", department: "Sales", gender: "FEMALE", currentSalaryUsd: 60000 },
  { status: "TERMINATED", department: "Sales", gender: "MALE", currentSalaryUsd: 200000 },
  { status: "ACTIVE", department: "Engineering", gender: "FEMALE", currentSalaryUsd: 140000 },
];

describe("computeOverview", () => {
  it("computes headcount, payroll, avg and median over ACTIVE employees only", () => {
    const result = computeOverview(fixture);

    expect(result.headcount).toBe(6);
    expect(result.activeHeadcount).toBe(5);
    // Active salaries: 100000, 120000, 80000, 60000, 140000 -> sum 500000
    expect(result.totalAnnualPayrollUsd).toBe(500000);
    expect(result.avgSalaryUsd).toBe(100000);
    // sorted active: 60000, 80000, 100000, 120000, 140000 -> median 100000
    expect(result.medianSalaryUsd).toBe(100000);
  });

  it("handles an empty employee list", () => {
    const result = computeOverview([]);
    expect(result).toEqual({
      headcount: 0,
      activeHeadcount: 0,
      totalAnnualPayrollUsd: 0,
      avgSalaryUsd: 0,
      medianSalaryUsd: 0,
    });
  });

  it("computes an even-length median as the average of the two middle values", () => {
    const employees = [
      { status: "ACTIVE", currentSalaryUsd: 10000 },
      { status: "ACTIVE", currentSalaryUsd: 20000 },
      { status: "ACTIVE", currentSalaryUsd: 30000 },
      { status: "ACTIVE", currentSalaryUsd: 40000 },
    ];
    expect(computeOverview(employees).medianSalaryUsd).toBe(25000);
  });
});

describe("groupBy", () => {
  it("groups ACTIVE employees by department, sorted by headcount desc", () => {
    const result = groupBy(fixture, (e) => e.department);

    // Engineering: 3 active (100000, 120000, 140000) -> avg 120000, median 120000
    // Sales: 2 active (80000, 60000) -> avg 70000, median 70000 (terminated excluded)
    expect(result).toEqual([
      { key: "Engineering", headcount: 3, avgSalaryUsd: 120000, medianSalaryUsd: 120000 },
      { key: "Sales", headcount: 2, avgSalaryUsd: 70000, medianSalaryUsd: 70000 },
    ]);
  });
});

describe("computeDistribution", () => {
  it("buckets salaries with the given bucket size and covers the observed range", () => {
    const salaries = [5000, 15000, 25000, 45000, 47000];
    const buckets = computeDistribution(salaries, 20000);

    expect(buckets).toEqual([
      { bucketLabel: "0-20,000", min: 0, max: 20000, count: 2 },
      { bucketLabel: "20,000-40,000", min: 20000, max: 40000, count: 1 },
      { bucketLabel: "40,000-60,000", min: 40000, max: 60000, count: 2 },
    ]);
  });

  it("returns an empty array for no salaries", () => {
    expect(computeDistribution([], 20000)).toEqual([]);
  });
});

describe("computePayEquity", () => {
  it("computes avg salary and headcount per department/gender for ACTIVE employees", () => {
    const result = computePayEquity(fixture);

    expect(result).toEqual([
      { department: "Engineering", gender: "FEMALE", avgSalaryUsd: 120000, headcount: 2 },
      { department: "Engineering", gender: "MALE", avgSalaryUsd: 120000, headcount: 1 },
      { department: "Sales", gender: "FEMALE", avgSalaryUsd: 60000, headcount: 1 },
      { department: "Sales", gender: "MALE", avgSalaryUsd: 80000, headcount: 1 },
    ]);
  });
});
