/**
 * Public privacy notice (App Store listing requirement; linked from the
 * support page). Content follows docs/legal/privacy-notice.md; the pilot
 * banner stays until counsel signs off (their open items live in that doc).
 */
import { BRAND, BACKUP_RETENTION_WINDOW } from "@wellkept/config";

export const metadata = { title: `Privacy · ${BRAND.companyName}` };

export default function PrivacyPage() {
  return (
    <div className="card" style={{ maxWidth: 640, margin: "40px auto" }}>
      <h2>Privacy notice</h2>
      <div className="note">
        Pilot edition, last updated July 27, 2026. {BRAND.legalEntityName}{" "}
        (&ldquo;{BRAND.companyName},&rdquo; &ldquo;we&rdquo;). Contact:
        lettersrachel@gmail.com.
      </div>

      <h2 style={{ marginTop: 18 }}>What we collect</h2>
      <div className="fval">
        Household operating details (routines, preferences, standards, layout, how each
        standing task is done in your home, and your stated preference rules kept one
        fact per line with a review date, and the Decision Rights block that
        records what you want decided on your behalf and what always comes to you) to run your
        household; secured details (access codes, alarm info) to care for the home, held
        encrypted with every access logged; visit records (tasks, hours, notes, photos, and
        what we noticed but deliberately set aside for later, with the reason and the
        planned timing) for service delivery and accountability; service records (incident and complaint
        records, and staff responses to service reminders) for accountability and service
        quality; practical data (important dates, vendors,
        appliances, subscriptions, and the condition of items we care for, observed over
        time, including conditions we flag to revisit and research we do toward household
        decisions, paused with a plan to return to it, and for equipment we care for the
        serial number as printed, the install date with a note of how precisely we know it,
        and photographs of a unit linked to that unit so a home with two of something has a
        record that says which is which) to anticipate needs; service time and costs (time spent
        serving your household by activity, including the phases of a visit derived
        automatically from visit events, and costs incurred in serving it; a receipt
        photo, where one is captured, is stored and retained exactly like a visit photo);
        your membership record (how you found us, and your membership history);
        operational records (follow-up work we track on your household&apos;s behalf and the planned instances of your standing tasks with our internal working estimates for planning them and a record of how each actually went, items
        our system surfaces to our staff for attention and the situations our staff
        bundle related items into, choices we route internally for a
        decision, notes a staff member captures in their own words for filing, the
        pre-visit briefs we show our staff (kept exactly as shown), what
        our reminder engine would have suggested while we tune it, and delivery
        records from our email provider telling us whether a message we sent you
        arrived) to run the service
        reliably; and account activity (name, email,
        role, sign-in and access logs) to run and secure accounts. We ask clients not to
        provide government IDs, payment card or bank numbers, or health records; the product
        is not designed to hold them.
      </div>

      <h2 style={{ marginTop: 18 }}>How we use it</h2>
      <div className="fval">
        To provide and improve the household service, coordinate the team assigned to you,
        anticipate what your home needs, and keep an accurate, accountable record. We do not
        sell personal information.
      </div>

      <h2 style={{ marginTop: 18 }}>Who sees it</h2>
      <div className="fval">
        Access is role-based and enforced by the software: a client sees a curated view of
        their own household; assigned staff see what their role requires; management has
        oversight. Every view of a secured item and every change is recorded in an
        append-only log. We share outside your service team only with your instruction, with
        vendors who run our infrastructure under contract, or where the law requires.
      </div>

      <h2 style={{ marginTop: 18 }}>How we protect it</h2>
      <div className="fval">
        Encryption of secured items at rest (AES-256-GCM) and of all traffic in transit
        (HTTPS). Staff sign-in requires a personal emailed link and a second factor
        (authenticator app). Access is least-privilege and audited.
      </div>

      <h2 style={{ marginTop: 18 }}>How long we keep it</h2>
      <div className="fval">
        We retain records for the life of your service and, for continuity and
        accountability, may keep archived copies afterward. Some records we keep by
        default even when a household asks us to delete its information, because they are
        our business and employment records: the access log, incident and complaint
        records, records of staff time and service costs, your membership history, and the
        general category of how you found us. When we act on a deletion request, the
        free-text notes those retained records carry are removed along with everything
        else personal to your household. To ask about retention or
        request deletion, contact us at the address above.
      </div>
      <div className="fval" style={{ marginTop: 10 }}>
        When we delete, it is immediate in the system and not yet immediate in our backups.
        The moment we act on a deletion request, nothing we hold can reach the information:
        it is gone from the record, from every screen, and from anything we could export.
        For a limited period afterwards our database backups still contain it, because that
        is what a backup is. Reaching into one is a deliberate, controlled and logged act,
        not something that happens in the course of ordinary work.
        {BACKUP_RETENTION_WINDOW
          ? ` After ${BACKUP_RETENTION_WINDOW} the information is no longer in the backups either.`
          : null}{" "}
        We would rather tell you this than say &quot;deleted&quot; and mean something
        narrower than you would.
      </div>

      <h2 style={{ marginTop: 18 }}>Your rights</h2>
      <div className="fval">
        Depending on where you live, you may have rights to access, correct, delete, or
        restrict use of your information, and to withdraw consent. To exercise any, contact
        us. The client view already shows a live summary of what we hold for you.
      </div>

      <h2 style={{ marginTop: 18 }}>Service providers</h2>
      <div className="fval">
        We rely on Vercel (hosting), Neon (database), Upstash (queues), Railway (background
        worker), and Resend (email delivery), each under their own contractual terms.
      </div>

      <h2 style={{ marginTop: 18 }}>Changes</h2>
      <div className="fval">
        We will post updates here and date them; material changes will be communicated
        directly.
      </div>
    </div>
  );
}
