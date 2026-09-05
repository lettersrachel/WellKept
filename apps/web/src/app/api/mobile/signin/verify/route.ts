import { NextRequest, NextResponse } from "next/server";
import { verifyMobileSignin } from "@/lib/mobile-signin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Standalone mobile sign-in, step 2: emailed code + authenticator code in,
 * device session out (same response shape the pairing exchange returns, so
 * the app stores it identically). TOTP-grade throttles; an unstepped-up
 * session is never minted (see verifyMobileSignin).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string; totp?: string };
  if (!body.email || !body.code) {
    return NextResponse.json({ error: "missing email or code" }, { status: 400 });
  }
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`msignin:ip:${ip}`, 10, 900, "closed"),
    rateLimit(`msignin:email:${body.email.toLowerCase()}`, 5, 900, "closed"),
  ]);
  if (!ipOk || !emailOk) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }
  const result = await verifyMobileSignin(req.nextUrl, body.email, body.code, body.totp);
  if (!result.ok) {
    const message = result.needs === "enrollment"
      ? "Finish setting up your authenticator on the web first, then sign in here."
      : result.needs === "totp"
        ? "Enter the 6-digit code from your authenticator app."
        : "That emailed code did not work. Codes expire after an hour and work once.";
    return NextResponse.json({ error: message, needs: result.needs }, { status: 401 });
  }
  return NextResponse.json({ sessionToken: result.sessionToken, userId: result.userId, households: result.households });
}
