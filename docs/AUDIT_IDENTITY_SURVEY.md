---
status: frozen
---

# Audit identity survey (Direction 1a)

Prepared 1 August 2026, following `PLACEHOLDER_DIRECTIONS.md` Direction 1.
Read-only. Reports on `audit_event` as it exists; changes nothing.

## The five questions

### 1. What does a row actually hold?

`packages/schema/src/tables.ts:130-140`:

| Column | Holds |
|---|---|
| `id`, `createdAt`, `updatedAt` | identifiers / timestamps |
| `householdId` | identifier, points at a household |
| `actorUser` | identifier, points at a user |
| `actorRole` | a role string (`corporate_admin`, `house_manager`, ...), not personally identifying by itself |
| `kind` | an event-type string |
| `fieldId` | identifier, nullable, points at a `playbook_field` |
| `oldValueHash`, `newValueHash` | hashes (`sha256`), nullable, never the value itself, confirmed at every `field_write` call site |
| `detail` | free-form `jsonb`, nullable, the only column with no fixed shape |

By schema, only `detail` can hold anything other than an id or a hash. Every
other column is structurally clean.

### 2. Does any audit row hold a name, an address, or field content directly?

**Yes, in `detail`, at two of the twenty-five audit-write sites checked.**
Neither is a recipient or non-client record; both are existing, live,
client-relevant events.

- **`role_assigned`** (`apps/web/src/lib/actions.ts:327`): `detail: { email, role, ndaApproved }`.
  `email` is a literal email address, written directly, every time a
  household role is assigned.
- **`exclusion_created`** and **`exclusion_ended`** (`actions.ts:667, 813`):
  `detail: { exclusionId, scope, target, requestedBy }`. `target` is
  `anticipationExclusion.target`, per its own column comment
  (`tables.ts:884`), "rule_id, topic tag, **person reference**, field ref."
  When `scope === "person"`, `target` is free text naming a person, matched
  by `exclusions.ts`'s case-insensitive containment against draft text. The
  fixture row this session has been discussing (`5e5d170a`, scope `person`,
  target `"topic"`) is exactly this shape; a real household's equivalent row
  would hold a real name.

No field's actual VALUE (a playbook_field content string) was found stored
directly anywhere: every `field_write` audit row uses `oldValueHash`/
`newValueHash`, consistently, at all six `field_write` call sites checked.

### 3. Indirect leaks: serialized payloads, error messages, reason strings, notification bodies?

Checked every `detail` payload at all twenty-five sites individually.
`membership_event`'s free-text `reason` (required on cancel, `s2`) is
deliberately **not** included in its audit row's detail (`actions.ts:1009`
logs only `eventKind, effectiveOn, tier, initiatedBy`). `anticipationExclusion.reason`
(`s2`) is likewise absent from `exclusion_created`'s detail. `incident_logged`/
`incident_resolved` log structural fields only (`incidentKind`, `severity`,
`reportedVia`, `preventableByPrompt`), no free text. No audit-write site logs
an error message, a notification body, or a serialized object beyond the
narrow field lists shown above. Beyond the two findings in question 2, this
class of leak was not found.

### 4. What happens to an audit row when `erase-household.mjs` runs?

`audit_event` rows are **kept** by default; the tool's own header says so:
"append-only accountability; carries hashes, not values" (`erase-household.mjs:36-38`).
**That comment is no longer accurate.** It was true when written; questions 2
and 3 above show `detail` can carry a real email address and a real person's
name today, not only hashes. The tool already anticipated this in its
`--scrub-audit-detail` flag ("replaces detail payloads (**which can carry
emails**)... if counsel directs"), so the risk was known, but the flag is
**off by default**, and the dry-run's own status line
(`erase-household.mjs:172`) tells the operator "kept intact (hashes, no
values)" regardless of whether that's true for the household being erased.

**Answering the question directly: yes, audit rows referencing an erased
household remain fully resolvable to a person afterward, by default,** for
any household that ever had a role assignment or a person-scoped exclusion.
Only an explicit `--scrub-audit-detail` run changes that, and nothing prompts
an operator to know they need it.

### 5. Does a token or pseudonym mechanism already exist?

No. Grepped the full source tree for `pseudonym` and `tokeniz*`: zero matches
outside this survey and the Direction 1 planning documents. Direction 1b's
ADR is not a refinement of an existing pattern; it would be the first.

## What this changes about Direction 1

The original framing treated tokenisation as a forward-looking decision for
records that don't exist yet (recipients, Member Circle). Questions 2 and 4
show the underlying exposure is already live, in code that ships today, for
existing client-household data. The ADR in Direction 1b should say so plainly
rather than only address the not-yet-built case.

**Filed separately, per this direction's own instruction** ("a finding about
client records... should be raised on its own"): `docs/GAP_REGISTER.md` G-59.
