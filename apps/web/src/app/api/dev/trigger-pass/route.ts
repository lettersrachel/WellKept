import { NextRequest, NextResponse } from "next/server";
import { runTriggerPass } from "@wellkept/trigger-engine";
import { db } from "@/lib/db";

/**
 * Dev/test only — 404 in production, same gate as /dev/last-email. Runs the
 * REAL scheduler path (rule evaluation → exclusion filter → floor bypass →
 * idempotent insert) for a synthetic field-change event, so the live-stack
 * assertions (gap register G-05: exclusions never suppress a floor) can
 * exercise the actual code that schedules prompts, not a reimplementation.
 * The response carries the pass counts; the asserting test reads the
 * resulting prompt_pack_item rows straight from the database.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as {
    householdId?: string; fieldId?: string; fieldName?: string;
    section?: number; newValue?: string; changedAt?: string;
  } | null;
  if (!body?.householdId || !body.fieldName) {
    return NextResponse.json({ error: "missing householdId/fieldName" }, { status: 400 });
  }
  const result = await runTriggerPass(db, {
    householdId: body.householdId,
    fieldId: body.fieldId ?? crypto.randomUUID(),
    fieldName: body.fieldName,
    section: body.section ?? 1,
    newValue: body.newValue ?? "probe",
    changedAt: body.changedAt ?? new Date().toISOString(),
  });
  return NextResponse.json(result);
}
