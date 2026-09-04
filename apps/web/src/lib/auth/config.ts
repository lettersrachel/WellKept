import { BRAND } from "@wellkept/config";
import type { AuthConfig } from "@auth/core";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "@auth/core/adapters";
import { authUser, authAccount, authSession, authVerificationToken } from "@wellkept/schema";
import { generateBackupCodes, normalizeBackupCode } from "@wellkept/totp";
import { db } from "../db";

/**
 * Auth.js configuration, ported from the July 12 foundation repo's verified
 * integration. Email magic link only; database sessions via the drizzle
 * adapter (revocable by deleting the row — and the Email provider supports
 * nothing else anyway).
 *
 * The dev email transport records magic links instead of sending them, so the
 * whole flow works with no mail provider; /dev/last-email surfaces the link.
 * Swap in a real provider (Resend/SES/Postmark) before production.
 *
 * Everything is cached on globalThis: Next dev (Turbopack) can instantiate a
 * route's module graph separately per route, and a module-level singleton
 * would give /signin/action and /dev/last-email different, empty transports
 * (a real bug found in the foundation repo).
 */
export interface SentMagicLink { identifier: string; url: string; sentAt: string }

interface AuthGlobals {
  wkAuthConfig?: AuthConfig;
  wkAdapter?: Adapter;
  wkSentLinks?: SentMagicLink[];
}
const g = globalThis as unknown as AuthGlobals;

export function getSentLinks(): SentMagicLink[] {
  g.wkSentLinks ??= [];
  return g.wkSentLinks;
}

export function getAdapter(): Adapter {
  // accountsTable: the adapter's type wants snake_case column *properties*;
  // ours are camelCase like the rest of the schema. The email provider never
  // writes accounts (no OAuth linking), so only the type is loosened here.
  g.wkAdapter ??= DrizzleAdapter(db, {
    usersTable: authUser,
    accountsTable: authAccount as never,
    sessionsTable: authSession,
    verificationTokensTable: authVerificationToken,
  });
  return g.wkAdapter;
}

/**
 * The mail seam. With RESEND_API_KEY set, magic links go out through
 * Resend's HTTP API (no SDK needed) from AUTH_EMAIL_FROM; a non-2xx
 * response throws, so Auth.js surfaces the failure instead of silently
 * "sending" nothing. Without the key (dev, CI), links are recorded and
 * surfaced at /dev/last-email. Both paths record in non-production so the
 * dev page stays useful even while testing a real provider.
 */
/** Display form of a sign-in code: ABCD-EFGH (stored/verified normalized). */
function formatSigninCode(token: string): string {
  const t = token.toUpperCase();
  return `${t.slice(0, 4)}-${t.slice(4)}`;
}

/** Minimal HTML escape for the one user-supplied value in the email body. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

async function sendMagicLink({ identifier, url, token }: { identifier: string; url: string; token: string }) {
  const sent = getSentLinks();
  if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
    sent.push({ identifier, url, sentAt: new Date().toISOString() });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // In production a silently-unsent link is a lockout, not a fallback.
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set: no way to deliver sign-in links in production");
    }
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? BRAND.emailFromFallback,
      to: [identifier],
      subject: `Your ${BRAND.companyName} sign-in link`,
      html: `<p>Sign in to ${BRAND.companyName}:</p><p><a href="${url}">Open your household</a></p>`
        // G-70: SAY WHICH ADDRESS. Two identities can share one inbox
        // (plus-addressing, which the one-role index forces when one
        // person covers two roles on a household), and these emails were
        // otherwise byte-identical: same subject, same body, differing
        // only in a to: header most clients hide. Naming the address is
        // the last place this can be caught before a link is clicked.
        // Copy is a proposal, one string.
        + `<p>This link signs in <strong>${escapeHtml(identifier)}</strong>. If that is not the address you meant, ignore this email and ask for another.</p>`
        + `<p>Signing in on the installed phone app? Enter this code on the "Check your email" screen instead:</p>`
        + `<p style="font-size:22px;letter-spacing:3px;font-family:monospace"><b>${formatSigninCode(token)}</b></p>`
        + `<p>The link and code expire in 1 hour and work once. If you didn't request this, ignore this email.</p>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`magic-link email failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  // G-30: log Resend's message id (no recipient — the id looks up the full
  // record in the Resend dashboard). The 2026-07-25 "silent drop" turned
  // out to be delivered-but-not-seen; this line makes the next report
  // diagnosable in one dashboard search instead of a day of guessing.
  const { id } = (await res.json().catch(() => ({}))) as { id?: string };
  console.log(`magic-link accepted by resend: id=${id ?? "(no id returned)"}`);
}

const DEV_SECRET = "dev-only-secret-do-not-use-in-production-000000";

function resolveSecret(): string {
  const secret = process.env.AUTH_SECRET ?? DEV_SECRET;
  if (process.env.NODE_ENV === "production" && secret === DEV_SECRET) {
    // Refuse to run production sessions on the published dev secret.
    throw new Error("AUTH_SECRET must be set in production (openssl rand -hex 32)");
  }
  return secret;
}

export function getAuthConfig(): AuthConfig {
  if (!g.wkAuthConfig) {
    g.wkAuthConfig = {
      adapter: getAdapter(),
      basePath: "/api/auth",
      providers: [
        {
          id: "email",
          type: "email",
          name: "Email",
          // 1 hour: the token doubles as a typeable sign-in code (8 chars,
          // base31, ~40 bits) for the installed PWA, where the emailed link
          // opens Safari instead of the app. Single-use + short expiry +
          // rate-limited entry keep the shorter token safe.
          maxAge: 60 * 60,
          generateVerificationToken: async () => normalizeBackupCode(generateBackupCodes(1)[0]!),
          sendVerificationRequest: sendMagicLink,
        // The provider shape Auth.js expects for a custom email transport is
        // wider than what this transport needs; the cast covers the gap.
        } as never,
      ],
      session: { strategy: "database" },
      secret: resolveSecret(),
      trustHost: true,
    };
  }
  return g.wkAuthConfig;
}
