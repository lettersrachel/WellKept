/**
 * In-app alerts for the house manager — e.g. corporate raised a WATCH or
 * LIFE-EVENT on one of their households. Fetched from the auth-gated
 * /api/mobile/notifications and shown in the app. (Lock-screen push would need
 * an EAS dev build; Expo Go can't receive remote push. The same rows drive it
 * when that lands.)
 */
export interface NotifItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(apiUrl: string, token: string): Promise<{ items: NotifItem[]; unread: number }> {
  try {
    if (!apiUrl) return { items: [], unread: 0 };
    const res = await fetch(`${apiUrl}/api/mobile/notifications`, { headers: { cookie: `authjs.session-token=${token}` } });
    if (!res.ok) return { items: [], unread: 0 };
    return (await res.json()) as { items: NotifItem[]; unread: number };
  } catch {
    return { items: [], unread: 0 };
  }
}

export async function markNotificationsRead(apiUrl: string, token: string): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/mobile/notifications`, { method: "POST", headers: { cookie: `authjs.session-token=${token}` } });
  } catch {
    // best effort
  }
}
