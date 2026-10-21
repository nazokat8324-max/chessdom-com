// ChessDom service worker: ilovani o'rnatish, internet yo'qligida offline sahifa va push-bildirishnomalar.
// Sayt fayllari KESHLANMAYDI (har doim tarmoqdan) — deploydan keyin eski versiya qolib ketmasligi uchun.
// Faqat offline sahifa va ikonkalar keshda. Kesh nomi o'zgarsa, eskilari o'chiriladi.
const CACHE = 'chessdom-shell-v1';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/assets/icons/icon-192.png', '/assets/icons/badge-96.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sahifa ochilishi (navigatsiya): tarmoq bo'lmasa — offline sahifa. Offline sahifa va ikonkalar — keshdan.
// Qolgan barcha so'rovlar service worker'dan o'tmaydi (oddiy tarmoq).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(url.pathname)));
  }
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'ChessDom', {
    body: d.body || '',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [80, 40, 80],
    data: { url: d.url || '/' }
  }));
});

// Bosilganda: ochiq oyna bo'lsa — o'sha oynada kerakli bo'limga, bo'lmasa yangi oyna
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const same = list.find((c) => new URL(c.url).origin === self.location.origin);
    if (same) {
      await same.focus();
      same.postMessage({ type: 'open-url', url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
