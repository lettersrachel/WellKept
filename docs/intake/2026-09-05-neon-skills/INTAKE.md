---
status: living
---
# Intake: the Neon agent skills, 5 September 2026

Installed on founder instruction with
`npx neon@latest skills -s neon -s neon-postgres -y`, then intaken before use
the way any outside-authored addition is.

## What landed, read from the tree rather than from the installer's summary

| Path | What it is |
|---|---|
| `.claude/skills/neon/SKILL.md` plus `references/claimable-neon.md` | documentation |
| `.claude/skills/neon-postgres/SKILL.md` plus three `references/*.md` | documentation |
| `skills-lock.json` | provenance: `neondatabase/agent-skills` on GitHub, each SKILL.md pinned by sha256 |

`git status` shows nothing else. No script, no binary, no dotfile, no
environment change.

## What it GRANTS: documentation, and no credential

**No credential landed and this container still has no path to production
Postgres.** Checked by presence rather than by reading any value:

- `NEON_API_KEY`, `NEON_PROJECT_ID`, `DATABASE_URL`, `PGHOST`, `PGPASSWORD`,
  `NEON_DATABASE_URL`: all absent.
- No `~/.config/neonctl`, no `~/.neon`, no `.neon-connection`.
- No `neon` CLI on PATH; `npx --no-install neon me` refuses because the package
  is not installed locally at all. The installer fetched it transiently and left
  nothing behind.
- Every credential-shaped grep hit inside the installed files is PROSE ABOUT
  credentials ("`NEON_API_KEY` is set", "authenticate with `Authorization:
  Bearer <NEON_API_KEY>`"), never a value.

The skills describe how one would authenticate. Describing the door is not
opening it.

## What it WOULD grant if authenticated, which is wider than the standing authorization

The capability surface the skills document includes `neon link`, `neon env
pull` (which writes `DATABASE_URL` into `.env`), branch creation and checkout,
object storage, an AI gateway, and project creation and claiming. **A Neon API
key is project-scoped, not read-only.** So if a key is ever exported into this
container, the founder's stated boundary (read queries and attempt-then-rollback
proofs; nothing that writes) would rest on THIS AGENT'S CONDUCT rather than on
the grant, which is the weaker of the two places to put it.

**The erasure never-rule is unchanged and absolute**, and nothing in these
skills touches it. They carry no destructive instruction: a scan for `neon
branch delete`, `neon branch reset`, `DROP`, `TRUNCATE` and project deletion
returns nothing, and a scan for instructions to ignore or override local rules
returns nothing.

## Standing: NOT a build authority

These are operating instructions for an agent, installed by the founder. They
do not override `CLAUDE.md`, they are not a spec, and they are not stamped in
`SPEC_REGISTER.md`. Where they and the standing rules disagree, the standing
rules win, as they do for every intaken document.

## The privilege paradox, worth knowing before a key is minted

**An attempt-then-rollback proof needs INSERT privilege to mean anything.** The
attempt must be permitted to reach the CHECK; a SELECT-only role would refuse
the statement on PERMISSIONS instead, print a refusal, and prove nothing about
the constraint. That is the wrong-unit class exactly (G-129): a confident
refusal answering a question nobody asked.

So the honest options, if the three remaining Handled-invariant clauses are to
be exercised from a container rather than from the founder's own session:

1. **The founder runs them herself**, which needs nothing new and is what is
   happening today.
2. **A role with INSERT and no DELETE or DROP**, used only inside transactions
   that roll back. The proof is then real and the blast radius is bounded by the
   grant rather than by conduct.
3. **A read-only role**, which is safe and cannot perform this proof at all.

Option 3 is the one that sounds safest and is the one that would produce a
false pass.
