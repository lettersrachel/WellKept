/**
 * RFC 6238 TOTP / RFC 4226 HOTP — the staff second factor (REQ-003).
 *
 * Pure and dependency-free (node:crypto only) so it can be unit-tested
 * against the RFC test vectors and audited in isolation. The app layer
 * (@wellkept/web lib/totp) owns storage, encryption-at-rest, and the
 * per-session step-up marker; this package is just the algorithm.
 *
 * SHA-1 is the algorithm every authenticator app (Google Authenticator,
 * 1Password, Authy, …) defaults to for `otpauth://` URLs — it is the
 * interop baseline here, not a security choice about the hash itself; the
 * security comes from the shared secret and the 30-second window.
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Backup-code alphabet: no 0/O/1/I/L — unambiguous when written down or read
// aloud. 31 symbols × 8 chars ≈ 40 bits per code, unguessable at any rate.
const BACKUP_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** RFC 4648 base32 encode (no padding — what authenticator apps expect). */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** RFC 4648 base32 decode. Tolerant of lowercase, spaces, and `=` padding. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh secret: 20 random bytes (160-bit), base32-encoded for display. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The `otpauth://` URI an authenticator app scans or imports. */
export function otpauthUrl(opts: { secret: string; account: string; issuer: string; digits?: number; period?: number }): string {
  const { secret, account, issuer, digits = 6, period = 30 } = opts;
  // otpauth label convention: "Issuer:Account" with each part percent-encoded
  // but the separating colon left literal (what authenticator apps parse).
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** HOTP (RFC 4226): counter-based one-time password. */
export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const counterBuf = Buffer.alloc(8);
  // 64-bit big-endian counter. JS bitwise is 32-bit, so split hi/lo.
  counterBuf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac("sha1", secret).update(counterBuf).digest();
  // Dynamic truncation (RFC 4226 §5.3): low nibble of the last byte picks a
  // 4-byte window; mask the top bit to stay a positive 31-bit integer.
  const offset = digest.readUInt8(digest.length - 1) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

/** TOTP (RFC 6238): the current code for a base32 secret. */
export function generateTotp(secret: string, opts: { t?: number; period?: number; digits?: number } = {}): string {
  const { t = Date.now(), period = 30, digits = 6 } = opts;
  const counter = Math.floor(t / 1000 / period);
  return hotp(base32Decode(secret), counter, digits);
}

/**
 * Verify a submitted token against the secret, accepting the adjacent
 * time-steps (default ±1 = ±30s) to tolerate clock skew and the user
 * typing across a boundary. Constant-time compare per candidate so a
 * timing side-channel can't leak how close a guess was.
 */
export function verifyTotp(
  secret: string,
  token: string,
  opts: { t?: number; period?: number; digits?: number; window?: number } = {},
): boolean {
  const { t = Date.now(), period = 30, digits = 6, window = 1 } = opts;
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d+$/.test(cleaned) || cleaned.length !== digits) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(t / 1000 / period);
  const submitted = Buffer.from(cleaned);
  for (let offset = -window; offset <= window; offset++) {
    const candidate = Buffer.from(hotp(key, counter + offset, digits));
    if (candidate.length === submitted.length && timingSafeEqual(candidate, submitted)) return true;
  }
  return false;
}

// --- Backup / recovery codes (REQ-003) ------------------------------------
// Single-use codes a staff user saves at enrollment to get back in when the
// authenticator is lost — otherwise a lost phone means an admin reset, and
// the sole corporate_admin would have no one to reset them.

/** Normalize a code for hashing/compare: drop separators, lowercase. */
export function normalizeBackupCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** A fresh set of formatted backup codes (plaintext — shown once). */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    for (let c = 0; c < 8; c++) raw += BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)];
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/** SHA-256 hex of the normalized code. Codes are high-entropy and random, so
 * a fast hash is sufficient — a DB leak yields nothing reversible. */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}
