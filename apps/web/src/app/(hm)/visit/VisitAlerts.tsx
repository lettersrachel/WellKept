"use client";

import { useEffect, useState } from "react";

interface Item { id: string; title: string; body: string; read: boolean }

/** WATCH / LIFE-EVENT alerts for the signed-in house manager, shown atop the
 * visit page. Reuses the same /api/mobile/notifications the native app uses. */
export function VisitAlerts() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    void fetch("/api/mobile/notifications")
      .then((r) => (r.ok ? r.json() : { items: [], unread: 0 }))
      .then((d: { items: Item[]; unread: number }) => { setItems(d.items); setUnread(d.unread); })
      .catch(() => {});
  }, []);

  async function markRead() {
    await fetch("/api/mobile/notifications", { method: "POST" }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }

  if (items.length === 0) return null;
  return (
    <div className="card" style={{ borderColor: "var(--gold)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Alerts{unread > 0 ? ` (${unread} new)` : ""}</h2>
        {unread > 0 && <button type="button" className="act subtle" onClick={() => void markRead()}>Mark read</button>}
      </div>
      {items.slice(0, 5).map((n) => (
        <div key={n.id} className="field" style={!n.read ? { borderLeft: "3px solid var(--gold)", paddingLeft: 8 } : undefined}>
          <span className="fname">{n.title}</span>
          <div className="fval sans" style={{ fontSize: 13 }}>{n.body}</div>
        </div>
      ))}
    </div>
  );
}
