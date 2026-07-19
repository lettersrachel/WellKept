import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isStaffUser, BACKUP_CODES_COOKIE } from "@/lib/totp";
import { dismissRecoveryCodesAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * One-time reveal of the backup codes issued at enrollment. The plaintext
 * arrives in a short-lived httpOnly cookie set by the confirm action; we
 * show it once and clear it, so a refresh or back-button won't re-expose it.
 */
export default async function RecoveryCodesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  if (!(await isStaffUser(user.id))) redirect("/");

  const jar = await cookies();
  const raw = jar.get(BACKUP_CODES_COOKIE)?.value;
  if (!raw) redirect("/"); // nothing to show (already revealed, or direct hit)
  const codes = raw.split(",");

  return (
    <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
      <h2>Save your recovery codes</h2>
      <p className="note">
        If you ever lose your authenticator, any one of these codes gets you back in — each works
        <strong> once</strong>. Store them somewhere safe (a password manager, not the same phone).
        This is the only time they&apos;ll be shown.
      </p>
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px",
          margin: "16px 0", padding: "14px 18px", background: "var(--surface-2, #f4f4f5)",
          borderRadius: 8, fontFamily: "ui-monospace, monospace", fontSize: "1.05em", letterSpacing: "0.08em",
        }}
      >
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className="note" style={{ marginBottom: 16 }}>
        Lost them all? An administrator can reset your second factor, or you can re-enroll to get a
        fresh set.
      </div>
      <form action={dismissRecoveryCodesAction}>
        <button className="act">I&apos;ve saved these — continue</button>
      </form>
    </div>
  );
}
