/**
 * The erasure path (REQ-071 / legal drafts "right to erasure"): execute a
 * household's deletion request. This is the MECHANISM — whether and when to
 * run it for a given request is counsel + founder policy (the legal README's
 * tombstone-vs-erasure reconciliation). The tool is deliberately a CLI, not
 * a button: erasure is a considered act, run by a human, twice (dry-run
 * shows exactly what will happen; --commit does it).
 *
 * What it does, per table:
 *  - vault_item: rows DELETED — removing ciphertext + wrapped keys is a
 *    crypto-shred; the secrets are unrecoverable... in the LIVE database.
 *    Inside Neon's point-in-time-recovery window a restore branch can
 *    reconstitute deleted rows while the KEK is still live, so for that
 *    window erasure is a strong revocation of access, not destruction —
 *    the history-retention setting is the true floor on erasure latency
 *    (gap register G-04; counsel writes the notice knowing this).
 *  - visit_photo: image bytes cleared + purged_at stamped (tombstone rows
 *    remain). Retention holds are HONOURED by default — a hold exists
 *    precisely because the photo substantiates an open incident or
 *    dispute; destroying it while preserving the incident row would keep
 *    the claim and burn the evidence (gap register G-03). Pass
 *    --override-holds only when counsel directs that a deletion right
 *    defeats the hold.
 *  - OPEN INCIDENTS BLOCK THE RUN. If the household has an open
 *    incident_report, the tool refuses (even the dry run says so) unless
 *    --despite-open-incidents is passed. The 2am default must never
 *    silently choose between a deletion request and a live dispute.
 *  - playbook_field: value/note cleared, tombstoned.
 *  - registry_entry: label '[erased]', detail {}, tombstoned.
 *  - dot / visit / visit_command / gesture / stranger_test / client_edit /
 *    season_observation / prompt_pack_item / prompt_outcome notes: free-text
 *    content replaced with '[erased]' or cleared; rows remain as structure.
 *  - incident_report: KEPT by default (legally significant business records;
 *    a dispute may outlive the service). --erase-incidents clears their
 *    descriptions too if counsel directs.
 *  - audit_event: KEPT (append-only accountability; carries hashes, not
 *    values). --scrub-audit-detail replaces detail payloads (which can carry
 *    emails) with {erased:true} if counsel directs.
 *  - time_entry / cost_entry: rows KEPT by default (employer and business
 *    records - hours worked and money spent outlive the household data
 *    they served); free-text notes are blanked. --erase-time-and-costs
 *    deletes the rows if counsel directs. A cost entry's receipt photo is
 *    a visit_photo row and is purged by the photo pass above.
 *  - membership_event: rows KEPT by default (commercial history is a
 *    business record); cancellation reasons (free text) are blanked.
 *    --erase-membership-history deletes the rows if counsel directs.
 *  - household.referral_source / referral_note: CLEARED by default - how a
 *    household found us is personal data with no business-record claim
 *    once the household is erased.
 *  - household: renamed 'Erased household', archived; consent fields kept
 *    (the record THAT consent existed outlives the data it covered).
 *  - role assignments for the household are deleted and those users'
 *    sessions revoked (client accounts lose access; auth_user rows remain —
 *    remove them from People & access once no other household needs them).
 *
 * Usage (from apps/web so `pg` resolves):
 *   DATABASE_URL="<url>" node scripts/erase-household.mjs <household-id>            # dry run
 *   DATABASE_URL="<url>" node scripts/erase-household.mjs <household-id> --commit
 *   flags: --erase-incidents --scrub-audit-detail --override-holds --despite-open-incidents
 *          --erase-time-and-costs --erase-membership-history
 */
