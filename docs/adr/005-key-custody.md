# ADR-005: Master-key custody - a second custodian and a written recovery path

Date: 2026-07-25 | Status: ACCEPTED IN PART (the Guardrails section binds as of 2026-07-25, G-26 — it costs nothing while no real s3 values exist and is the half that must bind immediately); the Decision section's brackets (custodian, mechanism, retrieval condition) remain Proposed | Decider: Rachel Letters (founder)

## Context

`WK_KMS_KEY` (the vault KEK) and `AUTH_SECRET` live in exactly two places:
Vercel's environment and Rachel's password manager (LAUNCH 1.1, done). That
closes the lost-laptop threat 1.1 named. It does nothing for the two threats
it did not name: Rachel being unavailable, and the password manager itself
being lost. If both copies go, every vault row in the business is permanent
ciphertext - no degraded mode, and no restore helps, because a database
restore restores ciphertext.

ADR-003 already worked this exact problem one layer up: the sole-
corporate_admin lockout was answered with backup codes plus admin reset.
This ADR applies the same reasoning to the key that protects the vault.
(Gap register G-01 - the most serious item in it.)

## Decision

1. A second custodian holds a sealed copy of `WK_KMS_KEY` and `AUTH_SECRET`:
   ⟨name - Kelly, as co-founder/CFO, is the obvious candidate and holds no
   key material today⟩.
2. The mechanism: ⟨e.g. a sealed copy in the custodian's own password
   manager, or a sealed physical envelope in a location both parties can
   name; pick one and write it here⟩.
3. The retrieval condition - when the second copy may be opened:
   ⟨e.g. Rachel unavailable for N days, or her written request; name it⟩.
4. Verification cadence: the second copy is confirmed readable
   ⟨quarterly / at every key rotation⟩, and this check is a LAUNCH-style
   line item, not a memory.
5. Key rotation updates BOTH copies in the same sitting, or it did not
   happen.

## Guardrails

- **NO REAL S3 VALUE ENTERS THE VAULT until the sealed second copy exists
  and has been confirmed readable once** (G-17). This is a refusal, not a
  reminder — the same shape as ADR-001 guardrails 2 and 3. LAUNCH 1.1 is
  not "done" until this holds; it cross-references here.
- The re-wrap is DRILLED, not just documented (G-22): in the same sitting
  that creates the second custody, run `pnpm --filter @wellkept/schema
  db:rewrap-kek` (dry run — proves every stored key unwraps and round-trips)
  and one `--commit` against a throwaway Neon branch. The first real
  execution of a recovery path must not be during a suspected compromise;
  the rotation round-trip is also unit-tested in @wellkept/vault.
- No plaintext key files on any disk, ever (the 1.1 rule stands).
- The second copy is sealed: opening it outside the retrieval condition is
  itself an incident (log it in the incident register).
- If either copy is suspected exposed, rotate: the vault re-wrap is the
  documented managed-KMS migration path in reverse - generate a new KEK,
  re-wrap the per-household data keys, update both custodies.

## Consequences

- The vault stops having a single human point of permanent loss.
- One more person can, under a named condition, reach everything the vault
  protects - which is why the condition, the seal, and the incident rule
  above are part of the decision, not decoration.
- The GUARDRAILS BIND NOW (accepted in part, G-26): the no-real-s3 refusal
  is in force today, precisely because the custody it gates on does not yet
  exist. The Decision section stays Proposed until the brackets are filled
  and the sealed copy exists; G-01 stays open until then.
