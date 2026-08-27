---
status: living
---

# Incident, 26 August 2026: production credentials in a second Vercel project

**Status: OPEN. Contained, not closed.** One fact is still missing and it
sets the blast radius; it is marked BLANK below and nothing downstream
should be decided until it is filled.

This document exists because G-35 was carried as a register line for
weeks on the premise that the project was dormant. The premise was
false, and a false premise is what turns a register line into an
incident. The rotation sequence is a founder decision and is NOT made
here; the options and their costs are laid out at the end.

---

## What is established

**Two Vercel projects exist, in one team.**

| | Project id | Role |
|---|---|---|
| `well-kept` | `prj_15Q69KLCnnRMQQZp8Ou4tORuZBQq` | production |
| `well-kept-web` | `prj_p3iZRCqRnw81gpwW3PaMw5ZIAecw` | the stray |

Both carry team `team_XaVg0eFgp7o1vcakrmKMO5CX`. The production id is read
from `.vercel/project.json` and pinned at `tooling/deploy.sh:34`; the
stray's id is read from the Vercel bot payloads on PRs #195 and #196.
**Same team means team membership is the exposure boundary, not
per-project access.**

**The stray holds all three production secrets.** Founder-read on 26
August through the Vercel dashboard: `DATABASE_URL`, `WK_KMS_KEY` and
`AUTH_SECRET` are all present in `well-kept-web` and all say production.
No value entered this repository or any transcript, per the standing
rule.

**The stray is not reachable through the deploy path.** `deploy.sh` pins
the production project id and checks it twice: at line 268 before
deploying (refusing a link file pointing anywhere else) and at line 278
after, re-reading the link file so a `vercel --prod --yes` that created
and re-linked a new project is caught. Both are reads of
`.vercel/project.json`, not queries to Vercel; the second one's value is
that it reads AFTER Vercel could have rewritten the file. Selftest cases
3 and 4 cover the wrong-project and absent-link paths. So a routine
deploy cannot land on the stray.

**The stray was not dormant.** It rebuilt this branch five times on 26
August, at 15:39, 15:47, 15:58, 16:07 and 16:57 UTC, each producing a
publicly addressable preview URL. **Its configuration changed between
the 15:39 and 15:47 builds**: the Vercel payload gained
`"rootDirectory":"apps/web"`, which was absent from the earlier one. Who
or what changed it is not established.

**The repository is not the exposure vector.** Round six item Q scanned
190 commits of content and messages and found no secret ever committed.
Vercel environment variables never enter the tree. The exposure, if
any, is through the Vercel team and through deployed URLs, not through
git.

**Adjacent, and a wrong public claim:** the repository's GitHub
`homepage` field reads `https://well-kept-web.vercel.app`, pointing at
the stray rather than at production.

---

## Containment done

**26 August, after 17:10 UTC: the founder disconnected the Git
integration on `well-kept-web`.** This stops new deployments from being
minted with those credentials. It is safe against the deploy path
because production deploys are driven by `tooling/deploy.sh`, never by
push.

**It does not close the exposure.** The three variables are still in the
project and still valid. Deleting them and rotating them are separate
acts and both are needed: deleting stops future exposure, rotating
invalidates whatever may already have been read.

---

## BLANK, and it sets the blast radius

**For each of `DATABASE_URL`, `WK_KMS_KEY` and `AUTH_SECRET` in
`well-kept-web`, which environment boxes are checked?** Vercel scopes
variables per environment and injects only the matching ones.

- **All three Production-only.** Preview deployments never received
  them, so the five rebuilds above are noise. Exposure narrows to who
  can read the Vercel team. The case for the KEK rotation weakens
  considerably.
- **Any of them checked for Preview.** Every preview build that project
  made ran with live production credentials, and each has a publicly
  reachable URL. That is a live exposure with a real timeline, and the
  KEK rotation goes back on the table.

Two further blanks, wanted for the timeline's spine and not blocking:
the "Added on" date Vercel shows for each of the three variables, and
the project's creation date. A third would be decisive if cheap:
**whether `well-kept-web` ever completed a Production deployment**, as
opposed to previews only.

---

## The rotation options and their costs, NOT a recommended sequence

The order below is by ascending risk, not a decision. Each is
independent of the others.

1. **`AUTH_SECRET`.** Cheapest. Rotating signs every session out and
   nothing else. No data at risk.
2. **`DATABASE_URL`.** A Neon password rotation. The value lives in
   THREE places, not one: the production Vercel project,
   `.neon-connection` on the founder's machine, and **the Railway
   worker**. Missing the worker takes the sweeps silent without an
   error anywhere.
3. **`WK_KMS_KEY`.** The dangerous one. **Rotating the KEK without
   re-wrapping makes every sealed vault value permanently
   unreadable.** `packages/schema/src/rewrap-kek.ts` exists for this and
   was used once before, at the 2026-07-29 rotation, where the record
   notes a seal, reveal, reseal and reveal-again cycle. This needs its
   own sitting with the re-wrap run and a reveal verified after, not a
   paste into a settings field. The boot validation added at the
   seventh run will refuse a malformed key, which is a floor and not a
   safety net for an unwrapped one.

Deleting the three variables from `well-kept-web` is separate from all
three and can be done first, once the BLANK above is filled and
recorded, since reading the scope is not possible after deletion.

---

## What this incident is really about

G-35 recorded the project. It recorded it as dormant. The word was
carried unexamined for weeks while the project rebuilt on every push,
which is G-74's general form arriving in its most expensive place: a
register entry is evidence something was observed once, never evidence
that the observation still holds. The finding is not that a stray
project exists. It is that the document describing it was believed
instead of the thing itself.
