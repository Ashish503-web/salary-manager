import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalaryHistory, currentSalaryFromRecords } from "./SalaryHistory";
import type { SalaryRecord } from "@/lib/types";

const records: SalaryRecord[] = [
  {
    id: "r3",
    amount: 150000,
    currency: "USD",
    effectiveDate: "2023-06-01",
    reason: "PROMOTION",
    createdAt: "2023-06-01T00:00:00Z",
  },
  {
    id: "r2",
    amount: 130000,
    currency: "USD",
    effectiveDate: "2022-01-01",
    reason: "MERIT_INCREASE",
    createdAt: "2022-01-01T00:00:00Z",
  },
  {
    id: "r1",
    amount: 120000,
    currency: "USD",
    effectiveDate: "2021-01-01",
    reason: "HIRE",
    createdAt: "2021-01-01T00:00:00Z",
  },
];

describe("currentSalaryFromRecords", () => {
  it("picks the record with the most recent effective date regardless of array order", () => {
    const shuffled = [records[1], records[0], records[2]];
    expect(currentSalaryFromRecords(shuffled)?.id).toBe("r3");
  });

  it("returns null for an empty list", () => {
    expect(currentSalaryFromRecords([])).toBeNull();
  });
});

describe("SalaryHistory", () => {
  it("renders records and displays the current (most recent) salary", () => {
    render(<SalaryHistory records={records} currency="USD" />);

    expect(screen.getByText(/current salary/i)).toBeInTheDocument();

    // Two $150,000 occurrences: the "current salary" summary line and the
    // most recent history row.
    expect(screen.getAllByText("$150,000")).toHaveLength(2);
    expect(screen.getByText("$130,000")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument();
  });

  it("renders an empty state with no records", () => {
    render(<SalaryHistory records={[]} currency="USD" />);
    expect(screen.getByText("No salary records yet.")).toBeInTheDocument();
  });
});
