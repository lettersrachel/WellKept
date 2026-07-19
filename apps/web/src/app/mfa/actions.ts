"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { isStaffUser, confirmEnrollment, verifyChallenge, markSessionMfaSatisfied, BACKUP_CODES_COOKIE } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Shared guard for both actions: only a signed-in staff user with a live
 * session may attempt a code, and each user gets a bounded number of tries
 * before a cool-off. A 6-digit code with a ±30s window is brute-forceable
 * without this throttle.
 */
async function guardedUser(): Promise<{ userId: string; token: string } | null> {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return null;
  if (!(await isStaffUser(user.id))) return null;
  return { userId: user.id, token };
}

export async function confirmEnrollmentAction(formData: FormData): Promise<void> {
  const ctx = await guardedUser();
  if (!ctx) redirect("/signin");
  if (!(await rateLimit(`mfa:${ctx.userId}`, 8, 300))) redirect("/mfa?error=throttled");
  const code = String(formData.get("code") ?? "");
  const backupCodes = await confirmEnrollment(ctx.userId, code);
  if (backupCodes) {
    await markSessionMfaSatisfied(ctx.token);
    // Hand the one-time codes to the reveal page via an httpOnly, 5-minute
    // cookie — never in the URL. The reveal page clears it after showing.
    (await cookies()).set(BACKUP_CODES_COOKIE, backupCodes.join(","), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/mfa", maxAge: 300,
    });
    redirect("/mfa/recovery-codes");
  }
  redirect("/mfa?error=bad-code");
}

/** Dismiss the recovery-codes reveal: burn the cookie, then continue. Runs as
 * an action (a page render may not mutate cookies) when the user clicks
 * "I've saved these". */
export async function dismissRecoveryCodesAction(): Promise<void> {
  (await cookies()).set(BACKUP_CODES_COOKIE, "", { httpOnly: true, path: "/mfa", maxAge: 0 });
  redirect("/");
}

export async function challengeAction(formData: FormData): Promise<void> {
  const ctx = await guardedUser();
  if (!ctx) redirect("/signin");
  if (!(await rateLimit(`mfa:${ctx.userId}`, 8, 300))) redirect("/mfa?error=throttled");
  const code = String(formData.get("code") ?? "");
  if (await verifyChallenge(ctx.userId, code)) {
    await markSessionMfaSatisfied(ctx.token);
    redirect("/");
  }
  redirect("/mfa?error=bad-code");
}
