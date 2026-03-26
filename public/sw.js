const CACHE_NAME = "pitpilot-v5";
// Separate cache for dynamic pages that need offline fallback.
// Versioned independently so a SW update doesn't bust cached scout pages.
const PAGES_CACHE_NAME = "pitpilot-pages-v1";

const STATIC_ASSETS = [
  "/",
  "/login",
  "/signup",
  "/join",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/og-image.jpg",
];

// Routes whose HTML responses are cached so they load offline.
// Scouts will have visited these while online; the cached HTML includes
// all server-rendered props (match info, form config, etc.).
function shouldCachePage(pathname) {
  return (
    pathname.startsWith("/scout/") ||
    // Also cache the matches list so scouts can navigate to forms from it
    pathname.match(/^\/dashboard\/events\/[^/]+\/matches$/)
  );
}

// Install: cache static shell + offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches, claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== PAGES_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy varies by request type
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST scouting submissions, etc.)
  if (event.request.method !== "GET") return;

  // Skip API routes, auth routes, and Supabase calls — always network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.io")
  ) {
    return;
  }

  // Next.js static assets (/_next/static/): cache-first (immutable, hashed)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation requests
  if (event.request.mode === "navigate") {
    // Scout form pages + match list: network-first, cache on success,
    // serve cached copy when offline so scouts can access forms without a connection.
    if (shouldCachePage(url.pathname)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(PAGES_CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
          .catch(() =>
            caches.match(event.request).then(
              (cached) => cached || caches.match("/offline.html")
            )
          )
      );
      return;
    }

    // All other navigations: network-first, no cache (avoids stale app shells)
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // All other assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            return new Response("", { status: 503, statusText: "Offline" });
          })
    )
  );
});
