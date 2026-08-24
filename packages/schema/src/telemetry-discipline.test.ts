import { test } from "vitest";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "path";
import { redactErrorText, scrubSentryEvent } from "./telemetry";

/**
 * CAND-PRIV-01: telemetry never carries S2/S3 or raw household content.
 * Three layers, each proven in both directions:
 * 1. The scrubber itself: pg row-value shapes cut, clean messages kept.
 * 2. The wiring: BOTH Sentry inits carry beforeSend: scrubSentryEvent and
 *    sendDefaultPii: false, so a removed scrubber fails CI, not silently.
 * 3. Console discipline: no console call in shipped source interpolates a
 *    sensitive-value identifier or dumps a payload object. Free text a
 *    developer writes into a message is NOT covered; that stays on
 *    review, and this header says so.
 * The escape hatch is the allowlist, one written reason per entry.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");

test("the scrubber cuts the row-value leak shapes and keeps clean messages intact", () => {
  const leak = 'insert failed: DETAIL: Failing row contains (11, medication, "twice daily with food").';
  const out = redactErrorText(leak);
  assert.ok(!out.includes("twice daily"), "row values survived the scrub");
  assert.ok(out.includes("[redacted"), "the cut is visible, not silent");

  const params = "query failed params: ['jordan@wellkept.demo', 'gate code 4411']";
  assert.ok(!redactErrorText(params).includes("4411"));

  const clean = "connect ECONNREFUSED 127.0.0.1:5432";
  assert.equal(redactErrorText(clean), clean, "a clean message passes untouched");

  const long = `x${"y".repeat(2000)}`;
  assert.ok(redactErrorText(long).length < 600, "unrecognized shapes are bounded by the cap");

  const event = scrubSentryEvent({
    message: "top DETAIL: secret",
    exception: { values: [{ value: "Failing row contains (secret)" }] },
    request: { data: "body" },
    breadcrumbs: [{ message: "console said things" }],
    extra: { anything: "at all" },
  });
  assert.ok(!JSON.stringify(event).includes("secret"));
  assert.equal(event.request, undefined);
  assert.equal(event.breadcrumbs, undefined);
  assert.equal(event.extra, undefined);
});

test("both Sentry inits carry the scrubber and sendDefaultPii false", () => {
  for (const rel of ["apps/web/src/instrumentation.ts", "services/worker/src/index.ts"]) {
    const src = readFileSync(path.join(root, rel), "utf8");
    assert.ok(/beforeSend:\s*scrubSentryEvent/.test(src),
      `${rel}: Sentry.init lost its beforeSend scrubber - error text can carry row values again`);
    assert.ok(/sendDefaultPii:\s*false/.test(src),
      `${rel}: sendDefaultPii is no longer false`);
  }
});

/** Identifiers whose interpolation into a console call ships household
 * content to stdout (and, before the breadcrumb drop, to Sentry). */
const SENSITIVE_INTERPOLATIONS = [
  ".newValue", ".concern", ".research", "job.data", ".payload)", "payload)",
  "row.payload", ".note}", ".noteText",
];

/** (file, needle) pairs excused in writing. None yet. */
const ALLOWLIST: { file: string; needle: string; reason: string }[] = [];

function shippedSources(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (["node_modules", ".next", "drizzle", "dist"].includes(name)) continue;
        walk(p);
        continue;
      }
      if (/\.(ts|tsx|mjs)$/.test(name) && !/\.test\./.test(name)) files.push(p);
    }
  };
  for (const base of ["apps/web/src", "services/worker/src", "packages"]) walk(path.join(root, base));
  return files;
}

test("no shipped console call interpolates a sensitive-value identifier (PRIV-01)", () => {
  const files = shippedSources();
  assert.ok(files.length >= 40,
    `source walk found only ${files.length} files - the walk is broken, do not trust a tiny set`);
  const violations: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const consoleCalls = src.match(/console\.(log|error|warn|info)\([^;]*\)/gs) ?? [];
    for (const call of consoleCalls) {
      for (const needle of SENSITIVE_INTERPOLATIONS) {
        if (!call.includes(needle)) continue;
        const rel = path.relative(root, file);
        if (ALLOWLIST.some((a) => a.file === rel && a.needle === needle)) continue;
        violations.push(`${rel}: console call carries "${needle}"`);
      }
    }
  }
  assert.deepEqual(violations, [],
    `PRIV-01: console output must never carry household content:\n  ${violations.join("\n  ")}\n` +
    `Log ids and kinds, never values. A legitimate exception is an ALLOWLIST entry with a written reason.`);
});
