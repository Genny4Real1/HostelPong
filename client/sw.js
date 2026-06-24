const CACHE = 'hostelpong-v4';
const PRECACHE = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/NetworkManager.js',
  '/js/Game.js',
  '/js/Renderer.js',
  '/js/TouchDragInput.js',
  '/js/AudioManager.js',
  '/manifest.webmanifest',
  '/icons/icon-16.png',
  '/icons/icon-32.png',
  '/icons/icon-40.png',
  '/icons/icon-48.png',
  '/icons/icon-60.png',
  '/icons/icon-64.png',
  '/icons/icon-87.png',
  '/icons/icon-96.png',
  '/icons/icon-120.png',
  '/icons/icon-128.png',
  '/icons/icon-152.png',
  '/icons/icon-167.png',
  '/icons/icon-180.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/socket.io/')) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
