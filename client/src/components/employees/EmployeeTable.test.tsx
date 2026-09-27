import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { EmployeeTable } from "./EmployeeTable";
import type { EmployeeListItem } from "@/lib/types";

const employees: EmployeeListItem[] = [
  {
    id: "1",
    employeeCode: "E001",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@acme.com",
    gender: "FEMALE",
    country: "US",
    department: "Engineering",
    jobTitle: "Engineer",
    level: "L4",
    currency: "USD",
    employmentStatus: "ACTIVE",
    hireDate: "2020-01-15",
    managerId: null,
    currentSalary: 150000,
    currentSalaryCurrency: "USD",
  },
  {
    id: "2",
    employeeCode: "E002",
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@acme.com",
    gender: "FEMALE",
    country: "IN",
    department: "Engineering",
    jobTitle: "Principal Engineer",
    level: "L6",
    currency: "INR",
    employmentStatus: "TERMINATED",
    hireDate: "2018-06-01",
    managerId: null,
    currentSalary: 1850000,
    currentSalaryCurrency: "INR",
  },
];

describe("EmployeeTable", () => {
  it("renders rows from provided data", () => {
    render(
      <MemoryRouter>
        <EmployeeTable data={employees} sorting={[]} onSortingChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("E001")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("TERMINATED")).toBeInTheDocument();
  });

  it("shows an empty state when there is no data", () => {
    render(
      <MemoryRouter>
        <EmployeeTable data={[]} sorting={[]} onSortingChange={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("No employees found.")).toBeInTheDocument();
  });
});
