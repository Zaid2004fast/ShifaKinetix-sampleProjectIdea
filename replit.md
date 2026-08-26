# ShifaKinetix

ShifaKinetix is an interactive prototype for structured musculoskeletal care across patients, doctors, and physiotherapists.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/shifakinetix/src/App.tsx` — interactive role-based prototype and local demo state.
- `artifacts/shifakinetix/src/index.css` — ShifaKinetix visual tokens and responsive styles.
- `artifacts/api-server` — shared API service scaffold; the first prototype build uses local UI state.
- `attached_assets/` — project flow and module descriptions used as the product source of truth.

## Architecture decisions

- The first build is a frontend-first, local-state prototype so the complete defense/demo flow is immediately explorable.
- The three patient entry paths remain intentionally separate: direct booking bypasses clinical intake, while symptom reporting and patient-initiated physio use safety gating.
- Safety-critical boundaries are explicit in the UI: fixed red-flag questions, repeated Severity Gate states, doctor-only differential/SOAP review, and hard prescription approval.
- Role switching is included for demonstration, allowing the same prototype to show patient, doctor, and physiotherapist workflows without separate accounts.

## Product

The prototype demonstrates structured 3D body-region intake, fixed red-flag screening, SAFE and ACUTE RED FLAG routing, non-diagnostic AI guidance, consultation threads, doctor review tooling, prescription and report approval gates, dual-direction physiotherapy, provider verification, payment checkout, and 24-hour follow-up escalation.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Vite build config intentionally requires `PORT` and `BASE_PATH`; standalone builds need those values supplied, while managed workflows inject them automatically.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
