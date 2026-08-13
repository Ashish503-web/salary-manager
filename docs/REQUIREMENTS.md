# ACME Salary Manager — Requirements

## Goal
ACME's HR team currently manages compensation for ~10,000 employees across multiple countries in spreadsheets. That doesn't scale: it's error-prone, hard to search, has no audit trail for raises, and can't answer aggregate questions ("what do we pay engineers in India vs. the US?") without manual pivot tables. This project replaces the spreadsheet workflow with a web app so the HR Manager can **manage individual employee compensation records** and **answer organization-wide pay questions** from one system of record.

## Primary user
HR Manager — a single trusted internal role. Not building for employees (self-service), managers (approval workflows), or finance/payroll systems integration in this version.

## In scope

**Employee directory & profiles**
- Searchable, filterable (department, country, level, status), sortable, paginated list of all employees — must stay usable at 10,000 rows (server-side pagination, not client-side).
- Create / edit employee profile (name, email, country, department, job title, level, manager, status).
- Terminate an employee (soft status change, not deletion — preserves salary history for reporting).
- CSV export of the current filtered view, for ad-hoc analysis outside the tool.

**Compensation as a history, not a field**
- Every employee's pay is a *sequence* of dated `SalaryRecord`s (hire, promotion, merit increase, market adjustment, demotion), not a single mutable number. This is the central design decision: it gives an audit trail ("when did this person last get a raise, and why?") and lets analytics and "recent changes" reporting work off real data instead of a snapshot.
- Recording a change requires an amount, effective date, and reason — no silent overwrites.

**Answering "how do we pay people"**
- Dashboard: headcount, total annual payroll, average/median salary, all normalized to USD so cross-country numbers are comparable.
- Breakdowns by department, country, and level.
- Salary distribution histogram.
- Pay-equity view (average pay by gender within department) — flagged in the UI as illustrative, since the underlying data is synthetic.
- Recent salary changes feed, so an HR manager can see raise activity at a glance.

**Access control**
- Single HR Manager login (JWT-based), seeded credentials. The app is not public — everything except login requires auth.

**Multi-currency**
- Employees are paid in their local currency (derived from country); a static USD conversion table normalizes cross-country analytics. This is a deliberately simple model — see below.

## Deliberately out of scope, and why

- **Natural-language / chatbot Q&A over the data.** The stated goal is to let the HR manager "answer questions about how the org pays people." A structured dashboard with filters, breakdowns, and export covers the realistic question set (by department/country/level/gender, over time) with results that are deterministic, auditable, and don't risk a model inventing a number. A chat layer could sit on top of these same aggregation endpoints later without changing the data model — but building it now would spend the assessment's time budget on UI chrome around an LLM call rather than on the compensation data model itself, which is the actually hard part of this problem.
- **Live FX rates.** Cross-country comparisons use a static, hardcoded USD conversion table (`server/src/config/orgData.ts`). Real payroll systems need live, audited FX rates tied to specific pay dates; wiring up a live rate provider is an integration task orthogonal to the core problem here, and a static table makes the analytics numbers reproducible for grading/testing. Clearly labeled as a simplification in the UI and code.
- **Payroll processing / tax calculation / actual payment execution.** This is a *system of record* for compensation decisions, not a payroll run engine. Tax withholding, benefits, and disbursement are entire separate systems in real orgs and would dwarf the scope of this exercise.
- **Multiple roles / granular RBAC.** Only one persona was specified (HR Manager). Building a permission matrix for roles that don't exist yet in the spec would be speculative design, not requirements-driven design.
- **Multi-tenant orgs.** This is single-org software for ACME, not a SaaS platform serving many companies.
- **Bulk CSV import, org-chart visualization.** Both are reasonable v2 features (import would meaningfully speed up onboarding a real 10,000-row spreadsheet), but neither is required to demonstrate the core data model, CRUD, and analytics. Noted here so it's clear they were considered and cut, not missed.
- **Employee self-service / manager approval workflows.** Out of scope because the only specified persona is the HR Manager acting directly on the data.

## Non-functional expectations
- Directory and analytics views must stay responsive at 10,000 employees (server-side pagination/aggregation, not "load everything into the browser").
- Seed data is reproducible (fixed random seed) so grading/demoing is deterministic.
- Core business logic (salary history derivation, analytics aggregation math, validation) is unit tested independent of the UI.
