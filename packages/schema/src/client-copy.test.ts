import { test } from "vitest";
import assert from "node:assert";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * The no-em-dash rule (CLAUDE.md conventions), enforced the same way the
 * erasure rule is: a guard, not a memory. Code comments are stripped
 * before checking, since an em dash in a comment is not user-facing.
 *
 * SCOPE IS NOT STATED HERE, DELIBERATELY. Three earlier attempts to
 * describe this guard's reach in prose were each wrong by the time they
 * were read: W-10 closed claiming six copy sources when the list held
 * more, the header claimed "client-facing pages" after staff roots and
 * fourteen source files had been added, and a 26 August audit found a
 * further five surfaces no scope covered at all, one of them the client
 * report email's subject line. A stated number is a claim that rots; a
 * derived one cannot. So the census below COMPUTES the copy-emitting
 * surfaces from three rules and demands each one be scanned or excused
 * in writing. Read the census, not a sentence, for what is covered.
 *
 * The hand-held half is labeled as such: COPY_SOURCES and DOC_DIRS name
 * files no rule can derive, because whether a .ts file contains a
 * sentence a person reads is not a syntactic property. That list stays
 * short, stays reviewed, and is honest about being memory.
 *
 * Verified to fire: reintroducing an em dash into rendered playbook copy
 * turns this red naming the file and line.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const webApp = path.join(here, "../../../apps/web/src/app");

const CLIENT_FACING_ROOTS = [
  "(client)",
  "privacy",
  "support",
  "signin",
  "verify-request",
];

// Item 4 (founder 2026-07-28): every guard scope carries a sanctioned
// escape hatch - an allowlist entry with a written reason - so the first
// legitimate exception is a reviewed line here, never a commented-out
// guard. Keys are paths relative to the scanned root.
const PAGE_ALLOWLIST: Record<string, string> = {};
const SOURCE_ALLOWLIST: Record<string, string> = {};

function allowlisted(list: Record<string, string>, key: string): boolean {
  if (!(key in list)) return false;
  if (list[key]!.trim().length <= 10) throw new Error(`allowlist entry for ${key} needs a real written reason`);
  return true;
}

// W-10: the rule is unqualified — staff prompt text and email/notification
// copy are user-facing too, and templated copy is the surface most at risk
// of drifting into machine voice. These files' STRING LITERALS are checked
// (comments stripped); add a file here when a new templated-copy source
// appears.
const COPY_SOURCES = [
  "../../../packages/trigger-engine/src/registry-sweep.ts",
  "../../../packages/trigger-engine/src/engine.ts",
  // K (round six): the cascade item texts moved here from seed-rules.ts,
  // which now only imports them; the guard follows the strings, and
  // season.ts's recall-summary template is rendered copy too.
  "../../../packages/trigger-engine/src/cascades.ts",
  "../../../packages/trigger-engine/src/season.ts",
  "../../../services/worker/src/seed-rules.ts",
  // 26 Aug 2026, the copy census: digest.ts and packages/mail/src/index.ts
  // came OFF this list on the same day, because the channel rule now
  // derives them. The hand-held list shrinking is the point; anything a
  // rule can compute does not belong on a memory list, and the census
  // fails if one is put back.
  // 26 Aug 2026 (G-70's rider): the SIGN-IN email was never scanned, and
  // it is the one message every user receives, client and staff alike.
  // W-10's own reasoning names email copy as in scope and its closure
  // claims six sources; this was a seventh, uncovered since the guard
  // was written. The rule wider than its guard, again, in the highest
  // traffic place it could have been.
  "../../../apps/web/src/lib/auth/config.ts",
  "../../../apps/web/src/lib/push.ts",
  // 25 Aug 2026, from the section 4 sitting: the operator CLI scripts
  // print user-facing copy too (the erasure tool's REFUSED message is
  // the most consequential sentence the tooling prints), and no scanned
  // root covered them; the 6 August em dashes sat there unguarded. The
  // rule-wider-than-its-guard case, closed by scanning the scripts.
  "../../../apps/web/scripts/erase-household.mjs",
  "../../../apps/web/scripts/archive-demo-data.mjs",
  "../../../apps/web/scripts/ensure-smoke-fixture.mjs",
  // Third location, same day: the tooling shell scripts print operator
  // copy too, and one of the sitting's own additions copied the file's
  // em-dash house style before the sweep reached it. Bash comments are
  // not stripped by the comment-stripper, which is fine: the rule is
  // unqualified, so the whole file holds the floor.
  "../../../tooling/deploy.sh",
  "../../../tooling/smoke-mechanical.sh",
];

