import { cookies } from "next/headers";

/**
 * Demo-phase session (pilot parallel protocol): the web app serves the client
 * and corporate portals; the HM portal is the mobile app. Role comes from a
 * cookie until the auth sprint lands. Everything downstream still goes through
 * @wellkept/permissions, so a wrong role can only ever see LESS, not more.
 */
export type WebRole = "client" | "corporate_admin";

// Fixed demo identities (uuid v7-shaped, generated once for the pilot demo).
export const DEMO_USERS: Record<WebRole, { id: string; label: string }> = {
  client: { id: "01980000-0000-7000-8000-000000000c11", label: "Lisa (client)" },
  corporate_admin: { id: "01980000-0000-7000-8000-000000000ade", label: "Rachel (corporate)" },
};

export async function getRole(): Promise<WebRole> {
  const jar = await cookies();
  const raw = jar.get("wk_role")?.value;
  return raw === "corporate_admin" ? "corporate_admin" : "client"; // fail closed to client
}
