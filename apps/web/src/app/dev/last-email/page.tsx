import { notFound } from "next/navigation";
import { getSentLinks } from "@/lib/auth/config";
import { getDevOutbox } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * Dev-only: the dev email transport records magic links instead of sending.
 * Links are SINGLE-USE — a link that has been followed once (by anyone,
 * including an automated check) will refuse with "unable to sign in";
 * request a fresh one at /signin. Shows the latest link per email address.
 */
export default function LastEmail() {
  if (process.env.NODE_ENV === "production") notFound();
  const sent = getSentLinks();
  const latestByEmail = new Map<string, (typeof sent)[number]>();
  for (const link of sent) latestByEmail.set(link.identifier, link);
  const entries = [...latestByEmail.values()].reverse();
  return (
    <div className="card" style={{ maxWidth: 640, margin: "60px auto" }}>
      <h2>Dev: captured magic links</h2>
      <div className="note">
        One click per link — a used or superseded link says &ldquo;unable to sign in&rdquo;;
        request a fresh one at /signin and use the newest entry here.
      </div>
      {getDevOutbox().length > 0 && (
        <>
          <div className="eyebrow">Dev outbox (non-auth mail)</div>
          {getDevOutbox().slice(-5).reverse().map((m, i) => (
            <div key={i} className="prov">
              → {m.to} · {m.subject} · {m.sentAt}
            </div>
          ))}
        </>
      )}
      {entries.length === 0 ? (
        <div className="note">Nothing sent yet this server session. Request a link at /signin first.</div>
      ) : (
        entries.map((link) => (
          <div key={link.identifier} className="field">
            <span className="fname">{link.identifier}</span>
            <div className="fval">
              <a href={link.url}>Follow the magic link</a>
            </div>
            <div className="prov">{link.sentAt}</div>
          </div>
        ))
      )}
    </div>
  );
}
