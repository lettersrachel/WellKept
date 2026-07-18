import { redirect } from "next/navigation";
import { getRole } from "@/lib/session";

export default async function Home() {
  const role = await getRole();
  redirect(role === "corporate_admin" ? "/oversight" : "/playbook");
}
