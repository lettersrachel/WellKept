import type { Metadata } from "next";
import "./globals.css";
import { getHouseholdAndPrincipal } from "@/lib/data";

export const metadata: Metadata = {
  title: "Well Kept",
  description: "One household record, three permission-filtered projections.",
};

const ROLE_LABEL: Record<string, string> = {
  client: "Client",
  house_manager: "House Manager",
  backup_hm: "Backup HM",
  corporate_ops: "Corporate Ops",
  corporate_admin: "Corporate",
  cfo_readonly: "CFO (read-only)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { hh, principal } = await getHouseholdAndPrincipal();
  return (
    <html lang="en">
      <body>
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
        <main>{children}</main>
        <div className="footnote">
          One data model, permission-filtered projections (WK-APP-003). Paper remains the
          pilot&apos;s system of record (ADR-001). No real S3 values enter the app before
          sprint 5 + hardening.
        </div>
      </body>
    </html>
  );
}
