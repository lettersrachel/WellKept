import { test } from "vitest";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { LocalKms, encrypt, decrypt, newDataKey, sealValue, openValue } from "./index";

const KEK = randomBytes(32).toString("base64");

test("roundtrip: seal under a fresh household key, open with only the wrapped key", () => {
  const kms = new LocalKms(KEK);
  const { box, wrappedKey } = sealValue(kms, null, "4-8-2-7");
  assert.notEqual(box.ciphertext, "4-8-2-7");
  assert.equal(openValue(kms, wrappedKey, box), "4-8-2-7");
});

test("one household key seals many values; each box is unique (fresh IVs)", () => {
  const kms = new LocalKms(KEK);
  const first = sealValue(kms, null, "alarm");
  const second = sealValue(kms, first.wrappedKey, "alarm");
  assert.deepEqual(second.wrappedKey, first.wrappedKey); // key reused, not regenerated
  assert.notEqual(first.box.iv, second.box.iv);
  assert.notEqual(first.box.ciphertext, second.box.ciphertext);
  assert.equal(openValue(kms, first.wrappedKey, second.box), "alarm");
});

test("GCM integrity: a tampered ciphertext or tag refuses to decrypt", () => {
  const kms = new LocalKms(KEK);
  const { box, wrappedKey } = sealValue(kms, null, "gate code 9911");
  const flip = (b64: string) => {
    const b = Buffer.from(b64, "base64");
    b[0]! ^= 0xff;
    return b.toString("base64");
  };
  assert.throws(() => openValue(kms, wrappedKey, { ...box, ciphertext: flip(box.ciphertext) }));
  assert.throws(() => openValue(kms, wrappedKey, { ...box, tag: flip(box.tag) }));
});

test("the wrong KEK cannot unwrap a household key", () => {
  const kms = new LocalKms(KEK);
  const { box, wrappedKey } = sealValue(kms, null, "secret");
  const otherKms = new LocalKms(randomBytes(32).toString("base64"));
  assert.throws(() => openValue(otherKms, wrappedKey, box));
});

test("LocalKms fails closed on a malformed key", () => {
  assert.throws(() => new LocalKms("too-short"), /32 bytes/);
  const key = newDataKey();
  const kms = new LocalKms(randomBytes(32));
  assert.equal(kms.unwrap(kms.wrap(key)).equals(key), true);
});

test("raw encrypt/decrypt roundtrip with unicode", () => {
  const key = newDataKey();
  const value = "Tür-Code: 4-8-2-7 — Keller";
  assert.equal(decrypt(key, encrypt(key, value)), value);
});
