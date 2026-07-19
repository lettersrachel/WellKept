import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { householdRoleAssignment } from "@wellkept/schema";
import { db } from "./db";
import { getAdapter } from "./auth/config";

/**
 * Session → principal resolution, ported from the foundation repo's proven
 * authenticate() bridge. The role ALWAYS comes from the server-side
 * household_role_assignment table, keyed by (session user, household) —
 * never from anything the client supplies. No session, an expired session,
 * or no assignment for the household all resolve the same way: null.
 */
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

export interface Principal {
  userId: string;
  email: string;
  name: string | null;
  role: "client" | "house_manager" | "backup_hm" | "corporate_ops" | "corporate_admin" | "cfo_readonly";
  householdId: string;
  ndaApproved: boolean;
}

/** The raw Auth.js session-cookie value, or null when signed out. Needed by
 * the MFA guard to read/stamp the per-session step-up marker. */
export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  let token: string | undefined;
  for (const name of SESSION_COOKIE_NAMES) {
    token = jar.get(name)?.value ?? token;
  }
  return token ?? null;
}

export async function getSessionUser(): Promise<{ id: string; email: string; name: string | null } | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const adapter = getAdapter();
  const result = await adapter.getSessionAndUser!(token);
  if (!result) return null;
  if (result.session.expires.getTime() <= Date.now()) return null;
  return { id: result.user.id, email: result.user.email, name: result.user.name ?? null };
}

/** Household-scoped principal; null when signed out or unassigned. */
export async function getPrincipal(householdId: string): Promise<Principal | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const [assignment] = await db
    .select()
    .from(householdRoleAssignment)
    .where(and(
      eq(householdRoleAssignment.userId, user.id),
      eq(householdRoleAssignment.householdId, householdId),
    ));
  if (!assignment) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: assignment.role,
    householdId,
    ndaApproved: assignment.ndaApproved,
  };
}

export const CORPORATE_ROLES = new Set(["corporate_ops", "corporate_admin", "cfo_readonly"]);
