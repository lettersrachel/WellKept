/**
 * Outbound mail through the Resend seam (same rules as the auth sender):
 * RESEND_API_KEY set -> real send, non-2xx throws; unset in dev -> recorded
 * to the dev outbox (surfaced on /dev/last-email); unset in production ->
 * throws. Callers decide whether a failure is fatal — auth links are,
 * visit reports are best-effort.
 */
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
