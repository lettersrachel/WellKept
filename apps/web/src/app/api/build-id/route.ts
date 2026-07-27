import { NextResponse } from "next/server";

// G-37: the server half of the skew heartbeat. Whatever deployment is
// LIVE answers with its own baked build id; a page whose client bundle
// carries a different id was built before the last deploy. Public and
// harmless by design (a commit sha, no data) — same class as /api/health.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown" },
    { headers: { "cache-control": "no-store" } },
  );
}
