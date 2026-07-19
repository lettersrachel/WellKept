import { enforceStaffMfa } from "@/lib/totp";

export const dynamic = "force-dynamic";

/** REQ-003: corporate surfaces require the staff second factor. The guard
 * redirects an un-stepped-up staff session to /mfa before any child renders. */
export default async function CorporateLayout({ children }: { children: React.ReactNode }) {
  await enforceStaffMfa();
  return <>{children}</>;
}
