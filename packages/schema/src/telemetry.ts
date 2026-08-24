/**
 * CAND-PRIV-01 (dated BEFORE HO real data enters): telemetry redaction as
 * a mechanism, not a comment. Both Sentry inits already run with
 * sendDefaultPii false and never attach job data; this scrubber closes
 * the class those settings cannot reach: the ERROR TEXT itself. A
 * postgres constraint failure says "Failing row contains (...)" with the
 * actual row values, and a captured exception carries that message
 * verbatim; a drizzle error can echo query params the same way. The
 * scrubber runs as beforeSend in web and worker alike, and the
 * telemetry-discipline guard asserts the wiring so a removed scrubber
 * fails CI instead of failing silently.
 *
 * Redactions, deliberately targeted rather than total (an error report
 * with no message helps nobody):
 * - "DETAIL: ..." and "Failing row contains ..." tails are cut (the pg
 *   value-leak shapes).
 * - "params: ..." tails are cut (the query-parameter leak shape).
 * - request, breadcrumbs, and extra are dropped wholesale: bodies,
 *   cookies, console arguments, and free-form attachments are exactly
 *   where household content rides along uninvited.
 * - every surviving message is capped, so an unforeseen leak shape is
 *   bounded even when it is not recognized.
 */
const TAIL_PATTERNS = [
  /DETAIL:[\s\S]*/,
  /Failing row contains[\s\S]*/i,
  /params:[\s\S]*/i,
];
const MAX_MESSAGE = 500;

export function redactErrorText(text: string): string {
  let out = text;
  for (const re of TAIL_PATTERNS) out = out.replace(re, "[redacted: may carry row values]");
  if (out.length > MAX_MESSAGE) out = `${out.slice(0, MAX_MESSAGE)} [truncated]`;
  return out;
}

type SentryEventLike = {
  message?: unknown;
  exception?: { values?: Array<{ value?: unknown }> };
  request?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
};

export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  if (typeof event.message === "string") event.message = redactErrorText(event.message);
  for (const v of event.exception?.values ?? []) {
    if (typeof v.value === "string") v.value = redactErrorText(v.value);
  }
  delete event.request;
  delete event.breadcrumbs;
  delete event.extra;
  return event;
}
