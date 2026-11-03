// 📺 Kutubxona "Videodarslar": server kanal lentasini oladi (soxta YouTube bilan), muqovalarni o'zi beradi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');
const { startFakeYoutube, JPEG } = require('./fixtures/youtube');

let srv, yt;
before(async () => {
  yt = await startFakeYoutube();
  srv = await startServer({ YOUTUBE_BASE: yt.base, YTIMG_BASE: yt.base });
});
after(async () => { await srv.stop(); await yt.stop(); });

test("Videodarslar: kanal lentasidagi ochiq videolar, nomi tozalangan, Shorts belgisi, ko'rishlar soni; lenta keshlanadi", async () => {
  const d = await srv.api(null, '/api/videos');
  assert.equal(d.success, true);
  assert.deepEqual(d.videos.map((v) => v.id), ['axHTEebW8xo', 'KTc2AAnXWlU']); // noto'g'ri yozuv tashlanadi
  assert.equal(d.videos[0].title, "Shaxmat qayerda paydo bo'lgan? Shaxmat tarixi #1");
  assert.equal(d.videos[1].title, 'Shaxmat & Futbol');
  assert.equal(d.videos[0].short, true);
  assert.equal(d.videos[1].short, false);
  assert.equal(d.videos[1].views, 1157);
  assert.match(d.videos[0].published, /^2026-11-02/);
  await srv.api(null, '/api/videos');
  assert.equal(yt.hits.filter((u) => u.startsWith('/feeds/')).length, 1, 'lenta 30 daqiqa keshda');
});

test('Videodarslar: muqova server orqali, faqat kanaldagi videolar (ochiq proksi emas)', async () => {
  const r = await fetch(srv.base + '/api/videos/thumb/KTc2AAnXWlU');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /image\/jpeg/);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), JPEG);
  await fetch(srv.base + '/api/videos/thumb/KTc2AAnXWlU');
  assert.equal(yt.hits.filter((u) => u.includes('/vi/KTc2AAnXWlU/')).length, 1, 'muqova xotirada');
  // Kanalda yo'q video va noto'g'ri id — YouTube'ga so'rov ham yuborilmaydi
  assert.equal((await fetch(srv.base + '/api/videos/thumb/AAAAAAAAAAA')).status, 404);
  assert.equal((await fetch(srv.base + '/api/videos/thumb/..%2F..%2Fx')).status, 404);
  assert.equal(yt.hits.filter((u) => u.includes('AAAAAAAAAAA')).length, 0);
});
