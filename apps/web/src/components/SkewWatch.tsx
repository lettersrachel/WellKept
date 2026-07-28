"use client";

import { useEffect, useState } from "react";

/**
 * G-37: the app detects its own version skew instead of trusting a human
 * hard-refresh. Four incidents in one day (2026-07-27) proved the manual
 * procedure unreliable: stale pages silently ate three writes (dead
 * server-action ids) and served one stale read — and "step zero" was
 * performed before two of them and didn't take (bfcache / background
 * tabs / the /visit service-worker fallback all defeat it).
 *
 * Mechanism: every build bakes NEXT_PUBLIC_BUILD_ID into both its client
 * bundle and its server runtime. This component compares its own baked id
 * against whatever the LIVE deployment reports, on a slow interval and
 * whenever the tab regains focus — the exact moment stale pages resurface.
 * Mismatch = this page predates the last deploy; say so and offer reload.
 *
 * Deliberately silent on network failure: the field client is offline-first
 * and must never nag from a driveway. Only a CONFIRMED mismatch renders.
 */
const LOCAL_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "";

export function SkewWatch() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!LOCAL_BUILD) return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch("/api/build-id", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string };
        if (!stopped && id && id !== "unknown" && id !== LOCAL_BUILD) setStale(true);
      } catch {
        // Offline or flaky network: no verdict, no banner.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const first = setTimeout(check, 5_000);
    const every = setInterval(check, 60_000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(every);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!stale) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: "#8B2E2E", color: "#FFFFFF", padding: "10px 16px",
        textAlign: "center", fontSize: 14,
      }}
    >
      This page is from before the latest update; buttons may silently do nothing.
      <button
        onClick={() => window.location.reload()}
        style={{ marginLeft: 10, padding: "4px 12px", cursor: "pointer", fontSize: 14 }}
      >
        Refresh now
      </button>
    </div>
  );
}
