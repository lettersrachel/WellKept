---
status: living
---
# Round four: Claude Code sessions

Prepared 28 July 2026, from the review of `WK_SEVEN_ITEM_READOUT_20260728.md`.

Paste one session at a time. Standing rules live in `CLAUDE.md` and load
automatically; do not restate them in a session prompt.

Five sessions. One read-only, three builds, one gated on a founder decision.
Session A first: it questions the correctness of something already shipped.

---

## Session A. Does W-9's object collapse still work after the rewordings?

**Read-only.**

W-9 counts distinct objects by collapsing each item text's varying date, on the
stated premise that the sweep's texts are templates where only the occurrence
date changes per cycle. Item 6 rewrote those templates, and in at least the
maintenance prompt the date moved position. Nobody has verified the collapse
still finds it.

If it does not, the object count silently overcounts, and that number exists
precisely to make `informativeRateFloor`'s calibration input readable. Pre-pilot
the data is fixture-only, so the harm is small and the window to check is now.

**Answer, with evidence:**

1. How does the collapse identify the varying date? Quote the mechanism.
2. Run it against each reworded template. Does it still normalise to a stable
   key per object? Name any that no longer collapse.
3. Reworded texts produce new deterministic sweep ids. Any outcomes recorded
   against the old ids still exist. Does `ruleHealthByRule` compute cleanly
   across that boundary, or do old outcomes orphan and silently drop out of the
   denominator?
4. Is "radar" a rendered string anywhere, or only an internal family name?
   Internal vocabulary leaking into user-facing text is the same class as the
   `T-3:` prefix item 6 removed, and a House Manager reading "occasion radar"
   is reading the architecture rather than their day.

Report only. If the collapse is broken, the fix deserves its own session.

---

## Session B. Make "frozen" enforced rather than asserted

Four historical records are described as frozen. What exists is an allowlist
excluding two of them from a style guard. Nothing prevents a claim inside any of
the four from being edited.

These are the evidentiary base for the audit-invariant verdict and the legal
drift findings. A property named without a guard behind it is the one pattern
this whole process was built to catch.

**Build:** a content hash per frozen record, stored in a manifest, asserted in
CI. Any change to a frozen file fails until its hash is deliberately updated in
the manifest, which is a reviewed edit and therefore the escape hatch, the same
structural hatch `guards-manifest` already uses for itself.

**Prove it red before trusting it green:** change one character in a frozen
record, expect a failure naming the file. Restore, expect green.

**Scope note:** the four are the two annotated verification records and the two
post-deploy findings files. Confirm that is the complete set of dated
evidentiary records before writing the manifest, since the readout named two
different pairs in two different contexts.

---

## Session C. `tooling/deploy.sh`

Three deploy-adjacent sharp edges in two days, all under time pressure, all in a
ritual that depends on a person reading a checklist correctly at night. Every
other rule of this class has been converted from policy to guard. This is the
last one running on attention.

**The argument for scripting, stated so it stays true:** `--yes` is dangerous
today because it suppresses the only confirmation. It becomes safe when the
checks that confirmation would have caught run first and refuse. The script is
not automation for speed; it is the gate.

**Sequence:**

1. Take the expected main sha as a required argument. Refuse if `HEAD` differs.
2. `cd` to the repo root explicitly, in its own invocation. Never chained after
   another `cd`. This is the specific failure that produced the stray project.
3. Migrate.
4. Assert the migration count agrees three ways: database, journal, disk.
5. Deploy.
6. Verify the deployment landed on the expected project, by name or id, not only
   that a deployment succeeded. This is the failure that just occurred and a
   script would otherwise inherit it unchanged.
7. Read `/api/build-id` three times, expect agreement with the deployed sha.
8. Run `tooling/smoke-mechanical.sh`.

**Fail closed at every step.** Refuse and exit non-zero on any mismatch; never
proceed and report. Same posture as the audit invariant, and for the same
reason.

**Out of scope:** the eleven checklist items that need a person reading a
screen. The script covers the mechanical sequence and hands off.

**Prove it refuses**, three ways, before it is trusted: a wrong sha, a migration
count mismatch, and an unexpected project. A deploy script that is wrong is more
dangerous than a ritual, because people stop watching.

---

## Session D. `concerns_minor` on definitional playbook fields

**Gated on the founder's field list.** Do not choose the fields.

CHILD_DATA.md poses this as one question. It is two, and they have different
answers.

**Fields that concern a minor by definition** (a child's name, school, schedule,
sizes, the Section 3 material) are classifiable once at the field-definition
level. There is no capture-time decision because the classification is a
property of the field, not of what someone types into it, so the intake friction
priced in the document does not apply to this set.

**Free-text surfaces** (dots, visit reports, incident notes) genuinely cannot be
classified structurally. Policy plus payload guard is the honest floor and
CHILD_DATA.md is right to say so.

**Build the marker for the first set. Keep policy for the second.**

**Sequencing matters:** after intake, this is reclassifying live records instead
of defining a schema.

**The operational reason, which is concrete:** if counsel's §6(g) answer
requires distinct handling, you need to enumerate children's data on demand.
Policy cannot answer that query. A marker answers it for the definitional set
and narrows human review of free text to known households and surfaces, which is
the difference between a bounded task and an open-ended one.

**Scope:** the marker on field definitions, a query that answers what children's
data is held for a given household, CHILD_DATA.md updated to record the split
rather than the single question, and standing rule 7 (notice plus README) in the
same PR.

**Out of scope:** any marker on free-text surfaces, and any attempt to infer
minor-related content from prose.

---

## Session E. The seasonal voice pass

**Gate: after the seasonal prompts can actually fire, per the original
instruction.** Recorded here so it is not lost.

Item 6's four fixes share a signature: a jargon prefix (`T-3:`), a
nominalization ("Transition ahead"), a passive construction ("has elapsed"), and
an internal citation (`(REQ-042)`). Four of the most reliable tells of
machine-written copy, all in one small set, which suggests they are systemic
rather than local.

Apply that signature to the seasonal texts. Read them as rendered, as a set, not
in source.

---

## After these

The no-gate software queue is empty again. W-5 through W-8 and the brief table
await their gates, and every one of those gates is a household, a hire, or
counsel.
