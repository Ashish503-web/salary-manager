/** Static reference data for the org. Kept as code (not DB tables) since it changes
 * rarely and doesn't need HR-editable CRUD for this scope. */

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "BR", name: "Brazil", currency: "BRL" },
];

export const DEPARTMENTS: string[] = [
  "Engineering",
  "Sales",
  "Marketing",
  "Product",
  "Finance",
  "Human Resources",
  "Operations",
  "Customer Support",
];

export const LEVELS: string[] = ["L1", "L2", "L3", "L4", "L5", "L6"];

/** Static USD conversion rates for analytics normalization. Not live FX data —
 * documented simplification, see docs/REQUIREMENTS.md. */
export const FX_TO_USD: Record<string, number> = {
  USD: 1,
  INR: 0.012,
  GBP: 1.27,
  EUR: 1.08,
  CAD: 0.73,
  AUD: 0.66,
  SGD: 0.74,
  BRL: 0.18,
};

export function toUsd(amount: number, currency: string): number {
  const rate = FX_TO_USD[currency];
  if (rate === undefined) {
    throw new Error(`Unknown currency: ${currency}`);
  }
  return amount * rate;
}

export function currencyForCountry(countryCode: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    throw new Error(`Unknown country code: ${countryCode}`);
  }
  return country.currency;
}
