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

export function getAuthConfig(): AuthConfig {
  if (!g.wkAuthConfig) {
    const sent = getSentLinks();
    g.wkAuthConfig = {
      adapter: getAdapter(),
      basePath: "/api/auth",
      providers: [
        {
          id: "email",
          type: "email",
          name: "Email",
          maxAge: 24 * 60 * 60,
          async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
            sent.push({ identifier, url, sentAt: new Date().toISOString() });
          },
        // The provider shape Auth.js expects for a custom email transport is
        // wider than what a link-recorder needs; the cast is the seam where a
        // real mail provider drops in.
        } as never,
      ],
      session: { strategy: "database" },
      secret: process.env.AUTH_SECRET ?? "dev-only-secret-do-not-use-in-production-000000",
      trustHost: true,
    };
  }
  return g.wkAuthConfig;
}
