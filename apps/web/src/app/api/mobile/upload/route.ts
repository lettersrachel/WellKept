import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { visitPhoto } from "@wellkept/schema";
import { db } from "@/lib/db";
import { getPrincipal } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";
import { stripJpegMetadata } from "@/lib/jpeg-strip";

const FIELD_ROLES = new Set(["house_manager", "backup_hm"]);
// Input spine build 1 (photo rules): JPEG only. Both real clients (the
// wizard's canvas, the mobile ImageManipulator) transcode to JPEG on
// device, and JPEG is the format the server can strip metadata from
// without a native dependency. Accepting HEIC/WebP again is a
// register-visible decision (it needs sharp or equivalent to strip).
const ALLOWED = new Set(["image/jpeg"]);
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

  // THE DECLARED TYPE IS NOT THE BYTES, and the difference is the whole
  // point of this check (security self-audit finding 3, founder ruling 5
  // September 2026). `contentType` above is whatever the client said.
  // `stripJpegMetadata` returns its input UNTOUCHED when the SOI marker is
  // absent, which is right for a stripper and wrong to rely on: a HEIC or
  // PNG labelled image/jpeg would be stored whole, with whatever GPS its
  // container carries, and the strip would silently do nothing. So the
  // bytes are checked here, and a non-JPEG is REFUSED rather than stored
  // unstripped. That is what makes the promise below unconditional.
  const raw = Buffer.from(body.base64, "base64");
  if (raw.length < 4 || raw[0] !== 0xff || raw[1] !== 0xd8) {
    return NextResponse.json({ error: "not a jpeg" }, { status: 415 });
  }

  // Enforcement of the capture rule the clients already follow: EXIF and
  // XMP (where GPS lives) and comments are stripped at the boundary, so a
  // photo taken inside a member's home never stores its location, whatever
  // client sent it.
  const stripped = stripJpegMetadata(raw);
  const data = stripped.toString("base64");
  // Idempotent on the photo id: a retried sync re-uploads the same photo once.
  // THE CONFLICT PATH NO LONGER CLAIMS SUCCESS (self-audit finding 5). The
  // conflict is the right SECURITY behaviour, since a field HOM supplying
  // another household's photo id overwrites nothing; what was wrong is that
  // the caller was told the upload landed when nothing was written, which is
  // the G-68 class one layer down. `stored` distinguishes the three real
  // outcomes: written now, already present from an earlier sync, or refused.
  const inserted = await db
    .insert(visitPhoto)
    .values({ id: body.photoId, householdId: body.householdId, contentType: body.contentType, data, bytes: stripped.length, uploadedBy: principal.userId })
    .onConflictDoNothing({ target: visitPhoto.id })
    .returning({ id: visitPhoto.id });

  if (inserted.length === 0) {
    // The id already exists. A retried sync of the SAME photo is the normal
    // case and is success; an id belonging to another household is not, and
    // the two are told apart by reading the row rather than assuming.
    const [existing] = await db.select({ householdId: visitPhoto.householdId }).from(visitPhoto).where(eq(visitPhoto.id, body.photoId));
    if (existing?.householdId === body.householdId) {
      return NextResponse.json({ ok: true, photoId: body.photoId, stored: "already" });
    }
    return NextResponse.json({ error: "photo id already in use" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, photoId: body.photoId, stored: "written" });
}
