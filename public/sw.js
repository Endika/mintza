const VERSION = '__APP_VERSION__';
const CACHE_NAME = `mintza-shell-${VERSION}`;
const PRECACHE = [
  '/mintza/',
  '/mintza/index.html',
  '/mintza/manifest.json',
  '/mintza/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  const isApiCall =
    url.host.includes('openai.com') ||
    url.host.includes('googleapis.com') ||
    url.host.includes('anthropic.com') ||
    url.host.includes('cognitiveservices.azure.com');
  if (isApiCall) return;
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';
  const isShell =
    isNavigation ||
    url.pathname.endsWith('/index.html') ||
    url.pathname === '/mintza/' ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('/sw.js');

  if (isShell) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, clone);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match('/mintza/index.html');
    if (shell) return shell;
    throw error;
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const clone = response.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, clone);
  }
  return response;
};
