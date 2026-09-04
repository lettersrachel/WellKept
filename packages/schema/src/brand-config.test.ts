import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "vitest";
import { BRAND } from "@wellkept/config";

/**
 * Q-2 (the re-cut queue): brand is one configuration value, and no
 * member-facing string carries the literal.
 *
 * The adopted law (CLAUDE.md, merge 7/12 of the 3 September intake):
 * the company name, sending domain, app display name and credential
 * wording resolve from ONE place, and nothing member-facing hardcodes
 * the company name. This guard computes both of its inputs (the inputs
 * doctrine):
 *
 *  - SET A, the member-facing pages: every .tsx under the web app's
 *    (client) route group and under the signin, verify-request and
 *    privacy segments, plus the root layout (every member request
 *    renders it).
 *  - SET B, the mail channel: every source file across apps/,
 *    packages/ and services/ that sends mail (sendMail,
 *    sendResendEmail, or a raw call to the provider API), because an
 *    email is a member-facing string the moment the recipient is a
 *    member, and the fallback from-address lives in these files.
 *
 * After comment-stripping, the DISPLAY literal (the company name with
 * its space, case-insensitive, so "@wellkept/..." module specifiers do
 * not match) must appear in NO scanned file. The config module is the
 * one deliberate carrier and is asserted to still say exactly what the
 * surfaces said before extraction: the founder's instruction was to
 * move the value, not change it, and the pin makes a change a reviewed
 * two-file edit (the 25 September name decision's own path).
 *
 * Not covered, honestly: staff-only pages (visit, mfa, the corporate
 * group), which the law permits to carry the name; the "Tell Well
 * Kept" feature name on staff surfaces; documents under docs/, which
 * are prose, not code strings; and whether a surface RENDERS the brand
 * where it should, which no absence check can see.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");

// The display literal: the space is load-bearing (see header).
const LITERAL = /well kept/i;

const MEMBER_SEGMENTS = new Set(["(client)", "signin", "verify-request", "privacy"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "dist", ".git"]);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/[^\n]*$/gm, (m) => m.replace(/[^\n]/g, " "));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** SET A: member-facing .tsx pages, computed from the route tree. */
function memberPages(): string[] {
  const appDir = path.join(root, "apps/web/src/app");
  const files = walk(appDir).filter((f) => f.endsWith(".tsx"));
  const layout = path.join(appDir, "layout.tsx");
  return files.filter((f) => {
    if (f === layout) return true;
    const segments = path.relative(appDir, f).split(path.sep);
    return segments.some((s) => MEMBER_SEGMENTS.has(s));
  });
}

/** SET B: the mail channel, computed by the send signature. */
function mailChannelFiles(): string[] {
  const roots = ["apps", "packages", "services"].map((d) => path.join(root, d));
  const out: string[] = [];
  for (const r of roots) {
    for (const f of walk(r)) {
      if (!/\.(ts|tsx)$/.test(f) || f.endsWith(".test.ts")) continue;
      if (f.includes(path.join("packages", "config"))) continue; // the one place
      const src = readFileSync(f, "utf8");
      if (/\bsendMail\(|\bsendResendEmail\(|api\.resend\.com/.test(src)) out.push(f);
    }
  }
  return out;
}

test("Q-2: no member-facing string carries the brand literal; the config is the one place", () => {
  const pages = memberPages();
  const mail = mailChannelFiles();
  // Floors: a broken walk finds a tiny set and would pass vacuously.
  // Floor derived by running the census (2026-09-04): layout, signin,
  // verify-request, privacy, and the one (client) page. The first
  // version guessed 6 and the guard's own first run corrected it.
  assert.ok(pages.length >= 5,
    `only ${pages.length} member-facing page file(s) found - the route walk broke, not the surface set`);
  assert.ok(mail.length >= 5,
    `only ${mail.length} mail-channel file(s) found - the send-signature scan broke, not the channel`);

  const offenders: string[] = [];
  for (const f of [...pages, ...mail]) {
    const stripped = stripComments(readFileSync(f, "utf8"));
    if (LITERAL.test(stripped)) offenders.push(path.relative(root, f));
  }
  assert.deepEqual(offenders, [],
    `member-facing or mail-channel file(s) hardcode the company name: ${offenders.join(", ")}. `
    + `The name renders through BRAND (@wellkept/config), the one place the 25 September name `
    + `decision will change; a literal here is a string that decision cannot reach.`);
});

test("Q-2: the config still says exactly what the surfaces said before extraction", () => {
  // The founder's instruction was to MOVE the value, never to change
  // it. Changing the name is a reviewed edit to the config and to this
  // pin together (the frozen-manifest shape), which is the point.
  assert.equal(BRAND.companyName, "Well Kept");
  assert.equal(BRAND.appDisplayName, "Well Kept");
  assert.equal(BRAND.emailFromFallback, "Well Kept <onboarding@resend.dev>");
  assert.equal(BRAND.legalEntityName, "Well Kept Home Operations Management LLC");
});
