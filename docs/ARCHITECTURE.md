# Architecture

## System overview

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│  client/ (React)     │  ───────────────────────▶ │  server/ (Express API)   │
│  Vite + TS + Tailwind│  ◀─────────────────────── │  TypeScript + Prisma     │
│  shadcn/ui, Recharts │        JWT bearer          │  bcryptjs + jsonwebtoken │
│  TanStack Table      │                            │  zod validation          │
└─────────────────────┘                            └──────────┬───────────────┘
                                                                │ Prisma Client
                                                                ▼
                                                     ┌──────────────────────┐
                                                     │  SQLite (dev.db)     │
                                                     │  User / Employee /   │
                                                     │  SalaryRecord        │
                                                     └──────────────────────┘
```

Two independently deployable apps in one repo (`server/`, `client/`), talking over a versionless JSON REST API (`/api/*`). No shared code between them beyond the API contract itself, documented once and implemented on both sides against the same spec — see the module docstrings / route files rather than a duplicated schema package, to keep the exercise's footprint small.

## Data model rationale

The central decision is that **salary is a history, not a field**. `Employee` holds identity/org data; `SalaryRecord` holds a dated, reasoned change (`HIRE`, `PROMOTION`, `MERIT_INCREASE`, `MARKET_ADJUSTMENT`, `DEMOTION`). "Current salary" is derived (latest `effectiveDate`), never stored redundantly on `Employee` — a classic normalization trade-off: every salary read does a small extra join/sort instead of risking the derived value drifting from the source of truth. At 10,000 employees with server-side pagination this is cheap; it would need revisiting (e.g. a materialized "current salary" column updated on write) at a much larger scale, which is a reasonable place to optimize later if the org grows.

This also directly enables the two things the requirements ask for: an audit trail per employee, and a "recent salary changes" feed for the dashboard, for free — they're just queries over the same table, not separate features.

`Employee.managerId` is a self-relation, giving reporting-line data without a separate org-chart feature (a chart UI was cut, see REQUIREMENTS.md, but the data supports adding one later).

Country/department/level/FX-rate reference data lives in code (`server/src/config/orgData.ts`), not DB tables. It changes on the order of "once a year" for a real org and isn't HR-editable in this version — modeling it as editable DB rows would add CRUD screens nobody asked for. Trade-off: adding a ninth country means a code change + deploy, not an admin UI action. Acceptable for this scope; flagged as the first thing to move into the DB if the org ever needs self-service country/department management.

## Multi-currency handling

Each employee is paid in the currency implied by their country. Employee-level views (profile, salary history) show the *local currency* amount — that's what's operationally true for that person. Org-wide analytics (dashboard averages, breakdowns, distribution) normalize everything to USD via a static conversion table, because you cannot meaningfully average ₹1,800,000 and $95,000 without a common unit. The UI labels currency explicitly in both places so an HR manager never has to guess which unit they're looking at (see REQUIREMENTS.md for why the FX table is static rather than live).

## Auth

Single-role JWT auth: `POST /api/auth/login` issues a bearer token (12h expiry) checked by an `Authorization` header on every other route. No sessions/cookies, no refresh-token flow — appropriate for a single trusted HR-manager persona, not a public-facing app. Passwords are bcrypt-hashed; the seeded credential is documented in `server/.env.example`, never committed as a real secret.

## Why SQLite

The assessment explicitly allows SQLite, and the app is a single-writer, single-tenant tool for one HR manager — there's no concurrent-write contention to design around. SQLite means zero infra to stand up for grading/demoing: clone, `npm install`, `npm run seed`, `npm run dev`. Prisma's schema is the same whether the datasource is SQLite or Postgres, so moving to Postgres later (e.g. for concurrent HR staff, or hosted deployment with durable storage) is a one-line `datasource` change plus a migration re-run, not a rewrite — that portability is *why* Prisma was chosen over a SQLite-specific query layer.

## Backend structure

`server/src/modules/{auth,employees,salary,analytics,lookups}` — each module pairs a thin Express router with a service file holding the actual logic (validation, aggregation, Prisma queries). This split exists specifically so the business logic — "what is an employee's current salary," "how do you compute median-by-department," "what counts as a valid salary change" — can be unit tested as plain functions against fixture data, without spinning up an HTTP server or a real database for every test. See `server/tests/`.

## Frontend structure

`client/src/{pages,components,lib}`. `lib/api.ts` is the single place that knows the API contract (typed request/response shapes matching the backend); pages and components never call `fetch` directly. `lib/auth-context.tsx` holds the JWT and gates routes. The employee directory uses TanStack Table with server-side pagination/sorting/filtering — the grid never tries to hold all 10,000 rows client-side, matching the backend's paginated `GET /employees`.

## Performance considerations

- **10,000-row directory**: server-side pagination (default page size 25, capped at 100) plus indexed filter columns (`department`, `country`, `level`, `employmentStatus`, `managerId` all indexed in `schema.prisma`) — the list endpoint never does a full table scan of rows *and* ships them to the browser; it pages at the DB.
- **Analytics aggregation**: computed via SQL-level grouping/aggregate queries where practical, with the aggregation math itself factored into pure, unit-tested functions (`analytics.service.ts`) so correctness is verified independent of query performance.
- **Seeding 10,000 rows**: batched `createMany` (chunks of ~500-1000) rather than 10,000 sequential `create` calls, to keep seed time well under a minute.
- **CSV export**: streams from the same filtered query the directory view uses, so exporting "all engineers in Germany" doesn't require the client to have paginated through them first.

## Testing strategy

Unit tests target the parts most likely to be silently wrong and hardest to eyeball-verify: salary-history derivation, aggregation math (avg/median/bucketing), and input validation — all pure functions tested against small, hand-built fixtures, so they're fast and deterministic and don't depend on the 10,000-row seed data. A smaller set of integration tests exercises the real HTTP + DB path end-to-end for the primary flows (login, list, create, record a salary change). Frontend tests cover the components most prone to prop/state bugs (table pagination, salary history rendering, form validation, KPI formatting) with the API layer mocked, so they run without a live backend.