import pg from "pg";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const ERASE_INCIDENTS = args.includes("--erase-incidents");
const SCRUB_AUDIT = args.includes("--scrub-audit-detail");
const OVERRIDE_HOLDS = args.includes("--override-holds");
const DESPITE_OPEN = args.includes("--despite-open-incidents");
const ERASE_TIME_COSTS = args.includes("--erase-time-and-costs");
const ERASE_MEMBERSHIP = args.includes("--erase-membership-history");
const householdId = args.find((a) => !a.startsWith("--"));

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL."); process.exit(1); }
if (!householdId || !/^[0-9a-f-]{36}$/i.test(householdId)) {
  console.error("Usage: node scripts/erase-household.mjs <household-uuid> [--commit] [--erase-incidents] [--scrub-audit-detail] [--override-holds] [--despite-open-incidents]");
  process.exit(1);
}

const c = new pg.Client({ connectionString: url });
await c.connect();

const { rows: [hh] } = await c.query("SELECT id, name, archived_at FROM household WHERE id=$1", [householdId]);
if (!hh) { console.error(`No household ${householdId}.`); await c.end(); process.exit(1); }

const count = async (sql) => Number((await c.query(sql, [householdId])).rows[0].n);

// G-03 guard: an open incident blocks the run entirely unless explicitly
// overridden — the tool must never silently choose between a deletion
// request and a live dispute. Checked before anything else, dry run included.
const openIncidents = await count("SELECT count(*) n FROM incident_report WHERE household_id=$1 AND status='open'");
if (openIncidents > 0 && !DESPITE_OPEN) {
  console.error(
    `\nREFUSED: household has ${openIncidents} OPEN incident(s). Resolve them first, or — if counsel`
    + `\ndirects that the deletion request proceeds despite the dispute — re-run with --despite-open-incidents.\n`,
  );
  await c.end();
  process.exit(2);
}

const counts = {
  vault: await count("SELECT count(*) n FROM vault_item WHERE household_id=$1"),
  photos: await count("SELECT count(*) n FROM visit_photo WHERE household_id=$1 AND purged_at IS NULL AND retention_hold=false"),
  heldPhotos: await count("SELECT count(*) n FROM visit_photo WHERE household_id=$1 AND purged_at IS NULL AND retention_hold=true"),
  fields: await count("SELECT count(*) n FROM playbook_field WHERE household_id=$1"),
  registries: await count("SELECT count(*) n FROM registry_entry WHERE household_id=$1"),
  dots: await count("SELECT count(*) n FROM dot WHERE household_id=$1"),
  visits: await count("SELECT count(*) n FROM visit WHERE household_id=$1"),
  commands: await count("SELECT count(*) n FROM visit_command WHERE household_id=$1"),
  gestures: await count("SELECT count(*) n FROM gesture WHERE household_id=$1"),
  stranger: await count("SELECT count(*) n FROM stranger_test WHERE household_id=$1"),
  edits: await count("SELECT count(*) n FROM client_edit WHERE household_id=$1"),
  season: await count("SELECT count(*) n FROM season_observation WHERE household_id=$1"),
  prompts: await count("SELECT count(*) n FROM prompt_pack_item WHERE household_id=$1"),
  outcomes: await count("SELECT count(*) n FROM prompt_outcome WHERE household_id=$1 AND note IS NOT NULL"),
  incidents: await count("SELECT count(*) n FROM incident_report WHERE household_id=$1"),
  roles: await count("SELECT count(*) n FROM household_role_assignment WHERE household_id=$1"),
  timeEntries: await count("SELECT count(*) n FROM time_entry WHERE household_id=$1"),
  costEntries: await count("SELECT count(*) n FROM cost_entry WHERE household_id=$1"),
  membershipEvents: await count("SELECT count(*) n FROM membership_event WHERE household_id=$1"),
};

