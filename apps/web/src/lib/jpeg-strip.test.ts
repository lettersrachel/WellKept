import { test } from "vitest";
import assert from "node:assert/strict";
import { stripJpegMetadata } from "./jpeg-strip";

/** Build a JPEG segment: marker, big-endian length (payload + 2), payload. */
function seg(marker: number, payload: Buffer): Buffer {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
}
const SOI = Buffer.from([0xff, 0xd8]);
const scan = Buffer.concat([Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x02]), Buffer.from([0xaa, 0xbb]), Buffer.from([0xff, 0xd9])]);

test("APP1 (Exif with GPS bytes) and COM are dropped; JFIF, ICC, and the scan survive", () => {
  const jfif = seg(0xe0, Buffer.from("JFIF\0"));
  const exif = seg(0xe1, Buffer.concat([Buffer.from("Exif\0\0"), Buffer.from("GPSLatitude 38.9 fake payload")]));
  const icc = seg(0xe2, Buffer.from("ICC_PROFILE\0 color bytes"));
  const comment = seg(0xfe, Buffer.from("shot on a phone in a member's home"));
  const input = Buffer.concat([SOI, jfif, exif, icc, comment, scan]);
  const out = stripJpegMetadata(input);
  assert.ok(out.subarray(0, 2).equals(SOI));
  assert.ok(!out.includes("GPSLatitude"), "EXIF payload survived the strip");
  assert.ok(!out.includes("member's home"), "COM segment survived the strip");
  assert.ok(out.includes("JFIF"), "JFIF must survive");
  assert.ok(out.includes("ICC_PROFILE"), "ICC must survive, color fidelity is not the price of privacy");
  assert.ok(out.includes(Buffer.from([0xaa, 0xbb])), "scan data must survive byte-identical");
});

test("a canvas-style JPEG with no metadata passes through byte-identical", () => {
  const clean = Buffer.concat([SOI, seg(0xe0, Buffer.from("JFIF\0")), seg(0xdb, Buffer.alloc(64)), scan]);
  assert.ok(stripJpegMetadata(clean).equals(clean));
});

test("non-JPEG bytes are returned untouched (the route's type check is the gate)", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  assert.ok(stripJpegMetadata(png).equals(png));
});

test("a truncated or desynced stream never throws and never grows", () => {
  const weird = Buffer.concat([SOI, Buffer.from([0xff, 0xe1, 0xff, 0xff, 0x01])]);
  const out = stripJpegMetadata(weird);
  assert.ok(out.length <= weird.length);
});
