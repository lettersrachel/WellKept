import Link from "next/link";

export default function VerifyRequest() {
  return (
    <div className="card" style={{ maxWidth: 460, margin: "60px auto" }}>
      <h2>Check your email</h2>
      <div className="note">
        A sign-in link is on its way. It expires in 24 hours and works once.
      </div>
      {process.env.NODE_ENV !== "production" && (
        <div className="note">
          Development: the link is at <Link href="/dev/last-email">/dev/last-email</Link>.
        </div>
      )}
    </div>
  );
}
