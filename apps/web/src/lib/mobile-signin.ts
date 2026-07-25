import { Auth } from "@auth/core";
import { and, eq } from "drizzle-orm";
import { normalizeBackupCode } from "@wellkept/totp";
import { authSession, authUser, household, householdRoleAssignment } from "@wellkept/schema";
import { getAuthConfig } from "./auth/config";
import { db } from "./db";
import { getTotpStatus, verifyChallenge, markSessionMfaSatisfied } from "./totp";

export type MobileSigninResult =
  | { ok: true; sessionToken: string; userId: string; households: { id: string; name: string; role: string }[] }
  | { ok: false; needs: "code" | "totp" | "enrollment" };

/**
 * Complete a standalone mobile sign-in: exchange the emailed code against
 * Auth.js's email callback, then require the staff second factor before the
 * session leaves this function. An unstepped-up session is never returned —
 * on a missing or wrong TOTP the just-minted session row is deleted, so the
 * failed attempt leaves nothing behind. Users who have not enrolled their
 * authenticator yet must do that on the web first (enrollment shows a
 * one-time setup key and backup codes, which belongs on a bigger screen).
 */
export async function verifyMobileSignin(
  requestUrl: string | URL,
  email: string,
  code: string,
  totp: string | undefined,
): Promise<MobileSigninResult> {
  const callbackUrl = new URL("/api/auth/callback/email", requestUrl);
  callbackUrl.searchParams.set("email", email);
  callbackUrl.searchParams.set("token", normalizeBackupCode(code));
  const authResponse = await Auth(new Request(callbackUrl), getAuthConfig());
  const location = authResponse.headers.get("location") ?? "";
  const cookie = authResponse.headers.getSetCookie().find((c) => c.startsWith("authjs.session-token="));
  const sessionToken = cookie?.split(";")[0]?.split("=")[1];
  if (location.includes("error=") || !sessionToken) return { ok: false, needs: "code" };

  const [user] = await db.select().from(authUser).where(eq(authUser.email, email));
  if (!user) return { ok: false, needs: "code" };

  const drop = () => db.delete(authSession).where(eq(authSession.sessionToken, sessionToken));
  const status = await getTotpStatus(user.id);
  if (!status.enrolled) {
    await drop();
    return { ok: false, needs: "enrollment" };
  }
  if (!totp || !(await verifyChallenge(user.id, totp))) {
    await drop();
    return { ok: false, needs: "totp" };
  }
  await markSessionMfaSatisfied(sessionToken);

  const rows = await db
    .select({ id: household.id, name: household.name, role: householdRoleAssignment.role })
    .from(householdRoleAssignment)
    .innerJoin(household, eq(household.id, householdRoleAssignment.householdId))
    .where(and(eq(householdRoleAssignment.userId, user.id)));
  const households = rows.filter((h) => h.role === "house_manager" || h.role === "backup_hm");
  return { ok: true, sessionToken, userId: user.id, households };
}
