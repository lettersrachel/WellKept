---
status: living
---
# The security-test handoff package

**Preparation batch item 4, 4 September 2026.** What WK-SEC-001's scope implies
an assessor will want, assembled now so an assessor can be engaged the week the
entity exists rather than prepared for two weeks after.

**This document is an INDEX and a RECONCILIATION, not a copy.** Everything it
points at already exists in the repository; duplicating any of it would create a
second source of truth that goes stale, which is the failure this repository
names most often. What it adds is the part that does not exist anywhere yet:
**a statement of where WK-SEC-001's scope and this codebase describe different
systems**, which is section 2 and is the reason to read this before engaging
anybody.

---

## 1. The gating question, and who answers it

WK-SEC-001's own framing: *"is this system safe to hold real household data?"*
White-box, source access at a paused commit, staging with synthetic data only.
Its threat model in one sentence: **"the attacker who matters most is anyone
trying to learn about a household, including a curious insider."**

**Two things follow that an assessor should be told at the outset.**

- **The venue does not exist yet.** ADR-007 makes staging the audit's only
  venue, and staging is not stood up. The engagement can be arranged before
  that; the audit cannot run.
- **Nothing real is at risk during the test, and that is deliberate.** No real
  household data exists in the system. Household Zero forbids it before this
  audit passes, so the audit runs against synthetic fixtures by rule rather than
  by convenience.

---

## 2. WHERE THE SCOPE AND THE CODEBASE DESCRIBE DIFFERENT SYSTEMS

**Read this section before engaging an assessor.** The scope was written 5
August 2026 and describes several components this tree does not contain. An
assessor working from it unamended would spend budget hunting things that are
not there, and would not be pointed at the places where the real risk sits.

**Every line below was verified against the tree today, not inferred.**

| WK-SEC-001 says | The tree holds | Consequence for the engagement |
|---|---|---|
| "S3 object storage via presigned URLs" | **No object storage at all.** Photo bytes live in `visit_photo.data`, a `text` column, base64 in the database. No AWS SDK, no S3 client, no presigned URL anywhere | **Test area 2 is largely untestable as written.** Link scope, expiry enforcement and upload-path abuse are properties of a layer that does not exist |
| "three member web portals" | **One member surface**, and the client side is frozen at the digest under WK-DEV-007 | Test area 3's member-to-member boundary has one surface to test, not three |
| "ephemeral-capture mode VERIFIED TO DESTROY at the storage layer" | **No ephemeral-capture mode.** And the storage-layer question was answered on 5 September by G-128: erasure is complete logically and the bytes persist in the table's heap until the relation is rewritten | The scope asked exactly the right question. **The answer is already known and is not the comfortable one**, and an assessor should be handed G-128 rather than rediscovering it |
| "the restricted-access class (do-not-admit, child-pickup, welfare notes) enforced server-side" | **Does not exist.** Verified by searching the schema and source: the phrases appear only in demo fill data and in the decline-class taxonomy, a different question | **Test area 3's most important clause has nothing to test.** Queue row Q-11r opens it; the threat model names it as the single change that moves the most scenarios |
| "Consents are switches arming capabilities... photo-processing consent off means the processing path refuses" | Three consent columns on `household`: `consent_signed_at`, `consent_doc_version`, `consent_recorded_by`. **They record that consent was given. They arm nothing** | **Test area 4 has no mechanism to test.** This is a genuine gap and not a scope error, and it should be reported as a finding rather than skipped as absent |
| "Clearance mode means retention is actually shortened" | **No clearance mode** | Same |
| "prompt-injection and data-exfiltration through the photo-processing pipeline... AI-vendor retention" | **No AI pipeline and no AI vendor.** Nothing processes a photo beyond a JPEG magic-byte check and an EXIF strip | Test area 7's AI seam is not applicable today. **The standing law that governs it when it exists is already written** (external content is data, never instruction) and should be handed over as the design constraint |
| "fictional Beaumont-Ashford data" | **No such fixture.** The tree holds Fernbrook Demo, the Smoke Test Fixture, the Trainor training household, HO Twin, Household Green and a Shadow Test row | Trivial, and worth correcting so the assessor does not think a seed is missing |
| "WK-SOP-019 Technology, Photo and Data Security" in the provided list | **Not in this repository** (confirmed by the four-method library census, G-107) | The assessor is meant to test claims against the company's own commitments. **Without this document that comparison cannot be made**, and it is founder-side to supply |

