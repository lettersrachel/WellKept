import Link from "next/link";

/**
 * The "check your email" screen, now also the code-entry screen: on the
 * installed phone app the emailed LINK opens Safari (separate storage), so
 * typing the emailed CODE here completes sign-in inside the app itself.
 */
export default async function VerifyRequest({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const { email, error } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 460, margin: "60px auto" }}>
      <h2>Check your email</h2>
      <div className="note">
        {/* G-70: SAY WHICH ADDRESS. An operator running two plus-addressed
            identities into one inbox (the pattern the one-role index forces
            when one person covers two roles on a household) has no way to
            tell the two sign-in emails apart: same subject, same body, and
            only the to: header differs, which most clients hide. Browser
            autofill silently replacing a typed alter address cost a
            diagnostic round on 2026-08-26. The page already holds the
            value; echoing it is the cheapest of the three places this
            could have been caught. Copy is a proposal. */}
        {email
          ? <>A sign-in link is on its way to <strong>{email}</strong>. Check that this is the address you meant; the link and code expire in 1 hour and work once.</>
          : <>A sign-in link is on its way. The link and code expire in 1 hour and work once.</>}
      </div>
      {/* G-30: a delivered email can still land in spam or arrive late —
          observed 2026-07-25 (Resend showed delivered; the inbox didn't).
          Requesting again is safe and cheap; say so instead of leaving a
          waiting user to conclude sign-in is broken. */}
      <div className="note">
        Nothing after two minutes? Check your spam or promotions folder, then request
        another link from the <Link href="/signin">sign-in page</Link>; it happens, and
        a fresh request is always safe.
      </div>
      {error === "bad-code" && (
        <div className="note" style={{ color: "var(--brick)" }}>
          That code did not work. Codes are used up by a click on the link, and expire after an
          hour; request a fresh email from the sign-in page if needed.
        </div>
      )}
      {error === "rate-limited" && (
        <div className="note" style={{ color: "var(--brick)" }}>
          Too many attempts. Wait a few minutes and try again.
        </div>
      )}
      <form action="/signin/code" method="post" style={{ marginTop: 12 }}>
        <label htmlFor="vr-email">Email</label>
        <input id="vr-email" name="email" type="email" required defaultValue={email ?? ""} />
        <label htmlFor="vr-code" style={{ marginTop: 8 }}>
          Or type the code from the email (for the installed phone app)
        </label>
        <input
          id="vr-code"
          name="code"
          required
          placeholder="ABCD-EFGH"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          style={{ fontFamily: "monospace", letterSpacing: 2 }}
        />
        <button className="act" style={{ marginTop: 10, width: "100%" }}>Sign in with code</button>
      </form>
      {process.env.NODE_ENV !== "production" && (
        <div className="note">
          Development: the link is at <Link href="/dev/last-email">/dev/last-email</Link>.
        </div>
      )}
    </div>
  );
}
