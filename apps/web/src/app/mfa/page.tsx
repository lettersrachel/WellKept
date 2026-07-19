import { redirect } from "next/navigation";
import { getSessionUser, getSessionToken } from "@/lib/session";
import { isStaffUser, getTotpStatus, ensureEnrollment, sessionMfaSatisfied, remainingBackupCodes } from "@/lib/totp";
import { confirmEnrollmentAction, challengeAction } from "./actions";

export const dynamic = "force-dynamic";

/** Group a base32 secret into 4-char blocks so it's readable to type in. */
function grouped(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function ErrorBanner({ error }: { error?: string }) {
  if (error === "throttled") {
    return <div className="banner">Too many attempts. Wait a few minutes, then try again.</div>;
  }
  if (error === "bad-code") {
    return <div className="banner">That code didn&apos;t match. Codes rotate every 30 seconds — check your authenticator and try the current one.</div>;
  }
  return null;
}

function CodeForm({ action, label, allowBackup }: { action: (fd: FormData) => void; label: string; allowBackup?: boolean }) {
  return (
    <form action={action} method="post">
      <label htmlFor="code">{allowBackup ? "Authenticator code or backup code" : "6-digit code"}</label>
      <input
        id="code"
        name="code"
        inputMode={allowBackup ? "text" : "numeric"}
        autoComplete="one-time-code"
        {...(allowBackup ? {} : { pattern: "[0-9 ]*", maxLength: 7 })}
        required
        autoFocus
        placeholder={allowBackup ? "123456  or  abcd-efgh" : "123456"}
        style={{ letterSpacing: "0.3em", fontSize: "1.2em" }}
      />
      <p><button className="act" style={{ width: "100%" }}>{label}</button></p>
    </form>
  );
}

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  // Clients have no second factor; keep them out of this screen entirely.
  if (!(await isStaffUser(user.id))) redirect("/");
  const token = await getSessionToken();
  if (token && (await sessionMfaSatisfied(token))) redirect("/");

  const { enrolled } = await getTotpStatus(user.id);

  if (enrolled) {
    const remaining = await remainingBackupCodes(user.id);
    return (
      <div className="card" style={{ maxWidth: 460, margin: "60px auto" }}>
        <h2>Confirm it&apos;s you</h2>
        <p className="note">Signed in as {user.email}. Staff access needs a second factor — enter the current code from your authenticator app, or one of your backup codes.</p>
        <ErrorBanner error={error} />
        <CodeForm action={challengeAction} label="Verify" allowBackup />
        <div className="note" style={{ marginTop: 16 }}>
          {remaining > 0
            ? `Lost your authenticator? Use a backup code above (${remaining} left).`
            : "Out of backup codes — an administrator can reset your second factor from the household's People & access panel."}
        </div>
      </div>
    );
  }

  // First time in: enroll. Reuses any pending secret so a wrong code doesn't
  // invalidate what was already added to the app.
  const { secret, otpauth } = await ensureEnrollment(user.id, user.email);
  return (
    <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
      <h2>Set up your second factor</h2>
      <p className="note">
        Staff sign-in needs an authenticator app (Google Authenticator, 1Password, Authy, …) in
        addition to your email link. Add Well Kept once; after that you&apos;ll enter a 6-digit code
        each time you sign in on a new device.
      </p>

      <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
        <li>Open your authenticator app and choose <strong>Add / Enter a setup key</strong>.</li>
        <li>
          Enter this key (account <strong>{user.email}</strong>):
          <div style={{ margin: "8px 0", padding: "10px 14px", background: "var(--surface-2, #f4f4f5)", borderRadius: 8, fontFamily: "ui-monospace, monospace", fontSize: "1.1em", letterSpacing: "0.15em", wordBreak: "break-all" }}>
            {grouped(secret)}
          </div>
          <span className="note">Time-based, 6 digits, SHA-1 — the defaults, so you can just paste the key.</span>
        </li>
        <li style={{ marginTop: 8 }}>Enter the 6-digit code it shows to finish.</li>
      </ol>

      <details style={{ margin: "8px 0 16px" }}>
        <summary className="note" style={{ cursor: "pointer" }}>Prefer a link your app can open?</summary>
        <input readOnly value={otpauth} style={{ width: "100%", marginTop: 8, fontFamily: "ui-monospace, monospace", fontSize: "0.8em" }} />
      </details>

      <ErrorBanner error={error} />
      <CodeForm action={confirmEnrollmentAction} label="Confirm and continue" />
    </div>
  );
}
