import webpush from "web-push";
import { eq } from "drizzle-orm";
import { pushSubscription } from "@wellkept/schema";
import { db } from "./db";

/**
 * Web push (installed-PWA lock-screen notifications). Off unless the VAPID keys
 * are set, so dev/CI without them simply no-op. Best-effort: a send failure
 * never blocks the action that triggered it, and a dead endpoint (410/404) is
 * pruned so we stop trying it.
 */
let configured: boolean | null = null;
function ready(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@wellkepthomeops.com", pub, priv);
  return (configured = true);
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!ready()) return;
  const subs = await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.delete(pushSubscription).where(eq(pushSubscription.id, s.id));
      }
    }),
  );
}
