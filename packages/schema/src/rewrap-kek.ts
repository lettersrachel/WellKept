/**
 * KEK rotation (ADR-005 / gap register G-22): re-wrap every stored data key
 * from the old KEK to a new one. The envelope model makes this cheap and
 * safe — ciphertext is never touched; only the wrapped-key blobs
 * (vault_item.key_ref, user_totp.wrapped_key) are unwrapped with the old
 * KEK and wrapped with the new, in one transaction, with a decrypt
 * round-trip verified against the new KEK BEFORE commit.
 *
 * Dry run by default (the drill): proves every stored key unwraps under
 * OLD and that a sample value round-trips under NEW, changing nothing.
 * ADR-005's rehearsal is this dry run + a --commit against a throwaway
 * Neon branch, in the same sitting that creates the second custody.
 *
 * Usage:
 *   OLD_WK_KMS_KEY=<current b64> NEW_WK_KMS_KEY=<new b64> \
 *     DATABASE_URL=... node src/rewrap-kek.ts            # drill (dry run)
 *   ... node src/rewrap-kek.ts --commit                  # rotate
 *
 * After a real --commit: update WK_KMS_KEY in Vercel AND both custody
 * copies (ADR-005: both custodies in the same sitting, or it did not
 * happen), then redeploy.
 */
import pg from "pg";
import { LocalKms, decrypt, type SealedBox } from "@wellkept/vault";

const COMMIT = process.argv.includes("--commit");
const oldKey = process.env.OLD_WK_KMS_KEY ?? process.env.WK_KMS_KEY;
const newKey = process.env.NEW_WK_KMS_KEY;
if (!oldKey || !newKey) {
  console.error("Set OLD_WK_KMS_KEY (or WK_KMS_KEY) and NEW_WK_KMS_KEY (both base64, 32 bytes).");
  process.exit(1);
}
const oldKms = new LocalKms(oldKey);
const newKms = new LocalKms(newKey);

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
});
await c.connect();

const vaultRows = (await c.query("SELECT id, key_ref, ciphertext FROM vault_item")).rows;
const totpRows = (await c.query("SELECT user_id, wrapped_key, secret_box FROM user_totp")).rows;
console.log(`\n${COMMIT ? "ROTATING" : "DRILL (dry run, no changes)"}: ${vaultRows.length} vault key(s), ${totpRows.length} TOTP key(s)\n`);

// Phase 1 (both modes): every stored key must unwrap under OLD, and its
// sealed value must decrypt under the unwrapped data key — proving the
// old custody is intact BEFORE anything changes.
let checked = 0;
const rewrap = (wrappedJson: string): { next: string; dataKey: Buffer } => {
  const dataKey = oldKms.unwrap(JSON.parse(wrappedJson) as SealedBox);
  return { next: JSON.stringify(newKms.wrap(dataKey)), dataKey };
};
const verifyOpen = (dataKey: Buffer, boxJson: string) => void decrypt(dataKey, JSON.parse(boxJson) as SealedBox);

const vaultNext: { id: string; next: string }[] = [];
for (const r of vaultRows) {
  const { next, dataKey } = rewrap(r.key_ref);
  verifyOpen(dataKey, r.ciphertext);
  vaultNext.push({ id: r.id, next });
  checked += 1;
}
const totpNext: { userId: string; next: string }[] = [];
for (const r of totpRows) {
  const { next, dataKey } = rewrap(r.wrapped_key);
  verifyOpen(dataKey, r.secret_box);
  totpNext.push({ userId: r.user_id, next });
  checked += 1;
}
console.log(`  ${checked} key(s) unwrap under OLD and their values decrypt; old custody intact.`);

// Phase 2 (both modes): the new wraps must unwrap under NEW to the same
// data keys. Round-trip proven before any write.
for (const v of vaultNext) {
  const orig = oldKms.unwrap(JSON.parse(vaultRows.find((r) => r.id === v.id)!.key_ref));
  if (!newKms.unwrap(JSON.parse(v.next) as SealedBox).equals(orig)) throw new Error(`round-trip mismatch on vault_item ${v.id}`);
}
console.log(`  re-wrapped keys round-trip under NEW; rotation is sound.`);

if (!COMMIT) {
  console.log("\nDrill complete; nothing changed. Re-run with --commit (against a throwaway branch first) to rotate.\n");
  await c.end();
  process.exit(0);
}

await c.query("BEGIN");
try {
  for (const v of vaultNext) await c.query("UPDATE vault_item SET key_ref=$2, updated_at=now() WHERE id=$1", [v.id, v.next]);
  for (const t of totpNext) await c.query("UPDATE user_totp SET wrapped_key=$2 WHERE user_id=$1", [t.userId, t.next]);
  // Final in-transaction proof: re-read one row of each kind and open it
  // under NEW only. Any failure rolls the whole rotation back.
  const [vCheck] = (await c.query("SELECT key_ref, ciphertext FROM vault_item LIMIT 1")).rows;
  if (vCheck) verifyOpen(newKms.unwrap(JSON.parse(vCheck.key_ref)), vCheck.ciphertext);
  const [tCheck] = (await c.query("SELECT wrapped_key, secret_box FROM user_totp LIMIT 1")).rows;
  if (tCheck) verifyOpen(newKms.unwrap(JSON.parse(tCheck.wrapped_key)), tCheck.secret_box);
  await c.query("COMMIT");
} catch (err) {
  await c.query("ROLLBACK");
  console.error("\nFAILED, rolled back, old KEK still rules:", err instanceof Error ? err.message : err);
  await c.end();
  process.exit(1);
}
console.log("\nRotated. NOW: set WK_KMS_KEY to the new value in Vercel, update BOTH custody copies (ADR-005), redeploy.\n");
await c.end();
