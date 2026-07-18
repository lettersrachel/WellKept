/**
 * The vault primitives (REQ-013): AES-256-GCM envelope encryption. Ported
 * from the July 12 foundation repo's verified packages/security vault.
 *
 * Model: each household has one 32-byte data key; values are encrypted
 * with it; the data key itself is stored only WRAPPED (encrypted) by the
 * KMS key-encryption-key. Dev/pilot uses LocalKms (KEK from env);
 * production swaps in AWS KMS/CloudHSM behind the same two methods and
 * rotates the KEK there — that swap is a data migration (re-wrap keys),
 * documented in the foundation repo's handoff.
 *
 * This package is pure crypto + policy-free: storage lives with the app
 * (vault_item rows), authorization stays in @wellkept/permissions.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface SealedBox {
  iv: string; // base64
  ciphertext: string; // base64
  tag: string; // base64 GCM auth tag
}

const ALGORITHM = "aes-256-gcm";

export function encrypt(key: Buffer, plaintext: string): SealedBox {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decrypt(key: Buffer, box: SealedBox): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(box.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export interface Kms {
  wrap(dataKey: Buffer): SealedBox;
  unwrap(wrapped: SealedBox): Buffer;
}

/** Development KMS adapter. Production must use managed KMS and rotate there. */
export class LocalKms implements Kms {
  #key: Buffer;
  constructor(key: string | Buffer) {
    this.#key = Buffer.isBuffer(key) ? key : Buffer.from(key, "base64");
    if (this.#key.length !== 32) throw new Error("kms key must decode to 32 bytes (openssl rand -base64 32)");
  }
  wrap(dataKey: Buffer): SealedBox {
    return encrypt(this.#key, dataKey.toString("base64"));
  }
  unwrap(wrapped: SealedBox): Buffer {
    return Buffer.from(decrypt(this.#key, wrapped), "base64");
  }
}

export function newDataKey(): Buffer {
  return randomBytes(32);
}

/** Seal a value under a (fresh or unwrapped) household data key. */
export function sealValue(kms: Kms, wrappedKey: SealedBox | null, value: string): { box: SealedBox; wrappedKey: SealedBox } {
  const dataKey = wrappedKey ? kms.unwrap(wrappedKey) : newDataKey();
  return { box: encrypt(dataKey, value), wrappedKey: wrappedKey ?? kms.wrap(dataKey) };
}

export function openValue(kms: Kms, wrappedKey: SealedBox, box: SealedBox): string {
  return decrypt(kms.unwrap(wrappedKey), box);
}
