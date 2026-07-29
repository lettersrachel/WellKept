/**
 * Server-side error monitoring (launch §2.1). Sentry captures unhandled server
 * errors — API routes, server actions, server components — and pages you when
 * something breaks in the field. Off unless SENTRY_DSN is set, so dev/CI/local
 * stay silent.
 *
 * @sentry/node is Node-only, so everything is behind a dynamic import gated on
 * NEXT_RUNTIME === "nodejs" — the edge runtime (our CSP middleware) never loads
 * it. No browser SDK here, so the enforcing CSP is untouched.
 */
export async function register() {
  // The KEK is validated AT BOOT, not at first seal (2026-07-28 finding:
  // zero vault_item rows meant LocalKms had never been constructed in
  // production, so a mis-encoded WK_KMS_KEY would surface at the vault
  // sprint, exactly when real client data arrives, instead of at deploy
  // time where the smoke checks would catch it). A malformed key fails
  // the boot loudly; an absent key keeps the existing lazy behavior
  // (production refuses at first vault use; dev falls back).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.WK_KMS_KEY) {
    const { LocalKms } = await import("@wellkept/vault");
    new LocalKms(process.env.WK_KMS_KEY); // throws unless base64 of 32 bytes
  }
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0, // errors only — no perf sampling, stays within free tier
      sendDefaultPii: false, // household data must never ride along in an error report
    });
  }
}

export async function onRequestError(error: unknown) {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/node");
    Sentry.captureException(error);
  }
}
