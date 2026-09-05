#!/usr/bin/env node
/**
 * Preparation batch item 11: every gap-register entry marked blocks-E1, defer
 * or stale, one line each.
 *
 * THE INVENTORY IS COMPUTED, THE MARKS ARE JUDGMENT, and the split is the
 * point. Ids, titles and addendum counts are read from `docs/GAP_REGISTER.md`
 * so the sheet cannot drift from the register; the mark and its line are a
 * person's reading, held here so that BOTH directions are checked: an entry
 * with no mark fails, and a mark naming an entry that does not exist fails.
 * A new G entry therefore breaks this file until somebody triages it, which is
 * the census pattern used by the four schema guards.
 *
 * The register carries NO machine-readable status field. A keyword scan for
 * CLOSED or FIXED was tried and abandoned: it matches those words in prose and
 * misses entries closed in lower case, so it returns a confident number about
 * a question it never asked (G-129). Every mark below comes from reading the
 * entry.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "docs/GAP_REGISTER.md";
const OUT = "docs/G_REGISTER_TRIAGE.md";
const MARKS = new Map(Object.entries({
  // ---- blocks-E1: the E1 software gate, or the founding cohort it depends on.
  "G-01": ["blocks-E1", "The vault's root of trust has one custodian and no recovery path. ADR-005 is drafted and the second custody is still a bracket; no real s3 value should exist until it is filled."],
  "G-02": ["blocks-E1", "Neon PITR is the only copy of every playbook, vault row, audit event and photo. The custody checklist puts the restore drill BEFORE touching the database account at formation."],
  "G-07": ["blocks-E1", "Insurance bound is an E1 condition in its own right, and workers' compensation attaches from the point of employment in Virginia."],
  "G-08": ["blocks-E1", "No breach response procedure and no named owner. WK-SEC-001 and the privacy notice both assume one exists."],
  "G-09": ["blocks-E1", "Five subprocessor agreements, no cost, none executed. Real household data should not flow before they are."],
  "G-10": ["blocks-E1", "No first HOM and no first household. Everything E1 measures (thirty stable days, a member on the digest for a month) is downstream of this."],
  "G-13": ["blocks-E1", "THE GATE NOBODY HAS LOOKED AT SINCE AUGUST. The staff disclosure is founder-approved and neither counsel-reviewed nor acknowledged, and CLAUDE.md's merge gate says no capture surface attributing data to a named HOM ships before it. `time_entry` and `object_observation` already exist under that rule, and G-41 makes it gate HIRING rather than a build."],
  "G-19": ["blocks-E1", "The privacy notice still carries the breach-notification bracket, so a member-facing legal document is unfinished. The legal half of G-08."],
  "G-22": ["blocks-E1", "The key re-wrap has never been drilled, and a documented procedure is not a drilled one. Same class as the restore drill, same trigger: formation."],
  "G-26": ["blocks-E1", "ADR-005 is still Proposed, and its own consequences section says it stays Proposed until the brackets are filled and the sealed copy exists. The strongest guardrail in the package is in a document that has not been adopted."],
  "G-41": ["blocks-E1", "Personnel data is captured against a named HOM with no staff disclosure in force. Reads with G-13; the trigger is the first non-founder employee, which the founding cohort creates."],
  "G-42": ["blocks-E1", "After-the-fact time entry becomes an employer recordkeeping question at the first non-exempt employee. E1 names payroll live, and WK-SOP-017 is the wage-compliance half."],
  "G-48": ["blocks-E1", "Hired and non-owned auto liability, with `travel` and `mileage` shipped as capture categories. Same broker call as G-07 and before the first household signature."],
  "G-53": ["blocks-E1", "The reveal audit records the ATTEMPT and never the outcome, so a failed reveal and a successful one are indistinguishable in the trail counsel's packet calls load-bearing. Needs one founder decision first: the outcome vocabulary, minimum delivered versus not."],
  "G-110": ["blocks-E1", "WK-TRN-009 has never been written. Ruled 5 September as a COO writing task on the 25 September agenda rather than a document to chase; Q-16 waits on it."],
  "G-130": ["blocks-E1", "WK-SEC-001 v1.1 exists on the repository mirror and the controlled copy is still v1.0. No assessor is engaged against v1.0, so the founder-side transfer gates the security test."],
  "G-131": ["blocks-E1", "WK-TRN-007 absent, and with G-110 and G-108 it is a PATTERN: the certification program's sources are largely unwritten and live in the COO's practice. Writing them is the founding-cohort critical path."],

  // ---- defer: live and real, not on the E1 path. A trigger is named where one exists.
  "G-04": ["defer", "Crypto-shred is reversible inside the PITR window. Addressed in doctrine by the G-128 ruling (state the retention floor to members, name the window); what remains is one figure from the Neon plan, held as `BACKUP_RETENTION_WINDOW = null`."],
  "G-11": ["defer", "The runbook exists (the entry's own correction). The sliver is real: no named owner and no home for the friction log."],
  "G-12": ["defer", "The E-gates now supply the milestone half the entry asked for. What paper retirement itself requires is still unwritten, which is the part that has not been superseded."],
  "G-16": ["defer", "The exit test has no volume guard, so zero defects across four visits is indistinguishable from zero defects across a real sample. Trigger: whenever the parallel phase actually runs."],
  "G-20": ["defer", "The weekly drift check may be aspirational and the friction log has no home. Reads with G-11."],
  "G-21": ["defer", "The quarterly lender reconciliation has no owner and leaves no evidence. Trigger: the first lender submission."],
  "G-23": ["defer", "The smoke checklist stops being safe once demo data is archived, because the incident register has no delete path by design. Trigger: go-live archiving."],
  "G-24": ["defer", "Exit criteria 1 and 3 pull against each other. Same trigger as G-16."],
  "G-25": ["defer", "The exit-test numbers are a structural gate rather than a tuning knob: they require roughly three concurrent households before paper can retire."],
  "G-27": ["defer", "The weekly drift dump writes a plaintext household export to a laptop with no retention rule. Trigger: the first weekly drift run."],
  "G-31": ["defer", "A function killed at its time ceiling renders a partial page with no error anywhere. `maxDuration` was raised; detection was not built."],
  "G-32": ["defer", "The drill-in is about nine sequential round trips. Fine at this scale, and the trigger is a double-digit fleet."],
  "G-34": ["defer", "One reveal wrote no audit row, unexplained, never recurred, no logs running at the time. Stays open as a known anomaly against a load-bearing trail; a recurrence WITH logs is an immediate investigation."],
  "G-36": ["defer", "`sslmode=require` weakens to skip certificate verification under libpq semantics. Trigger: any pg major bump, and the fix is a one-line connection-string change in three places."],
  "G-37": ["defer", "A stale server-action id dies before application code runs, so no guard can speak. Reads with G-67, whose decisive evidence is still owed."],
  "G-43": ["defer", "Membership price is duplicated between `membership_event` and QuickBooks with nothing reconciling them. The ADR-004 seam, appearing where it always would."],
  "G-44": ["defer", "No spend cap or alert on Upstash after the pay-as-you-go upgrade. A five-minute dashboard chore."],
  "G-45": ["defer", "Intake hours are capturable exactly once per household during a chaotic first week, and no runbook requires it. Trigger: the first onboarding, which makes this cheap now and impossible later."],
  "G-46": ["defer", "Mileage substantiation needs purpose and destination, and the field list is the founder's. Carries an erasure interaction."],
  "G-47": ["defer", "Tier gating is data with no behaviour. Trigger, unchanged: the first household on a non-Concierge tier, which the launch checklist's item 7 is currently considering."],
  "G-56": ["defer", "The Member Circle register does not exist. Not E1, and it is a hard gate on WK-SVC-007 and the lead pipeline: no record about a person who is not a client ships before REQ-077."],
  "G-57": ["defer", "The 83-field temporal layer is unbuilt and the horizon channel has no substrate. Phase 2 schema work, waiting on Phase 1 custody."],
  "G-58": ["defer", "One suppression state is genuinely missing and the six are not one pipeline."],
  "G-66": ["defer", "Role assignments before 25 August carry no audit history. The backfill is REFUSED by decision rather than pending, because it would have to invent an actor and a reason; the fleet-wide count is founder-side."],
  "G-67": ["defer", "Two corporate actions reported success and wrote nothing, never reproduced, and the instrument is now calibrated: no POST row means client-side, a non-303 means the server. Reads with G-37."],
  "G-70": ["defer", "The sign-in flow half-fixed: `/verify-request` names the address. The email recipient line and the autofill trade are founder copy calls."],
  "G-74": ["defer", "A register entry is evidence a control was BUILT, never that it is still in place. Its remedy is periodic re-verification against primary sources, and this triage is the first such pass."],
  "G-79": ["defer", "Neither GitHub endpoint alone answers whether a branch is protected. Standing check discipline rather than a defect; it re-earns its keep at the org transfer."],
  "G-81": ["defer", "A suppressed client email is visible in a log nobody reads. The board's exception queue is the surface, and it has never fired."],
  "G-85": ["defer", "Migration 0058's ten columns still have no producer, and the capture surface that would write them is out of launch scope by 24.2. The doctrine it produced is in CLAUDE.md; the columns stay inert."],
  "G-86": ["defer", "The smoke checklist manufactures its own duplicate prompts, because the dedup key includes the change instant."],
  "G-88": ["defer", "A permission enforced one layer below the surface produces a symptom pointing at the wrong subsystem. `/visit` gates on role and the sink gates on the second factor."],
  "G-90": ["defer", "A guard that times out is allowlisted into silence by re-running, with no allowlist involved. The copy census is the instance."],
  "G-94": ["defer", "Overdue-ness comes only from prompt age, never occurrence age. A property recorded so the opposite assumption does not survive by never being contradicted."],
  "G-99": ["defer", "The NO-CONSENT branch is unexercised everywhere, by choice. A deliberate trade whose cost is real."],
  "G-100": ["defer", "A marker whose value is its scarcity was destroyed by locally correct additions. Nothing was wrong at the row level, which is why nothing at the row level could catch it."],
  "G-105": ["defer", "The Phase 2 covenant acceptance criterion is a defect in the adopted directive. The exact one-line edit is prepared, so it belongs on the 25 September two-key agenda rather than in a queue."],
  "G-107": ["defer", "The named fix is not built: a guard asserting `LIBRARY_INDEX.md` names every file in `docs/library/`, computed with a count floor."],
  "G-108": ["defer", "An acceptance criterion names a QA five-dimension review that does not exist under that name. Library-side, and part of the G-131 pattern."],
  "G-117": ["defer", "The drain metric proves PROGRESS, never CORRECTNESS, which is written into its own not-covered note."],
  "G-118": ["defer", "Auto-opening the next scheduled household, deferred by ruling for ninety days of route data from 2 September 2026."],
  "G-121": ["defer", "The Four-Stage spec names five movements and specifies a four-value tag. Logged for the Q-18 reconciliation by instruction, not reconciled in code."],
  "G-122": ["defer", "REQ-017's two PDFs are undelivered AND unqueued, which is the risk the entry was filed early to prevent."],
  "G-128": ["defer", "Erasure is complete logically and the bytes stay until the relation is rewritten. Ruled: no VACUUM FULL, the word unrecoverable retired, the retention floor stated to members. One founder figure outstanding."],

  // ---- stale: nothing to act on. The line says WHY, so closed and superseded stay distinguishable.
  "G-03": ["stale", "Closed: the tool honours retention holds by default and refuses while an incident is open, both flags landing in the final audit entry."],
  "G-05": ["stale", "Closed with evidence: `floor-bypass.spec.ts` exercises the real scheduler path on every CI run."],
  "G-06": ["stale", "Superseded: every standing check has since run against a live build, and the 25 August sitting is the frozen record."],
  "G-14": ["stale", "Closed: the Apple review-account conflict was resolved with a scoped review account."],
  "G-15": ["stale", "Closed: both halves fixed, and check 13 now splits into the refusal and the plan."],
  "G-17": ["stale", "Closed: the refusal guardrail is in ADR-005 and LAUNCH 1.1 was demoted with the cross-reference. The document's own status is G-26."],
  "G-18": ["stale", "Moot: a filing question about where G-02 sat. G-02 carries the substance and is marked above."],
  "G-28": ["stale", "Superseded: the rev 6 brief's bucketing no longer governs."],
  "G-29": ["stale", "Closed: `refuse()` plus the refusal-visibility guard, and G-68 did the same work in the success direction."],
  "G-30": ["stale", "Closed: the send path is now observable end to end through `mail_outcome` and the Resend webhook (Q-1)."],
  "G-33": ["stale", "Closed: the phantom reveal row did not reproduce and the render path was settled."],
  "G-35": ["stale", "Answered and closed: the stray project held nothing and the founder deleted it. The incident opened against it was withdrawn and kept as a record of a false premise."],
  "G-38": ["stale", "Closed: the empty card was a query-parameter defect, since fixed."],
  "G-39": ["stale", "Closed: uncontrolled selects were the cause and the fixture caught it."],
  "G-40": ["stale", "Closed: erasure extended over the capture tables, and `erasure-coverage.test.ts` now computes the census."],
  "G-49": ["stale", "Built: `object_observation` carries the series (0029) and 0058 added the install-date columns. The remaining half is the temporal layer, live as G-57."],
  "G-50": ["stale", "Settled by the AJ ruling, option 2: corporate_admin was admitted to the four field surfaces and the one-role index stands."],
  "G-51": ["stale", "Closed by AI: every open deferral resolves whenever it is open, and overdue only sorts and tags."],
  "G-52": ["stale", "Settled: the command was lost client-side and AK closed the window with put-new-then-delete-old."],
  "G-54": ["stale", "Fixed in `totp.ts`: an unopenable secret is treated as unsatisfiable so the backup-code fallback stays reachable, proven by the boot-time KEK validation the same week. The operational rule travels with it: clear enrolled TOTP rows before rotating, or accept a lockout."],
  "G-55": ["stale", "Closed: the eleventh guard proves every refusal target renders its banner."],
  "G-59": ["stale", "Closed: ADR-006 subject tokens at all three write sites."],
  "G-60": ["stale", "Informational: a live-data read that found no drift and confirmed two schema gaps now tracked elsewhere."],
  "G-61": ["stale", "Closed and verified in production against a stored midnight value, which is the only reading that proves it."],
  "G-62": ["stale", "Corrected the same day, and `legal-census.test.ts` now computes the detection the rule used to hold in memory."],
  "G-63": ["stale", "Fixed: `--preflight` is structurally read-only, and it earned its accepting proof on a real two-migration gap."],
  "G-64": ["stale", "Fixed: `db:hg` requires `--by`, gates on a corporate admin, and backfills missing history marked recordedLate."],
  "G-65": ["stale", "Closed: `/visit` demands an explicit selection whenever a HOM holds more than one field assignment. The auto-open question is G-118."],
  "G-68": ["stale", "Fixed: every action confirms, and `success-visibility.test.ts` computes both halves of its input."],
  "G-69": ["stale", "Fixed: the subject is read before the delete and mirrored into the audit detail as a token."],
  "G-71": ["stale", "Fixed: the fixture is resolved by the tool's own predicate rather than by two people writing the same string."],
  "G-72": ["stale", "Doctrine: confirm a deliberate break landed before reading the result. In CLAUDE.md's verification section."],
  "G-73": ["stale", "Closed: protection landed 27 August as a ruleset, read from both endpoints. The reading discipline it left behind is G-79."],
  "G-75": ["stale", "Doctrine: the absent control was cited as the reason to skip the check that would have found it absent."],
  "G-76": ["stale", "Fixed: the census no longer descends into `.next` or `.turbo`, and deliberately does not swallow the read error."],
  "G-77": ["stale", "Doctrine, and now the first family member of G-129: state the unit, and check that the unit counted is the unit at risk."],
  "G-78": ["stale", "Corrected the same day it was filed, and `client-payload-shape.test.ts` shipped. Its residual, what a permitted key CONTAINS, is written in CLAUDE.md's guard table."],
  "G-80": ["stale", "Informational: protection refused a change reported green, on its first pull request."],
  "G-82": ["stale", "Doctrine plus a built gate: legitimacy is not currency, and the deploy checks both."],
  "G-83": ["stale", "Doctrine: a guard can pass for reasons unrelated to the question it appears to answer."],
  "G-84": ["stale", "Doctrine: a difference between two pointers is not a claim about the thing they point at."],
  "G-87": ["stale", "Doctrine, the inverse of G-84. Nothing was lost."],
  "G-89": ["stale", "Fixed: the copy no longer says hours record themselves, on both surfaces, and the native chip that fabricated a window is gone."],
  "G-91": ["stale", "Throwaway code, real mechanism, recorded as doctrine."],
  "G-92": ["stale", "Doctrine: a bare filename in a committed document reads as a repository path."],
  "G-93": ["stale", "Doctrine: a citation that does not survive being followed costs more than a missing one. Sharpened 5 September by the read-the-citation rule."],
  "G-95": ["stale", "Fixed, and the doctrine is the entry: writing a hazard down felt like handling it."],
  "G-96": ["stale", "Doctrine: a query made cleaner and thereby made blind."],
  "G-97": ["stale", "Fixed: the fallback returns `hh: null` rather than an arbitrary household row."],
  "G-98": ["stale", "Fixed and proven zone-independent in both directions, in the tool built to verify the system."],
  "G-101": ["stale", "Fixed: the idempotency-key rename inserted rather than renaming, and idempotent is what made it silent."],
  "G-102": ["stale", "A record of three rulings withdrawn against adopted decisions, kept visible rather than deleted."],
  "G-103": ["stale", "Closed: REQ-031 amended in place, REQ-036 annotated as deliberately unchanged, the version line moved. The covenant half is G-105."],
  "G-104": ["stale", "Fixed on both surfaces, and the addendum's real finding (a fabricated three-hour window) was fixed rather than relabelled."],
  "G-106": ["stale", "Doctrine: an absence reported from a search that could not have found it."],
  "G-109": ["stale", "Closed by R26: the board says what it measures, in units, with the hiring trigger disclaimed in both knob states. Computing WK-SOP-014's own rule needs a denominator the system does not hold, which is recorded rather than invented."],
  "G-111": ["stale", "Fully closed: the schema (0059), the person-scoped producer, and the WK-SOP-017 self-access view are all built."],
  "G-112": ["stale", "Fixed within the hour by CI, and the useful part is the sentence beside it."],
  "G-113": ["stale", "Closed: three display defects and two seed defects fixed and verified in production, seed re-runs included."],
  "G-114": ["stale", "Closed by the A2 ruling: the drain selects registered kinds only, with the waiting-rows metric on the board."],
  "G-115": ["stale", "Answered and closed: scenario 2, the worker redeployed, and `repeat:drain-outbox` is completing in production."],
  "G-116": ["stale", "Closed: `time_entry.tz` (0060), zone-less writes refused, per-row zone display."],
  "G-119": ["stale", "Closed and verified row by row against the founder's own pre-migration snapshot. The one remainder is queue row Q-11w, deferred with a trigger."],
  "G-120": ["stale", "Settled across four addendums: both doors shut by mechanism, proven by a controlled pair. Its lesson, that a document quoting a moving register is a snapshot, is in CLAUDE.md."],
  "G-123": ["stale", "Minor and recorded: a frozen ruling's own date precedes the report it answers."],
  "G-124": ["stale", "Closed on arrival: the audit's lead finding was the shape of its own query. First instance of G-129."],
  "G-125": ["stale", "Closed: the erasure tool's first real run failed on a column it had never written to, past what a dry run prints."],
  "G-126": ["stale", "Closed: the archive could not restore a jsonb array, and the published portability proof was narrowed in place."],
  "G-127": ["stale", "Closed: section 1 renamed to Household summary, and the member's page no longer carries the company's triage vocabulary."],
  "G-129": ["stale", "The class itself, named by ruling and written into CLAUDE.md. Nothing to act on beyond applying it, which this sheet does."],
}));

function refuse(why) { console.error(`REFUSED: ${why}`); process.exit(1); }

const lines = readFileSync(SRC, "utf8").split("\n");
const heads = lines.filter((l) => /^### G-\d/.test(l));
if (heads.length < 140) refuse(`only ${heads.length} entry headings found in ${SRC}; the detection is broken`);

/** id -> { title, addenda } computed from the register itself. */
const entries = new Map();
for (const h of heads) {
  const id = h.match(/^### (G-\d+)/)[1];
  const rest = h.replace(/^### G-\d+\.?\s*/, "").trim();
  const e = entries.get(id);
  if (!e) entries.set(id, { title: rest, addenda: 0 });
  else e.addenda += 1;
}
if (entries.size < 120) refuse(`only ${entries.size} distinct entries; the detection is broken`);

const ids = [...entries.keys()].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
const unmarked = ids.filter((id) => !MARKS.has(id));
if (unmarked.length) refuse(`untriaged entries: ${unmarked.join(", ")}. A new register entry stays untriaged until somebody reads it.`);
const ghosts = [...MARKS.keys()].filter((id) => !entries.has(id));
if (ghosts.length) refuse(`marks for entries that no longer exist: ${ghosts.join(", ")}`);

const MARK_ORDER = ["blocks-E1", "defer", "stale"];
/* Titles are QUOTED VERBATIM from the register, so a few carry em dashes that
 * the standing rule bars in new prose. Rewriting a quoted title would misquote
 * a frozen dated entry, which is the objection the 27 August ruling rests on,
 * so they stand and the sheet says how many rather than leaving a reader to
 * wonder whether the rule lapsed. Counted, never stated by hand. */
const emDashTitles = [...entries.values()].filter((e) => e.title.includes("\u2014")).length;
for (const [id, [mark]] of MARKS) if (!MARK_ORDER.includes(mark)) refuse(`${id} carries an unknown mark "${mark}"`);
const count = (m) => ids.filter((id) => MARKS.get(id)[0] === m).length;

let out = `---
status: living
---
# Gap register triage

**Preparation batch item 11.** Every entry marked **blocks-E1**, **defer** or
**stale**, one line each.

**GENERATED, not transcribed, and only half of it is generated.** The ids,
titles and addendum counts are read from \`${SRC}\`; the mark and its line are a
person's reading of the entry. Re-run
\`node tooling/review/g-register-triage.mjs\`. **The guard runs both ways: an
entry with no mark refuses, and a mark naming an entry that no longer exists
refuses**, so a new register entry breaks this file until somebody triages it.

**Why the marks are not computed.** The register carries no machine-readable
status field. A keyword scan for CLOSED or FIXED was tried and abandoned: it
matches those words in prose and misses entries closed in lower case, so it
returns a confident number about a question it never asked (G-129). Every mark
below comes from reading the entry.

## What the marks mean

- **blocks-E1**: must be resolved before the E1 software gate or before the
  founding cohort it depends on. Most are founder-side rather than engineering.
- **defer**: live and real, not on the E1 path. A trigger is named where one
  exists, so a deferral has an end rather than a hope.
- **stale**: nothing to act on. Closed, fixed, superseded, withdrawn, or
  describing a state that no longer exists. **The line says which**, so closed
  and superseded stay distinguishable inside one mark; the item asked for three
  marks and the distinction lives in the sentence rather than in a fourth.

## The counts, computed from the marks below

| Mark | Entries |
|---|---|
| blocks-E1 | ${count("blocks-E1")} |
| defer | ${count("defer")} |
| stale | ${count("stale")} |
| **total** | **${ids.length}** |

**The batch item said 122 and the register holds ${ids.length}**, in ${heads.length} headings
(the difference is addendums, which are counted with their parent). Corrected
against the tree rather than carried from the document, per the standing rule.

**${emDashTitles} titles below carry an em dash**, quoted verbatim from register entries
written before the rule was swept. They stand as written: rewriting a quoted
title would misquote a frozen dated entry, which is the objection the
27 August ruling rests on. The count is computed, so it cannot drift.

## The gate nobody had looked at

**G-13, the staff disclosure**, and it is the one the batch item guessed was
there. It is founder-approved, not counsel-reviewed, and not acknowledged by
any hire. CLAUDE.md's merge gates say no capture surface attributing data to a
named HOM ships before it, and \`time_entry\` and \`object_observation\` already
exist under that rule. G-41 sharpens it: **it gates HIRING, not a build**, so
it is reached by the founding cohort rather than by a queue row, and nothing in
CI can say so.

`;

for (const mark of MARK_ORDER) {
  const rows = ids.filter((id) => MARKS.get(id)[0] === mark);
  out += `\n## ${mark} (${rows.length})\n\n| Entry | Title | One line |\n|---|---|---|\n`;
  for (const id of rows) {
    const e = entries.get(id);
    const t = e.title.replace(/\|/g, "/") + (e.addenda ? ` (+${e.addenda} addendum${e.addenda > 1 ? "s" : ""})` : "");
    out += `| ${id} | ${t} | ${MARKS.get(id)[1]} |\n`;
  }
}

writeFileSync(OUT, out);
console.log(`wrote ${OUT}: ${ids.length} entries from ${heads.length} headings; blocks-E1 ${count("blocks-E1")}, defer ${count("defer")}, stale ${count("stale")}.`);
