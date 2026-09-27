import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordSalaryForm } from "./RecordSalaryForm";
import * as api from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    addSalaryRecord: vi.fn(),
  };
});

describe("RecordSalaryForm", () => {
  beforeEach(() => {
    vi.mocked(api.addSalaryRecord).mockReset();
  });

  it("rejects a non-positive amount and an empty reason", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<RecordSalaryForm employeeId="emp-1" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/amount/i), "0");
    await user.type(screen.getByLabelText(/effective date/i), "2024-01-01");
    await user.click(screen.getByRole("button", { name: /record salary change/i }));

    expect(await screen.findByText(/amount must be greater than 0/i)).toBeInTheDocument();
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
    expect(api.addSalaryRecord).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("submits the correct payload on valid input", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(api.addSalaryRecord).mockResolvedValue({
      id: "sr-1",
      amount: 125000,
      currency: "USD",
      effectiveDate: "2024-02-01",
      reason: "PROMOTION",
      createdAt: "2024-02-01T00:00:00Z",
    });

    render(<RecordSalaryForm employeeId="emp-1" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/amount/i), "125000");
    await user.type(screen.getByLabelText(/effective date/i), "2024-02-01");

    // Native select fallback isn't used; Radix Select trigger needs a click + option pick.
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Promotion" }));

    await user.click(screen.getByRole("button", { name: /record salary change/i }));

    await waitFor(() =>
      expect(api.addSalaryRecord).toHaveBeenCalledWith("emp-1", {
        amount: 125000,
        effectiveDate: "2024-02-01",
        reason: "PROMOTION",
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
