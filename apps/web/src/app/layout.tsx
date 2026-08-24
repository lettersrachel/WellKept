import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getHouseholdAndPrincipal, getFieldHouseholdAndPrincipal } from "@/lib/data";
import { ServiceWorker } from "./ServiceWorker";
import { SkewWatch } from "@/components/SkewWatch";

export const metadata: Metadata = {
  title: "Well Kept",
  description: "One household record, three permission-filtered projections.",
  // Installable PWA: "Add to Home Screen" gives an app icon + full-screen launch.
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Well Kept", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1C3D2E",
};

const ROLE_LABEL: Record<string, string> = {
  client: "Client",
  house_manager: "HOM",
  backup_hm: "Backup HOM",
  corporate_ops: "Corporate Ops",
  corporate_admin: "Corporate",
  cfo_readonly: "CFO (read-only)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The masthead is best-effort: a build-time prerender (e.g. the 404 page)
  // or a down database must never take the shell with it. Fail closed to
  // the signed-out chrome; the pages themselves still guard access.
  // On the field surface the masthead matches the field tool's household —
  // a corporate-elsewhere/HM-here user was seeing their first assigned
  // household up top while /visit showed the one they manage.
  let pathname = "";
  try {
    pathname = (await headers()).get("x-wk-pathname") ?? "";
  } catch {
    // build-time prerender has no request; the default resolver is fine
  }
  const resolve = pathname.startsWith("/visit") ? getFieldHouseholdAndPrincipal : getHouseholdAndPrincipal;
  const { hh, principal } = await resolve().catch(
    () => ({ hh: null, principal: null }) as const,
  );
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <ServiceWorker />
        {/* G-37: version-skew heartbeat — a page from before the last deploy announces itself. */}
        <SkewWatch />
        <header className="masthead">
          <h1>WELL KEPT{hh && principal ? <> &nbsp;|&nbsp; {hh.name}</> : null}</h1>
          {principal ? (
            <form action="/signout/action" method="post" className="roles">
              <span className="sans" style={{ fontSize: 12, color: "#e4ede4", alignSelf: "center" }}>
                {principal.email} · {ROLE_LABEL[principal.role] ?? principal.role}
              </span>
              <button>Sign out</button>
            </form>
          ) : null}
        </header>
        <main id="main">{children}</main>
        <div className="footnote">
          One data model, permission-filtered projections (WK-APP-003). Paper remains the
          pilot&apos;s system of record (ADR-001). No real S3 values enter the app before
          sprint 5 + hardening.
        </div>
      </body>
    </html>
  );
}
