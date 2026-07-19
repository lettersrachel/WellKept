import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { visitPhoto } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getPrincipal, CORPORATE_ROLES } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";

const STAFF = new Set(["house_manager", "backup_hm", ...CORPORATE_ROLES]);

/**
 * Serve a visit photo's bytes — only to a staff member assigned to that photo's
 * household, with the second factor cleared. Visit photos are internal (not on
 * the client's curated view), so clients don't get this route. Usable as an
 * <img src> in the corporate visit view.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const [row] = await db.select().from(visitPhoto).where(eq(visitPhoto.id, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const principal = await getPrincipal(row.householdId);
  if (!principal || !STAFF.has(principal.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const buf = Buffer.from(row.data, "base64");
  return new NextResponse(buf, {
    status: 200,
    headers: { "content-type": row.contentType, "cache-control": "private, max-age=3600" },
  });
}