// W-13: the rule covers documents. The legal drafts travel to counsel and
// clients; they carry the same voice rule as the app.
const DOC_DIRS = ["../../../docs/legal"];

// J1 (round five): packName reached HOMs and no guard saw it.
// Staff surfaces are rendered strings too - pack names, labels, buttons,
// empty states, error text leak internal vocabulary and machine voice
// the same way prose does. Same em-dash floor, comments stripped.
const STAFF_ROOTS = ["(hm)", "(corporate)"];
const STAFF_EXTRA_FILES = [
  "../../../apps/web/src/app/RegistryCard.tsx",
  "../../../apps/web/src/app/ProvisionList.tsx",
  "../../../apps/web/src/components/RefusalBanner.tsx",
  "../../../apps/web/src/components/SkewWatch.tsx",
];

// Item 7 (founder 2026-07-28): the two dated verification records are
// historical artifacts; they were punctuation-swept with an inline
// annotation, and any FUTURE em dash in them is exempt only with the
// reason below - restore-from-history plus this allowlist is the
// sanctioned path if a verbatim historical quote ever needs one.
const DOC_ALLOWLIST: Record<string, string> = {
  "COUNSEL_PACKET_VERIFICATION.md": "dated verification record; edits are annotated, claims frozen",
  "COUNSEL_VERIFICATION_SESSION.md": "dated verification record; edits are annotated, claims frozen",
};

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

// An em dash can reach a reader without ever appearing as U+2014 in the
// source. This file's own client email already writes &rsquo; and
// &middot;, so entity encoding is in ACTIVE USE here, and &mdash; would
// have rendered a dash to a client while a literal-character scan stayed
// green. Found by the founder's session reading the same block, 27 Aug.
const EM_DASH_FORMS = [
  "\u2014",      // the character itself
  "&mdash;",     // named entity
  "&#8212;",     // decimal numeric
  "&#x2014;",    // hex numeric, lower
  "&#X2014;",    // hex numeric, upper
];
function hasEmDash(line: string): boolean {
  return EM_DASH_FORMS.some((f) => line.includes(f));
}

function stripComments(src: string): string {
  // Blank out block and line comments, preserving line numbers so the
  // failure message points at the real line.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/[^\n]*$/gm, (m) => m.replace(/[^\n]/g, " "));
}

