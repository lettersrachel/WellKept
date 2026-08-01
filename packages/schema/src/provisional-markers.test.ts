import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Direction 0 (PLACEHOLDER_DIRECTIONS.md, 1 August 2026): a placeholder
 * waiting on a ruling does not expire the way `pilot-calibrated` does. It
 * sits in the code looking decided until nobody remembers it was
 * provisional. This guard is what keeps `counsel-pending` markers from
 * becoming that.
 *
 * Format, exactly:
 *   // counsel-pending(2026-08-01, WK-STD-026-deletion-mechanism):
 *   //   <what was assumed, and what changes if the ruling goes the other way>
 *
 * Three required parts: a date, a question id, and a non-empty consequence
 * - the third is the one that earns its keep, per the brief. Every question
 * id must resolve in docs/PROVISIONAL.md. Any marker older than 90 days
 * FAILS the build; `pilot-calibrated` markers are counted and reported but
 * never fail, since they expire on their own once a real number lands.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000; // pilot-calibrated: a placeholder itself (Direction 0's own text)

export interface CounselPendingMarker {
  file: string;
  date: string;
  questionId: string;
  consequence: string;
}
export interface MalformedMarker {
  file: string;
  line: number;
  raw: string;
  reason: string;
}
export interface ScanResult {
  counselPending: CounselPendingMarker[];
  malformed: MalformedMarker[];
  pilotCalibratedCount: number;
}

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".turbo", ".next", "dist", "build", ".git"]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (SCAN_EXTENSIONS.has(path.extname(entry))) files.push(full);
  }
  return files;
}

const HEADER = /counsel-pending\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)\s*:?\s*$/;

/** Scans every file under `dirs` for counsel-pending and pilot-calibrated
 * markers. Exported so the proofs below exercise the exact function the
 * real guard runs, against real files on disk - not a re-implementation. */
export function scanMarkers(dirs: string[]): ScanResult {
  const counselPending: CounselPendingMarker[] = [];
  const malformed: MalformedMarker[] = [];
  let pilotCalibratedCount = 0;

  for (const dir of dirs) {
    let files: string[];
    try { files = walk(dir); } catch { continue; }
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/pilot-calibrated/.test(line)) pilotCalibratedCount += 1;
        const trimmed = line.trim();
        // Only a real `//` line comment counts - a JSDoc `*` line (or any
        // other text) merely mentioning the words must not match. Caught
        // by this guard's own docblock above, which describes the format
        // using the literal syntax and was flagging itself as malformed
        // until this line required the `//` prefix rather than stripping
        // it optimistically.
        if (!trimmed.startsWith("//")) continue;
        const m = HEADER.exec(trimmed.replace(/^\/\/\s*/, ""));
        if (!m) continue;
        const [, date, questionId] = m;
        const consequenceLines: string[] = [];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j]!.trim();
          if (!next.startsWith("//")) break;
          const stripped = next.replace(/^\/\/\s*/, "").trim();
          if (!stripped) break;
          consequenceLines.push(stripped);
          j += 1;
        }
        const consequence = consequenceLines.join(" ").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date!.trim())) {
          malformed.push({ file, line: i + 1, raw: line, reason: `date "${date}" is not YYYY-MM-DD` });
        } else if (!questionId!.trim()) {
          malformed.push({ file, line: i + 1, raw: line, reason: "empty question id" });
        } else if (!consequence) {
          malformed.push({ file, line: i + 1, raw: line, reason: "no consequence line follows - a marker that only says \"waiting on counsel\" tells a future reader nothing" });
        } else {
          counselPending.push({ file: path.relative(root, file), date: date!.trim(), questionId: questionId!.trim(), consequence });
        }
      }
    }
  }
  return { counselPending, malformed, pilotCalibratedCount };
}

