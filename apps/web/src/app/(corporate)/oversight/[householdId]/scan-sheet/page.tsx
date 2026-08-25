import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { registryEntry, household } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { getPrincipal } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * WK-DEV-009 section 3.3, the physical half: one sheet per household
 * listing each asset's context path, so the founder encodes them with
 * any QR generator and prints labels. The pinned stack gains no
 * dependency for QR rendering; the ENCODER is a founder tool, the
 * CONTEXT is the product (the /context route), and a scanned code is
 * just this path on the production origin.
 */
export default async function ScanSheet({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params;
  const [hh] = await db.select().from(household).where(eq(household.id, householdId));
  if (!hh) redirect("/oversight");
  const principal = await getPrincipal(householdId);
  if (!principal) redirect("/signin");
  if (!CORPORATE_ROLES.has(principal.role)) redirect("/");

  const entries = await db.select().from(registryEntry).where(and(
    eq(registryEntry.householdId, householdId), isNull(registryEntry.tombstonedAt)));
  const scannable = entries.filter((e) => ["appliance", "vendor", "subscription"].includes(e.kind));

  return (
    <div className="wrap">
      <div className="card">
        <h2><Link href={`/oversight/${householdId}`} style={{ color: "var(--grey)", textDecoration: "none" }}>{hh.name}</Link> · Scan sheet</h2>
        <div className="note">
          Encode each path below against the production origin with any QR
          generator, print, and place with the object. Scanning opens the
          operational context (facts, clocks, open history, capture), never
          a label page. s2-labeled entries stay role-gated at the context
          route itself; the code on a shelf reveals nothing by existing.
        </div>
        {scannable.length === 0 && <div className="prov">No asset entries on this household yet.</div>}
        {scannable.map((e) => (
          <div key={e.id} className="field">
            <span className="fname">{e.label}
              <span className="prov" style={{ marginLeft: 8 }}>{e.kind} · {e.sensitivity}</span>
            </span>
            <div className="fval sans" style={{ fontSize: 13 }}>/context/{e.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
