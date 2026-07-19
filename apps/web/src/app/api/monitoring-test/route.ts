import { NextRequest, NextResponse } from "next/server";

/**
 * TEMPORARY — verifies Sentry captures a real server error in production.
 * Throws only when called with ?verify=wk (so it isn't a stray 500 magnet).
 * Remove after confirming the event lands in Sentry.
 */
export function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("verify") === "wk") {
    throw new Error("Well Kept — production monitoring verification (safe to resolve)");
  }
  return NextResponse.json({ ok: true, note: "monitoring test route; append ?verify=wk to trigger" });
}
