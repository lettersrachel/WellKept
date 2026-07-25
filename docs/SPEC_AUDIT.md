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
| 006 NDA mode | P1 | **built** (2026-07-25): ndaMode in core + reveal path; per-photo media-reuse flag (default NO, corporate-set, audited, NEVER enableable on an NDA household — enforced in the action) |

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
| 023 quarterly review artifacts | P1 | **built+verified** — the exhibit pack (/oversight/[id]/exhibit): windowed 30/90/180/365d, visits + hours + reports timeline, gesture spend, client updates, stranger tests, tag history; browser print IS the export |
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
| 044 exhibit-pack exports | P0 | **built+verified** — fleet CSV (/api/exhibits/fleet) + the per-household printable exhibit pack (see 023) |
| 045 trigger administration UI | P1 | **built+verified** — /oversight/triggers: full library with steps + method refs, enable/disable (audited; disable is the retirement path), create fleet rules with fail-closed validation (bounded offsets, real provision ids, DEV-005 no-em-dash) |
| 046 dot triage → promote to field | P1 | **built+verified** (997f805: corporate promotes a dot into a chosen field, provenance observed, audited, fires triggers) |
| 047 CPSC recall job | P2 | **built** (2026-07-25): weekly worker job (Tuesdays) searches the CPSC SaferProducts feed per appliance-registry entry (model preferred, label fallback), notifies corporate_admin on a MAY-match with the recall URL and an explicit verify-the-unit instruction, deduped once-ever per (household, recall). Quiet on feed failure — skipped rounds retry next week. OPERATIONAL: runs once Upstash resumes |
| 048 CEO master view (new REQ, founder request 2026-07-25) | P1 | **built** (2026-07-25): /oversight/[id]/preview/{client,hm} — corporate_admin-only, read-only previews through the other roles' projections, using the SAME server-side filters as the real surfaces; the client preview runs all three payload guards live, so every CEO visit re-proves the client projection is safe. Switcher pills on the drill-in header |

