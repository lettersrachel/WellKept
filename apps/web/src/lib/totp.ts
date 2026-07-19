import { redirect } from "next/navigation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { userTotp, authSession, householdRoleAssignment } from "@wellkept/schema";
import { sealValue, openValue, type SealedBox } from "@wellkept/vault";
import { generateSecret, otpauthUrl, verifyTotp } from "@wellkept/totp";
import { db } from "./db";
import { kms } from "./vault";
import { getSessionUser, getSessionToken } from "./session";

/**
 * Staff second factor (REQ-003). The magic link proves control of the email;
 * this proves possession of an enrolled authenticator. Together that's genuine
 * two-factor for staff — a deliberate reading of the spec's "password+TOTP":
 * we keep the passwordless magic link as factor one (no password custody) and
 * layer TOTP as factor two, which is documented in SECURITY.md.
 *
 * The secret is stored sealed under the process KMS (same envelope as the
 * vault), so a database dump alone never yields a working authenticator seed.
 */

const ISSUER = "Well Kept";

/** Anyone holding a role other than plain `client` at any household is staff. */
export async function isStaffUser(userId: string): Promise<boolean> {
  const rows = await db
    .select({ role: householdRoleAssignment.role })
    .from(householdRoleAssignment)
    .where(and(eq(householdRoleAssignment.userId, userId), ne(householdRoleAssignment.role, "client")));
  return rows.length > 0;
}

export interface TotpStatus {
  enrolled: boolean; // a confirmed secret exists
}

export async function getTotpStatus(userId: string): Promise<TotpStatus> {
  const [row] = await db.select({ confirmedAt: userTotp.confirmedAt }).from(userTotp).where(eq(userTotp.userId, userId));
  return { enrolled: !!row?.confirmedAt };
}

function seal(secret: string): { secretBox: string; wrappedKey: string } {
  const sealed = sealValue(kms(), null, secret);
  return { secretBox: JSON.stringify(sealed.box), wrappedKey: JSON.stringify(sealed.wrappedKey) };
}

function openSecret(row: { secretBox: string; wrappedKey: string }): string {
  return openValue(kms(), JSON.parse(row.wrappedKey) as SealedBox, JSON.parse(row.secretBox) as SealedBox);
}

/**
 * Get the pending enrollment secret, minting one only if none exists yet.
 * Reusing an existing UNCONFIRMED secret is important: the enrollment screen
 * re-renders after a wrong code, and regenerating would invalidate the secret
 * the user already scanned. A CONFIRMED secret is never touched here (callers
 * gate on getTotpStatus first) — resetting a confirmed factor is a separate,
 * audited path.
 */
export async function ensureEnrollment(userId: string, account: string): Promise<{ secret: string; otpauth: string }> {
  const [existing] = await db.select().from(userTotp).where(and(eq(userTotp.userId, userId), isNull(userTotp.confirmedAt)));
  const secret = existing ? openSecret(existing) : generateSecret();
  if (!existing) {
    const { secretBox, wrappedKey } = seal(secret);
    await db
      .insert(userTotp)
      .values({ userId, secretBox, wrappedKey, confirmedAt: null })
      .onConflictDoUpdate({ target: userTotp.userId, set: { secretBox, wrappedKey, confirmedAt: null, createdAt: new Date() } });
  }
  return { secret, otpauth: otpauthUrl({ secret, account, issuer: ISSUER }) };
}

/** Confirm enrollment by proving a first live code. Returns false on mismatch. */
export async function confirmEnrollment(userId: string, token: string): Promise<boolean> {
  const [row] = await db.select().from(userTotp).where(and(eq(userTotp.userId, userId), isNull(userTotp.confirmedAt)));
  if (!row) return false;
  if (!verifyTotp(openSecret(row), token)) return false;
  await db.update(userTotp).set({ confirmedAt: new Date() }).where(eq(userTotp.userId, userId));
  return true;
}

/** Verify a code against the user's CONFIRMED secret (the sign-in challenge). */
export async function verifyChallenge(userId: string, token: string): Promise<boolean> {
  const [row] = await db.select().from(userTotp).where(eq(userTotp.userId, userId));
  if (!row?.confirmedAt) return false;
  return verifyTotp(openSecret(row), token);
}

/** Stamp this session as having cleared the second factor. */
export async function markSessionMfaSatisfied(sessionToken: string): Promise<void> {
  await db.update(authSession).set({ mfaSatisfiedAt: new Date() }).where(eq(authSession.sessionToken, sessionToken));
}

/** Has THIS session cleared the second factor? */
export async function sessionMfaSatisfied(sessionToken: string): Promise<boolean> {
  const [row] = await db.select({ at: authSession.mfaSatisfiedAt }).from(authSession).where(eq(authSession.sessionToken, sessionToken));
  return !!row?.at;
}

/**
 * The choke point: called from every staff route group's layout. A signed-in
 * staff user whose current session hasn't cleared TOTP is sent to /mfa (which
 * enrolls or challenges as needed). Non-staff (clients) and signed-out
 * requests pass through untouched — their pages own their own redirects.
 */
export async function enforceStaffMfa(): Promise<void> {
  // Dev/demo convenience only. HARD-gated on NODE_ENV: in production (Vercel
  // sets NODE_ENV=production) this branch is dead, so the second factor can
  // never be switched off on the live product regardless of the env var.
  if (process.env.NODE_ENV !== "production" && process.env.WK_DEV_SKIP_MFA === "1") return;
  const user = await getSessionUser();
  if (!user) return;
  if (!(await isStaffUser(user.id))) return;
  const token = await getSessionToken();
  if (!token) return;
  if (await sessionMfaSatisfied(token)) return;
  redirect("/mfa");
}
