import { eq } from "drizzle-orm";
import { appSetting } from "./tables";

/**
 * CAND-REL-01 (assigned week one, founder inputs section 3): feature
 * flags and kill switches, riding the established app_setting knob path
 * (founder-set, the visit_reconciliation and flag_promotion pattern) so
 * no migration and no new dependency are spent on the mechanism.
 *
 * One setting row, key "feature_flags", value an object of flag name to
 * boolean. Semantics:
 * - A feature that ships dark declares `featureEnabled(db, name)` with
 *   the default fallback false: absent means OFF.
 * - A kill switch is the same read with fallback true: the feature runs
 *   until the founder sets the flag false, and the read happens per use,
 *   so an emergency off takes effect on the next request, no deploy.
 * - A malformed row resolves to the DECLARED fallback, loudly: config
 *   corruption never silently flips a feature, in either direction. The
 *   shadow engine's A0 authority cap is NOT a flag; it is enforced in
 *   code (WK-DEV-007 section 3) and no setting row can raise it.
 *
 * Progressive rollout and rollback tooling beyond on/off are deferred
 * until something needs them; at pilot scale a boolean read per surface
 * is the whole requirement.
 */
type DbLike = {
  select: () => { from: (t: unknown) => { where: (c: unknown) => Promise<Array<{ value: unknown }>> } };
};

export async function readFeatureFlags(db: DbLike): Promise<Record<string, boolean>> {
  const [row] = await db.select().from(appSetting).where(eq(appSetting.key, "feature_flags"));
  if (!row) return {};
  const value = row.value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    console.error("[feature-flags] app_setting feature_flags is not an object; every flag resolves to its declared fallback");
    return {};
  }
  const flags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "boolean") flags[k] = v;
    else console.error(`[feature-flags] flag "${k}" is not a boolean; it resolves to its declared fallback`);
  }
  return flags;
}

export async function featureEnabled(db: DbLike, name: string, fallback = false): Promise<boolean> {
  const flags = await readFeatureFlags(db);
  return flags[name] ?? fallback;
}
