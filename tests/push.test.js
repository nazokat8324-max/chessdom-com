// Push-bildirishnomalar: soxta HTTPS push-servis shifrlangan xabarni qabul qiladi, test uni ochib tekshiradi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ece = require('http_ece');
const { startServer, once, sleep } = require('./helpers');

let srv, mock, mockPort;
const received = [];
let status = 201;
before(async () => {
  mock = https.createServer({ key: fs.readFileSync(path.join(__dirname, 'fixtures/push-key.pem')), cert: fs.readFileSync(path.join(__dirname, 'fixtures/push-cert.pem')) }, (req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { received.push({ path: req.url, body: Buffer.concat(chunks), headers: req.headers }); res.writeHead(status); res.end(); });
  });
  await new Promise((r) => mock.listen(0, r));
  mockPort = mock.address().port;
  // Server soxta servisning o'z-o'zidan imzolangan sertifikatiga ishonsin (faqat test)
  srv = await startServer({ NODE_TLS_REJECT_UNAUTHORIZED: '0' });
});
after(async () => { await srv.stop(); mock.close(); });

function device(name) {
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  return { name, ecdh, auth, sub: { endpoint: `https://localhost:${mockPort}/push/${name}`, keys: { p256dh: ecdh.getPublicKey('base64url'), auth: auth.toString('base64url') } } };
}
// Shart bajarilguncha kutish (CPU band bo'lsa push kechikishi mumkin)
async function waitFor(fn, ms = 6000) { const end = Date.now() + ms; while (!fn() && Date.now() < end) await sleep(100); }
const pushes = (dev) => received.filter((r) => r.path === '/push/' + dev.name);
const open = (dev, r) => JSON.parse(ece.decrypt(r.body, { version: 'aes128gcm', privateKey: dev.ecdh, authSecret: dev.auth.toString('base64url') }).toString());

test("Obuna: noto'g'ri ma'lumot rad etiladi, qurilmalar soni", async () => {
  const u = await srv.register('Pu');
  assert.equal((await srv.api(u, '/api/push/subscribe', 'POST', { subscription: { endpoint: 'http://evil', keys: {} } })).status, 400);
  assert.equal((await srv.api(u, '/api/push/subscribe', 'POST', { subscription: device('x1').sub, lang: 'uz' })).success, true);
  assert.equal((await srv.api(u, '/api/users/me/push-prefs')).devices, 1);
});

test("Bir qurilmadan bir vaqtda bir nechta obuna so'rovi — xatosiz, bitta yozuv, oxirgi til", async () => {
  const u = await srv.register('Pr');
  const d = device('race-' + u.name);
  const res = await Promise.all(['uz', 'ru', 'en', 'tr', 'kk', 'az'].map((lang) => srv.api(u, '/api/push/subscribe', 'POST', { subscription: d.sub, lang })));
  assert.deepEqual(res.map((r) => r.success), [true, true, true, true, true, true]);
  assert.equal((await srv.api(u, '/api/users/me/push-prefs')).devices, 1);
  // Til yangilanadi (oxirgi so'rov tartibi kafolatlanmagan — keyin yana bittasi)
  await srv.api(u, '/api/push/subscribe', 'POST', { subscription: d.sub, lang: 'de' });
  assert.equal((await srv.api(u, '/api/users/me/push-prefs')).devices, 1);
  assert.equal((await srv.api(u, '/api/push/test', 'POST')).sent, 1);
  assert.equal(open(d, pushes(d).slice(-1)[0]).body, 'Push-Benachrichtigungen funktionieren! ♞');
});

