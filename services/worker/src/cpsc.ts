/**
 * REQ-047: the CPSC recall job. Weekly, per household: search the CPSC
 * SaferProducts recall feed for each appliance-registry entry and raise a
 * corporate notification when a recall MAY match. "May" is the contract —
 * the feed matches on product names, not serials, so the notification asks
 * corporate to verify the model against the recall notice; it never asserts.
 * Quiet on failure: a down feed skips the round (counted in the result),
 * never crashes the sweep, and never notifies on garbage.
 */
import { and, eq, isNull } from "drizzle-orm";
import { household, registryEntry, householdRoleAssignment, notification } from "@wellkept/schema";

export interface CpscRecall {
  RecallID: number;
  Title: string;
  URL: string;
  RecallDate?: string;
}

export interface ApplianceLike {
  id: string;
  label: string;
  detail: { model?: string } | null;
}

/**
 * One search term per appliance: the model when captured (precise), else
 * the label (broad). Terms under 4 characters search nothing — too noisy.
 */
export function applianceSearchTerm(entry: ApplianceLike): string | null {
  const model = entry.detail?.model?.trim();
  const term = model && model.length >= 4 ? model : entry.label.trim();
  return term.length >= 4 ? term : null;
}

/** Shape-check the feed's response; anything malformed becomes no matches. */
export function parseRecalls(payload: unknown): CpscRecall[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .filter((r) => typeof r.RecallID === "number" && typeof r.Title === "string" && typeof r.URL === "string")
    .map((r) => ({ RecallID: r.RecallID as number, Title: r.Title as string, URL: r.URL as string, RecallDate: typeof r.RecallDate === "string" ? r.RecallDate : undefined }));
}

/** Dedupe key: one notification per (household, recall), ever. */
export const recallNotificationKind = (recallId: number) => `cpsc_recall:${recallId}`;

const API = "https://www.saferproducts.gov/RestWebServices/Recall";

export async function runCpscRecallSweep(
  db: any,
  opts: { fetchImpl?: typeof fetch; now?: Date; sinceMonths?: number } = {},
) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime());
  since.setUTCMonth(since.getUTCMonth() - (opts.sinceMonths ?? 24));
  const sinceStr = since.toISOString().slice(0, 10);

  const households = await db.select().from(household);
  const cache = new Map<string, CpscRecall[]>(); // per-term, shared across households
  let notified = 0;
  let fetchErrors = 0;

  for (const hh of households) {
    if (hh.archivedAt) continue;
    const appliances = (await db.select().from(registryEntry)
      .where(and(
        eq(registryEntry.householdId, hh.id),
        eq(registryEntry.kind, "appliance"),
        isNull(registryEntry.tombstonedAt),
      ))) as ApplianceLike[];
    if (appliances.length === 0) continue;

    const corporate = await db.select({ userId: householdRoleAssignment.userId })
      .from(householdRoleAssignment)
      .where(and(
        eq(householdRoleAssignment.householdId, hh.id),
        eq(householdRoleAssignment.role, "corporate_admin"),
      ));

    for (const entry of appliances) {
      const term = applianceSearchTerm(entry);
      if (!term) continue;
      let recalls = cache.get(term);
      if (!recalls) {
        try {
          const res = await fetchImpl(`${API}?format=json&ProductName=${encodeURIComponent(term)}&RecallDateStart=${sinceStr}`);
          if (!res.ok) throw new Error(`cpsc ${res.status}`);
          recalls = parseRecalls(await res.json());
        } catch {
          fetchErrors += 1;
          recalls = []; // quiet skip; next week's round retries
        }
        cache.set(term, recalls);
      }
      for (const recall of recalls) {
        const kind = recallNotificationKind(recall.RecallID);
        const existing = await db.select({ id: notification.id }).from(notification)
          .where(and(eq(notification.householdId, hh.id), eq(notification.kind, kind)))
          .limit(1);
        if (existing.length) continue; // one notification per (household, recall), ever
        for (const r of corporate) {
          await db.insert(notification).values({
            id: globalThis.crypto.randomUUID(),
            userId: r.userId,
            householdId: hh.id,
            kind,
            title: `CPSC recall may match: ${entry.label}`,
            body: `${recall.Title} - verify this household's unit against the notice `
              + `(matched on "${term}", not a serial number): ${recall.URL}`,
          });
          notified += 1;
        }
      }
    }
  }
  return { households: households.length, notified, fetchErrors };
}
