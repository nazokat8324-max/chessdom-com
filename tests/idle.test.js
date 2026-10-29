// Bo'sh server bazani uyg'otmaydi: hech kim saytda bo'lmaganda fondagi tekshiruvlar (liga va boshqalar) bazaga so'rov yubormaydi.
// Avval Swiss turnirlari (2026-10-29 da olib tashlangan) har 5 s da, liga har daqiqada so'rov yuborardi — Neon bazasi hech qachon uxlamas va bepul tarifning oylik
// hisoblash vaqti (100 CU-soat) ~16 kunda tugardi.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, sleep } = require('./helpers');

let srv;
// Liga tick'i — odatdagi (1 daqiqa): kimdir saytda faol bo'lmasa bazaga murojaat qilmaydi
test.before(async () => { srv = await startServer(); });
test.after(async () => { await srv.stop(); });

const count = async () => (await srv.api(null, '/api/test/db-queries')).count;

test("Bo'sh server: hech kim yo'q paytda bazaga fondagi so'rovlar yuborilmaydi", async () => {
  await sleep(2500); // start va birinchi tick'lar
  const a = await count();
  await sleep(6000);
  const b = await count();
  assert.equal(b, a, `bo'sh paytda ${b - a} ta so'rov`);
});
