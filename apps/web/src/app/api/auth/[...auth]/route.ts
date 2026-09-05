import { Auth } from "@auth/core";
import { getAuthConfig } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Auth.js: magic-link callback, session, csrf, signout.
 *
 * THE EMAILED LINK'S CALLBACK IS THROTTLED HERE, and the rest is a pure
 * pass-through (founder ruling, 5 September 2026, on the security
 * self-audit).
 *
 * Why only the callback. The sign-in token has TWO entry paths: a person
 * types the code into /signin/code, or clicks the link and lands on
 * /api/auth/callback/email. /signin/code has always throttled by IP and
 * address; this one never did, so the discipline could simply be walked
 * around by using the other door with the same token.
 *
 * THE KEYS ARE THE SAME KEYS /signin/code USES, deliberately. Separate
 * budgets would hand an attacker five guesses at one door and five more
 * at the other, which is the shape that makes two controls weaker than
 * one. /signin/code calls Auth() in process rather than fetching this
 * route, so it spends its budget once and not twice.
 *
 * Nothing else here is throttled: session and csrf are read by every
 * page render, and a limit on those would be an outage rather than a
 * control.
 */
const EMAIL_CALLBACK = "/api/auth/callback/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === EMAIL_CALLBACK) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const email = (url.searchParams.get("email") ?? "").toLowerCase();
    const [ipOk, emailOk] = await Promise.all([
      rateLimit(`signincode:ip:${ip}`, 10, 900, "closed"),
      // An absent address still consumes the IP budget above; keying the
      // address bucket on the empty string would pool every anonymous
      // attempt into one shared counter, which throttles real people
      // rather than the guesser.
      email ? rateLimit(`signincode:email:${email}`, 5, 900, "closed") : Promise.resolve(true),
    ]);
    if (!ipOk || !emailOk) {
      const back = new URL("/verify-request", request.url);
      back.searchParams.set("error", "rate-limited");
      if (email) back.searchParams.set("email", email);
      return Response.redirect(back, 303);
    }
  }
  return Auth(request, getAuthConfig());
}

export async function POST(request: Request) { return Auth(request, getAuthConfig()); }