## F. Trigger engine
| REQ | P | Status |
|---|---|---|
| 050 field events → rules → role-routed prompts | P0 | **built+verified** live end-to-end |
| 051 six trigger families | P0 | **built+verified** — field-change flow, daily registry sweep (birthday/anniversary/commitment/subscription/horizon windows), movable-date observances (calendar table x household's own Playbook naming them, T-14 radar), and the threshold family (load signal: three consecutive drifting visits -> corporate notification, deduped 14d, STD-023.2.7). OPERATIONAL: sweeps paused until the Upstash quota resets Aug 1 or the plan upgrades |
| 052 staged prompt packs, dated | P0 | **built+verified** (offsets, quiet hours, suppression) |
| 053 commitment cascade | P1 | covered by the registry sweep's commitment windows (prep T-14, final T-3, e6fb527); a richer bespoke cascade remains open |
| 054 repeat-season memory | P1 | **built** per [Addendum A2](SPEC_ADDENDUM_A2.md) (2026-07-25): `season_observation` materialized on the daily sweep from the household's own anchors (visits, dots, gestures); recall section on BOTH briefing surfaces (web /visit and the native app via /api/mobile/briefing `lastYear`), after radar, before dots, filtered through exclusions, dark until 12 months of history and says so. Payload guard extended (`assertNoAnticipationRows`) |
| 055 prompt outcome capture and rule health | P1 | **built** per A2 (2026-07-25): `prompt_outcome` (four-value enum, append-only, unique per prompt×user), answer buttons on today's specials (never gates anything), rule health in /oversight/triggers (fired from the prompt table, act/ignore/n-a/already-done rates, median lead where target dates exist, retirement-candidate flag). Thresholds ship as configuration (`app_setting` key `rule_health`), founder-set |
| 056 anticipation exclusion list | P1 | **built** per A2 (2026-07-25): `anticipation_exclusion`, enforced server-side in the scheduler before queue writes, fail closed; floors bypass exclusions entirely — asserted in trigger-engine unit tests AND live (G-05, 2026-07-25): a CI e2e spec (`tooling/e2e/floor-bypass.spec.ts`) drives the real scheduler path via the dev-gated `/api/dev/trigger-pass` endpoint on every CI run, and the security probe carries the same assertion for manual dev-stack runs; corporate-only approval + audited end-dating in the household drill-in |

## G/H. Notifications & non-functional
| REQ | P | Status |
|---|---|---|
| 060/061 push+email digests, report delivery | P0 | **built+verified** — client report email on visit close + corporate WATCH/LIFE-EVENT alerts (5a535c4), in-app + web-push notifications (85f9ccf, d8b1a0a), Monday fleet digest (5194e70) |
| 070 security stack (TLS, at-rest, envelope vault, secrets) | P0 | built for pilot — envelope vault live, secrets in Vercel/Railway env + password manager, enforcing CSP, staff TOTP, rate limits, CI dependency-audit gate. Outstanding: managed KMS, external pen review (ADR-001 gate for real s3) |
| 071 privacy (no 3p analytics; media flags; deletion) | P0 | no analytics present; media-reuse flags built (see 006); deletion MECHANISM built (2026-07-25): `scripts/erase-household.mjs` — dry-run-default CLI that crypto-shreds the vault (rows deleted, keys gone, unrecoverable), purges photo bytes, blanks all free-text content, tombstones structure, keeps audit + (by default) incident records; flags for counsel-directed incident erasure and audit-detail scrubbing. POLICY still counsel's: when to run it, holds, and the notice language |
| 072 availability/backup targets | P0 | not applicable until hosted (DEPLOY.md notes) |
| 073 performance targets | P0 | measured 2026-07-25 against live prod (wellkept-orcin, 5-sample TTFB via curl): /api/health (DB round-trip) ~104-139ms warm / 357ms cold; /signin SSR ~108-132ms warm / 474ms cold; /privacy ~112-139ms. Well inside interactive targets at pilot scale; re-measure under fleet load before 075 |
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

## Functional gaps outside the requirement table (added 2026-07-25)

> A second-pass review of the rev-4 handoff produced a companion register —
> [GAP_REGISTER.md](GAP_REGISTER.md) (14 items: custody, backups, two
> shipped-mechanism contradictions since fixed, business/legal gates,
> governance obligations). It extends this table; neither duplicates the other.

The table above audits the build against WK-DEV-001's requirements, so
"every P0 built" is only true of functions the requirement table asked for.
A gap review of the pilot handoff found seven business functions that appear
in no governing doc at all — absent, not marked incomplete. Three are
deliberate boundary decisions, now recorded in ADR-004; four are open gaps.
None of these can be inferred from the REQ table; this register is where
they are marked.

| Gap | Kind | Disposition |
|---|---|---|
| Billing & payment collection | **boundary, closed** (ADR-004 §1, Accepted 2026-07-25) | QuickBooks is the named system of record for invoicing, collection, and dunning; the app never collects payment (privacy notice keeps card/bank numbers out by policy) and the economics rate (REQ-040) stays oversight math only. Operational remainder outside this repo: configure QuickBooks invoicing before the first paying household |
| Scheduling & rostering | **boundary, closed** (ADR-004 §2, Accepted 2026-07-25) | HM-to-household assignment lives in the Jobber stack (plan 9.2); the app records who did visit, never who will. The codebase's only "roster" is the `roster_age` trigger family — not staff rostering |
| Time → payroll | **boundary, closed** (ADR-004 §3, Accepted 2026-07-25) | QuickBooks (payroll/timekeeping) is the named system of record for FLSA-grade time; app hours stay service records (geofence is stubbed text, REQ-036) that may cross-check payroll but never feed it |
| Incident / complaint register | **built** (2026-07-25) | `incident_report`: append-only, five kinds, severity + channel + reporter, audited create/resolve, no delete path. Logged from the drill-in (field + corporate roles); open incidents flag red on the fleet board |
| Client consent capture | **built** (2026-07-25) | The household record now carries `consent_signed_at` / `consent_doc_version` / `consent_recorded_by`, recorded by corporate_admin on the drill-in (audited, corrections re-record). What remains is Rachel's: counsel review, the signature itself, and recording it — gated in LAUNCH.md §1.5 |
| Photo lifecycle | **mechanism built** (2026-07-25) | Daily purge of image bytes past the configurable window (`app_setting` `photo_retention`, default 90d, floor 7d); tombstoned rows serve 410; corporate retention hold exempts disputed photos, audited; per-photo reuse flag (REQ-006) default NO, never on NDA households. Remaining: counsel blesses the window + privacy-notice disclosure; `photoRefs` (REQ-012) still unused |
| Deletion / erasure | **mechanism built** (2026-07-25) | `scripts/erase-household.mjs`: dry-run-default, single-transaction erasure — vault crypto-shred (the one deliberate hard-delete: tombstoned ciphertext would still be the secret), photo-byte purge overriding holds, free-text blanked, structure tombstoned, audit + incidents kept by default (counsel-directed flags to go further), sessions revoked, and the erasure itself is the household's final audit entry. The promise is now executable; counsel still reconciles the notice language and decides when erasure applies. LAUNCH.md §3 |

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
