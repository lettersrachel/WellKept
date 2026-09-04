import { BRAND } from "@wellkept/config";
import pg from "pg";
import { composeClientWeeklyDigest, sendResendEmail, type ClientWeekDigestInput } from "@wellkept/mail";

/**
 * The client weekly digest (launch scope, WK-DEV-006 24.2; 24.5 tag
 * LAUNCH-COMMITTED, built in the HO sprint). One email per client per
 * household per week, rolling up ONLY what the household may see: the
 * week's visit reports, deferrals since taken care of, and what is
 * noticed and planned for later. Ships DARK behind the
 * client_weekly_digest feature flag (CAND-REL-01): nothing sends until
 * the founder reviews the sample and sets the flag, which is the
 * founder-approves-before-first-real-send rule enforced in code rather
 * than remembered.
 */
export async function runClientWeeklyDigest(pool: pg.Pool) {
  const { rows: flagRows } = await pool.query("SELECT value FROM app_setting WHERE key='feature_flags'");
  const flags = (flagRows[0]?.value as Record<string, unknown> | undefined) ?? {};
  if (flags.client_weekly_digest !== true) {
    console.log("[client-digest] dark (client_weekly_digest flag not set); composing nothing");
    return { sent: 0, dark: true };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? BRAND.emailFromFallback;
  const weekOf = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  const { rows: households } = await pool.query(
    "SELECT id, name FROM household WHERE NOT is_fixture AND archived_at IS NULL ORDER BY created_at",
  );

  let sent = 0;
  for (const hh of households) {
    const [{ rows: visits }, { rows: taken }, { rows: open }, { rows: clients }] = await Promise.all([
      pool.query(
        `SELECT payload FROM visit_command
          WHERE household_id=$1 AND type='visit.submit' AND status='applied'
            AND received_at > now() - interval '7 days' ORDER BY received_at`,
        [hh.id],
      ),
      pool.query(
        `SELECT noticed FROM deferral
          WHERE household_id=$1 AND resolved_at > now() - interval '7 days' ORDER BY resolved_at`,
        [hh.id],
      ),
      pool.query(
        `SELECT noticed, revisit_date, revisit_condition FROM deferral
          WHERE household_id=$1 AND resolved_at IS NULL ORDER BY decided_at`,
        [hh.id],
      ),
      pool.query(
        `SELECT u.email, u.name FROM household_role_assignment a
           JOIN auth_user u ON u.id = a.user_id
          WHERE a.household_id=$1 AND a.role='client'`,
        [hh.id],
      ),
    ]);
    if (clients.length === 0) continue;

    const input: ClientWeekDigestInput = {
      householdName: hh.name,
      weekOf,
      visits: visits.map((v) => {
        const p = v.payload as { report?: string[]; photoIds?: string[] };
        return { report: p.report ?? [], photoCount: (p.photoIds ?? []).length };
      }),
      takenCareOf: taken.map((d) => ({ noticed: d.noticed })),
      plannedForLater: open.map((d) => ({ noticed: d.noticed, planned: d.revisit_date ?? d.revisit_condition ?? "soon" })),
    };
    const composed = composeClientWeeklyDigest(input);
    if (!composed) continue; // an empty week sends nothing (proposal)

    for (const client of clients) {
      if (apiKey) {
        try {
          await sendResendEmail({ apiKey, from, to: client.email, subject: composed.subject, html: composed.html });
          sent += 1;
        } catch (err) {
          console.error(`[client-digest] send to household ${hh.id} failed:`, err instanceof Error ? err.message : err);
        }
      } else {
        console.log(`[client-digest] (dev, not sent) -> household ${hh.id}: ${composed.subject}`);
      }
    }
  }
  return { sent, dark: false };
}
