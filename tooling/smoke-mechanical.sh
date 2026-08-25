#!/usr/bin/env bash
# The mechanical smoke checks (DEPLOY §4 items 1, 4, 12) - the ones a script
# can prove without a browser. Fails non-zero on the first failed check;
# never echoes DATABASE_URL or any secret.
#
#   BASE=https://wellkept-orcin.vercel.app [DATABASE_URL=...] bash tooling/smoke-mechanical.sh
#
# Check 12 needs DATABASE_URL; without it the check is SKIPPED with a warning
# (a missing app_setting key is a missing knob - run it with the URL before
# calling the checklist done). With the URL it inserts the intended values
# where absent, per the checklist's own instruction.
set -u
BASE="${BASE:?Set BASE to the deployed origin, e.g. https://wellkept-orcin.vercel.app}"
fail=0

say()  { printf '  %-4s %s\n' "$1" "$2"; }
need() { if [ "$1" = "0" ]; then say PASS "$2"; else say FAIL "$2"; fail=1; fi; }

echo "smoke-mechanical against $BASE"

# 1. Health: {"ok":true,"db":"up"}
body="$(curl -sS --max-time 15 "$BASE/api/health" || true)"
echo "$body" | grep -q '"ok":true' && echo "$body" | grep -q '"db":"up"'
need $? "check 1: /api/health reports ok + db up"

# 4. Both dev-gated surfaces 404 in production.
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$BASE/dev/last-email" || true)"
[ "$code" = "404" ]; need $? "check 4a: /dev/last-email -> 404 (got $code)"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -X POST -H 'content-type: application/json' -d '{}' "$BASE/api/dev/trigger-pass" || true)"
[ "$code" = "404" ]; need $? "check 4b: POST /api/dev/trigger-pass -> 404 (got $code)"

# 12. app_setting knobs exist with intended values (insert if absent).
# The node block prints per-key DETAIL lines only; the single PASS/FAIL
# verdict for check 12 comes from `need` below - one verdict per check.
if [ -n "${DATABASE_URL:-}" ]; then
  ( cd "$(dirname "$0")/../apps/web" && node --input-type=module - <<'EOF'
import pg from "pg";
const WANT = {
  photo_retention: { days: 90 },
  rule_health: { actRateFloor: 0.25, minHouseholds: 3, minUsers: 2 },
};
// FOUNDER_SET knobs: the VALUE is the founder's, so the script asserts
// presence and shape but never repairs - inserting a value here would be
// the script choosing a threshold. Turning one off is setting its field
// to null ({"gapDays": null}), never deleting the row, so once set (the
// visit_reconciliation knob: founder, 2026-07-28) an absent row means a
// LOST knob, which is exactly the failure this check exists to catch.
const FOUNDER_SET = {
  visit_reconciliation: ["gapDays"],
};
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
let bad = 0;
for (const [key, want] of Object.entries(WANT)) {
  const { rows: [row] } = await c.query("SELECT value FROM app_setting WHERE key=$1", [key]);
  if (!row) {
    await c.query("INSERT INTO app_setting (key, value, updated_at) VALUES ($1, $2, now())", [key, JSON.stringify(want)]);
    // REPAIRED, not silently PASS: the operator should know the knob was
    // missing and the script created it - that is a finding worth reading.
    console.log(`         ${key}: REPAIRED - was absent, inserted intended value`);
  } else {
    const missing = Object.keys(want).filter((k) => !(k in row.value));
    if (missing.length) { console.log(`         ${key}: exists but lacks ${missing.join(", ")}`); bad = 1; }
    else console.log(`         ${key}: present (${JSON.stringify(row.value)})`);
  }
}
for (const [key, fields] of Object.entries(FOUNDER_SET)) {
  const { rows: [row] } = await c.query("SELECT value FROM app_setting WHERE key=$1", [key]);
  if (!row) {
    console.log(`         ${key}: ABSENT - founder-set knob lost; restore it by hand (the script never chooses its value)`);
    bad = 1;
  } else {
    const missing = fields.filter((k) => !(k in row.value));
    if (missing.length) { console.log(`         ${key}: exists but lacks ${missing.join(", ")}`); bad = 1; }
    else console.log(`         ${key}: present (${JSON.stringify(row.value)})`);
  }
}
await c.end();
process.exit(bad);
EOF
  )
  need $? "check 12: app_setting knobs (detail above; REPAIRED counts as pass but read it)"

  # 15 (added 2026-08-25, from the sitting that found Household Green and
  # then Field Test Home invisible): REQ-001 has no fleet-wide wildcard,
  # so a household with NO corporate assignment cannot be seen or reached
  # by any corporate operator, including the founder - it exists, counts
  # toward reconciliation surfaces, and nothing reports it. Every
  # household must hold at least one corporate role, or be excused below
  # with a written reason. The fix for a found orphan is an AUDITED grant
  # (the app's assignRole, or the db:hg --by pattern), never silent SQL.
  ( cd "$(dirname "$0")/../apps/web" && node --input-type=module - <<'EOF'
import pg from "pg";
// Excused orphans, each with the written reason the escape-hatch rule
// requires. Remove a line when its household is disposed of.
const ALLOWLIST = {
  "d05ab5a2-7d9c-4cff-919a-250adafa0355":
    "Field Test Home: pre-existing orphan from early field testing (carries the G-52 " +
    "stuck command); found 25 Aug 2026, disposition pending the founder's decision - " +
    "grant-and-inspect, erase, or fixture-flag",
};
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const { rows } = await c.query(`
  SELECT h.id, h.name FROM household h
  WHERE NOT EXISTS (
    SELECT 1 FROM household_role_assignment a
    WHERE a.household_id = h.id
      AND a.role IN ('corporate_admin','corporate_ops','cfo_readonly'))`);
let bad = 0;
for (const r of rows) {
  if (r.id in ALLOWLIST) {
    console.log(`         ${r.name}: orphan EXCUSED (${ALLOWLIST[r.id].split(";")[0]})`);
  } else {
    console.log(`         ${r.name} (${r.id}): NO corporate holder - invisible to every corporate operator`);
    bad = 1;
  }
}
if (rows.length === 0) console.log("         every household holds at least one corporate role");
await c.end();
process.exit(bad);
EOF
  )
  need $? "check 15: no household is invisible (every household holds a corporate role, or is excused in writing)"
else
  say SKIP "check 12: DATABASE_URL not set - knobs NOT verified; re-run with it before calling the checklist done"
  say SKIP "check 15: DATABASE_URL not set - invisible-household census NOT run"
fi

echo
if [ "$fail" = "0" ]; then echo "mechanical checks: ALL PASS (manual checks 2-3, 5-11, 13-14 remain)"; else echo "mechanical checks: FAILURE - stop here; the failed check is the session's finding"; fi
exit "$fail"
