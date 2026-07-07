// Kekere's service worker. Registered with scope "/kekere/" (see
// pwa-register.tsx) — served from /kekere/sw.js specifically so the
// browser's own scope restriction (a service worker can never control a
// URL outside the directory it's served from) makes it structurally
// impossible for this file to affect Narriva pages, no matter what the
// fetch handler below does.
//
// Bump CACHE_VERSION whenever the precached list changes, to invalidate
// old caches on the next visit — there's no build-time hashing here since
// this is a hand-written worker, not Workbox/next-pwa.
const CACHE_VERSION = "kekere-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const OFFLINE_URL = "/kekere/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/kekere/manifest.webmanifest",
  "/kekere/icons/icon-192.png",
  "/kekere/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("kekere-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations (loading a page/route): network-first, so content never
  // goes stale — only fall back to a cache/offline page when the network
  // request fails outright.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Same-origin static assets (JS/CSS bundles, fonts, images): cache-first,
  // since these are content-hashed and safe to reuse indefinitely once seen.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/kekere/icons/") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
  // Everything else (API calls, etc.) is left untouched — goes straight to
  // network, no interception.
});
