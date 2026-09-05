---
status: living
---
# WK-SEC-001 v1.1 | Application Security Audit, Scope and Statement of Work

**Well Kept Home Operations Management LLC.** Issued 5 August 2026 per register
ruling A231. **AMENDED 5 September 2026 (founder ruling) and this is version
1.1: the complete scope an assessor receives, not an errata sheet beside v1.0.**

White-box application security audit gating Phase 0: no member data enters the
system before clearance.

---

## Amendment note, v1.0 to v1.1

**Why this document was amended rather than supplemented.** v1.0 described
components this system does not contain. **A scope that describes a different
system is worse than no scope, because an assessor will follow it**: budget goes
to hunting things that are not there, and the places where risk actually sits
are never named. Handing over v1.0 plus a correction sheet would have preserved
that risk, because the two would be read in the order they were stapled.

**What changed**, each verified against the codebase on 5 September 2026 rather
than inferred:

| v1.0 said | Corrected in v1.1 |
|---|---|
| S3 object storage via presigned URLs | No object storage exists. Photo bytes are base64 in a `text` column |
| Three member web portals | One member surface, frozen at the digest |
| Restricted-access class enforced server-side | Does not exist. **Kept as a stated finding**, not deleted |
| Consents as switches arming capabilities | Consent is recorded and arms nothing. **Kept as a stated finding** |
| Prompt-injection through a photo-processing pipeline | No AI pipeline and no AI vendor. **Kept as a stated finding** |
| Fictional Beaumont-Ashford fixture data | The fixtures are Fernbrook Demo, the Smoke Test Fixture and the Trainor training household |

**The three absences are kept as stated findings rather than removed**, on the
founder's instruction and for a specific reason: **deleting them would make it
invisible that they were considered.** An assessor reading v1.1 should be able
to see that consent enforcement and the restricted-access class were scoped, are
absent, and are absent as a matter of record rather than of oversight.

**A methodological note that belongs in the scope itself**, because an assessor
will hit the same trap: searching this codebase for `S3` returns many hits and
**every one is the sensitivity tier `s3`**, not Amazon S3. A confident "object
storage present" is one grep away. Read the hits.

---

## Engagement frame

White-box application security audit of a multi-tenant household-operations
platform: a Next.js and TypeScript monorepo, Drizzle-managed multi-tenant
Postgres, **photo bytes stored base64 in the database with no object storage
layer**, **one member web surface currently frozen at a weekly digest**, a
native Household Operations Manager mobile app with an undocumented PWA layer,
and corporate screens. Source access at a paused commit; **staging with
synthetic data only, and staging is the audit's only venue under ADR-007.**

**The finding that gates everything: is this system safe to hold real household
data?**

**Nothing real is at risk during the test.** No real household data exists in
the system, and none may enter before this audit passes.

## Threat model, one sentence

**The attacker who matters most is anyone trying to learn about a household,
including a curious insider.** Unchanged from v1.0 and correct.

---

## Test area 1, tenant isolation (existential)

Attack the walls between household tenants through every API route, query path
and join. Verify isolation is enforced systematically at the query layer, not
per-endpoint by habit. Attempt cross-tenant reads as household A reaching
household B. **A single cross-household leak is not a bug in this business; it
is the end of the trust the company sells.**

**v1.1 addition, so the claim is attacked rather than accepted.** Isolation is
asserted to be structural: composite foreign keys on `(household_id, id)` are
intended to make a cross-tenant reference *unrepresentable* rather than merely
refused. Each was proven refusing in SQL when it shipped. **That claim is the
thing to break.** This is the highest-value area in the engagement.

## Test area 2, the photo layer

**AMENDED. v1.0 specified a presigned-URL layer that does not exist.** There is
no object storage, no presigned URL and no AWS SDK. Photos are base64 text in
`visit_photo.data`, written through an authenticated upload route that checks
JPEG magic bytes and strips EXIF.

