import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTypedInstant, formatInZone, isValidTimeZone } from "./typed-time";

/**
 * G-116 ruling ("true instant"): the acceptance conversions by name, the
 * refusing directions, and the structural guard that a zone-less time
 * write cannot come back. Not covered: a surface that collects a typed
 * time OUTSIDE actions.ts and the sink (none exists today; the census
 * below is file-scoped, and a new file would need its own line here).
 */

test("the ruling's acceptance: 9:00 America/New_York is 13:00Z in DST and 14:00Z in standard time, and displays as 9:00", () => {
  const summer = parseTypedInstant("2026-07-15T09:00", "America/New_York");
  assert.ok(summer);
  assert.equal(summer.toISOString(), "2026-07-15T13:00:00.000Z");
  const winter = parseTypedInstant("2026-01-15T09:00", "America/New_York");
  assert.ok(winter);
  assert.equal(winter.toISOString(), "2026-01-15T14:00:00.000Z");
  assert.equal(formatInZone(summer, "America/New_York"), "2026-07-15 09:00");
  assert.equal(formatInZone(winter, "America/New_York"), "2026-01-15 09:00");
});

test("UTC is the identity, and a zone east of it shifts the other way", () => {
  const utc = parseTypedInstant("2026-08-30T09:00", "UTC");
  assert.equal(utc?.toISOString(), "2026-08-30T09:00:00.000Z");
  const warsaw = parseTypedInstant("2026-08-30T09:00", "Europe/Warsaw");
  assert.equal(warsaw?.toISOString(), "2026-08-30T07:00:00.000Z");
});

test("the refusing directions: a zone-less write, a fake zone, and a malformed time all refuse as null", () => {
  assert.equal(parseTypedInstant("2026-08-30T09:00", ""), null, "empty zone refuses");
  assert.equal(parseTypedInstant("2026-08-30T09:00", "Mars/Olympus_Mons"), null, "an invented zone refuses");
  assert.equal(parseTypedInstant("yesterday-ish", "America/New_York"), null, "a malformed time refuses");
  assert.equal(isValidTimeZone("America/New_York"), true);
  assert.equal(isValidTimeZone("x".repeat(65)), false, "an oversized zone string refuses");
});

test("a DST transition converges: 2:30 AM on the US spring-forward day resolves to a real instant, not NaN", () => {
  // 2026-03-08 02:30 does not exist in America/New_York; the two-pass
  // resolution must still return a real nearby instant rather than
  // failing, since a HOM can type it.
  const d = parseTypedInstant("2026-03-08T02:30", "America/New_York");
  assert.ok(d && Number.isFinite(+d), "a nonexistent wall time still resolves");
});

test("structural guard: no typed-time field is parsed outside the one conversion path", () => {
  // The G-116 census: actions.ts and the visit-command sink must contain
  // ZERO direct Date parses of typed-time form fields. Red if a future
  // author adds `new Date(String(formData.get("startedAt")))` back.
  const actions = readFileSync(join(__dirname, "actions.ts"), "utf8");
  const sink = readFileSync(join(__dirname, "visit-command-store.ts"), "utf8");
  for (const field of ["startedAt", "endedAt"]) {
    const direct = new RegExp(`new Date\\(String\\(formData\\.get\\("${field}"`);
    assert.ok(!direct.test(actions), `actions.ts parses ${field} directly instead of through parseTypedInstant`);
  }
  assert.ok(actions.includes("parseTypedInstant"), "the conversion path is actually in use");
  // The sink's hours arrive as browser-converted ISO Z strings (close-flow
  // captureHours calls toISOString in the operator's browser); the census
  // asserts that conversion is still upstream by checking the tz ride-along.
  assert.ok(sink.includes("tz: hours?.tz ?? null"), "the sink carries the operator's zone");
});
