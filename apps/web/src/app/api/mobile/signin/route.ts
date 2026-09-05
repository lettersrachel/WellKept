import { NextRequest, NextResponse } from "next/server";
import { sendSigninEmail } from "@/lib/auth/send-signin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Standalone mobile sign-in, step 1: email in, sign-in email out (magic
 * link + typed code). Unauthenticated by nature, so throttled per IP and
 * per address, and the response is the same whether or not the address
 * exists (no account enumeration). The app then collects the emailed code
 * plus the authenticator code and calls /api/mobile/signin/verify.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`signin:ip:${ip}`, 10, 3600, "closed"),
    rateLimit(`signin:email:${email.toLowerCase()}`, 5, 3600, "closed"),
  ]);
  if (!ipOk || !emailOk) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }
  const sent = await sendSigninEmail(req.nextUrl, email);
  if (!sent) return NextResponse.json({ error: "send failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
