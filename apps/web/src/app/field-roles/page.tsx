/** HM and backup-HM sessions land here: their surface is the mobile app (sprints 3-5). */
export default function FieldRoles() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
      <h2>The field app is your surface</h2>
      <div className="note">
        House-manager and backup-HM work — briefing, close flow, stranger mode, vault reveals —
        lives in the mobile app, not this portal. The web portals serve clients and corporate
        (WK-DEV-004 S1).
      </div>
    </div>
  );
}
