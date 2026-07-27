const CACHE_VERSION = "white-camellia-v0.3-pwa-1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/app-icon-192.png",
  "/icons/app-icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
  "/story/runtime/manifest.json",
  "/story/runtime/chapters/chapter-01.json",
  "/story/runtime/content/chapter-01.json",
  "/story/runtime/observations/chapter-01.json",
  "/story/runtime/evidence/chapter-01.json",
  "/story/runtime/dialogues/shen-yishu-chapter-01.json",
  "/story/runtime/reasoning/chapter-01.json",
  "/story/runtime/assets/chapter-01/teacup-scene.png"
];

async function precacheAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(CORE_ASSETS);

  const indexResponse = await fetch("/index.html", {
    cache: "no-store"
  });
  const indexHtml = await indexResponse.text();
  const buildAssets = [
    ...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)
  ].map((match) => match[1]);

  if (buildAssets.length) {
    await cache.addAll([...new Set(buildAssets)]);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheAppShell()
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await cache.match(request)) ?? cache.match(fallbackUrl);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  if (url.pathname.startsWith("/story/runtime/")) {
    event.respondWith(networkFirst(request, url.pathname));
    return;
  }

  event.respondWith(cacheFirst(request));
});
