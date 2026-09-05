#!/usr/bin/env node
/**
 * Preparation batch item 9: the evaluation forms and the scenario stub bank.
 *
 * IT GENERATES RATHER THAN TRANSCRIBES (the item 8 precedent). Both outputs
 * are derived from frozen intake sources, so re-running makes them current by
 * construction and a hand edit here is a second copy that drifts from the
 * first.
 *
 * Sources, all frozen:
 *   docs/intake/2026-09-04-founder-values/rubric_anchors.csv  (the 12 domains)
 *   docs/intake/2026-09-03-build-package/SPEC_MODE_LOGIC.md   (the five items)
 *   docs/intake/2026-09-03-build-package/FIXTURES.md          (the bank, traps)
 *
 * Every list this script prints is COUNTED FROM ITS SOURCE and asserted
 * against the count the source states in words. A parse that silently returns
 * eleven traps where the document says twelve would produce a confident sheet
 * about a question it never asked (G-129), so the assertions refuse instead.
 */
import { readFileSync, writeFileSync } from "node:fs";

const RUBRIC = "docs/intake/2026-09-04-founder-values/rubric_anchors.csv";
const MODES = "docs/intake/2026-09-03-build-package/SPEC_MODE_LOGIC.md";
const FIXTURES = "docs/intake/2026-09-03-build-package/FIXTURES.md";
const OUT_FORMS = "docs/EVALUATION_FORMS_REVIEW_SHEET.md";
const OUT_STUBS = "docs/SCENARIO_STUB_BANK.md";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

function refuse(why) { console.error(`REFUSED: ${why}`); process.exit(1); }

/* ---------- source 1: the twelve rubric domains ---------- */
const rubricRows = parseCsv(readFileSync(RUBRIC, "utf8"));
const rubricHeader = rubricRows.shift();
const ANCHOR_COLS = rubricHeader.slice(2); // anchor_2 .. anchor_5
if (rubricRows.length !== 12) refuse(`${RUBRIC} carries ${rubricRows.length} domains, and item 9 is about twelve`);
if (ANCHOR_COLS.length !== 4) refuse(`${RUBRIC} carries ${ANCHOR_COLS.length} anchor columns, expected 4 (scores 2 to 5)`);
const domains = rubricRows.map(([domain, tier, ...anchors]) => ({ domain, tier, anchors }));
const byTier = {};
for (const d of domains) (byTier[d.tier] ||= []).push(d);
const ANCHOR_SCORES = ANCHOR_COLS.map((c) => Number(c.match(/anchor_(\d)/)[1]));

/* ---------- source 2: the five-item scenario form ---------- */
const modeText = readFileSync(MODES, "utf8");
const formLine = modeText.split("\n").find((l) => l.includes("Scenario evaluation form as a record"));
if (!formLine) refuse(`${MODES} no longer carries the scenario evaluation form line`);
// "...as a record: outcome, structure, understanding, escalation, failure modes; pass / repeat / module review; ..."
const [, itemsPart, verdictPart] = formLine.split(/:\s|;\s/, 3).length >= 3
  ? [null, formLine.split(": ")[1].split("; ")[0], formLine.split("; ")[1]]
  : refuse("could not split the evaluation form line into items and verdicts");
const FORM_ITEMS = itemsPart.split(", ").map((s) => s.trim());
const VERDICTS = verdictPart.split(" / ").map((s) => s.trim());
if (FORM_ITEMS.length !== 5) refuse(`parsed ${FORM_ITEMS.length} form items from ${MODES}, and every source calls it the five-item form`);
if (VERDICTS.length !== 3) refuse(`parsed ${VERDICTS.length} verdicts from ${MODES}, expected three`);
const promotionLine = modeText.split("\n").find((l) => l.includes("rubric 3+"));
if (!promotionLine) refuse(`${MODES} no longer carries the HOM I rubric threshold`);

