import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "./KpiCard";
import { formatUsd, formatNumber } from "@/lib/utils";

describe("KpiCard", () => {
  it("renders the label and a pre-formatted currency value", () => {
    render(<KpiCard label="Avg salary" value={formatUsd(123456)} hint="USD" />);

    expect(screen.getByText("Avg salary")).toBeInTheDocument();
    expect(screen.getByText("$123,456")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders formatted plain numbers", () => {
    render(<KpiCard label="Headcount" value={formatNumber(9821)} />);
    expect(screen.getByText("9,821")).toBeInTheDocument();
  });
});
