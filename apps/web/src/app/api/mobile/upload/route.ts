import { NextRequest, NextResponse } from "next/server";
import { visitPhoto } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BASE64 = 3_000_000; // ~2.2 MB decoded — capture is compressed on device

/**
 * Visit photo upload (REQ-032). A field-role, MFA-cleared house manager uploads
 * a base64 image tied to their household and the client-generated photo id the
 * close flow already carries — so a photo captured offline uploads on the same
 * sync as the visit and lines up by id. Stored private in Postgres; retrieved
 * only through the auth-gated GET below.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { householdId?: string; photoId?: string; contentType?: string; base64?: string }
    | null;
  if (!body?.householdId || !body.photoId || !body.contentType || !body.base64) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!ALLOWED.has(body.contentType)) return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  if (body.base64.length > MAX_BASE64) return NextResponse.json({ error: "too large" }, { status: 413 });

  const principal = await getPrincipal(body.householdId);
  if (!principal || !FIELD_ROLES.has(principal.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const bytes = Math.floor((body.base64.length * 3) / 4);
  // Idempotent on the photo id: a retried sync re-uploads the same photo once.
  await db
    .insert(visitPhoto)
    .values({ id: body.photoId, householdId: body.householdId, contentType: body.contentType, data: body.base64, bytes, uploadedBy: principal.userId })
    .onConflictDoNothing({ target: visitPhoto.id });

  return NextResponse.json({ ok: true, photoId: body.photoId });
}
