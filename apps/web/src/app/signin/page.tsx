export const dynamic = "force-dynamic";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 460, margin: "60px auto" }}>
      <h2>Sign in to Well Kept</h2>
      {error === "send-failed" ? (
        <div className="banner">
          The sign-in email could not be sent — the mail provider is not configured or rejected
          the address. Contact your administrator.
        </div>
      ) : error ? (
        <div className="banner">Enter your email address to receive a link.</div>
      ) : null}
      <form action="/signin/action" method="post">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@example.com" />
        <p>
          <button className="act" style={{ width: "100%" }}>Send magic link</button>
        </p>
      </form>
      <div className="note">
        Sign-in is by emailed link only; there are no passwords to phish.
        {process.env.NODE_ENV !== "production" &&
          " In development the link appears at /dev/last-email instead of your inbox."}
      </div>
    </div>
  );
}
