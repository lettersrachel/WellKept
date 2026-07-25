import Link from "next/link";

/** Public support page (App Store listing requirement). */
export const metadata = { title: "Support — Well Kept" };

export default function SupportPage() {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "40px auto" }}>
      <h2>Well Kept support</h2>
      <div className="fval">
        Well Kept is a household operations service: one living record of how your home
        runs, shared between you and the team that cares for it.
      </div>

      <h2 style={{ marginTop: 18 }}>Get help</h2>
      <div className="fval">
        Email <a href="mailto:lettersrachel@gmail.com">lettersrachel@gmail.com</a> and we
        will reply within one business day during the pilot.
      </div>

      <h2 style={{ marginTop: 18 }}>Signing in</h2>
      <div className="fval">
        There are no passwords. Enter your email on the sign-in screen and we send a
        one-time link and code; staff also enter a 6-digit code from their authenticator
        app. Lost your authenticator? A backup code works once, or your administrator can
        reset it. Codes expire after an hour; request a fresh email if one does not work.
      </div>

      <h2 style={{ marginTop: 18 }}>Working offline</h2>
      <div className="fval">
        The field app keeps working without signal mid-visit: your briefing is cached and
        the close-of-visit record syncs when you reconnect. If something looks stuck, use
        Sync now on the visit screen after you are back online.
      </div>

      <div className="note" style={{ marginTop: 18 }}>
        <Link href="/privacy">Privacy notice</Link> · <Link href="/signin">Sign in</Link>
      </div>
    </div>
  );
}
