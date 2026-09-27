# ACME Salary Manager

Web-based salary management software for ACME's HR team — replaces spreadsheets for managing ~10,000 employees' compensation across multiple countries, and answers questions about how the org pays people.

See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the one-page requirements doc (goal, scope, what's deliberately out of scope and why), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design/data-model rationale and performance notes, and [`docs/AI_PROMPTS.md`](docs/AI_PROMPTS.md) for how AI tooling was used to build this.

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma ORM + SQLite, JWT auth, zod validation.
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui-style components + TanStack Table + Recharts.
- **Tests**: Vitest (unit + integration) on both server and client.

## Prerequisites

- Node.js 18+ and npm.

## Setup & run

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env        # if .env doesn't already exist
npx prisma migrate deploy   # create the SQLite database and apply migrations
npm run seed                # generate 10,000 employees + salary history + HR admin user
npm run dev                 # starts the API on http://localhost:4000
```

Seeded HR manager login (also printed by the seed script, configurable via `HR_ADMIN_EMAIL` / `HR_ADMIN_PASSWORD` in `.env`):

- **Email**: `hr.manager@acme.test`
- **Password**: `ChangeMe123!`

### 2. Frontend (`client/`)

In a second terminal:

```bash
cd client
npm install
npm run dev                 # starts the app on http://localhost:5173
```

The client talks to `http://localhost:4000/api` by default; override with a `VITE_API_URL` env var if the backend runs elsewhere.

Open `http://localhost:5173` and log in with the seeded credentials above.

## Running tests

```bash
cd server && npm test       # unit + integration tests (Vitest)
cd client && npm test       # component/page tests (Vitest + Testing Library)
```

## Production build

```bash
cd server && npm run build && npm start
cd client && npm run build  # outputs static assets to client/dist
```

## Project layout

```
server/   Express API, Prisma schema + migrations, seed script, tests
client/   React SPA (Vite), components/pages, tests
docs/     Requirements, architecture, and AI-usage notes
```
