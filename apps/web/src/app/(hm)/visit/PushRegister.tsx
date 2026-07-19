"use client";

import { useEffect, useState } from "react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Opt-in to lock-screen push on this device. Only shows when the browser
 * supports push and isn't already subscribed — on iOS that means the app was
 * installed to the home screen (Safari tabs can't). Requires a tap (permission
 * prompts need a user gesture).
 */
export function PushRegister() {
  const [state, setState] = useState<"hidden" | "prompt" | "working" | "denied">("hidden");

  useEffect(() => {
    if (!VAPID || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) return; // already subscribed
      setState(Notification.permission === "denied" ? "denied" : "prompt");
    });
  }, []);

  async function enable() {
    if (!VAPID) return;
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID) });
      await fetch("/api/mobile/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setState("hidden");
    } catch {
      setState("prompt");
    }
  }

  if (state === "hidden") return null;
  return (
    <div className="note" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      {state === "denied" ? (
        <span>Alerts are blocked for this app in your device settings.</span>
      ) : (
        <button type="button" className="act subtle" disabled={state === "working"} onClick={() => void enable()}>
          {state === "working" ? "Enabling…" : "🔔 Turn on alerts for this device"}
        </button>
      )}
    </div>
  );
}
