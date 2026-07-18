/**
 * Dev tool: enqueue events against the running worker.
 *   node src/fire-test-event.ts medication            # field-change now
 *   node src/fire-test-event.ts school 2026-07-18T03:30:00Z --dup
 *   node src/fire-test-event.ts --tag STEADY          # tag-change event
 */
import { Queue } from "bullmq";
import pg from "pg";

const queue = new Queue("field-events", { connection: { url: "redis://localhost:6379" } });
const pool = new pg.Pool({ connectionString: "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept" });
const args = process.argv.slice(2);
const { rows: [hh] } = await pool.query("SELECT id, status_tag FROM household LIMIT 1");

if (args[0] === "--tag") {
  await queue.add("tag-change", { householdId: hh.id, to: args[1] });
  console.log(`tag-change -> ${args[1]} enqueued`);
} else {
  const pattern = args[0] ?? "medication";
  const changedAt = args[1] && !args[1].startsWith("--") ? args[1] : new Date().toISOString();
  const dup = args.includes("--dup");
  const { rows: [field] } = await pool.query(
    "SELECT id, name, section FROM playbook_field WHERE lower(name) LIKE $1 LIMIT 1",
    [`%${pattern}%`],
  );
  console.log("household:", hh.id, hh.status_tag, "| field:", field.name.slice(0, 50));
  const event = {
    householdId: hh.id,
    fieldId: field.id,
    fieldName: field.name,
    section: field.section,
    newValue: "Updated by fire-test-event",
    changedAt,
  };
  await queue.add("field-change", event);
  if (dup) await queue.add("field-change", event); // redelivery simulation
  console.log(`event enqueued${dup ? " twice (dup test)" : ""} changedAt=${changedAt}`);
}
await queue.close();
await pool.end();