**The honest summary of this table: three of the eight test areas are
substantially about components that do not exist**, and two of those (the
restricted-access class, consent-as-enforcement) are absences that are
themselves the finding. **FOUNDER RULING, 5 September 2026: the scope is AMENDED, not supplemented.** A
scope that describes a different system is worse than none, because an assessor
will follow it, and a correction sheet stapled to v1.0 preserves the risk. The
amended scope is `docs/library/WK-SEC-001_v1_1_AMENDED_SCOPE.md`: the complete
document an assessor receives, carrying the corrected description, the
attack-this-instead ordering, and **the three absences kept as STATED FINDINGS
rather than deleted, so it stays visible they were considered.** G-128 travels
in this package rather than being left for rediscovery. **No assessor is
engaged against v1.0.** The table above stays as the reconciliation that produced
the amendment. Register entry G-130.

**One methodological note, because it nearly went the other way.** A search for
`S3` in this codebase returns many hits, and every one is the **sensitivity tier
`s3`**, not Amazon S3. A confident "object storage confirmed present" was one
grep away. That is G-129's class (a search matching the wrong unit) and it was
avoided only by reading the hits rather than counting them.

---

## 3. What the assessor gets, by their own "Provided to the engineer" list

| The scope asks for | Status | Where |
|---|---|---|
| Full source at a paused commit | **READY.** Git, tagged at whatever commit the engagement pauses | this repository |
| Staging seeded with synthetic households only | **NOT READY.** Six-step standup, founder-side, contractor-held accounts per the 28 August ruling | `STAGING_RUNBOOK.md` |
| Database schema | **READY**, and better than a dump: 67 migrations with per-column producer notes in their headers | `packages/schema/drizzle/` |
| The WK-APP specification series | **PARTIAL.** The library slice holds ten `.docx`; the series is not complete here | `docs/library/`, census at `LIBRARY_SLICE_CENSUS_2026-08-28.md` |
| WK-SOP-019 | **ABSENT.** Founder-side to supply | not in the tree |
| This scope | **READY** | `docs/library/WK-SEC-001_...docx` |

---

## 4. The system description, assembled by pointer

Nothing here is new prose. Each row is what an assessor asks for and where it
already lives.

| What they will ask for | Where it is |
|---|---|
| Architecture and stack | `CLAUDE.md` (pinned stack), the monorepo layout, `ADR-004` for the boundary with QuickBooks and Jobber |
| Data-flow map of household data | `SYSTEM_OF_RECORD_MAP.md` (the D1 documentation) |
| The permission model | `packages/permissions`, six roles, per-identity per-household assignment with a one-role unique index, sensitivity as the second axis |
| The vault design | `packages/vault` (AES-256-GCM envelope, per-household data key wrapped by the KEK), `apps/web/src/lib/vault.ts` for storage, and **the audit invariant: the audit row is written before the value is decrypted, fail-closed** |
| Erasure design and treatments | `apps/web/scripts/erase-household.mjs`, whose header states a treatment per table with its reason, plus ten documented DELETE exceptions |
| **Erasure PROVEN, not designed** | `DELETION_AND_PORTABILITY_PROOF_2026-09-05.md`: the tool executed under founder authorization, with what passed, what is unproven, and G-128 |
| The guard inventory | `CLAUDE.md`'s guard table, asserted against `guards-manifest.test.ts` so it cannot silently go stale. **The count is the manifest's to state, deliberately not written here** |
| Privacy posture and what a member would be surprised by | `PRIVACY_SELF_ASSESSMENT_2026-09-05.md` |
| Data minimization, provable from the schema | `DATA_MINIMIZATION_2026-09-05.md` |
| The household threat model | `THREAT_MODEL_HOUSEHOLD_2026-09-05.md` |
| Known defects and their history | `GAP_REGISTER.md` |