**What to test instead:** the upload route's authentication and tenant scoping;
whether a photo can be read across households; the EXIF strip's completeness;
and the absence of any per-room or per-scope restriction on a photo, which is a
known structural limit rather than a defect to find.

**Ephemeral capture verified to destroy AT THE STORAGE LAYER, not just the
database row.** v1.0 asked exactly the right question and **the answer is
already established**: see G-128, handed over with this scope. Erasure is
complete and immediate at the application layer and in the logical database, and
the bytes persist in the table's heap until the relation is rewritten; a plain
`VACUUM` does not clear them. **Do not spend engagement time rediscovering
this.** Assess whether the stated posture is adequate and whether the
member-facing description of it is accurate.

## Test area 3, authentication and authorization across the surfaces

Member surface, HOM mobile app, corporate. Test role boundaries hard: a HOM
token reaching corporate functions; a member session reaching another member of
the same household beyond record-sharing consent.

**The restricted-access class (do-not-admit, child-pickup, welfare notes) DOES
NOT EXIST and is retained here as a stated finding.** v1.0 scoped it as
"enforced server-side with visit-sheet-only visibility and access logging, not
as UI courtesy an API call walks around". No such mechanism is in the codebase;
such a fact today is an ordinary playbook field governed by sensitivity like any
other, and if it is client-visible it is visible to every client identity on the
household. **Report it as an absence with its consequences, not as untestable.**

**v1.1 additions worth the assessor's time:** database-backed sessions with real
revocation, **and no idle timeout, no re-authentication on sensitive reads and
no device binding**; and the member surface having a single factor by design,
since the staff second factor does not apply to clients.

## Test area 4, consent as enforcement

**RETAINED AS A STATED FINDING. The mechanism does not exist.** v1.0 required
that consents be switches arming capabilities, verified server-side: photo
processing off means the path refuses; clearance mode means retention is
actually shortened; portable export is scoped to the requesting household only.

**What exists:** three columns on `household` recording that consent was signed,
its document version and who recorded it. **They record a fact and arm
nothing.** There is no clearance mode. The portable export exists as a corporate
CLI with scope required and no default, not as a member-invocable path.

**This is a genuine gap and should be reported as a finding**, not skipped as
out of scope.

## Test area 5, known technical debt, fixed or risk-rated

The four named items stand. **Their current state is NOT established in the
codebase, and v1.1 says so rather than guessing:**

- **The `visit_photo` schema inconsistency.** Not identified in the tree by that
  name. What is known: bytes are base64 text, `bytes` is a separate integer that
  survives the purge as the tombstone's count, and a photo carries no room or
  scope.
- **The Fernbrook field-mapping bug**, treated as a potential isolation failure
  until proven cosmetic. Unverified. Several Fernbrook display and seed defects
  were corrected in G-113, all cosmetic or seed-side; whether any is this one is
  not established.
- **The undocumented PWA layer's on-device caching on shared devices.** Real and
  live: the offline queue is IndexedDB per origin, shared by every tab.
- **Dependency version drift, full CVE audit and lockfile discipline.**
  Partially known: the honest advisory count is eight, and one attempted
  override broke the build and was reverted.

## Test area 6, the mobile device story

At-rest encryption on HOM devices; session lifetime and remote revocation as a
working kill switch for HOM offboarding; MDM compatibility for cleared-household
variants. **Unchanged, and note that revocation is genuinely implemented and
audited while the surrounding offboarding sequence is a human checklist that
does not exist as a document.**

## Test area 7, OWASP classics

Standard OWASP coverage across the API.

**The AI seam is RETAINED AS A STATED FINDING and is not testable today.** v1.0
required prompt-injection and data-exfiltration testing through the
photo-processing pipeline, and confirmation that AI-vendor retention aligns with
the ephemeral promise. **There is no AI pipeline and no AI vendor.** Nothing
processes a photo beyond a magic-byte check and an EXIF strip.