test("client-facing pages contain no em dashes outside comments", () => {
  const offenders: string[] = [];
  for (const root of CLIENT_FACING_ROOTS) {
    const dir = path.join(webApp, root);
    let files: string[] = [];
    try {
      files = tsxFiles(dir);
    } catch {
      continue; // a root may not exist in a future layout; absence is not a failure
    }
    for (const file of files) {
      if (allowlisted(PAGE_ALLOWLIST, path.relative(webApp, file))) continue;
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (hasEmDash(line)) offenders.push(`${path.relative(webApp, file)}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `em dash in client-facing copy (CLAUDE.md: plain prose, no em dashes): ${offenders.join(", ")}`,
  );
});

test("templated staff/email copy sources contain no em dashes outside comments", () => {
  const offenders: string[] = [];
  for (const rel of COPY_SOURCES) {
    if (allowlisted(SOURCE_ALLOWLIST, path.basename(rel))) continue;
    const file = path.join(here, rel);
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (hasEmDash(line)) offenders.push(`${path.basename(file)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    `em dash in templated copy (W-10; the rule is unqualified): ${offenders.join(", ")}`);
});

test("legal documents contain no em dashes", () => {
  const offenders: string[] = [];
  for (const rel of DOC_DIRS) {
    for (const name of readdirSync(path.join(here, rel))) {
      if (!name.endsWith(".md")) continue;
      if (name in DOC_ALLOWLIST) { if (DOC_ALLOWLIST[name]!.trim().length <= 10) throw new Error(`allowlist entry for ${name} needs a real reason`); continue; }
      const file = path.join(here, rel, name);
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (hasEmDash(line)) offenders.push(`${name}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(offenders, [],
    `em dash in a legal document (W-13; every document carries the rule): ${offenders.join(", ")}`);
});

test("staff-facing surfaces contain no em dashes outside comments (J1)", () => {
  const offenders: string[] = [];
  for (const root of STAFF_ROOTS) {
    for (const file of tsxFiles(path.join(webApp, root))) {
      stripComments(readFileSync(file, "utf8")).split("\n").forEach((line, i) => {
        if (hasEmDash(line)) offenders.push(`${path.relative(webApp, file)}:${i + 1}`);
      });
    }
  }
  for (const rel of STAFF_EXTRA_FILES) {
    const file = path.join(here, rel);
    stripComments(readFileSync(file, "utf8")).split("\n").forEach((line, i) => {
      if (hasEmDash(line)) offenders.push(`${path.basename(file)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    `em dash on a staff surface (J1; a HOM is a user): ${offenders.join(", ")}`);
});


// ---------------------------------------------------------------------------
// The copy census (26 August 2026). The drift this closes is SILENT BY
// CONSTRUCTION: an unguarded copy source produces no failure, only no
// coverage, so nothing surfaces it until someone goes looking. Someone
// went looking and found five uncovered surfaces, one of them the client
// report email's subject line, which had shipped in violation since it
// was written.
//
// Three rules DERIVE the surfaces that emit copy, so the scope is
// computed rather than stated. Each rule computes its own input and
// carries a floor, per CLAUDE.md's inputs doctrine: a detection that
// silently breaks and returns a tiny set must FAIL, not pass vacuously.
// Every derived file is scanned for em dashes unless it is excused here
// in writing, so CENSUS_EXCUSALS is the complete inventory of
// copy-emitting surfaces this guard does not check.
//
// What is deliberately NOT derived: everything else. A .ts file emits
// copy only because a human wrote a sentence in it, and no syntax
// separates that from an identifier or a log line. A rule broad enough to
// catch those would need allowlists for SQL and console output, which is
// a worse instrument than an honest list. That residue is COPY_SOURCES
// and DOC_DIRS above: hand-held, short, and labeled as memory. The census
// keeps it from re-bloating by refusing any residue entry a rule already
// derives.
// ---------------------------------------------------------------------------

const REPO = path.join(here, "../../..");
const repoRel = (p: string) => path.relative(REPO, p).split(path.sep).join("/");

/**
 * Directories the census must never descend into, because they hold
 * GENERATED output rather than authored source.
 *
 * `.next` is the one that bit. The census read
 * `apps/web/.next/types/app/(client)/playbook/page.ts` and the suite failed
 * with ENOENT, intermittently and only under turbo: Next rewrites that tree
 * while a sibling task runs, so the file was enumerated and then deleted
 * before it was opened. Two runs in three failed that way.
 *
 * The race is the symptom. The defect is that a guard whose job is to
 * derive the copy-emitting SURFACES was walking build output at all, where
 * a generated file could satisfy a rule and count toward a floor. A census
 * with the wrong input set is the failure this file exists to prevent, one
 * level up.
 *
 * Deliberately NOT fixed by swallowing the read error: that would let the
 * census shrink silently, which is the same defect wearing a different hat.
 */
const GENERATED_DIRS = new Set([".next", ".turbo"]);

function walkFiles(dir: string, keep: (name: string) => boolean): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (GENERATED_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p, keep));
    else if (keep(name)) out.push(p);
  }
  return out;
}

// Vendored output is not ours, and `__tmp_` files are test scaffolding
// that exists for milliseconds. The scaffolding exclusion is not a
// convenience: `provisional-markers.test.ts` writes `__tmp_marker_*.ts`
// INSIDE packages/schema/src and unlinks them in a finally, vitest runs
// test files in parallel by default, and the channel rule below walks
// `packages` and readFileSync's what it enumerates. A file listed by
// readdir and unlinked before the read throws ENOENT and fails this
// guard for a reason that has nothing to do with copy. The race was
// introduced by the channel rule itself on 26 August, since nothing had
// walked that directory before (G-76). Excluded by NAME PATTERN rather
// than by catching the read error, because swallowing ENOENT would also
// hide a real file disappearing.
const notVendored = (f: string) =>
  !f.includes("node_modules")
  && !f.includes(`${path.sep}dist${path.sep}`)
  && !path.basename(f).startsWith("__tmp_");

/** Rule 1, RENDER: every .tsx under the web app renders to somebody's browser. */
function deriveRenderRule(): string[] {
  return [
    ...walkFiles(webApp, (n) => n.endsWith(".tsx")),
    ...walkFiles(path.join(here, "../../../apps/web/src/components"), (n) => n.endsWith(".tsx")),
  ].filter(notVendored);
}

/** Rule 2, CHANNEL: a file that sends mail or push composes what arrives. */
function deriveChannelRule(): string[] {
  const send = /\bsendMail\(|\bsendResendEmail\(|\bsendPush\(/;
  const out: string[] = [];
  for (const dir of ["apps", "packages", "services"]) {
    for (const f of walkFiles(path.join(REPO, dir), (n) => /\.(ts|tsx|mjs)$/.test(n) && !/\.test\./.test(n))) {
      if (!notVendored(f)) continue;
      if (send.test(stripComments(readFileSync(f, "utf8")))) out.push(f);
    }
  }
  return out;
}

/** Rule 3, ACTION MESSAGE: recorded()/refuse() arguments are operator copy. */
function deriveActionRule(): string[] {
  const msg = /\brecorded\(|\brecordedTo\(|\brefuse\(|\brefuseTo\(/;
  const out: string[] = [];
  for (const f of walkFiles(path.join(REPO, "apps"), (n) => /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n))) {
    if (!notVendored(f)) continue;
    if (msg.test(stripComments(readFileSync(f, "utf8")))) out.push(f);
  }
  return out;
}

/**
 * The SEED rule, added 28 August 2026.
 *
 * Every file a `db:` script points at writes CONTENT INTO THE DATABASE
 * that a surface then renders: playbook field values, registry entry
 * labels, prompt item text. That content is copy by any reading of the
 * standing rule, and none of it was scanned: `demo-content.ts` carried
 * nineteen em dashes into Fernbrook, two of them on CRITICAL rows at the
 * top of the flags-first panel, which is the most-read surface in the
 * app. The founder found them by looking at the panel.
 *
 * Derived from `package.json` rather than listed, so a new seed script is
 * covered the moment it is wired up rather than when somebody remembers.
 * That is the same reasoning as the render and channel rules: the scope
 * is computed, so it cannot go stale.
 */
function deriveSeedRule(): string[] {
  const pkg = JSON.parse(readFileSync(path.join(here, "../package.json"), "utf8")) as
    { scripts?: Record<string, string> };
  const out = new Set<string>();
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    if (!name.startsWith("db:")) continue;
    const m = /node\s+(src\/[\w.-]+\.ts)/.exec(cmd);
    if (!m) continue;
    const abs = path.resolve(here, "..", m[1]!);
    if (existsSync(abs)) out.add(abs);
  }
  return [...out];
}

function derivedByRule(): Record<string, string[]> {
  return {
    render: deriveRenderRule(),
    channel: deriveChannelRule(),
    action: deriveActionRule(),
    seed: deriveSeedRule(),
  };
}

// Floors set BELOW today's counts, not at them, so ordinary growth does
// not trip them and a broken detector still does.
const RULE_FLOORS: Record<string, number> = { render: 30, channel: 4, action: 1, seed: 5 };

// The sanctioned escape hatch, used as intended: each entry is a reviewed
// exception with a written reason, never a silenced rule. Every entry
// below exists for ONE reason, the pending voice pass: these surfaces
// carry offending marks today, the rewrite is a voice decision on strings
// that go out under the founder's name, and it is sequenced as its own
// session AFTER this census so the strings are guarded before they are
// rewritten. Removing an entry is how that session proves it finished a
// surface.
//
// EXCUSALS ARE FRAGMENT-SCOPED, NOT FILE-SCOPED, and that is the whole
// design. The first version of this list excused whole FILES, which had a
// defect found the same night: `visit-commands/route.ts` was excused for
// its STAFF alert copy, and that excusal also covered line 30, the CLIENT
// report email's subject line, which had just been fixed. A regression on
// the one line most worth guarding would have passed CI, inside an
// exception written for something else entirely. A file-level hatch is
// always wider than the exception it was opened for.
//
// So each entry names the EXACT offending fragments. Every other line in
// the file stays guarded. Fragments rather than line numbers, because a
// line number goes stale the moment anything above it moves, and a stale
// excusal that silently slides onto a different line is the same defect
// in a new place.
type Excusal = { reason: string; allow: string[] };
const CENSUS_EXCUSALS: Record<string, Excusal> = {
  // The ONLY entry here that is not waiting on the voice pass. These ten
  // fragments are registry_entry LABELS, and the label is db:demo's
  // idempotency key: seeding matches on it, so rewriting one does not
  // rename an entry, it inserts a second one beside the first. Proven the
  // hard way on 28 August, when a rewrite of exactly these ten took
  // Fernbrook from fourteen registry rows to twenty-four, both spellings
  // live, feeding duplicate prompt candidates through the sweep.
  //
  // F3 called this out for prompt packs ("packName is an IDENTIFIER, not
  // display-only") and M fixed it with the pack_key / pack_name split in
  // 0028. registry_entry never got that split, so its label is still both
  // things at once. Ruling 3's sweep left every keyed identifier alone for
  // this reason and these are keyed identifiers.
  //
  // This excusal comes out when the display/key split lands for
  // registry_entry, which is its own session with a migration. Until then
  // the em dashes are a KNOWN residue on a rendered surface, and that is a
  // worse thing to hide than to name.
  "packages/schema/src/demo-content.ts": {
    reason: "registry_entry labels are the seed's idempotency key; rewriting one inserts a duplicate rather than renaming (F3 in a new table). Pending the display-name/key split that 0028 gave prompt packs.",
    allow: [
      "Mia — birthday",
      "Gram Ruth — birthday",
      "Owen — clothing",
      "Owen — shoes",
      "Mia — clothing",
      "Mia — shoes",
      "Rosa — housekeeper",
      "Ben — dog walker",
      "Trupanion — Biscuit",
      "Owen — kindergarten",
    ],
  },
  "apps/web/src/app/mfa/page.tsx": {
    reason: "four rendered sentences on the staff second-factor screen; pending the voice pass sequenced after this census",
    allow: [
      "Codes rotate every 30 seconds",
      "Staff access needs a second factor",
      "Out of backup codes",
      "Time-based, 6 digits, SHA-1",
    ],
  },
  "apps/web/src/app/mfa/recovery-codes/page.tsx": {
    reason: "two rendered sentences including a button label on the backup-codes screen; pending the same voice pass",
    allow: ["any one of these codes gets you back in", "I&apos;ve saved these"],
  },
  "apps/web/src/app/link-device/page.tsx": {
    reason: "one rendered sentence on the device pairing screen; pending the same voice pass",
    allow: ["Keep this code private"],
  },
  "apps/web/src/app/dev/last-email/page.tsx": {
    reason: "one rendered sentence on the dev-only last-email helper, unreachable in production; pending the same voice pass",
    allow: ["One click per link"],
  },
  "apps/web/src/app/api/visit-commands/route.ts": {
    reason: "the corporate WATCH alert subject and body, STAFF-facing, waiting on the voice pass. Scoped to those two fragments deliberately: the CLIENT report subject in the same file was fixed 26 Aug and must stay guarded, which a file-level excusal would have prevented.",
    allow: ["Life-change signal flagged this visit", "Visit closed"],
  },
};

/**
 * TIMEOUT RAISED 2026-08-27, and the reason matters more than the number.
 *
 * This test walks the repository to DERIVE its own scope, which is the
 * point of it and also why it is the slowest thing in the suite: about a
 * second alone, and past vitest's 5s default when fourteen files run in
 * parallel on a loaded machine. It failed intermittently on three local
 * runs and was dismissed each time as local noise. Then it failed a real
 * CI gate on a comment-only change.
 *
 * **The dangerous outcome was never the red run. It was the re-run.** A
 * guard that fails for reasons unrelated to what it guards teaches the
 * person watching to press the button again, and a guard everyone re-runs
 * to green is allowlisted into silence without anyone editing an
 * allowlist. Raising the budget is the fix; re-running would have been
 * the defect.
 *
 * 30s is a proposal, not a measurement: roughly thirty times the observed
 * solo cost, chosen so contention cannot reach it rather than to sit just
 * above the worst case seen. A census that genuinely takes 30s has a real
 * problem worth failing on.
 */
// Timeout now comes from vitest.config.ts, which covers every walker in
// this package rather than this one test (see G-90 and its follow-on).
test("the copy census derives its own scope, and every exception is written down", () => {
  const derived = derivedByRule();

  for (const [rule, files] of Object.entries(derived)) {
    assert.ok(
      files.length >= RULE_FLOORS[rule]!,
      `the ${rule} rule derived only ${files.length} files (floor ${RULE_FLOORS[rule]}). ` +
        "A detection that breaks and returns a tiny set must fail rather than pass vacuously.",
    );
  }

  for (const [key, ex] of Object.entries(CENSUS_EXCUSALS)) {
    assert.ok(ex.reason.trim().length > 10, `census excusal for ${key} needs a real written reason`);
    assert.ok(ex.allow.length > 0, `census excusal for ${key} must name the fragments it excuses, never the whole file`);
    // A fragment that no longer appears is a hatch left open over nothing.
    // Same reasoning as the stale-file check below, one level finer.
    const src = readFileSync(path.join(REPO, key), "utf8");
    const gone = ex.allow.filter((f) => !src.includes(f));
    assert.deepEqual(gone, [],
      `census excusal for ${key} names fragment(s) no longer in the file; remove them: ${gone.join(" | ")}`);
  }

  // An excusal naming a file no rule derives any more is stale
  // bookkeeping wearing the costume of a reviewed exception.
  const allDerived = new Set(Object.values(derived).flat().map(repoRel));
  const stale = Object.keys(CENSUS_EXCUSALS).filter((k) => !allDerived.has(k));
  assert.deepEqual(stale, [],
    `census excusal names a file no rule derives; remove it: ${stale.join(", ")}`);

  // The hand-held residue must stay the residue. A file a rule already
  // derives does not belong on a memory list; leaving it there is how the
  // list grew to fifteen while its own comment still said six.
  const residue = COPY_SOURCES.map((r) => repoRel(path.resolve(here, r)));
  const derivable = residue.filter((r) => allDerived.has(r));
  assert.deepEqual(derivable, [],
    `COPY_SOURCES names files the census already derives; remove them from the hand-held list: ${derivable.join(", ")}`);
});

test("derived copy sources contain no em dashes outside comments", () => {
  const offenders: string[] = [];
  const files = [...new Set(Object.values(derivedByRule()).flat())].sort();
  for (const file of files) {
    const key = repoRel(file);
    const ex = CENSUS_EXCUSALS[key];
    stripComments(readFileSync(file, "utf8")).split("\n").forEach((line, i) => {
      if (!hasEmDash(line)) return;
      // Fragment-scoped: only a line carrying an excused fragment passes.
      // Every other line in an excused file is still guarded.
      if (ex && ex.allow.some((f) => line.includes(f))) return;
      offenders.push(`${key}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [],
    `em dash in a derived copy source (the copy census; CLAUDE.md: no em dashes anywhere): ${offenders.join(", ")}`);
});
