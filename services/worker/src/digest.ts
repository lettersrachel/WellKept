/**
 * REQ-060: the weekly fleet digest. For each corporate_admin, gather their
 * assigned households into a summary and email it. Best-effort per
 * recipient. In dev (no RESEND_API_KEY) it logs the composed subject
 * instead of sending, so the run is verifiable without a provider.
 */
import pg from "pg";
import { composeFleetDigest, sendResendEmail, type DigestHousehold } from "@wellkept/mail";

const CORP_ROLES = new Set(["corporate_admin"]);

export async function runFleetDigest(pool: pg.Pool) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? "Well Kept <onboarding@resend.dev>";
  const weekOf = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  const { rows: admins } = await pool.query(
    `SELECT DISTINCT u.id, u.email, u.name
       FROM household_role_assignment a JOIN auth_user u ON u.id = a.user_id
      WHERE a.role = 'corporate_admin'`,
  );

  let sent = 0;
  const previews: { to: string; subject: string; households: number }[] = [];
  for (const admin of admins) {
    const { rows: hh } = await pool.query(
      `SELECT h.id, h.name, h.tier, h.status_tag FROM household h
         JOIN household_role_assignment a ON a.household_id = h.id
        WHERE a.user_id = $1 AND a.role = 'corporate_admin'
        ORDER BY h.created_at`,
      [admin.id],
    );
    if (hh.length === 0) continue;

    const households: DigestHousehold[] = [];
    for (const h of hh) {
      const [{ rows: fields }, { rows: edits }, { rows: prompts }, { rows: tests }] = await Promise.all([
        pool.query("SELECT count(*)::int total, count(*) FILTER (WHERE NOT confirmed)::int unconfirmed FROM playbook_field WHERE household_id=$1", [h.id]),
        pool.query("SELECT count(*)::int n FROM client_edit WHERE household_id=$1 AND status='pending'", [h.id]),
        pool.query("SELECT count(*)::int n FROM prompt_pack_item WHERE household_id=$1 AND fired_at IS NULL AND NOT suppressed_by_tag", [h.id]),
        pool.query("SELECT passed, created_at FROM stranger_test WHERE household_id=$1 ORDER BY created_at DESC LIMIT 1", [h.id]),
      ]);
      const t = tests[0];
      households.push({
        name: h.name, tier: h.tier, statusTag: h.status_tag,
        total: fields[0].total, unconfirmed: fields[0].unconfirmed,
        pendingEdits: edits[0].n, upcomingPrompts: prompts[0].n,
        lastStranger: t ? `${t.passed ? "PASS" : "FRICTION"} ${new Date(t.created_at).toISOString().slice(5, 10)}` : "never",
      });
    }

    const { subject, html } = composeFleetDigest(admin.name, households, weekOf);
    previews.push({ to: admin.email, subject, households: households.length });
    if (apiKey) {
      try {
        await sendResendEmail({ apiKey, from, to: admin.email, subject, html });
        sent += 1;
      } catch (err) {
        console.error(`[digest] send to ${admin.email} failed:`, err instanceof Error ? err.message : err);
      }
    } else {
      console.log(`[digest] (dev, not sent) -> ${admin.email}: ${subject}`);
    }
  }
  return { admins: admins.length, sent, previews };
}
