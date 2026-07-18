/** Upsert the three sprint-8 cascades into trigger_rule (idempotent). */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { triggerRule } from "@wellkept/schema";
import { CASCADES } from "./cascades.ts";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
const db = drizzle(pool);

for (const rule of CASCADES) {
  const existing = await db.select().from(triggerRule).where(eq(triggerRule.id, rule.id));
  if (existing.length) {
    await db.update(triggerRule)
      .set({ family: rule.family, bindsToFieldName: rule.bindsToFieldName, definition: rule.definition, enabled: rule.enabled, updatedAt: new Date() })
      .where(eq(triggerRule.id, rule.id));
  } else {
    await db.insert(triggerRule).values({
      id: rule.id,
      householdId: rule.householdId,
      family: rule.family,
      bindsToFieldName: rule.bindsToFieldName,
      definition: rule.definition,
      enabled: rule.enabled,
    });
  }
  console.log(`rule ${rule.definition.packName} upserted`);
}
await pool.end();
