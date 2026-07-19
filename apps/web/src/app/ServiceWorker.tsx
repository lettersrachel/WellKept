"use client";

import { useEffect } from "react";

/**
 * Registers the offline shell service worker site-wide (production only), so
 * the PWA is installable from any page and /visit stays available offline.
 * The worker itself only special-cases /visit + hashed static assets; every
 * other request passes straight through to the network.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/wk-sw.js").catch(() => {});
  }, []);
  return null;
}
