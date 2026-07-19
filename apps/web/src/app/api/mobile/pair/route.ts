import { NextRequest, NextResponse } from "next/server";
import { redeemPairingCode } from "@/lib/mobile-pair";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Exchange a device-pairing code (minted on the web by an MFA-cleared staff
 * member) for a mobile session. The code IS the credential here, so the
 * endpoint is unauthenticated but rate-limited per IP; a code is high-entropy,
 * single-use, and expires in minutes. Returns the session token the app stores
 * in the device keychain, plus the house-manager households to choose from.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`pair:ip:${ip}`, 20, 3600))) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const session = await redeemPairingCode(code);
  if (!session) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }
  return NextResponse.json(session);
}