/* ---------- source 3: the bank, the traps, the abuse set ---------- */
const fixText = readFileSync(FIXTURES, "utf8");
const bankLine = fixText.split("\n").find((l) => l.includes("scenario bank of 30"));
if (!bankLine) refuse(`${FIXTURES} no longer carries the 30-scenario bank line`);
const SPLIT = [...bankLine.matchAll(/(\d+) (procedure|deviation|integration)/g)].map((m) => ({ n: Number(m[1]), kind: m[2] }));
if (SPLIT.length !== 3) refuse(`parsed ${SPLIT.length} bank classes from ${FIXTURES}, expected three`);
const BANK_TOTAL = SPLIT.reduce((a, s) => a + s.n, 0);
if (BANK_TOTAL !== 30) refuse(`the bank classes sum to ${BANK_TOTAL}, and the line says 30`);

const trapPara = fixText.split("\n").find((l) => l.includes("A family photo on a shelf"));
if (!trapPara) refuse(`${FIXTURES} section 2 traps not found`);
const TRAPS = trapPara.split(" · ").map((s) => s.replace(/\.$/, "").trim());
if (TRAPS.length !== 12) refuse(`parsed ${TRAPS.length} traps, expected 12`);

const abusePara = fixText.split("\n").find((l) => l.includes("wrong-household retrieval"));
if (!abusePara) refuse(`${FIXTURES} section 5 abuse scenarios not found`);
// The last item runs into the paragraph's closing sentence, so each item is cut
// at its first sentence boundary rather than only at the trailing period.
const ABUSE = abusePara.slice(abusePara.indexOf("consumer: ") + "consumer: ".length)
  .split(" · ").map((s) => s.split(". ")[0].replace(/\.$/, "").trim());
if (ABUSE.length !== 11) refuse(`parsed ${ABUSE.length} abuse scenarios, and the paragraph says eleven`);

const eventPara = fixText.split("\n").find((l) => l.includes("scripted event sequence"));
const EVENTS = eventPara.slice(eventPara.indexOf("(", eventPara.indexOf("scripted event sequence")) + 1)
  .split(")")[0].split(", ").map((s) => s.trim());
if (EVENTS.length < 6) refuse(`parsed ${EVENTS.length} scripted event kinds, expected at least six`);

/* ---------- output 1: the two evaluation forms ---------- */
const tierOrder = ["high_consequence", "core", "supporting"];
const human = (s) => s.replace(/_/g, " ");
const blank = "`_____`";

let forms = `---
status: living
---
# Evaluation forms: the two instruments

**Preparation batch item 9**, for the COO. **GENERATED, not transcribed.**
Sources: \`${RUBRIC}\`, \`${MODES}\`.
Re-run \`node tooling/review/training-forms.mjs\` and this file is current by
construction. Do not edit it by hand.

## Read this first: item 9 names one instrument and the sources define two

Item 9 asks to "turn the twelve rubric domains and their anchors into the
evaluation form's actual shape". The adopted sources carry **two instruments
with different units**, and only one of them is called the evaluation form:

| | Form A, the competence rubric | Form B, the scenario evaluation form |
|---|---|---|
| Unit | one HOM, one domain, standing | one scenario run |
| Source | \`rubric_anchors.csv\` (${domains.length} domains, anchors ${ANCHOR_SCORES[0]} to ${ANCHOR_SCORES.at(-1)}) | SPEC_MODE_LOGIC section 4 (${FORM_ITEMS.length} items) |
| Output | a score per domain | ${VERDICTS.join(" / ")} |
| Named in | the promotion thresholds | Q-16 and Q-17 acceptance criteria |

They are not the same form and neither supersedes the other. **Both are
rendered below rather than fused**, because fusing them would decide the join
(which scenario exercises which domain) and that decision is the COO's. The
join is the first blank at the bottom of this page.

Reported rather than reconciled, because it changes what a builder builds:
**Q-17's acceptance criterion says "captured against the five-item evaluation
form"** while item 9 says twelve domains. Whoever builds Q-17 from one sentence
and not the other builds the wrong instrument.

---

## Form A. Competence rubric, per HOM per domain

One row per domain. The evaluator marks a score and cites the evidence; the
anchors are the source's own words and are not to be paraphrased on the form.

**Scale.** The source carries anchors for ${ANCHOR_SCORES.join(", ")} and **no anchor for 1**.
Either the scale starts at ${ANCHOR_SCORES[0]} or a 1 exists unanchored. COO to say which; the
form below prints the anchors that exist and nothing else.

**Threshold, from SPEC_MODE_LOGIC section 2, verbatim:**
> ${promotionLine.replace(/^- /, "")}

**Domain tiers, counted from the source:** ${tierOrder.map((t) => `${byTier[t].length} ${human(t)}`).join(", ")}.
`;

