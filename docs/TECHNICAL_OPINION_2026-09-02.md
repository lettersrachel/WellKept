---
status: living
---
# Technical opinion: soundness, what breaks under real use, and where the security firm should look first

2 September 2026. Written by the development process about its own work,
which is a bias to weigh; the mitigations are that every claim cites the
record, the negatives are listed with the positives, and one new defect
found while writing this went to the register rather than into a drawer
(G-116).

## The opinion

**The system is built soundly in a specific and unusual way: its
correctness lives in structure rather than in discipline.** Tenant
isolation is composite foreign keys, not query habits. Impossible states
are CHECK constraints proven red before green, not validation code.
"Nothing deletes" is the schema's posture with nine written exceptions.
The audit trail is append-only with the reveal path fail-closed behind
it. The guard suite computes its own inputs, so a new surface joins the
censuses without anyone remembering to add it, and every guard's blind
spot is written down next to it. A reviewer can verify most of the
important properties by reading constraints and running guards, which is
a stronger position than most codebases many times this size.

**The sound part is the data layer and the walls. The unproven part is
everything operational.** The same record that shows the constraints
proven shows: one human operator plus one tester have ever used it; no
client account has signed in; the worker ran a month-old build while
looking healthy and its failures were captured by monitoring nobody
reads (G-115); the restore path for backups has never been drilled; and
no external party has reviewed a line. The honest formulation: **the
system is well-built and barely used, and those are different claims.**
Real use tests the seams between proven parts, and the seams are exactly
where the record is thinnest.

## What breaks under real use, in order of expected pain

1. **Silence nobody is assigned to hear.** G-115 is the proof: a worker
   failing loudly every five minutes for five days, Sentry capturing all
   of it, no one reading. Under real use the same shape recurs as missed
   digests, suppressed sends (G-81's queue, whose "operator reads it" is
   an uncovered assumption), and stalled outbox consumers. The fix is
   not more alerts; it is one named place someone checks daily, or
   alerts that reach a phone.
2. **The outbox drain starves itself (G-114), on a schedule.** Every
   action emits envelope events and one consumer exists; the waiting set
   grows monotonically and the drain window is 100. Real households
   generating real actions will cross that line in weeks, at which point
   field-change processing silently stops while the drain reports
   health. The one-clause fix is written and waits on the A2 ruling;
   under real use it should not wait long.
3. **Typed clock times are shifted by the operator's offset (G-116, new
   with this document).** Durations are right, so every aggregate looks
   right; the stored start and end times of every hand-typed interval
   are wall-clock numbers stored as UTC. Harmless in a demo; not
   harmless in a wage record or the first time a typed interval is
   compared against a real timestamp.
4. **The field surface's household resolution (G-65).** /visit resolves
   to the oldest assignment. Real HOMs hold several households; the
   founder already captured onto the wrong one. The resolution rule is a
   ruled decision waiting to be made, and real use makes it weekly.
5. **The offline queue under real field conditions.** The suite proves
   the invariants (durable copy at every instant, dedupe, dead-letter
   visibility), and roughly two humans have exercised them. iOS
   seven-day storage eviction is held off by a convention (home-screen
   install), not a control; a dead-lettered head still blocks the tail
   by design with visibility as the remedy. Expect the first real HOM
   cohort to find the friction the fixture identities could not.
6. **Free text crossing sensitivity lines.** Four mechanisms check
   labels, shapes, and key sets; none checks CONTENT. A rushed staff
   note typed into a client-visible field reaches the member, and the
   record says plainly that nothing catches this. Real use multiplies
   typists.
7. **Page cost growth on the corporate surfaces.** The fleet board and
   drill-in fan out per-household queries; fine at five households,
   degrading at fifty. Degradation, not loss, and maxDuration already
   hedges it; worth measuring before the fleet grows.
8. **Email as a single thread.** Sign-in, client reports, and digests
   all ride one Resend key and one sender reputation. Deliverability
   failures will read as "the system is broken" to a member.

## Where the security firm should look first, in order

WK-SEC-001 is the scope document and staging the ruled venue; this list
is where the first hours pay best, from the builder's own knowledge of
where the walls are thinnest.

1. **Content-level leakage through permitted keys.** The projection
   guards are strong on shape and will likely hold; the known
   one-layer-down gap is a staff-only fact inside a correctly
   client-visible s1 field. Have them attack with realistic DATA, not
   payloads: seed staff notes the way tired humans write them and read
   the client surfaces.
2. **The auth chain end to end.** Magic-link token lifecycle (expiry,
   reuse, fixation), the TOTP step-up marker on the session row, backup
   codes, sign-out and revocation propagation, and the autofill identity
   confusion G-70 already documented. Also the PROPOSED vendor
   signed-link shape before it ships, since a no-account link is the
   easiest thing in the system to get subtly wrong.
3. **Tenancy under manipulation, per route parameter.** The composite
   FKs make cross-tenant WRITES unrepresentable; test the READS: every
   [householdId] and /context/[id] route, the corporate preview
   surfaces, and the CSV exhibit export endpoint, which is a plain GET
   and should be confirmed to gate like a page and not like an asset.
4. **The vault path.** Audit-before-reveal ordering under concurrency
   and failure injection; KEK handling and the rotation story (a key
   value entered a session transcript in July and was rotated; give them
   that history); whether any code path can reach plaintext without the
   audit row.
5. **The sync API surface.** /api/visit-commands and the discard route:
   forged commands against another household, idempotency-key abuse,
   payload smuggling into the applied-visit path (payload.hours feeds
   economics), and what a malicious client can do to its own queue that
   the server then trusts.
6. **Reflected state and headers.** The recorded/refused/URL params are
   conceded to ride URLs into history and referrers; confirm escaping on
   every banner render, then the usual header, cookie-flag, and CSP
   sweep, none of which has ever been audited.
7. **Rate limiting and abuse cost.** Nothing in the record shows any
   rate limit anywhere. The magic-link sender and the capture endpoints
   are the first places an abuser gets leverage or a bill.
8. **Uploads.** Photo intake (EXIF stripping exists and is tested),
   size and content-type limits, and the retention purge's tombstone
   behavior.
9. **Operational custody.** Env-var spread across four dashboards, the
   Sentry scrubber's actual output on induced errors (the guard asserts
   wiring, not output), and who can deploy what from which personal
   account, which is the custody checklist's territory and an auditor
   will flag it in an hour.

## The one-sentence version

Sound where it was designed, unproven where only reality can prove it,
and the first dollars of outside security attention should go to
content-level leakage, the auth chain, and tenancy reads, in that order.
