import Link from "next/link";
import { redirect } from "next/navigation";
import { CORPORATE_ROLES } from "@/lib/session";
import { getAssignedHouseholds } from "@/lib/data";
import { operationalHealth, type Verdict } from "@/lib/operational-health";

export const dynamic = "force-dynamic";

/**
 * Part Five item 1 of the comprehensive instruction: one operational
 * health surface with a stated alerting posture.
 *
 * Corporate-only, and it carries NO household data at all: four counts
 * and four timestamps about the machinery. That is deliberate, because a
 * page whose job is to be opened during an incident should not be a page
 * that shows a member's record to whoever is holding the laptop.
 *
 * The alerting posture is rendered rather than assumed. See the module
 * for why it is stated in two places.
 */
const TONE: Record<Verdict, { label: string; className: string }> = {
  ok: { label: "OK", className: "ok" },
  attention: { label: "NEEDS ATTENTION", className: "warn" },
  unknown: { label: "NO READING", className: "prov" },
  "threshold-unset": { label: "THRESHOLD UNSET", className: "prov" },
};

export default async function OperationalHealth() {
  const assigned = await getAssignedHouseholds();
  if (assigned.filter((a) => CORPORATE_ROLES.has(a.role)).length === 0) redirect("/");

  const signals = await operationalHealth();
  const attention = signals.filter((s) => s.verdict === "attention");

  return (
    <div className="card">
      <h2>Operational health</h2>

      <div className="note">
        <strong>Alerting posture: there is none, and that is the honest
        statement rather than a gap nobody mentioned.</strong> Nothing here
        pages, emails, or writes to the notification firewall. This is a
        page a person opens. It is written down because a health surface
        that looks like monitoring and is not turns &ldquo;we are not
        watching&rdquo; into &ldquo;we watched and it was fine&rdquo;.
      </div>

      {attention.length > 0 ? (
        <div className="warn">
          {attention.length === 1
            ? "One signal needs attention."
            : `${attention.length} signals need attention.`}{" "}
          Each is a value whose correct reading is zero, so this is a fact
          rather than a threshold judgment.
        </div>
      ) : (
        <div className="prov">
          No signal is reading as a fault. Two of the four cannot report one
          at all until a threshold is set, so read the rows rather than this
          line.
        </div>
      )}

      {signals.map((s) => (
        <div key={s.key} style={{ marginTop: 18 }}>
          <div className="eyebrow">{s.label}</div>
          <div className={TONE[s.verdict].className}>{TONE[s.verdict].label}</div>
          <div>{s.reading}</div>
          <div className="prov">{s.note}</div>
        </div>
      ))}

      <div className="note" style={{ marginTop: 22 }}>
        What this page does NOT cover, so its quiet is not over-read: the
        Railway worker&rsquo;s own process (the drain lag infers liveness from
        a write and cannot see a worker that starts and fails before
        writing), Vercel and Neon platform state, the S3 and KMS
        dependencies, and whether a consumer that processed a row processed
        it CORRECTLY. Progress is not correctness.
      </div>

      <p style={{ marginTop: 18 }}>
        <Link href="/oversight/board">Corporate board</Link>{" "}
        <Link href="/oversight">Fleet board</Link>
      </p>
    </div>
  );
}
