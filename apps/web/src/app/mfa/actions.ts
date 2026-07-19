"use server";

import { redirect } from "next/navigation";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { isStaffUser, confirmEnrollment, verifyChallenge, markSessionMfaSatisfied } from "@/lib/totp";
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
  if (await confirmEnrollment(ctx.userId, code)) {
    await markSessionMfaSatisfied(ctx.token);
    redirect("/");
  }
  redirect("/mfa?error=bad-code");
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