**The governing law is already adopted and should be assessed as a design
constraint rather than as code:** external content is data, never instruction,
and enters only through a capture pipeline ending in human confirmation. No
external content writes canonical truth or authority.

## Test area 8, infrastructure and secrets

Database network exposure, secrets handling in repository and deploy pipeline,
backup encryption, and tamper-evident audit logs. **Bucket policies are not
applicable**, there being no bucket.

**v1.1 addition, and it is the one an assessor asks about first:** every access
control in this system is enforced by the application, and the database sits
behind it. There is no row-level security, no query logging and no separate
audit of operator access. The vault covers `s3` values; nothing covers `s1` and
`s2` against a direct query with the connection string. **Assess whether the
custody controls around that string are proportionate**, since they are the
control.

---

## Attack this, in priority order

Added in v1.1 because v1.0's emphasis fell on two areas that do not exist, and
an assessor deserves to be told where the risk actually is.

1. **Tenant isolation**, and specifically the structural claim above.
2. **`playbook_field.value`.** Sensitivity is a property of the ROW, so a
   staff-only fact typed into a client-visible `s1` field reaches the member and
   **nothing in this system catches it.** Assess whether the surrounding
   controls make that tolerable.
3. **The operator with the connection string**, per test area 8.
4. **Session and device**, per test area 3.
5. **Detection.** The alerting posture is deliberately none until someone is on
   call, and the surface says so. Several threat scenarios end at "until
   somebody notices". Rate it as the standing condition it is.
6. **The member surface's single factor.**

---

## Provided to the engineer

Full source at the paused commit. Staging seeded with synthetic households only
(**Fernbrook Demo, the Smoke Test Fixture and the Trainor training household; no
real household data exists in the system**). The database schema, as 67
migrations whose headers name a producer per column. The WK-APP specification
series. **WK-SOP-019 Technology, Photo and Data Security**, so claims are tested
against the company's own commitments. This scope, v1.1.

**And, added in v1.1 and handed over deliberately:**

- **`GAP_REGISTER.md`**, the complete defect log, including defects found by the
  company against itself. A company that hides its defect log from its own
  auditor is buying a weaker audit.
- **`DELETION_AND_PORTABILITY_PROOF_2026-09-05.md`**, including **G-128**, so
  test area 2's storage-layer question starts from what is known.
- The privacy self-assessment, the data-minimization page and the household
  threat model.

## Deliverables

Severity-ranked findings with reproduction steps. Retest of fixes included in
this engagement. A written data-flow map of household data as observed. Explicit
pass or fail against the gating question. A letter of engagement completion
suitable for a lender file and a cyber-insurance application.

## Pass criteria, defined in advance

Zero unresolved critical or high findings touching tenant isolation,
authentication and authorization, the photo layer, or the restricted-access
class. The four named debt items fixed or formally risk-accepted with rationale.
Retest confirming closure. **Then, and only then, the paper-first fence lifts.**

**One clarification v1.1 adds to the pass criteria, because it would otherwise
be ambiguous:** the restricted-access class does not exist, so "zero unresolved
critical or high findings touching it" cannot be satisfied by testing. Whether
its ABSENCE is itself a blocking finding is a founder decision, and it is named
here rather than resolved, so the pass or fail is not decided by an assessor's
reading of a clause about a component that was never built.

---

## Control note

**The operating library is the system of record** (WK-SOP-000, WK-SOP-029). This
v1.1 lands on the repository mirror first, which is the established pattern when
an amendment is authored here (see `DOCUMENT_AUTHORITY_2026-08-28.md`: a mirror
can be more current than its source when the amendment lands on the mirror
first). **The founder transfers v1.1 into the controlled library copy**, and the
`.docx` at `docs/library/WK-SEC-001_Application_Security_Audit_Scope.docx`
remains v1.0 until she does. **No assessor is engaged against v1.0.**
