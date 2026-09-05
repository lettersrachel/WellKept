---
status: living
---
# Security self-audit, ahead of the WK-SEC-001 assessment

**Part Three of the comprehensive instruction, 4 September 2026.** Run
against what an assessor will look for, to reduce what the assessment
bills for. **Erring toward reporting more**, per the instruction.

**Nothing here has been fixed.** The instruction says to report before
fixing anything that changes behaviour, and every actionable finding
below changes behaviour. Read the verdicts, then say which to take.

**Every claim carries its file and line.** Where a finding is a class
rather than an instance, the guard is named rather than the patch.

---

## CORRECTION, 5 September 2026, before the fixes landed

**Finding 1 as first written was FALSE, and finding 4 miscounted by
one.** Both are corrected below, in place and marked, rather than
rewritten away.

**Finding 1 said "the web magic-link entry point carries no rate
limit". It does.** `/signin/action` throttles issuance by IP and address
on exactly the mobile keys, and `/signin/code` throttles the typed code
on its own pair. I found neither because I enumerated
`apps/web/src/app/api` and the web sign-in routes live under
`apps/web/src/app/signin`. **That is G-106's mechanism exactly: a
negative result that was the shape of the query rather than evidence**,
committed inside an audit whose whole job was to look. Filed as G-124.

**What survives is narrower and sharper**, and is the thing that got
fixed: the token has TWO entry paths and only one was throttled. The
corrected finding is below.

**Finding 4 said "the other seven enter through `apps/hm-mobile`".**
Six do. The seventh, `esbuild`, enters through `packages/schema` as
test tooling. The conclusion is unchanged and the sentence was wrong.

---

---

## Verdict summary

| # | Finding | Verdict | Changes behaviour? |
|---|---|---|---|
| 1 | ~~The WEB magic-link entry point has no rate limit~~ **CORRECTED: the token had two doors and only one was throttled** | **REAL, FIXED** | done |
| 2 | `rateLimit` fails OPEN by design | **REAL, RULED, FIXED** | done |
| 3 | Photo bytes are never validated as JPEG, so the metadata-strip promise is conditional | **REAL, FIXED** | done |
| 4 | Nine dependency advisories, two of them in shipped runtime code | **REAL, low; ONE fixed, ONE cannot be fixed by override** | done, with a correction |
| 5 | Upload returns `ok: true` on a silent no-op | **REAL, not security, FIXED** | done |
| 6 | Object-level authorization on id-taking routes | **VERIFIED GOOD** | n/a |
| 7 | The offline queue replaying a stale write after a permission change | **VERIFIED GOOD, already built** | n/a |
| 8 | Security headers and CSP | **VERIFIED GOOD** | n/a |
| 9 | Error verbosity reaching a client | **VERIFIED GOOD** | n/a |
| 10 | Dev-only routes in production | **VERIFIED GOOD** | n/a |
| 11 | `trustHost: true` and implicit cookie flags | **THEORETICAL** | yes if pinned |
| 12 | No guard covers API-route authorization | **CLASS GAP, row opened** | no |

---

## 1. CORRECTED. The sign-in token had two doors and only one was throttled. REAL, and FIXED.

**What I first wrote was false**, and the correction banner above says
why. The web sign-in surface a person uses was always throttled:
`signin/action/route.ts` on `signin:ip` and `signin:email`, and
`signin/code/route.ts` on `signincode:ip` and `signincode:email`.

**The real finding, which is narrower and worse.** The sign-in token has
TWO entry paths. A person types the code into `/signin/code`, which
throttles and then calls `Auth()` in process. Or a person clicks the
emailed link and lands on `GET /api/auth/callback/email?token=...`,
which was a pure pass-through with **no throttle at all**. The same
token, accepted at both doors, disciplined at one. **A guesser would
simply have used the other door**, which makes this a BYPASS of an
existing control rather than a missing one.

**Why the token's size makes this worth fixing rather than urgent.**
`auth/config.ts:139-142` deliberately uses a short typeable token, eight
characters of base31, about 40 bits, and justifies it with three legs:
"Single-use + short expiry + rate-limited entry". 31^8 is about 8.5e11,
so online guessing was never practical. The finding is that one of the
three named legs did not hold on the door an attacker would choose.

**FIXED, 5 September 2026.** `api/auth/[...auth]/route.ts` now throttles
the email callback and nothing else (session and csrf are read on every
page render, and limiting those would be an outage rather than a
control). **It uses the SAME KEYS as `/signin/code`**, deliberately:
separate budgets would have handed a guesser five attempts at one door
and five more at the other, which is how two controls end up weaker than
one.

## 2. `rateLimit` fails OPEN. REAL, and RULED: the split is clean and built.

