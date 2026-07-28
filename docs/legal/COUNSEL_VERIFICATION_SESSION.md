# Session brief: verify the counsel packet's "What exists" claims

> Editorial note: this record's findings are as of its stated date and are
> unchanged. On 2026-07-28 the file was edited for punctuation only, replacing
> em dashes under the repo copy rule (W-13). No claim, figure, verdict, or
> disposition was altered. The pre-sweep text is in git history.

Paste this whole file into Claude Code from `~/dev/wellkept`. It is a read-only
session. Nothing is built, nothing is fixed, nothing is edited.

## Why this session exists

`COUNSEL_PACKET_rev2.md` opens every attachment with a paragraph describing
what the software does today. Those paragraphs are the reason the packet saves
billable time, and they are also assertions an attorney will draft redlines
against. A claim that is wrong, stale, or overstated buys advice about a product
that does not exist, and the error surfaces months later in a document that is
supposed to protect the business.

## Hard rules

1. **Read only.** Do not change code, schema, or the packet. If something is
   wrong, report it. The founder decides what happens next.
2. **No guessing.** If a claim cannot be confirmed from the tree, say so
   explicitly rather than inferring from a plausible-looking file. Unverifiable
   is a valid and useful result.
3. **Quote the evidence.** For each claim, name the file and the line or
   function that supports or contradicts it. A bare verdict is not useful.
4. **Do not echo secrets.** Never print `DATABASE_URL`, `WK_KMS_KEY`,
   `AUTH_SECRET`, or the contents of `.neon-connection`.
5. **Do not run the erasure tool with `--commit`.** If you run it at all, dry
   run only, and only against the smoke fixture.
6. **Stay in scope.** If you notice an unrelated defect, note it at the end
   under "observed but out of scope" and keep going.

## Claims to verify

Work through these in order. For each, report CONFIRMED, WRONG, OVERSTATED, or
UNVERIFIABLE, with the evidence.

**From section 2, the erasure tool** (`apps/web/scripts/erase-household.mjs`):

1. It deletes vault rows and their per-record wrapped keys.
2. It blanks free text across the record.
3. It purges photo image bytes.
4. It preserves the audit trail by default, and detail payloads can optionally
   be scrubbed.
5. It preserves incident records by default, erasable by an explicit flag.
6. It refuses to run while the household has an open incident.
7. Corporate photo holds are honoured by default and overridden only by an
   explicit flag.
8. Refusals and overrides are written to the audit trail.
9. Dry run is the default and committing requires an explicit flag.
10. The master key persists in the application environment after an erasure.
    Confirm that nothing in the tool rotates or destroys it.

**From section 3, recovery:** the packet claims a point-in-time restore within
the retention window can reconstitute deleted vault rows, readable because the
master key is still live. Confirm this is a correct description of the
architecture rather than a guess. If the vault's per-record keys are themselves
derived rather than stored, say so, because that would change the answer.

**From section 4, photo retention:** default 90 days, configurable, floor of 7,
tombstone survives the image bytes, holds exempt photos tied to an open
incident. Check both the `app_setting` shape and the job that reads it, and
confirm the floor is enforced rather than documented.

**From section 5, the purge schedule:** confirm the purge is genuinely
scheduled and unattended rather than manually triggered, and identify what would
stop it. The packet asks counsel whether the hold-override should be removed, so
report how hard removal would be: a flag, or something load-bearing.

**From section 6, consent:** the household record carries that consent was
signed, when, and which document version. Confirm that only signed and never
signed are expressible, and that there is no withdrawal state hiding somewhere.

**From section 8, subprocessors:** confirm the five named vendors are the
complete set that touches household data. Vercel, Neon, Upstash, Railway,
Resend. Check for anything else in the dependency and deployment configuration
that receives data, including error monitoring, analytics, and anything added
recently. A missing sixth vendor is the most likely error in this packet.

**From the context section, refused categories:** the packet tells counsel the
software refuses to hold government identifiers, payment card and bank numbers,
and health records. Determine whether this is enforced anywhere or is a policy
statement about intent. Both are acceptable answers, but the packet's wording
should match which one is true, so be precise.

**From the context section, sensitive tier handling:** encrypted at rest with a
separate key, revealed only to assigned staff in a session that has cleared a
second factor, and every reveal logged before the value is released. Confirm the
ordering in particular: the audit row must be written before the value leaves
the server.

## What to report

1. A table: claim, verdict, evidence.
2. Every WRONG or OVERSTATED claim, with suggested corrected wording. Wording
   suggestions only; do not edit the packet.
3. Anything the software does with household data that the packet does not
   mention at all. This is the highest-value finding available in this session,
   because an undisclosed data flow is worse than an inaccurate description of a
   disclosed one.
4. Observed but out of scope.

Then stop.