for (const tier of tierOrder) {
  forms += `\n### ${human(tier).replace(/^./, (c) => c.toUpperCase())} domains (${byTier[tier].length})\n`;
  for (const d of byTier[tier]) {
    forms += `\n#### ${d.domain}\n\n| Score | Anchor |\n|---|---|\n`;
    d.anchors.forEach((a, i) => { forms += `| ${ANCHOR_SCORES[i]} | ${a} |\n`; });
    forms += `\n| Score | Evidence (visit, scenario, or observation) | Evaluator | Date |\n|---|---|---|---|\n| ${blank} | ${blank} | ${blank} | ${blank} |\n`;
  }
}

forms += `
---

## Form B. Scenario evaluation, per scenario run

One record per run of one scenario by one trainee, written the day it happens
by the observer who watched (SPEC_MODE_LOGIC section 4).

| Field | Value |
|---|---|
| Scenario id | ${blank} |
| Trainee | ${blank} |
| Observer (not the trainee) | ${blank} |
| Date run | ${blank} |
| Attempt number | ${blank} |

**The ${FORM_ITEMS.length} items, verbatim from the source:**

| Item | Score | Note |
|---|---|---|
${FORM_ITEMS.map((i) => `| ${i} | ${blank} | ${blank} |`).join("\n")}

**Verdict:** ${VERDICTS.map((v) => `${blank} ${v}`).join("  ·  ")}

**Rules carried from the sources, not invented here:**

- Three failed attempts at the same scenario open **a material revision item,
  not a person finding** (SPEC_MODE_LOGIC section 4).
- **Category C (allergen, medical, safety) scenarios carry no partial credit**
  (FIXTURES section 3).
- Mode is never shown to a member; the trainer of record and the second
  observer are distinct users (SPEC_MODE_LOGIC section 5).
- No leaderboard is ever computed from competence, speed, cognitive load or
  process-mining data (SPEC_MODE_LOGIC section 4; CLAUDE.md Ruling 1).

---

## Blanks, all of them the COO's

Each of these is a judgment the sources do not make. None is filled with a
plausible default, because a plausible default on a form reads as a decision
somebody made.

1. **The join between the two forms.** Does a scenario run feed a domain score,
   and if so which scenarios exercise which of the ${domains.length} domains? Until this is
   answered the two instruments are unrelated records of the same person.
2. **What each of Form B's ${FORM_ITEMS.length} items is scored ON.** The source gives the item
   names and the three verdicts and no per-item scale. Numeric like Form A,
   met/not-met, or narrative only.
3. **Whether score 1 exists** on Form A, per the scale note above.
4. **Which failure modes matter**, item 9's own words: the fifth item is called
   "failure modes" and no list of them exists anywhere in the tree.
5. **What else carries no partial credit.** Category C is named. Category G
   (boundaries, fraud, restricted access, welfare) is not named either way, and
   three of Form A's four high-consequence domains are about exactly that.
6. **Who may evaluate.** Form A cites the HOM I threshold and no evaluator
   qualification; Q-16's credential row would be the natural home.
7. **Retake accounting.** Whether a repeat re-scores the same record or writes
   a second one. Q-16 says the cohort record is append-only, which argues for
   a second record, but the form is not the cohort record and the sources do
   not say.
`;

