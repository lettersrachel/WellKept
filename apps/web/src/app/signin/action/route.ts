import { sendSigninEmail } from "@/lib/auth/send-signin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Fronts Auth.js's CSRF-protected /api/auth/signin/email with a plain-form
 * endpoint (the exchange itself lives in lib/auth/send-signin, shared with
 * the mobile sign-in endpoint).
 */
export async function POST(request: Request) {
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

  // A failed send surfaces instead of promising an email that never left
  // (a silent lockout).
  const sent = await sendSigninEmail(request.url, email);
  if (!sent) {
    return Response.redirect(new URL("/signin?error=send-failed", request.url), 303);
  }
  return Response.redirect(new URL(`/verify-request?email=${encodeURIComponent(email)}`, request.url), 303);
}
