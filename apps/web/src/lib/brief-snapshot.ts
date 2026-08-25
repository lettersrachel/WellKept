import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { visitBriefSnapshot } from "@wellkept/schema";
import { db } from "./db";

/**
 * WK-DEV-009 section 2.1: persist every composed brief as sent, so what
 * the HOM was shown is always reconstructable. The snapshot records that
 * a brief was COMPOSED for a person under a projection; the unique
 * content index makes re-composing an unchanged brief a silent no-op, so
 * the table holds every distinct brief without per-open noise. Awaited
 * in the route: the evidence write fails closed with the brief itself
 * (they read the same database), and it claims composition, never
 * delivery, so it is not an optimistic row.
 */
export async function recordBriefSnapshot(input: {
  householdId: string;
  briefedUser: string;
  role: string;
  strangerMode: boolean;
  payload: unknown;
}): Promise<string> {
  const contentHash = createHash("sha256")
    .update(JSON.stringify(input.payload))
    .digest("hex");
  await db.insert(visitBriefSnapshot).values({
    id: randomUUID(),
    householdId: input.householdId,
    briefedUser: input.briefedUser,
    role: input.role,
    strangerMode: input.strangerMode,
    contentHash,
    payload: input.payload,
  }).onConflictDoNothing({
    target: [
      visitBriefSnapshot.householdId,
      visitBriefSnapshot.briefedUser,
      visitBriefSnapshot.strangerMode,
      visitBriefSnapshot.contentHash,
    ],
  });
  return contentHash;
}
