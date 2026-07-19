import { Auth } from "@auth/core";
import { getAuthConfig } from "@/lib/auth/config";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Fronts Auth.js's CSRF-protected /api/auth/signin/email with a plain-form
 * endpoint: does the csrf-token-then-signin exchange server-to-server so the
 * form only POSTs an email. Synthetic requests are built from the REAL
 * incoming request URL — Auth.js embeds that origin into the magic link it
 * generates, and a made-up origin produces an unreachable link (a real bug
 * caught by hand in the foundation repo).
 */
export async function POST(request: Request) {
  const authConfig = getAuthConfig();
  const formData = await request.formData();
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return Response.redirect(new URL("/signin?error=missing-email", request.url), 303);
  }

  // Sprint-10 hardening: throttle magic-link requests per IP and per
  // address (email bombing / enumeration). Fails open on Redis trouble.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`signin:ip:${ip}`, 10, 3600),
    rateLimit(`signin:email:${email.toLowerCase()}`, 5, 3600),
  ]);
  if (!ipOk || !emailOk) {
    return Response.redirect(new URL("/signin?error=rate-limited", request.url), 303);
  }

  const csrfResponse = await Auth(new Request(new URL("/api/auth/csrf", request.url)), authConfig);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const csrfCookie = csrfResponse.headers
    .getSetCookie()
    .find((line) => line.includes("csrf-token"))
    ?.split(";")[0];

  const signinResponse = await Auth(
    new Request(new URL("/api/auth/signin/email", request.url), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfCookie ?? "" },
      body: new URLSearchParams({ email, csrfToken }).toString(),
    }),
    authConfig,
  );

  // Auth.js reports a failed send as a redirect to its error page; surface
  // it instead of promising an email that never left (a silent lockout).
  const location = signinResponse.headers.get("location") ?? "";
  if (location.includes("error=")) {
    return Response.redirect(new URL("/signin?error=send-failed", request.url), 303);
  }
  return Response.redirect(new URL("/verify-request", request.url), 303);
}
