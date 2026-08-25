/**
 * seed-tasks.ts : the provisional task list (pnpm db:tasks).
 *
 * WK-DEV-008 section 4: WL Gate 0 is blocked founder-side on the
 * canonical Task Inventory (v1.3 locate-or-reconstruct), and Gate 1
 * objects "may build against a provisional task list seeded from the
 * active playbooks and the HZ/HO records, flagged provisional in the
 * schema". This seed is that list's first honest slice: the four tasks
 * the close flow ACTIVELY requires today (the wizard's REQUIRED_TASKS,
 * the only task list live in the product), each provisional by
 * structure. It is deliberately NOT a reconstruction of the 344-task
 * catalog: the reconstruction finding stands, and canonical identities
 * arrive only through the founder's ruling and its loader. Idempotent
 * by the name unique index; re-running adds nothing.
 *
 * Usage: pnpm db:tasks --author admin@example.com
 * (the authoring corporate identity; required, never defaulted.)
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { authUser, taskDefinition } from "./tables.ts";

const argv = process.argv.slice(2);
const i = argv.indexOf("--author");
const author = i >= 0 ? argv[i + 1] : undefined;
if (!author || !author.includes("@")) {
  console.error("REFUSED: --author is required (the corporate identity's email this seed writes as).");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);
const [user] = await db.select().from(authUser).where(eq(authUser.email, author));
if (!user) {
  console.error(`REFUSED: no user with email ${author}; the author must already exist.`);
  await pool.end();
  process.exit(1);
}

// The active list: what the close flow requires on every visit today.
const TASKS = [
  { name: "Kitchen reset to zone standard", description: "The close flow's standing kitchen requirement." },
  { name: "Linen rotation, primary and guest", description: "The close flow's standing linen requirement." },
  { name: "Bins staged for collection", description: "The close flow's standing waste requirement." },
  { name: "Full walkthrough, rear gate latch checked", description: "The close flow's standing walkthrough requirement." },
];
let added = 0;
for (const t of TASKS) {
  const res = await db.insert(taskDefinition).values({
    id: randomUUID(), name: t.name, description: t.description, createdBy: user.id,
  }).onConflictDoNothing({ target: taskDefinition.name }).returning({ id: taskDefinition.id });
  added += res.length;
}
console.log(`provisional task definitions: ${added} added (idempotent; all provisional until the Task Inventory ruling)`);
await pool.end();
