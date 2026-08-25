import { NextRequest, NextResponse } from "next/server";
import { getHouseholdAndPrincipalById } from "@/lib/data";
import { staffMfaCleared } from "@/lib/totp";
import { composeFieldBrief, recordAndDeliverBrief } from "@/lib/field-brief";

// AJ decision (founder, 2026-07-28, option 2): the briefing serves
// whoever runs the visit, including the admin covering one.
const FIELD_ROLES = new Set(["house_manager", "backup_hm", "corporate_admin"]);

/**
 * The pre-visit briefing for the native app — the same "brief from the live
 * record" the web /visit page shows, as JSON. Composition lives in
 * lib/field-brief.ts (the Cockpit unification pass): ONE composer for both
 * surfaces, so the section 2.1 snapshot evidences the same brief wherever
 * it was shown. Role-filtered by the permission core and gated by the staff
 * second factor, exactly like every other field surface. LIFE-EVENT holds
 * the prompts.
 */
export async function GET(req: NextRequest) {
  const householdId = req.nextUrl.searchParams.get("householdId") ?? "";
  if (!householdId) return NextResponse.json({ error: "missing householdId" }, { status: 400 });

  const { hh, principal } = await getHouseholdAndPrincipalById(householdId);
  if (!hh || !principal || !FIELD_ROLES.has(principal.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const composed = await composeFieldBrief(hh, principal, {
    strangerRequested: req.nextUrl.searchParams.get("stranger") === "1",
  });
  await recordAndDeliverBrief(hh, principal, composed);
  return NextResponse.json(composed.payload);
}
