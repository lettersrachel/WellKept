import { Auth } from "@auth/core";
import { normalizeBackupCode } from "@wellkept/totp";
import { getAuthConfig } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Sign in by typing the emailed code instead of clicking the link — the
 * installed-PWA path, where the magic link would open Safari and strand the
 * session in the wrong browser. The code IS the verification token; this
 * route normalizes it, exchanges it against Auth.js's email callback
 * server-to-server (same pattern as /signin/action), and forwards the
 * session cookie, so sign-in completes entirely inside the app that asked.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");
  const rawCode = formData.get("code");
  if (typeof email !== "string" || !email || typeof rawCode !== "string" || !rawCode) {
    return Response.redirect(new URL("/verify-request?error=missing", request.url), 303);
  }

  // Throttle guesses hard: the code is short enough to type, so entry gets
  // the same discipline as TOTP challenges. FAILS CLOSED since the 5
  // September ruling. The SAME KEYS are used by the emailed link's own
  // callback (api/auth/[...auth]), deliberately: the token has two entry
  // paths and one shared budget, so an attacker cannot get five guesses
  // here and five more there.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`signincode:ip:${ip}`, 10, 900, "closed"),
    rateLimit(`signincode:email:${email.toLowerCase()}`, 5, 900, "closed"),
  ]);
  if (!ipOk || !emailOk) {
    return Response.redirect(new URL(`/verify-request?error=rate-limited&email=${encodeURIComponent(email)}`, request.url), 303);
  }

  const token = normalizeBackupCode(rawCode);
  const callbackUrl = new URL("/api/auth/callback/email", request.url);
  callbackUrl.searchParams.set("email", email);
  callbackUrl.searchParams.set("token", token);
  callbackUrl.searchParams.set("callbackUrl", new URL("/", request.url).toString());

  const authResponse = await Auth(new Request(callbackUrl), getAuthConfig());
  const location = authResponse.headers.get("location") ?? "";
  const failed = location.includes("error=");

  const target = failed
    ? new URL(`/verify-request?error=bad-code&email=${encodeURIComponent(email)}`, request.url)
    : new URL(location || "/", request.url);
  const out = new Response(null, { status: 303, headers: { Location: target.toString() } });
  if (!failed) {
    for (const cookie of authResponse.headers.getSetCookie()) out.headers.append("Set-Cookie", cookie);
  }
  return out;
}
