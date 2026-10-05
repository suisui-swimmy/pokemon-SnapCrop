const CACHE_NAME = "pokemon-snapcrop-v1.7.3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./pokemon-icon-matcher.js",
  "./pokemon-icon-worker.js",
  "./battle-api.js",
  "./battle-statistics.js",
  "./manifest.webmanifest",
  "./assets/ui/info.svg",
  "./assets/ui/reload.svg",
  "./assets/ui/play.svg",
  "./assets/ui/fullscreen-shrink.svg",
  "./assets/ui/fullscreen-expand.svg",
  "./assets/ui/night-mode.svg",
  "./assets/ui/light-mode.svg",
  "./assets/ui/volume-2.svg",
  "./assets/ui/volume-x.svg",
  "./data/pokemon-display-catalog.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const APP_SHELL_URLS = new Set(
  APP_SHELL.map((entry) => new URL(entry, self.registration.scope).href),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "remote-cache-policy") {
    event.ports?.[0]?.postMessage({ cacheName: CACHE_NAME, externalCaching: false });
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pokemon-snapcrop-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" || APP_SHELL_URLS.has(request.url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response);
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  await cacheResponse(request, response);
  return response;
}

async function cacheResponse(request, response) {
  if (!response || response.status !== 200 || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}
