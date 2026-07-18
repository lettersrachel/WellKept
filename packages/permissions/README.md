# @wellkept/permissions
The S1/S2/S3 x role matrix (WK-APP-003 S2) as pure functions.
POLICY, NOT PLUMBING: changes require founder sign-off (WK-DEV-004 S4).
100% branch coverage is release-blocking.

src/index.ts is the package entry (strict TS). src/permissions.verified.mjs
plus its test file are the node:test mirror that was executed at 100.00%
line/branch/function coverage on 2026-07-18 (17/17 passing, including an
integration run over the real 258-field seed). Until vitest runs in CI, the
mirror is runnable dependency-free:
  node --test --experimental-test-coverage src/permissions.verified.test.mjs
The canonical entry point name per WK-DEV-004 S3 is filterFieldsForRole.