writeFileSync(OUT_FORMS, forms);

/* ---------- output 2: the scenario stub bank ---------- */
const slot = (n, kind, title, source, note) =>
  `\n### S-${String(n).padStart(2, "0")} · ${kind}\n\n` +
  `**Situation:** ${title}\n\n` +
  `| | |\n|---|---|\n` +
  `| Source | ${source} |\n` +
  `| WK-TRN-007 category | ${blank} **COO** |\n` +
  `| Scripted events | ${blank} |\n` +
  `| Expected outcome | ${blank} **COO** |\n` +
  `| No partial credit | ${blank} **COO** |\n` +
  `| Domains exercised (Form A) | ${blank} **COO** |\n` +
  (note ? `\n${note}\n` : "");

let n = 0;
let stubs = `---
status: living
---
# Scenario stub bank

**Preparation batch item 9**, second half. **GENERATED, not transcribed.**
Source: \`${FIXTURES}\` (frozen intake).
Re-run \`node tooling/review/training-forms.mjs\`. Do not edit by hand; fill
the blanks in a copy, or amend the source and regenerate.

## What is blocked, stated before the sheet

Item 9 asks for **thirty stubs from the WK-TRN-007 categories A to G**.
**WK-TRN-007 is not in this repository**, checked four ways rather than by one
search that could not see (the G-106 lesson): no filename anywhere in the tree
matches; \`git grep\` finds the identifier in exactly two tracked files, both of
which cite it rather than being it (this batch item and FIXTURES itself); and
a scan inside every XML part of all ten \`docs/library/*.docx\` returns nothing,
which is where the last supposedly-absent document turned out to be.
Of the seven categories, the tree names **two**:

- **C**, "allergen, medical, safety" (named only because it carries no partial credit)
- **G**, "boundaries, fraud, restricted access, welfare"

**A, B, D, E and F are cited by letter and defined nowhere.** Drafting thirty
stubs indexed to those categories would mean inventing five category
definitions, which is a taxonomy, and choosing a taxonomy is barred. So this
sheet fills every slot the tree can source and leaves the category column
blank on every one of them.

This is the third training document cited and absent, after WK-TRN-009
(G-110, now a founder writing task) and the WK-QA-000 five-dimension review
(G-108). Register entry: G-131.

## The arithmetic, reported not reconciled

The bank is stated as ${BANK_TOTAL}: ${SPLIT.map((s) => `${s.n} ${s.kind}`).join(", ")}. FIXTURES section 5 then
gives **${ABUSE.length} AI abuse and reconciliation scenarios** and calls them the "same bank".
${BANK_TOTAL} leaves no room for ${ABUSE.length} more, so either the ${ABUSE.length} sit inside the ${BANK_TOTAL} (and the
class split does not name them) or the bank is ${BANK_TOTAL + ABUSE.length}. They are listed as an
appendix below rather than being folded into either reading.

## How the slots below were filled

| Class | Slots | Filled from | Filled |
|---|---|---|---|
| deviation | ${SPLIT.find((s) => s.kind === "deviation").n} | the ${TRAPS.length} deliberate traps, FIXTURES section 2 | all |
| integration | ${SPLIT.find((s) => s.kind === "integration").n} | ${EVENTS.length} scripted event kinds, FIXTURES section 3 | none: ${EVENTS.length} candidates for ${SPLIT.find((s) => s.kind === "integration").n} slots |
| procedure | ${SPLIT.find((s) => s.kind === "procedure").n} | nothing in the tree names them | none |

**The deviation mapping is a PROPOSAL, not a derivation.** FIXTURES says the
traps "must exist, must be caught", and a trap is a departure from the expected
sequence, which is what a deviation scenario is. That reading is one line of
reasoning rather than a statement in the source, so the COO confirms or
re-assigns rather than inheriting it.

---

## Deviation scenarios (${SPLIT.find((s) => s.kind === "deviation").n})
`;

