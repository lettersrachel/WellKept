/**
 * Server-side JPEG metadata strip (input spine build 1, photo rules).
 * Both real clients re-encode to JPEG before upload (the web wizard's
 * canvas, the mobile app's ImageManipulator), which already produces
 * metadata-free images; this is the ENFORCEMENT of that property at the
 * boundary, so a raw API call cannot store a photo carrying GPS tags
 * from inside a member's home.
 *
 * Targeted, not total: APP1 (Exif and XMP, where location lives) and COM
 * segments are dropped; JFIF (APP0) and ICC (APP2) survive so color
 * rendering is untouched. Pure JS segment walk, no image decode, no new
 * dependency (WK-DEV-007: a dependency is a register-visible decision;
 * this transform does not need one).
 */
export function stripJpegMetadata(input: Buffer): Buffer {
  // Not a JPEG (no SOI): return untouched; the route's content-type
  // check is the gate, this is the transform.
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return input;
  const parts: Buffer[] = [input.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= input.length) {
    if (input[i] !== 0xff) break; // desynced: keep the remainder as-is
    const marker = input[i + 1]!;
    // Start of scan: everything from here is entropy-coded data + EOI.
    if (marker === 0xda) { parts.push(input.subarray(i)); i = input.length; break; }
    // Standalone markers without a length (RST, TEM, EOI).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      parts.push(input.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = input.readUInt16BE(i + 2);
    const segmentEnd = i + 2 + len;
    if (len < 2 || segmentEnd > input.length) break;
    const isApp1 = marker === 0xe1; // Exif / XMP
    const isComment = marker === 0xfe;
    if (!isApp1 && !isComment) parts.push(input.subarray(i, segmentEnd));
    i = segmentEnd;
  }
  if (i < input.length) parts.push(input.subarray(i));
  return Buffer.concat(parts);
}
