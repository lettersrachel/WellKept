# Spec audit — build vs WK-DEV-001 requirements

Date: 2026-07-18. Audited against the full handoff package (01_Read_First
… 04_Governance). Status: **built+verified** / **partial** / **not built**.
P0s not built are the honest launch-blocking list.
Table rows updated 2026-07-25 against the code as it stands (receipts = commit hashes).

## A. Platform, auth & tenancy
| REQ | P | Status |
|---|---|---|
| 001 multi-tenant, household-scoped | P0 | **built+verified** (fleet board + per-household drill-in; second household onboarded through the importer, 381d7cf); scaled console for 150 still open (see 075) |
| 002 six roles, per-household | P0 | **built+verified** (household_role_assignment, unique per user×household) |
| 003 staff email+password+TOTP; magic link for clients | P0 | **BUILT (variant)** — staff clear a TOTP second factor on top of the magic link (no password); corporate session revocation + admin TOTP reset shipped. The magic-link-not-password reading is recorded in ADR-003 |
| 004 server-side matrix, no s2/s3 in client payload | P0 | **built+verified** (100%-gated core; live scans; CI) |
| 005 full audit log | P0 | built for s3 reads + field writes + tag changes; ordinary field *reads* not audited (spec says every s3 read + every write — compliant) |
| 006 NDA mode | P1 | partial: ndaMode in core + reveal path; media-reuse flags not built |

## B. Playbook data model
| REQ | P | Status |
|---|---|---|
| 010 household record | P0 | built |
| 011 24 fixed sections, N/A-confirmed first-class | P0 | built (canonical SECTION_NAMES now in schema); nothing enforces non-renumbering beyond convention |
| 012 field record shape | P0 | built (photoRefs unused so far) |
| 013 s3 vault, envelope-encrypted | P0 | **built+verified** (83c12b8: AES-256-GCM envelope, per-household wrapped keys, zero plaintext in pg_dump). LocalKms/env KEK for pilot; managed KMS swap is a documented re-wrap. ADR-001: real s3 stays out until the security review |
| 014 registries as structured sub-tables | P0 | **built+verified** (08b655f: ADR-002 single registry_entry table x 7 kinds, per-kind zod, key_date drives the sweep; client + corporate cards) |
| 015 human-readable change timeline | P0 | **built+verified** (8c2c93e: humanized Section-24 change log on the corporate drill-in) |
| 016 workbook import + dry run | P1 | **built+verified** (wk_import.py) |
| 017 branded client export | P1 | **built+verified** (tooling/export; payload-gated; internal S1+S2 binder variant not built) |

