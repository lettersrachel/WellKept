import { randomUUID } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { vaultItem } from "@wellkept/schema";
import { LocalKms, sealValue, openValue, type Kms, type SealedBox } from "@wellkept/vault";
import { db } from "./db";

/**
 * PG-backed storage for the vault (REQ-013): vault_item.ciphertext holds
 * the sealed box JSON; keyRef holds the household's KMS-wrapped data key.
 * The plaintext NEVER touches playbook_field (its s3 rows stay empty) and
 * never appears in audit rows (hashes only, per REQ-005).
 *
 * KEK comes from WK_KMS_KEY (base64, 32 bytes). Dev falls back to a fixed
 * dev key; production refuses to run without a real one. Swapping LocalKms
 * for managed KMS is the documented data migration (re-wrap keys).
 */
const DEV_KEK = "d2VsbGtlcHQtZGV2LWtlay0wMTIzNDU2Nzg5YWJjZGU="; // "wellkept-dev-kek-0123456789abcde" (32 bytes)

/** The process KMS (LocalKms over WK_KMS_KEY). Shared with lib/totp so the
 * staff second factor is sealed under the same KEK as the vault. */
export function kms(): Kms {
  const key = process.env.WK_KMS_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WK_KMS_KEY must be set in production (openssl rand -base64 32)");
    }
    return new LocalKms(DEV_KEK);
  }
  return new LocalKms(key);
}

async function householdWrappedKey(householdId: string): Promise<SealedBox | null> {
  const [row] = await db.select({ keyRef: vaultItem.keyRef }).from(vaultItem)
    .where(and(eq(vaultItem.householdId, householdId), isNotNull(vaultItem.keyRef)))
    .limit(1);
  return row ? (JSON.parse(row.keyRef) as SealedBox) : null;
}

/** Seal and store a value for an s3 field. One vault_item per field. */
export async function vaultWrite(householdId: string, fieldId: string, value: string): Promise<void> {
  const wrapped = await householdWrappedKey(householdId);
  const sealed = sealValue(kms(), wrapped, value);
  const [existing] = await db.select().from(vaultItem).where(eq(vaultItem.fieldId, fieldId));
  if (existing) {
    await db.update(vaultItem)
      .set({ ciphertext: JSON.stringify(sealed.box), keyRef: JSON.stringify(sealed.wrappedKey), updatedAt: new Date() })
      .where(eq(vaultItem.id, existing.id));
  } else {
    await db.insert(vaultItem).values({
      id: randomUUID(),
      householdId,
      fieldId,
      ciphertext: JSON.stringify(sealed.box),
      keyRef: JSON.stringify(sealed.wrappedKey),
    });
  }
}

/** Decrypt a field's vault value; null when nothing has been stored yet. */
export async function vaultOpen(fieldId: string): Promise<string | null> {
  const [row] = await db.select().from(vaultItem).where(eq(vaultItem.fieldId, fieldId));
  if (!row) return null;
  return openValue(kms(), JSON.parse(row.keyRef) as SealedBox, JSON.parse(row.ciphertext) as SealedBox);
}

export async function vaultHasValue(fieldIds: string[]): Promise<Set<string>> {
  if (fieldIds.length === 0) return new Set();
  const rows = await db.select({ fieldId: vaultItem.fieldId }).from(vaultItem);
  const present = new Set(rows.map((r) => r.fieldId));
  return new Set(fieldIds.filter((id) => present.has(id)));
}
