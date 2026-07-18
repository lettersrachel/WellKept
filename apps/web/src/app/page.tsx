import { redirect } from "next/navigation";
import { getHouseholdAndPrincipal } from "@/lib/data";
import { CORPORATE_ROLES } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { principal } = await getHouseholdAndPrincipal();
  if (!principal) redirect("/signin");
  if (principal.role === "client") redirect("/playbook");
  if (CORPORATE_ROLES.has(principal.role)) redirect("/oversight");
  redirect("/visit"); // field roles: briefing + close flow
}
