// ChessCaravan service worker: ilovani o'rnatish, internet yo'qligida offline sahifa va push-bildirishnomalar.
// Sayt fayllari KESHLANMAYDI (har doim tarmoqdan) — deploydan keyin eski versiya qolib ketmasligi uchun.
// Faqat offline sahifa (internetsiz o'yinlari bilan) va ikonkalar keshda. Kesh nomi o'zgarsa, eskilari o'chiriladi.
const CACHE = 'chessdom-shell-v1';
const OFFLINE = '/offline.html';
// Internetsiz o'yinlar (offline.html): qoidalar, matnlar, donalar (Karvon to'plami) va yog'och ovozlari
const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'].flatMap((p) => ['w', 'b'].map((c) => '/img/chesspieces/karvon/' + c + p + '.svg'));
const PRECACHE = [OFFLINE, '/assets/icons/icon-192.png', '/assets/icons/badge-96.png',
  '/vendor/chess-0.10.3.min.js', '/chess960.js', '/shatranj.js', '/uzcyrl.js', '/offline-texts.js', '/offline-games.js',
  '/assets/sounds/wood/move.wav', '/assets/sounds/wood/capture.wav', '/assets/sounds/wood/game-end.wav'].concat(PIECES);
let offlineRefreshed = false;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sahifa ochilishi (navigatsiya): tarmoq bo'lmasa — offline sahifa. PRECACHE fayllari — tarmoqdan (keshdagi nusxa ham
// yangilanadi — offline o'yinlar deploydan keyin eskirmaydi), tarmoq bo'lmasa keshdan.
// Qolgan barcha so'rovlar service worker'dan o'tmaydi (oddiy tarmoq).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      // Sayt ochilganda offline sahifaning o'zi ham (service worker ishga tushganda bir marta) yangilanadi
      if (!offlineRefreshed && res.ok) { offlineRefreshed = true; event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).catch(() => {})); }
      return res;
    }).catch(() => caches.match(OFFLINE)));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(req).then((res) => {
      if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(url.pathname)));
  }
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'ChessCaravan', {
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
