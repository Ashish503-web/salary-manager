import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeesPage from "./EmployeesPage";
import * as api from "@/lib/api";
import type { EmployeeListItem, LookupsResponse } from "@/lib/types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getLookups: vi.fn(),
    listEmployees: vi.fn(),
    exportEmployeesCsv: vi.fn(),
    downloadBlob: vi.fn(),
  };
});

const lookups: LookupsResponse = {
  countries: [{ code: "US", name: "United States", currency: "USD" }],
  departments: ["Engineering"],
  levels: ["L4"],
  reasons: ["HIRE", "PROMOTION", "MERIT_INCREASE", "MARKET_ADJUSTMENT", "DEMOTION"],
};

const employee: EmployeeListItem = {
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
};

describe("EmployeesPage", () => {
  beforeEach(() => {
    vi.mocked(api.getLookups).mockResolvedValue(lookups);
    vi.mocked(api.listEmployees).mockResolvedValue({
      data: [employee],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("loads employees on mount", async () => {
    render(
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(api.listEmployees).toHaveBeenCalled());
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("debounces the search input and fetches with the search query param", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(api.listEmployees).toHaveBeenCalled());

    const search = screen.getByLabelText(/search employees/i);
    await user.type(search, "Ada");

    await waitFor(
      () => {
        const lastCall = vi.mocked(api.listEmployees).mock.calls.at(-1)?.[0];
        expect(lastCall?.search).toBe("Ada");
      },
      { timeout: 2000 }
    );
  });
});
