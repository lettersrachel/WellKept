/**
 * Well Kept offline shell (closes the gap inherited from the foundation
 * repo: the IndexedDB queue survived a reload, but the page itself needed
 * network to load). Scope is deliberately tiny:
 *   - /visit document: network-first, falling back to the last good copy
 *   - /_next/static assets: cache-first (immutable by content hash)
 * Nothing else is cached — portal pages carry permission-filtered data and
 * must always come from the server.
 */
const SHELL_CACHE = "wk-shell-v1";
const ASSET_CACHE = "wk-assets-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => ![SHELL_CACHE, ASSET_CACHE].includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(event.request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // The /visit shell: network-first, cache fallback.
  if (event.request.mode === "navigate" && url.pathname === "/visit") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put("/visit", response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match("/visit");
          if (cached) return cached;
          return new Response(
            "<!doctype html><title>Well Kept</title><p style='font-family:Georgia;margin:40px'>Offline, and no cached visit shell yet. Open /visit once while online.</p>",
            { headers: { "Content-Type": "text/html" }, status: 503 },
          );
        }
      })(),
    );
  }
});