`lib/rate-limit.ts:22-31` catches every error and returns `true`. The
header says why: "fail OPEN on Redis trouble: sign-in availability beats
a perfect limiter". That is a defensible call and it is written down,
which is the right posture.

**RULED 5 September 2026: fail closed on the sign-in path, fail open
elsewhere only where blocking would be worse than allowing, and report
first if that split is not clean.** It is clean, so it is built.

**The failure mode is now a REQUIRED ARGUMENT**, not a default. A
default would be the producer rule's own failure: whichever answer were
the default, a later call site would inherit it silently and nobody
could tell an inherited answer from a decided one.

**Every call site now declares, and there is exactly ONE `open`:**
`/api/reveal`, because that is an already-authenticated,
already-authorized, already-audited vault reveal, and refusing one
because Redis is unreachable would withhold an alarm code from a HOM
standing at a door. Blocking is worse than allowing there, which is the
ruling's own test.

**Closed** everywhere else: both web sign-in routes, the new callback
throttle, all three mobile auth routes, and BOTH MFA sites. The MFA pair
is the clearest case in the set and was not in the original finding: a
six-digit TOTP is a million-value space and genuinely brute-forceable
without a limiter, far more so than the 40-bit link token.

**What fail-closed costs, stated at the implementation rather than only
here:** an unreachable Redis means no new sign-in succeeds, on web or
mobile. **The bound that makes that acceptable is that the session
strategy is DATABASE**, so every already-signed-in session keeps
working. An outage blocks new entry and evicts nobody, including the
founder mid-incident.

## 3. Photo bytes are never validated as JPEG. REAL.

`api/mobile/upload/route.ts:31` checks the CLIENT-SUPPLIED
`contentType` against a one-value allowlist. Nothing checks the bytes.
And `lib/jpeg-strip.ts:18` returns the input **untouched** when the SOI
marker is absent, which is the correct thing for a stripper to do and
the wrong thing to rely on:

> the route's content-type allowlist is the wall

**So the interesting half is not "arbitrary bytes can be stored".** It
is that the route's own comment promises "a photo taken inside a
member's home never stores its location, whatever client sent it", and
that promise holds only for real JPEGs. A client sending a HEIC or a
PNG labelled `image/jpeg` stores it whole, with whatever GPS its
container carries, and the strip silently does nothing.

**Bounded, and the bounds are real:** serving is staff-gated with the
second factor (`api/mobile/photo/route.ts:25-27`), and
`X-Content-Type-Options: nosniff` is set globally
(`next.config.ts`), so no browser sniffs a stored blob into script.

**FIXED, 5 September 2026.** The route now reads the bytes and refuses
a non-JPEG with 415 before stripping. That is what makes the comment's
promise unconditional rather than true-for-real-JPEGs. The accepted
tradeoff, stated because it is a real one: a client we have not met that
sends a valid photo in another container is now refused rather than
silently stored unstripped, and refusing is the correct half of that
trade.

## 4. Dependency advisories. REAL, low.

`pnpm audit` reports **nine advisories, all moderate**, plus two the
existing overrides already ignore. Counted from the JSON rather than
the table.

**Only two reach shipped runtime code:**

- `@opentelemetry/core`, patched at >=2.8.0, entering through
  `apps/web` and `services/worker`.
- `postcss`, patched at >=8.5.23; the existing override pins >=8.5.18,
  so the pin is stale rather than absent.

**SIX of the other seven enter through `apps/hm-mobile`** (the Expo
toolchain: `uuid`, `undici` three times, `@xmldom/xmldom` twice), which
is build-and-development tooling for an app that cannot ship until the
Apple Developer enrollment. **The seventh is `esbuild` through
`packages/schema`**, which is test tooling; the first version of this
paragraph said all seven were Expo and was wrong by one.

**PARTLY FIXED, and the other half CANNOT be fixed this way. Corrected
5 September 2026 after the attempt.**

`postcss` is closed: the override moved from >=8.5.18 to >=8.5.23, a
patch bump inside 8.x, and the build is unaffected.

**`@opentelemetry/core` is NOT closed, and forcing it broke the build.**
The advisory patches at >=2.8.0, and 2.x removed `getEnv`, which
`@opentelemetry/resources@1.30.1` and `@opentelemetry/sdk-trace-base@1.30.1`
still import. Both arrive through `@sentry/node@9.46.0`. The override
therefore compiled to `Attempted import error: 'getEnv' is not exported
from '@opentelemetry/core'` across the Sentry OTel stack, and the
override was reverted.

**So the honest state is eight advisories, not seven**, and the one that
remains in shipped runtime code closes when `@sentry/node` upgrades its
OpenTelemetry stack, which is a dependency change of a different size
and not an override. Stated for the assessor packet rather than left as
a number that quietly went down.

