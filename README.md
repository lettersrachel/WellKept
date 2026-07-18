# wellkept
The Well Kept platform monorepo. Built per WK-DEV-000..005 and WK-APP-001/002/003.
Governing decision: docs/adr/001-build-timing.md (build now; paper remains the
pilot's system of record; see docs/PARALLEL_PILOT_PROTOCOL.md).

First sprint checklist (WK-DEV-003 rule):
1. pnpm install, then pnpm pin-refresh; open the pin-refresh PR; freeze versions.
2. docker-compose up (PG 16 + Redis 7) for local env.
3. drizzle-kit generate from packages/schema; first migration lands with a PR note.
4. Wire vitest coverage gate: packages/permissions at 100% or CI fails.
5. Run tooling/import/wk_import.py --template against WK_PLAY_002 to seed staging.

Already verified before this repo existed (2026-07-18):
- permissions core: 17/17 tests, 100.00% line/branch/function (node:test mirror in-package)
- importer: 258-field parse validated against the real workbook; strict mode fails
  loudly on blank sensitivity per WK-DEV-005 S3
- the three-portal prototype implements REQ-030/031/033/034/040-046 behaviors
  as the reference for sprints 3-8
