import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { devicePairing, authSession, householdRoleAssignment, household } from "@wellkept/schema";
import { generateBackupCodes, hashBackupCode } from "@wellkept/totp";
import { db } from "./db";

/**
 * Native-app device pairing (the mobile auth story). Rather than re-implement
 * magic link + TOTP on the phone, a staff member who is ALREADY signed in and
 * MFA-cleared on the web mints a short-lived code; the Expo app exchanges it
 * once for a real session. Because the code can only be minted from a fully
 * authenticated web session, the resulting mobile session inherits
 * mfa_satisfied — the human proved both factors on the web to create it.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes to type it into the app
const MOBILE_SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days; revocable via forceSignOut

/** Mint (or replace) the caller's pairing code. Only the hash is stored. */
export async function createPairingCode(userId: string): Promise<{ code: string; expiresAt: Date }> {
  const code = generateBackupCodes(1)[0]!; // unambiguous formatted code, e.g. "a4z3-v48j"
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  // One active code per user: drop any prior unconsumed one.
  await db.delete(devicePairing).where(and(eq(devicePairing.userId, userId), isNull(devicePairing.consumedAt)));
  await db.insert(devicePairing).values({ id: randomUUID(), userId, codeHash: hashBackupCode(code), expiresAt });
  return { code, expiresAt };
}

export interface PairedSession {
  sessionToken: string;
  userId: string;
  households: { id: string; name: string; role: string }[];
}

/**
 * Exchange a pairing code for a mobile session. The code is claimed atomically
 * (consumed only if unconsumed AND unexpired, so it can't be redeemed twice or
 * after expiry), then a 30-day mfa-satisfied auth_session is minted. Returns
 * null for an unknown/used/expired code. Only field-role households are
 * returned — the app is the house-manager surface.
 */
export async function redeemPairingCode(code: string): Promise<PairedSession | null> {
  const hash = hashBackupCode(code);
  const claimed = await db
    .update(devicePairing)
    .set({ consumedAt: new Date() })
    .where(and(eq(devicePairing.codeHash, hash), isNull(devicePairing.consumedAt), gt(devicePairing.expiresAt, new Date())))
    .returning({ userId: devicePairing.userId });
  const row = claimed[0];
  if (!row) return null;

  const sessionToken = randomUUID() + randomUUID();
  await db.insert(authSession).values({
    sessionToken,
    userId: row.userId,
    expires: new Date(Date.now() + MOBILE_SESSION_MS),
    mfaSatisfiedAt: new Date(),
  });

  const rows = await db
    .select({ id: household.id, name: household.name, role: householdRoleAssignment.role })
    .from(householdRoleAssignment)
    .innerJoin(household, eq(household.id, householdRoleAssignment.householdId))
    .where(eq(householdRoleAssignment.userId, row.userId));
  const households = rows.filter((h) => h.role === "house_manager" || h.role === "backup_hm");
  return { sessionToken, userId: row.userId, households };
}
