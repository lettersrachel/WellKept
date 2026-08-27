/**
 * Outbound mail through the Resend seam (same rules as the auth sender):
 * RESEND_API_KEY set -> real send, non-2xx throws; unset in dev -> recorded
 * to the dev outbox (surfaced on /dev/last-email); unset in production ->
 * throws. Callers decide whether a failure is fatal — auth links are,
 * visit reports are best-effort.
 */
/**
 * Escape a value before it is interpolated into an outbound HTML body.
 *
 * Every string a person typed reaches these templates through `${...}`,
 * which is string concatenation and not markup-aware. A HOM writing "the
 * 3<4 setting" or a household named "Fitz & Byrne" produced broken or
 * silently truncated markup in a member's inbox, reachable by typing
 * ordinary punctuation. Escaped here rather than at each call site so a
 * future template cannot forget.
 *
 * NOTE for the copy census, learned in the same pass: entity encoding is
 * exactly how an em dash evades a literal-only scan, which is why
 * client-copy.test.ts reads `&mdash;`, `&#8212;` and `&#x2014;` as well
 * as U+2014. This function only ever produces the five entities below and
 * never an em dash, but the general rule stands: **the census reads the
 * SOURCE, never the escaped output**, because escaping is a transform a
 * scan on the far side of it cannot see through.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")   // first, or it double-escapes the rest
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface DevOutboxEntry { to: string; subject: string; sentAt: string }

const g = globalThis as unknown as { wkDevOutbox?: DevOutboxEntry[] };

export function getDevOutbox(): DevOutboxEntry[] {
  g.wkDevOutbox ??= [];
  return g.wkDevOutbox;
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set in production");
    }
    getDevOutbox().push({ to, subject, sentAt: new Date().toISOString() });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "Well Kept <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`mail send failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
}
