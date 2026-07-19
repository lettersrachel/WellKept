import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { enforceStaffMfa, isStaffUser } from "@/lib/totp";
import { createPairingCode } from "@/lib/mobile-pair";

export const dynamic = "force-dynamic";

/**
 * Pair the native house-manager app to this account. Reachable only by a
 * signed-in, MFA-cleared staff member (enforceStaffMfa redirects otherwise),
 * so the code it mints — and the mobile session redeemed from it — carries the
 * same two-factor assurance the web session already has. Each render issues a
 * fresh 10-minute code; refresh for a new one.
 */
export default async function LinkDevicePage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  await enforceStaffMfa(); // staff-not-stepped-up -> /mfa
  if (!(await isStaffUser(user.id))) redirect("/"); // clients have no app

  const { code, expiresAt } = await createPairingCode(user.id);
  const minutes = Math.round((expiresAt.getTime() - Date.now()) / 60000);

  return (
    <div className="card" style={{ maxWidth: 480, margin: "60px auto" }}>
      <h2>Link your phone</h2>
      <p className="note">
        Signed in as {user.email}. Open the <strong>Well Kept HM</strong> app on your phone, tap
        <strong> Pair this device</strong>, and enter this code. It works once and expires in about {minutes} minutes.
      </p>
      <div
        style={{
          margin: "18px 0", padding: "18px 20px", background: "var(--surface-2, #f4f4f5)", borderRadius: 10,
          fontFamily: "ui-monospace, monospace", fontSize: "2em", letterSpacing: "0.18em", textAlign: "center", textTransform: "uppercase",
        }}
      >
        {code}
      </div>
      <div className="note" style={{ marginBottom: 16 }}>
        Keep this code private — anyone who enters it signs the app in as you. Once paired, the phone
        stays signed in until you sign out there or an admin revokes your sessions.
      </div>
      <a href="/link-device" className="act" style={{ display: "inline-block", textDecoration: "none" }}>
        Get a new code
      </a>
    </div>
  );
}
