import { notFound } from "next/navigation";
import { getSentLinks } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/** Dev-only: the dev email transport records magic links instead of sending. */
export default function LastEmail() {
  if (process.env.NODE_ENV === "production") notFound();
  const sent = getSentLinks();
  const last = sent[sent.length - 1];
  return (
    <div className="card" style={{ maxWidth: 640, margin: "60px auto" }}>
      <h2>Dev: last magic link</h2>
      {!last ? (
        <div className="note">Nothing sent yet. Request a link at /signin first.</div>
      ) : (
        <>
          <div className="field">
            <span className="fname">{last.identifier}</span>
            <div className="fval">
              <a href={last.url}>Follow the magic link</a>
            </div>
            <div className="prov">{last.sentAt}</div>
          </div>
          <div className="note">{sent.length} link(s) captured this server session.</div>
        </>
      )}
    </div>
  );
}