console.log(`\n${COMMIT ? "ERASING" : "DRY RUN (no changes)"} — household "${hh.name}" (${hh.id})\n`);
if (openIncidents > 0) console.log(`  !! ${openIncidents} OPEN incident(s) — proceeding on --despite-open-incidents\n`);
console.log(`  vault items to CRYPTO-SHRED (rows deleted, unrecoverable*): ${counts.vault}`);
console.log(`     *inside the Neon PITR window a restore can reconstitute them (G-04) — retention is the erasure-latency floor`);
console.log(`  photos to purge (bytes cleared, tombstones remain):        ${counts.photos}`);
console.log(`  photos under retention hold: ${counts.heldPhotos}${counts.heldPhotos > 0 ? (OVERRIDE_HOLDS ? " — WILL BE PURGED (--override-holds)" : " — HONOURED, kept (pass --override-holds only if counsel directs)") : ""}`);
console.log(`  playbook fields to clear + tombstone:                      ${counts.fields}`);
console.log(`  registry entries to clear + tombstone:                     ${counts.registries}`);
console.log(`  dots / visits / commands to blank:                         ${counts.dots} / ${counts.visits} / ${counts.commands}`);
console.log(`  gestures / stranger tests / client edits to blank:         ${counts.gestures} / ${counts.stranger} / ${counts.edits}`);
console.log(`  season observations / prompts / outcome notes to blank:    ${counts.season} / ${counts.prompts} / ${counts.outcomes}`);
console.log(`  incident reports: ${ERASE_INCIDENTS ? `${counts.incidents} descriptions WILL be erased (--erase-incidents)` : `${counts.incidents} KEPT (business records; pass --erase-incidents if counsel directs)`}`);
console.log(`  audit events: ${SCRUB_AUDIT ? "detail payloads WILL be scrubbed (--scrub-audit-detail)" : "kept intact (hashes, no values)"}`);
  console.log(`  time/cost entries: ${ERASE_TIME_COSTS ? `${counts.timeEntries}/${counts.costEntries} rows WILL be deleted (--erase-time-and-costs)` : `${counts.timeEntries}/${counts.costEntries} KEPT, notes blanked (employer/business records; receipt photos purge with photos above)`}`);
  console.log(`  membership events: ${ERASE_MEMBERSHIP ? `${counts.membershipEvents} rows WILL be deleted (--erase-membership-history)` : `${counts.membershipEvents} KEPT, cancellation reasons blanked (commercial history is a business record)`}`);
  console.log(`  referral source + note: cleared (personal data, no business-record claim)`);
console.log(`  role assignments to delete (sessions revoked):             ${counts.roles}`);

if (!COMMIT) {
  console.log("\nRe-run with --commit to execute. This is not reversible — the vault shred cannot be undone.\n");
  await c.end();
  process.exit(0);
}

