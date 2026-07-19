import { enforceStaffMfa } from "@/lib/totp";

export const dynamic = "force-dynamic";

/** REQ-003: house-manager surfaces require the staff second factor. */
export default async function HmLayout({ children }: { children: React.ReactNode }) {
  await enforceStaffMfa();
  return <>{children}</>;
}