test('Sayt fonda: push yetadi, har qurilmaga o\'z tilida', async () => {
  const a = await srv.register('Pa'), b = await srv.register('Pb');
  const d1 = device('uz-' + b.name), d2 = device('ru-' + b.name);
  await srv.api(b, '/api/push/subscribe', 'POST', { subscription: d1.sub, lang: 'uz' });
  await srv.api(b, '/api/push/subscribe', 'POST', { subscription: d2.sub, lang: 'ru' });
  const sb = await srv.connect(b), sa = await srv.connect(a);
  sb.emit('page-visibility', { hidden: true });
  await sleep(200);
  sa.emit('challenge-send', { username: b.name, initial: 180, increment: 2 });
  await waitFor(() => pushes(d1).length && pushes(d2).length);
  assert.equal(pushes(d1).length, 1);
  assert.equal(pushes(d2).length, 1);
  const p1 = open(d1, pushes(d1)[0]), p2 = open(d2, pushes(d2)[0]);
  assert.equal(p1.body, `${a.name} sizni o'yinga chaqirdi (3+2)`);
  assert.equal(p2.body, `${a.name} вызывает вас на партию (3+2)`);
  assert.equal(p1.url, '/oyin');
  assert.match(pushes(d1)[0].headers.authorization, /^vapid t=/);
  // Ilova push orqali ochildi (yangi ulanish) → kutayotgan chaqiruv qayta yuboriladi
  sb.disconnect();
  const sb2 = await srv.connect(b);
  await waitFor(() => sb2.events.some((e) => e.e === 'challenge-received'), 3000);
  const again = sb2.events.find((e) => e.e === 'challenge-received');
  assert.ok(again && again.p.seconds > 3 && again.p.seconds <= 60);
  // Sayt ko'rinib turibdi → push yo'q
  const before = received.length;
  await srv.api(a, '/api/chat/messages', 'POST', { roomId: 'user_' + b.id, message: 'salom' });
  await sleep(700);
  assert.equal(received.length, before);
  // Turkum o'chirilsa → push yo'q
  sb2.emit('page-visibility', { hidden: true }); await sleep(200);
  await srv.api(b, '/api/users/me/push-prefs', 'POST', { message: false });
  await srv.api(a, '/api/chat/messages', 'POST', { roomId: 'user_' + b.id, message: 'yana' });
  await sleep(700);
  assert.equal(received.length, before);
  // Ijtimoiy turkum yoqiq → do'stlik so'rovi keladi, profil havolasi bilan
  const n1 = pushes(d1).length;
  await srv.api(a, '/api/friends/request', 'POST', { username: b.name });
  await waitFor(() => pushes(d1).length > n1);
  const fr = open(d1, pushes(d1).slice(-1)[0]);
  assert.equal(fr.url, '/?profile=' + a.name);
  sa.disconnect(); sb2.disconnect();
});

test("Qurilma obunani bekor qilgan (410) → bazadan o'chiriladi; sinov xabari", async () => {
  const u = await srv.register('Pg');
  const d = device('gone-' + u.name);
  await srv.api(u, '/api/push/subscribe', 'POST', { subscription: d.sub, lang: 'en' });
  assert.equal((await srv.api(u, '/api/push/test', 'POST')).sent, 1);
  assert.equal(open(d, pushes(d)[0]).body, 'Push notifications are working! ♞');
  status = 410;
  await srv.api(u, '/api/push/test', 'POST');
  status = 201;
  assert.equal((await srv.api(u, '/api/users/me/push-prefs')).devices, 0);
});

test("Bir qurilmada boshqa foydalanuvchi kirsa, obuna unga o'tadi; chiqishda bekor qilinadi", async () => {
  const a = await srv.register('Pm'), b = await srv.register('Pm');
  const d = device('shared-' + a.name);
  await srv.api(a, '/api/push/subscribe', 'POST', { subscription: d.sub });
  await srv.api(b, '/api/push/subscribe', 'POST', { subscription: d.sub });
  assert.equal((await srv.api(a, '/api/users/me/push-prefs')).devices, 0);
  assert.equal((await srv.api(b, '/api/users/me/push-prefs')).devices, 1);
  await srv.api(b, '/api/push/unsubscribe', 'POST', { endpoint: d.sub.endpoint });
  assert.equal((await srv.api(b, '/api/users/me/push-prefs')).devices, 0);
});
