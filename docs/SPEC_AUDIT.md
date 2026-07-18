# Spec audit — build vs WK-DEV-001 requirements

Date: 2026-07-18. Audited against the full handoff package (01_Read_First
… 04_Governance). Status: **built+verified** / **partial** / **not built**.
P0s not built are the honest launch-blocking list.

## A. Platform, auth & tenancy
| REQ | P | Status |
|---|---|---|
| 001 multi-tenant, household-scoped | P0 | built (schema); UI assumes one household (pilot); needs household picker at scale |
| 002 six roles, per-household | P0 | **built+verified** (household_role_assignment, unique per user×household) |
| 003 staff email+password+TOTP; magic link for clients | P0 | **DELTA: partial** — magic link for ALL roles today. Staff TOTP MFA + corporate session revocation not built. Flagged for the auth hardening sprint |
| 004 server-side matrix, no s2/s3 in client payload | P0 | **built+verified** (100%-gated core; live scans; CI) |
| 005 full audit log | P0 | built for s3 reads + field writes + tag changes; ordinary field *reads* not audited (spec says every s3 read + every write — compliant) |
| 006 NDA mode | P1 | partial: ndaMode in core + reveal path; media-reuse flags not built |

## B. Playbook data model
| REQ | P | Status |
|---|---|---|
| 010 household record | P0 | built |
| 011 24 fixed sections, N/A-confirmed first-class | P0 | built (canonical SECTION_NAMES now in schema); nothing enforces non-renumbering beyond convention |
| 012 field record shape | P0 | built (photoRefs unused so far) |
| 013 s3 vault, envelope-encrypted | P0 | **not built** — vault_item table + audited reveal + 60s TTL exist; encryption/KMS is the vault sprint. ADR-001 guardrail 2 keeps real s3 out until then |
| 014 registries as structured sub-tables | P0 | **not built** — registry content lives in field text today |
| 015 human-readable change timeline | P0 | partial — audit_event holds the data; no timeline UI (Section 24 feed) |
| 016 workbook import + dry run | P1 | **built+verified** (wk_import.py) |
| 017 branded client export | P1 | **built+verified** (tooling/export; payload-gated; internal S1+S2 binder variant not built) |

## C. Client portal
| REQ | P | Status |
|---|---|---|
| 020 read-mostly branded s1 view + search | P0 | built except **search not built** |
| 021 visit report feed | P0 | built (latest report; feed/history view thin) |
| 022 self-service updates via review queue | P0 | **DELTA: partial** — review queue built+verified, but proposals allowed on ANY s1 field; spec wants an allowlist (travel dates, contacts, preference notes) |
| 023 quarterly review artifacts | P1 | not built |
| 024 data stewardship view | P2 | not built |

## D. HM portal
| REQ | P | Status |
|---|---|---|
| 030 briefing (flags→deltas→specials→radar→dots→gesture→proposal) | P0 | partial — flags/radar/dots/proposal built+verified; deltas-since-last-visit and today's specials not built |
| 031 enforced close flow | P0 | **built+verified** (state machine; airplane-tested) |
| 032 offline-first, LWW + conflict to corporate | P0 | **built+verified** (IndexedDB/AsyncStorage + SW shell; conflicts surfaced) |
| 033 stranger mode | P0 | **not built** (stranger_test table exists) |
| 034 in-context s3 reveal | P0 | built+verified (web; vault-pending values until REQ-013) |
| 035 service-intelligence quick log | P1 | not built |
| 036 geofence hour suggestion | P1 | stubbed text only |

## E. Corporate portal
| REQ | P | Status |
|---|---|---|
| 040 household list + health/compliance/economics panels | P0 | partial — single-household oversight with playbook-health, visits, anticipation; relationship-health + economics panels not built |
| 041 status tags; LIFE-EVENT suppression | P0 | **built+verified** (both directions, holds never delete) |
| 042 gesture queue + cultural-fit gate | P0 | **not built** (gesture table exists) |
| 043 fleet roll-ups | P0 | **not built** (single household today) |
| 044 exhibit-pack exports | P0 | **not built** |
| 045 trigger administration UI | P1 | not built (rules seeded by script; library is data, ready for it) |
| 046 dot triage → promote to field | P1 | not built (dots displayed) |
| 047 CPSC recall job | P2 | not built |

## F. Trigger engine
| REQ | P | Status |
|---|---|---|
| 050 field events → rules → role-routed prompts | P0 | **built+verified** live end-to-end |
| 051 six trigger families | P0 | partial — binding/evaluation built; only field-change events flow; birthday math, thresholds, movable dates (table exists) not implemented |
| 052 staged prompt packs, dated | P0 | **built+verified** (offsets, quiet hours, suppression) |
| 053 commitment cascade | P1 | not built |
| 054 repeat-season memory | P1 | not built |

## G/H. Notifications & non-functional
| REQ | P | Status |
|---|---|---|
| 060/061 push+email digests, report delivery | P0 | **not built** (reports appear in-portal only) |
| 070 security stack (TLS, at-rest, envelope vault, secrets) | P0 | partial — deploy prep done; vault/KMS, secret store, scanning outstanding |
| 071 privacy (no 3p analytics; media flags; deletion) | P0 | no analytics present; flags/deletion not built |
| 072 availability/backup targets | P0 | not applicable until hosted (DEPLOY.md notes) |
| 073 performance targets | P0 | unmeasured |
| 074 WCAG 2.1 AA | P1 | unaudited |
| 075 scale envelope 150 households | P0 | schema yes; UI single-household |

## The two deltas worth deciding soon
1. **REQ-003**: staff should NOT sign in by magic link long-term (spec:
   password+TOTP for staff; magic link is the *client* affordance). Current
   all-magic-link is fine for the pilot demo; the auth hardening sprint
   should split the paths.
2. **REQ-022**: client proposals should be limited to an allowlist of field
   kinds, not any s1 field. Small change (a predicate in proposeEdit +
   hiding the affordance); queued.

Everything marked built+verified above was exercised against live
infrastructure, not unit tests alone — see git history for the receipts.
