import { and, eq, isNull, sql, gte } from "drizzle-orm";
import { appSetting, eventOutbox, EXPECTED_MIGRATION_COUNT, LATEST_MIGRATION_TAG } from "@wellkept/schema";
import { db } from "./db";

/**
 * operational-health.ts : the four signals a technical reviewer asks
 * for, computed in one place (comprehensive instruction, Part Five item
 * 1). Worker drain lag, failed and dead-lettered jobs, webhook silence,
 * and migration drift between the running code and the database.
 *
 * WHY ONE SURFACE WHEN THREE OF THE FOUR ALREADY EXIST. They existed
 * SCATTERED: a drain line on the fleet board, a mail card beside it,
 * and migration drift nowhere at all. Scattered means nobody can answer
 * "is the system healthy" without knowing where to look, and the fourth
 * being absent is not an accident of that shape but a consequence of
 * it: a signal with no home is a signal nobody notices is missing.
 *
 * THE ALERTING POSTURE IS STATED HERE AND IT IS HONEST: there is NO
 * alerting. Nothing pages anyone, nothing emails, nothing writes to the
 * notification firewall. This is a page a person opens. Saying so where
 * the code lives, rather than only in a report, is the point: a health
 * surface that looks like monitoring and is not is worse than no
 * surface, because it converts "we are not watching" into "we watched
 * and it was fine".
 *
 * THRESHOLDS ARE NOT INVENTED HERE. Two of the four have a correct
 * value of ZERO by definition and can state a verdict without one
 * (migration drift, dead-lettered rows). The other two need a founder
 * threshold to say whether a number is bad, and they report the number
 * and say THRESHOLD UNSET rather than guessing, which is the
 * visit_reconciliation posture.
 */

/** How often the worker schedules the drain. A fact about the schedule, not a threshold. */
export const DRAIN_CYCLE_MINUTES = 5;

/** The drain's dead-letter cap; a row at or past this stops being retried. */
export const OUTBOX_MAX_ATTEMPTS = 10;

export type Verdict = "ok" | "attention" | "unknown" | "threshold-unset";

export interface HealthSignal {
  key: string;
  label: string;
  verdict: Verdict;
  /** The measurement, always stated even when no verdict can be drawn. */
  reading: string;
  /** What a reader should understand, including what is NOT covered. */
  note: string;
}

function minutesSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 60_000) : null;
}

export async function operationalHealth(): Promise<HealthSignal[]> {
  const settings = await db.select({ key: appSetting.key, value: appSetting.value }).from(appSetting);
  const byKey = new Map(settings.map((s) => [s.key, s.value as Record<string, unknown> | null]));

  const drain = byKey.get("outbox_drain_status") as
    | { lastRunAt?: string; rowsWaitingAfterRun?: number; processed?: number } | undefined;
  const mail = byKey.get("mail_webhook_status") as { lastEventAt?: string; lastKind?: string } | undefined;
  const silenceKnob = byKey.get("mail_webhook_silence") as { hours?: number } | null | undefined;

  const [dead] = await db.select({ n: sql<number>`count(*)::int` }).from(eventOutbox)
    .where(and(isNull(eventOutbox.processedAt), gte(eventOutbox.attempts, OUTBOX_MAX_ATTEMPTS)));
  const [retrying] = await db.select({ n: sql<number>`count(*)::int` }).from(eventOutbox)
    .where(and(isNull(eventOutbox.processedAt), gte(eventOutbox.attempts, 1)));

  const applied = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`)
    .then((r) => Number((r as unknown as { rows: { n: number }[] }).rows[0]?.n ?? -1))
    .catch(() => -1);

  const lag = minutesSince(drain?.lastRunAt);
  const mailAge = minutesSince(mail?.lastEventAt);

  return [
    {
      key: "drain-lag",
      label: "Worker drain lag",
      // No threshold: how many missed cycles is too many is the founder's.
      verdict: lag === null ? "unknown" : "threshold-unset",
      reading: lag === null
        ? "No drain run has ever been recorded."
        : `Last run ${lag} minute(s) ago; the worker schedules one every ${DRAIN_CYCLE_MINUTES}.`,
      note: lag === null
        ? "The worker writes this line on its first drain, so an absent line means the job has never run rather than that it ran and found nothing."
        : "Lag is reported, not judged: how many missed cycles counts as a fault is a founder threshold and is unset. The reading is still the liveness signal a stale worker cannot fake.",
    },
    {
      key: "dead-lettered",
      label: "Dead-lettered outbox rows",
      // Zero is correct by definition: a dead-lettered row is one the
      // drain has given up on, so any count above zero is a fact rather
      // than a threshold question.
      verdict: (dead?.n ?? 0) > 0 ? "attention" : "ok",
      reading: `${dead?.n ?? 0} row(s) at or past ${OUTBOX_MAX_ATTEMPTS} attempts and still unprocessed; ${retrying?.n ?? 0} row(s) have failed at least once.`,
      note: "Kinds with NO registered consumer are excluded from the drain's batch by design and are not counted here, so this number is failures rather than waiting (the A2 ruling's distinction).",
    },
    {
      key: "mail-silence",
      label: "Mail webhook silence",
      verdict: mailAge === null ? "unknown" : silenceKnob?.hours == null ? "threshold-unset" : (mailAge > Number(silenceKnob.hours) * 60 ? "attention" : "ok"),
      reading: mailAge === null
        ? "No provider webhook has ever been received."
        : `Last webhook ${mailAge} minute(s) ago${mail?.lastKind ? ` (${mail.lastKind})` : ""}.`,
      note: silenceKnob?.hours == null
        ? "The mail_webhook_silence knob is unset, so nothing here can be called late. Quiet while null is the designed state, not a fault."
        : `Silence is called at ${silenceKnob.hours} hour(s), the founder-set knob.`,
    },
    {
      key: "migration-drift",
      label: "Migration drift",
      // Zero is correct by definition: the running code was compiled
      // against a known count and the database either matches it or does
      // not. This is the signal G-120 needed and did not have.
      verdict: applied < 0 ? "unknown" : applied === EXPECTED_MIGRATION_COUNT ? "ok" : "attention",
      reading: applied < 0
        ? "The migrations table could not be read."
        : `Database ${applied}, this build expects ${EXPECTED_MIGRATION_COUNT} (through ${LATEST_MIGRATION_TAG}).`,
      note: applied > EXPECTED_MIGRATION_COUNT
        ? "The DATABASE is ahead of the running code, which is the safe direction: an old build ignores columns it does not know."
        : applied < EXPECTED_MIGRATION_COUNT
          ? "The CODE is ahead of the database, which is the UNSAFE direction and is exactly G-120: a query names a column that is not there. Migrations run before the web deploy for this reason."
          : "The expected count is baked in at build time, so this compares the database against the code that is actually running rather than against whatever is on disk.",
    },
  ];
}
