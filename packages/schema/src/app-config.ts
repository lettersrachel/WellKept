// NO node:crypto import here: this module rides the schema index into
// client bundles (the events.ts precedent), so ids come from the
// global webcrypto.
import { eq, desc } from "drizzle-orm";
import { appSetting, appSettingVersion } from "./tables.ts";

/**
 * The ONE way a versioned knob changes (the emitOutboxEvent posture,
 * applied to configuration): the version row and the setting move in
 * the same transaction, every write names who and why, and an
 * unchanged value is a NO-OP rather than an empty version. Required
 * by the v5 intake ruling (section 3, audit C-06) for the capacity
 * configuration, and correct for every knob under STD-016 section 7's
 * see-what-was-changed-and-why doctrine.
 *
 * Existing knobs set before this path existed (visit_reconciliation,
 * flag_promotion) keep their unversioned history honestly: their
 * first write THROUGH this helper records the current stored value as
 * prior_value, so the chain starts true rather than pretending to
 * reach back.
 */
// The attention-sweep Db shape: any drizzle handle (db or tx)
// satisfies it, and the casts stay inside this one function.
type Db = {
  select: (...args: never[]) => unknown;
  insert: (...args: never[]) => unknown;
  update: (...args: never[]) => unknown;
};

// Postgres jsonb does not preserve key order, so a naive
// JSON.stringify equality reads a round-tripped value as changed and
// mints an empty version (caught live on db:capacity's second run:
// version 2 with an identical value). Canonical form sorts keys at
// every depth before comparing.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v !== null && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, val]) => `${JSON.stringify(k)}:${canonical(val)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(v);
}

export async function setAppSettingVersioned(
  tx: Db,
  input: { key: string; value: unknown; setBy: string; reason: string },
): Promise<{ changed: boolean; version: number }> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const t = tx as any;
  const [existing] = await t.select().from(appSetting).where(eq(appSetting.key, input.key));
  const prior = existing?.value ?? null;
  const [latest] = await t.select().from(appSettingVersion)
    .where(eq(appSettingVersion.key, input.key))
    .orderBy(desc(appSettingVersion.version)).limit(1);
  const priorVersion: number = latest?.version ?? 0;
  if (existing && canonical(prior) === canonical(input.value)) {
    return { changed: false, version: priorVersion };
  }
  const version = priorVersion + 1;
  await t.insert(appSettingVersion).values({
    id: crypto.randomUUID(), key: input.key, version,
    value: input.value, priorValue: prior,
    setBy: input.setBy, reason: input.reason,
  });
  if (existing) {
    await t.update(appSetting).set({ value: input.value, updatedAt: new Date() })
      .where(eq(appSetting.key, input.key));
  } else {
    await t.insert(appSetting).values({ key: input.key, value: input.value });
  }
  return { changed: true, version };
}

/**
 * The capacity configuration, VERBATIM from the v5 intake ruling
 * section 3 (audit C-06): cap=5 and band=3..5 households per HOM.
 * These constants exist ONLY as the loader's input; every reader
 * takes the stored knob, never this object (the never-hard-code half
 * of the ruling). THE CAP IS COVENANT-RELEVANT: any change to it is a
 * two-key model change BEFORE it is a config change, so this module
 * deliberately exposes no way to set a different cap; a new value
 * arrives by editing this constant in a reviewed change that cites
 * its two-key register entry.
 */
export const CAPACITY_GATE_KEY = "capacity_gate";
export const CAPACITY_CONFIG_RULING = {
  cap: 5,
  bandMin: 3,
  bandMax: 5,
  authority: "WK_Handoff_v5_Intake_Ruling_2026-08-25 section 3 (audit C-06)",
} as const;

export type CapacityGateConfig = {
  cap?: number | null;
  bandMin?: number | null;
  bandMax?: number | null;
  authority?: string;
};
