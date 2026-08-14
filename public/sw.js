/* global caches, self */

const CACHE_VERSION = "arqvia-pwa-v2";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const OFFLINE_URL = "/offline.html";
const RECOVERY_SCRIPT_URL = "/offline-recovery.js";
const CORE_ASSETS = [
  OFFLINE_URL,
  RECOVERY_SCRIPT_URL,
  "/icons/arqvia-192.png",
  "/icons/arqvia-512.png",
  "/icons/arqvia-maskable-512.png",
  "/icons/arqvia-apple-180.png",
];
const PRIVATE_PATH_PREFIXES = ["/admin", "/api"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("arqvia-pwa-") && key !== CORE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  if (url.pathname === RECOVERY_SCRIPT_URL) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
  }
});

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function cacheFirst(request) {
  return (await caches.match(request)) || fetch(request);
}

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    await delay(650);

    try {
      return await fetch(request);
    } catch {
      const offlinePage = await caches.match(OFFLINE_URL);
      return offlinePage || Response.error();
    }
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