## C. Client portal
| REQ | P | Status |
|---|---|---|
| 020 read-mostly branded s1 view + search | P0 | **built+verified** (server-side search within the client's filtered view, 381d7cf; payload guards run live in the page) |
| 021 visit report feed | P0 | built (latest report; feed/history view thin) |
| 022 self-service updates via review queue | P0 | **built+verified** — review queue + the spec's allowlist (lib/client-allowlist) enforced in proposeEdit |
| 023 quarterly review artifacts | P1 | not built |
| 024 data stewardship view | P2 | **built+verified** (feb76f0: what-we-hold-for-you card — categories, counts, vault count, last access; counts only, never values) |

## D. HM portal
| REQ | P | Status |
|---|---|---|
| 030 briefing (flags→deltas→specials→radar→dots→gesture→proposal) | P0 | **built+verified** complete (deltas-since-last-visit + today's specials landed 8c2c93e); provisions render beneath bound fields (Addendum A1 T4) |
| 031 enforced close flow | P0 | **built+verified** (state machine; airplane-tested) |
| 032 offline-first, LWW + conflict to corporate | P0 | **built+verified** (IndexedDB/AsyncStorage + SW shell; conflicts surfaced) |
| 033 stranger mode | P0 | **built+verified** (8c2c93e: backup_hm gets the amplified first-visit briefing; friction logs to stranger_test and routes to corporate) |
| 034 in-context s3 reveal | P0 | **built+verified** end-to-end (real vault decrypt + audit + 60s TTL; per-user reveal rate cap) |
| 035 service-intelligence quick log | P1 | not built |
| 036 geofence hour suggestion | P1 | stubbed text only |

## E. Corporate portal
| REQ | P | Status |
|---|---|---|
| 040 household list + health/compliance/economics panels | P0 | **built+verified** — /oversight/economics: per-household monthly rate (admin-set, integer cents, audited), 30d hours from visit payloads, effective $/hr, gesture spend, cadence, tag stability, signals, dots, client engagement, stranger recency, portfolio totals |
| 041 status tags; LIFE-EVENT suppression | P0 | **built+verified** (both directions, holds never delete) |
| 042 gesture queue + cultural-fit gate | P0 | **built+verified** (8c2c93e: dot→queue→cultural-fit gate→HM-notified gate→execute + cents→quiet log; order server-enforced) |
| 043 fleet roll-ups | P0 | **built+verified** (381d7cf: fleet board — status, playbook health, stranger recency, visit/conflict counts per household) plus the Monday corporate digest (5194e70) |
| 044 exhibit-pack exports | P0 | partial — fleet CSV export live (/api/exhibits/fleet, MFA-gated); the fuller exhibit pack (per-household bundles, REQ-023 artifacts) not built |
| 045 trigger administration UI | P1 | not built (rules seeded by script; library is data, ready for it) |
| 046 dot triage → promote to field | P1 | **built+verified** (997f805: corporate promotes a dot into a chosen field, provenance observed, audited, fires triggers) |
| 047 CPSC recall job | P2 | not built |

## F. Trigger engine
| REQ | P | Status |
|---|---|---|
| 050 field events → rules → role-routed prompts | P0 | **built+verified** live end-to-end |
| 051 six trigger families | P0 | **built+verified** — field-change flow, daily registry sweep (birthday/anniversary/commitment/subscription/horizon windows), movable-date observances (calendar table x household's own Playbook naming them, T-14 radar), and the threshold family (load signal: three consecutive drifting visits -> corporate notification, deduped 14d, STD-023.2.7). OPERATIONAL: sweeps paused until the Upstash quota resets Aug 1 or the plan upgrades |
| 052 staged prompt packs, dated | P0 | **built+verified** (offsets, quiet hours, suppression) |
| 053 commitment cascade | P1 | covered by the registry sweep's commitment windows (prep T-14, final T-3, e6fb527); a richer bespoke cascade remains open |
| 054 repeat-season memory | P1 | not built |

## G/H. Notifications & non-functional
| REQ | P | Status |
|---|---|---|
| 060/061 push+email digests, report delivery | P0 | **built+verified** — client report email on visit close + corporate WATCH/LIFE-EVENT alerts (5a535c4), in-app + web-push notifications (85f9ccf, d8b1a0a), Monday fleet digest (5194e70) |
| 070 security stack (TLS, at-rest, envelope vault, secrets) | P0 | built for pilot — envelope vault live, secrets in Vercel/Railway env + password manager, enforcing CSP, staff TOTP, rate limits, CI dependency-audit gate. Outstanding: managed KMS, external pen review (ADR-001 gate for real s3) |
| 071 privacy (no 3p analytics; media flags; deletion) | P0 | no analytics present; flags/deletion not built |
| 072 availability/backup targets | P0 | not applicable until hosted (DEPLOY.md notes) |
| 073 performance targets | P0 | unmeasured |
| 074 WCAG 2.1 AA | P1 | self-audit + fixes 2026-07-24 (contrast tokens --gold-ink/--gold-bright, provenance text to 4.5:1+, CAUTION tag ink-on-gold, :focus-visible rings, skip link, main landmark, aria-labels on placeholder-only inputs; verified by keyboard in-browser). Formal third-party audit still recommended pre-scale |
| 075 scale envelope 150 households | P0 | schema yes; fleet board + drill-in handle multiple households (pilot-scale); a scaled corporate console for 150 is the 2027-2028 build |

## Deltas resolved since first audit
1. **REQ-003** (was: all-magic-link): staff now clear a TOTP second factor
   layered on the magic link — magic-link-first, no password, per ADR-003.
   Corporate session revocation and admin TOTP reset also shipped.
2. **REQ-022** (was: any s1 field proposable): client proposals are now
   gated to an allowlist in `proposeEdit`.

## Remaining known deltas
- **Managed KMS** (REQ: production KMS) — still `LocalKms`/env KEK; swap is a
  documented re-wrap migration.
- **Scale UI** (REQ-075) — schema handles 150 households; corporate UI is
  still single-household drill-in + fleet board, not a scaled console.

Everything marked built+verified above was exercised against live
infrastructure, not unit tests alone — see git history for the receipts.

## Addendum A1 (the standards store) — findings for the QA-010 v1.4 pass

Built T1–T7 and shipped to production 2026-07-24, dark behind
`standards.seed_reviewed=false`. Everything below is a doc-vs-reality delta
found during the build; none blocked shipping.

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | Seed `kind` has three values (rule 902 / table_row 184 / callout 60); the brief said `rule\|callout` and Addendum S3 omits `kind` entirely | Schema adopted the 3-value enum; S3 table should gain the column |
| 2 | No `preference`-tier rows in the extraction | Enum carries all five WK-STD-000 S1 levels; flag for founder review |
| 3 | `pilot_default` = 7 rows vs the addendum's "nine adopted defaults" | Candidates for the missing two flagged in the annotated review workbook |
| 4 | 8 section-0 preamble rows assert "Tier 1/2 floor" in text but carry tier `method` | Founder review (tier assignments are policy, DEV-005 S4) |
| 5 | Tables named singular (`standard_provision`, `provision_version`) vs the brief's plural | DEV-004 S2 (snake_case singular) is repo law; brief should follow |
| 6 | `audit_event.household_id NOT NULL` cannot record a global (store-wide) write | `provision_version` is the append-only load record; QA to decide whether audit_event grows a corporate scope |
| 7 | The review workbook omits `kind`/`effective_date`, so the corrected sheet is an overlay joined to the base seed by provision_id (`wk_provisions.py`) | Working as designed; document in the addendum |
| 8 | Landed post-launch-readiness, not "before sprint 3"; retrofit cost was LOWER than the addendum's three-sprint estimate (stable codebase, all assumed infra existed) | Timing note for the protocol |
| 9 | Real leak found by the new payload guard: client `/playbook` serialized full field rows (incl. `governing_provisions`) into the flight payload | Fixed (b552e66): fields projected to render-only keys; `assertNoProvisionRows` runs live in the page data path |
| 10 | Brief's "extend the payload test" conflicts with its own "don't touch the permission-matrix package" | Standards assertions live in `@wellkept/schema`; permissions package untouched (its changes need founder sign-off) |
| 11 | The three seeded cascades (kindergarten/meds-day/occasion-radar) are not the addendum's method_ref examples (donate-pile/nap-vacuum/gear-zone), so their `methodRef`s are empty | Per S4, an empty ref is a finding, not an error; assigning refs is a policy mapping |
| 12 | The meds-day cascade step "Check expiration dates on EpiPens/inhalers" conflicted with floor STD-022.3.3 ("never read a medication label") | RESOLVED by founder decision 2026-07-24: labels are never read unless the Playbook explicitly directs it. Step reworded to work from documented dates (methodRef STD-016.6.4). If the docx library later wants the "unless explicitly directed" carve-out written into STD-022 itself, that edit flows founder -> corrected sheet -> loader |
