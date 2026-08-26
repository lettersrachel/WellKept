import Link from "next/link";
import { redirect } from "next/navigation";
import { isNull } from "drizzle-orm";
import { taskDefinition } from "@wellkept/schema";
import { CORPORATE_ROLES } from "@/lib/session";
import { db } from "@/lib/db";
import { getAssignedHouseholds } from "@/lib/data";
import { createTaskDefinition } from "@/lib/actions";
import { RefusalBanner } from "@/components/RefusalBanner";
import { RecordedBanner } from "@/components/RecordedBanner";

export const dynamic = "force-dynamic";

/**
 * WL Gate 1 opener: the global task-definition library, reusable work
 * semantics across households (no member data lives here). Everything
 * is PROVISIONAL until the founder's Task Inventory ruling; the flip to
 * canonical happens only through that ruling's loader, never a form,
 * and the database CHECK holds the two states apart.
 */
export default async function TaskDefinitions({ searchParams }: {
  searchParams: Promise<{ refused?: string; recorded?: string }>;
}) {
  const { refused, recorded } = await searchParams;
  const assigned = await getAssignedHouseholds();
  const corporate = assigned.filter((a) => CORPORATE_ROLES.has(a.role));
  if (corporate.length === 0) redirect("/");
  const isAdmin = assigned.some((a) => a.role === "corporate_admin");

  const defs = await db.select().from(taskDefinition)
    .where(isNull(taskDefinition.tombstonedAt))
    .orderBy(taskDefinition.name);

  return (
    <div className="wrap">
      <RefusalBanner reason={refused} />
      <RecordedBanner what={recorded} />
      <div className="card">
        <div className="row" style={{ alignItems: "baseline", gap: 10 }}>
          <h2 style={{ flex: 1 }}>Task definitions (WL Gate 1)</h2>
          <Link className="pill" href="/oversight">Fleet board</Link>
        </div>
        <div className="note">
          Reusable work semantics, global by design: how a task manifests in
          one household is the Household Task Profile, a later Gate 1 object.
          Every definition is provisional until the Task Inventory ruling
          (WK-DEV-008 section 4, founder-side); canonical ids arrive through
          that ruling&apos;s loader only, and no evidence row binds permanently
          to an id that may renumber.
        </div>
        {defs.length === 0 && <div className="prov">No definitions yet; pnpm db:tasks seeds the active close-flow list.</div>}
        {defs.map((d) => (
          <div key={d.id} className="field">
            <span className="fname">{d.name}
              <span className="prov" style={{ marginLeft: 8 }}>
                {d.provisional ? "PROVISIONAL (awaits the Task Inventory ruling)" : `canonical ${d.canonicalTaskId}`}
              </span>
            </span>
            {d.description && <div className="fval sans" style={{ fontSize: 13 }}>{d.description}</div>}
          </div>
        ))}
        {isAdmin && (
          <form action={createTaskDefinition} className="row" style={{ marginTop: 8, gap: 6, flexWrap: "wrap" }}>
            <input name="name" aria-label="Task name" placeholder="the task, as reusable semantics" required style={{ flex: 2, marginTop: 0, minWidth: 180 }} />
            <input name="description" aria-label="Task description" placeholder="what done means, in a sentence" style={{ flex: 3, marginTop: 0, minWidth: 200 }} />
            <button className="act">Add provisional definition</button>
          </form>
        )}
      </div>
    </div>
  );
}