await c.query("BEGIN");
try {
  const E = "[erased]";
  await c.query("DELETE FROM vault_item WHERE household_id=$1", [householdId]);
  // Holds honoured by default (G-03): held photos substantiate an open
  // incident or dispute and survive unless counsel explicitly directs.
  await c.query(
    OVERRIDE_HOLDS
      ? "UPDATE visit_photo SET data='', purged_at=now(), retention_hold=false, reuse_allowed=false WHERE household_id=$1 AND purged_at IS NULL"
      : "UPDATE visit_photo SET data='', purged_at=now(), reuse_allowed=false WHERE household_id=$1 AND purged_at IS NULL AND retention_hold=false",
    [householdId],
  );
  await c.query("UPDATE playbook_field SET value='', note='', tombstoned_at=now(), updated_at=now() WHERE household_id=$1", [householdId]);
  await c.query("UPDATE registry_entry SET label=$2, detail='{}', tombstoned_at=now(), updated_at=now() WHERE household_id=$1", [householdId, E]);
  await c.query("UPDATE dot SET verbatim=$2, updated_at=now() WHERE household_id=$1", [householdId, E]);
  await c.query("UPDATE visit SET changes_noticed=NULL, signal_detail=NULL, zone_drift_notes='', report_sentence_1='', report_sentence_2='', report_sentence_3='', updated_at=now() WHERE household_id=$1", [householdId]);
  await c.query("UPDATE visit_command SET payload='{}', reason=NULL WHERE household_id=$1", [householdId]);
  await c.query("UPDATE gesture SET idea=$2, updated_at=now() WHERE household_id=$1", [householdId, E]);
  await c.query("UPDATE stranger_test SET friction_notes='[]', updated_at=now() WHERE household_id=$1", [householdId]);
  await c.query("UPDATE client_edit SET proposed_value=$2, updated_at=now() WHERE household_id=$1", [householdId, E]);
  await c.query("UPDATE season_observation SET summary=$2 WHERE household_id=$1", [householdId, E]);
  await c.query("UPDATE prompt_pack_item SET item_text=$2, updated_at=now() WHERE household_id=$1", [householdId, E]);
  await c.query("UPDATE prompt_outcome SET note=NULL WHERE household_id=$1", [householdId]);
  // Capture-session tables (G-40): business/employer rows survive by
  // default; their free text does not. Deletion is a counsel-directed flag.
  if (ERASE_TIME_COSTS) {
    await c.query("DELETE FROM time_entry WHERE household_id=$1", [householdId]);
    await c.query("DELETE FROM cost_entry WHERE household_id=$1", [householdId]);
  } else {
    await c.query("UPDATE time_entry SET note=NULL, updated_at=now() WHERE household_id=$1 AND note IS NOT NULL", [householdId]);
    await c.query("UPDATE cost_entry SET note=NULL, updated_at=now() WHERE household_id=$1 AND note IS NOT NULL", [householdId]);
  }
  if (ERASE_MEMBERSHIP) {
    await c.query("DELETE FROM membership_event WHERE household_id=$1", [householdId]);
  } else {
    await c.query("UPDATE membership_event SET reason=NULL, updated_at=now() WHERE household_id=$1 AND reason IS NOT NULL", [householdId]);
  }
  if (ERASE_INCIDENTS) {
    await c.query("UPDATE incident_report SET description=$2, resolution_note=CASE WHEN resolution_note IS NULL THEN NULL ELSE $2 END, updated_at=now() WHERE household_id=$1", [householdId, E]);
  }
  if (SCRUB_AUDIT) {
    await c.query(`UPDATE audit_event SET detail='{"erased":true}' WHERE household_id=$1 AND detail IS NOT NULL`, [householdId]);
  }
  const { rows: roleUsers } = await c.query("SELECT user_id FROM household_role_assignment WHERE household_id=$1", [householdId]);
  await c.query("DELETE FROM household_role_assignment WHERE household_id=$1", [householdId]);
  for (const r of roleUsers) {
    // Only revoke sessions for users with no remaining assignments anywhere.
    const { rows: [left] } = await c.query("SELECT count(*) n FROM household_role_assignment WHERE user_id=$1", [r.user_id]);
    if (Number(left.n) === 0) await c.query("DELETE FROM auth_session WHERE user_id=$1", [r.user_id]);
  }
  await c.query("UPDATE household SET name=$2, membership_terms=NULL, referral_source=NULL, referral_note=NULL, archived_at=now(), updated_at=now() WHERE id=$1", [householdId, `Erased household ${householdId.slice(0, 8)}`]);
  // The erasure itself is the last audit entry the household ever gets.
  await c.query(
    `INSERT INTO audit_event (id, household_id, actor_user, actor_role, kind, detail, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'erasure_tool', 'household_erased', $3, now(), now())`,
    [householdId, "00000000-0000-0000-0000-000000000000", JSON.stringify({ eraseIncidents: ERASE_INCIDENTS, scrubAuditDetail: SCRUB_AUDIT, overrideHolds: OVERRIDE_HOLDS, despiteOpenIncidents: DESPITE_OPEN, eraseTimeAndCosts: ERASE_TIME_COSTS, eraseMembershipHistory: ERASE_MEMBERSHIP, openIncidents, counts })],
  );
  await c.query("COMMIT");
} catch (err) {
  await c.query("ROLLBACK");
  console.error("\nFAILED — rolled back, nothing changed:", err.message);
  await c.end();
  process.exit(1);
}

console.log(`\nDone. Vault crypto-shredded; content erased; structure and audit retained.`);
console.log(`Remove the household's people from People & access if they serve no other household.\n`);
await c.end();
