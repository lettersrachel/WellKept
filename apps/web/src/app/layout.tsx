import type { Metadata } from "next";
import "./globals.css";
import { getRole } from "@/lib/session";
import { switchRole } from "@/lib/actions";
import { getHousehold } from "@/lib/data";

export const metadata: Metadata = {
  title: "Well Kept",
  description: "One household record, three permission-filtered projections.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [role, hh] = await Promise.all([getRole(), getHousehold()]);
  return (
    <html lang="en">
      <body>
        <header className="masthead">
          <h1>WELL KEPT &nbsp;|&nbsp; {hh ? hh.name : "No household seeded"}</h1>
          <form action={switchRole} className="roles">
            <button name="role" value="client" className={role === "client" ? "on" : ""}>
              Client
            </button>
            <button
              name="role"
              value="corporate_admin"
              className={role === "corporate_admin" ? "on" : ""}
            >
              Corporate
            </button>
          </form>
        </header>
        <main>{children}</main>
        <div className="footnote">
          One data model, permission-filtered projections (WK-APP-003). Paper remains the
          pilot&apos;s system of record (ADR-001). Demo identities; no real S3 values enter the app
          before sprint 5 + hardening.
        </div>
      </body>
    </html>
  );
}
