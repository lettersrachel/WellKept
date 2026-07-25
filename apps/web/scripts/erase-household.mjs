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
 *    crypto-shred; the secrets are unrecoverable. The one deliberate
 *    exception to "nothing hard-deletes": tombstoned ciphertext would still
 *    be the secret.
 *  - visit_photo: image bytes cleared + purged_at stamped (tombstone rows
 *    remain). Erasure overrides retention holds — a legal hold that must
 *    survive an erasure request is counsel's call to make BEFORE running.
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
 *  - household: renamed 'Erased household', archived; consent fields kept
 *    (the record THAT consent existed outlives the data it covered).
 *  - role assignments for the household are deleted and those users'
 *    sessions revoked (client accounts lose access; auth_user rows remain —
 *    remove them from People & access once no other household needs them).
 *
 * Usage (from apps/web so `pg` resolves):
 *   DATABASE_URL="<url>" node scripts/erase-household.mjs <household-id>            # dry run
 *   DATABASE_URL="<url>" node scripts/erase-household.mjs <household-id> --commit
 *   flags: --erase-incidents --scrub-audit-detail
 */
import pg from "pg";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const ERASE_INCIDENTS = args.includes("--erase-incidents");
const SCRUB_AUDIT = args.includes("--scrub-audit-detail");
const householdId = args.find((a) => !a.startsWith("--"));

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL."); process.exit(1); }
if (!householdId || !/^[0-9a-f-]{36}$/i.test(householdId)) {
  console.error("Usage: node scripts/erase-household.mjs <household-uuid> [--commit] [--erase-incidents] [--scrub-audit-detail]");
  process.exit(1);
}

const c = new pg.Client({ connectionString: url });
await c.connect();

const { rows: [hh] } = await c.query("SELECT id, name, archived_at FROM household WHERE id=$1", [householdId]);
if (!hh) { console.error(`No household ${householdId}.`); await c.end(); process.exit(1); }

const count = async (sql) => Number((await c.query(sql, [householdId])).rows[0].n);
const counts = {
  vault: await count("SELECT count(*) n FROM vault_item WHERE household_id=$1"),
  photos: await count("SELECT count(*) n FROM visit_photo WHERE household_id=$1 AND purged_at IS NULL"),
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
};

console.log(`\n${COMMIT ? "ERASING" : "DRY RUN (no changes)"} — household "${hh.name}" (${hh.id})\n`);
console.log(`  vault items to CRYPTO-SHRED (rows deleted, unrecoverable): ${counts.vault}`);
console.log(`  photos to purge (bytes cleared, tombstones remain):        ${counts.photos}  (erasure overrides holds)`);
console.log(`  playbook fields to clear + tombstone:                      ${counts.fields}`);
console.log(`  registry entries to clear + tombstone:                     ${counts.registries}`);
console.log(`  dots / visits / commands to blank:                         ${counts.dots} / ${counts.visits} / ${counts.commands}`);
console.log(`  gestures / stranger tests / client edits to blank:         ${counts.gestures} / ${counts.stranger} / ${counts.edits}`);
console.log(`  season observations / prompts / outcome notes to blank:    ${counts.season} / ${counts.prompts} / ${counts.outcomes}`);
console.log(`  incident reports: ${ERASE_INCIDENTS ? `${counts.incidents} descriptions WILL be erased (--erase-incidents)` : `${counts.incidents} KEPT (business records; pass --erase-incidents if counsel directs)`}`);
console.log(`  audit events: ${SCRUB_AUDIT ? "detail payloads WILL be scrubbed (--scrub-audit-detail)" : "kept intact (hashes, no values)"}`);
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
  await c.query("UPDATE visit_photo SET data='', purged_at=now(), retention_hold=false, reuse_allowed=false WHERE household_id=$1 AND purged_at IS NULL", [householdId]);
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
  await c.query("UPDATE household SET name=$2, membership_terms=NULL, archived_at=now(), updated_at=now() WHERE id=$1", [householdId, `Erased household ${householdId.slice(0, 8)}`]);
  // The erasure itself is the last audit entry the household ever gets.
  await c.query(
    `INSERT INTO audit_event (id, household_id, actor_user, actor_role, kind, detail, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'erasure_tool', 'household_erased', $3, now(), now())`,
    [householdId, "00000000-0000-0000-0000-000000000000", JSON.stringify({ eraseIncidents: ERASE_INCIDENTS, scrubAuditDetail: SCRUB_AUDIT, counts })],
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
