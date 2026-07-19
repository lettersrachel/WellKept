/**
 * Visit photos: captured on device, uploaded to the auth-gated
 * /api/mobile/upload. Offline-friendly — a photo is held with its bytes until a
 * sync succeeds, and the upload is idempotent on photoId, so retries are safe.
 * The same photoId is fed to the close flow, so the visit references it.
 */
export interface LocalPhoto {
  photoId: string;
  localUri: string; // device uri, for the thumbnail
  base64: string;
  contentType: string;
  uploaded: boolean;
}

export async function uploadPhoto(apiUrl: string, token: string, householdId: string, p: LocalPhoto): Promise<boolean> {
  try {
    if (!apiUrl) return false;
    const res = await fetch(`${apiUrl}/api/mobile/upload`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `authjs.session-token=${token}` },
      body: JSON.stringify({ householdId, photoId: p.photoId, contentType: p.contentType, base64: p.base64 }),
    });
    return res.ok;
  } catch {
    return false; // offline / unreachable — stays pending, retried on next sync
  }
}
