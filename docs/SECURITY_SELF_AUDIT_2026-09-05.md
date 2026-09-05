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

## Verdict summary

| # | Finding | Verdict | Changes behaviour? |
|---|---|---|---|
| 1 | The WEB magic-link entry point has no rate limit | **REAL** | yes |
| 2 | `rateLimit` fails OPEN by design | **REAL, and deliberate** | yes if changed |
| 3 | Photo bytes are never validated as JPEG, so the metadata-strip promise is conditional | **REAL** | yes |
| 4 | Nine dependency advisories, two of them in shipped runtime code | **REAL, low** | yes |
| 5 | Upload returns `ok: true` on a silent no-op | **REAL, not security** | yes |
| 6 | Object-level authorization on id-taking routes | **VERIFIED GOOD** | n/a |
| 7 | The offline queue replaying a stale write after a permission change | **VERIFIED GOOD, already built** | n/a |
| 8 | Security headers and CSP | **VERIFIED GOOD** | n/a |
| 9 | Error verbosity reaching a client | **VERIFIED GOOD** | n/a |
| 10 | Dev-only routes in production | **VERIFIED GOOD** | n/a |
| 11 | `trustHost: true` and implicit cookie flags | **THEORETICAL** | yes if pinned |
| 12 | No guard covers API-route authorization | **CLASS GAP, row opened** | no |

---

## 1. The web magic-link entry point is not rate limited. REAL.

**The evidence.** Both mobile sign-in routes throttle by IP and by email
(`api/mobile/signin/route.ts:19-20`, `api/mobile/signin/verify/route.ts:18-19`).
`api/auth/[...auth]/route.ts`, the Auth.js catch-all that handles the WEB
issuance and callback, contains no `rateLimit` call at all.

**Why it matters more than it looks.** The token is deliberately short so
it can be typed into the installed PWA: eight characters, base31, which
`auth/config.ts:139-142` states as about 40 bits. The same comment
justifies that choice with three legs: "Single-use + short expiry +
rate-limited entry keep the shorter token safe." **On the web path the
third leg does not exist.** The control is named in the code's own
reasoning and absent on the primary surface.

**Honest bounding.** 31^8 is about 8.5e11, so online guessing against a
known email address is not a practical attack at any plausible request
rate. The finding is not "this is exploitable today"; it is that a
stated control is missing where the document says it is present, and
that email-bombing an address through the web form is unthrottled while
the mobile form is.

**The fix is small** (the same `rateLimit` calls, keyed on IP and on the
submitted identifier, inside the route's POST path before delegating to
Auth.js) and it changes behaviour, so it waits on your word.

## 2. `rateLimit` fails OPEN. REAL, and it is a decision already made.

`lib/rate-limit.ts:22-31` catches every error and returns `true`. The
header says why: "fail OPEN on Redis trouble: sign-in availability beats
a perfect limiter". That is a defensible call and it is written down,
which is the right posture.

**Raised because an assessor will raise it**, and because the tradeoff's
inputs change: when the reasoning was written there were no real
households. Anyone who can degrade Redis removes every throttle in the
system at once, including the one protecting the token in finding 1.
**Your call, not an engineering one**; the alternative is failing closed
on the sign-in path only, which trades a sign-in outage for a throttle
that cannot be shrugged off.

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

**The fix is two lines** (refuse when the first two bytes are not
`FF D8`), and it is the kind of change that could reject a real photo
from a client we have not met, so it waits on your word.

## 4. Dependency advisories. REAL, low.

`pnpm audit` reports **nine advisories, all moderate**, plus two the
existing overrides already ignore. Counted from the JSON rather than
the table.

**Only two reach shipped runtime code:**

- `@opentelemetry/core`, patched at >=2.8.0, entering through
  `apps/web` and `services/worker`.
- `postcss`, patched at >=8.5.23; the existing override pins >=8.5.18,
  so the pin is stale rather than absent.

**The other seven enter through `apps/hm-mobile`** (the Expo toolchain:
`uuid`, `undici` three times, `@xmldom/xmldom` twice), which is
build-and-development tooling for an app that cannot ship until the
Apple Developer enrollment. Real, and not on any path a member or an
attacker reaches today.

**Recommendation:** bump the two runtime ones by override, leave the
Expo chain to Expo's own upgrade, and say so in the assessor packet
rather than letting the raw `pnpm audit` output imply eleven live
problems.

## 5. The upload's silent no-op. REAL, not a security finding.

`api/mobile/upload/route.ts:44-48` inserts with
`onConflictDoNothing({ target: visitPhoto.id })` and then returns
`{ ok: true, photoId }` unconditionally. **The conflict path is the
right security behaviour**: a field HOM supplying another household's
photo id overwrites nothing. But the caller is told the upload
succeeded when nothing was written.

This is the G-68 class one layer down: a confirmation that proves the
code path ran and not that the row landed. Reported here because it was
found here; it belongs in the register rather than in the assessment.

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