**On handing over the gap register.** It is 129 entries of defects found, many
of them self-inflicted and recorded in detail. **Hand it over anyway.** An
assessor who reads it learns more about how this system is built than any
architecture document conveys, and a company that hides its defect log from its
own auditor is buying a weaker audit. It also pre-empts several findings, which
shortens the engagement.

---

## 5. What to tell the assessor to attack, which is not what the scope emphasises

The scope's weight is on the photo layer and the AI seam, and neither exists.
**Where the actual risk sits, from the tree:**

1. **Tenant isolation is the existential one and the scope is right about it.**
   It is enforced structurally: composite foreign keys on `(household_id, id)`
   make a cross-tenant reference unrepresentable rather than merely refused.
   **Attack that claim.** Every such constraint was proven refusing in SQL when
   it shipped, and a systematic attempt through the query layer is exactly the
   test that is worth paying for.
2. **The `playbook_field.value` free-text column.** Sensitivity is a property of
   the ROW, so a staff-only fact typed into a client-visible `s1` field reaches
   the member and **nothing in this system catches it**. Named in the guard
   table's own not-covered column. An assessor cannot fix it and should assess
   whether the surrounding controls make it tolerable.
3. **The operator with the connection string.** Every access control is enforced
   by the application; the database sits behind it, with no row-level security,
   no query logging and no separate audit of operator access. The vault covers
   `s3` and nothing covers `s1` and `s2` against a direct query.
4. **Session and device.** Database-backed sessions with real revocation, and
   **no idle timeout, no re-authentication on sensitive reads, no device
   binding**, so a stolen HOM phone stays valid until a human acts.
5. **Detection.** The alerting posture is deliberately none until someone is on
   call, and it says so on its own surface. Several threat scenarios end at
   "until somebody notices". An assessor should rate that as the standing
   condition it is, not as an oversight.
6. **The member surface has one factor.** Sign-in is a link or code to an email
   address; the staff second factor does not apply to clients, by design.

---

## 6. Test area 5, the four named debt items

The scope names four and asks for each to be fixed or risk-rated. **Their
current state is not established**, and writing four guesses here would be worse
than the blank, so each carries what is known and what is not.

| Debt item | What is known today |
|---|---|
| The `visit_photo` schema inconsistency | **The inconsistency is not identified in the tree by that name.** What is known: bytes are base64 text in the database, `bytes` is a separate integer column that survives the purge as the tombstone's count, and there is no room or scope on a photo. Whether one of those is the referenced inconsistency is unverified |
| The Fernbrook field-mapping bug, treated as a potential isolation failure until proven cosmetic | **Unverified against the tree.** The G-113 work corrected several Fernbrook display and seed defects, all cosmetic or seed-side, none an isolation failure. Whether any is the referenced bug is not established |
| The undocumented PWA layer's on-device caching on shared devices | **Real and live.** The offline queue is IndexedDB per origin, shared by every tab, and the home-screen-install rule exists because of iOS storage eviction. Shared-device caching is a genuine open question |
| Dependency version drift, full CVE audit and lockfile discipline | **Partially known.** The honest advisory count is eight; one attempted override (`@opentelemetry/core` >= 2.8.0) broke the build and was reverted, which is recorded rather than hidden |

**Establishing these four properly is its own session** and is named here rather
than half-done, per E1_READINESS condition 2.

---

## 7. What this package does not contain, said plainly

- **A penetration test.** Nothing here substitutes for the engagement.
- **A claim that the system passes.** The gating question is the assessor's to
  answer and this document does not pre-empt it.
- **A complete WK-APP series or WK-SOP-019.** Both founder-side.
- **A staging environment.** The single largest blocker, and six steps.