for (const t of TRAPS) {
  n++;
  stubs += slot(n, "deviation", t.replace(/^A /, "A ").replace(/^a /, "A "), "FIXTURES section 2, deliberate traps");
}

stubs += `
**Two of the twelve are near neighbours and are kept apart rather than merged:**
S-03 (a vendor asking to change payment details) and S-06 (a payment-change
request). The source lists both, so both are printed; whether they are one
scenario is the COO's call and merging them here would have hidden the
question.

---

## Integration scenarios (${SPLIT.find((s) => s.kind === "integration").n} slots, ${EVENTS.length} candidates, none assigned)

FIXTURES section 3 names ${EVENTS.length} scripted event kinds and the bank has ${SPLIT.find((s) => s.kind === "integration").n} integration
slots. Which ${EVENTS.length - SPLIT.find((s) => s.kind === "integration").n} of the ${EVENTS.length} is not an integration scenario is a judgment the
source does not make, so the slots are printed empty with the candidates
listed rather than being filled ${SPLIT.find((s) => s.kind === "integration").n}-of-${EVENTS.length} by whoever generated this.

**Candidates:** ${EVENTS.join(" · ")}.
`;

for (let i = 0; i < SPLIT.find((s) => s.kind === "integration").n; i++) {
  n++;
  stubs += slot(n, "integration", `${blank} **COO**, from the candidate list above`, "unassigned");
}

stubs += `
---

## Procedure scenarios (${SPLIT.find((s) => s.kind === "procedure").n} slots, all empty)

**Nothing in this repository names twelve procedures for training.** The
candidates that exist, offered as sources rather than as an assignment:

- the close flow's live task list (\`pnpm db:tasks\`), which holds four
  provisional definitions today, not twelve
- the operational task inventory draft (WKT rows, \`TASK_INVENTORY_V1_4_DRAFT.md\`),
  which is 64 rows and awaits the founder's verdicts, so it cannot be sampled
  from yet
- WK-TRN-007's own module list, which is the natural source and is the
  document that is missing

Filling these from any of the three would be choosing the training curriculum,
which is the COO's program.
`;

for (let i = 0; i < SPLIT.find((s) => s.kind === "procedure").n; i++) {
  n++;
  stubs += slot(n, "procedure", `${blank} **COO**, from WK-TRN-007's module list`, "unsourced: WK-TRN-007 absent");
}

if (n !== BANK_TOTAL) refuse(`emitted ${n} slots against a bank of ${BANK_TOTAL}`);

stubs += `
---

## Appendix: the ${ABUSE.length} AI abuse and reconciliation scenarios

Verbatim from FIXTURES section 5, run against every AI behavior version and
against the reconciliation consumer. Each has an expected outcome (proposal,
refusal, handoff or reconciliation status) and **no partial credit**. Numbered
separately from S-01 to S-${String(BANK_TOTAL).padStart(2, "0")} because of the arithmetic question above.

| # | Scenario | Expected outcome |
|---|---|---|
${ABUSE.map((a, i) => `| A-${String(i + 1).padStart(2, "0")} | ${a} | ${blank} **COO** |`).join("\n")}

**Slot count asserted:** ${n} scenario slots and ${ABUSE.length} abuse scenarios, both counted from
the emitted sheet rather than stated by hand.
`;

writeFileSync(OUT_STUBS, stubs);

console.log(`wrote ${OUT_FORMS}: ${domains.length} domains across ${tierOrder.map((t) => `${byTier[t].length} ${t}`).join(", ")}; form B ${FORM_ITEMS.length} items, ${VERDICTS.length} verdicts`);
console.log(`wrote ${OUT_STUBS}: ${n} slots (${SPLIT.map((s) => `${s.n} ${s.kind}`).join(", ")}), ${TRAPS.length} filled from traps, ${ABUSE.length} abuse scenarios appended`);
