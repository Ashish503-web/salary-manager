// Small standalone module (no React) that owns reading/writing the persisted
// auth token so the API client can access it without importing React context
// (avoids circular imports between api.ts and auth-context.tsx).
import type { User } from "./types";

const STORAGE_KEY = "acme-salary-manager:auth";

export interface StoredAuth {
  token: string;
  user: User;
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveAuth(auth: StoredAuth | null): void {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getToken(): string | null {
  return loadAuth()?.token ?? null;
}