**The lesson, recorded because I made it inside a session about being
careful:** a transitive override across a MAJOR version is a change to
code nobody in this repository wrote, and the only thing that can tell
you whether its dependents survive it is a build. I bumped it and
reported it closed in the same breath, and the build said otherwise
about ninety seconds later.

## 5. The upload's silent no-op. REAL, not a security finding.

`api/mobile/upload/route.ts:44-48` inserts with
`onConflictDoNothing({ target: visitPhoto.id })` and then returns
`{ ok: true, photoId }` unconditionally. **The conflict path is the
right security behaviour**: a field HOM supplying another household's
photo id overwrites nothing. But the caller is told the upload
succeeded when nothing was written.

This is the G-68 class one layer down: a confirmation that proves the
code path ran and not that the row landed.

**FIXED, 5 September 2026.** The insert returns, and the three real
outcomes are now distinguishable: `stored: "written"`, `stored:
"already"` when the same household's earlier sync placed it, and a 409
when the id belongs to someone else. The security behaviour is
unchanged; what changed is that the caller is told the truth.

---

## What is already right, stated with evidence because the instruction asks

## 6. Object-level authorization on id-taking routes. VERIFIED GOOD.

Every API route that takes an id re-derives the principal from the
server-side assignment table and refuses on a miss. **Two routes look
ungated to a grep for the usual symbols and are not:**
`api/exhibits/fleet/route.ts:15-21` gates through `getAssignedHouseholds`
plus `CORPORATE_ROLES` plus the second factor, and
`api/mobile/briefing/route.ts:23-27` through
`getHouseholdAndPrincipalById` plus a field-role set plus the second
factor. Recorded because the next person running this audit will make
the same grep and should not report them as holes.

The distinction the instruction draws is the right one and the tree
satisfies it: this is object-level authorization, not merely a declared
permission. `api/mobile/photo/route.ts:20-26` reads the row FIRST and
then derives the principal **from the row's own household**, which is
the shape that cannot be fooled by a supplied household id.

## 7. The offline queue and a permission change. VERIFIED GOOD, already built.

The instruction asks whether a queued write can replay after a
permission change. **It cannot.** `api/visit-commands/route.ts:123-135`
re-derives the principal at DRAIN time, refuses when the assignment is
gone or is not a field role, requires the second factor, and then
**overwrites the payload's `householdId`, `submittedBy` and
`submittedByRole` with the principal's own values**. A command queued
while a HOM was assigned and drained after revocation is refused, and a
command carrying a forged household id is rewritten rather than
trusted.

## 8. Security headers and CSP. VERIFIED GOOD.

`src/middleware.ts` sets an **enforcing** CSP with a per-request nonce,
`script-src 'self' 'nonce-...' 'strict-dynamic'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
`next.config.ts` adds HSTS at two years with `includeSubDomains`,
`nosniff`, `X-Frame-Options: DENY`, `strict-origin-when-cross-origin`,
and a Permissions-Policy denying camera, microphone and geolocation.
`style-src` keeps `'unsafe-inline'` for inline style attributes, which
the middleware's own comment states and reasons about.

## 9. Error verbosity. VERIFIED GOOD.

Every API error body in the tree is a fixed string ("forbidden",
"missing id", "unsupported type"). The only `err.message` renders are
in `VisitWizard.tsx`, which is the client displaying its own fetch
error. No stack trace, database message or internal identifier reaches
a response body.

## 10. Dev-only surfaces. VERIFIED GOOD.

`api/dev/trigger-pass/route.ts:15` returns 404 and
`dev/last-email/page.tsx:14` calls `notFound()` when
`NODE_ENV === "production"`. Vercel sets `NODE_ENV=production` on every
deployment including previews, so staging inherits the same closure
rather than needing its own.

---

## 11. Two questions an assessor will ask that are not defects. THEORETICAL.

**`trustHost: true`** (`auth/config.ts:151`). Standard on Vercel, where
the platform sets the host, and the reason it is there. An assessor
will still ask, and the answer worth having ready is that the
deployment is single-host behind Vercel's own routing.

**Cookie flags are Auth.js defaults rather than explicit configuration.**
The defaults are correct today (httpOnly, sameSite lax, secure under
https). Pinning them explicitly would mean a future Auth.js upgrade
cannot change them silently. That is a small hardening rather than a
finding, and it changes behaviour, so it is listed rather than done.

## 12. The class gap: no guard covers API-route authorization

`action-permissions.test.ts` computes every exported server action and
demands a sanctioned gate. **Its own not-covered column already says
"API routes, whose gates live in-route"**, and this audit is the first
time anyone has walked them by hand. Seventeen routes, all correct
today, held by nobody.

**That is exactly the instruction's "prefer a guard over a fix wherever
the finding is a class"**, and it is a new guard rather than a widened
one, so it is a queue row (**Q-11a**) rather than a change made here.
