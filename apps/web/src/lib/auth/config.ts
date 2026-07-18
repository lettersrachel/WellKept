import type { AuthConfig } from "@auth/core";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "@auth/core/adapters";
import { authUser, authAccount, authSession, authVerificationToken } from "@wellkept/schema";
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
async function sendMagicLink({ identifier, url }: { identifier: string; url: string }) {
  const sent = getSentLinks();
  if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
    sent.push({ identifier, url, sentAt: new Date().toISOString() });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "Well Kept <onboarding@resend.dev>",
      to: [identifier],
      subject: "Your Well Kept sign-in link",
      html: `<p>Sign in to Well Kept:</p><p><a href="${url}">Open your household</a></p><p>This link expires in 24 hours and works once. If you didn't request it, ignore this email.</p>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`magic-link email failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
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
          maxAge: 24 * 60 * 60,
          sendVerificationRequest: sendMagicLink,
        // The provider shape Auth.js expects for a custom email transport is
        // wider than what this transport needs; the cast covers the gap.
        } as never,
      ],
      session: { strategy: "database" },
      secret: process.env.AUTH_SECRET ?? "dev-only-secret-do-not-use-in-production-000000",
      trustHost: true,
    };
  }
  return g.wkAuthConfig;
}
