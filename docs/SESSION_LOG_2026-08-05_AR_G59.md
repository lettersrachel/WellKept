---
status: frozen
---

# Session log: AR session one, the G-59 tokenisation

Run on the founder's "start AR", per Ruling 2's sequencing: "G-59's
tokenisation of the two known sites is the first fix AR performs in this
area." One migration (0036), per the standing rule.

## Built

- `audit_subject_token` (migration 0036, applied clean locally, 37/37
  three-way count): id-as-token, household-scoped, `kind` (email |
  person_ref), `value` (s2). A fresh token per audit event, never deduped
  per subject, because a dedupe index would itself be a linkage record.
- All three G-59 write sites tokenized in `apps/web/src/lib/actions.ts`:
  `role_assigned` (the target's email), `exclusion_created` and
  `exclusion_ended` (the target's name, when scope is person). Non-person
  scopes keep plaintext targets on purpose: a rule id or topic tag is not
  a person, and blanking it would blind the trail without protecting
  anyone.
- Erasure treatment in the same change, as the coverage guard demands and
  ADR-006 designed: `audit_subject_token` rows are DELETED with the
  household, the seventh documented DELETE exception, with its reason
  written at the deletion site and in the tool header. CLAUDE.md's
  exception list updated from six to seven; WK-DEV-005's corrected
  Section 3 line updated the same way.

## Proven

Four tests in `actions.audit-identity.test.ts`: the token row carries the
value and the audit row carries the token for all three sites; the
plaintext-keeping direction for a topic-scoped exclusion; and the suite
was proven red by reintroducing the exact email leak G-59 filed (caught
by name) before being trusted green. Full monorepo suite and typecheck
clean, 11/11 tasks.

## Reported, not done

- No display surface renders these details today (checked: only
  tag_change events are queried by any page), so ADR-006's live-join
  resolution rule has nothing to attach to yet; it binds on whichever
  session first renders audit detail to a viewer.
- Historical fixture rows keep their pre-fix plaintext detail: no real
  household exists, and rewriting audit history would break append-only
  for zero privacy gain.
- G-59's disposition option 2 (--scrub-audit-detail as the erasure
  default, and the dry-run status line) stays open, now a smaller
  inaccuracy than filed: the "kept intact (hashes, no values)" line is
  true for post-fix rows.
- AR's document half (whatever AQ marked stale in the library documents,
  fixed under WK-SOP-026) is the founder's, outside this repo.

## Arrived mid-session, not read yet

Two uploads landed while this session was in flight (a Model Integration
bundle and a standalone WK-APP-008 markdown). Deliberately not opened
until this session closed: one session, one deliverable. They are the
next thing examined.