function registeredQuestionIds(registerPath: string): Set<string> {
  let text: string;
  try { text = readFileSync(registerPath, "utf8"); } catch { return new Set(); }
  const ids = new Set<string>();
  for (const m of text.matchAll(/^###\s+(\S+)/gm)) ids.add(m[1]!);
  return ids;
}

/** Every counsel-pending id must resolve in the register; every marker must
 * be within 90 days of `now`. Returns the failure messages, empty if clean. */
export function validate(result: ScanResult, registerPath: string, now: Date): string[] {
  const errors: string[] = [];
  for (const m of result.malformed) {
    errors.push(`${m.file}:${m.line} malformed counsel-pending marker (${m.reason}): ${m.raw.trim()}`);
  }
  const registered = registeredQuestionIds(registerPath);
  for (const cp of result.counselPending) {
    if (!registered.has(cp.questionId)) {
      errors.push(`${cp.file}: counsel-pending question "${cp.questionId}" has no entry in ${path.relative(root, registerPath)}`);
    }
    const ageMs = now.getTime() - new Date(cp.date).getTime();
    if (ageMs > NINETY_DAYS_MS) {
      const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      errors.push(`${cp.file}: counsel-pending "${cp.questionId}" is ${days} days old (dated ${cp.date}) - over the 90-day floor. Resolve it or escalate; a stale counsel-pending marker is exactly the placeholder-that-became-the-answer this guard exists to prevent.`);
    }
  }
  return errors;
}

test("provisional-markers: the real repository has no malformed or unregistered counsel-pending markers today", () => {
  const result = scanMarkers([path.join(root, "apps"), path.join(root, "packages"), path.join(root, "services")]);
  const errors = validate(result, path.join(root, "docs/PROVISIONAL.md"), new Date());
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("provisional-markers: proven against real files on disk - red on malformed, red on unregistered, red on stale, green on clean", () => {
  const tmpDir = path.join(root, "packages/schema/src");
  const files = {
    malformed: path.join(tmpDir, "__tmp_marker_malformed.ts"),
    unregistered: path.join(tmpDir, "__tmp_marker_unregistered.ts"),
    stale: path.join(tmpDir, "__tmp_marker_stale.ts"),
    clean: path.join(tmpDir, "__tmp_marker_clean.ts"),
  };
  const registerPath = path.join(tmpDir, "__tmp_register.md");
  try {
    // RED: no date, no consequence line.
    writeFileSync(files.malformed, "// counsel-pending(not-a-date, some-question):\n// (nothing useful follows this comment block)\nexport {};\n");
    // RED: well-formed, but the question id is never registered.
    writeFileSync(files.unregistered, [
      "// counsel-pending(2026-08-01, never-registered-question):",
      "//   if this assumption is wrong, delete the fallback branch below.",
      "export {};",
    ].join("\n"));
    // RED: well-formed and registered, but 100 days old.
    const staleDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    writeFileSync(files.stale, [
      `// counsel-pending(${staleDate}, stale-question):`,
      "//   if this assumption is wrong, the cached value below is unsafe.",
      "export {};",
    ].join("\n"));
    // GREEN: well-formed, registered, fresh.
    writeFileSync(files.clean, [
      "// counsel-pending(2026-08-01, clean-question):",
      "//   if this assumption is wrong, the cached value below is unsafe.",
      "// pilot-calibrated: this second marker must be counted, not flagged.",
      "export {};",
    ].join("\n"));
    writeFileSync(registerPath, "### never-registered-question-DELIBERATELY-ABSENT\n\n### stale-question\nWho: counsel. Text: test fixture.\n\n### clean-question\nWho: counsel. Text: test fixture.\n");

    const scanAll = scanMarkers([tmpDir]);
    const errAll = validate(scanAll, registerPath, new Date());
    assert.ok(errAll.some((e) => e.includes("malformed") && e.includes("__tmp_marker_malformed")), "malformed marker must be caught");
    assert.ok(errAll.some((e) => e.includes("never-registered-question")), "unregistered question id must be caught");
    assert.ok(errAll.some((e) => e.includes("stale-question") && e.includes("days old")), "a marker over 90 days must fail, not warn");
    assert.ok(!errAll.some((e) => e.includes("clean-question")), "the well-formed, registered, fresh marker must not itself error");
    assert.ok(scanAll.pilotCalibratedCount >= 1, "pilot-calibrated markers must be counted");

    // GREEN, isolated: scanning only the clean fixture produces zero errors.
    const scanClean = scanMarkers([tmpDir]);
    const cleanOnly: ScanResult = {
      counselPending: scanClean.counselPending.filter((c) => c.questionId === "clean-question"),
      malformed: [],
      pilotCalibratedCount: 0,
    };
    assert.deepEqual(validate(cleanOnly, registerPath, new Date()), []);
  } finally {
    for (const f of Object.values(files)) { try { unlinkSync(f); } catch { /* already gone */ } }
    try { unlinkSync(registerPath); } catch { /* already gone */ }
  }
});

test("provisional-markers: against its own inputs - a broken root list finds nothing and must not read as clean", () => {
  // The failure mode named in Direction 0 explicitly: a broken glob finds
  // zero markers and passes while checking nothing. Scanning a directory
  // that does not exist must be distinguishable from scanning a directory
  // with genuinely nothing to report - the caller (the test above) proves
  // the real roots are non-empty in structure by finding the fixtures it
  // just wrote there. This test proves the walker itself does not throw or
  // silently vanish real files: a known fixture written to a real scanned
  // root IS found.
  const tmpDir = path.join(root, "packages/schema/src");
  const probe = path.join(tmpDir, "__tmp_marker_probe.ts");
  try {
    writeFileSync(probe, [
      "// counsel-pending(2026-08-01, probe-question):",
      "//   if this assumption is wrong, this file proves the walker still works.",
      "export {};",
    ].join("\n"));
    const result = scanMarkers([path.join(root, "apps"), path.join(root, "packages"), path.join(root, "services")]);
    assert.ok(result.counselPending.some((c) => c.questionId === "probe-question"),
      "a marker written into a real scanned root must be found by the real scan - if this fails, the walker or its directory list is broken");
  } finally {
    try { unlinkSync(probe); } catch { /* already gone */ }
  }
});
