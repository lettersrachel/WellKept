import { describe, it, expect } from "vitest";
import { base32Encode, base32Decode, generateSecret, generateTotp, verifyTotp, otpauthUrl, generateBackupCodes, hashBackupCode, normalizeBackupCode } from "./index";

// RFC 6238 Appendix B test vectors. The shared secret is the ASCII string
// "12345678901234567890" (20 bytes); its base32 form is what we feed in.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("base32", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = Buffer.from([0, 1, 2, 253, 254, 255, 42, 7]);
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });
  it("encodes the RFC secret to the known base32 string", () => {
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });
  it("tolerates lowercase, spaces, and padding on decode", () => {
    expect(base32Decode("ge zd gn bv=").equals(base32Decode("GEZDGNBV"))).toBe(true);
  });
});

describe("generateTotp against RFC 6238 vectors (8-digit SHA1)", () => {
  const vectors: Array<[number, string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];
  for (const [seconds, expected] of vectors) {
    it(`T=${seconds}s → ${expected}`, () => {
      expect(generateTotp(RFC_SECRET, { t: seconds * 1000, digits: 8 })).toBe(expected);
    });
  }
});

describe("verifyTotp", () => {
  it("accepts the current code", () => {
    const t = 1_700_000_000_000;
    const code = generateTotp(RFC_SECRET, { t });
    expect(verifyTotp(RFC_SECRET, code, { t })).toBe(true);
  });
  it("accepts a code from the adjacent window (±30s skew)", () => {
    const t = 1_700_000_000_000;
    const prev = generateTotp(RFC_SECRET, { t: t - 30_000 });
    expect(verifyTotp(RFC_SECRET, prev, { t })).toBe(true);
  });
  it("rejects a code two windows away", () => {
    const t = 1_700_000_000_000;
    const stale = generateTotp(RFC_SECRET, { t: t - 90_000 });
    expect(verifyTotp(RFC_SECRET, stale, { t })).toBe(false);
  });
  it("rejects the wrong secret", () => {
    const t = 1_700_000_000_000;
    const other = generateSecret();
    const code = generateTotp(other, { t });
    expect(verifyTotp(RFC_SECRET, code, { t })).toBe(false);
  });
  it("rejects malformed input without throwing", () => {
    expect(verifyTotp(RFC_SECRET, "12ab56")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "")).toBe(false);
  });
  it("tolerates a space in the submitted code (authenticator display '123 456')", () => {
    const t = 1_700_000_000_000;
    const code = generateTotp(RFC_SECRET, { t });
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(RFC_SECRET, spaced, { t })).toBe(true);
  });
});

describe("backup codes", () => {
  it("generates the requested count of distinct formatted codes", () => {
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}$/);
  });
  it("uses no ambiguous characters (0/o/1/i/l)", () => {
    const joined = generateBackupCodes(20).join("");
    expect(joined).not.toMatch(/[0o1il]/);
  });
  it("hashes stably and normalizes separators + case", () => {
    const code = generateBackupCodes(1)[0]!;
    const normalized = normalizeBackupCode(code);
    expect(normalized).toHaveLength(8);
    expect(hashBackupCode(code)).toBe(hashBackupCode(code.toUpperCase()));
    expect(hashBackupCode(code)).toBe(hashBackupCode(normalized));
    expect(hashBackupCode(code)).toHaveLength(64);
  });
  it("gives different hashes for different codes", () => {
    const codes = generateBackupCodes(2);
    expect(hashBackupCode(codes[0]!)).not.toBe(hashBackupCode(codes[1]!));
  });
});

describe("generateSecret + otpauthUrl", () => {
  it("mints a decodable 20-byte (32-char base32) secret", () => {
    const secret = generateSecret();
    expect(secret).toHaveLength(32);
    expect(base32Decode(secret)).toHaveLength(20);
  });
  it("builds a scannable otpauth URI with issuer + account label", () => {
    const url = otpauthUrl({ secret: RFC_SECRET, account: "kelly@wellkept.com", issuer: "Well Kept" });
    expect(url.startsWith("otpauth://totp/Well%20Kept:kelly%40wellkept.com?")).toBe(true);
    expect(url).toContain(`secret=${RFC_SECRET}`);
    expect(url).toContain("algorithm=SHA1");
    expect(url).toContain("digits=6");
    expect(url).toContain("period=30");
  });
});
