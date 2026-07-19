import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { playbookField, visitCommand, strangerTest } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { staffMfaCleared } from "@/lib/totp";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";

/**
 * REQ-044: exhibit-pack feed. CSV in the WK_SBA exhibit shape: one row per
 * household the caller is corporately assigned to. Hours come from applied
 * visit payloads (captured, HM-confirmed — never geofence-only, REQ-036).
 */
export async function GET() {
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // REQ-003: bulk fleet export requires the staff second factor too.
  if (!(await staffMfaCleared())) return NextResponse.json({ error: "second factor required" }, { status: 403 });

  const header = "household,tier,status_tag,fields_total,fields_confirmed,visits_applied,visit_hours,conflicts,life_change_signals,last_stranger_test,stranger_result";
  const lines = [header];
  for (const { hh } of corporate) {
    const [fields, commands, tests] = await Promise.all([
      db.select({ confirmed: playbookField.confirmed }).from(playbookField).where(eq(playbookField.householdId, hh.id)),
      db.select().from(visitCommand).where(eq(visitCommand.householdId, hh.id)),
      db.select().from(strangerTest).where(and(eq(strangerTest.householdId, hh.id))),
    ]);
    const applied = commands.filter((c) => c.type === "visit.submit" && c.status === "applied");
    const hours = applied.reduce((sum, c) => {
      const p = c.payload as { hours?: { startedAt?: string; endedAt?: string } };
      if (!p.hours?.startedAt || !p.hours.endedAt) return sum;
      return sum + (+new Date(p.hours.endedAt) - +new Date(p.hours.startedAt)) / 3_600_000;
    }, 0);
    const lastTest = tests[tests.length - 1];
    const esc = (s: string) => `"${s.replaceAll('"', '""')}"`;
    lines.push([
      esc(hh.name),
      hh.tier,
      hh.statusTag,
      fields.length,
      fields.filter((f) => f.confirmed).length,
      applied.length,
      hours.toFixed(2),
      commands.filter((c) => c.status === "conflict").length,
      commands.filter((c) => c.type === "signal.route").length,
      lastTest ? lastTest.createdAt.toISOString().slice(0, 10) : "",
      lastTest ? (lastTest.passed ? "pass" : "friction") : "",
    ].join(","));
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wk_exhibit_fleet_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
