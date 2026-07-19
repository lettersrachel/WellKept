/**
 * The Resend send seam, shared by apps/web (client reports, watch alerts)
 * and the worker (the weekly digest). Pure over its config — the caller
 * supplies the key and from-address — so it carries no env or process
 * state and is trivially testable. Non-2xx throws, so a failed send is
 * never a silent success.
 */
export interface SendOptions {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendResendEmail(opts: SendOptions): Promise<{ id?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  if (!res.ok) {
    throw new Error(`resend send failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  return (await res.json().catch(() => ({}))) as { id?: string };
}

// ---- The fleet digest (REQ-060) — pure composition, tested in isolation ----

export interface DigestHousehold {
  name: string;
  tier: string;
  statusTag: string;
  unconfirmed: number;
  total: number;
  pendingEdits: number;
  upcomingPrompts: number;
  lastStranger: string; // "PASS 06-11" | "FRICTION 07-19" | "never"
}

const BRAND = { green: "#1c3d2e", gold: "#b08d2a", grey: "#6b6b6b", brick: "#8c2f22" };

/** A corporate recipient's Monday digest across their assigned households. */
export function composeFleetDigest(
  recipientName: string | null,
  households: DigestHousehold[],
  weekOf: string,
): { subject: string; html: string } {
  const needsEyes = households.filter((h) => h.statusTag === "WATCH" || h.statusTag === "LIFE-EVENT");
  const rows = households
    .map((h) => {
      const tagColor = h.statusTag === "LIFE-EVENT" ? BRAND.brick : h.statusTag === "WATCH" ? BRAND.gold : BRAND.grey;
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Georgia,serif">${h.name}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${tagColor};font-weight:700">${h.statusTag}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Helvetica,Arial,sans-serif;font-size:13px">${h.total - h.unconfirmed}/${h.total} confirmed</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Helvetica,Arial,sans-serif;font-size:13px">${h.pendingEdits} edits · ${h.upcomingPrompts} prompts</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Helvetica,Arial,sans-serif;font-size:13px">${h.lastStranger}</td>
      </tr>`;
    })
    .join("");
  const attention = needsEyes.length
    ? `<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.brick};font-weight:700">${needsEyes.length} household(s) need eyes this week: ${needsEyes.map((h) => h.name).join(", ")}.</p>`
    : `<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.grey}">No households flagged for special attention this week.</p>`;
  const html = `<div style="max-width:620px;margin:0 auto">
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.14em;color:${BRAND.gold};font-weight:700">WELL KEPT · FLEET DIGEST · WEEK OF ${weekOf}</p>
    <h2 style="font-family:Georgia,serif;color:${BRAND.green};margin:6px 0 12px">${households.length} household${households.length === 1 ? "" : "s"}${recipientName ? `, ${recipientName}` : ""}</h2>
    ${attention}
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.06em;color:${BRAND.grey};text-transform:uppercase">Household</th>
        <th style="text-align:left;padding:6px 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.grey};text-transform:uppercase">Status</th>
        <th style="text-align:left;padding:6px 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.grey};text-transform:uppercase">Playbook</th>
        <th style="text-align:left;padding:6px 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.grey};text-transform:uppercase">Queues</th>
        <th style="text-align:left;padding:6px 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.grey};text-transform:uppercase">Stranger Test</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${BRAND.grey};margin-top:14px">Open the fleet board to act on any of these. Well Kept</p>
  </div>`;
  const subject = needsEyes.length
    ? `Fleet digest — ${needsEyes.length} need attention (week of ${weekOf})`
    : `Fleet digest — all steady (week of ${weekOf})`;
  return { subject, html };
}
